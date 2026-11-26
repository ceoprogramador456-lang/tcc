import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';

import { LoadingBlock } from '../../../components/ui/LoadingBlock';
import { useAuth } from '../../auth/hooks/use-auth';

interface RequireTecnicoProps {
  children: ReactNode;
}

/**
 * Protege a área exclusiva do técnico da SIVA.
 *
 * O técnico só enxerga as ordens de serviço designadas a ele; qualquer outra
 * rota redireciona para a área correta do perfil. A autorização real continua
 * no back-end (RBAC + escopo por `funcionarioId`).
 */
export function RequireTecnico({ children }: RequireTecnicoProps) {
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

  if (user?.tipo !== 'TECNICO') {
    return <Navigate to={user?.tipo === 'ADMIN' ? '/admin/solicitacoes' : '/painel'} replace />;
  }

  return <>{children}</>;
}
