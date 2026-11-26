export type TipoEmpresa = 'SIVA' | 'CLIENTE';

export interface Company {
  id: number;
  nome: string;
  cnpj: string | null;
  /** SIVA = dona do sistema; CLIENTE = empresa que adquiriu o sistema. */
  tipo: TipoEmpresa;
  criadoEm: Date;
}
