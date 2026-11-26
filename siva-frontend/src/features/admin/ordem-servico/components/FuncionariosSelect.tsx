import { useId, useMemo, useState } from 'react';

import { useAuth } from '../../../auth/hooks/use-auth';
import { useAsyncData } from '../../../../hooks/use-async-data';
import { userService } from '../../../../services/users/user.service';
import type { PublicUser } from '../../../../types/user';
import { cn } from '../../../../utils/cn';
import { fieldErrorStyles, fieldLabelStyles, fieldStyles } from '../../../../components/ui/form-styles';

interface FuncionariosSelectProps {
  label: string;
  /** ID do funcionário selecionado (string vazia = nenhum). */
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
  /** Mostra o asterisco vermelho como nos outros campos obrigatórios. */
  required?: boolean;
}

/** Select buscável pelo nome dos funcionários (TECNICO) disponíveis para execução. */
export function FuncionariosSelect({
  label,
  value,
  onChange,
  error,
  disabled,
  placeholder = 'Selecione o funcionário',
  required = false,
}: FuncionariosSelectProps) {
  const { token } = useAuth();
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const { data: funcionarios } = useAsyncData(
    () => {
      if (!token) return Promise.resolve(null);
      return userService.list(token, { pageSize: 100, tipo: 'TECNICO' });
    },
    token ?? '',
  );

  const funcionariosList = useMemo(() => funcionarios?.items ?? [], [funcionarios?.items]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return funcionariosList;
    return funcionariosList.filter((user) => user.nome.toLowerCase().includes(needle));
  }, [funcionariosList, query]);

  const selectedName = useMemo(
    () => funcionariosList.find((user: PublicUser) => String(user.id) === value)?.nome,
    [funcionariosList, value],
  );

  return (
    <div>
      <label htmlFor={inputId} className={fieldLabelStyles}>
        {label}
        {required ? <span className="ml-0.5 text-red-500">*</span> : null}
      </label>

      <input
        id={inputId}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        value={value !== '' ? (selectedName ?? String(value)) : query}
        placeholder={placeholder}
        disabled={disabled}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onChange={(event) => {
          setQuery(event.target.value);
          onChange('');
        }}
        className={fieldStyles(Boolean(error))}
      />

      {open && filtered.length > 0 ? (
        <ul
          role="listbox"
          className="mt-1 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-sm"
        >
          {filtered.map((user) => {
            const isSelected = String(user.id) === value;
            return (
              <li key={user.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  disabled={disabled}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onChange(String(user.id));
                    setQuery('');
                    setOpen(false);
                  }}
                  className={cn(
                    'w-full px-3.5 py-2 text-left text-sm transition-colors',
                    isSelected
                      ? 'bg-siva-50 font-semibold text-bright-teal-blue'
                      : 'text-slate-700 hover:bg-siva-50',
                    disabled && 'cursor-not-allowed opacity-60',
                  )}
                >
                  {user.nome}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {error ? (
        <p className={fieldErrorStyles}>{error}</p>
      ) : null}
    </div>
  );
}
