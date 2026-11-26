import { useCallback, useEffect, useRef, useState } from 'react';

import { AlertMessage } from '../../../../components/ui/AlertMessage';
import { Button } from '../../../../components/ui/Button';
import { InputField, SelectField } from '../../../../components/ui/FormField';
import { Modal } from '../../../../components/ui/Modal';
import { useAsyncData } from '../../../../hooks/use-async-data';
import { allPages } from '../../../../services/api/all-pages';
import { ApiError } from '../../../../services/api/http-client';
import { assetService } from '../../../../services/assets/asset.service';
import { deviceService } from '../../../../services/devices/device.service';
import type { PendingDevice } from '../../../../types/device';
import type { Sector } from '../../../../types/sector';

const NEW_ASSET = 'new';

interface PairingDialogProps {
  request: PendingDevice;
  available: boolean;
  token: string;
  sectors: Sector[];
  onClose: () => void;
  onApproved: () => void;
}

export function PairingDialog({
  request,
  available,
  token,
  sectors,
  onClose,
  onApproved,
}: PairingDialogProps) {
  const [code, setCode] = useState('');
  const [setorId, setSetorId] = useState(String(request.setorId ?? ''));
  const [ativoId, setAtivoId] = useState(String(request.ativoId ?? ''));
  const [assetName, setAssetName] = useState('');
  const [descricao, setDescricao] = useState('');
  const [now, setNow] = useState(Date.now);
  const [saving, setSaving] = useState(false);
  const [closed, setClosed] = useState(false);
  const [error, setError] = useState('');
  const savingRef = useRef(false);
  const close = useCallback(() => {
    if (!savingRef.current) onClose();
  }, [onClose]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const expiry = Date.parse(request.expiresAt);
  const remaining = Number.isFinite(expiry) ? Math.max(0, Math.ceil((expiry - now) / 1_000)) : 0;
  const expired = remaining === 0;
  const unavailable = expired || !available || closed;

  const {
    data: assets,
    error: assetsError,
    isLoading,
    reload,
  } = useAsyncData(
    () =>
      setorId
        ? allPages((page) =>
            assetService.list(token, {
              setorId: Number(setorId),
              page,
              pageSize: 100,
            }),
          )
        : Promise.resolve([]),
    setorId,
  );
  const availableSectors = sectors.filter((sector) => sector.empresaId === request.empresaId);
  const availableAssets = (assets ?? []).filter((asset) => asset.setorId === Number(setorId));
  const linked = Boolean(request.setorId || request.ativoId);
  const assetSelection =
    ativoId ||
    (setorId && !linked && !isLoading && !assetsError && !availableAssets.length ? NEW_ASSET : '');
  const creatingAsset = assetSelection === NEW_ASSET;
  const assetOptions = availableAssets.map((asset) => ({
    value: String(asset.id),
    label: asset.nome,
  }));
  if (!linked) assetOptions.push({ value: NEW_ASSET, label: 'Criar novo ativo' });
  const validAsset = creatingAsset
    ? !linked && assetName.trim().length >= 2
    : !isLoading &&
      !assetsError &&
      availableAssets.some((asset) => asset.id === Number(assetSelection));
  const canApprove =
    !saving &&
    !unavailable &&
    /^\d{6}$/.test(code) &&
    availableSectors.some((sector) => sector.id === Number(setorId)) &&
    validAsset;

  async function approve() {
    if (!canApprove || savingRef.current || Date.now() >= expiry) return;
    savingRef.current = true;
    setSaving(true);
    setError('');
    try {
      await deviceService.approve(token, request.id, {
        code,
        setorId: Number(setorId),
        ...(creatingAsset
          ? { novoAtivo: { nome: assetName.trim() } }
          : { ativoId: Number(assetSelection) }),
        ...(descricao.trim() && { descricao: descricao.trim() }),
      });
      onApproved();
    } catch (cause) {
      if (cause instanceof ApiError) {
        if (cause.status === 404 || cause.status === 410 || cause.code === 'PAIRING_LOCKED') {
          setClosed(true);
        }
        if (cause.code === 'ASSET_ALREADY_EXISTS') reload();
        setError(
          cause.status >= 500
            ? 'O servidor está indisponível. Tente novamente em instantes.'
            : cause.message,
        );
      } else {
        setError('Falha ao aprovar o dispositivo. Tente novamente.');
      }
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={close}
      title="Aprovar dispositivo"
      description={`${request.model} · ${request.mac}`}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={close} disabled={saving}>
            {unavailable ? 'Fechar' : 'Cancelar'}
          </Button>
          <Button type="submit" form="pairing-form" disabled={!canApprove}>
            {saving ? 'Aprovando…' : 'Aprovar'}
          </Button>
        </>
      }
    >
      <form
        id="pairing-form"
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void approve();
        }}
      >
        {expired ? (
          <AlertMessage tone="warning">
            Código expirado. Use a próxima solicitação do ESP32.
          </AlertMessage>
        ) : !available && !error ? (
          <AlertMessage tone="warning">
            Esta solicitação já foi encerrada. Confira a lista de pendentes.
          </AlertMessage>
        ) : !unavailable ? (
          <p role="timer" className="text-sm tabular-nums text-slate-600">
            Código válido por {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
          </p>
        ) : null}
        {error && <AlertMessage tone="danger">{error}</AlertMessage>}
        <InputField
          name="code"
          label="Código exibido no OLED"
          hint="Digite os seis algarismos que aparecem no equipamento."
          value={code}
          onChange={(value) => setCode(value.replace(/[^0-9]/g, '').slice(0, 6))}
          required
          disabled={saving || unavailable}
          autoComplete="off"
          inputMode="numeric"
        />
        <SelectField
          name="setorId"
          label="Setor"
          value={setorId}
          required
          options={availableSectors.map((sector) => ({
            value: String(sector.id),
            label: sector.nome,
          }))}
          placeholder="Selecione o setor"
          disabled={saving || unavailable || Boolean(request.setorId)}
          hint={
            !availableSectors.length ? 'Cadastre um setor nesta empresa para continuar.' : undefined
          }
          onChange={(value) => {
            setSetorId(value);
            setAtivoId('');
            setAssetName('');
          }}
        />
        <SelectField
          name="ativoId"
          label="Ativo monitorado"
          value={assetSelection}
          required
          options={assetOptions}
          placeholder={setorId && isLoading ? 'Carregando ativos…' : 'Selecione ou crie um ativo'}
          disabled={!setorId || saving || unavailable || isLoading || Boolean(request.ativoId)}
          onChange={setAtivoId}
        />
        {creatingAsset && (
          <InputField
            name="nomeAtivo"
            label="Nome do ativo"
            hint="Use pelo menos dois caracteres."
            value={assetName}
            required
            disabled={saving || unavailable}
            onChange={(value) => setAssetName(value.slice(0, 100))}
          />
        )}
        {assetsError && (
          <AlertMessage tone="danger">
            {assetsError}{' '}
            <button type="button" onClick={reload} disabled={saving} className="underline">
              Tentar novamente
            </button>
          </AlertMessage>
        )}
        <InputField
          name="descricao"
          label="Nome do dispositivo (opcional)"
          value={descricao}
          disabled={saving || unavailable}
          onChange={(value) => setDescricao(value.slice(0, 100))}
        />
      </form>
    </Modal>
  );
}
