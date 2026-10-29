/**
 * Configuração de runtime do front-end.
 *
 * Somente variáveis `VITE_*` são expostas ao bundle — nenhum segredo deve ser
 * definido aqui (o backend assina o JWT com `JWT_SECRET`, ver `src/config/env.ts`).
 */

const DEFAULT_API_BASE_URL = import.meta.env.DEV ? '/api' : 'http://localhost:3000/api';

function resolveApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_URL?.trim();
  const baseUrl = configured && configured.length > 0 ? configured : DEFAULT_API_BASE_URL;
  return baseUrl.replace(/\/+$/, '');
}

export const env = {
  /** Base URL da API, já com o prefixo `/api` montado pelo backend. */
  apiBaseUrl: resolveApiBaseUrl(),
  isDevelopment: import.meta.env.DEV,
};
