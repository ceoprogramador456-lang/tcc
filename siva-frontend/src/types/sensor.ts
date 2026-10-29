/**
 * Contratos de sensor.
 *
 * Espelha `Sensor` / `CreateSensorDTO` / `UpdateSensorDTO` do backend
 * (ver `src/modules/sensors/entities/sensor.entity.ts`).
 */

export interface Sensor {
  id: number;
  ativoId: number;
  esp32Id: number;
  sensorId: string;
  tag: string | null;
  descricao: string | null;
  ativoStatus: boolean;
  criadoEm: string;
}

export interface CreateSensorPayload {
  ativoId: number;
  esp32Id: number;
  sensorId: string;
  tag?: string | null;
  descricao?: string | null;
  ativoStatus?: boolean;
}

/** `ativoId`, `esp32Id` e `sensorId` não são alteráveis (omitidos no schema do back-end). */
export type UpdateSensorPayload = Partial<
  Omit<CreateSensorPayload, 'ativoId' | 'esp32Id' | 'sensorId'>
>;
