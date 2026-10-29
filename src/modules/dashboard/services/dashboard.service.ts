import { ForbiddenError } from '../../../shared/errors/app-error.js';
import { assertSameCompany, isAdmin } from '../../../shared/auth/scope.js';
import type { AuthenticatedUser } from '../../../types/express.js';
import { createCompanyRepository } from '../../companies/repositories/company.repository.js';
import { createUserRepository } from '../../users/repositories/user.repository.js';
import { createDeviceRepository } from '../../devices/repositories/device.repository.js';
import { createSensorRepository } from '../../sensors/repositories/sensor.repository.js';
import { createReadingRepository } from '../../readings/repositories/reading.repository.js';
import { createMaintenanceRepository } from '../../maintenances/repositories/maintenance.repository.js';
import { createSectorRepository } from '../../sectors/repositories/sector.repository.js';
import { createAssetRepository } from '../../assets/repositories/asset.repository.js';
import { isDeviceOnline } from '../../devices/entities/device.entity.js';
import type { DashboardAtividade, DashboardOverview } from '../dtos/dashboard.dtos.js';

const JANELA_CONSUMO_HORAS = 24;
const LIMITE_LEITURAS = 20000;
const LIMITE_ATIVIDADES = 12;

export const dashboardService = {
  async adminSummary(actor: AuthenticatedUser) {
    if (!isAdmin(actor)) {
      throw new ForbiddenError('Somente ADMIN pode acessar o dashboard administrativo.');
    }

    const [companies, users, devices, sensors] = await Promise.all([
      createCompanyRepository().list({ page: 1, pageSize: 1 }),
      createUserRepository().list({ page: 1, pageSize: 1 }),
      createDeviceRepository().list({ page: 1, pageSize: 1 }),
      createSensorRepository().list({ page: 1, pageSize: 1 }),
    ]);

    const [{ total: gestores }, { total: tecnicos }, { total: ativos }, { total: inativos }] =
      await Promise.all([
        createUserRepository().list({ page: 1, pageSize: 1, filter: { tipo: 'GESTOR' } }),
        createUserRepository().list({ page: 1, pageSize: 1, filter: { tipo: 'TECNICO' } }),
        createUserRepository().list({ page: 1, pageSize: 1, filter: { status: 'ATIVO' } }),
        createUserRepository().list({ page: 1, pageSize: 1, filter: { status: 'INATIVO' } }),
      ]);

    const [{ total: mecanicos }, { total: eletricistas }] = await Promise.all([
      createUserRepository().list({ page: 1, pageSize: 1, filter: { especialidade: 'MECANICO' } }),
      createUserRepository().list({
        page: 1,
        pageSize: 1,
        filter: { especialidade: 'ELETRICISTA' },
      }),
    ]);

    return {
      nEmpresas: companies.total,
      nFuncionarios: users.total,
      nSensores: sensors.total,
      nEsp32: devices.total,
      funcionarios: {
        total: users.total,
        gestores,
        tecnicos,
        mecanicos,
        eletricistas,
        ativos,
        inativos,
      },
    };
  },

  /**
   * Painel operacional: indicadores e atividades derivados dos dados reais.
   *
   * Escopo: a empresa do usuário autenticado. ADMIN pode consultar o painel
   * de uma empresa específica via `?empresaId=`; sem filtro, ADMIN vê o
   * consolidado de todas as empresas.
   */
  async overview(actor: AuthenticatedUser, empresaId?: number): Promise<DashboardOverview> {
    const agora = new Date();
    const inicio = new Date(agora.getTime() - JANELA_CONSUMO_HORAS * 60 * 60 * 1000);

    const escopoEmpresaId = isAdmin(actor) ? (empresaId ?? null) : (actor.empresaId ?? -1);
    if (!isAdmin(actor) && empresaId !== undefined) {
      assertSameCompany(actor, empresaId);
    }

    const sensorRepository = createSensorRepository();
    const setorRepository = createSectorRepository();
    const assetRepository = createAssetRepository();
    const deviceRepository = createDeviceRepository();
    const readingRepository = createReadingRepository();
    const maintenanceRepository = createMaintenanceRepository();

    // --- sensores do escopo -------------------------------------------------
    const sensorIds = await this.listSensorIdsDoEscopo(
      sensorRepository,
      setorRepository,
      assetRepository,
      escopoEmpresaId,
    );

    const { items: sensores } = await sensorRepository.list({
      page: 1,
      pageSize: 10000,
      filter: sensorIds.length > 0 ? { id: { in: sensorIds } } : { id: { in: [] } },
    });
    const sensoresAtivos = sensores.filter((sensor) => sensor.ativoStatus);

    // --- leituras do período -------------------------------------------------
    const leituras = await readingRepository.listBySensorsSince(
      sensoresAtivos.map((sensor) => sensor.id),
      inicio,
      LIMITE_LEITURAS,
    );

    const porSensor = new Map<number, typeof leituras>();
    for (const leitura of leituras) {
      const lista = porSensor.get(leitura.sensorId) ?? [];
      lista.push(leitura);
      porSensor.set(leitura.sensorId, lista);
    }

    const sensoresComLeitura = porSensor.size;
    let consumoAtual = 0;
    let consumoDiario = 0;
    let atualizadoEm: Date | null = null;

    for (const lista of porSensor.values()) {
      // `listBySensorsSince` devolve do mais novo para o mais antigo.
      const maisRecente = lista[0];
      if (!maisRecente) continue;
      consumoAtual += maisRecente.vazao;
      if (!atualizadoEm || maisRecente.registradoEm > atualizadoEm) {
        atualizadoEm = maisRecente.registradoEm;
      }

      // Integração trapezoidal simplificada: cada leitura vale até a próxima.
      for (let i = 0; i < lista.length - 1; i += 1) {
        const atual = lista[i];
        const anterior = lista[i + 1];
        if (!atual || !anterior) continue;
        const minutos = (atual.registradoEm.getTime() - anterior.registradoEm.getTime()) / 60000;
        consumoDiario += ((atual.vazao + anterior.vazao) / 2) * minutos;
      }
    }

    // --- manutenções --------------------------------------------------------
    const { items: manutencoes } = await maintenanceRepository.list({
      page: 1,
      pageSize: 10000,
      filter: {
        sensorId: { in: sensorIds },
        status: { in: ['aberto', 'em_andamento'] },
      },
    });
    const { total: totalManutencoes } = await maintenanceRepository.list({
      page: 1,
      pageSize: 1,
      filter: { sensorId: { in: sensorIds } },
    });

    // --- dispositivos --------------------------------------------------------
    const setorIds = await this.listSetorIdsDoEscopo(setorRepository, escopoEmpresaId);
    const { items: dispositivos } = await deviceRepository.list({
      page: 1,
      pageSize: 10000,
      filter: setorIds.length > 0 ? { setorId: { in: setorIds } } : { setorId: { in: [] } },
    });
    const dispositivosOnline = dispositivos.filter((device) => isDeviceOnline(device, agora));

    // --- atividades ----------------------------------------------------------
    const atividades = await this.listAtividades({
      sensores,
      leituras,
      manutencoes,
      dispositivos,
      agora,
    });

    return {
      periodo: { inicio: inicio.toISOString(), fim: agora.toISOString() },
      consumoAtual: sensoresComLeitura
        ? {
            valor: Number(consumoAtual.toFixed(2)),
            unidade: 'L/min',
            atualizadoEm: atualizadoEm ? atualizadoEm.toISOString() : null,
          }
        : null,
      consumoDiario: sensoresComLeitura
        ? { valor: Number(consumoDiario.toFixed(2)), unidade: 'L', atualizadoEm: null }
        : null,
      sensores: {
        ativos: sensoresAtivos.length,
        total: sensores.length,
        semLeituraNoPeriodo: sensoresAtivos.length - sensoresComLeitura,
      },
      alertas: { disponivel: false, total: null },
      manutencoes: {
        pendentes: manutencoes.length,
        total: totalManutencoes,
      },
      esp32: {
        online: dispositivosOnline.length,
        total: dispositivos.length,
      },
      atividades,
    };
  },

  async listSensorIdsDoEscopo(
    sensorRepository: ReturnType<typeof createSensorRepository>,
    setorRepository: ReturnType<typeof createSectorRepository>,
    assetRepository: ReturnType<typeof createAssetRepository>,
    empresaId: number | null,
  ): Promise<number[]> {
    if (empresaId === null) {
      const { items } = await sensorRepository.list({ page: 1, pageSize: 10000 });
      return items.map((sensor) => sensor.id);
    }

    const { items: setores } = await setorRepository.list({
      page: 1,
      pageSize: 10000,
      filter: { empresaId },
    });
    if (setores.length === 0) return [];

    const { items: ativos } = await assetRepository.list({
      page: 1,
      pageSize: 10000,
      filter: { setorId: { in: setores.map((setor) => setor.id) } },
    });
    if (ativos.length === 0) return [];

    const { items: sensores } = await sensorRepository.list({
      page: 1,
      pageSize: 10000,
      filter: { ativoId: { in: ativos.map((ativo) => ativo.id) } },
    });
    return sensores.map((sensor) => sensor.id);
  },

  async listSetorIdsDoEscopo(
    setorRepository: ReturnType<typeof createSectorRepository>,
    empresaId: number | null,
  ): Promise<number[]> {
    if (empresaId === null) {
      const { items } = await setorRepository.list({ page: 1, pageSize: 10000 });
      return items.map((setor) => setor.id);
    }
    const { items } = await setorRepository.list({
      page: 1,
      pageSize: 10000,
      filter: { empresaId },
    });
    return items.map((setor) => setor.id);
  },

  /**
   * Feed de atividades montado a partir de eventos realmente registrados:
   * leituras recebidas, manutenções abertas e dispositivos que reportaram.
   */
  async listAtividades(input: {
    sensores: Array<{ id: number; tag: string | null; sensorId: string }>;
    leituras: Array<{ id: number; sensorId: number; vazao: number; registradoEm: Date }>;
    manutencoes: Array<{
      id: number;
      sensorId: number;
      tipo: string;
      status: string;
      abertoEm: Date;
    }>;
    dispositivos: Array<{ id: number; espId: string; ultimoContato: Date | null }>;
    agora: Date;
  }): Promise<DashboardAtividade[]> {
    const sensorPorId = new Map(input.sensores.map((sensor) => [sensor.id, sensor]));
    const atividades: DashboardAtividade[] = [];

    for (const leitura of input.leituras.slice(0, LIMITE_ATIVIDADES)) {
      const sensor = sensorPorId.get(leitura.sensorId);
      atividades.push({
        id: `leitura-${leitura.id}`,
        tipo: 'leitura',
        titulo: 'Leitura de vazão registrada',
        descricao: sensor
          ? `${sensor.tag ?? sensor.sensorId} reportou ${leitura.vazao} L/min`
          : `Sensor #${leitura.sensorId} reportou ${leitura.vazao} L/min`,
        occurredAt: leitura.registradoEm.toISOString(),
      });
    }

    for (const manutencao of input.manutencoes.slice(0, LIMITE_ATIVIDADES)) {
      const sensor = sensorPorId.get(manutencao.sensorId);
      atividades.push({
        id: `manutencao-${manutencao.id}`,
        tipo: 'manutencao',
        titulo: `Manutenção ${manutencao.tipo.replace('_', ' ')}`,
        descricao: sensor
          ? `${sensor.tag ?? sensor.sensorId} · status ${manutencao.status}`
          : `Sensor #${manutencao.sensorId} · status ${manutencao.status}`,
        occurredAt: manutencao.abertoEm.toISOString(),
      });
    }

    for (const dispositivo of input.dispositivos) {
      if (!dispositivo.ultimoContato) continue;
      atividades.push({
        id: `dispositivo-${dispositivo.id}-${dispositivo.ultimoContato.getTime()}`,
        tipo: 'dispositivo',
        titulo: 'Dispositivo reportou status',
        descricao: `${dispositivo.espId} enviou uma leitura`,
        occurredAt: dispositivo.ultimoContato.toISOString(),
      });
    }

    return atividades
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
      .slice(0, LIMITE_ATIVIDADES);
  },
};
