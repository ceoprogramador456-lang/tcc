export type UserType = 'ADMIN' | 'GESTOR' | 'TECNICO';
export type Especialidade = 'MECANICO' | 'ELETRICISTA';
export type StatusUsuario = 'ATIVO' | 'INATIVO';

export interface User {
  id: number;
  nome: string;
  email: string;
  senha: string;
  tipo: UserType;
  especialidade: Especialidade | null;
  status: StatusUsuario;
  empresaId: number | null;
  criadoEm: Date;
}

export type PublicUser = Omit<User, 'senha'>;

export function toPublicUser(user: User): PublicUser {
  const { senha: _senha, ...publicUser } = user;
  return publicUser;
}
