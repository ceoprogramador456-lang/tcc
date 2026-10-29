import bcrypt from 'bcryptjs';
import { hashDeviceToken } from '../../utils/device-token.js';
import { MockCollection } from './mock-collection.js';
import type { Company } from '../../modules/companies/entities/company.entity.js';
import type { User } from '../../modules/users/entities/user.entity.js';
import type { Sector } from '../../modules/sectors/entities/sector.entity.js';
import type { Asset } from '../../modules/assets/entities/asset.entity.js';
import type { Device } from '../../modules/devices/entities/device.entity.js';
import type { Sensor } from '../../modules/sensors/entities/sensor.entity.js';
import type { Reading } from '../../modules/readings/entities/reading.entity.js';
import type { Maintenance } from '../../modules/maintenances/entities/maintenance.entity.js';

const now = new Date();
const hoursAgo = (hours: number): Date => new Date(now.getTime() - hours * 60 * 60 * 1000);
const passwordHash = bcrypt.hashSync('senha123', 8);

export const companies = new MockCollection<Company>();
export const users = new MockCollection<User>();
export const sectors = new MockCollection<Sector>();
export const assets = new MockCollection<Asset>();
export const devices = new MockCollection<Device>();
export const sensors = new MockCollection<Sensor>();
export const readings = new MockCollection<Reading>();
export const maintenances = new MockCollection<Maintenance>();

function seed(): void {
  const aquaplas = companies.create({
    nome: 'Aquaplás Indústria Ltda',
    cnpj: '12.345.678/0001-90',
    criadoEm: hoursAgo(720),
  });
  const metaltec = companies.create({
    nome: 'Metaltec Componentes S.A.',
    cnpj: '98.765.432/0001-10',
    criadoEm: hoursAgo(480),
  });

  users.create({
    nome: 'Administrador SIVA',
    email: 'super@siva.com',
    senha: passwordHash,
    tipo: 'ADMIN',
    especialidade: null,
    status: 'ATIVO',
    empresaId: null,
    criadoEm: hoursAgo(720),
  });
  users.create({
    nome: 'Carla Mendes',
    email: 'carla.mendes@aquaplas.com',
    senha: passwordHash,
    tipo: 'GESTOR',
    especialidade: null,
    status: 'ATIVO',
    empresaId: aquaplas.id,
    criadoEm: hoursAgo(700),
  });
  users.create({
    nome: 'Diego Ramos',
    email: 'diego.ramos@aquaplas.com',
    senha: passwordHash,
    tipo: 'TECNICO',
    especialidade: 'MECANICO',
    status: 'ATIVO',
    empresaId: aquaplas.id,
    criadoEm: hoursAgo(650),
  });
  users.create({
    nome: 'Beatriz Nogueira',
    email: 'beatriz.nogueira@metaltec.com',
    senha: passwordHash,
    tipo: 'GESTOR',
    especialidade: null,
    status: 'ATIVO',
    empresaId: metaltec.id,
    criadoEm: hoursAgo(470),
  });

  const producao = sectors.create({
    empresaId: aquaplas.id,
    nome: 'Produção',
    criadoEm: hoursAgo(700),
  });
  const resfriamento = sectors.create({
    empresaId: aquaplas.id,
    nome: 'Resfriamento',
    criadoEm: hoursAgo(700),
  });
  const limpeza = sectors.create({
    empresaId: metaltec.id,
    nome: 'Limpeza Industrial',
    criadoEm: hoursAgo(460),
  });

  const tanqueEta = assets.create({
    setorId: producao.id,
    nome: 'Tanque de ETA 01',
    tag: 'AT-PRD-001',
    tipo: 'tanque',
    criticidade: 'alta',
    centroCusto: 'CC-100',
    fotoUrl: null,
    manualUrl: null,
    descricao: 'Tanque de armazenamento de água tratada da linha de produção.',
    criadoEm: hoursAgo(690),
  });
  const bombaResfriamento = assets.create({
    setorId: resfriamento.id,
    nome: 'Bomba de Resfriamento 01',
    tag: 'AT-RES-001',
    tipo: 'bomba',
    criticidade: 'media',
    centroCusto: 'CC-200',
    fotoUrl: null,
    manualUrl: null,
    descricao: 'Bomba responsável pela recirculação da água de resfriamento.',
    criadoEm: hoursAgo(690),
  });
  const linhaLimpeza = assets.create({
    setorId: limpeza.id,
    nome: 'Linha de Limpeza CIP',
    tag: 'AT-LMP-001',
    tipo: 'tubulacao',
    criticidade: 'baixa',
    centroCusto: 'CC-300',
    fotoUrl: null,
    manualUrl: null,
    descricao: 'Tubulação de limpeza clean-in-place.',
    criadoEm: hoursAgo(450),
  });

  const espProducao = devices.create({
    setorId: producao.id,
    espId: 'esp_01',
    tokenHash: hashDeviceToken('dev-token-esp01'),
    descricao: 'ESP32 fixado no quadro elétrico da produção.',
    ultimoContato: hoursAgo(0.1),
    criadoEm: hoursAgo(680),
  });
  const espResfriamento = devices.create({
    setorId: resfriamento.id,
    espId: 'esp_02',
    tokenHash: hashDeviceToken('dev-token-esp02'),
    descricao: 'ESP32 na casa de bombas do resfriamento.',
    ultimoContato: hoursAgo(0.5),
    criadoEm: hoursAgo(680),
  });
  const espLimpeza = devices.create({
    setorId: limpeza.id,
    espId: 'esp_03',
    tokenHash: hashDeviceToken('dev-token-esp03'),
    descricao: 'ESP32 na linha CIP.',
    ultimoContato: hoursAgo(2),
    criadoEm: hoursAgo(440),
  });

  const sensorProducao = sensors.create({
    ativoId: tanqueEta.id,
    esp32Id: espProducao.id,
    sensorId: 'sensor_01',
    tag: 'SN-PRD-001',
    descricao: 'YF-S201 na saída do tanque de ETA.',
    ativoStatus: true,
    criadoEm: hoursAgo(670),
  });
  const sensorResfriamento = sensors.create({
    ativoId: bombaResfriamento.id,
    esp32Id: espResfriamento.id,
    sensorId: 'sensor_01',
    tag: 'SN-RES-001',
    descricao: 'YF-S201 na saída da bomba de resfriamento.',
    ativoStatus: true,
    criadoEm: hoursAgo(670),
  });
  const sensorLimpeza = sensors.create({
    ativoId: linhaLimpeza.id,
    esp32Id: espLimpeza.id,
    sensorId: 'sensor_01',
    tag: 'SN-LMP-001',
    descricao: 'YF-S201 na linha CIP.',
    ativoStatus: false,
    criadoEm: hoursAgo(430),
  });

  const seedReadings = (sensorId: number, baseFlow: number): void => {
    for (let i = 24; i >= 0; i -= 1) {
      const jitter = Math.sin(i) * 0.4;
      readings.create({
        sensorId,
        vazao: Number((baseFlow + jitter).toFixed(2)),
        registradoEm: hoursAgo(i),
      });
    }
  };
  seedReadings(sensorProducao.id, 12.5);
  seedReadings(sensorResfriamento.id, 8.2);
  seedReadings(sensorLimpeza.id, 0);

  maintenances.create({
    sensorId: sensorProducao.id,
    tipo: 'preventiva',
    status: 'concluido',
    descricao: 'Calibração trimestral do sensor de vazão.',
    funcionarioId: 3,
    abertoEm: hoursAgo(200),
    concluidoEm: hoursAgo(198),
  });
  maintenances.create({
    sensorId: sensorLimpeza.id,
    tipo: 'corretiva',
    status: 'aberto',
    descricao: 'Sensor sem leituras — possível falha de conexão com o ESP32.',
    funcionarioId: null,
    abertoEm: hoursAgo(2),
    concluidoEm: null,
  });
}

seed();
