import { useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

import { errorStyles, inputStyles, labelStyles } from './field-styles';

interface PasswordFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  autoComplete?: string;
  placeholder?: string;
  disabled?: boolean;
  name: string;
}

export function PasswordField({
  label,
  value,
  onChange,
  error,
  autoComplete,
  placeholder,
  disabled,
  name,
}: PasswordFieldProps) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div>
      <label htmlFor={inputId} className={labelStyles}>
        {label}
      </label>

      <div className="relative">
        <input
          id={inputId}
          name={name}
          type={isVisible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`${inputStyles(Boolean(error))} pr-12`}
        />

        <button
          type="button"
          onClick={() => setIsVisible((current) => !current)}
          disabled={disabled}
          aria-label={isVisible ? 'Ocultar senha' : 'Mostrar senha'}
          aria-pressed={isVisible}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-bright-teal-blue transition-colors hover:text-siva-600 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-bright-teal-blue disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isVisible ? <EyeOff className="size-5" aria-hidden="true" /> : <Eye className="size-5" aria-hidden="true" />}
        </button>
      </div>

      {error ? (
        <p id={errorId} className={errorStyles}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
