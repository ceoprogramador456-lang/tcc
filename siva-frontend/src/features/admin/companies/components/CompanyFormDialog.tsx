import { useId, useState } from 'react';

import { AlertMessage } from '../../../../components/ui/AlertMessage';
import { Button } from '../../../../components/ui/Button';
import { InputField } from '../../../../components/ui/FormField';
import { Modal } from '../../../../components/ui/Modal';
import type { Company, CreateCompanyPayload } from '../../../../types/company';
import { extractApiFieldErrors } from '../../forms/extract-api-field-errors';

interface CompanyFormDialogProps {
  open: boolean;
  /** `null` para criação; uma empresa para edição. */
  company: Company | null;
  onClose: () => void;
  onSubmit: (payload: CreateCompanyPayload) => Promise<void>;
}

const FIELD_MESSAGES: Record<string, string> = {
  nome: 'Informe o nome da empresa (2 a 100 caracteres).',
  cnpj: 'Informe um CNPJ válido (até 20 caracteres).',
};

export function CompanyFormDialog({ open, company, onClose, onSubmit }: CompanyFormDialogProps) {
  // A `key` remonta o formulário a cada abertura/troca de empresa, garantindo
  // estado inicial limpo sem efeitos colaterais.
  return (
    <CompanyFormDialogBody
      key={`${company?.id ?? 'nova'}-${open ? 'aberto' : 'fechado'}`}
      open={open}
      company={company}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
}

function CompanyFormDialogBody({ open, company, onClose, onSubmit }: CompanyFormDialogProps) {
  const isEditing = company !== null;
  const formId = useId();

  const [nome, setNome] = useState(company?.nome ?? '');
  const [cnpj, setCnpj] = useState(company?.cnpj ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (): Promise<void> => {
    if (isSaving) return;

    const nextErrors: Record<string, string> = {};
    const trimmedNome = nome.trim();

    if (trimmedNome.length < 2 || trimmedNome.length > 100) nextErrors.nome = FIELD_MESSAGES.nome;
    if (cnpj.trim().length > 20) nextErrors.cnpj = FIELD_MESSAGES.cnpj;

    setErrors(nextErrors);
    setFormError(null);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSaving(true);
    try {
      await onSubmit({
        nome: trimmedNome,
        cnpj: cnpj.trim().length > 0 ? cnpj.trim() : null,
      });
    } catch (error: unknown) {
      const apiErrors = extractApiFieldErrors(error, FIELD_MESSAGES);
      if (Object.keys(apiErrors).length > 0) {
        setErrors(apiErrors);
      } else {
        setFormError(error instanceof Error ? error.message : 'Não foi possível salvar a empresa.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!isSaving) onClose();
      }}
      title={isEditing ? 'Editar empresa' : 'Nova empresa'}
      description={
        isEditing
          ? 'Atualize os dados cadastrados da empresa.'
          : 'Empresas são a base do isolamento de dados do SIVA.'
      }
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} disabled={isSaving}>
            {isSaving ? 'Salvando…' : isEditing ? 'Salvar alterações' : 'Cadastrar empresa'}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
        className="space-y-4"
      >
        {formError ? <AlertMessage tone="danger">{formError}</AlertMessage> : null}

        <InputField
          name="nome"
          label="Nome"
          required
          value={nome}
          onChange={setNome}
          error={errors.nome}
          placeholder="Aquaplás Indústria Ltda"
          disabled={isSaving}
        />

        <InputField
          name="cnpj"
          label="CNPJ"
          value={cnpj}
          onChange={setCnpj}
          error={errors.cnpj}
          placeholder="12.345.678/0001-90"
          hint="Opcional."
          disabled={isSaving}
        />
      </form>
    </Modal>
  );
}
