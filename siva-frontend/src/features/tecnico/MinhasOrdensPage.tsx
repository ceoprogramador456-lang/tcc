import { useState } from 'react';
import { Eye, RefreshCw, Wrench } from 'lucide-react';

import { AlertMessage } from '../../components/ui/AlertMessage';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/ui/DataTable';
import type { DataTableColumn } from '../../components/ui/DataTable';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingBlock } from '../../components/ui/LoadingBlock';
import { Pagination } from '../../components/ui/Pagination';
import { SelectField } from '../../components/ui/FormField';
import { useAsyncData } from '../../hooks/use-async-data';
import { ordemServicoService } from '../../services/ordem-servico/ordem-servico.service';
import type { OrdemServico, StatusServico } from '../../types/ordem-servico';
import { STATUS_SERVICO_LABELS, TIPO_SERVICO_LABELS } from '../../types/ordem-servico';
import { formatDateTime } from '../../utils/format';
import { useAuthenticatedSession } from '../auth/hooks/use-authenticated-session';
import { StatusBadge } from '../ordem-servico/components/StatusBadge';
import { MinhaOrdemDetalheDialog } from './components/MinhaOrdemDetalheDialog';

const PAGE_SIZE = 10;

const STATUS_FILTER_OPTIONS: { value: StatusServico; label: string }[] = [
  { value: 'aberto', label: STATUS_SERVICO_LABELS.aberto },
  { value: 'em_andamento', label: STATUS_SERVICO_LABELS.em_andamento },
  { value: 'concluido', label: STATUS_SERVICO_LABELS.concluido },
];

/**
 * Única tela do técnico da SIVA: as ordens de serviço designadas a ele.
 *
 * O back-end filtra por `funcionarioId` do usuário autenticado — o técnico
 * nunca recebe as ordens de outro técnico, mesmo alterando a requisição.
 */
export default function MinhasOrdensPage() {
  const session = useAuthenticatedSession();

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<StatusServico | null>(null);
  const [ordemVisualizando, setOrdemVisualizando] = useState<number | null>(null);

  const { data, isLoading, error, reload } = useAsyncData(
    () => {
      if (!session) return Promise.reject(new Error('Sessão expirada.'));
      return ordemServicoService.list(session.token, { page, pageSize: PAGE_SIZE, status });
    },
    `${session?.token ?? ''}:${page}:${status ?? 'todos'}`,
  );

  if (!session) return null;

  const handleStatusChange = (value: string): void => {
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
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-900">{ordem.nome}</p>
            <p className="truncate text-xs text-slate-500">Ordem #{ordem.id}</p>
          </div>
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
      key: 'concluidoEm',
      header: 'Conclusão',
      render: (ordem) => (
        <span className="text-slate-500">
          {ordem.concluidoEm ? formatDateTime(ordem.concluidoEm) : '—'}
        </span>
      ),
    },
    {
      key: 'acoes',
      header: 'Ações',
      align: 'right',
      render: (ordem) => (
        <Button variant="outline" size="sm" onClick={() => setOrdemVisualizando(ordem.id)}>
          <Eye className="size-4" aria-hidden="true" />
          Detalhes
        </Button>
      ),
    },
  ];

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-xl font-bold text-slate-900">
            Minhas ordens de serviço
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">
            Ordens de serviço designadas a você pela equipe do SIVA.
          </p>
        </div>

        <Button variant="outline" onClick={reload} disabled={isLoading}>
          <RefreshCw className={isLoading ? 'size-4 animate-spin' : 'size-4'} aria-hidden="true" />
          Atualizar
        </Button>
      </div>

      <div className="space-y-4">
        {error ? (
          <AlertMessage tone="danger" title="Não foi possível carregar suas ordens">
            {error}
          </AlertMessage>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <SelectField
            name="status"
            label="Status"
            value={status ?? ''}
            onChange={handleStatusChange}
            options={STATUS_FILTER_OPTIONS}
            placeholder="Todos os status"
            className="w-full sm:w-56"
          />
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {isLoading && !data ? (
            <LoadingBlock label="Carregando suas ordens de serviço…" />
          ) : (
            <DataTable
              columns={columns}
              rows={data?.items ?? []}
              rowKey={(ordem) => ordem.id}
              caption="Ordens de serviço designadas ao técnico"
              empty={
                <EmptyState
                  icon={Wrench}
                  title="Nenhuma ordem de serviço"
                  description="Quando uma ordem for designada a você, ela aparecerá nesta lista."
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

      <MinhaOrdemDetalheDialog
        ordemId={ordemVisualizando ?? 0}
        open={ordemVisualizando !== null}
        onClose={() => setOrdemVisualizando(null)}
      />
    </>
  );
}
