# Como contribuir

Guia rápido de fluxo. Para convenções de código, estrutura de módulo e como criar migration/teste, veja [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

## Fluxo

1. **Crie uma branch** a partir de `main`, nomeada `<tipo>-<descrição-curta-em-kebab-case>` (ex.: `feat-cadastro-de-sensores`, `fix-token-esp32-duplicado`). Tipos: `feat`, `fix`, `docs`, `refactor`, `chore`, `test`, `ci` — os mesmos usados nos commits (ver abaixo).
2. **Trabalhe em commits pequenos e lógicos** — um commit por mudança de assunto, não um commit gigante no fim. Siga [Conventional Commits](https://www.conventionalcommits.org/): `<tipo>: <descrição no imperativo>`.
3. **Rode a checagem local antes de abrir o PR** (o hook de pre-commit já roda parte disso automaticamente nos arquivos alterados):
   ```bash
   npm run lint
   npm run format:check
   npm run typecheck
   npm test
   npm run build
   ```
4. **Abra o Pull Request** contra `main`, com um título curto e uma descrição do "porquê", não só do "o quê" (o diff já mostra o quê). Se o PR mexe em schema de banco, mencione explicitamente (`db/db.sql` + `prisma/schema.prisma` devem mudar juntos — ver [DEVELOPMENT.md](docs/DEVELOPMENT.md#como-criar-uma-migration)).
5. **Revisão**: espere pelo menos uma aprovação antes de mergear. O [CI](docs/DEPLOYMENT.md#cicd) precisa estar verde (lint, format, typecheck, testes, build).
6. **Testes são obrigatórios** para qualquer mudança de regra de negócio ou de rota nova — ver [docs/TESTING.md](docs/TESTING.md#como-escrever-um-teste-novo). PR sem teste para uma regra nova deve ser justificado na descrição (ex.: "coberto manualmente porque X").
7. **Merge**: preferir *squash merge* ou manter os commits lógicos, conforme o padrão que o time decidir na revisão — o importante é `main` continuar com histórico legível.

## O que revisar num PR (checklist para quem revisa)

- A mudança respeita o escopo por empresa (`assertSameCompany`/`getAccessible`) quando mexe em dado de um recurso multi-tenant? Ver [docs/AUTHENTICATION.md](docs/AUTHENTICATION.md#autorização-por-papel-roles).
- Validação de entrada (Zod) cobre os campos novos?
- Erros esperados usam uma subclasse de `AppError` (não `throw new Error(...)` cru)? Ver [docs/ERROR_HANDLING.md](docs/ERROR_HANDLING.md).
- Se mudou o schema do banco: `db.sql` e `schema.prisma` mudaram juntos, e o mock (`shared/mock/mock-store.ts`) foi atualizado se necessário?
- `openapi.ts` foi atualizado se uma rota mudou de forma?
- Existe teste cobrindo o caminho feliz e pelo menos um caso de erro relevante?

## Reportando um bug ou propondo uma funcionalidade

Abra uma issue descrevendo: o que era esperado, o que aconteceu, como reproduzir (para bug) ou o problema que a funcionalidade resolve (para proposta). Se for uma decisão de arquitetura relevante, considere se ela merece um [ADR](docs/adr/README.md).
