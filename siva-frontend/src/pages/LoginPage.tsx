import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { BrandLogo } from '../components/brand/BrandLogo';
import { AuthenticatedPanel } from '../features/auth/components/AuthenticatedPanel';
import { LoginForm } from '../features/auth/components/LoginForm';
import { useAuth } from '../features/auth/hooks/use-auth';

export default function LoginPage() {
  const { status, user, signIn, signOut } = useAuth();
  const navigate = useNavigate();

  const isCheckingSession = status === 'loading';
  const isAuthenticated = status === 'authenticated' && user !== null;
  const isAdmin = user?.tipo === 'ADMIN';

  // ADMIN vai para a área administrativa; os demais perfis, para o painel operacional.
  useEffect(() => {
    if (isAuthenticated) {
      navigate(isAdmin ? '/admin' : '/painel', { replace: true });
    }
  }, [isAdmin, isAuthenticated, navigate]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-siva-950 px-4 py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(0,72,124,0.9),transparent_70%)]"
      />

      <main className="relative w-full max-w-md">
        <div className="flex flex-col items-center text-center">
          <Link to="/" aria-label="SIVA — voltar à página inicial" className="rounded-md">
            <BrandLogo className="h-14 w-auto sm:h-16" />
          </Link>

          {!isAuthenticated ? (
            <>
              <h1 className="mt-7 text-3xl font-bold text-white">Entrar</h1>
              <p className="mt-2 text-sm text-slate-300">
                Entre para acompanhar sua empresa ou administrar o SIVA.
              </p>
            </>
          ) : null}
        </div>

        <div className="mt-8 rounded-2xl border border-white/15 bg-siva-900 p-6 shadow-2xl shadow-black/50 sm:p-8">
          {isCheckingSession ? (
            <p className="py-10 text-center text-sm text-slate-400">Verificando sua sessão…</p>
          ) : isAuthenticated && user ? (
            <AuthenticatedPanel user={user} onSignOut={signOut} />
          ) : (
            <>
              <LoginForm onSubmit={signIn} />

              <div className="mt-6 border-t border-white/10 pt-5 text-center">
                <Link
                  to="/"
                  className="text-sm font-medium text-cool-sky transition-colors hover:text-white"
                >
                  Voltar à página inicial
                </Link>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
