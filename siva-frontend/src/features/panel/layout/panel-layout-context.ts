import { useOutletContext } from 'react-router-dom';

export interface PanelOutletContext {
  /** Abre o menu lateral no mobile. */
  openMenu: () => void;
}

export function usePanelLayout(): PanelOutletContext {
  return useOutletContext<PanelOutletContext>();
}
