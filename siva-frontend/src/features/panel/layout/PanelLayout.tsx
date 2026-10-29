import { useCallback, useState } from 'react';
import { Outlet } from 'react-router-dom';

import { PanelSidebar } from './PanelSidebar';
import type { PanelOutletContext } from './panel-layout-context';
import { usePanelScope } from '../hooks/use-panel-scope';

export function PanelLayout() {
  const { empresaId } = usePanelScope();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const openMenu = useCallback(() => setIsMenuOpen(true), []);
  const closeMenu = useCallback(() => setIsMenuOpen(false), []);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen">
        <PanelSidebar isOpen={isMenuOpen} onClose={closeMenu} />

        <div className="flex min-w-0 flex-1 flex-col">
          <main className="min-w-0 flex-1">
            <Outlet
              key={empresaId ?? 'todas'}
              context={{ openMenu } satisfies PanelOutletContext}
            />
          </main>
        </div>
      </div>
    </div>
  );
}
