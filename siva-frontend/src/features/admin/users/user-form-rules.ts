import type {
  CreateUserPayload,
  Especialidade,
  StatusUsuario,
  UpdateUserPayload,
  UserType,
} from '../../../types/user';

export interface UserFormValues {
  nome: string;
  email: string;
  senha: string;
  tipo: UserType;
  /** `''` significa "sem empresa vinculada". */
  empresaId: string;
  /** `''` significa "sem especialidade". */
  especialidade: Especialidade | '';
  status: StatusUsuario;
}

export const EMPTY_USER_FORM: UserFormValues = {
  nome: '',
  email: '',
  senha: '',
  tipo: 'GESTOR',
  empresaId: '',
  especialidade: '',
  status: 'ATIVO',
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Regras de combinação tipo × empresa × especialidade.
 *
 * Espelha `assertValidCombination` do back-end
 * (`src/modules/users/services/user.service.ts`):
 *  - ADMIN: sem empresa e sem especialidade;
 *  - GESTOR: empresa obrigatória, sem especialidade;
 *  - TECNICO: empresa e especialidade obrigatórias.
 */
export function validateUserForm(
  values: UserFormValues,
  options: { isEditing: boolean },
): Record<string, string> {
  const errors: Record<string, string> = {};

  const nome = values.nome.trim();
  if (nome.length < 2) {
    errors.nome = 'Informe o nome (2 a 100 caracteres).';
  } else if (nome.length > 100) {
    errors.nome = 'O nome deve ter no máximo 100 caracteres.';
  }

  const email = values.email.trim();
  if (email.length === 0) {
    errors.email = 'Informe o e-mail.';
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = 'Informe um e-mail válido.';
  } else if (email.length > 100) {
    errors.email = 'O e-mail deve ter no máximo 100 caracteres.';
  }

  if (!options.isEditing || values.senha.length > 0) {
    if (values.senha.length < 6) {
      errors.senha = 'A senha deve ter entre 6 e 72 caracteres.';
    } else if (values.senha.length > 72) {
      errors.senha = 'A senha deve ter no máximo 72 caracteres.';
    }
  }

  if (values.tipo === 'GESTOR' || values.tipo === 'TECNICO') {
    if (values.empresaId === '') {
      errors.empresaId = 'Selecione a empresa do usuário.';
    }
  }

  if (values.tipo === 'TECNICO' && values.especialidade === '') {
    errors.especialidade = 'Selecione a especialidade do técnico.';
  }

  return errors;
}

export function toCreatePayload(values: UserFormValues): CreateUserPayload {
  const empresaId = values.empresaId === '' ? null : Number(values.empresaId);

  return {
    nome: values.nome.trim(),
    email: values.email.trim(),
    senha: values.senha,
    tipo: values.tipo,
    empresaId: values.tipo === 'ADMIN' ? null : empresaId,
    especialidade: values.tipo === 'TECNICO' ? values.especialidade || null : null,
    status: values.status,
  };
}

/**
 * Conversão para atualização.
 *
 * A combinação completa (tipo + empresa + especialidade) é sempre enviada:
 * o back-end valida a combinação final no service e não aceita trocar apenas
 * o `tipo` sem ajustar os campos correlatos.
 */
export function toUpdatePayload(values: UserFormValues): UpdateUserPayload {
  const empresaId = values.empresaId === '' ? null : Number(values.empresaId);

  const payload: UpdateUserPayload = {
    nome: values.nome.trim(),
    email: values.email.trim(),
    tipo: values.tipo,
    empresaId: values.tipo === 'ADMIN' ? null : empresaId,
    especialidade: values.tipo === 'TECNICO' ? values.especialidade || null : null,
  };

  if (values.senha.length > 0) {
    payload.senha = values.senha;
  }

  return payload;
}
