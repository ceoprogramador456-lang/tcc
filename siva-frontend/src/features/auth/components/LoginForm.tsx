import type { FormEvent } from 'react';
import { LoaderCircle, TriangleAlert } from 'lucide-react';

import { Button } from '../../../components/ui/Button';
import { useLoginForm } from '../hooks/use-login-form';
import type { LoginFormValues } from '../hooks/use-login-form';
import { PasswordField } from './PasswordField';
import { TextField } from './TextField';

interface LoginFormProps {
  onSubmit: (values: LoginFormValues) => Promise<void>;
}

export function LoginForm({ onSubmit }: LoginFormProps) {
  const { values, errors, formError, isSubmitting, setField, handleSubmit } = useLoginForm({ onSubmit });

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    void handleSubmit(event);
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <TextField
        name="email"
        label="E-mail"
        type="email"
        value={values.email}
        onChange={(value) => setField('email', value)}
        error={errors.email}
        autoComplete="email"
        placeholder="voce@empresa.com.br"
        disabled={isSubmitting}
      />

      <PasswordField
        name="senha"
        label="Senha"
        value={values.senha}
        onChange={(value) => setField('senha', value)}
        error={errors.senha}
        autoComplete="current-password"
        placeholder="••••••••"
        disabled={isSubmitting}
      />

      {formError ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-3.5 py-3 text-sm text-red-200"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{formError}</span>
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={isSubmitting} className="w-full">
        {isSubmitting ? (
          <>
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            Entrando…
          </>
        ) : (
          'Entrar'
        )}
      </Button>
    </form>
  );
}
