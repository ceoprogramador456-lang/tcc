import { useState } from 'react';
import { Pencil, Plus, Radio, RefreshCw, Trash2 } from 'lucide-react';

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
import { assetService } from '../../../services/assets/asset.service';
import { deviceService } from '../../../services/devices/device.service';
import { sectorService } from '../../../services/sectors/sector.service';
import { sensorService } from '../../../services/sensors/sensor.service';
import type { Asset } from '../../../types/asset';
import type { Device } from '../../../types/device';
import type { Sector } from '../../../types/sector';
import type { Sensor } from '../../../types/sensor';
import { formatDate } from '../../../utils/format';
import { useAuthenticatedSession } from '../../auth/hooks/use-authenticated-session';
import { PanelTopbar } from '../layout/PanelTopbar';
import { usePanelLayout } from '../layout/panel-layout-context';
import { usePanelScope } from '../hooks/use-panel-scope';
import { usePermissions } from '../hooks/use-permissions';
import { SensorFormDialog } from './components/SensorFormDialog';
import type { SensorSubmitPayload } from './components/SensorFormDialog';

const PAGE_SIZE = 10;

export default function SensorsPage() {
  const { openMenu } = usePanelLayout();
  const session = useAuthenticatedSession();
  const { empresaId } = usePanelScope();
  const { canWrite } = usePermissions();

  const [page, setPage] = useState(1);
  const [filterSetorId, setFilterSetorId] = useState('');
  const [filterAtivoId, setFilterAtivoId] = useState('');
  const [filterEsp32Id, setFilterEsp32Id] = useState('');
  const [filterAtivoStatus, setFilterAtivoStatus] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Sensor | null>(null);
  const [sensorToDelete, setSensorToDelete] = useState<Sensor | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const scopeKey = `${session?.token ?? ''}:${empresaId ?? 'todas'}`;

  const { data: sectors } = useAsyncData(() => {
    if (!session) return Promise.reject(new Error('Sessão expirada.'));
    return sectorService.list(session.token, {
      page: 1,
      pageSize: 100,
      empresaId: empresaId ?? undefined,
    });
  }, scopeKey);

  const { data: assets } = useAsyncData(() => {
    if (!session) return Promise.reject(new Error('Sessão expirada.'));
    return assetService.list(session.token, {
      page: 1,
      pageSize: 100,
      empresaId: empresaId ?? undefined,
    });
  }, scopeKey);

  const { data: devices } = useAsyncData(() => {
    if (!session) return Promise.reject(new Error('Sessão expirada.'));
    return deviceService.list(session.token, {
      page: 1,
      pageSize: 100,
      empresaId: empresaId ?? undefined,
    });
  }, scopeKey);

  const { data, isLoading, error, reload } = useAsyncData(() => {
    if (!session) return Promise.reject(new Error('Sessão expirada.'));
    return sensorService.list(session.token, {
      page,
      pageSize: PAGE_SIZE,
      empresaId: empresaId ?? undefined,
      ativoId: filterAtivoId ? Number(filterAtivoId) : null,
      esp32Id: filterEsp32Id ? Number(filterEsp32Id) : null,
      ativoStatus: filterAtivoStatus === '' ? null : filterAtivoStatus === 'ativo',
    });
  }, `${scopeKey}:${page}:${filterAtivoId}:${filterEsp32Id}:${filterAtivoStatus}`);

  if (!session) return null;

  const sectorById = new Map<number, Sector>((sectors?.items ?? []).map((s) => [s.id, s]));
  const assetById = new Map<number, Asset>((assets?.items ?? []).map((a) => [a.id, a]));
  const deviceById = new Map<number, Device>((devices?.items ?? []).map((d) => [d.id, d]));

  const handleSubmit = async (submit: SensorSubmitPayload): Promise<void> => {
    if (submit.mode === 'update' && editing) {
      await sensorService.update(session.token, editing.id, submit.payload);
      setActionSuccess('Sensor atualizado.');
    } else if (submit.mode === 'create') {
      await sensorService.create(session.token, submit.payload);
      setActionSuccess('Sensor cadastrado.');
    }
    setIsFormOpen(false);
    reload();
  };

  const handleToggleStatus = async (sensor: Sensor): Promise<void> => {
    setActionError(null);
    try {
      await sensorService.update(session.token, sensor.id, {
        ativoStatus: !sensor.ativoStatus,
      });
      setActionSuccess(
        `Sensor "${sensor.tag ?? sensor.sensorId}" ${
          sensor.ativoStatus ? 'desativado' : 'ativado'
        }.`,
      );
      reload();
    } catch (toggleError: unknown) {
      setActionError(
        toggleError instanceof Error
          ? toggleError.message
          : 'Não foi possível alterar o status do sensor.',
      );
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!sensorToDelete) return;

    setIsDeleting(true);
    setActionError(null);
    try {
      await sensorService.remove(session.token, sensorToDelete.id);
      setActionSuccess('Sensor excluído.');
      setSensorToDelete(null);
      reload();
    } catch (deleteError: unknown) {
      setActionError(
        deleteError instanceof Error ? deleteError.message : 'Não foi possível excluir o sensor.',
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: DataTableColumn<Sensor>[] = [
    {
      key: 'sensor',
      header: 'Sensor',
      render: (sensor) => (
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-siva-50 text-bright-teal-blue">
            <Radio className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-900">
              {sensor.tag ?? `Sensor #${sensor.id}`}
            </p>
            <p className="truncate font-mono text-xs text-slate-500">{sensor.sensorId}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'ativo',
      header: 'Equipamento / Setor',
      render: (sensor) => {
        const asset = assetById.get(sensor.ativoId);
        const sector = asset ? sectorById.get(asset.setorId) : undefined;
        return (
          <div className="min-w-0">
            <p className="truncate text-slate-700">
              {asset?.nome ?? `Equipamento #${sensor.ativoId}`}
            </p>
            <p className="truncate text-xs text-slate-500">
              {sector?.nome ?? `Setor #${asset?.setorId ?? '—'}`}
            </p>
          </div>
        );
      },
    },
    {
      key: 'esp32',
      header: 'Dispositivo',
      render: (sensor) => {
        const device = deviceById.get(sensor.esp32Id);
        return (
          <div className="min-w-0">
            <p className="truncate font-mono text-xs text-slate-700">
              {device?.espId ?? `ESP32 #${sensor.esp32Id}`}
            </p>
            <Badge tone={device?.online ? 'success' : 'warning'} className="mt-1">
              {device?.online ? 'Online' : 'Offline'}
            </Badge>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Ativação',
      render: (sensor) => (
        <Badge tone={sensor.ativoStatus ? 'success' : 'neutral'}>
          {sensor.ativoStatus ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
    },
    {
      key: 'criadoEm',
      header: 'Criado em',
      render: (sensor) => <span className="text-slate-500">{formatDate(sensor.criadoEm)}</span>,
    },
    {
      key: 'acoes',
      header: 'Ações',
      align: 'right',
      render: (sensor) =>
        canWrite ? (
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => void handleToggleStatus(sensor)}
              className="inline-flex size-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-siva-50 hover:text-bright-teal-blue"
              aria-label={
                sensor.ativoStatus
                  ? `Desativar ${sensor.tag ?? sensor.id}`
                  : `Ativar ${sensor.tag ?? sensor.id}`
              }
              title={sensor.ativoStatus ? 'Desativar' : 'Ativar'}
            >
              <Badge tone={sensor.ativoStatus ? 'success' : 'neutral'}>
                {sensor.ativoStatus ? 'On' : 'Off'}
              </Badge>
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(sensor);
                setActionError(null);
                setIsFormOpen(true);
              }}
              className="inline-flex size-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-siva-50 hover:text-bright-teal-blue"
              aria-label={`Editar ${sensor.tag ?? sensor.id}`}
              title="Editar"
            >
              <Pencil className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setSensorToDelete(sensor)}
              className="inline-flex size-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
              aria-label={`Excluir ${sensor.tag ?? sensor.id}`}
              title="Excluir"
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          </div>
        ) : null,
    },
  ];

  const hasFilters = filterAtivoId !== '' || filterEsp32Id !== '' || filterAtivoStatus !== '';

  const availableAssets = filterSetorId
    ? (assets?.items ?? []).filter((asset) => asset.setorId === Number(filterSetorId))
    : (assets?.items ?? []);
  const availableDevices = filterSetorId
    ? (devices?.items ?? []).filter((device) => device.setorId === Number(filterSetorId))
    : (devices?.items ?? []);

  return (
    <>
      <PanelTopbar
        title="Sensores"
        description="Pontos que medem a vazão de água nos equipamentos"
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
                Cadastrar sensor
              </Button>
            ) : null}
          </>
        }
      />

      <div className="space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        {actionError ? <AlertMessage tone="danger">{actionError}</AlertMessage> : null}
        {actionSuccess ? <AlertMessage tone="success">{actionSuccess}</AlertMessage> : null}
        {error ? (
          <AlertMessage tone="danger" title="Não foi possível carregar os sensores">
            {error}
          </AlertMessage>
        ) : null}

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SelectField
              name="filtroSetor"
              label="Setor"
              value={filterSetorId}
              onChange={(value) => {
                setFilterSetorId(value);
                setFilterAtivoId('');
                setFilterEsp32Id('');
                setPage(1);
              }}
              placeholder="Todos os setores"
              options={(sectors?.items ?? []).map((sector) => ({
                value: String(sector.id),
                label: sector.nome,
              }))}
            />

            <SelectField
              name="filtroAtivo"
              label="Equipamento"
              value={filterAtivoId}
              onChange={(value) => {
                setFilterAtivoId(value);
                setPage(1);
              }}
              placeholder="Todos os ativos"
              options={availableAssets.map((asset) => ({
                value: String(asset.id),
                label: asset.tag ? `${asset.nome} (${asset.tag})` : asset.nome,
              }))}
            />

            <SelectField
              name="filtroEsp32"
              label="Dispositivo"
              value={filterEsp32Id}
              onChange={(value) => {
                setFilterEsp32Id(value);
                setPage(1);
              }}
              placeholder="Todos os dispositivos"
              options={availableDevices.map((device) => ({
                value: String(device.id),
                label: device.espId,
              }))}
            />

            <SelectField
              name="filtroStatus"
              label="Ativação"
              value={filterAtivoStatus}
              onChange={(value) => {
                setFilterAtivoStatus(value);
                setPage(1);
              }}
              placeholder="Todos"
              options={[
                { value: 'ativo', label: 'Ativo' },
                { value: 'inativo', label: 'Inativo' },
              ]}
            />
          </div>

          {hasFilters ? (
            <div className="mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilterAtivoId('');
                  setFilterEsp32Id('');
                  setFilterAtivoStatus('');
                  setPage(1);
                }}
              >
                Limpar filtros
              </Button>
            </div>
          ) : null}
        </section>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {isLoading && !data ? (
            <LoadingBlock label="Carregando sensores…" />
          ) : (
            <DataTable
              columns={columns}
              rows={data?.items ?? []}
              rowKey={(sensor) => sensor.id}
              caption="Sensores cadastrados"
              empty={
                <EmptyState
                  icon={Radio}
                  title="Nenhum sensor encontrado"
                  description={
                    hasFilters
                      ? 'Nenhum sensor corresponde aos filtros aplicados.'
                      : 'Cadastre um sensor vinculando um equipamento e um dispositivo do mesmo setor.'
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

      <SensorFormDialog
        open={isFormOpen}
        sensor={editing}
        sectors={sectors?.items ?? []}
        assets={assets?.items ?? []}
        devices={devices?.items ?? []}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={sensorToDelete !== null}
        title="Excluir sensor"
        description={`O sensor "${sensorToDelete?.tag ?? sensorToDelete?.sensorId ?? ''}" será removido permanentemente, junto com suas leituras e manutenções vinculadas.`}
        confirmLabel="Excluir"
        isLoading={isDeleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setSensorToDelete(null)}
      />
    </>
  );
}
