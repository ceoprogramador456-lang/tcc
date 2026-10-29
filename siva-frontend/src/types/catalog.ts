/**
 * Contratos das entidades de apoio usadas para montar seletores em cascata
 * (empresa → setor → ativo / ESP32).
 *
 * Espelham `src/modules/{sectors,assets,devices}/entities` do backend.
 */

export interface Sector {
  id: number;
  empresaId: number;
  nome: string;
  criadoEm: string;
}

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

/** O token do dispositivo nunca é devolvido pelo back-end (`toPublicDevice`). */
export interface Device {
  id: number;
  setorId: number;
  espId: string;
  descricao: string | null;
  ultimoContato: string | null;
  criadoEm: string;
}
