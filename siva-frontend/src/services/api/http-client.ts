import { env } from '../../config/env';
import type {
  ApiErrorEnvelope,
  ApiSuccessEnvelope,
  PaginatedResult,
  QueryParams,
} from '../../types/api';

const DEFAULT_TIMEOUT_MS = 15_000;

export interface RequestOptions {
  /** Token JWT do usuário — enviado como `Authorization: Bearer <token>`. */
  token?: string;
  signal?: AbortSignal;
  /** Query string. Valores `null`, `undefined` e `''` são omitidos. */
  query?: QueryParams;
}

interface ValidationDetails {
  formErrors?: string[];
  fieldErrors?: Record<string, string[] | undefined>;
}

/** Erro normalizado da API, seguro para exibição no front-end. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** Erros de validação do Zod (HTTP 422) agrupados por campo. */
  get fieldErrors(): Record<string, string[] | undefined> {
    return isValidationDetails(this.details) ? (this.details.fieldErrors ?? {}) : {};
  }
}

function isValidationDetails(details: unknown): details is ValidationDetails {
  return typeof details === 'object' && details !== null && 'fieldErrors' in details;
}

function isErrorEnvelope(payload: unknown): payload is ApiErrorEnvelope {
  if (typeof payload !== 'object' || payload === null) return false;
  const candidate = payload as Partial<ApiErrorEnvelope>;
  return candidate.success === false && typeof candidate.error?.message === 'string';
}

function isSuccessEnvelope<T>(payload: unknown): payload is ApiSuccessEnvelope<T> {
  if (typeof payload !== 'object' || payload === null) return false;
  const candidate = payload as Partial<ApiSuccessEnvelope<T>>;
  return candidate.success === true && 'data' in candidate;
}

function buildUrl(path: string, query?: QueryParams): string {
  if (!query) return path;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params.append(key, String(value));
  }

  const search = params.toString();
  return search.length > 0 ? `${path}?${search}` : path;
}

async function readPayload(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.length === 0) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function toApiError(status: number, payload: unknown): ApiError {
  if (isErrorEnvelope(payload)) {
    return new ApiError(status, payload.error.code, payload.error.message, payload.error.details);
  }

  // O `express-rate-limit` responde com texto puro, fora do envelope JSON.
  if (status === 429) {
    return new ApiError(
      status,
      'RATE_LIMITED',
      'Muitas tentativas de acesso. Aguarde um instante e tente novamente.',
    );
  }

  if (status === 503) {
    return new ApiError(status, 'SERVICE_UNAVAILABLE', 'Serviço indisponível temporariamente.');
  }

  return new ApiError(status, 'HTTP_ERROR', `Erro inesperado do servidor (HTTP ${status}).`);
}

function normalizeError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (error instanceof DOMException) {
    if (error.name === 'TimeoutError') {
      return new ApiError(0, 'TIMEOUT', 'O servidor demorou para responder. Tente novamente.');
    }
    if (error.name === 'AbortError') {
      return new ApiError(0, 'ABORTED', 'Requisição cancelada.');
    }
  }

  return new ApiError(
    0,
    'NETWORK_ERROR',
    'Não foi possível conectar ao servidor do SIVA. Verifique sua conexão.',
  );
}

/**
 * Cliente HTTP da API do SIVA.
 *
 * A API usa `Authorization: Bearer <jwt>` (não cookies), portanto não há
 * necessidade — nem segurança — em enviar credenciais de cookie.
 */
class HttpClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(baseUrl: string, timeoutMs: number = DEFAULT_TIMEOUT_MS) {
    this.baseUrl = baseUrl;
    this.timeoutMs = timeoutMs;
  }

  get<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>('GET', path, undefined, options).then((envelope) => envelope.data);
  }

  getPaginated<T>(path: string, options: RequestOptions = {}): Promise<PaginatedResult<T>> {
    return this.request<T[]>('GET', path, undefined, options).then((envelope) => ({
      items: envelope.data ?? [],
      meta: envelope.meta ?? { total: 0, page: 1, pageSize: 0, totalPages: 1 },
    }));
  }

  post<T>(path: string, body: unknown, options: RequestOptions = {}): Promise<T> {
    return this.request<T>('POST', path, body, options).then((envelope) => envelope.data);
  }

  patch<T>(path: string, body: unknown, options: RequestOptions = {}): Promise<T> {
    return this.request<T>('PATCH', path, body, options).then((envelope) => envelope.data);
  }

  delete(path: string, options: RequestOptions = {}): Promise<void> {
    return this.request<never>('DELETE', path, undefined, options).then(() => undefined);
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    body: unknown,
    options: RequestOptions,
  ): Promise<ApiSuccessEnvelope<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort(new DOMException('Tempo de resposta excedido.', 'TimeoutError'));
    }, this.timeoutMs);

    const forwardAbort = (): void => controller.abort(options.signal?.reason);
    options.signal?.addEventListener('abort', forwardAbort);

    try {
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (body !== undefined) headers['Content-Type'] = 'application/json';
      if (options.token) headers.Authorization = `Bearer ${options.token}`;

      const response = await fetch(`${this.baseUrl}${buildUrl(path, options.query)}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
        credentials: 'omit',
      });

      const payload = await readPayload(response);

      if (!response.ok) {
        throw toApiError(response.status, payload);
      }

      // 204 — operação sem conteúdo de resposta.
      if (response.status === 204) {
        return { success: true, data: undefined as T };
      }

      if (!isSuccessEnvelope<T>(payload)) {
        throw new ApiError(response.status, 'INVALID_RESPONSE', 'Resposta inesperada do servidor.');
      }

      return payload;
    } catch (error) {
      throw normalizeError(error);
    } finally {
      clearTimeout(timeoutId);
      options.signal?.removeEventListener('abort', forwardAbort);
    }
  }
}

export const httpClient = new HttpClient(env.apiBaseUrl);
