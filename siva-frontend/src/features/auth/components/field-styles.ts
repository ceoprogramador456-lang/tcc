import { cn } from '../../../utils/cn';

const BASE =
  'w-full rounded-lg border bg-white px-4 py-3 text-[15px] text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100';

export const inputStyles = (hasError: boolean): string =>
  cn(
    BASE,
    hasError
      ? 'border-red-400 focus:border-red-500 focus:ring-red-500/25'
      : 'border-slate-300 focus:border-bright-teal-blue focus:ring-bright-teal-blue/30',
  );

export const labelStyles = 'mb-1.5 block text-sm font-medium text-slate-200';

export const errorStyles = 'mt-1.5 text-sm text-red-300';
