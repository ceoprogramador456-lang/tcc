import type { Especialidade, UserType } from '../../types/auth';

export const USER_TYPE_LABELS: Record<UserType, string> = {
  ADMIN: 'Administrador',
  GESTOR: 'Gestor',
  TECNICO: 'Técnico',
};

export const ESPECIALIDADE_LABELS: Record<Especialidade, string> = {
  MECANICO: 'Mecânico',
  ELETRICISTA: 'Eletricista',
};
