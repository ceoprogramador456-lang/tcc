/**
 * Contratos de transporte da API do SIVA.
 *
 * O backend (Express) responde sempre com o envelope `{ success, data, meta }`
 * em caso de sucesso e `{ success: false, error }` em caso de falha —
 * ver `src/shared/http/api-response.ts` e `src/middlewares/error-handler.middleware.ts`.
 */

export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiSuccessEnvelope<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiErrorEnvelope {
  success: false;
  error: ApiErrorPayload;
}

export type ApiEnvelope<T> = ApiSuccessEnvelope<T> | ApiErrorEnvelope;

/** Resultado de uma listagem paginada. */
export interface PaginatedResult<T> {
  items: T[];
  meta: PaginationMeta;
}

/** Parâmetros aceitos em query string. `null`/`undefined`/`''` são omitidos. */
export type QueryParams = Record<string, string | number | boolean | null | undefined>;
