import { useState } from 'react';

import { AlertMessage } from '../../../../components/ui/AlertMessage';
import { Button } from '../../../../components/ui/Button';
import { InputField, SelectField, TextAreaField } from '../../../../components/ui/FormField';
import { Modal } from '../../../../components/ui/Modal';
import type { Asset, AssetCriticality, CreateAssetPayload } from '../../../../types/asset';
import type { Sector } from '../../../../types/sector';

interface AssetFormDialogProps {
  open: boolean;
  /** `null` para criação; um ativo para edição. */
  asset: Asset | null;
  sectors: Sector[];
  onClose: () => void;
  onSubmit: (payload: CreateAssetPayload) => Promise<void>;
}

const FIELD_MESSAGES: Record<string, string> = {
  nome: 'Informe o nome do equipamento (2 a 100 caracteres).',
  tag: 'A tag deve ter no máximo 50 caracteres.',
  setorId: 'Selecione o setor do equipamento.',
  descricao: 'A descrição deve ter no máximo 255 caracteres.',
  centroCusto: 'O centro de custo deve ter no máximo 50 caracteres.',
};

export function AssetFormDialog({ open, asset, sectors, onClose, onSubmit }: AssetFormDialogProps) {
  return (
    <AssetFormDialogBody
      key={`${asset?.id ?? 'novo'}-${open ? 'aberto' : 'fechado'}`}
      open={open}
      asset={asset}
      sectors={sectors}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
}

function AssetFormDialogBody({ open, asset, sectors, onClose, onSubmit }: AssetFormDialogProps) {
  const isEditing = asset !== null;

  const [setorId, setSetorId] = useState(asset ? String(asset.setorId) : '');
  const [nome, setNome] = useState(asset?.nome ?? '');
  const [tag, setTag] = useState(asset?.tag ?? '');
  const [tipo, setTipo] = useState(asset?.tipo ?? '');
  const [criticidade, setCriticidade] = useState<AssetCriticality>(asset?.criticidade ?? 'media');
  const [centroCusto, setCentroCusto] = useState(asset?.centroCusto ?? '');
  const [descricao, setDescricao] = useState(asset?.descricao ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (): Promise<void> => {
    if (isSaving) return;

    const nextErrors: Record<string, string> = {};
    const trimmedNome = nome.trim();

    if (trimmedNome.length < 2) nextErrors.nome = FIELD_MESSAGES.nome;
    if (setorId === '') nextErrors.setorId = FIELD_MESSAGES.setorId;
    if (tag.length > 50) nextErrors.tag = FIELD_MESSAGES.tag;
    if (descricao.length > 255) nextErrors.descricao = FIELD_MESSAGES.descricao;
    if (centroCusto.length > 50) nextErrors.centroCusto = FIELD_MESSAGES.centroCusto;

    setErrors(nextErrors);
    setFormError(null);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSaving(true);
    try {
      await onSubmit({
        setorId: Number(setorId),
        nome: trimmedNome,
        tag: tag.trim().length > 0 ? tag.trim() : null,
        tipo: tipo.trim().length > 0 ? tipo.trim() : null,
        criticidade,
        centroCusto: centroCusto.trim().length > 0 ? centroCusto.trim() : null,
        descricao: descricao.trim().length > 0 ? descricao.trim() : null,
      });
    } catch (error: unknown) {
      setFormError(
        error instanceof Error ? error.message : 'Não foi possível salvar o equipamento.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Editar equipamento' : 'Cadastrar equipamento'}
      description={
        isEditing
          ? 'Atualize os dados do equipamento. O setor só muda se os sensores vinculados permitirem.'
          : 'Vincule o equipamento a um setor existente — é ele que define a empresa e o escopo.'
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={isSaving}>
            {isSaving ? 'Salvando…' : isEditing ? 'Salvar alterações' : 'Cadastrar ativo'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {formError ? <AlertMessage tone="danger">{formError}</AlertMessage> : null}

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
          name="nome"
          label="Nome"
          required
          value={nome}
          onChange={setNome}
          error={errors.nome}
          placeholder="Enchedora"
          disabled={isSaving}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <InputField
            name="tag"
            label="Tag"
            value={tag}
            onChange={setTag}
            error={errors.tag}
            placeholder="AT-PRD-001"
            hint="Identificador físico (único)."
            disabled={isSaving}
          />

          <InputField
            name="tipo"
            label="Tipo"
            value={tipo}
            onChange={setTipo}
            error={errors.tipo}
            placeholder="maquina"
            disabled={isSaving}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            name="criticidade"
            label="Criticidade"
            required
            value={criticidade}
            onChange={(value) => setCriticidade(value as AssetCriticality)}
            disabled={isSaving}
            options={[
              { value: 'baixa', label: 'Baixa' },
              { value: 'media', label: 'Média' },
              { value: 'alta', label: 'Alta' },
            ]}
          />

          <InputField
            name="centroCusto"
            label="Centro de custo"
            value={centroCusto}
            onChange={setCentroCusto}
            error={errors.centroCusto}
            placeholder="CC-100"
            disabled={isSaving}
          />
        </div>

        <TextAreaField
          name="descricao"
          label="Descrição"
          value={descricao}
          onChange={setDescricao}
          error={errors.descricao}
          placeholder="Máquina que alimenta a linha de enchimento."
          disabled={isSaving}
        />
      </div>
    </Modal>
  );
}
