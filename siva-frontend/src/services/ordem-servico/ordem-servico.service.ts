import { httpClient } from '../api/http-client';
import type { PaginatedResult, QueryParams } from '../../types/api';
import type {
  AceitarOrdemServicoPayload,
  CreateOrdemServicoPayload,
  OrdemServico,
  StatusServico,
} from '../../types/ordem-servico';

export interface ListOrdensServicoParams {
  page?: number;
  pageSize?: number;
  /** Filtro por status; use `null` para remover o filtro. */
  status?: StatusServico | null;
  /** Filtro por empresa — aceito apenas para ADMIN. */
  empresaId?: number | null;
}

/**
 * Operações de solicitação de serviço.
 *
 * Contrato confirmado no back-end (`src/modules/ordemServico`):
 *  - `GET    /api/solicitacoes-servico`              → lista (GESTOR: empresa dele; ADMIN: todas);
 *  - `POST   /api/solicitacoes-servico`              → cria (GESTOR);
 *  - `POST   /api/solicitacoes-servico/:id/aceitar`  → aceita com funcionário (ADMIN);
 *  - `POST   /api/solicitacoes-servico/:id/concluir` → conclui (ADMIN);
 *  - `GET    /api/solicitacoes-servico/:id`           → detalhe (ADMIN);
 *  - `PATCH  /api/solicitacoes-servico/:id`           → altera funcionário (ADMIN).
 */
export const ordemServicoService = {
  list(token: string, params: ListOrdensServicoParams = {}): Promise<PaginatedResult<OrdemServico>> {
    const query: QueryParams = {
      page: params.page,
      pageSize: params.pageSize,
      status: params.status ?? undefined,
      empresaId: params.empresaId ?? undefined,
    };
    return httpClient.getPaginated<OrdemServico>('/solicitacoes-servico', { token, query });
  },

  create(token: string, payload: CreateOrdemServicoPayload): Promise<OrdemServico> {
    return httpClient.post<OrdemServico>('/solicitacoes-servico', payload, { token });
  },

  aceitar(token: string, id: number, payload: AceitarOrdemServicoPayload): Promise<OrdemServico> {
    return httpClient.post<OrdemServico>(`/solicitacoes-servico/${id}/aceitar`, payload, { token });
  },

  concluir(token: string, id: number): Promise<OrdemServico> {
    return httpClient.post<OrdemServico>(`/solicitacoes-servico/${id}/concluir`, undefined, { token });
  },

  getById(token: string, id: number): Promise<OrdemServico> {
    return httpClient.get<OrdemServico>(`/solicitacoes-servico/${id}`, { token });
  },

  alterarFuncionario(token: string, id: number, funcionarioId: number): Promise<OrdemServico> {
    return httpClient.patch<OrdemServico>(`/solicitacoes-servico/${id}`, { funcionarioId }, { token });
  },
};
