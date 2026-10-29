import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Boxes, Building, Cpu, Radio, RefreshCw, Users, Waypoints } from 'lucide-react';

import { AlertMessage } from '../../../components/ui/AlertMessage';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { LoadingBlock } from '../../../components/ui/LoadingBlock';
import { useAsyncData } from '../../../hooks/use-async-data';
import { catalogService } from '../../../services/catalog/catalog.service';
import { companyService } from '../../../services/companies/company.service';
import type { Device } from '../../../types/catalog';
import type { CompanyDetails } from '../../../types/company';
import { formatDate } from '../../../utils/format';
import { useAuthenticatedSession } from '../../auth/hooks/use-authenticated-session';
import { USER_TYPE_LABELS } from '../../auth/user-labels';
import { AdminTopbar } from '../layout/AdminTopbar';
import { useAdminLayout } from '../layout/admin-layout-context';

interface CompanyDetailData {
  details: CompanyDetails;
  devices: Device[];
}

export default function CompanyDetailPage() {
  const { openMenu } = useAdminLayout();
  const session = useAuthenticatedSession();
  const { id } = useParams<{ id: string }>();
  const companyId = Number(id);

  const { data, isLoading, error, reload } = useAsyncData<CompanyDetailData>(
    () => {
      if (!session) return Promise.reject(new Error('Sessão expirada.'));

      return (async () => {
        const details = await companyService.details(session.token, companyId);

        // O agregado `details` do back-end não devolve a lista de dispositivos;
        // eles são consultados por setor (endpoint existente e já usado pela API).
        const devicesPerSector = await Promise.all(
          details.setores.map((sector) =>
            catalogService
              .devices(session.token, { setorId: sector.id })
              .then((result) => result.items),
          ),
        );

        return { details, devices: devicesPerSector.flat() };
      })();
    },
    `${session?.token ?? ''}:${companyId}`,
  );

  if (!session) return null;

  const resumo = data?.details.resumo;

  return (
    <>
      <AdminTopbar
        title={data?.details.empresa.nome ?? 'Empresa'}
        description="Consulte setores e equipe ou abra o monitoramento desta empresa"
        onOpenMenu={openMenu}
        actions={
          <>
            {data ? (
              <>
                <Link
                  to={`/admin/usuarios?empresaId=${companyId}`}
                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Usuários da empresa
                </Link>
                <Link
                  to={`/painel?empresaId=${companyId}`}
                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Painel da empresa
                </Link>
              </>
            ) : null}
            <Button variant="outline" onClick={reload} disabled={isLoading}>
              <RefreshCw
                className={isLoading ? 'size-4 animate-spin' : 'size-4'}
                aria-hidden="true"
              />
              Atualizar
            </Button>
            <Link
              to="/admin/empresas"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Voltar
            </Link>
          </>
        }
      />

      <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {error ? (
          <AlertMessage tone="danger" title="Não foi possível carregar a empresa">
            {error}
          </AlertMessage>
        ) : null}

        {isLoading && !data ? (
          <LoadingBlock label="Carregando detalhes da empresa…" />
        ) : data ? (
          <>
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-12 items-center justify-center rounded-lg bg-siva-50 text-bright-teal-blue">
                    <Building className="size-6" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="font-display text-lg font-bold text-slate-900">
                      {data.details.empresa.nome}
                    </h2>
                    <p className="text-sm text-slate-500">
                      CNPJ {data.details.empresa.cnpj ?? 'não informado'} · criada em{' '}
                      {formatDate(data.details.empresa.criadoEm)}
                    </p>
                  </div>
                </div>
              </div>

              <dl className="mt-5 grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {[
                  { label: 'Funcionários', value: resumo?.funcionarios ?? 0, icon: Users },
                  { label: 'Setores', value: resumo?.setores ?? 0, icon: Boxes },
                  { label: 'Equipamentos', value: resumo?.ativos ?? 0, icon: Cpu },
                  { label: 'Dispositivos', value: resumo?.esp32 ?? 0, icon: Waypoints },
                  { label: 'Sensores', value: resumo?.sensores ?? 0, icon: Radio },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3"
                  >
                    <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <item.icon className="size-3.5" aria-hidden="true" />
                      {item.label}
                    </dt>
                    <dd className="mt-1 font-display text-2xl font-extrabold text-slate-900">
                      {item.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <header className="border-b border-slate-200 px-5 py-4">
                  <h2 className="font-display text-base font-bold text-slate-900">Setores</h2>
                </header>

                {data.details.setores.length === 0 ? (
                  <EmptyState title="Nenhum setor cadastrado" />
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {data.details.setores.map((sector) => {
                      const sectorDevices = data.devices.filter((d) => d.setorId === sector.id);
                      return (
                        <li
                          key={sector.id}
                          className="flex items-center justify-between gap-3 px-5 py-3"
                        >
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{sector.nome}</p>
                            <p className="text-xs text-slate-500">
                              {sectorDevices.length} dispositivo(s) ESP32 · criado em{' '}
                              {formatDate(sector.criadoEm)}
                            </p>
                          </div>
                          <Badge tone="brand">{sectorDevices.length} ESP32</Badge>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <header className="border-b border-slate-200 px-5 py-4">
                  <h2 className="font-display text-base font-bold text-slate-900">Funcionários</h2>
                </header>

                {data.details.funcionarios.length === 0 ? (
                  <EmptyState title="Nenhum funcionário vinculado" />
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {data.details.funcionarios.map((funcionario) => (
                      <li
                        key={funcionario.id}
                        className="flex items-center justify-between gap-3 px-5 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800">
                            {funcionario.nome}
                          </p>
                          <p className="truncate text-xs text-slate-500">{funcionario.email}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Badge tone="info">{USER_TYPE_LABELS[funcionario.tipo]}</Badge>
                          <Badge tone={funcionario.status === 'ATIVO' ? 'success' : 'warning'}>
                            {funcionario.status === 'ATIVO' ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}
