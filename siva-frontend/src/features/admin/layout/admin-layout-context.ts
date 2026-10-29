import { useOutletContext } from 'react-router-dom';

export interface AdminOutletContext {
  /** Abre o menu lateral no mobile. */
  openMenu: () => void;
}

export function useAdminLayout(): AdminOutletContext {
  return useOutletContext<AdminOutletContext>();
}
