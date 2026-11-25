import { useMemo, useState } from 'react';
import { Eye, RefreshCw, Wrench } from 'lucide-react';

import { AlertMessage } from '../../../components/ui/AlertMessage';
import { Button } from '../../../components/ui/Button';
import { DataTable } from '../../../components/ui/DataTable';
import type { DataTableColumn } from '../../../components/ui/DataTable';
import { EmptyState } from '../../../components/ui/EmptyState';
import { LoadingBlock } from '../../../components/ui/LoadingBlock';
import { Pagination } from '../../../components/ui/Pagination';
import { SelectField } from '../../../components/ui/FormField';
import { useAsyncData } from '../../../hooks/use-async-data';
import { companyService } from '../../../services/companies/company.service';
import { ordemServicoService } from '../../../services/ordem-servico/ordem-servico.service';
import { userService } from '../../../services/users/user.service';
import type { Company } from '../../../types/company';
import type { OrdemServico, StatusServico } from '../../../types/ordem-servico';
import { STATUS_SERVICO_LABELS, TIPO_SERVICO_LABELS } from '../../../types/ordem-servico';
import { formatDateTime } from '../../../utils/format';
import { useAuthenticatedSession } from '../../auth/hooks/use-authenticated-session';
import { AdminTopbar } from '../layout/AdminTopbar';
import { useAdminLayout } from '../layout/admin-layout-context';
import { StatusBadge } from '../../ordem-servico/components/StatusBadge';
import { AceitarOrdemServicoDialog } from './components/AceitarOrdemServicoDialog';
import { VisualizarOrdemServicoDialog } from './components/VisualizarOrdemServicoDialog';

const PAGE_SIZE = 10;

const STATUS_FILTER_OPTIONS: { value: StatusServico; label: string }[] = [
  { value: 'aberto', label: STATUS_SERVICO_LABELS.aberto },
  { value: 'em_andamento', label: STATUS_SERVICO_LABELS.em_andamento },
  { value: 'concluido', label: STATUS_SERVICO_LABELS.concluido },
];

/** Tela do ADMIN: lista todas as solicitações (empresas), aceita e conclui. */
export default function SolicitacoesServicoPage() {
  const { openMenu } = useAdminLayout();
  const session = useAuthenticatedSession();

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<StatusServico | null>(null);
  const [empresaId, setEmpresaId] = useState<string>('');
  const [ordemAberta, setOrdemAberta] = useState<OrdemServico | null>(null);
  const [ordemVisualizando, setOrdemVisualizando] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const { data, isLoading, error, reload } = useAsyncData(
    () => {
      if (!session) return Promise.reject(new Error('Sessão expirada.'));
      return ordemServicoService.list(session.token, {
        page,
        pageSize: PAGE_SIZE,
        status,
        empresaId: empresaId !== '' ? Number(empresaId) : null,
      });
    },
    `${session?.token ?? ''}:${page}:${status ?? 'todos'}:${empresaId || 'todas'}`,
  );

  const { data: empresas } = useAsyncData(
    () => {
      if (!session) return Promise.resolve(null);
      return companyService.list(session.token, { pageSize: 100 });
    },
    session?.token ?? '',
  );

  const { data: funcionarios } = useAsyncData(
    () => {
      if (!session) return Promise.resolve(null);
      return userService.list(session.token, { pageSize: 100 });
    },
    session?.token ?? '',
  );

  const empresaMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const company of empresas?.items ?? []) {
      map.set(company.id, company.nome);
    }
    return map;
  }, [empresas?.items]);

  const funcionarioMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const user of funcionarios?.items ?? []) {
      map.set(user.id, user.nome);
    }
    return map;
  }, [funcionarios?.items]);

  if (!session) return null;

  const handleFilterChange = (value: string): void => {
    setEmpresaId(value);
    setPage(1);
  };

  const handleAceitar = async (id: number, funcionarioId: number): Promise<void> => {
    await ordemServicoService.aceitar(session.token, id, { funcionarioId });
    setOrdemAberta(null);
    setActionSuccess('Solicitação aceita — funcionário designado.');
    reload();
  };

  const handleConcluir = async (ordem: OrdemServico): Promise<void> => {
    await ordemServicoService.concluir(session.token, ordem.id);
    setActionSuccess(`Solicitação "${ordem.nome}" concluída.`);
    reload();
  };

  const handleAlterarFuncionario = async (id: number, funcionarioId: number): Promise<void> => {
    await ordemServicoService.alterarFuncionario(session.token, id, funcionarioId);
    setActionSuccess('Funcionário responsável atualizado.');
    reload();
  };

  const columns: DataTableColumn<OrdemServico>[] = [
    {
      key: 'empresa',
      header: 'Empresa',
      render: (ordem) => (
        <span className="text-slate-600">{empresaMap.get(ordem.empresaId) ?? `Empresa #${ordem.empresaId}`}</span>
      ),
    },
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
      key: 'solicitante',
      header: 'Solicitante',
      render: (ordem) => (
        <span className="text-slate-600">
          {ordem.solicitanteId ? (funcionarioMap.get(ordem.solicitanteId) ?? '—') : '—'}
        </span>
      ),
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
    {
      key: 'criadoEm',
      header: 'Abertura',
      render: (ordem) => <span className="text-slate-500">{formatDateTime(ordem.criadoEm)}</span>,
    },
    {
      key: 'acoes',
      header: 'Ações',
      align: 'right',
      render: (ordem) => (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setOrdemVisualizando(ordem.id)}>
            <Eye className="size-4" aria-hidden="true" />
            Visualizar
          </Button>
          {ordem.status === 'aberto' ? (
            <Button
              size="sm"
              onClick={() => {
                setActionError(null);
                setActionSuccess(null);
                setOrdemAberta(ordem);
              }}
            >
              Aceitar
            </Button>
          ) : null}
          {ordem.status === 'em_andamento' ? (
            <Button size="sm" onClick={() => void handleConcluir(ordem)}>
              Concluir
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <>
      <AdminTopbar
        title="Solicitações de serviço"
        description="Revise e aceite as solicitações de todas as empresas"
        onOpenMenu={openMenu}
        actions={
          <Button variant="outline" onClick={reload} disabled={isLoading}>
            <RefreshCw className={isLoading ? 'size-4 animate-spin' : 'size-4'} aria-hidden="true" />
            Atualizar
          </Button>
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
            onChange={(value) => {
              setStatus(value === '' ? null : (value as StatusServico));
              setPage(1);
            }}
            options={STATUS_FILTER_OPTIONS}
            placeholder="Todos os status"
            className="w-full sm:w-56"
          />
          <SelectField
            name="empresaId"
            label="Empresa"
            value={empresaId}
            onChange={handleFilterChange}
            options={(empresas?.items ?? []).map((company: Company) => ({
              value: String(company.id),
              label: company.nome,
            }))}
            placeholder="Todas as empresas"
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
                  description="Não há solicitações pendentes com os filtros selecionados."
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

      <AceitarOrdemServicoDialog
        ordemId={ordemAberta?.id ?? 0}
        open={ordemAberta !== null}
        onClose={() => setOrdemAberta(null)}
        onAceitar={handleAceitar}
      />

      <VisualizarOrdemServicoDialog
        ordemId={ordemVisualizando ?? 0}
        open={ordemVisualizando !== null}
        onClose={() => setOrdemVisualizando(null)}
        onAlterarFuncionario={handleAlterarFuncionario}
        empresaMap={empresaMap}
        funcionarioMap={funcionarioMap}
      />
    </>
  );
}
