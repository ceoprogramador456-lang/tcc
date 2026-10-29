import { Activity, Bell, Radio, RefreshCw, Wrench } from 'lucide-react';
import { Link } from 'react-router-dom';

import { AlertMessage } from '../../../components/ui/AlertMessage';
import { Button } from '../../../components/ui/Button';
import { LoadingBlock } from '../../../components/ui/LoadingBlock';
import { useAsyncData } from '../../../hooks/use-async-data';
import { dashboardService } from '../../../services/dashboard/dashboard.service';
import { formatDateTime } from '../../../utils/format';
import { useAuthenticatedSession } from '../../auth/hooks/use-authenticated-session';
import { PanelTopbar } from '../layout/PanelTopbar';
import { usePanelLayout } from '../layout/panel-layout-context';
import { usePanelScope } from '../hooks/use-panel-scope';
import { ActivityFeed } from './components/ActivityFeed';
import { MetricCard } from './components/MetricCard';

export default function PanelDashboardPage() {
  const { openMenu } = usePanelLayout();
  const session = useAuthenticatedSession();
  const { empresaId } = usePanelScope();

  const { data, isLoading, error, reload } = useAsyncData(
    () => {
      if (!session) return Promise.reject(new Error('Sessão expirada.'));
      return dashboardService.overview(session.token, empresaId);
    },
    `${session?.token ?? ''}:${empresaId ?? 'todas'}`,
  );

  if (!session) return null;

  return (
    <>
      <PanelTopbar
        title="Visão geral"
        description="Acompanhe o consumo de água e identifique pontos sem leitura recente"
        onOpenMenu={openMenu}
        showScopeSelector
        actions={
          <Button variant="outline" onClick={reload} disabled={isLoading}>
            <RefreshCw
              className={isLoading ? 'size-4 animate-spin' : 'size-4'}
              aria-hidden="true"
            />
            Atualizar
          </Button>
        }
      />

      <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {error ? (
          <AlertMessage tone="danger" title="Não foi possível carregar o painel">
            {error}
          </AlertMessage>
        ) : null}

        {isLoading && !data ? (
          <LoadingBlock label="Carregando indicadores…" />
        ) : data ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Monitoramento da operação
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  Últimas 24 horas · atualizado em {formatDateTime(data.periodo.fim)}
                </p>
              </div>
              <Link
                to={`/painel/setores${empresaId ? `?empresaId=${empresaId}` : ''}`}
                className="rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-800"
              >
                Consultar setores
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Vazão atual"
                value={data.consumoAtual?.valor ?? null}
                unit={data.consumoAtual?.unidade}
                icon={Activity}
                tone="brand"
                emptyMessage="Sem leituras no período"
                hint={
                  data.consumoAtual?.atualizadoEm
                    ? `Última leitura ${formatDateTime(data.consumoAtual.atualizadoEm)}`
                    : 'Somando a vazão dos sensores ativos'
                }
              />

              <MetricCard
                label="Volume nas últimas 24 h"
                value={data.consumoDiario?.valor ?? null}
                unit={data.consumoDiario?.unidade}
                icon={Activity}
                emptyMessage="Sem leituras no período"
                hint="Volume integrado nas últimas 24 h"
              />

              <MetricCard
                label="Sensores habilitados"
                value={data.sensores.ativos}
                icon={Radio}
                hint={`${data.sensores.total} sensor(es) cadastrados`}
              />

              {data.alertas.disponivel ? (
                <MetricCard
                  label="Alertas"
                  value={data.alertas.disponivel ? data.alertas.total : null}
                  icon={Bell}
                  emptyMessage="Detecção não disponível"
                  hint="Ocorrências identificadas no monitoramento"
                />
              ) : null}

              <MetricCard
                label="Manutenções Pendentes"
                value={data.manutencoes.pendentes}
                icon={Wrench}
                hint={`${data.manutencoes.total} manutenção(ões) registrada(s)`}
              />
            </div>

            {data.sensores.semLeituraNoPeriodo > 0 ? (
              <AlertMessage tone="warning" title="Sensores sem leitura recente">
                {data.sensores.semLeituraNoPeriodo} sensor(es) ativo(s) não reportaram leitura nas
                últimas 24 h e não entram no cálculo de consumo.
              </AlertMessage>
            ) : null}
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="font-display text-lg font-bold text-slate-900">Pontos de atenção</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Link
                  to={`/painel/sensores${empresaId ? `?empresaId=${empresaId}` : ''}`}
                  className="rounded-lg border border-slate-200 p-4 transition hover:border-sky-500 hover:bg-sky-50"
                >
                  <span className="block text-sm font-semibold text-slate-900">
                    {data.sensores.semLeituraNoPeriodo} sensores habilitados sem leitura em 24 h
                  </span>
                  <span className="mt-1 block text-sm text-slate-600">
                    Consulte os pontos de medição e seus vínculos →
                  </span>
                </Link>
                <Link
                  to={`/painel/esp32${empresaId ? `?empresaId=${empresaId}` : ''}`}
                  className="rounded-lg border border-slate-200 p-4 transition hover:border-sky-500 hover:bg-sky-50"
                >
                  <span className="block text-sm font-semibold text-slate-900">
                    {Math.max(0, data.esp32.total - data.esp32.online)} dispositivos sem leitura nos
                    últimos 10 min
                  </span>
                  <span className="mt-1 block text-sm text-slate-600">
                    Consulte os aparelhos e verifique a comunicação →
                  </span>
                </Link>
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <ActivityFeed atividades={data.atividades} />
              </div>

              <div className="space-y-6">
                <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="font-display text-base font-bold text-slate-900">
                    Comunicação dos dispositivos
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {data.esp32.online} de {data.esp32.total} dispositivo(s) reportaram leitura nos
                    últimos 10 minutos.
                  </p>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-dodger-blue transition-[width] duration-500"
                      style={{
                        width: `${
                          data.esp32.total > 0
                            ? Math.round((data.esp32.online / data.esp32.total) * 100)
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </section>

                <section className="rounded-xl border border-slate-200 bg-siva-900 p-5 shadow-sm">
                  <h2 className="font-display text-base font-bold text-white">Período analisado</h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">
                    Os indicadores cobrem as leituras entre{' '}
                    <span className="text-white">{formatDateTime(data.periodo.inicio)}</span> e{' '}
                    <span className="text-white">{formatDateTime(data.periodo.fim)}</span>.
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">
                    Vazão (L/min) indica o ritmo do fluxo. Volume (L) indica a quantidade de água
                    consumida no período. Sem leitura não significa consumo zero.
                  </p>
                </section>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}
