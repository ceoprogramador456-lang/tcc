import { useState } from 'react';
import type { ReactNode } from 'react';

import { AlertMessage } from '../../../../components/ui/AlertMessage';
import { Button } from '../../../../components/ui/Button';
import { LoadingBlock } from '../../../../components/ui/LoadingBlock';
import { Modal } from '../../../../components/ui/Modal';
import { useAsyncData } from '../../../../hooks/use-async-data';
import { ordemServicoService } from '../../../../services/ordem-servico/ordem-servico.service';
import { TIPO_SERVICO_LABELS } from '../../../../types/ordem-servico';
import { formatDateTime } from '../../../../utils/format';
import { useAuthenticatedSession } from '../../../auth/hooks/use-authenticated-session';
import { StatusBadge } from '../../../ordem-servico/components/StatusBadge';
import { FuncionariosSelect } from './FuncionariosSelect';

interface VisualizarOrdemServicoDialogProps {
  ordemId: number;
  open: boolean;
  onClose: () => void;
  onAlterarFuncionario: (ordemId: number, funcionarioId: number) => Promise<void>;
  /** Mapa id da empresa → nome (preenchido pela página). */
  empresaMap: ReadonlyMap<number, string>;
  /** Mapa id do usuário → nome (preenchido pela página). */
  funcionarioMap: ReadonlyMap<number, string>;
}

function InfoRow({ label, value, mono = false }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <span className="text-slate-500">{label}</span>
      <span className={mono ? 'font-mono text-xs text-slate-900' : 'text-slate-900'}>{value}</span>
    </div>
  );
}

/** Modal de detalhes da OS: visualização + troca de funcionário responsável (ADMIN). */
export function VisualizarOrdemServicoDialog({
  ordemId,
  open,
  onClose,
  onAlterarFuncionario,
  empresaMap,
  funcionarioMap,
}: VisualizarOrdemServicoDialogProps) {
  return (
    <VisualizarOrdemServicoDialogBody
      key={ordemId}
      ordemId={ordemId}
      open={open}
      onClose={onClose}
      onAlterarFuncionario={onAlterarFuncionario}
      empresaMap={empresaMap}
      funcionarioMap={funcionarioMap}
    />
  );
}

function VisualizarOrdemServicoDialogBody({
  ordemId,
  open,
  onClose,
  onAlterarFuncionario,
  empresaMap,
  funcionarioMap,
}: VisualizarOrdemServicoDialogProps) {
  const session = useAuthenticatedSession();
  const { data: ordem, isLoading, error } = useAsyncData(
    () => {
      if (!session || ordemId === 0) return Promise.resolve(null);
      return ordemServicoService.getById(session.token, ordemId);
    },
    `${session?.token ?? ''}:${ordemId}`,
  );

  const [funcionarioId, setFuncionarioId] = useState('');
  const [hasTouched, setHasTouched] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Antes de interação, a seleção é o funcionário atual (pré-carregado);
  // ao escolher, usa o valor informado — o status não muda na troca.
  const selectedValue = hasTouched ? funcionarioId : String(ordem?.funcionarioId ?? '');
  const hasChanged =
    selectedValue !== '' && selectedValue !== String(ordem?.funcionarioId ?? '');

  if (!session || ordemId === 0) return null;

  const editarFuncionario = ordem?.status === 'aberto' || ordem?.status === 'em_andamento';

  const handleSave = async (): Promise<void> => {
    if (!ordem || !hasChanged) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      await onAlterarFuncionario(ordem.id, Number(selectedValue));
      onClose();
    } catch (error: unknown) {
      setSaveError(
        error instanceof Error
          ? error.message
          : 'Não foi possível alterar o funcionário responsável.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={ordem?.nome ?? 'Detalhes da solicitação'}
      description="Informações da ordem de serviço e do funcionário responsável."
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Fechar
          </Button>
          {editarFuncionario ? (
            <Button onClick={() => void handleSave()} disabled={isSaving || !hasChanged}>
              {isSaving ? 'Salvando…' : 'Salvar alteração'}
            </Button>
          ) : null}
        </>
      }
    >
      {isLoading ? (
        <LoadingBlock label="Carregando detalhes da solicitação…" minHeight="8rem" />
      ) : error ? (
        <AlertMessage tone="danger">{error}</AlertMessage>
      ) : ordem ? (
        <div className="space-y-4">
          <dl className="space-y-3">
            <InfoRow
              label="Empresa"
              value={empresaMap.get(ordem.empresaId) ?? `Empresa #${ordem.empresaId}`}
            />
            <InfoRow label="Serviço" value={ordem.nome} mono />
            <InfoRow label="Tipo" value={TIPO_SERVICO_LABELS[ordem.tipo]} />
            <InfoRow label="Status" value={<StatusBadge status={ordem.status} />} />
            <InfoRow label="Solicitante" value={funcionarioMap.get(ordem.solicitanteId) ?? '—'} />
            <InfoRow label="Abertura" value={formatDateTime(ordem.criadoEm)} />
            <InfoRow label="Descrição" value={ordem.descricao ?? 'Sem descrição registrada.'} />
          </dl>

          <div>
            <h3 className="text-sm font-semibold text-slate-900">Funcionário responsável</h3>
            {editarFuncionario ? (
              <FuncionariosSelect
                label="Responsável"
                required
                value={selectedValue}
                onChange={(value) => {
                  setHasTouched(true);
                  setFuncionarioId(value);
                }}
                error={saveError ?? undefined}
                disabled={isSaving}
                placeholder="Selecione o funcionário"
              />
            ) : (
              <p className="mt-1.5 text-sm text-slate-600">
                {ordem.funcionarioId
                  ? (funcionarioMap.get(ordem.funcionarioId) ?? `#${ordem.funcionarioId}`)
                  : 'Ainda não designado.'}
              </p>
            )}
            {ordem.aceitoEm ? (
              <p className="mt-2 text-xs text-slate-500">
                Designado em {formatDateTime(ordem.aceitoEm)}
                {ordem.aceitoPor
                  ? ` — ${funcionarioMap.get(ordem.aceitoPor) ?? ordem.aceitoPor}`
                  : ''}
              </p>
            ) : null}
          </div>

          {ordem.status === 'concluido' && ordem.concluidoEm ? (
            <p className="text-xs text-slate-500">Concluída em {formatDateTime(ordem.concluidoEm)}.</p>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}
