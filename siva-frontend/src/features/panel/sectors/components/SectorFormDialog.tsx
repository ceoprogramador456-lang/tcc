import { useState } from 'react';

import { Button } from '../../../../components/ui/Button';
import { InputField } from '../../../../components/ui/FormField';
import { Modal } from '../../../../components/ui/Modal';
import { AlertMessage } from '../../../../components/ui/AlertMessage';
import type { CreateSectorPayload, Sector, UpdateSectorPayload } from '../../../../types/sector';
import { CompanyCombobox } from './CompanyCombobox';

interface SectorFormDialogProps {
  open: boolean;
  /** `null` para criação; um setor para edição. */
  sector: Sector | null;
  /** Empresa inicial do campo: do filtro do painel ao criar, do setor ao editar. */
  empresaId: number | null;
  onClose: () => void;
  onSubmit: (payload: CreateSectorPayload | UpdateSectorPayload) => Promise<void>;
}

const FIELD_MESSAGES: Record<string, string> = {
  nome: 'Informe o nome do setor (2 a 100 caracteres).',
  empresa: 'Selecione uma empresa.',
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
  const [empresa, setEmpresa] = useState(empresaId ? String(empresaId) : '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const selectedEmpresaId = (() => {
    const parsed = Number(empresa);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  })();

  const handleSubmit = async (): Promise<void> => {
    if (isSaving) return;

    const trimmed = nome.trim();
    const nextErrors: Record<string, string> = {};
    if (trimmed.length < 2) nextErrors.nome = FIELD_MESSAGES.nome;

    let payload: CreateSectorPayload | UpdateSectorPayload | null = null;
    if (isEditing) {
      payload = { nome: trimmed };
    } else if (selectedEmpresaId !== null) {
      payload = { nome: trimmed, empresaId: selectedEmpresaId };
    } else {
      nextErrors.empresa = FIELD_MESSAGES.empresa;
    }

    setErrors(nextErrors);
    setFormError(null);
    if (payload === null || Object.keys(nextErrors).length > 0) return;

    setIsSaving(true);

    try {
      await onSubmit(payload);
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

        <CompanyCombobox
          label="Empresa"
          value={empresa}
          onChange={setEmpresa}
          error={errors.empresa}
          disabled={isSaving}
          placeholder="Selecione a empresa"
        />

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
