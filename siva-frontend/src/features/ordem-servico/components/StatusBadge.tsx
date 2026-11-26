import { Badge } from '../../../components/ui/Badge';
import { STATUS_SERVICO_LABELS, type StatusServico } from '../../../types/ordem-servico';

export function StatusBadge({ status }: { status: StatusServico }) {
  const tone = status === 'aberto' ? 'danger' : status === 'em_andamento' ? 'warning' : 'neutral';
  return <Badge tone={tone}>{STATUS_SERVICO_LABELS[status]}</Badge>;
}
