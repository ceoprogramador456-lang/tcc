import { ApiError } from '../../services/api/http-client';

/**
 * Converte falhas da API em mensagens exibíveis ao usuário.
 *
 * Regras:
 *  - nunca expor detalhes internos do servidor (stack, SQL, mensagem de 500);
 *  - mensagens de 401/403 vindas do back-end são seguras e específicas;
 *  - 422 é tratado por campo no formulário (ver `use-login-form`).
 */
export function toLoginErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return 'Não foi possível conectar ao servidor do SIVA. Verifique sua conexão.';
  }

  switch (error.status) {
    case 401:
      return 'E-mail ou senha inválidos.';
    case 403:
      return 'Usuário inativo. Entre em contato com o administrador.';
    case 422:
      return 'Dados inválidos. Revise os campos destacados.';
    case 429:
      return 'Muitas tentativas de acesso. Aguarde um instante e tente novamente.';
    default:
      break;
  }

  if (error.status >= 500) {
    return 'Erro interno do servidor. Tente novamente em instantes.';
  }

  if (error.code === 'TIMEOUT') {
    return 'O servidor demorou para responder. Tente novamente.';
  }

  if (error.code === 'NETWORK_ERROR') {
    return 'Não foi possível conectar ao servidor do SIVA. Verifique sua conexão.';
  }

  return 'Não foi possível realizar o login. Tente novamente.';
}
