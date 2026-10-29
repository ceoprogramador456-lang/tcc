import { Link } from 'react-router-dom';
import { CircleCheck, LogOut } from 'lucide-react';

import { buttonStyles } from '../../../components/ui/button-styles';
import type { PublicUser } from '../../../types/auth';
import { ESPECIALIDADE_LABELS, USER_TYPE_LABELS } from '../user-labels';

interface AuthenticatedPanelProps {
  user: PublicUser;
  onSignOut: () => void;
}

function describeRole(user: PublicUser): string {
  if (user.tipo === 'TECNICO' && user.especialidade) {
    return `${USER_TYPE_LABELS[user.tipo]} · ${ESPECIALIDADE_LABELS[user.especialidade]}`;
  }
  return USER_TYPE_LABELS[user.tipo];
}

function describeCompany(user: PublicUser): string {
  if (user.empresaId === null) {
    return 'Acesso global (todas as empresas)';
  }
  return `Empresa vinculada (ID ${user.empresaId})`;
}

/**
 * Estado pós-autenticação.
 *
 * Ainda não existe painel no front-end; em vez de redirecionar para uma rota
 * inexistente, a própria tela confirma a sessão e explicita o próximo passo.
 */
export function AuthenticatedPanel({ user, onSignOut }: AuthenticatedPanelProps) {
  return (
    <div className="text-center">
      <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-cool-sky/15 text-cool-sky">
        <CircleCheck className="size-8" aria-hidden="true" />
      </span>

      <h1 className="mt-5 text-2xl font-bold text-white">Sessão iniciada</h1>
      <p className="mt-2 text-sm text-slate-300">
        Bem-vindo, <span className="font-semibold text-white">{user.nome}</span>.
      </p>

      <dl className="mt-6 space-y-3 rounded-xl border border-white/10 bg-siva-950/40 px-4 py-4 text-left text-sm">
        <div className="flex items-start justify-between gap-4">
          <dt className="text-slate-400">E-mail</dt>
          <dd className="text-right font-medium text-white">{user.email}</dd>
        </div>
        <div className="flex items-start justify-between gap-4">
          <dt className="text-slate-400">Perfil</dt>
          <dd className="text-right font-medium text-white">{describeRole(user)}</dd>
        </div>
        <div className="flex items-start justify-between gap-4">
          <dt className="text-slate-400">Empresa</dt>
          <dd className="text-right font-medium text-white">{describeCompany(user)}</dd>
        </div>
      </dl>

      <p className="mt-5 text-sm leading-relaxed text-slate-400">
        {user.tipo === 'ADMIN'
          ? 'O painel do SIVA está em construção. Em breve, sensores, leituras de vazão e manutenção estarão disponíveis nesta mesma tela.'
          : 'A área administrativa do SIVA é exclusiva para o perfil Administrador. O restante do painel para o seu perfil está em construção.'}
      </p>

      <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link to="/" className={buttonStyles('secondary', 'md')}>
          Voltar à página inicial
        </Link>

        <button type="button" onClick={onSignOut} className={buttonStyles('ghost', 'md')}>
          <LogOut className="size-4" aria-hidden="true" />
          Sair
        </button>
      </div>
    </div>
  );
}
