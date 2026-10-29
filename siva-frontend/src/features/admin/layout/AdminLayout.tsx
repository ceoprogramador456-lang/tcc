import { useCallback, useState } from 'react';
import { Outlet } from 'react-router-dom';

import { AdminSidebar } from './AdminSidebar';
import type { AdminOutletContext } from './admin-layout-context';

export function AdminLayout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const openMenu = useCallback(() => setIsMenuOpen(true), []);
  const closeMenu = useCallback(() => setIsMenuOpen(false), []);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen">
        <AdminSidebar isOpen={isMenuOpen} onClose={closeMenu} />

        <div className="flex min-w-0 flex-1 flex-col">
          <main className="min-w-0 flex-1">
            <Outlet context={{ openMenu } satisfies AdminOutletContext} />
          </main>
        </div>
      </div>
    </div>
  );
}
