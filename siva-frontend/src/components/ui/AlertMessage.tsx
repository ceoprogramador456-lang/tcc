import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '../../utils/cn';

export type AlertTone = 'info' | 'success' | 'warning' | 'danger';

const TONES: Record<AlertTone, { wrapper: string; icon: LucideIcon }> = {
  info: { wrapper: 'border-sky-200 bg-sky-50 text-sky-900', icon: Info },
  success: { wrapper: 'border-emerald-200 bg-emerald-50 text-emerald-900', icon: CircleCheck },
  warning: { wrapper: 'border-amber-200 bg-amber-50 text-amber-900', icon: TriangleAlert },
  danger: { wrapper: 'border-red-200 bg-red-50 text-red-900', icon: CircleAlert },
};

interface AlertMessageProps {
  tone?: AlertTone;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function AlertMessage({ tone = 'info', title, children, className }: AlertMessageProps) {
  const { wrapper, icon: Icon } = TONES[tone];

  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('flex items-start gap-3 rounded-lg border px-4 py-3 text-sm', wrapper, className)}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        <div className={cn(title ? 'mt-0.5' : undefined, 'leading-relaxed')}>{children}</div>
      </div>
    </div>
  );
}
