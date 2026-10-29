import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';

import { ApiError } from '../../../services/api/http-client';
import { toLoginErrorMessage } from '../auth-error-messages';

export interface LoginFormValues {
  email: string;
  senha: string;
}

export interface LoginFormErrors {
  email?: string;
  senha?: string;
}

interface UseLoginFormOptions {
  onSubmit: (values: LoginFormValues) => Promise<void>;
}

/**
 * Pré-validação alinhada ao schema do back-end
 * (`loginSchema` em `src/modules/auth/validators/auth.validators.ts`):
 * e-mail precisa ser um endereço válido e a senha não pode ser vazia.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FIELD_MESSAGES: Record<keyof LoginFormErrors, string> = {
  email: 'Informe um e-mail válido.',
  senha: 'Informe sua senha.',
};

export function useLoginForm({ onSubmit }: UseLoginFormOptions) {
  const [values, setValues] = useState<LoginFormValues>({ email: '', senha: '' });
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setField = useCallback((field: keyof LoginFormValues, value: string): void => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }, []);

  const validate = useCallback((next: LoginFormValues): LoginFormErrors => {
    const nextErrors: LoginFormErrors = {};
    const email = next.email.trim();

    if (email.length === 0) {
      nextErrors.email = 'Informe o seu e-mail.';
    } else if (!EMAIL_PATTERN.test(email)) {
      nextErrors.email = 'Informe um e-mail válido.';
    }

    if (next.senha.length === 0) {
      nextErrors.senha = 'Informe sua senha.';
    }

    return nextErrors;
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();

      // Evita submissões duplicadas enquanto a requisição está em andamento.
      if (isSubmitting) return;

      setFormError(null);

      const nextErrors = validate(values);
      setErrors(nextErrors);
      if (Object.keys(nextErrors).length > 0) return;

      setIsSubmitting(true);

      try {
        await onSubmit({ email: values.email.trim(), senha: values.senha });
      } catch (error: unknown) {
        if (error instanceof ApiError && error.status === 422) {
          const fieldErrors = error.fieldErrors;
          const mapped: LoginFormErrors = {};
          if (fieldErrors.email) mapped.email = FIELD_MESSAGES.email;
          if (fieldErrors.senha) mapped.senha = FIELD_MESSAGES.senha;
          setErrors(mapped);
        }

        setFormError(toLoginErrorMessage(error));
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, onSubmit, validate, values],
  );

  return { values, errors, formError, isSubmitting, setField, handleSubmit };
}
