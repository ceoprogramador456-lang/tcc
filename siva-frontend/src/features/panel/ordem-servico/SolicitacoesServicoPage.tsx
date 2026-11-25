import { useMemo, useState } from 'react';
import { Plus, RefreshCw, Wrench } from 'lucide-react';

import { AlertMessage } from '../../../components/ui/AlertMessage';
import { Button } from '../../../components/ui/Button';
import { DataTable } from '../../../components/ui/DataTable';
import type { DataTableColumn } from '../../../components/ui/DataTable';
import { EmptyState } from '../../../components/ui/EmptyState';
import { LoadingBlock } from '../../../components/ui/LoadingBlock';
import { Pagination } from '../../../components/ui/Pagination';
import { SelectField } from '../../../components/ui/FormField';
import { useAsyncData } from '../../../hooks/use-async-data';
import { ordemServicoService } from '../../../services/ordem-servico/ordem-servico.service';
import { userService } from '../../../services/users/user.service';
import type {
  CreateOrdemServicoPayload,
  OrdemServico,
  StatusServico,
} from '../../../types/ordem-servico';
import { STATUS_SERVICO_LABELS, TIPO_SERVICO_LABELS } from '../../../types/ordem-servico';
import { formatDateTime } from '../../../utils/format';
import { useAuthenticatedSession } from '../../auth/hooks/use-authenticated-session';
import { PanelTopbar } from '../layout/PanelTopbar';
import { usePanelLayout } from '../layout/panel-layout-context';
import { usePermissions } from '../hooks/use-permissions';
import { StatusBadge } from '../../ordem-servico/components/StatusBadge';
import { SolicitacaoServicoFormDialog } from './components/SolicitacaoServicoFormDialog';

const PAGE_SIZE = 10;

const STATUS_FILTER_OPTIONS: { value: StatusServico; label: string }[] = [
  { value: 'aberto', label: STATUS_SERVICO_LABELS.aberto },
  { value: 'em_andamento', label: STATUS_SERVICO_LABELS.em_andamento },
  { value: 'concluido', label: STATUS_SERVICO_LABELS.concluido },
];

/** Tela do GESTOR: cria e acompanha as solicitações da empresa dele. */
export default function SolicitacoesServicoPage() {
  const { openMenu } = usePanelLayout();
  const session = useAuthenticatedSession();
  const { canWrite } = usePermissions();

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<StatusServico | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const { data, isLoading, error, reload } = useAsyncData(
    () => {
      if (!session) return Promise.reject(new Error('Sessão expirada.'));
      return ordemServicoService.list(session.token, { page, pageSize: PAGE_SIZE, status });
    },
    `${session?.token ?? ''}:${page}:${status ?? 'todos'}`,
  );

  const { data: funcionarios } = useAsyncData(
    () => {
      if (!session) return Promise.resolve(null);
      return userService.list(session.token, { pageSize: 100 });
    },
    session?.token ?? '',
  );

  const funcionarioMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const user of funcionarios?.items ?? []) {
      map.set(user.id, user.nome);
    }
    return map;
  }, [funcionarios?.items]);

  if (!session) return null;

  const handleSubmit = async (payload: CreateOrdemServicoPayload): Promise<void> => {
    await ordemServicoService.create(session.token, payload);
    setActionSuccess(`Solicitação "${payload.nome}" cadastrada.`);
    setIsFormOpen(false);
    reload();
  };

  const handleFilterChange = (value: string): void => {
    setStatus(value === '' ? null : (value as StatusServico));
    setPage(1);
  };

  const columns: DataTableColumn<OrdemServico>[] = [
    {
      key: 'nome',
      header: 'Serviço',
      render: (ordem) => (
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-siva-50 text-bright-teal-blue">
            <Wrench className="size-4" aria-hidden="true" />
          </span>
          <span className="font-semibold text-slate-900">{ordem.nome}</span>
        </div>
      ),
    },
    {
      key: 'tipo',
      header: 'Tipo',
      render: (ordem) => <span className="text-slate-600">{TIPO_SERVICO_LABELS[ordem.tipo]}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (ordem) => <StatusBadge status={ordem.status} />,
    },
    {
      key: 'criadoEm',
      header: 'Abertura',
      render: (ordem) => <span className="text-slate-500">{formatDateTime(ordem.criadoEm)}</span>,
    },
    {
      key: 'funcionario',
      header: 'Funcionário responsável',
      render: (ordem) => (
        <span className="text-slate-600">
          {ordem.funcionarioId ? (funcionarioMap.get(ordem.funcionarioId) ?? '—') : '—'}
        </span>
      ),
    },
  ];

  return (
    <>
      <PanelTopbar
        title="Solicitações de serviço"
        description="Peça manutenções e inspeções à equipe do seu setor"
        onOpenMenu={openMenu}
        showScopeSelector
        actions={
          <>
            <Button variant="outline" onClick={reload} disabled={isLoading}>
              <RefreshCw
                className={isLoading ? 'size-4 animate-spin' : 'size-4'}
                aria-hidden="true"
              />
              Atualizar
            </Button>
            {canWrite ? (
              <Button
                onClick={() => {
                  setActionError(null);
                  setActionSuccess(null);
                  setIsFormOpen(true);
                }}
              >
                <Plus className="size-4" aria-hidden="true" />
                Nova solicitação
              </Button>
            ) : null}
          </>
        }
      />

      <div className="space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        {actionError ? <AlertMessage tone="danger">{actionError}</AlertMessage> : null}
        {actionSuccess ? <AlertMessage tone="success">{actionSuccess}</AlertMessage> : null}
        {error ? (
          <AlertMessage tone="danger" title="Não foi possível carregar as solicitações">
            {error}
          </AlertMessage>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <SelectField
            name="status"
            label="Status"
            value={status ?? ''}
            onChange={handleFilterChange}
            options={STATUS_FILTER_OPTIONS}
            placeholder="Todos os status"
            className="w-full sm:w-56"
          />
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {isLoading && !data ? (
            <LoadingBlock label="Carregando solicitações…" />
          ) : (
            <DataTable
              columns={columns}
              rows={data?.items ?? []}
              rowKey={(ordem) => ordem.id}
              caption="Solicitações de serviço cadastradas"
              empty={
                <EmptyState
                  icon={Wrench}
                  title="Nenhuma solicitação encontrada"
                  description="Solicite uma manutenção ou inspeção para organizar o trabalho da equipe."
                />
              }
            />
          )}

          {data ? (
            <Pagination
              page={data.meta.page}
              totalPages={data.meta.totalPages}
              total={data.meta.total}
              pageSize={data.meta.pageSize}
              onPageChange={setPage}
            />
          ) : null}
        </div>
      </div>

      <SolicitacaoServicoFormDialog
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleSubmit}
      />
    </>
  );
}
