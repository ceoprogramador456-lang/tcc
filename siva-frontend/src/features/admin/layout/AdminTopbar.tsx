import { PageContext } from '../../../components/ui/PageContext';
import { Menu } from 'lucide-react';

interface AdminTopbarProps {
  title: string;
  description?: string;
  onOpenMenu: () => void;
  actions?: React.ReactNode;
}

export function AdminTopbar({ title, description, onOpenMenu, actions }: AdminTopbarProps) {
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

          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      </header>
      <PageContext title={title} />
    </>
  );
}
