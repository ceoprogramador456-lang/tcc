import { useCallback, useState } from 'react';
import { KeyRound, Pencil, Radio, RefreshCw, Trash2 } from 'lucide-react';

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
import { allPages } from '../../../services/api/all-pages';
import { deviceService } from '../../../services/devices/device.service';
import { sectorService } from '../../../services/sectors/sector.service';
import type { Device, UpdateDevicePayload } from '../../../types/device';
import type { Sector } from '../../../types/sector';
import { formatDateTime } from '../../../utils/format';
import { useAuthenticatedSession } from '../../auth/hooks/use-authenticated-session';
import { PanelTopbar } from '../layout/PanelTopbar';
import { usePanelLayout } from '../layout/panel-layout-context';
import { usePanelScope } from '../hooks/use-panel-scope';
import { usePermissions } from '../hooks/use-permissions';
import { DeviceFormDialog } from './components/DeviceFormDialog';
import { PendingDevices } from './components/PendingDevices';
import { useDeviceEvents } from './use-device-events';
import type { AuthenticatedSession } from '../../auth/hooks/use-authenticated-session';

const PAGE_SIZE = 10;

export default function DevicesPage() {
  const session = useAuthenticatedSession();
  const { empresaId: selectedCompany } = usePanelScope();
  if (!session) return null;
  const empresaId = session.user.tipo === 'ADMIN' ? selectedCompany : session.user.empresaId;
  return (
    <DevicesPanel key={`${session.token}:${empresaId}`} session={session} empresaId={empresaId} />
  );
}

function DevicesPanel({
  session,
  empresaId,
}: {
  session: AuthenticatedSession;
  empresaId: number | null;
}) {
  const { openMenu } = usePanelLayout();
  const { canWrite } = usePermissions();

  const [page, setPage] = useState(1);
  const [filterSetorId, setFilterSetorId] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [pendingRefresh, setPendingRefresh] = useState(0);
  const [editing, setEditing] = useState<Device | null>(null);
  const [confirmation, setConfirmation] = useState<{
    device: Device;
    action: 'delete' | 'revoke';
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const { data: sectors, error: sectorsError } = useAsyncData(
    () =>
      allPages((currentPage) =>
        sectorService.list(session.token, { page: currentPage, pageSize: 100, empresaId }),
      ),
    refresh,
  );

  const { data, isLoading, error, reload } = useAsyncData(
    () => {
      return deviceService.list(session.token, {
        page,
        pageSize: PAGE_SIZE,
        empresaId: empresaId ?? undefined,
        setorId: filterSetorId ? Number(filterSetorId) : null,
      });
    },
    `${session?.token ?? ''}:${page}:${empresaId ?? 'todas'}:${filterSetorId}`,
    30_000,
  );

  const reloadPending = useCallback(() => setPendingRefresh((value) => value + 1), []);
  useDeviceEvents(session.token, reload, reloadPending);

  const sectorName = new Map<number, string>(
    (sectors ?? []).map((sector: Sector) => [sector.id, sector.nome]),
  );

  const handleSubmit = async (payload: UpdateDevicePayload): Promise<void> => {
    if (!editing) return;
    await deviceService.update(session.token, editing.id, payload);
    setActionSuccess(`Dispositivo "${editing.espId}" atualizado.`);
    setEditing(null);
    reload();
  };

  const confirmAction = async (): Promise<void> => {
    if (!confirmation || isDeleting) return;
    const { device, action } = confirmation;
    setIsDeleting(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      if (action === 'revoke') {
        await deviceService.revoke(session.token, device.id);
        setActionSuccess(`Credencial de "${device.espId}" revogada.`);
      } else {
        await deviceService.remove(session.token, device.id);
        setActionSuccess(`Dispositivo "${device.espId}" excluído.`);
      }
      reload();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Falha ao atualizar o dispositivo.');
    } finally {
      setConfirmation(null);
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
          <Badge tone={device.revokedAt ? 'danger' : device.online ? 'success' : 'warning'}>
            {device.revokedAt ? 'Credencial revogada' : device.online ? 'Online' : 'Offline'}
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
            <button
              type="button"
              onClick={() => {
                setEditing(device);
                setActionError(null);
              }}
              className="inline-flex size-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-siva-50 hover:text-bright-teal-blue"
              aria-label={`Editar ${device.espId}`}
              title="Editar"
            >
              <Pencil className="size-4" aria-hidden="true" />
            </button>
            {!device.revokedAt && (
              <button
                type="button"
                onClick={() => setConfirmation({ device, action: 'revoke' })}
                className="inline-flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-amber-50 hover:text-amber-700"
                aria-label={`Revogar credencial de ${device.espId}`}
                title="Revogar credencial"
              >
                <KeyRound className="size-4" aria-hidden="true" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setConfirmation({ device, action: 'delete' })}
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
        description="Pareamento e comunicação dos ESP32"
        onOpenMenu={openMenu}
        showScopeSelector
        actions={
          <Button
            variant="outline"
            onClick={() => {
              setRefresh((value) => value + 1);
              reloadPending();
              reload();
            }}
            disabled={isLoading}
          >
            <RefreshCw
              className={isLoading ? 'size-4 animate-spin' : 'size-4'}
              aria-hidden="true"
            />
            Atualizar
          </Button>
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

        {sectorsError && <AlertMessage tone="danger">{sectorsError}</AlertMessage>}
        {canWrite && (
          <PendingDevices
            token={session.token}
            empresaId={empresaId}
            sectors={sectors ?? []}
            refresh={pendingRefresh}
            onApproved={reload}
          />
        )}
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
              options={(sectors ?? []).map((sector) => ({
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
                  description="Os equipamentos cadastrados nos setores selecionados aparecem aqui."
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

      {editing && (
        <DeviceFormDialog
          key={editing.id}
          device={editing}
          sectors={sectors ?? []}
          onClose={() => setEditing(null)}
          onSubmit={handleSubmit}
        />
      )}
      <ConfirmDialog
        open={confirmation !== null}
        title={confirmation?.action === 'revoke' ? 'Revogar credencial' : 'Excluir dispositivo'}
        description={
          confirmation?.action === 'revoke'
            ? `O ESP32 ${confirmation.device.espId} perderá o acesso imediatamente. ${
                confirmation.device.mac
                  ? 'Aprove um novo pareamento para retomar o envio de leituras.'
                  : 'Este cadastro usa o firmware manual. A migração para o novo pareamento criará outro cadastro.'
              }`
            : `O dispositivo "${confirmation?.device.espId ?? ''}" será removido permanentemente. Dispositivos com sensores vinculados precisam manter o histórico.`
        }
        confirmLabel={confirmation?.action === 'revoke' ? 'Revogar' : 'Excluir'}
        isLoading={isDeleting}
        onConfirm={() => void confirmAction()}
        onCancel={() => {
          if (!isDeleting) setConfirmation(null);
        }}
      />
    </>
  );
}
