# 0002 — MySQL + Prisma como camada de persistência

**Status**: aceito

## Contexto

O banco de dados (`db/db.sql`) já existia antes da arquitetura do backend ser construída — é um MySQL "de mão", com a hierarquia Empresa→Setor→Ativo/ESP32→Sensor→Leitura/Manutenção já modelada, ENUMs nativos, índices e constraints de unicidade pensados desde o início (ver [DATABASE.md](../DATABASE.md)). A decisão aqui não foi "qual banco", já dada — foi **como o backend fala com ele**.

## Decisão

MySQL como banco relacional (mantendo `db/db.sql` como referência), acessado via [Prisma](https://www.prisma.io/) como ORM/query builder, com o schema em [`prisma/schema.prisma`](../../prisma/schema.prisma) espelhando manualmente o DDL — os dois arquivos descrevem a mesma estrutura, hoje sem um gerar o outro automaticamente.

## Alternativas consideradas

- **SQL cru / query builder leve (ex.: Knex)**: mais controle, mas exigiria escrever manualmente a tipagem de cada linha retornada — o Prisma já gera isso a partir do schema, e o domínio tem FKs e enums o bastante para esse ganho compensar a curva de aprendizado do Prisma.
- **ORM alternativo (TypeORM, Sequelize)**: descartado por preferência de DX (o Prisma Client gerado é fortemente tipado ponta a ponta, incluindo os enums do MySQL) e pela documentação/comunidade mais ativa no momento da escolha.
- **Prisma como única fonte de verdade** (gerar `db.sql` a partir do `schema.prisma`, ou vice-versa via introspecção): não adotado ainda — o `db.sql` nasceu antes do Prisma entrar no projeto, então por ora os dois são mantidos manualmente em sincronia (ver processo em [DEVELOPMENT.md](../DEVELOPMENT.md#como-criar-uma-migration)). Migrar de vez para `prisma migrate` como fonte única é um passo natural, ainda não dado.

## Consequências

- ✅ Tipagem ponta a ponta: o retorno de `prisma.setor.findMany(...)` já é `Setor[]` tipado, incluindo os enums (`Criticidade`, `TipoUsuario`, etc.).
- ✅ `prisma generate` funciona sem precisar de conexão real com o banco — importante para o [modo mock](./0005-mock-mode-api-fake.md), onde `PrismaClient` nem chega a ser instanciado.
- ⚠️ **Duplicidade a manter**: qualquer mudança de schema precisa ser feita nos dois arquivos (`db.sql` e `schema.prisma`) — esquecer um deles gera drift silencioso. Documentado como processo obrigatório, não automatizado.
- ⚠️ `prisma/migrations/` ainda não existe neste repositório — a primeira migração real só será criada na primeira vez que alguém rodar `npm run prisma:migrate` contra um banco de verdade.
