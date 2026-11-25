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
  aceitoEm: Date | null;
  concluidoEm: Date | null;
  criadoEm: Date;
  atualizadoEm: Date;
}
