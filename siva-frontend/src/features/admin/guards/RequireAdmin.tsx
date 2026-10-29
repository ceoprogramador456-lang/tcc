import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';

import { LoadingBlock } from '../../../components/ui/LoadingBlock';
import ForbiddenPage from '../../../pages/ForbiddenPage';
import { useAuth } from '../../auth/hooks/use-auth';

interface RequireAdminProps {
  children: ReactNode;
}

/**
 * Protege a área administrativa.
 *
 * A autorização real é sempre validada no back-end (RBAC por `tipo` +
 * isolamento multiempresa). Este guard evita apenas que usuários sem perfil
 * ADMIN cheguem às telas.
 */
export function RequireAdmin({ children }: RequireAdminProps) {
  const { status, user } = useAuth();

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <LoadingBlock label="Verificando permissões…" minHeight="12rem" />
      </div>
    );
  }

  if (status === 'anonymous') {
    return <Navigate to="/login" replace />;
  }

  if (user?.tipo !== 'ADMIN') {
    return <ForbiddenPage />;
  }

  return <>{children}</>;
}
