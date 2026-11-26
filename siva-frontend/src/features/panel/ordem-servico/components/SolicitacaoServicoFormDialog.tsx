import { useState } from 'react';

import { AlertMessage } from '../../../../components/ui/AlertMessage';
import { Button } from '../../../../components/ui/Button';
import { InputField, SelectField, TextAreaField } from '../../../../components/ui/FormField';
import { Modal } from '../../../../components/ui/Modal';
import type { CreateOrdemServicoPayload, TipoServico } from '../../../../types/ordem-servico';

const TIPO_OPTIONS: { value: TipoServico; label: string }[] = [
  { value: 'preventiva', label: 'Preventiva' },
  { value: 'corretiva', label: 'Corretiva' },
  { value: 'inspecao', label: 'Inspeção' },
];

const FIELD_MESSAGES = {
  nome: 'Informe o nome do serviço (2 a 100 caracteres).',
  tipo: 'Selecione o tipo do serviço.',
};

interface SolicitacaoServicoFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateOrdemServicoPayload) => Promise<void>;
}

/**
 * Modal "Nova solicitação" da tela do GESTOR: Nome, Tipo e Descrição.
 */
export function SolicitacaoServicoFormDialog({ open, onClose, onSubmit }: SolicitacaoServicoFormDialogProps) {
  return (
    <SolicitacaoServicoFormDialogBody
      key={`novo-${open ? 'aberto' : 'fechado'}`}
      open={open}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
}

function SolicitacaoServicoFormDialogBody({ open, onClose, onSubmit }: SolicitacaoServicoFormDialogProps) {
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<TipoServico | ''>('');
  const [descricao, setDescricao] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (): Promise<void> => {
    const trimmed = nome.trim();
    const nextErrors: Record<string, string> = {};
    if (trimmed.length < 2) nextErrors.nome = FIELD_MESSAGES.nome;
    if (tipo === '') nextErrors.tipo = FIELD_MESSAGES.tipo;

    setErrors(nextErrors);
    setFormError(null);
    if (tipo === '' || Object.keys(nextErrors).length > 0) return;

    setIsSaving(true);
    try {
      await onSubmit({ nome: trimmed, tipo, descricao: descricao.trim() || null });
      onClose();
    } catch (error: unknown) {
      setFormError(
        error instanceof Error ? error.message : 'Não foi possível cadastrar a solicitação.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nova solicitação de serviço"
      description="Descreva a manutenção ou a inspeção que a equipe deve executar."
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={isSaving}>
            {isSaving ? 'Salvando…' : 'Nova solicitação'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {formError ? <AlertMessage tone="danger">{formError}</AlertMessage> : null}

        <InputField
          name="nome"
          label="Nome"
          required
          value={nome}
          onChange={setNome}
          error={errors.nome}
          placeholder="Troca do tanque de ETA 01"
          disabled={isSaving}
        />

        <SelectField
          name="tipo"
          label="Tipo"
          required
          value={tipo}
          onChange={(value) => setTipo(value as TipoServico | '')}
          error={errors.tipo}
          placeholder="Selecione o tipo"
          options={TIPO_OPTIONS}
          disabled={isSaving}
        />

        <TextAreaField
          name="descricao"
          label="Descrição"
          value={descricao}
          onChange={setDescricao}
          placeholder="Detalhes da intervenção necessária."
          disabled={isSaving}
        />
      </div>
    </Modal>
  );
}
