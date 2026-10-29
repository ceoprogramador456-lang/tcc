import { cn } from '../../utils/cn';

/* Campos de formulário — tema claro (área administrativa). */

export const fieldLabelStyles = 'mb-1.5 block text-sm font-medium text-slate-700';

export const fieldBaseStyles =
  'w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500';

export const fieldStyles = (hasError: boolean): string =>
  cn(
    fieldBaseStyles,
    hasError
      ? 'border-red-400 focus:border-red-500 focus:ring-red-500/25'
      : 'border-slate-300 focus:border-bright-teal-blue focus:ring-bright-teal-blue/30',
  );

export const fieldErrorStyles = 'mt-1.5 text-xs font-medium text-red-600';

export const fieldHintStyles = 'mt-1.5 text-xs text-slate-500';
