import { cn } from '../../utils/cn';

export interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
  /** `dark` para seções de fundo escuro (textos claros). */
  tone?: 'light' | 'dark';
  className?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'center',
  tone = 'light',
  className,
}: SectionHeadingProps) {
  const isDark = tone === 'dark';

  return (
    <div
      className={cn(
        'max-w-2xl',
        align === 'center' ? 'mx-auto text-center' : 'text-left',
        className,
      )}
    >
      {eyebrow ? (
        <p
          className={cn(
            'mb-3 text-xs font-semibold uppercase tracking-[0.18em]',
            isDark ? 'text-cool-sky' : 'text-bright-teal-blue',
          )}
        >
          {eyebrow}
        </p>
      ) : null}

      <h2
        className={cn(
          'text-3xl font-bold tracking-tight sm:text-4xl',
          isDark ? 'text-white' : 'text-slate-900',
        )}
      >
        {title}
      </h2>

      {description ? (
        <p
          className={cn(
            'mt-4 text-base leading-relaxed sm:text-lg',
            isDark ? 'text-slate-300' : 'text-slate-600',
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
