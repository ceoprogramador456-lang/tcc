import type { PublicUser } from '../../types/auth';

const STORAGE_KEY = 'siva.auth.session';

export interface StoredSession {
  token: string;
  user: PublicUser;
}

/**
 * Persistência da sessão no `localStorage`.
 *
 * O back-end emite um JWT stateless (8h) e não possui cookie de sessão nem
 * refresh token — portanto o token precisa sobreviver a recarregamentos da
 * página. O custo é que o token fica acessível a scripts da mesma origem
 * (risco de XSS); a mitigação é não haver dados sensíveis no payload — o JWT
 * carrega apenas `id`, `email`, `tipo` e `empresaId`.
 */
export const authSessionStorage = {
  read(): StoredSession | null {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;

      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null) return null;

      const candidate = parsed as Partial<StoredSession>;
      if (typeof candidate.token !== 'string' || candidate.token.length === 0) return null;
      if (typeof candidate.user !== 'object' || candidate.user === null) return null;

      return { token: candidate.token, user: candidate.user };
    } catch {
      return null;
    }
  },

  write(session: StoredSession): void {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
      // Navegador em modo privado ou quota excedida: a sessão segue apenas em memória.
    }
  },

  clear(): void {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nada a fazer — a sessão em memória é limpa pelo provider.
    }
  },
};
