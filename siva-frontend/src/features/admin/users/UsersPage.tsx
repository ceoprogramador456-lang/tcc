import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Pencil, Plus, RefreshCw, Trash2, UserCheck, UserX } from 'lucide-react';

import { AlertMessage } from '../../../components/ui/AlertMessage';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { DataTable } from '../../../components/ui/DataTable';
import type { DataTableColumn } from '../../../components/ui/DataTable';
import { EmptyState } from '../../../components/ui/EmptyState';
import { SelectField } from '../../../components/ui/FormField';
import { LoadingBlock } from '../../../components/ui/LoadingBlock';
import { Pagination } from '../../../components/ui/Pagination';
import { useAsyncData } from '../../../hooks/use-async-data';
import { companyService } from '../../../services/companies/company.service';
import { userService } from '../../../services/users/user.service';
import type { Company } from '../../../types/company';
import type { PublicUser, StatusUsuario, UserType } from '../../../types/user';
import { useAuthenticatedSession } from '../../auth/hooks/use-authenticated-session';
import { ESPECIALIDADE_LABELS, USER_TYPE_LABELS } from '../../auth/user-labels';
import { AdminTopbar } from '../layout/AdminTopbar';
import { useAdminLayout } from '../layout/admin-layout-context';
import { UserFormDialog } from './components/UserFormDialog';
import { toCreatePayload, toUpdatePayload } from './user-form-rules';
import type { UserFormValues } from './user-form-rules';

const PAGE_SIZE = 10;

export default function UsersPage() {
  const { openMenu } = useAdminLayout();
  const session = useAuthenticatedSession();

  const [page, setPage] = useState(1);
  const [filterTipo, setFilterTipo] = useState<UserType | ''>('');
  const [filterStatus, setFilterStatus] = useState<StatusUsuario | ''>('');
  const [searchParams, setSearchParams] = useSearchParams();
  const filterEmpresaId = searchParams.get('empresaId') ?? '';
  const setFilterEmpresaId = (value: string): void => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value) next.set('empresaId', value);
        else next.delete('empresaId');
        return next;
      },
      { replace: true },
    );
  };

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<PublicUser | null>(null);
  const [userToDelete, setUserToDelete] = useState<PublicUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const { data: companies } = useAsyncData(() => {
    if (!session) return Promise.reject(new Error('Sessão expirada.'));
    return companyService.list(session.token, { page: 1, pageSize: 100 });
  }, session?.token);

  const { data, isLoading, error, reload } = useAsyncData(
    () => {
      if (!session) return Promise.reject(new Error('Sessão expirada.'));
      return userService.list(session.token, {
        page,
        pageSize: PAGE_SIZE,
        tipo: filterTipo || null,
        status: filterStatus || null,
        empresaId: filterEmpresaId ? Number(filterEmpresaId) : null,
      });
    },
    `${session?.token ?? ''}:${page}:${filterTipo}:${filterStatus}:${filterEmpresaId}`,
  );

  if (!session) return null;

  const companyNameById = new Map<number, string>(
    (companies?.items ?? []).map((company: Company) => [company.id, company.nome]),
  );

  const handleSubmit = async (values: UserFormValues): Promise<void> => {
    if (editing) {
      await userService.update(session.token, editing.id, toUpdatePayload(values));
      setActionSuccess(`Usuário "${values.nome.trim()}" atualizado.`);
    } else {
      await userService.create(session.token, toCreatePayload(values));
      setActionSuccess(`Usuário "${values.nome.trim()}" cadastrado.`);
    }
    setIsFormOpen(false);
    reload();
  };

  const handleToggleStatus = async (user: PublicUser): Promise<void> => {
    const nextStatus: StatusUsuario = user.status === 'ATIVO' ? 'INATIVO' : 'ATIVO';
    setActionError(null);
    try {
      await userService.setStatus(session.token, user.id, { status: nextStatus });
      setActionSuccess(
        `Usuário "${user.nome}" ${nextStatus === 'ATIVO' ? 'ativado' : 'inativado'}.`,
      );
      reload();
    } catch (toggleError: unknown) {
      setActionError(
        toggleError instanceof Error ? toggleError.message : 'Não foi possível alterar o status.',
      );
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!userToDelete) return;

    setIsDeleting(true);
    setActionError(null);
    try {
      await userService.remove(session.token, userToDelete.id);
      setActionSuccess(`Usuário "${userToDelete.nome}" excluído.`);
      setUserToDelete(null);
      if (data?.items.length === 1 && page > 1) setPage(page - 1);
      else reload();
    } catch (deleteError: unknown) {
      setActionError(
        deleteError instanceof Error ? deleteError.message : 'Não foi possível excluir o usuário.',
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: DataTableColumn<PublicUser>[] = [
    {
      key: 'nome',
      header: 'Usuário',
      render: (user) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-900">{user.nome}</p>
          <p className="truncate text-xs text-slate-500">{user.email}</p>
        </div>
      ),
    },
    {
      key: 'perfil',
      header: 'Perfil',
      render: (user) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone="brand">{USER_TYPE_LABELS[user.tipo]}</Badge>
          {user.tipo === 'TECNICO' && user.especialidade ? (
            <Badge tone="info">{ESPECIALIDADE_LABELS[user.especialidade]}</Badge>
          ) : null}
        </div>
      ),
    },
    {
      key: 'empresa',
      header: 'Empresa',
      render: (user) =>
        user.empresaId === null ? (
          <span className="text-slate-400">Acesso global</span>
        ) : (
          <span>{companyNameById.get(user.empresaId) ?? `ID ${user.empresaId}`}</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (user) => (
        <Badge tone={user.status === 'ATIVO' ? 'success' : 'warning'}>
          {user.status === 'ATIVO' ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
    },
    {
      key: 'acoes',
      header: 'Ações',
      align: 'right',
      render: (user) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => void handleToggleStatus(user)}
            className="inline-flex size-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-siva-50 hover:text-bright-teal-blue"
            aria-label={user.status === 'ATIVO' ? `Inativar ${user.nome}` : `Ativar ${user.nome}`}
            title={user.status === 'ATIVO' ? 'Inativar' : 'Ativar'}
          >
            {user.status === 'ATIVO' ? (
              <UserX className="size-4" aria-hidden="true" />
            ) : (
              <UserCheck className="size-4" aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(user);
              setActionError(null);
              setIsFormOpen(true);
            }}
            className="inline-flex size-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-siva-50 hover:text-bright-teal-blue"
            aria-label={`Editar ${user.nome}`}
            title="Editar"
          >
            <Pencil className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setUserToDelete(user)}
            className="inline-flex size-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
            aria-label={`Excluir ${user.nome}`}
            title="Excluir"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        </div>
      ),
    },
  ];

  const hasFilters = filterTipo !== '' || filterStatus !== '' || filterEmpresaId !== '';

  return (
    <>
      <AdminTopbar
        title="Usuários e acessos"
        description="Gerencie quem entra no SIVA, sua empresa e suas permissões"
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
            <Button
              onClick={() => {
                setEditing(null);
                setActionError(null);
                setIsFormOpen(true);
              }}
            >
              <Plus className="size-4" aria-hidden="true" />
              Novo usuário
            </Button>
          </>
        }
      />

      <div className="space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        {actionError ? <AlertMessage tone="danger">{actionError}</AlertMessage> : null}
        {actionSuccess ? <AlertMessage tone="success">{actionSuccess}</AlertMessage> : null}
        {error ? (
          <AlertMessage tone="danger" title="Não foi possível carregar os usuários">
            {error}
          </AlertMessage>
        ) : null}

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SelectField
              name="filtroEmpresa"
              label="Empresa"
              value={filterEmpresaId}
              onChange={(value) => {
                setFilterEmpresaId(value);
                setPage(1);
              }}
              placeholder="Todas as empresas"
              options={(companies?.items ?? []).map((company) => ({
                value: String(company.id),
                label: company.nome,
              }))}
            />

            <SelectField
              name="filtroTipo"
              label="Perfil"
              value={filterTipo}
              onChange={(value) => {
                setFilterTipo(value as UserType | '');
                setPage(1);
              }}
              placeholder="Todos os perfis"
              options={[
                { value: 'ADMIN', label: 'Administrador' },
                { value: 'GESTOR', label: 'Gestor' },
                { value: 'TECNICO', label: 'Técnico' },
              ]}
            />

            <SelectField
              name="filtroStatus"
              label="Status"
              value={filterStatus}
              onChange={(value) => {
                setFilterStatus(value as StatusUsuario | '');
                setPage(1);
              }}
              placeholder="Todos os status"
              options={[
                { value: 'ATIVO', label: 'Ativo' },
                { value: 'INATIVO', label: 'Inativo' },
              ]}
            />

            <div className="flex items-end">
              <Button
                variant="outline"
                className="w-full"
                disabled={!hasFilters}
                onClick={() => {
                  setFilterTipo('');
                  setFilterStatus('');
                  setFilterEmpresaId('');
                  setPage(1);
                }}
              >
                Limpar filtros
              </Button>
            </div>
          </div>
        </section>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {isLoading && !data ? (
            <LoadingBlock label="Carregando usuários…" />
          ) : (
            <DataTable
              columns={columns}
              rows={data?.items ?? []}
              rowKey={(user) => user.id}
              caption="Usuários cadastrados"
              empty={
                <EmptyState
                  icon={UserCheck}
                  title="Nenhum usuário encontrado"
                  description={
                    hasFilters
                      ? 'Nenhum usuário corresponde aos filtros aplicados.'
                      : 'Cadastre o primeiro usuário para dar acesso ao sistema.'
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

      <UserFormDialog
        open={isFormOpen}
        user={editing}
        companies={companies?.items ?? []}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={userToDelete !== null}
        title="Excluir usuário"
        description={`O usuário "${userToDelete?.nome ?? ''}" será removido permanentemente. Usuários com registros relacionados não podem ser excluídos — nesse caso, considere inativá-lo.`}
        confirmLabel="Excluir"
        isLoading={isDeleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setUserToDelete(null)}
      />
    </>
  );
}
