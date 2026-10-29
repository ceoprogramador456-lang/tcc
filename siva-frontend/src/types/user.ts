/**
 * Contratos de usuário.
 *
 * Espelha `User` / `PublicUser` / `CreateUserDTO` / `UpdateUserDTO` do backend
 * (ver `src/modules/users/entities/user.entity.ts` e `validators/user.validators.ts`).
 */

export type UserType = 'ADMIN' | 'GESTOR' | 'TECNICO';

export type Especialidade = 'MECANICO' | 'ELETRICISTA';

export type StatusUsuario = 'ATIVO' | 'INATIVO';

export interface PublicUser {
  id: number;
  nome: string;
  email: string;
  tipo: UserType;
  especialidade: Especialidade | null;
  status: StatusUsuario;
  empresaId: number | null;
  criadoEm: string;
}

export interface CreateUserPayload {
  nome: string;
  email: string;
  senha: string;
  tipo: UserType;
  empresaId?: number | null;
  especialidade?: Especialidade | null;
  status?: StatusUsuario;
}

export interface UpdateUserPayload {
  nome?: string;
  email?: string;
  senha?: string;
  tipo?: UserType;
  empresaId?: number | null;
  especialidade?: Especialidade | null;
}

export interface UpdateUserStatusPayload {
  status: StatusUsuario;
}
