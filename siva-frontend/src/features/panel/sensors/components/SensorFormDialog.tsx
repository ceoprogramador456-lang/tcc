import { useMemo, useState } from 'react';

import { AlertMessage } from '../../../../components/ui/AlertMessage';
import { Button } from '../../../../components/ui/Button';
import {
  CheckboxField,
  InputField,
  SelectField,
  TextAreaField,
} from '../../../../components/ui/FormField';
import { Modal } from '../../../../components/ui/Modal';
import type { Asset } from '../../../../types/asset';
import type { CreateSensorPayload, Sensor, UpdateSensorPayload } from '../../../../types/sensor';
import type { Device } from '../../../../types/device';
import type { Sector } from '../../../../types/sector';

/** Payload discriminado: o diálogo sabe se está criando ou alterando. */
export type SensorSubmitPayload =
  | { mode: 'create'; payload: CreateSensorPayload }
  | { mode: 'update'; payload: UpdateSensorPayload };

interface SensorFormDialogProps {
  open: boolean;
  /** `null` para criação; um sensor para edição. */
  sensor: Sensor | null;
  sectors: Sector[];
  assets: Asset[];
  devices: Device[];
  onClose: () => void;
  onSubmit: (submit: SensorSubmitPayload) => Promise<void>;
}

const FIELD_MESSAGES: Record<string, string> = {
  ativoId: 'Selecione o equipamento monitorado.',
  esp32Id: 'Selecione o dispositivo que envia as leituras.',
  sensorId: 'Informe o identificador do sensor.',
  tag: 'Informe uma tag de até 50 caracteres.',
  descricao: 'Informe uma descrição de até 100 caracteres.',
};

export function SensorFormDialog({
  open,
  sensor,
  sectors,
  assets,
  devices,
  onClose,
  onSubmit,
}: SensorFormDialogProps) {
  return (
    <SensorFormDialogBody
      key={`${sensor?.id ?? 'novo'}-${open ? 'aberto' : 'fechado'}`}
      open={open}
      sensor={sensor}
      sectors={sectors}
      assets={assets}
      devices={devices}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
}

function SensorFormDialogBody({
  open,
  sensor,
  sectors,
  assets,
  devices,
  onClose,
  onSubmit,
}: SensorFormDialogProps) {
  const isEditing = sensor !== null;

  const [setorId, setSetorId] = useState('');
  const [ativoId, setAtivoId] = useState(sensor ? String(sensor.ativoId) : '');
  const [esp32Id, setEsp32Id] = useState(sensor ? String(sensor.esp32Id) : '');
  const [sensorId, setSensorId] = useState(sensor?.sensorId ?? '');
  const [tag, setTag] = useState(sensor?.tag ?? '');
  const [descricao, setDescricao] = useState(sensor?.descricao ?? '');
  const [ativoStatus, setAtivoStatus] = useState(sensor?.ativoStatus ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const assetsBySetor = useMemo(() => {
    const grouped = new Map<number, Asset[]>();
    for (const asset of assets) {
      const list = grouped.get(asset.setorId) ?? [];
      list.push(asset);
      grouped.set(asset.setorId, list);
    }
    return grouped;
  }, [assets]);

  const devicesBySetor = useMemo(() => {
    const grouped = new Map<number, Device[]>();
    for (const device of devices) {
      const list = grouped.get(device.setorId) ?? [];
      list.push(device);
      grouped.set(device.setorId, list);
    }
    return grouped;
  }, [devices]);

  const availableAssets = setorId ? (assetsBySetor.get(Number(setorId)) ?? []) : [];
  const availableDevices = setorId ? (devicesBySetor.get(Number(setorId)) ?? []) : [];

  const handleSubmit = async (): Promise<void> => {
    if (isSaving) return;

    const nextErrors: Record<string, string> = {};

    if (!isEditing) {
      if (ativoId === '') nextErrors.ativoId = FIELD_MESSAGES.ativoId;
      if (esp32Id === '') nextErrors.esp32Id = FIELD_MESSAGES.esp32Id;
      if (sensorId.trim().length === 0) nextErrors.sensorId = FIELD_MESSAGES.sensorId;
    }

    if (tag.length > 50) nextErrors.tag = FIELD_MESSAGES.tag;
    if (descricao.length > 100) nextErrors.descricao = FIELD_MESSAGES.descricao;

    setErrors(nextErrors);
    setFormError(null);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSaving(true);
    try {
      if (isEditing && sensor) {
        await onSubmit({
          mode: 'update',
          payload: {
            tag: tag.trim().length > 0 ? tag.trim() : null,
            descricao: descricao.trim().length > 0 ? descricao.trim() : null,
            ativoStatus,
          },
        });
      } else {
        await onSubmit({
          mode: 'create',
          payload: {
            ativoId: Number(ativoId),
            esp32Id: Number(esp32Id),
            sensorId: sensorId.trim(),
            tag: tag.trim().length > 0 ? tag.trim() : null,
            descricao: descricao.trim().length > 0 ? descricao.trim() : null,
            ativoStatus,
          },
        });
      }
    } catch (error: unknown) {
      setFormError(error instanceof Error ? error.message : 'Não foi possível salvar o sensor.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Editar sensor' : 'Novo sensor'}
      description={
        isEditing
          ? 'Atualize a identificação e o status. Para trocar equipamento ou dispositivo, cadastre outro sensor.'
          : 'Selecione um equipamento e um dispositivo do mesmo setor para conectar este ponto de medição.'
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={isSaving}>
            {isSaving ? 'Salvando…' : isEditing ? 'Salvar alterações' : 'Cadastrar sensor'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {formError ? <AlertMessage tone="danger">{formError}</AlertMessage> : null}

        {isEditing && sensor ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            <p className="font-semibold text-slate-800">{sensor.tag ?? `Sensor #${sensor.id}`}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              sensor_id {sensor.sensorId} · equipamento #{sensor.ativoId} · ESP32 #{sensor.esp32Id}
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                name="setor"
                label="Setor"
                required
                value={setorId}
                onChange={(value) => {
                  setSetorId(value);
                  setAtivoId('');
                  setEsp32Id('');
                }}
                placeholder="Selecione o setor"
                disabled={isSaving}
                options={sectors.map((sector) => ({
                  value: String(sector.id),
                  label: sector.nome,
                }))}
              />

              <InputField
                name="sensorId"
                label="Identificador do sensor (sensor_id)"
                required
                value={sensorId}
                onChange={setSensorId}
                error={errors.sensorId}
                placeholder="sensor_01"
                disabled={isSaving}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                name="ativo"
                label="Equipamento"
                required
                value={ativoId}
                onChange={setAtivoId}
                error={errors.ativoId}
                placeholder={setorId === '' ? 'Selecione o setor primeiro' : 'Selecione o ativo'}
                disabled={isSaving || setorId === ''}
                options={availableAssets.map((asset) => ({
                  value: String(asset.id),
                  label: asset.tag ? `${asset.nome} (${asset.tag})` : asset.nome,
                }))}
              />

              <SelectField
                name="esp32"
                label="Dispositivo"
                required
                value={esp32Id}
                onChange={setEsp32Id}
                error={errors.esp32Id}
                placeholder={
                  setorId === '' ? 'Selecione o setor primeiro' : 'Selecione o dispositivo'
                }
                disabled={isSaving || setorId === ''}
                options={availableDevices.map((device) => ({
                  value: String(device.id),
                  label: device.espId,
                }))}
              />
            </div>
          </>
        )}

        <InputField
          name="tag"
          label="Tag"
          value={tag}
          onChange={setTag}
          error={errors.tag}
          placeholder="SN-PRD-001"
          hint="Identificação física do sensor (única na plataforma)."
          disabled={isSaving}
        />

        <TextAreaField
          name="descricao"
          label="Descrição"
          value={descricao}
          onChange={setDescricao}
          error={errors.descricao}
          placeholder="Sensor de vazão na saída do tanque de ETA."
          disabled={isSaving}
        />

        <CheckboxField
          name="ativoStatus"
          label="Sensor habilitado (ativoStatus)"
          checked={ativoStatus}
          onChange={setAtivoStatus}
          disabled={isSaving}
        />
        <p className="-mt-2 text-xs text-slate-500">
          Habilitado significa que o sensor está em uso. Confira a última leitura para verificar se
          os dados estão chegando.
        </p>
      </div>
    </Modal>
  );
}
