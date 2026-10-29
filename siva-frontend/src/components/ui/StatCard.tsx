import type { LucideIcon } from 'lucide-react';

import { cn } from '../../utils/cn';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  hint?: string;
  className?: string;
}

export function StatCard({ label, value, icon: Icon, hint, className }: StatCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-2 font-display text-3xl font-extrabold text-slate-900">{value}</p>
          {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
        </div>

        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-siva-50 text-bright-teal-blue">
          <Icon className="size-5" aria-hidden="true" />
        </span>
      </div>
    </div>
  );
}
