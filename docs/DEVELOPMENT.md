# Guia de Desenvolvimento

## Setup local

Veja [pré-requisitos e instalação no README raiz](../README.md#-pré-requisitos). Resumo: Node 22+, `npm install`, `npm run dev:mock` pra começar sem precisar de MySQL.

## Convenções de código

- **TypeScript estrito**: `strict: true` + `noUncheckedIndexedAccess` + `noImplicitOverride` (ver [`tsconfig.json`](../tsconfig.json)). Evite `any` — o ESLint já avisa (`@typescript-eslint/no-explicit-any: warn`).
- **ESM puro**: `"type": "module"` no `package.json`, imports sempre com extensão `.js` (mesmo apontando para um arquivo `.ts` — é assim que o `moduleResolution: NodeNext` espera).
- **Import de tipo explícito**: `import type { X } from '...'` para tipos, `import { x } from '...'` para valores (`@typescript-eslint/consistent-type-imports: warn`).
- **Sem comentário óbvio**: comentário só quando explica um "porquê" não óbvio (uma regra de negócio, uma decisão de segurança, uma pegadinha) — não para descrever o que o código já deixa claro pelo nome.
- Rode antes de abrir PR: `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test` (o mesmo que o CI roda — ver [DEPLOYMENT.md](./DEPLOYMENT.md#cicd)). O hook de pre-commit (Husky + lint-staged) já roda ESLint/Prettier automaticamente nos arquivos staged.

## Como criar um módulo novo

Cada recurso de domínio vira uma pasta em `src/modules/<nome-do-recurso>/`, seguindo exatamente o padrão de um módulo existente — copie a estrutura de `src/modules/sectors/` como referência, é o mais simples dos módulos "reais" (não-stub). Ordem sugerida para escrever os arquivos:

1. **`entities/<recurso>.entity.ts`** — a interface TypeScript do formato de domínio (o que a API expõe), com os mesmos nomes de campo (camelCase) que o Prisma vai gerar a partir do `@map` no schema.
2. **`validators/<recurso>.validators.ts`** — schemas Zod: `create<Recurso>Schema`, `update<Recurso>Schema` (geralmente `.partial()` do de criação, removendo campos imutáveis com `.omit()`), `<recurso>IdParamSchema`, `list<Recurso>sQuerySchema`.
3. **`dtos/<recurso>.dtos.ts`** — só `z.infer<typeof ...>` dos schemas acima. Não escreva o tipo à mão; sempre infira do Zod.
4. **`repositories/<recurso>.repository.ts`** — implemente `CrudRepository<Entity, CreateDTO, UpdateDTO>` duas vezes (`prismaRepository` e, se precisar de mock dedicado além do genérico, `mockRepository`), e exporte `create<Recurso>Repository()` escolhendo pela flag `env.MOCK_MODE`. Se o recurso não precisar de comportamento especial no mock, use `createMockRepository(seuMockCollection, { defaults: () => ({ criadoEm: new Date() }) })` — ver [`shared/mock/create-mock-repository.ts`](../src/shared/mock/create-mock-repository.ts). Lembre de adicionar a `MockCollection` correspondente em [`shared/mock/mock-store.ts`](../src/shared/mock/mock-store.ts).
5. **`services/<recurso>.service.ts`** — regra de negócio. Se o recurso pertence a outro (ex.: um `ativo` pertence a um `setor`), importe o service do módulo pai e reuse o `getAccessible(user, id)` dele antes de agir — é assim que a cadeia de multi-tenant se propaga (ver [ARCHITECTURE.md](./ARCHITECTURE.md#multi-tenant-como-o-isolamento-entre-empresas-é-aplicado)).
6. **`controllers/<recurso>.controller.ts`** — fino: `asyncHandler` + chama o service + formata com `ok`/`created`/`paginated`/`noContent` (ver [`shared/http/api-response.ts`](../src/shared/http/api-response.ts)).
7. **`routes/<recurso>.routes.ts`** — monta o `Router()`: `authenticateUser` (ou `authenticateDevice`, se for um endpoint de dispositivo) + `validate({...})` + `authorize(...papéis)` quando a ação exigir papel específico + o handler do controller.
8. Registre o router em [`src/routes/index.ts`](../src/routes/index.ts): `apiRoutes.use('/<recurso>', xRoutes)`.
9. Adicione o schema ao [`src/docs/openapi.ts`](../src/docs/openapi.ts) (na seção `schemas` e `paths`) — é escrito à mão, não gerado automaticamente a partir do Zod.
10. Se o recurso tiver tabela nova, siga [Como criar uma migration](#como-criar-uma-migration) abaixo **antes** do passo 4.

## Como criar uma rota nova em um módulo existente

Só os passos 6–7 acima: adicione o método no controller, registre o verbo/path no arquivo de rotas do módulo, com `validate`/`authorize` adequados, e documente em `openapi.ts`.

## Como criar uma migration

O schema Prisma ([`prisma/schema.prisma`](../prisma/schema.prisma)) espelha manualmente [`db/db.sql`](../db/db.sql) nesta etapa (ver [ADR 0002](./adr/0002-mysql-prisma.md)). Para alterar o modelo de dados:

1. Edite **os dois arquivos**: `db/db.sql` (DDL de referência) e `prisma/schema.prisma` (o que o backend realmente usa).
2. Rode `npm run prisma:generate` para regenerar os tipos do Prisma Client.
3. Se você tiver um MySQL local rodando (`MOCK_MODE=false`), rode `npm run prisma:migrate` — isso cria um arquivo em `prisma/migrations/` e aplica no seu banco local. **Commite a pasta de migration gerada.**
4. Se o novo campo tem um default relevante para os dados de exemplo, atualize também [`src/shared/mock/mock-store.ts`](../src/shared/mock/mock-store.ts) (seed em memória) e [`prisma/seed.ts`](../prisma/seed.ts) (seed do MySQL real).
5. Rode a suíte de testes (`npm test`) — ela roda inteira em `MOCK_MODE=true`, então qualquer mismatch entre entidade e mock aparece ali.

## Como criar um teste

Ver [TESTING.md](./TESTING.md#como-escrever-um-teste-novo).

## Convenção de commits

Este repositório segue [Conventional Commits](https://www.conventionalcommits.org/): `<tipo>: <descrição no imperativo, em português>`.

| Tipo | Uso |
| --- | --- |
| `feat` | funcionalidade nova |
| `fix` | correção de bug |
| `docs` | só documentação |
| `style` | formatação, sem mudança de comportamento (ex.: `prettier --write`) |
| `refactor` | mudança de código que não é `feat` nem `fix` |
| `perf` | melhoria de performance |
| `test` | adição/ajuste de teste |
| `chore` | tooling, dependências, configuração |
| `ci` | pipeline de CI/CD |

Um commit = uma mudança lógica (ex.: "adiciona infraestrutura Docker" separado de "aplica formatação Prettier" separado de "adiciona pipeline de CI") — evite misturar assuntos diferentes num commit só. Exemplos reais: veja `git log --oneline` neste repositório.

## Convenção de branches

Prefixo pelo tipo da mudança + descrição curta em kebab-case, ex.: `feat-bootstrap-da-arquitetura-backend-do-siva`. Siga o mesmo prefixo dos commits (`feat-`, `fix-`, `docs-`, `chore-`...). Essa convenção ainda não está automatizada (sem hook/CI que a valide) — é um padrão a seguir, não uma trava técnica.
