import { useId } from 'react';

import { errorStyles, inputStyles, labelStyles } from './field-styles';

interface TextFieldProps {
  label: string;
  type: 'email' | 'text';
  value: string;
  onChange: (value: string) => void;
  error?: string;
  autoComplete?: string;
  placeholder?: string;
  disabled?: boolean;
  name: string;
}

export function TextField({
  label,
  type,
  value,
  onChange,
  error,
  autoComplete,
  placeholder,
  disabled,
  name,
}: TextFieldProps) {
  const inputId = useId();
  const errorId = `${inputId}-error`;

  return (
    <div>
      <label htmlFor={inputId} className={labelStyles}>
        {label}
      </label>

      <input
        id={inputId}
        name={name}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={inputStyles(Boolean(error))}
      />

      {error ? (
        <p id={errorId} className={errorStyles}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
