import { NavLink } from 'react-router-dom';
import { ExternalLink, LogOut, X } from 'lucide-react';

import { BrandLogo } from '../../../components/brand/BrandLogo';
import { buttonStyles } from '../../../components/ui/button-styles';
import { cn } from '../../../utils/cn';
import { useAuth } from '../../auth/hooks/use-auth';
import { USER_TYPE_LABELS } from '../../auth/user-labels';
import { PANEL_NAV_ITEMS } from './panel-navigation';
import type { PanelNavItem } from './panel-navigation';
import { ADMIN_NAV_ITEMS } from '../../admin/layout/admin-navigation';
import type { AdminNavItem } from '../../admin/layout/admin-navigation';
import { usePanelScope } from '../hooks/use-panel-scope';
import { Users } from 'lucide-react';

interface PanelSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

type SidebarNavEntry = PanelNavItem | AdminNavItem;

function SidebarLink({ item, onClose }: { item: SidebarNavEntry; onClose: () => void }) {
  const { empresaId } = usePanelScope();
  return (
    <NavLink
      to={
        item.to.startsWith('/painel') && empresaId !== null
          ? `${item.to}?empresaId=${empresaId}`
          : item.to
      }
      end={item.end}
      onClick={onClose}
      className={({ isActive }) =>
        cn(
          'flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors',
          isActive
            ? 'bg-dodger-blue/15 text-white ring-1 ring-inset ring-dodger-blue/40'
            : 'text-slate-300 hover:bg-white/5 hover:text-white',
        )
      }
    >
      {({ isActive }) => (
        <>
          <item.icon
            className={cn('mt-0.5 size-4 shrink-0', isActive ? 'text-cool-sky' : 'text-slate-400')}
            aria-hidden="true"
          />
          <span className="min-w-0">
            <span className="block text-sm font-semibold">{item.label}</span>
            <span className="mt-0.5 block text-xs text-slate-400">{item.description}</span>
          </span>
        </>
      )}
    </NavLink>
  );
}

export function PanelSidebar({ isOpen, onClose }: PanelSidebarProps) {
  const { user, signOut } = useAuth();

  /**
   * Só o ADMIN transita entre a área operacional e a administrativa — sem este
   * grupo, entrar em "Painel operacional" remove Dashboard/Empresas/Usuários
   * do menu e não há como voltar. O item "Painel operacional" é omitido do
   * grupo porque a rota /painel já é o item raiz do menu acima (evita dois
   * itens ativos para a mesma rota). As rotas administrativas continuam
   * protegidas por <RequireAdmin>; GESTOR e TÉCNICO nunca veem este grupo.
   */
  const adminItems =
    user?.tipo === 'ADMIN' ? ADMIN_NAV_ITEMS.filter((item) => item.to !== '/painel') : [];

  return (
    <>
      {isOpen ? (
        <div
          className="fixed inset-0 z-30 bg-siva-950/60 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      ) : null}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex h-screen w-72 flex-col bg-siva-900 transition-transform duration-200 lg:sticky lg:top-0 lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
          <NavLink to="/" aria-label="SIVA — página inicial" className="rounded-md">
            <BrandLogo className="h-7 w-auto" />
          </NavLink>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar menu"
            className="inline-flex size-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <nav
          className="flex-1 overflow-y-auto px-3 py-4"
          aria-label="Navegação do painel operacional"
        >
          <ul className="space-y-1">
            {PANEL_NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <SidebarLink item={item} onClose={onClose} />
              </li>
            ))}
            {user?.tipo === 'GESTOR' ? (
              <li>
                <SidebarLink
                  item={{
                    to: '/painel/usuarios',
                    label: 'Equipe',
                    description: 'Contas vinculadas à sua empresa',
                    icon: Users,
                  }}
                  onClose={onClose}
                />
              </li>
            ) : null}
          </ul>

          {adminItems.length > 0 ? (
            <div className="mt-4 border-t border-white/10 pt-4">
              <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Área administrativa
              </p>
              <ul className="space-y-1">
                {adminItems.map((item) => (
                  <li key={item.to}>
                    <SidebarLink item={item} onClose={onClose} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </nav>

        <div className="border-t border-white/10 px-3 py-4">
          {user ? (
            <div className="mb-3 rounded-lg bg-white/5 px-3 py-3">
              <p className="truncate text-sm font-semibold text-white">{user.nome}</p>
              <p className="truncate text-xs text-slate-400">{user.email}</p>
              <p className="mt-1 text-xs font-medium text-cool-sky">
                {USER_TYPE_LABELS[user.tipo]}
              </p>
            </div>
          ) : null}

          <div className="flex flex-col gap-1">
            <NavLink to="/" className={buttonStyles('secondary', 'sm', 'w-full')}>
              <ExternalLink className="size-3.5" aria-hidden="true" />
              Página inicial
            </NavLink>

            <button
              type="button"
              onClick={signOut}
              className={buttonStyles('ghost', 'sm', 'w-full justify-start')}
            >
              <LogOut className="size-3.5" aria-hidden="true" />
              Sair
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
