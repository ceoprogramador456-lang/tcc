import logoUrl from '../../assets/siva-logo.png';
import { cn } from '../../utils/cn';

export interface BrandLogoProps {
  className?: string;
  /** Texto alternativo. A marca já contém o wordmark "SIVA". */
  alt?: string;
  loading?: 'eager' | 'lazy';
}

/**
 * Logotipo do SIVA.
 *
 * O arquivo original (`assets/logo.png`) é recortado apenas nas margens
 * transparentes — a arte da marca não é alterada.
 */
export function BrandLogo({ className, alt = 'SIVA', loading = 'eager' }: BrandLogoProps) {
  return (
    <img
      src={logoUrl}
      alt={alt}
      width={969}
      height={577}
      loading={loading}
      decoding="async"
      className={cn('h-8 w-auto', className)}
    />
  );
}
