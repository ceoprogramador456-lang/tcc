import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';

import { LoadingBlock } from '../../../components/ui/LoadingBlock';
import { useAuth } from '../../auth/hooks/use-auth';

interface RequireAuthenticatedProps {
  children: ReactNode;
}

/**
 * Protege a área operacional: exige sessão ativa (qualquer perfil).
 *
 * A autorização por perfil continua no back-end — aqui só evitamos renderizar
 * telas para quem não está autenticado.
 */
export function RequireAuthenticated({ children }: RequireAuthenticatedProps) {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <LoadingBlock label="Verificando sua sessão…" minHeight="12rem" />
      </div>
    );
  }

  if (status === 'anonymous') {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
