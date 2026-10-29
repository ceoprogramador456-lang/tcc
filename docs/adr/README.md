# Architecture Decision Records (ADR)

Um ADR registra uma decisão técnica importante, o contexto que levou a ela e as alternativas consideradas — para que, meses depois, ninguém precise adivinhar "por que fizeram assim". Formato usado aqui: título, status, contexto, decisão, consequências (inclusive as negativas).

| ADR | Decisão |
| --- | --- |
| [0001](./0001-typescript-nodejs-esm.md) | TypeScript + Node.js + ESM como base do backend |
| [0002](./0002-mysql-prisma.md) | MySQL + Prisma como camada de persistência |
| [0003](./0003-arquitetura-modular-hexagonal.md) | Arquitetura feature-modular em camadas, com repository desacoplado |
| [0004](./0004-autenticacao-dupla-jwt-xtoken.md) | Dois mecanismos de autenticação: JWT para usuário, X-Token para dispositivo |
| [0005](./0005-mock-mode-api-fake.md) | Modo mock em memória como parte da arquitetura (não um mock de teste à parte) |

Novas decisões relevantes (troca de banco, de framework, de estratégia de deploy, etc.) devem ganhar um novo arquivo `000N-titulo-curto.md` nesta pasta.
