import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { ApiError } from '../../services/api/http-client';
import { authService } from '../../services/auth/auth.service';
import type { LoginCredentials } from '../../types/auth';
import { AuthContext } from './auth-context';
import type { AuthContextValue } from './auth-context';
import { authSessionStorage } from './auth-session-storage';
import type { StoredSession } from './auth-session-storage';

interface AuthProviderProps {
  children: ReactNode;
}

interface AuthState {
  status: 'loading' | 'anonymous' | 'authenticated';
  session: StoredSession | null;
}

/**
 * Mantém o estado de autenticação do front-end.
 *
 * A sessão persistida é revalidada no back-end (`GET /api/auth/me`) ao abrir
 * o app — um JWT válido localmente não é suficiente para considerar o usuário
 * autenticado, já que o token pode ter expirado ou sido revogado no servidor.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>(() => {
    const stored = authSessionStorage.read();
    return { status: stored ? 'loading' : 'anonymous', session: stored };
  });

  // Sessão lida na inicialização — a validação abaixo ocorre uma única vez.
  const initialSession = useRef<StoredSession | null>(state.session);

  useEffect(() => {
    const stored = initialSession.current;

    if (!stored) return;

    const controller = new AbortController();
    let cancelled = false;

    authService
      .me(stored.token, { signal: controller.signal })
      .then((user) => {
        if (cancelled) return;
        const refreshed: StoredSession = { token: stored.token, user };
        authSessionStorage.write(refreshed);
        setState({ status: 'authenticated', session: refreshed });
      })
      .catch((error: unknown) => {
        if (cancelled) return;

        const isRejected = error instanceof ApiError && (error.status === 401 || error.status === 403);

        if (isRejected) {
          authSessionStorage.clear();
          setState({ status: 'anonymous', session: null });
          return;
        }

        // API indisponível: mantém a sessão local para não deslogar o usuário
        // por uma falha de rede. A validação real acontece na próxima requisição.
        setState({ status: 'authenticated', session: stored });
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  const signIn = useCallback(async (credentials: LoginCredentials): Promise<void> => {
    const result = await authService.login(credentials);
    const next: StoredSession = { token: result.token, user: result.user };
    authSessionStorage.write(next);
    setState({ status: 'authenticated', session: next });
  }, []);

  const signOut = useCallback((): void => {
    authSessionStorage.clear();
    setState({ status: 'anonymous', session: null });
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    if (state.status === 'authenticated' && state.session) {
      return {
        status: 'authenticated',
        user: state.session.user,
        token: state.session.token,
        signIn,
        signOut,
      };
    }

    return {
      status: state.status === 'loading' ? 'loading' : 'anonymous',
      user: null,
      token: null,
      signIn,
      signOut,
    };
  }, [signIn, signOut, state]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
