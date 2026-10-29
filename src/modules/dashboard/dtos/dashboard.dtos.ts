/**
 * Contrato do painel operacional (`GET /api/dashboard/overview`).
 *
 * Todos os valores são calculados pelo back-end a partir das leituras,
 * sensores, manutenções e dispositivos registrados no banco.
 */

export type AtividadeTipo = 'leitura' | 'manutencao' | 'dispositivo';

export interface DashboardAtividade {
  id: string;
  tipo: AtividadeTipo;
  titulo: string;
  descricao: string;
  occurredAt: string;
}

export interface MedidorConsumo {
  valor: number;
  unidade: 'L/min' | 'L';
  atualizadoEm: string | null;
}

export interface DashboardOverview {
  periodo: {
    inicio: string;
    fim: string;
  };
  /** Soma da vazão instantânea (L/min) dos sensores ativos com leitura recente. */
  consumoAtual: MedidorConsumo | null;
  /** Volume consumido (L) nas últimas 24 h, integrado pela série de leituras. */
  consumoDiario: MedidorConsumo | null;
  sensores: {
    ativos: number;
    total: number;
    semLeituraNoPeriodo: number;
  };
  /**
   * Alertas: o módulo de alertas do back-end ainda não foi implementado
   * (`GET /api/alerts` responde 501). Enquanto não houver fonte de dados,
   * o indicador é enviado como `null` e a interface exibe estado vazio —
   * nunca um número fictício.
   */
  alertas: {
    disponivel: false;
    total: number | null;
  };
  manutencoes: {
    pendentes: number;
    total: number;
  };
  esp32: {
    online: number;
    total: number;
  };
  atividades: DashboardAtividade[];
}
