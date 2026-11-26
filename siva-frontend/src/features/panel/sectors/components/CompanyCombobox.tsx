import { useId, useMemo, useState } from 'react';

import { useAsyncData } from '../../../../hooks/use-async-data';
import { companyService } from '../../../../services/companies/company.service';
import { cn } from '../../../../utils/cn';
import { fieldErrorStyles, fieldLabelStyles, fieldStyles } from '../../../../components/ui/form-styles';
import { useAuth } from '../../../auth/hooks/use-auth';

interface CompanyComboboxProps {
  label: string;
  /** ID da empresa selecionada (string vazia = nenhuma selecionada). */
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * Combobox de busca por nome de empresa.
 *
 * As empresas vêm do mesmo endpoint/serviço usado pelo filtro de empresa do
 * painel (`companyService.list` via `useAsyncData`), filtrando por nome ao digitar.
 */
export function CompanyCombobox({
  label,
  value,
  onChange,
  error,
  disabled,
  placeholder = 'Selecione a empresa',
}: CompanyComboboxProps) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const listboxId = `${inputId}-listbox`;

  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [inputText, setInputText] = useState('');

  const { data: companies } = useAsyncData(
    () => {
      if (!token) return Promise.resolve(null);
      return companyService.list(token, { page: 1, pageSize: 100 });
    },
    token ?? '',
  );

  const options = useMemo(() => companies?.items ?? [], [companies?.items]);

  const selectedName = useMemo(
    () => options.find((company) => String(company.id) === value)?.nome,
    [options, value],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((company) => company.nome.toLowerCase().includes(needle));
  }, [options, query]);

  const displayText = value !== '' ? (selectedName ?? String(value)) : inputText;

  const selectCompany = (companyId: number): void => {
    onChange(String(companyId));
    setQuery('');
    setInputText('');
    setOpen(false);
  };

  return (
    <div>
      <label htmlFor={inputId} className={fieldLabelStyles}>
        {label}
        <span className="ml-0.5 text-red-500">*</span>
      </label>

      <input
        id={inputId}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listboxId : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        value={displayText}
        placeholder={placeholder}
        disabled={disabled}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false);
        }}
        onChange={(event) => {
          setInputText(event.target.value);
          setQuery(event.target.value);
          onChange('');
        }}
        className={fieldStyles(Boolean(error))}
      />

      {open && filtered.length > 0 ? (
        <ul
          id={listboxId}
          role="listbox"
          className="mt-1 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-sm"
        >
          {filtered.map((company) => {
            const isSelected = String(company.id) === value;
            return (
              <li key={company.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  disabled={disabled}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectCompany(company.id)}
                  className={cn(
                    'w-full px-3.5 py-2 text-left text-sm transition-colors',
                    isSelected
                      ? 'bg-siva-50 font-semibold text-bright-teal-blue'
                      : 'text-slate-700 hover:bg-siva-50',
                    disabled && 'cursor-not-allowed opacity-60',
                  )}
                >
                  {company.nome}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {open && filtered.length === 0 && companies !== null ? (
        <p className="mt-1.5 text-xs text-slate-500">Nenhuma empresa encontrada para esta busca.</p>
      ) : null}

      {error ? (
        <p id={errorId} className={fieldErrorStyles}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
