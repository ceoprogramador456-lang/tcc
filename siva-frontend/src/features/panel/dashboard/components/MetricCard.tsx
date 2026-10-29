import type { LucideIcon } from 'lucide-react';

import { useCountUp } from '../../../../hooks/use-count-up';
import { cn } from '../../../../utils/cn';

interface MetricCardProps {
  label: string;
  /** `null` quando o indicador não tem fonte de dados (estado vazio real). */
  value: number | null;
  icon: LucideIcon;
  unit?: string;
  hint?: string;
  /** Exibido quando `value` é `null`. */
  emptyMessage?: string;
  tone?: 'default' | 'brand';
}

export function MetricCard({
  label,
  value,
  icon: Icon,
  unit,
  hint,
  emptyMessage = 'Sem dados disponíveis',
  tone = 'default',
}: MetricCardProps) {
  const animated = useCountUp(value ?? 0);

  return (
    <div
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
      data-testid={`metric-${label.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>

          {value === null ? (
            <p className="mt-2 text-sm font-medium text-slate-400">{emptyMessage}</p>
          ) : (
            <p
              className={cn(
                'mt-2 font-display text-3xl font-extrabold tabular-nums',
                tone === 'brand' ? 'text-siva-700' : 'text-slate-900',
              )}
            >
              {formatMetric(animated)}
              {unit ? (
                <span className="ml-1 text-base font-semibold text-slate-400">{unit}</span>
              ) : null}
            </p>
          )}

          {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
        </div>

        <span
          className={cn(
            'flex size-11 shrink-0 items-center justify-center rounded-lg',
            tone === 'brand' ? 'bg-siva-100 text-siva-700' : 'bg-siva-50 text-bright-teal-blue',
          )}
        >
          <Icon className="size-5" aria-hidden="true" />
        </span>
      </div>
    </div>
  );
}

/** Formata com uma casa decimal apenas quando há fração — evita "12,0". */
function formatMetric(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded)
    ? rounded.toLocaleString('pt-BR')
    : rounded.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
