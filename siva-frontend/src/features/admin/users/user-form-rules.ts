import type { Company, TipoEmpresa } from '../../../types/company';
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
  /** `''` significa "nenhuma empresa selecionada". */
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

const ALL_USER_TYPES: UserType[] = ['ADMIN', 'GESTOR', 'TECNICO'];

/**
 * Perfis aceitos por tipo de empresa.
 *
 * Espelha `assertValidCombination` do back-end
 * (`src/modules/users/services/user.service.ts`):
 *  - SIVA: ADMIN ou TECNICO;
 *  - empresa cliente: somente GESTOR.
 *
 * Sem empresa selecionada ainda não há regra a aplicar: o formulário mostra
 * todas as opções e a validação exige a escolha da empresa no envio.
 */
export function allowedUserTypes(tipo: TipoEmpresa | null): UserType[] {
  if (tipo === 'SIVA') return ['ADMIN', 'TECNICO'];
  if (tipo === 'CLIENTE') return ['GESTOR'];
  return ALL_USER_TYPES;
}

/** Perfil assumido ao trocar para uma empresa que não aceita o perfil atual. */
export function fallbackUserType(tipo: TipoEmpresa | null): UserType {
  if (tipo === 'SIVA') return 'TECNICO';
  return 'GESTOR';
}

export function companyTipoById(
  companies: readonly Company[],
  empresaId: string,
): TipoEmpresa | null {
  const company = companies.find((item) => String(item.id) === empresaId);
  return company?.tipo ?? null;
}

export function validateUserForm(
  values: UserFormValues,
  options: { isEditing: boolean; companies: readonly Company[] },
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

  // Todo usuário pertence a uma empresa — inclusive o ADMIN, vinculado à SIVA.
  const company = options.companies.find((item) => String(item.id) === values.empresaId);
  if (values.empresaId === '') {
    errors.empresaId = 'Selecione a empresa do usuário.';
  } else if (!company) {
    errors.empresaId = 'Selecione uma empresa válida.';
  } else if (!allowedUserTypes(company.tipo).includes(values.tipo)) {
    errors.tipo =
      company.tipo === 'SIVA'
        ? 'A SIVA aceita apenas os perfis Administrador ou Técnico.'
        : 'Empresas clientes aceitam apenas o perfil Gestor.';
  }

  if (values.tipo === 'TECNICO' && values.especialidade === '') {
    errors.especialidade = 'Selecione a especialidade do técnico.';
  }

  return errors;
}

export function toCreatePayload(values: UserFormValues): CreateUserPayload {
  return {
    nome: values.nome.trim(),
    email: values.email.trim(),
    senha: values.senha,
    tipo: values.tipo,
    empresaId: values.empresaId === '' ? null : Number(values.empresaId),
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
  const payload: UpdateUserPayload = {
    nome: values.nome.trim(),
    email: values.email.trim(),
    tipo: values.tipo,
    empresaId: values.empresaId === '' ? null : Number(values.empresaId),
    especialidade: values.tipo === 'TECNICO' ? values.especialidade || null : null,
  };

  if (values.senha.length > 0) {
    payload.senha = values.senha;
  }

  return payload;
}
