import { LoaderCircle } from 'lucide-react';

import { cn } from '../../utils/cn';

interface LoadingBlockProps {
  label?: string;
  className?: string;
  /** Altura mínima do bloco, para manter o layout estável durante o carregamento. */
  minHeight?: string;
}

export function LoadingBlock({ label = 'Carregando…', className, minHeight = '16rem' }: LoadingBlockProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn('flex flex-col items-center justify-center gap-3 text-slate-500', className)}
      style={{ minHeight }}
    >
      <LoaderCircle className="size-6 animate-spin text-bright-teal-blue" aria-hidden="true" />
      <span className="text-sm">{label}</span>
    </div>
  );
}
