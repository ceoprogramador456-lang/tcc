import { useId } from 'react';

import { cn } from '../../utils/cn';
import { fieldErrorStyles, fieldHintStyles, fieldLabelStyles, fieldStyles } from './form-styles';

interface BaseFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  name: string;
  className?: string;
}

interface InputFieldProps extends BaseFieldProps {
  type?: 'text' | 'email' | 'password' | 'number';
  autoComplete?: string;
  min?: number;
  max?: number;
}

export function InputField({
  label,
  value,
  onChange,
  error,
  hint,
  required,
  disabled,
  placeholder,
  name,
  type = 'text',
  autoComplete,
  min,
  max,
  className,
}: InputFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <div className={className}>
      <label htmlFor={id} className={fieldLabelStyles}>
        {label}
        {required ? <span className="ml-0.5 text-red-500">*</span> : null}
      </label>

      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        min={min}
        max={max}
        aria-invalid={error ? true : undefined}
        aria-describedby={cn(error ? errorId : undefined, hint ? hintId : undefined) || undefined}
        className={fieldStyles(Boolean(error))}
      />

      {error ? (
        <p id={errorId} className={fieldErrorStyles}>
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className={fieldHintStyles}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

interface SelectFieldProps extends Omit<BaseFieldProps, 'placeholder'> {
  options: { value: string; label: string; disabled?: boolean }[];
  placeholder?: string;
}

export function SelectField({
  label,
  value,
  onChange,
  error,
  hint,
  required,
  disabled,
  placeholder,
  name,
  options,
  className,
}: SelectFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <div className={className}>
      <label htmlFor={id} className={fieldLabelStyles}>
        {label}
        {required ? <span className="ml-0.5 text-red-500">*</span> : null}
      </label>

      <select
        id={id}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={cn(error ? errorId : undefined, hint ? hintId : undefined) || undefined}
        className={cn(fieldStyles(Boolean(error)), 'appearance-none bg-white pr-9')}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 0.75rem center',
        }}
      >
        {placeholder ? (
          <option value="" disabled={required}>
            {placeholder}
          </option>
        ) : null}
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>

      {error ? (
        <p id={errorId} className={fieldErrorStyles}>
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className={fieldHintStyles}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

interface TextAreaFieldProps extends BaseFieldProps {
  rows?: number;
}

export function TextAreaField({
  label,
  value,
  onChange,
  error,
  hint,
  required,
  disabled,
  placeholder,
  name,
  rows = 3,
  className,
}: TextAreaFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <div className={className}>
      <label htmlFor={id} className={fieldLabelStyles}>
        {label}
        {required ? <span className="ml-0.5 text-red-500">*</span> : null}
      </label>

      <textarea
        id={id}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={cn(error ? errorId : undefined, hint ? hintId : undefined) || undefined}
        className={cn(fieldStyles(Boolean(error)), 'resize-y')}
      />

      {error ? (
        <p id={errorId} className={fieldErrorStyles}>
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className={fieldHintStyles}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

interface CheckboxFieldProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  name: string;
  className?: string;
}

export function CheckboxField({
  label,
  checked,
  onChange,
  disabled,
  name,
  className,
}: CheckboxFieldProps) {
  const id = useId();

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <input
        id={id}
        name={name}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 rounded border-slate-300 text-bright-teal-blue focus:ring-bright-teal-blue/40"
      />
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
      </label>
    </div>
  );
}
