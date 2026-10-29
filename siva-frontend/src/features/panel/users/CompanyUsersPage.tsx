import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { AlertMessage } from '../../../components/ui/AlertMessage';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { DataTable } from '../../../components/ui/DataTable';
import { EmptyState } from '../../../components/ui/EmptyState';
import { LoadingBlock } from '../../../components/ui/LoadingBlock';
import { Pagination } from '../../../components/ui/Pagination';
import { useAsyncData } from '../../../hooks/use-async-data';
import { userService } from '../../../services/users/user.service';
import { useAuthenticatedSession } from '../../auth/hooks/use-authenticated-session';
import { ESPECIALIDADE_LABELS, USER_TYPE_LABELS } from '../../auth/user-labels';
import { PanelTopbar } from '../layout/PanelTopbar';
import { usePanelLayout } from '../layout/panel-layout-context';

const PAGE_SIZE = 10;

/** Consulta da equipe; alterações de contas são exclusivas do administrador. */
export default function CompanyUsersPage() {
  const session = useAuthenticatedSession();
  const { openMenu } = usePanelLayout();
  const [page, setPage] = useState(1);
  const { data, isLoading, error, reload } = useAsyncData(
    () => {
      if (!session) return Promise.reject(new Error('Sessão expirada.'));
      return userService.list(session.token, {
        page,
        pageSize: PAGE_SIZE,
        empresaId: session.user.empresaId,
      });
    },
    `${session?.token ?? ''}:${page}`,
  );

  return (
    <>
      <PanelTopbar
        title="Equipe da empresa"
        description="Veja quem tem acesso à sua empresa, seu perfil e a situação da conta"
        onOpenMenu={openMenu}
        actions={
          <Button variant="outline" onClick={reload} disabled={isLoading}>
            <RefreshCw className="size-4" aria-hidden="true" />
            Atualizar
          </Button>
        }
      />
      <div className="space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        <AlertMessage tone="info">
          Para cadastrar, editar ou alterar o status de uma conta, solicite ao administrador do
          SIVA.
        </AlertMessage>
        {error ? (
          <AlertMessage tone="danger" title="Não foi possível carregar a equipe">
            {error}
          </AlertMessage>
        ) : null}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {isLoading ? (
            <LoadingBlock label="Carregando usuários…" />
          ) : (
            <DataTable
              rows={data?.items ?? []}
              rowKey={(user) => user.id}
              caption="Usuários da empresa"
              columns={[
                {
                  key: 'nome',
                  header: 'Usuário',
                  render: (user) => (
                    <div>
                      <p className="font-semibold">{user.nome}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                  ),
                },
                {
                  key: 'tipo',
                  header: 'Perfil',
                  render: (user) => <Badge tone="brand">{USER_TYPE_LABELS[user.tipo]}</Badge>,
                },
                {
                  key: 'especialidade',
                  header: 'Especialidade',
                  render: (user) =>
                    user.especialidade ? ESPECIALIDADE_LABELS[user.especialidade] : '—',
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
              ]}
              empty={
                <EmptyState
                  title="Nenhum usuário vinculado"
                  description="As contas da sua empresa aparecerão aqui."
                />
              }
            />
          )}
          {data && !isLoading ? (
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
    </>
  );
}
