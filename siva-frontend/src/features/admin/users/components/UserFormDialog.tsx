import { useId, useState } from 'react';

import { AlertMessage } from '../../../../components/ui/AlertMessage';
import { Button } from '../../../../components/ui/Button';
import { InputField, SelectField } from '../../../../components/ui/FormField';
import { Modal } from '../../../../components/ui/Modal';
import type { Company } from '../../../../types/company';
import type { PublicUser } from '../../../../types/user';
import { extractApiFieldErrors } from '../../forms/extract-api-field-errors';
import { EMPTY_USER_FORM } from '../user-form-rules';
import type { UserFormValues } from '../user-form-rules';
import { validateUserForm } from '../user-form-rules';

interface UserFormDialogProps {
  open: boolean;
  /** `null` para criação; um usuário para edição. */
  user: PublicUser | null;
  companies: Company[];
  onClose: () => void;
  onSubmit: (values: UserFormValues) => Promise<void>;
}

const FIELD_MESSAGES: Record<string, string> = {
  nome: 'Informe o nome (2 a 100 caracteres).',
  email: 'Informe um e-mail válido.',
  senha: 'A senha deve ter entre 6 e 72 caracteres.',
  empresaId: 'Selecione a empresa do usuário.',
  especialidade: 'Selecione a especialidade do técnico.',
};

export function UserFormDialog({ open, user, companies, onClose, onSubmit }: UserFormDialogProps) {
  // A `key` remonta o formulário a cada abertura/troca de usuário, garantindo
  // estado inicial limpo sem efeitos colaterais.
  return (
    <UserFormDialogBody
      key={`${user?.id ?? 'novo'}-${open ? 'aberto' : 'fechado'}`}
      open={open}
      user={user}
      companies={companies}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
}

function UserFormDialogBody({ open, user, companies, onClose, onSubmit }: UserFormDialogProps) {
  const isEditing = user !== null;
  const formId = useId();

  const [values, setValues] = useState<UserFormValues>(
    user
      ? {
          nome: user.nome,
          email: user.email,
          senha: '',
          tipo: user.tipo,
          empresaId: user.empresaId === null ? '' : String(user.empresaId),
          especialidade: user.especialidade ?? '',
          status: user.status,
        }
      : EMPTY_USER_FORM,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const update = <K extends keyof UserFormValues>(key: K, value: UserFormValues[K]): void => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const handleTipoChange = (tipo: UserFormValues['tipo']): void => {
    setValues((current) => ({
      ...current,
      tipo,
      // A empresa e a especialidade não se aplicam a perfis que não as exigem.
      empresaId: tipo === 'ADMIN' ? '' : current.empresaId,
      especialidade: tipo === 'TECNICO' ? current.especialidade : '',
    }));
  };

  const handleSubmit = async (): Promise<void> => {
    if (isSaving) return;

    const nextErrors = validateUserForm(values, { isEditing });
    setErrors(nextErrors);
    setFormError(null);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSaving(true);
    try {
      await onSubmit(values);
    } catch (error: unknown) {
      const apiErrors = extractApiFieldErrors(error, FIELD_MESSAGES);
      if (Object.keys(apiErrors).length > 0) {
        setErrors(apiErrors);
      } else {
        setFormError(error instanceof Error ? error.message : 'Não foi possível salvar o usuário.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const companyOptions = companies.map((company) => ({
    value: String(company.id),
    label: company.nome,
  }));

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!isSaving) onClose();
      }}
      title={isEditing ? 'Editar usuário' : 'Novo usuário'}
      description={
        isEditing
          ? 'Atualize os dados e o perfil de acesso.'
          : 'As contas são criadas exclusivamente pelo administrador do SIVA.'
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} disabled={isSaving}>
            {isSaving ? 'Salvando…' : isEditing ? 'Salvar alterações' : 'Cadastrar usuário'}
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
          value={values.nome}
          onChange={(value) => update('nome', value)}
          error={errors.nome}
          placeholder="Carla Mendes"
          disabled={isSaving}
        />

        <InputField
          name="email"
          label="E-mail"
          type="email"
          required
          autoComplete="off"
          value={values.email}
          onChange={(value) => update('email', value)}
          error={errors.email}
          placeholder="carla.mendes@empresa.com.br"
          disabled={isSaving}
        />

        <InputField
          name="senha"
          label="Senha"
          type="password"
          required={!isEditing}
          autoComplete="new-password"
          value={values.senha}
          onChange={(value) => update('senha', value)}
          error={errors.senha}
          hint={
            isEditing ? 'Deixe em branco para manter a senha atual.' : 'Mínimo de 6 caracteres.'
          }
          disabled={isSaving}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            name="tipo"
            label="Perfil"
            required
            value={values.tipo}
            onChange={(value) => handleTipoChange(value as UserFormValues['tipo'])}
            disabled={isSaving}
            options={[
              { value: 'ADMIN', label: 'Administrador' },
              { value: 'GESTOR', label: 'Gestor' },
              { value: 'TECNICO', label: 'Técnico' },
            ]}
          />

          {!isEditing ? (
            <SelectField
              name="status"
              label="Status"
              required
              value={values.status}
              onChange={(value) => update('status', value as UserFormValues['status'])}
              disabled={isSaving}
              options={[
                { value: 'ATIVO', label: 'Ativo' },
                { value: 'INATIVO', label: 'Inativo' },
              ]}
            />
          ) : null}
        </div>

        {values.tipo === 'ADMIN' ? (
          <AlertMessage tone="info">
            Administradores têm acesso global e não são vinculados a nenhuma empresa.
          </AlertMessage>
        ) : (
          <SelectField
            name="empresaId"
            label="Empresa"
            required
            value={values.empresaId}
            onChange={(value) => update('empresaId', value)}
            error={errors.empresaId}
            placeholder="Selecione a empresa"
            disabled={isSaving}
            options={companyOptions}
          />
        )}

        {values.tipo === 'TECNICO' ? (
          <SelectField
            name="especialidade"
            label="Especialidade"
            required
            value={values.especialidade}
            onChange={(value) => update('especialidade', value as UserFormValues['especialidade'])}
            error={errors.especialidade}
            placeholder="Selecione a especialidade"
            disabled={isSaving}
            options={[
              { value: 'MECANICO', label: 'Mecânico' },
              { value: 'ELETRICISTA', label: 'Eletricista' },
            ]}
          />
        ) : null}
      </form>
    </Modal>
  );
}
