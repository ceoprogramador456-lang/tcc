export interface Sensor {
  id: number;
  ativoId: number;
  esp32Id: number;
  sensorId: string;
  tag: string | null;
  descricao: string | null;
  ativoStatus: boolean;
  criadoEm: Date;
}
