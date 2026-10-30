import { useState } from 'react';
import { Pencil, Plus, Radio, RefreshCw, Trash2, Link2 } from 'lucide-react';

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
import { deviceService } from '../../../services/devices/device.service';
import { sectorService } from '../../../services/sectors/sector.service';
import type { CreateDevicePayload, Device } from '../../../types/device';
import type { Sector } from '../../../types/sector';
import { formatDateTime } from '../../../utils/format';
import { useAuthenticatedSession } from '../../auth/hooks/use-authenticated-session';
import { PanelTopbar } from '../layout/PanelTopbar';
import { usePanelLayout } from '../layout/panel-layout-context';
import { usePanelScope } from '../hooks/use-panel-scope';
import { usePermissions } from '../hooks/use-permissions';
import { DeviceFormDialog } from './components/DeviceFormDialog';
import { PairDeviceDialog } from './components/PairDeviceDialog';
import { pairingService } from '../../../services/devices/pairing.service';
import { usePolling } from '../../../hooks/use-polling';

const PAGE_SIZE = 10;

export default function DevicesPage() {
  const { openMenu } = usePanelLayout();
  const session = useAuthenticatedSession();
  const { empresaId } = usePanelScope();
  const { canWrite } = usePermissions();

  const [page, setPage] = useState(1);
  const [filterSetorId, setFilterSetorId] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Device | null>(null);
  const [deviceToDelete, setDeviceToDelete] = useState<Device | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [pairingOpen, setPairingOpen] = useState(false);
  const [resetDevice, setResetDevice] = useState<Device | null>(null);
  const [resetting, setResetting] = useState(false);

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
      return deviceService.list(session.token, {
        page,
        pageSize: PAGE_SIZE,
        empresaId: empresaId ?? undefined,
        setorId: filterSetorId ? Number(filterSetorId) : null,
      });
    },
    `${session?.token ?? ''}:${page}:${empresaId ?? 'todas'}:${filterSetorId}`,
  );

  usePolling(reload, Boolean(session));

  if (!session) return null;

  const sectorName = new Map<number, string>(
    (sectors?.items ?? []).map((sector: Sector) => [sector.id, sector.nome]),
  );

  const handleSubmit = async (payload: CreateDevicePayload): Promise<void> => {
    if (editing) {
      await deviceService.update(session.token, editing.id, payload);
      setActionSuccess(`Dispositivo "${payload.espId}" atualizado.`);
      setIsFormOpen(false);
    }
    reload();
  };

  const handleReset = async () => {
    if (!resetDevice) return;
    setResetting(true);
    try {
      await pairingService.reset(session.token, resetDevice.id);
      setResetDevice(null);
      setActionSuccess(
        'Novo pareamento autorizado. Aguarde o novo código no OLED e clique em Conectar ESP32.',
      );
      reload();
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : 'Não foi possível reiniciar o pareamento.',
      );
    } finally {
      setResetting(false);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!deviceToDelete) return;

    setIsDeleting(true);
    setActionError(null);
    try {
      await deviceService.remove(session.token, deviceToDelete.id);
      setActionSuccess(`Dispositivo "${deviceToDelete.espId}" excluído.`);
      setDeviceToDelete(null);
      reload();
    } catch (deleteError: unknown) {
      setActionError(
        deleteError instanceof Error
          ? deleteError.message
          : 'Não foi possível excluir o dispositivo.',
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: DataTableColumn<Device>[] = [
    {
      key: 'espId',
      header: 'Dispositivo',
      render: (device) => (
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-siva-50 text-bright-teal-blue">
            <Radio className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-mono text-sm font-semibold text-slate-900">
              {device.espId}
            </p>
            <p className="truncate text-xs text-slate-500">{device.descricao ?? 'Sem descrição'}</p>
            {device.macAddress ? (
              <p className="font-mono text-xs text-slate-500">{device.macAddress}</p>
            ) : null}
          </div>
        </div>
      ),
    },
    {
      key: 'setor',
      header: 'Setor',
      render: (device) => (
        <span>{sectorName.get(device.setorId) ?? `Setor #${device.setorId}`}</span>
      ),
    },
    {
      key: 'status',
      header: 'Comunicação',
      render: (device) => (
        <div className="flex flex-col items-start gap-1">
          <Badge tone={device.online ? 'success' : 'warning'}>
            {device.pairingEnabled ? 'Aguardando pareamento' : device.online ? 'Online' : 'Offline'}
          </Badge>
          <span className="text-xs text-slate-500">
            {device.ultimoContato
              ? `Último contato ${formatDateTime(device.ultimoContato)}`
              : 'Nunca reportou'}
          </span>
        </div>
      ),
    },
    {
      key: 'criadoEm',
      header: 'Cadastrado em',
      render: (device) => <span className="text-slate-500">{formatDateTime(device.criadoEm)}</span>,
    },
    {
      key: 'acoes',
      header: 'Ações',
      align: 'right',
      render: (device) =>
        canWrite ? (
          <div className="flex items-center justify-end gap-1">
            {device.macAddress ? (
              <button
                type="button"
                aria-label={`Novo pareamento de ${device.espId}`}
                title="Novo pareamento"
                onClick={() => setResetDevice(device)}
                className="inline-flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-sky-50"
              >
                <Link2 className="size-4" aria-hidden="true" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setEditing(device);
                setActionError(null);
                setIsFormOpen(true);
              }}
              className="inline-flex size-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-siva-50 hover:text-bright-teal-blue"
              aria-label={`Editar ${device.espId}`}
              title="Editar"
            >
              <Pencil className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setDeviceToDelete(device)}
              className="inline-flex size-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
              aria-label={`Excluir ${device.espId}`}
              title="Excluir"
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          </div>
        ) : null,
    },
  ];

  return (
    <>
      <PanelTopbar
        title="Dispositivos"
        description="Conecte placas pelo código do OLED e acompanhe o envio das leituras"
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
                  setPairingOpen(true);
                }}
              >
                <Plus className="size-4" aria-hidden="true" />
                Conectar ESP32
              </Button>
            ) : null}
          </>
        }
      />

      <div className="space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        {actionError ? <AlertMessage tone="danger">{actionError}</AlertMessage> : null}
        {actionSuccess ? <AlertMessage tone="success">{actionSuccess}</AlertMessage> : null}
        {error ? (
          <AlertMessage tone="danger" title="Não foi possível carregar os dispositivos">
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

            <div className="flex items-end">
              <Button
                variant="outline"
                className="w-full"
                disabled={filterSetorId === ''}
                onClick={() => {
                  setFilterSetorId('');
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
            <LoadingBlock label="Carregando dispositivos…" />
          ) : (
            <DataTable
              columns={columns}
              rows={data?.items ?? []}
              rowKey={(device) => device.id}
              caption="Dispositivos ESP32 cadastrados"
              empty={
                <EmptyState
                  icon={Radio}
                  title="Nenhum dispositivo encontrado"
                  description="Ligue a placa configurada por USB e use Conectar ESP32 com o código exibido no OLED."
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

      <DeviceFormDialog
        open={isFormOpen}
        device={editing}
        sectors={sectors?.items ?? []}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleSubmit}
      />

      {pairingOpen ? (
        <PairDeviceDialog
          key={empresaId ?? 'all'}
          token={session.token}
          empresaId={empresaId}
          onClose={() => setPairingOpen(false)}
          onPaired={() => {
            setPairingOpen(false);
            setActionSuccess(
              'Pareamento aprovado. A placa receberá a credencial e enviará a primeira leitura automaticamente.',
            );
            reload();
          }}
        />
      ) : null}
      <ConfirmDialog
        open={resetDevice !== null}
        title="Autorizar novo pareamento"
        description="A credencial atual será revogada e a placa mostrará um novo código. O histórico e os vínculos serão preservados."
        confirmLabel="Autorizar novo pareamento"
        isLoading={resetting}
        onConfirm={() => void handleReset()}
        onCancel={() => setResetDevice(null)}
      />

      <ConfirmDialog
        open={deviceToDelete !== null}
        title="Excluir dispositivo"
        description={`O dispositivo "${deviceToDelete?.espId ?? ''}" será removido permanentemente. Dispositivos com sensores vinculados não podem ser excluídos — nesse caso, o servidor recusará a operação.`}
        confirmLabel="Excluir"
        isLoading={isDeleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeviceToDelete(null)}
      />
    </>
  );
}
