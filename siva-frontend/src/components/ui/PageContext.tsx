import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, ChevronRight, Info } from 'lucide-react';
import { useAuth } from '../../features/auth/hooks/use-auth';
import { USER_TYPE_LABELS } from '../../features/auth/user-labels';

interface PageHelp {
  purpose: string;
  steps: string;
  next: string;
  to: string;
}
const HELP: Record<string, PageHelp> = {
  '/admin': {
    purpose: 'Administre a plataforma',
    steps:
      'Comece pela empresa cliente. Abra seus detalhes para consultar a equipe e acompanhar a operação.',
    next: 'Consultar empresas',
    to: '/admin/empresas',
  },
  '/admin/empresas': {
    purpose: 'Encontre a empresa que deseja administrar',
    steps:
      'Cadastre uma empresa ou abra seus detalhes. Dentro dela, você encontra a equipe e o acesso ao monitoramento.',
    next: 'Gerenciar acessos',
    to: '/admin/usuarios',
  },
  '/admin/usuarios': {
    purpose: 'Controle quem tem acesso ao SIVA',
    steps:
      'Filtre por empresa ou perfil. Cadastre contas, edite os dados e use Ativar ou Inativar para controlar o acesso.',
    next: 'Consultar empresas',
    to: '/admin/empresas',
  },
  '/painel': {
    purpose: 'Entenda a situação da operação',
    steps:
      'Confira o volume consumido e a última leitura. Consulte os sensores e dispositivos para investigar pontos sem comunicação recente.',
    next: 'Consultar sensores',
    to: '/painel/sensores',
  },
  '/painel/setores': {
    purpose: 'Organize os locais monitorados',
    steps:
      'Um setor representa uma área, como Produção ou Resfriamento. Consulte os equipamentos vinculados antes de alterar o cadastro.',
    next: 'Consultar equipamentos',
    to: '/painel/ativos',
  },
  '/painel/ativos': {
    purpose: 'Identifique o que está sendo monitorado',
    steps:
      'Equipamento é a máquina ou o ponto de consumo, como uma bomba ou linha de resfriamento. Cada equipamento pertence a um setor.',
    next: 'Consultar sensores',
    to: '/painel/sensores',
  },
  '/painel/esp32': {
    purpose: 'Acompanhe os aparelhos que transmitem dados',
    steps:
      'O dispositivo, como um ESP32, envia as leituras dos sensores. Ele é diferente do equipamento monitorado. A chave de conexão aparece ao cadastrar um dispositivo.',
    next: 'Consultar sensores',
    to: '/painel/sensores',
  },
  '/painel/sensores': {
    purpose: 'Consulte os pontos de medição de água',
    steps:
      'O sensor mede a vazão e conecta um equipamento a um dispositivo do mesmo setor. Sensor habilitado e comunicação recente são situações diferentes.',
    next: 'Consultar dispositivos',
    to: '/painel/esp32',
  },
  '/painel/usuarios': {
    purpose: 'Conheça os acessos da sua equipe',
    steps:
      'Consulte perfil e status de cada conta. Solicite ao administrador o cadastro de pessoas e as alterações de acesso.',
    next: 'Voltar à visão geral',
    to: '/painel',
  },
};

export function PageContext({ title }: { title: string }) {
  const { pathname, search } = useLocation();
  const { user } = useAuth();
  const admin = pathname.startsWith('/admin');
  const detail = pathname.startsWith('/admin/empresas/');
  const help = HELP[pathname];
  const params = new URLSearchParams(search);
  const scope = params.get('empresaId');
  const next =
    help?.to.startsWith('/painel') && scope
      ? `${help.to}?empresaId=${encodeURIComponent(scope)}`
      : help?.to;
  return (
    <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <nav
          aria-label="Localização"
          className="flex min-w-0 flex-wrap items-center gap-1.5 text-slate-600"
        >
          <Link
            to={
              admin ? '/admin' : `/painel${scope ? `?empresaId=${encodeURIComponent(scope)}` : ''}`
            }
            className="font-medium hover:text-sky-700"
          >
            {admin ? 'Administração' : 'Monitoramento'}
          </Link>
          <ChevronRight className="size-3" aria-hidden="true" />
          {detail ? (
            <>
              <Link to="/admin/empresas" className="hover:text-sky-700">
                Empresas
              </Link>
              <ChevronRight className="size-3" aria-hidden="true" />
            </>
          ) : null}
          <span aria-current="page" className="font-semibold text-slate-800">
            {title}
          </span>
        </nav>
        {user ? (
          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-600">
            {USER_TYPE_LABELS[user.tipo]} ·{' '}
            {admin
              ? 'Gestão da plataforma'
              : user.tipo === 'TECNICO'
                ? 'Consulta da operação'
                : 'Gestão da operação'}
          </span>
        ) : null}
      </div>
      {help ? (
        <details className="mt-2 text-sm text-slate-600">
          <summary className="flex w-fit cursor-pointer items-center gap-2 rounded py-1 font-medium text-slate-700">
            <Info className="size-4 text-sky-600" aria-hidden="true" />
            Como usar esta tela
          </summary>
          <div className="mt-2 max-w-3xl space-y-2 rounded-xl border border-slate-200 bg-white p-4 leading-relaxed">
            <p className="font-semibold text-slate-900">{help.purpose}</p>
            <p>{help.steps}</p>
            {!admin && user?.tipo === 'TECNICO' ? (
              <p>
                Seu perfil permite consultar os dados. Peça ao gestor as alterações de cadastro.
              </p>
            ) : null}
            {next ? (
              <Link to={next} className="inline-flex items-center gap-2 font-semibold text-sky-700">
                {help.next}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            ) : null}
          </div>
        </details>
      ) : null}
    </div>
  );
}
