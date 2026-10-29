# 0005 — Modo mock em memória como parte da arquitetura

**Status**: aceito

## Contexto

O time de frontend precisava começar a integrar com a API antes do MySQL estar disponível/configurado para todo mundo, e sem depender de alguém do backend estar disponível para subir um ambiente compartilhado. A alternativa óbvia — "sobe um MySQL local e roda a API normal" — ainda exige instalar/rodar um banco, criar usuário de teste, rodar seed, e qualquer erro de conexão vira um bloqueio de produtividade que não tem nada a ver com o trabalho do frontend.

## Decisão

Cada `repository` implementa o mesmo contrato `CrudRepository` duas vezes — uma sobre Prisma/MySQL, uma sobre uma `MockCollection` em memória — e uma flag de ambiente (`MOCK_MODE=true`) decide qual das duas é instanciada, uma vez, na inicialização do processo. O mock vem pré-populado com dados de exemplo realistas (empresas, setores, ESP32s, sensores, ~25 leituras por sensor, chamados de manutenção) em [`shared/mock/mock-store.ts`](../../src/shared/mock/mock-store.ts), para que o frontend tenha algo para renderizar desde a primeira chamada.

## Alternativas consideradas

- **Servidor de mock separado** (ex.: json-server, Mock Service Worker, uma "API fake" different do backend real): descartado — geraria dois contratos de API para manter sincronizados manualmente (o real e o fake), com risco constante de divergência. A abordagem escolhida garante que rota, validação (Zod), autorização e formato de resposta são **exatamente os mesmos** nos dois modos — só a fonte do dado muda.
- **Banco SQLite/in-process como "MySQL de mentira"**: mais fiel a um banco real (ainda executaria SQL), mas exigiria manter um segundo schema Prisma (SQLite não suporta os mesmos tipos/enum do MySQL 1:1) e ainda seria mais lento para começar do que um array em memória.
- **Ambiente de staging compartilhado com MySQL sempre no ar**: não descartado como prática futura, mas não resolve o caso de uso "quero rodar localmente sem depender de infraestrutura externa nem de internet".

## Consequências

- ✅ `npm run dev:mock` sobe a API inteira, com todos os ~35 endpoints funcionando de verdade, sem Docker, sem MySQL, sem `prisma migrate` — só `npm install`.
- ✅ A suíte de testes automatizados ([TESTING.md](../TESTING.md)) roda inteira sobre esse mesmo modo, o que também elimina a necessidade de banco no CI (ver [DEPLOYMENT.md](../DEPLOYMENT.md#cicd)).
- ✅ Reforça a arquitetura em camadas "de verdade": se o mock não existisse, a tentação de vazar uma chamada Prisma direto num controller (pulando o repository) seria maior — o modo mock funciona como um teste vivo de que a camada de repository está mesmo isolando a fonte de dado.
- ⚠️ **Risco de divergência**: é preciso disciplina para manter as duas implementações de cada repository com o mesmo comportamento (ex.: mesmos filtros aceitos, mesmos defaults). Um bug só no caminho Prisma (ou só no mock) pode passar despercebido se só um dos dois for exercitado em teste/uso manual — ver nota em [DEPLOYMENT.md](../DEPLOYMENT.md#cicd) sobre o CI não cobrir o caminho Prisma.
- ⚠️ O mock reinicia do zero (mesmo seed) a cada `npm run dev:mock` — não persiste nada entre reinícios, por design (é justamente o que o torna simples e sem estado externo).
