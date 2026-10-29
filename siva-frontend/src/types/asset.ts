/**
 * Contratos de ativo.
 *
 * Espelha `Asset` / `CreateAssetDTO` / `UpdateAssetDTO` do backend
 * (ver `src/modules/assets/entities/asset.entity.ts`).
 */

export type AssetCriticality = 'baixa' | 'media' | 'alta';

export interface Asset {
  id: number;
  setorId: number;
  nome: string;
  tag: string | null;
  tipo: string | null;
  criticidade: AssetCriticality;
  centroCusto: string | null;
  fotoUrl: string | null;
  manualUrl: string | null;
  descricao: string | null;
  criadoEm: string;
}

export interface CreateAssetPayload {
  setorId: number;
  nome: string;
  tag?: string | null;
  tipo?: string | null;
  criticidade: AssetCriticality;
  centroCusto?: string | null;
  fotoUrl?: string | null;
  manualUrl?: string | null;
  descricao?: string | null;
}

export type UpdateAssetPayload = Partial<CreateAssetPayload>;
