/**
 * Contratos de setor.
 *
 * Espelha `Sector` / `CreateSectorDTO` / `UpdateSectorDTO` do backend
 * (ver `src/modules/sectors/entities/sector.entity.ts`).
 */

export interface Sector {
  id: number;
  empresaId: number;
  nome: string;
  criadoEm: string;
}

export interface CreateSectorPayload {
  nome: string;
  empresaId: number;
}

export interface UpdateSectorPayload {
  nome: string;
}
