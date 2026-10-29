import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { createHash } from 'node:crypto';
import { z } from 'zod';

// O banco guarda apenas o hash SHA-256 do token; o firmware usa o valor em claro.
const hashToken = (token: string): string =>
  createHash('sha256').update(token, 'utf8').digest('hex');

const prisma = new PrismaClient();
const seedConfigSchema = z.object({
  SEED_ADMIN_EMAIL: z.string().email(),
  SEED_ADMIN_PASSWORD: z.string().min(24),
  SEED_GESTOR_PASSWORD: z.string().min(24),
  SEED_TECNICO_PASSWORD: z.string().min(24),
});

async function main(): Promise<void> {
  const parsedConfig = seedConfigSchema.safeParse(process.env);
  if (!parsedConfig.success) {
    throw new Error(
      'Configure SEED_ADMIN_EMAIL e senhas exclusivas de pelo menos 24 caracteres para ADMIN, GESTOR e TECNICO no .env.',
    );
  }

  const [adminPasswordHash, gestorPasswordHash, tecnicoPasswordHash] = await Promise.all([
    bcrypt.hash(parsedConfig.data.SEED_ADMIN_PASSWORD, 12),
    bcrypt.hash(parsedConfig.data.SEED_GESTOR_PASSWORD, 12),
    bcrypt.hash(parsedConfig.data.SEED_TECNICO_PASSWORD, 12),
  ]);

  const empresa = await prisma.empresa.upsert({
    where: { cnpj: '12.345.678/0001-90' },
    update: {},
    create: { nome: 'Aquaplás Indústria Ltda', cnpj: '12.345.678/0001-90' },
  });

  await prisma.usuario.upsert({
    where: { email: parsedConfig.data.SEED_ADMIN_EMAIL },
    update: { senha: adminPasswordHash },
    create: {
      nome: 'Administrador SIVA',
      email: parsedConfig.data.SEED_ADMIN_EMAIL,
      senha: adminPasswordHash,
      tipo: 'ADMIN',
      especialidade: null,
      status: 'ATIVO',
      empresaId: null,
    },
  });

  const gestor = await prisma.usuario.upsert({
    where: { email: 'carla.mendes@aquaplas.com' },
    update: { senha: gestorPasswordHash },
    create: {
      nome: 'Carla Mendes',
      email: 'carla.mendes@aquaplas.com',
      senha: gestorPasswordHash,
      tipo: 'GESTOR',
      especialidade: null,
      status: 'ATIVO',
      empresaId: empresa.id,
    },
  });
  void gestor;

  const tecnico = await prisma.usuario.upsert({
    where: { email: 'diego.ramos@aquaplas.com' },
    update: { senha: tecnicoPasswordHash },
    create: {
      nome: 'Diego Ramos',
      email: 'diego.ramos@aquaplas.com',
      senha: tecnicoPasswordHash,
      tipo: 'TECNICO',
      especialidade: 'MECANICO',
      status: 'ATIVO',
      empresaId: empresa.id,
    },
  });

  const setor = await prisma.setor.upsert({
    where: { id: 1 },
    update: {},
    create: { empresaId: empresa.id, nome: 'Produção' },
  });

  const esp32 = await prisma.esp32.upsert({
    where: { espId: 'esp_01' },
    update: {},
    create: {
      setorId: setor.id,
      espId: 'esp_01',
      tokenHash: hashToken('dev-token-esp01'),
      descricao: 'ESP32 de produção',
    },
  });

  const ativo = await prisma.ativo.upsert({
    where: { tag: 'AT-PRD-001' },
    update: {},
    create: { setorId: setor.id, nome: 'Tanque de ETA 01', tag: 'AT-PRD-001', criticidade: 'alta' },
  });

  const sensor = await prisma.sensor.upsert({
    where: { esp32Id_sensorId: { esp32Id: esp32.id, sensorId: 'sensor_01' } },
    update: {},
    create: { ativoId: ativo.id, esp32Id: esp32.id, sensorId: 'sensor_01', tag: 'SN-PRD-001' },
  });

  await prisma.manutencao.upsert({
    where: { id: 1 },
    update: {},
    create: {
      sensorId: sensor.id,
      tipo: 'preventiva',
      descricao: 'Calibração inicial do sensor.',
      funcionarioId: tecnico.id,
    },
  });

  console.log('Seed concluído.');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
