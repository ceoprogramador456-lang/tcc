/**
 * Contrato do painel operacional (`GET /api/dashboard/overview`).
 *
 * Espelha `DashboardOverview` do backend
 * (ver `src/modules/dashboard/dtos/dashboard.dtos.ts`).
 */

export type AtividadeTipo = 'leitura' | 'manutencao' | 'dispositivo';

/** Resumo administrativo (`GET /api/dashboard/admin-summary`) — somente ADMIN. */
export interface AdminSummary {
  nEmpresas: number;
  nFuncionarios: number;
  nSensores: number;
  nEsp32: number;
  funcionarios: {
    total: number;
    gestores: number;
    tecnicos: number;
    mecanicos: number;
    eletricistas: number;
    ativos: number;
    inativos: number;
  };
}

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
  consumoAtual: MedidorConsumo | null;
  consumoDiario: MedidorConsumo | null;
  sensores: {
    ativos: number;
    total: number;
    semLeituraNoPeriodo: number;
  };
  alertas: {
    disponivel: boolean;
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
