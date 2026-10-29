import { useState } from 'react';

import { AlertMessage } from '../../../../components/ui/AlertMessage';
import { Button } from '../../../../components/ui/Button';
import { InputField, SelectField } from '../../../../components/ui/FormField';
import { Modal } from '../../../../components/ui/Modal';
import type { CreateDevicePayload, Device } from '../../../../types/device';
import type { Sector } from '../../../../types/sector';

interface DeviceFormDialogProps {
  open: boolean;
  /** `null` para criação; um dispositivo para edição. */
  device: Device | null;
  sectors: Sector[];
  onClose: () => void;
  onSubmit: (payload: CreateDevicePayload) => Promise<void>;
}

const FIELD_MESSAGES: Record<string, string> = {
  espId: 'Informe o esp_id (2 a 50 caracteres).',
  descricao: 'A descrição deve ter no máximo 100 caracteres.',
  setorId: 'Selecione o setor do dispositivo.',
};

export function DeviceFormDialog({
  open,
  device,
  sectors,
  onClose,
  onSubmit,
}: DeviceFormDialogProps) {
  return (
    <DeviceFormDialogBody
      key={`${device?.id ?? 'novo'}-${open ? 'aberto' : 'fechado'}`}
      open={open}
      device={device}
      sectors={sectors}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
}

function DeviceFormDialogBody({ open, device, sectors, onClose, onSubmit }: DeviceFormDialogProps) {
  const isEditing = device !== null;

  const [setorId, setSetorId] = useState(device ? String(device.setorId) : '');
  const [espId, setEspId] = useState(device?.espId ?? '');
  const [descricao, setDescricao] = useState(device?.descricao ?? '');
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
        espId: trimmedEspId,
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
      open={open}
      onClose={onClose}
      title={isEditing ? 'Editar dispositivo' : 'Cadastrar dispositivo'}
      description={
        isEditing
          ? 'O token de acesso do firmware não é alterado aqui — nem reaparece após a criação.'
          : 'O token de acesso é gerado pelo servidor e exibido uma única vez, ao final do cadastro.'
      }
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={isSaving}>
            {isSaving ? 'Salvando…' : isEditing ? 'Salvar alterações' : 'Cadastrar dispositivo'}
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
          disabled={isSaving}
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
