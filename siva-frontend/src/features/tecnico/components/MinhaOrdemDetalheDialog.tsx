import type { ReactNode } from 'react';

import { AlertMessage } from '../../../components/ui/AlertMessage';
import { Button } from '../../../components/ui/Button';
import { LoadingBlock } from '../../../components/ui/LoadingBlock';
import { Modal } from '../../../components/ui/Modal';
import { useAsyncData } from '../../../hooks/use-async-data';
import { ordemServicoService } from '../../../services/ordem-servico/ordem-servico.service';
import { TIPO_SERVICO_LABELS } from '../../../types/ordem-servico';
import { formatDateTime } from '../../../utils/format';
import { useAuthenticatedSession } from '../../auth/hooks/use-authenticated-session';
import { StatusBadge } from '../../ordem-servico/components/StatusBadge';

interface MinhaOrdemDetalheDialogProps {
  ordemId: number;
  open: boolean;
  onClose: () => void;
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <span className="text-slate-500">{label}</span>
      <span className="text-right text-slate-900">{value}</span>
    </div>
  );
}

/** Detalhe somente leitura de uma OS designada ao técnico autenticado. */
export function MinhaOrdemDetalheDialog({
  ordemId,
  open,
  onClose,
}: MinhaOrdemDetalheDialogProps) {
  return (
    <MinhaOrdemDetalheDialogBody key={ordemId} ordemId={ordemId} open={open} onClose={onClose} />
  );
}

function MinhaOrdemDetalheDialogBody({
  ordemId,
  open,
  onClose,
}: MinhaOrdemDetalheDialogProps) {
  const session = useAuthenticatedSession();
  const { data: ordem, isLoading, error } = useAsyncData(
    () => {
      if (!session || ordemId === 0) return Promise.resolve(null);
      return ordemServicoService.getById(session.token, ordemId);
    },
    `${session?.token ?? ''}:${ordemId}`,
  );

  if (!session || ordemId === 0) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={ordem?.nome ?? 'Detalhes da ordem de serviço'}
      description="Informações da ordem de serviço designada a você."
      size="sm"
      footer={
        <Button variant="outline" onClick={onClose}>
          Fechar
        </Button>
      }
    >
      {isLoading ? (
        <LoadingBlock label="Carregando detalhes da ordem…" minHeight="8rem" />
      ) : error ? (
        <AlertMessage tone="danger">{error}</AlertMessage>
      ) : ordem ? (
        <dl className="space-y-3">
          <InfoRow label="Ordem" value={`#${ordem.id}`} />
          <InfoRow label="Empresa" value={`#${ordem.empresaId}`} />
          <InfoRow label="Serviço" value={ordem.nome} />
          <InfoRow label="Tipo" value={TIPO_SERVICO_LABELS[ordem.tipo]} />
          <InfoRow label="Status" value={<StatusBadge status={ordem.status} />} />
          <InfoRow label="Abertura" value={formatDateTime(ordem.criadoEm)} />
          {ordem.aceitoEm ? (
            <InfoRow label="Designada em" value={formatDateTime(ordem.aceitoEm)} />
          ) : null}
          {ordem.concluidoEm ? (
            <InfoRow label="Concluída em" value={formatDateTime(ordem.concluidoEm)} />
          ) : null}
          <div className="border-t border-slate-200 pt-3">
            <dt className="text-slate-500">Descrição</dt>
            <dd className="mt-1 text-sm text-slate-900">
              {ordem.descricao ?? 'Sem descrição registrada.'}
            </dd>
          </div>
        </dl>
      ) : null}
    </Modal>
  );
}
