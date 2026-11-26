/**
 * Contratos de solicitação de serviço.
 *
 * Espelha `OrdemServico` do backend (ver `src/modules/ordemServico/entities/ordemServico.entity.ts`).
 * Reaproveita os ENUMs `TipoManutencao`/`StatusManutencao` do sistema.
 */

export type TipoServico = 'preventiva' | 'corretiva' | 'inspecao';
export type StatusServico = 'aberto' | 'em_andamento' | 'concluido';

export interface OrdemServico {
  id: number;
  nome: string;
  tipo: TipoServico;
  descricao: string | null;
  status: StatusServico;
  empresaId: number;
  /** Gestor que criou a solicitação. */
  solicitanteId: number;
  /** Funcionário executor — atribuído na transição para "em_andamento". */
  funcionarioId: number | null;
  /** Administrador que aceitou. */
  aceitoPor: number | null;
  aceitoEm: string | null;
  concluidoEm: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

export interface CreateOrdemServicoPayload {
  nome: string;
  tipo: TipoServico;
  descricao?: string | null;
}

export interface AceitarOrdemServicoPayload {
  funcionarioId: number;
}

export const TIPO_SERVICO_LABELS: Record<TipoServico, string> = {
  preventiva: 'Preventiva',
  corretiva: 'Corretiva',
  inspecao: 'Inspeção',
};

export const STATUS_SERVICO_LABELS: Record<StatusServico, string> = {
  aberto: 'Aberto',
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
};
