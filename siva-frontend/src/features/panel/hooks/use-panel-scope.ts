import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../auth/hooks/use-auth';

export interface PanelScope {
  /**
   * Empresa consultada no painel.
   *
   * `null` = consolidado de todas as empresas (exclusivo de ADMIN, que não
   * tem empresa vinculada). Para GESTOR e TECNICO, o escopo é sempre a
   * própria empresa e o parâmetro é ignorado pelo back-end.
   */
  empresaId: number | null;
  setEmpresaId: (empresaId: number | null) => void;
}

/** Mantém a empresa selecionada na URL (compartilhável e sobrevive a reload). */
export function usePanelScope(): PanelScope {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get('empresaId');
  const parsed = raw !== null ? Number(raw) : Number.NaN;
  const empresaId =
    user?.tipo === 'ADMIN'
      ? Number.isSafeInteger(parsed) && parsed > 0
        ? parsed
        : null
      : (user?.empresaId ?? null);

  return {
    empresaId,
    setEmpresaId: (next: number | null) => {
      setSearchParams(
        (current) => {
          const params = new URLSearchParams(current);
          if (next === null) {
            params.delete('empresaId');
          } else {
            params.set('empresaId', String(next));
          }
          return params;
        },
        { replace: true },
      );
    },
  };
}
