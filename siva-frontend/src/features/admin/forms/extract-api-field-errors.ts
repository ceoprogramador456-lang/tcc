import { ApiError } from '../../../services/api/http-client';

/**
 * Extrai os erros de validação por campo devolvidos pelo back-end (HTTP 422).
 *
 * As mensagens do Zod chegam em inglês (`Required`, `Invalid email`…). Cada
 * formulário traduz os campos que conhece; os demais são ignorados para não
 * exibir texto técnico ao usuário.
 */
export function extractApiFieldErrors(
  error: unknown,
  messages: Record<string, string>,
): Record<string, string> {
  if (!(error instanceof ApiError) || error.status !== 422) return {};

  const result: Record<string, string> = {};
  for (const [field, fallback] of Object.entries(messages)) {
    const serverMessages = error.fieldErrors[field];
    if (serverMessages && serverMessages.length > 0) {
      result[field] = fallback;
    }
  }
  return result;
}
