import { useState } from 'react';
import { Cpu, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';

import { AlertMessage } from '../../../components/ui/AlertMessage';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { DataTable } from '../../../components/ui/DataTable';
import type { DataTableColumn } from '../../../components/ui/DataTable';
import { EmptyState } from '../../../components/ui/EmptyState';
import { LoadingBlock } from '../../../components/ui/LoadingBlock';
import { Pagination } from '../../../components/ui/Pagination';
import { SelectField } from '../../../components/ui/FormField';
import { useAsyncData } from '../../../hooks/use-async-data';
import { assetService } from '../../../services/assets/asset.service';
import { sectorService } from '../../../services/sectors/sector.service';
import type { Asset, CreateAssetPayload } from '../../../types/asset';
import type { Sector } from '../../../types/sector';
import { formatDate } from '../../../utils/format';
import { useAuthenticatedSession } from '../../auth/hooks/use-authenticated-session';
import { PanelTopbar } from '../layout/PanelTopbar';
import { usePanelLayout } from '../layout/panel-layout-context';
import { usePanelScope } from '../hooks/use-panel-scope';
import { usePermissions } from '../hooks/use-permissions';
import { AssetFormDialog } from './components/AssetFormDialog';

const PAGE_SIZE = 10;

const CRITICIDADE_LABELS: Record<Asset['criticidade'], string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
};

export default function AssetsPage() {
  const { openMenu } = usePanelLayout();
  const session = useAuthenticatedSession();
  const { empresaId } = usePanelScope();
  const { canWrite } = usePermissions();

  const [page, setPage] = useState(1);
  const [filterSetorId, setFilterSetorId] = useState('');
  const [filterCriticidade, setFilterCriticidade] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const { data: sectors } = useAsyncData(
    () => {
      if (!session) return Promise.reject(new Error('Sessão expirada.'));
      return sectorService.list(session.token, {
        page: 1,
        pageSize: 100,
        empresaId: empresaId ?? undefined,
      });
    },
    `${session?.token ?? ''}:${empresaId ?? 'todas'}`,
  );

  const { data, isLoading, error, reload } = useAsyncData(
    () => {
      if (!session) return Promise.reject(new Error('Sessão expirada.'));
      return assetService.list(session.token, {
        page,
        pageSize: PAGE_SIZE,
        empresaId: empresaId ?? undefined,
        setorId: filterSetorId ? Number(filterSetorId) : null,
        criticidade: filterCriticidade || null,
      });
    },
    `${session?.token ?? ''}:${page}:${empresaId ?? 'todas'}:${filterSetorId}:${filterCriticidade}`,
  );

  if (!session) return null;

  const sectorName = new Map<number, string>(
    (sectors?.items ?? []).map((sector: Sector) => [sector.id, sector.nome]),
  );

  const handleSubmit = async (payload: CreateAssetPayload): Promise<void> => {
    if (editing) {
      await assetService.update(session.token, editing.id, payload);
      setActionSuccess(`Equipamento "${payload.nome}" atualizado.`);
    } else {
      await assetService.create(session.token, payload);
      setActionSuccess(`Equipamento "${payload.nome}" cadastrado.`);
    }
    setIsFormOpen(false);
    reload();
  };

  const handleDelete = async (): Promise<void> => {
    if (!assetToDelete) return;

    setIsDeleting(true);
    setActionError(null);
    try {
      await assetService.remove(session.token, assetToDelete.id);
      setActionSuccess(`Equipamento "${assetToDelete.nome}" excluído.`);
      setAssetToDelete(null);
      reload();
    } catch (deleteError: unknown) {
      setActionError(
        deleteError instanceof Error ? deleteError.message : 'Não foi possível excluir o ativo.',
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: DataTableColumn<Asset>[] = [
    {
      key: 'nome',
      header: 'Equipamento',
      render: (asset) => (
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-siva-50 text-bright-teal-blue">
            <Cpu className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-900">{asset.nome}</p>
            <p className="truncate font-mono text-xs text-slate-500">
              {asset.tag ?? `equipamento #${asset.id}`}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'setor',
      header: 'Setor',
      render: (asset) => <span>{sectorName.get(asset.setorId) ?? `Setor #${asset.setorId}`}</span>,
    },
    {
      key: 'tipo',
      header: 'Tipo',
      render: (asset) => <span className="text-slate-600">{asset.tipo ?? '—'}</span>,
    },
    {
      key: 'criticidade',
      header: 'Criticidade',
      render: (asset) => (
        <Badge
          tone={
            asset.criticidade === 'alta'
              ? 'danger'
              : asset.criticidade === 'media'
                ? 'warning'
                : 'neutral'
          }
        >
          {CRITICIDADE_LABELS[asset.criticidade]}
        </Badge>
      ),
    },
    {
      key: 'criadoEm',
      header: 'Criado em',
      render: (asset) => <span className="text-slate-500">{formatDate(asset.criadoEm)}</span>,
    },
    {
      key: 'acoes',
      header: 'Ações',
      align: 'right',
      render: (asset) =>
        canWrite ? (
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => {
                setEditing(asset);
                setActionError(null);
                setIsFormOpen(true);
              }}
              className="inline-flex size-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-siva-50 hover:text-bright-teal-blue"
              aria-label={`Editar ${asset.nome}`}
              title="Editar"
            >
              <Pencil className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setAssetToDelete(asset)}
              className="inline-flex size-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
              aria-label={`Excluir ${asset.nome}`}
              title="Excluir"
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          </div>
        ) : null,
    },
  ];

  const hasFilters = filterSetorId !== '' || filterCriticidade !== '';

  return (
    <>
      <PanelTopbar
        title="Equipamentos"
        description="Identifique as máquinas e os pontos de consumo monitorados em cada setor"
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
                Cadastrar equipamento
              </Button>
            ) : null}
          </>
        }
      />

      <div className="space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        {actionError ? <AlertMessage tone="danger">{actionError}</AlertMessage> : null}
        {actionSuccess ? <AlertMessage tone="success">{actionSuccess}</AlertMessage> : null}
        {error ? (
          <AlertMessage tone="danger" title="Não foi possível carregar os equipamentos">
            {error}
          </AlertMessage>
        ) : null}

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <SelectField
              name="filtroSetor"
              label="Setor"
              value={filterSetorId}
              onChange={(value) => {
                setFilterSetorId(value);
                setPage(1);
              }}
              placeholder="Todos os setores"
              options={(sectors?.items ?? []).map((sector) => ({
                value: String(sector.id),
                label: sector.nome,
              }))}
            />

            <SelectField
              name="filtroCriticidade"
              label="Criticidade"
              value={filterCriticidade}
              onChange={(value) => {
                setFilterCriticidade(value);
                setPage(1);
              }}
              placeholder="Todas as criticidades"
              options={[
                { value: 'baixa', label: 'Baixa' },
                { value: 'media', label: 'Média' },
                { value: 'alta', label: 'Alta' },
              ]}
            />

            <div className="flex items-end">
              <Button
                variant="outline"
                className="w-full"
                disabled={!hasFilters}
                onClick={() => {
                  setFilterSetorId('');
                  setFilterCriticidade('');
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
            <LoadingBlock label="Carregando ativos…" />
          ) : (
            <DataTable
              columns={columns}
              rows={data?.items ?? []}
              rowKey={(asset) => asset.id}
              caption="Equipamentos cadastrados"
              empty={
                <EmptyState
                  icon={Cpu}
                  title="Nenhum equipamento encontrado"
                  description={
                    hasFilters
                      ? 'Nenhum equipamento corresponde aos filtros aplicados.'
                      : 'Cadastre o primeiro equipamento da empresa.'
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

      <AssetFormDialog
        open={isFormOpen}
        asset={editing}
        sectors={sectors?.items ?? []}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={assetToDelete !== null}
        title="Excluir equipamento"
        description={`O equipamento "${assetToDelete?.nome ?? ''}" será removido permanentemente. Equipamentos com sensores vinculados não podem ser excluídos — nesse caso, o servidor recusará a operação.`}
        confirmLabel="Excluir"
        isLoading={isDeleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setAssetToDelete(null)}
      />
    </>
  );
}
