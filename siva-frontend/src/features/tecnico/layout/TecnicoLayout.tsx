import { Outlet } from 'react-router-dom';
import { LogOut } from 'lucide-react';

import { BrandLogo } from '../../../components/brand/BrandLogo';
import { buttonStyles } from '../../../components/ui/button-styles';
import { useAuth } from '../../auth/hooks/use-auth';
import { ESPECIALIDADE_LABELS, USER_TYPE_LABELS } from '../../auth/user-labels';

/**
 * Layout exclusivo do técnico da SIVA.
 *
 * Não há menu de navegação: o técnico possui uma única tela (suas ordens de
 * serviço). Qualquer outra rota é bloqueada pelo back-end e redirecionada
 * pelo `RequireTecnico`.
 */
export function TecnicoLayout() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-siva-900">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <BrandLogo className="h-7 w-auto" />
            <span className="hidden rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-cool-sky sm:inline">
              Área do técnico
            </span>
          </div>

          <div className="flex min-w-0 items-center gap-3">
            {user ? (
              <div className="min-w-0 text-right">
                <p className="truncate text-sm font-semibold text-white">{user.nome}</p>
                <p className="truncate text-xs text-slate-400">
                  {USER_TYPE_LABELS[user.tipo]}
                  {user.especialidade ? ` · ${ESPECIALIDADE_LABELS[user.especialidade]}` : ''}
                </p>
              </div>
            ) : null}

            <button
              type="button"
              onClick={signOut}
              className={buttonStyles('secondary', 'sm', 'shrink-0')}
            >
              <LogOut className="size-3.5" aria-hidden="true" />
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
