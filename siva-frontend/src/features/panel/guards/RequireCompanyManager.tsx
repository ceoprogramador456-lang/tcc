import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../auth/hooks/use-auth';

export function RequireCompanyManager({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (user?.tipo === 'ADMIN') return <Navigate to="/admin/usuarios" replace />;
  if (user?.tipo !== 'GESTOR') return <Navigate to="/painel" replace />;
  return <>{children}</>;
}
