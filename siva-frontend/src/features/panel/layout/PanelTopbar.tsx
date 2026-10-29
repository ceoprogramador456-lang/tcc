import { PageContext } from '../../../components/ui/PageContext';
import { Building2, Menu } from 'lucide-react';

import { useAsyncData } from '../../../hooks/use-async-data';
import { companyService } from '../../../services/companies/company.service';
import { useAuth } from '../../auth/hooks/use-auth';
import { usePanelScope } from '../hooks/use-panel-scope';

interface CompanyScopeSelectProps {
  className?: string;
}

/**
 * Seletor de empresa do painel.
 *
 * Só aparece para ADMIN (perfil sem empresa vinculada): os demais perfis
 * consultam sempre a própria empresa e o back-end ignora o parâmetro.
 */
export function CompanyScopeSelect({ className }: CompanyScopeSelectProps) {
  const { user, token } = useAuth();
  const { empresaId, setEmpresaId } = usePanelScope();
  const isAdmin = user?.tipo === 'ADMIN';

  const { data: companies } = useAsyncData(
    () => {
      if (!isAdmin || !token) return Promise.resolve(null);
      return companyService.list(token, { page: 1, pageSize: 100 });
    },
    `${token ?? ''}:${isAdmin}`,
  );

  if (!isAdmin) return null;

  return (
    <label className={className}>
      <span className="sr-only">Empresa</span>
      <span className="relative block">
        <Building2
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <select
          value={empresaId === null ? '' : String(empresaId)}
          onChange={(event) =>
            setEmpresaId(event.target.value === '' ? null : Number(event.target.value))
          }
          className="w-full appearance-none rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-9 text-sm font-medium text-slate-700 shadow-sm transition focus:border-bright-teal-blue focus:outline-none focus:ring-2 focus:ring-bright-teal-blue/30"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 0.75rem center',
          }}
        >
          <option value="">Todas as empresas</option>
          {(companies?.items ?? []).map((company) => (
            <option key={company.id} value={String(company.id)}>
              {company.nome}
            </option>
          ))}
        </select>
      </span>
    </label>
  );
}

interface PanelTopbarProps {
  title: string;
  description?: string;
  onOpenMenu: () => void;
  actions?: React.ReactNode;
  showScopeSelector?: boolean;
}

export function PanelTopbar({
  title,
  description,
  onOpenMenu,
  actions,
  showScopeSelector = false,
}: PanelTopbarProps) {
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={onOpenMenu}
              aria-label="Abrir menu"
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 transition-colors hover:bg-slate-50 lg:hidden"
            >
              <Menu className="size-4" aria-hidden="true" />
            </button>

            <div className="min-w-0">
              <h1 className="truncate font-display text-xl font-bold text-slate-900">{title}</h1>
              {description ? (
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">
                  {description}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {showScopeSelector ? <CompanyScopeSelect className="w-56" /> : null}
            {actions}
          </div>
        </div>
      </header>
      <PageContext title={title} />
    </>
  );
}
