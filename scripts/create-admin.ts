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

async function main(): Promise<void> {
  const user = await prisma.usuario.upsert({
    where: { email },
    update: { senha: bcrypt.hashSync(senha, 12) },
    create: {
      nome: 'Administrador ETEC',
      email,
      senha: bcrypt.hashSync(senha, 12),
      tipo: 'ADMIN',
      especialidade: null,
      status: 'ATIVO',
      empresaId: null,
    },
  });
  console.log(`OK: id=${user.id} email=${user.email} tipo=${user.tipo} status=${user.status}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
