import { useAuth } from '../../auth/hooks/use-auth';

export interface PanelPermissions {
  /** Perfis que podem criar/editar/excluir recursos operacionais. */
  canWrite: boolean;
  isAdmin: boolean;
  isTecnico: boolean;
}

/**
 * Permissões da interface.
 *
 * Espelha o RBAC do back-end (`authorize('ADMIN', 'GESTOR')` nas rotas de
 * escrita de setor/ativo/ESP32/sensor). A interface esconde as ações que o
 * servidor recusaria — a barreira real continua sendo o back-end.
 */
export function usePermissions(): PanelPermissions {
  const { user } = useAuth();

  return {
    canWrite: user?.tipo === 'ADMIN' || user?.tipo === 'GESTOR',
    isAdmin: user?.tipo === 'ADMIN',
    isTecnico: user?.tipo === 'TECNICO',
  };
}
