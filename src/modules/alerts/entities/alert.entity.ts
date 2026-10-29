// A tabela de alertas ainda não existe em db/db.sql — este módulo está
// preparado (rotas/estrutura) mas a regra de detecção é item de "Próximas etapas".
export type AlertSeverity = 'baixa' | 'media' | 'alta';

export interface Alert {
  id: number;
  sensorId: number;
  severidade: AlertSeverity;
  mensagem: string;
  criadoEm: Date;
}
