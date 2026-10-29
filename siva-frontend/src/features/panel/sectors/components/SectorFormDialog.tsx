import { useState } from 'react';

import { Button } from '../../../../components/ui/Button';
import { InputField } from '../../../../components/ui/FormField';
import { Modal } from '../../../../components/ui/Modal';
import { AlertMessage } from '../../../../components/ui/AlertMessage';
import type { CreateSectorPayload, Sector, UpdateSectorPayload } from '../../../../types/sector';

interface SectorFormDialogProps {
  open: boolean;
  /** `null` para criação; um setor para edição. */
  sector: Sector | null;
  /** Empresa à qual o novo setor será vinculado. */
  empresaId: number | null;
  onClose: () => void;
  onSubmit: (payload: CreateSectorPayload | UpdateSectorPayload) => Promise<void>;
}

const FIELD_MESSAGES: Record<string, string> = {
  nome: 'Informe o nome do setor (2 a 100 caracteres).',
};

export function SectorFormDialog({
  open,
  sector,
  empresaId,
  onClose,
  onSubmit,
}: SectorFormDialogProps) {
  return (
    <SectorFormDialogBody
      key={`${sector?.id ?? 'novo'}-${open ? 'aberto' : 'fechado'}`}
      open={open}
      sector={sector}
      empresaId={empresaId}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
}

function SectorFormDialogBody({
  open,
  sector,
  empresaId,
  onClose,
  onSubmit,
}: SectorFormDialogProps) {
  const isEditing = sector !== null;

  const [nome, setNome] = useState(sector?.nome ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (): Promise<void> => {
    if (isSaving) return;

    const trimmed = nome.trim();
    if (trimmed.length < 2) {
      setErrors({ nome: FIELD_MESSAGES.nome });
      return;
    }

    if (!isEditing && (!empresaId || empresaId <= 0)) {
      setFormError('Selecione uma empresa no filtro do painel antes de cadastrar o setor.');
      return;
    }

    setErrors({});
    setFormError(null);
    setIsSaving(true);

    try {
      if (isEditing) {
        await onSubmit({ nome: trimmed });
      } else {
        if (!empresaId || empresaId <= 0) {
          throw new Error('Selecione uma empresa no filtro do painel antes de cadastrar o setor.');
        }
        await onSubmit({ nome: trimmed, empresaId });
      }
    } catch (error: unknown) {
      setFormError(error instanceof Error ? error.message : 'Não foi possível salvar o setor.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Editar setor' : 'Novo setor'}
      description={
        isEditing
          ? 'Atualize o nome da área. Os equipamentos e dispositivos vinculados permanecem no setor.'
          : 'Cadastre uma área, como Produção ou Resfriamento, para organizar equipamentos e dispositivos.'
      }
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={isSaving}>
            {isSaving ? 'Salvando…' : isEditing ? 'Salvar alterações' : 'Cadastrar setor'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {formError ? <AlertMessage tone="danger">{formError}</AlertMessage> : null}

        <InputField
          name="nome"
          label="Nome do setor"
          required
          value={nome}
          onChange={setNome}
          error={errors.nome}
          placeholder="Produção"
          disabled={isSaving}
        />
      </div>
    </Modal>
  );
}
