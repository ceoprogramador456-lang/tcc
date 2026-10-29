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
  criadoEm: Date;
}
