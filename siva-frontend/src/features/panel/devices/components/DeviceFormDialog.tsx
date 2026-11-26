import { useState } from 'react';

import { AlertMessage } from '../../../../components/ui/AlertMessage';
import { Button } from '../../../../components/ui/Button';
import { InputField, SelectField } from '../../../../components/ui/FormField';
import { Modal } from '../../../../components/ui/Modal';
import type { UpdateDevicePayload, Device } from '../../../../types/device';
import type { Sector } from '../../../../types/sector';

interface DeviceFormDialogProps {
  device: Device;
  sectors: Sector[];
  onClose: () => void;
  onSubmit: (payload: UpdateDevicePayload) => Promise<void>;
}

const FIELD_MESSAGES: Record<string, string> = {
  espId: 'Informe o esp_id (2 a 50 caracteres).',
  descricao: 'A descrição deve ter no máximo 100 caracteres.',
  setorId: 'Selecione o setor do dispositivo.',
};

export function DeviceFormDialog({ device, sectors, onClose, onSubmit }: DeviceFormDialogProps) {
  const [setorId, setSetorId] = useState(String(device.setorId));
  const [espId, setEspId] = useState(device.espId);
  const [descricao, setDescricao] = useState(device.descricao ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (): Promise<void> => {
    if (isSaving) return;

    const nextErrors: Record<string, string> = {};
    const trimmedEspId = espId.trim();

    if (trimmedEspId.length < 2) nextErrors.espId = FIELD_MESSAGES.espId;
    if (setorId === '') nextErrors.setorId = FIELD_MESSAGES.setorId;
    if (descricao.length > 100) nextErrors.descricao = FIELD_MESSAGES.descricao;

    setErrors(nextErrors);
    setFormError(null);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSaving(true);
    try {
      await onSubmit({
        setorId: Number(setorId),
        ...(device.mac ? {} : { espId: trimmedEspId }),
        descricao: descricao.trim().length > 0 ? descricao.trim() : null,
      });
    } catch (error: unknown) {
      setFormError(
        error instanceof Error ? error.message : 'Não foi possível salvar o dispositivo.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Editar dispositivo ESP32"
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={isSaving}>
            {isSaving ? 'Salvando…' : 'Salvar alterações'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {formError ? <AlertMessage tone="danger">{formError}</AlertMessage> : null}

        <InputField
          name="espId"
          label="Identificador do dispositivo (esp_id)"
          required
          value={espId}
          onChange={setEspId}
          error={errors.espId}
          placeholder="esp_01"
          hint="Usado no payload enviado pelo firmware."
          disabled={isSaving || Boolean(device.mac)}
        />

        <SelectField
          name="setorId"
          label="Setor"
          required
          value={setorId}
          onChange={setSetorId}
          error={errors.setorId}
          placeholder="Selecione o setor"
          disabled={isSaving}
          options={sectors.map((sector) => ({ value: String(sector.id), label: sector.nome }))}
        />

        <InputField
          name="descricao"
          label="Descrição"
          value={descricao}
          onChange={setDescricao}
          error={errors.descricao}
          placeholder="ESP32 da casa de bombas"
          disabled={isSaving}
        />
      </div>
    </Modal>
  );
}
