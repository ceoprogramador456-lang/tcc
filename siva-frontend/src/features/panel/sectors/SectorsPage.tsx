import { useState } from 'react';
import { Boxes, Eye, Pencil, Plus, RefreshCw, Trash2, Warehouse } from 'lucide-react';

import { AlertMessage } from '../../../components/ui/AlertMessage';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { DataTable } from '../../../components/ui/DataTable';
import type { DataTableColumn } from '../../../components/ui/DataTable';
import { EmptyState } from '../../../components/ui/EmptyState';
import { LoadingBlock } from '../../../components/ui/LoadingBlock';
import { Modal } from '../../../components/ui/Modal';
import { Pagination } from '../../../components/ui/Pagination';
import { useAsyncData } from '../../../hooks/use-async-data';
import { assetService } from '../../../services/assets/asset.service';
import { sectorService } from '../../../services/sectors/sector.service';
import type { Asset } from '../../../types/asset';
import type { CreateSectorPayload, Sector, UpdateSectorPayload } from '../../../types/sector';
import { formatDate } from '../../../utils/format';
import { useAuthenticatedSession } from '../../auth/hooks/use-authenticated-session';
import { PanelTopbar } from '../layout/PanelTopbar';
import { usePanelLayout } from '../layout/panel-layout-context';
import { usePanelScope } from '../hooks/use-panel-scope';
import { usePermissions } from '../hooks/use-permissions';
import { SectorFormDialog } from './components/SectorFormDialog';

const PAGE_SIZE = 10;

export default function SectorsPage() {
  const { openMenu } = usePanelLayout();
  const session = useAuthenticatedSession();
  const { empresaId } = usePanelScope();
  const { canWrite } = usePermissions();

  const [page, setPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Sector | null>(null);
  const [sectorToDelete, setSectorToDelete] = useState<Sector | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [details, setDetails] = useState<Sector | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const { data, isLoading, error, reload } = useAsyncData(
    () => {
      if (!session) return Promise.reject(new Error('Sessão expirada.'));
      return sectorService.list(session.token, {
        page,
        pageSize: PAGE_SIZE,
        empresaId: empresaId ?? undefined,
      });
    },
    `${session?.token ?? ''}:${page}:${empresaId ?? 'todas'}`,
  );

  if (!session) return null;

  const handleSubmit = async (
    payload: CreateSectorPayload | UpdateSectorPayload,
  ): Promise<void> => {
    if (editing) {
      await sectorService.update(session.token, editing.id, { nome: payload.nome });
      setActionSuccess(`Setor "${payload.nome}" atualizado.`);
    } else {
      await sectorService.create(session.token, payload as CreateSectorPayload);
      setActionSuccess(`Setor "${payload.nome}" cadastrado.`);
    }
    setIsFormOpen(false);
    reload();
  };

  const handleDelete = async (): Promise<void> => {
    if (!sectorToDelete) return;

    setIsDeleting(true);
    setActionError(null);
    try {
      await sectorService.remove(session.token, sectorToDelete.id);
      setActionSuccess(`Setor "${sectorToDelete.nome}" excluído.`);
      setSectorToDelete(null);
      reload();
    } catch (deleteError: unknown) {
      setActionError(
        deleteError instanceof Error ? deleteError.message : 'Não foi possível excluir o setor.',
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: DataTableColumn<Sector>[] = [
    {
      key: 'nome',
      header: 'Setor',
      render: (sector) => (
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-siva-50 text-bright-teal-blue">
            <Warehouse className="size-4" aria-hidden="true" />
          </span>
          <span className="font-semibold text-slate-900">{sector.nome}</span>
        </div>
      ),
    },
    {
      key: 'empresa',
      header: 'Empresa',
      render: (sector) => <span className="text-slate-600">Empresa #{sector.empresaId}</span>,
    },
    {
      key: 'criadoEm',
      header: 'Criado em',
      render: (sector) => <span className="text-slate-500">{formatDate(sector.criadoEm)}</span>,
    },
    {
      key: 'acoes',
      header: 'Ações',
      align: 'right',
      render: (sector) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => setDetails(sector)}
            className="inline-flex size-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-siva-50 hover:text-bright-teal-blue"
            aria-label={`Ver equipamentos de ${sector.nome}`}
            title="Ver equipamentos"
          >
            <Eye className="size-4" aria-hidden="true" />
          </button>

          {canWrite ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setEditing(sector);
                  setActionError(null);
                  setIsFormOpen(true);
                }}
                className="inline-flex size-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-siva-50 hover:text-bright-teal-blue"
                aria-label={`Editar ${sector.nome}`}
                title="Editar"
              >
                <Pencil className="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setSectorToDelete(sector)}
                className="inline-flex size-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
                aria-label={`Excluir ${sector.nome}`}
                title="Excluir"
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            </>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <>
      <PanelTopbar
        title="Setores"
        description="Áreas onde o consumo de água é monitorado"
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
                  setEditing(null);
                  setActionError(null);
                  setIsFormOpen(true);
                }}
              >
                <Plus className="size-4" aria-hidden="true" />
                Cadastrar setor
              </Button>
            ) : null}
          </>
        }
      />

      <div className="space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        {actionError ? <AlertMessage tone="danger">{actionError}</AlertMessage> : null}
        {actionSuccess ? <AlertMessage tone="success">{actionSuccess}</AlertMessage> : null}
        {error ? (
          <AlertMessage tone="danger" title="Não foi possível carregar os setores">
            {error}
          </AlertMessage>
        ) : null}

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {isLoading && !data ? (
            <LoadingBlock label="Carregando setores…" />
          ) : (
            <DataTable
              columns={columns}
              rows={data?.items ?? []}
              rowKey={(sector) => sector.id}
              caption="Setores cadastrados"
              empty={
                <EmptyState
                  icon={Warehouse}
                  title="Nenhum setor encontrado"
                  description={
                    canWrite
                      ? 'Cadastre o primeiro setor para começar a organizar equipamentos e dispositivos.'
                      : 'A empresa ainda não possui setores cadastrados.'
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

      <SectorFormDialog
        open={isFormOpen}
        sector={editing}
        empresaId={empresaId ?? session.user.empresaId}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleSubmit}
      />

      <SectorDetailsDialog
        sector={details}
        token={session.token}
        onClose={() => setDetails(null)}
      />

      <ConfirmDialog
        open={sectorToDelete !== null}
        title="Excluir setor"
        description={`O setor "${sectorToDelete?.nome ?? ''}" será removido permanentemente. Setores com equipamentos ou dispositivos vinculados não podem ser excluídos — nesse caso, o servidor recusará a operação.`}
        confirmLabel="Excluir"
        isLoading={isDeleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setSectorToDelete(null)}
      />
    </>
  );
}

interface SectorDetailsDialogProps {
  sector: Sector | null;
  token: string;
  onClose: () => void;
}

function SectorDetailsDialog({ sector, token, onClose }: SectorDetailsDialogProps) {
  const { data, isLoading, error } = useAsyncData(
    () => {
      if (!sector) return Promise.resolve(null);
      return assetService.list(token, { setorId: sector.id, pageSize: 100 });
    },
    `${token}:${sector?.id ?? 'nenhum'}`,
  );

  return (
    <Modal
      open={sector !== null}
      onClose={onClose}
      title={sector ? `Equipamentos de ${sector.nome}` : 'Equipamentos do setor'}
      description="Máquinas e pontos de consumo monitorados neste setor."
      size="lg"
    >
      {isLoading ? (
        <LoadingBlock label="Carregando ativos…" minHeight="8rem" />
      ) : error ? (
        <AlertMessage tone="danger">{error}</AlertMessage>
      ) : (data?.items.length ?? 0) === 0 ? (
        <EmptyState
          icon={Boxes}
          title="Nenhum equipamento neste setor"
          description="Cadastre equipamentos em Equipamentos para vincular máquinas a este setor."
        />
      ) : (
        <ul className="divide-y divide-slate-100">
          {(data?.items ?? []).map((ativo: Asset) => (
            <li key={ativo.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">{ativo.nome}</p>
                <p className="truncate font-mono text-xs text-slate-500">
                  {ativo.tag ?? `equipamento #${ativo.id}`}
                </p>
              </div>
              <Badge
                tone={
                  ativo.criticidade === 'alta'
                    ? 'danger'
                    : ativo.criticidade === 'media'
                      ? 'warning'
                      : 'neutral'
                }
              >
                {ativo.criticidade}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
