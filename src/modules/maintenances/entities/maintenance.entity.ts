export type MaintenanceType = 'preventiva' | 'corretiva' | 'inspecao';
export type MaintenanceStatus = 'aberto' | 'em_andamento' | 'concluido';

export interface Maintenance {
  id: number;
  sensorId: number;
  tipo: MaintenanceType;
  status: MaintenanceStatus;
  descricao: string | null;
  funcionarioId: number | null;
  abertoEm: Date;
  concluidoEm: Date | null;
}
