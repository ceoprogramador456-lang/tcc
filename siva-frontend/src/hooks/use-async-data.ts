import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError } from '../services/api/http-client';

interface AsyncDataState<T> {
  data: T | null;
  error: string | null;
  /** Chave da última requisição concluída — usada para derivar `isLoading`. */
  loadedKey: string | number | null;
  scopeKey: string | number | null;
}

export interface AsyncDataResult<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  reload: () => void;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status >= 500) return 'Erro interno do servidor. Tente novamente em instantes.';
    if (error.code === 'TIMEOUT') return 'O servidor demorou para responder. Tente novamente.';
    if (error.code === 'NETWORK_ERROR') {
      return 'Não foi possível conectar ao servidor do SIVA. Verifique sua conexão.';
    }
    return error.message;
  }
  return 'Não foi possível carregar os dados.';
}

/**
 * Carrega dados assíncronamente mantendo estado de carregamento e erro.
 *
 * O `loader` é lido de uma ref para evitar re-execuções infinitas quando a
 * função é recriada a cada render; a recarga é disparada por `reloadKey`.
 * O estado de carregamento é *derivado* (a chave concluída é comparada com a
 * chave pedida), evitando atualizações de estado síncronas dentro do efeito.
 */
export function useAsyncData<T>(
  loader: () => Promise<T>,
  reloadKey: string | number = 0,
): AsyncDataResult<T> {
  const loaderRef = useRef(loader);
  const [state, setState] = useState<AsyncDataState<T>>({
    data: null,
    error: null,
    loadedKey: null,
    scopeKey: null,
  });
  const [reloadToken, setReloadToken] = useState(0);
  const effectiveKey = `${reloadKey}|${reloadToken}`;

  useEffect(() => {
    loaderRef.current = loader;
  });

  useEffect(() => {
    let cancelled = false;
    const requestedKey = effectiveKey;

    loaderRef
      .current()
      .then((data) => {
        if (cancelled) return;
        setState({ data, error: null, loadedKey: requestedKey, scopeKey: reloadKey });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState((current) => ({
          data: current.scopeKey === reloadKey ? current.data : null,
          error: toErrorMessage(error),
          loadedKey: requestedKey,
          scopeKey: reloadKey,
        }));
      });

    return () => {
      cancelled = true;
    };
  }, [effectiveKey, reloadKey]);

  const reload = useCallback(() => {
    setReloadToken((current) => current + 1);
  }, []);

  return {
    data: state.scopeKey === reloadKey ? state.data : null,
    isLoading: state.loadedKey !== effectiveKey,
    error: state.loadedKey === effectiveKey ? state.error : null,
    reload,
  };
}
