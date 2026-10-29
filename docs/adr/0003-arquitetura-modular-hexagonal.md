# 0003 — Arquitetura feature-modular em camadas, com repository desacoplado

**Status**: aceito

## Contexto

O PR de bootstrap precisava definir uma organização que: suportasse crescer para ~10 recursos de domínio sem virar um `controllers/`/`services/` gigante e plano; deixasse claro onde cada tipo de código vive; e permitisse trocar a fonte de dado (MySQL real vs. em memória, ver [ADR 0005](./0005-mock-mode-api-fake.md)) sem reescrever regra de negócio.

## Decisão

Organização **feature-modular** (`src/modules/<recurso>/`) combinada com **camadas em cada módulo** (routes → controllers → services → repositories), e um contrato `CrudRepository<TEntity, TCreateInput, TUpdateInput>` (em [`interfaces/repository.interface.ts`](../../src/interfaces/repository.interface.ts)) que toda implementação de repository — Prisma ou mock — precisa satisfazer. Ver detalhe completo em [ARCHITECTURE.md](../ARCHITECTURE.md).

## Alternativas consideradas

- **Organização por camada, não por feature** (`src/controllers/`, `src/services/`, `src/repositories/`, cada um com um arquivo por recurso dentro): descartado — para achar tudo relacionado a "sensor" seria preciso abrir 5 pastas diferentes; feature-modular deixa o módulo inteiro num lugar só, o que importa mais conforme o número de recursos cresce.
- **Hexagonal "de livro"**, com porta explícita entre todo par de módulo que se comunica (ex.: `SensorAccessPort` como interface, implementada por um adapter que chama `sensor.service`): considerado e descartado nesta etapa — o ganho de desacoplamento não compensa a abstração extra para uma hierarquia de domínio pequena (5 níveis) e estável. A decisão consciente foi aplicar a "porta" só onde ela paga aluguel: entre service e a fonte de dado (`CrudRepository`), não entre módulos irmãos. Essa é uma diferença real entre o que o projeto **chama** de hexagonal e o que ele **de fato** é — registrada aqui e em [ARCHITECTURE.md](../ARCHITECTURE.md#trade-off-consciente-acoplamento-entre-módulos) para não virar uma afirmação vaga.
- **Um único service "gigante" por agregação** (ex.: um `hierarchyService` cuidando de setor+ativo+esp32+sensor juntos): descartado — perderia a possibilidade de testar/documentar cada recurso isoladamente, e misturaria regras de autorização de recursos com propósitos diferentes.

## Consequências

- ✅ Cada módulo é autocontido e replicável: criar um recurso novo é seguir o mesmo checklist de 10 passos (ver [DEVELOPMENT.md](../DEVELOPMENT.md#como-criar-um-módulo-novo)) que qualquer módulo existente já segue.
- ✅ A troca Prisma ↔ mock é transparente para controller/service — o único lugar que sabe qual dos dois está ativo é a função `create<Recurso>Repository()`.
- ⚠️ Módulos "filhos" (sensor, reading, maintenance) importam o `service` do módulo "pai" diretamente (ver trade-off documentado em ARCHITECTURE.md) — isso cria acoplamento em tempo de compilação entre módulos que, numa hexagonal mais estrita, se falariam só por porta.
- ⚠️ Não há injeção de dependência (DI container) — cada `repository` é instanciado como singleton no topo do arquivo de `service` (`const repository = createXRepository()`), decidido uma vez na inicialização do processo a partir de `env.MOCK_MODE`. Suficiente para o tamanho atual do projeto; um container de DI (ex.: `tsyringe`, `inversify`) só se justificaria se surgisse necessidade real de trocar implementação em runtime ou em teste unitário isolado (hoje os testes são de integração, ver [TESTING.md](../TESTING.md)).
