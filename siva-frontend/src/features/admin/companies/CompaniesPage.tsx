import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building, Eye, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';

import { AlertMessage } from '../../../components/ui/AlertMessage';
import { Button } from '../../../components/ui/Button';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { DataTable } from '../../../components/ui/DataTable';
import type { DataTableColumn } from '../../../components/ui/DataTable';
import { EmptyState } from '../../../components/ui/EmptyState';
import { LoadingBlock } from '../../../components/ui/LoadingBlock';
import { Pagination } from '../../../components/ui/Pagination';
import { useAsyncData } from '../../../hooks/use-async-data';
import { companyService } from '../../../services/companies/company.service';
import type { Company, CreateCompanyPayload } from '../../../types/company';
import { formatDate } from '../../../utils/format';
import { useAuthenticatedSession } from '../../auth/hooks/use-authenticated-session';
import { AdminTopbar } from '../layout/AdminTopbar';
import { useAdminLayout } from '../layout/admin-layout-context';
import { CompanyFormDialog } from './components/CompanyFormDialog';

const PAGE_SIZE = 10;

export default function CompaniesPage() {
  const { openMenu } = useAdminLayout();
  const session = useAuthenticatedSession();

  const [page, setPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const { data, isLoading, error, reload } = useAsyncData(
    () => {
      if (!session) return Promise.reject(new Error('Sessão expirada.'));
      return companyService.list(session.token, { page, pageSize: PAGE_SIZE });
    },
    `${session?.token ?? ''}:${page}`,
  );

  if (!session) return null;

  const handleOpenCreate = (): void => {
    setEditing(null);
    setActionError(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (company: Company): void => {
    setEditing(company);
    setActionError(null);
    setIsFormOpen(true);
  };

  const handleSubmit = async (payload: CreateCompanyPayload): Promise<void> => {
    if (editing) {
      await companyService.update(session.token, editing.id, payload);
      setActionSuccess(`Empresa "${payload.nome}" atualizada.`);
    } else {
      await companyService.create(session.token, payload);
      setActionSuccess(`Empresa "${payload.nome}" cadastrada.`);
    }
    setIsFormOpen(false);
    reload();
  };

  const handleDelete = async (): Promise<void> => {
    if (!companyToDelete) return;

    setIsDeleting(true);
    setActionError(null);
    try {
      await companyService.remove(session.token, companyToDelete.id);
      setActionSuccess(`Empresa "${companyToDelete.nome}" excluída.`);
      setCompanyToDelete(null);
      if (data?.items.length === 1 && page > 1) setPage(page - 1);
      else reload();
    } catch (deleteError: unknown) {
      setActionError(
        deleteError instanceof Error ? deleteError.message : 'Não foi possível excluir a empresa.',
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: DataTableColumn<Company>[] = [
    {
      key: 'nome',
      header: 'Empresa',
      render: (company) => (
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-siva-50 text-bright-teal-blue">
            <Building className="size-4" aria-hidden="true" />
          </span>
          <span className="font-semibold text-slate-900">{company.nome}</span>
        </div>
      ),
    },
    {
      key: 'cnpj',
      header: 'CNPJ',
      render: (company) => <span className="font-mono text-xs">{company.cnpj ?? '—'}</span>,
    },
    {
      key: 'criadoEm',
      header: 'Cadastrada em',
      render: (company) => <span className="text-slate-500">{formatDate(company.criadoEm)}</span>,
    },
    {
      key: 'acoes',
      header: 'Ações',
      align: 'right',
      render: (company) => (
        <div className="flex items-center justify-end gap-1">
          <Link
            to={`/admin/empresas/${company.id}`}
            className="inline-flex size-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-siva-50 hover:text-bright-teal-blue"
            aria-label={`Ver detalhes de ${company.nome}`}
            title="Ver detalhes"
          >
            <Eye className="size-4" aria-hidden="true" />
          </Link>
          <button
            type="button"
            onClick={() => handleOpenEdit(company)}
            className="inline-flex size-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-siva-50 hover:text-bright-teal-blue"
            aria-label={`Editar ${company.nome}`}
            title="Editar"
          >
            <Pencil className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setCompanyToDelete(company)}
            className="inline-flex size-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
            aria-label={`Excluir ${company.nome}`}
            title="Excluir"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <AdminTopbar
        title="Empresas"
        description="Localize empresas clientes e organize seus dados e acessos"
        onOpenMenu={openMenu}
        actions={
          <>
            <Button variant="outline" onClick={reload} disabled={isLoading}>
              <RefreshCw
                className={isLoading ? 'size-4 animate-spin' : 'size-4'}
                aria-hidden="true"
              />
              Atualizar
            </Button>
            <Button onClick={handleOpenCreate}>
              <Plus className="size-4" aria-hidden="true" />
              Cadastrar empresa
            </Button>
          </>
        }
      />

      <div className="space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        {actionError ? <AlertMessage tone="danger">{actionError}</AlertMessage> : null}
        {actionSuccess ? <AlertMessage tone="success">{actionSuccess}</AlertMessage> : null}
        {error ? (
          <AlertMessage tone="danger" title="Não foi possível carregar as empresas">
            {error}
          </AlertMessage>
        ) : null}

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {isLoading && !data ? (
            <LoadingBlock label="Carregando empresas…" />
          ) : (
            <DataTable
              columns={columns}
              rows={data?.items ?? []}
              rowKey={(company) => company.id}
              caption="Empresas cadastradas"
              empty={
                <EmptyState
                  icon={Building}
                  title="Nenhuma empresa cadastrada"
                  description="Cadastre a primeira empresa para começar a gerenciar usuários e sensores."
                  action={
                    <Button onClick={handleOpenCreate}>
                      <Plus className="size-4" aria-hidden="true" />
                      Cadastrar empresa
                    </Button>
                  }
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

      <CompanyFormDialog
        open={isFormOpen}
        company={editing}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={companyToDelete !== null}
        title="Excluir empresa"
        description={`A empresa "${companyToDelete?.nome ?? ''}" será removida permanentemente. Empresas com setores, usuários ou dispositivos vinculados não podem ser excluídas — nesse caso, o sistema recusará a operação.`}
        confirmLabel="Excluir"
        isLoading={isDeleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setCompanyToDelete(null)}
      />
    </>
  );
}
