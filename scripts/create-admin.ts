// Cria um usuário ADMIN diretamente no banco, contornando a exigência do seed
// (senhas SEED_* de 24+ caracteres). Útil para credenciais de desenvolvimento.
//
// Uso: npx tsx scripts/create-admin.ts <email> <senha>
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const [email, senha] = process.argv.slice(2);

if (!email || !senha) {
  console.error('Uso: npx tsx scripts/create-admin.ts <email> <senha>');
  process.exit(1);
}

async function main(email: string, senha: string): Promise<void> {
  const passwordHash = await bcrypt.hash(senha, 12);

  // ADMIN pertence à SIVA (empresa dona do sistema). Cria a empresa caso o
  // banco ainda não tenha sido migrado/seedado.
  const siva = await prisma.empresa.upsert({
    where: { cnpj: '00.000.000/0001-00' },
    update: { nome: 'SIVA', tipo: 'SIVA' },
    create: { nome: 'SIVA', cnpj: '00.000.000/0001-00', tipo: 'SIVA' },
  });

  const user = await prisma.usuario.upsert({
    where: { email },
    update: {
      senha: passwordHash,
      tipo: 'ADMIN',
      especialidade: null,
      empresaId: siva.id,
    },
    create: {
      nome: 'Administrador SIVA',
      email,
      senha: passwordHash,
      tipo: 'ADMIN',
      especialidade: null,
      status: 'ATIVO',
      empresaId: siva.id,
    },
  });
  console.log(`OK: id=${user.id} email=${user.email} tipo=${user.tipo} status=${user.status}`);
}

main(email, senha)
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
