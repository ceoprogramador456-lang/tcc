# 0001 — TypeScript + Node.js + ESM como base do backend

**Status**: aceito

## Contexto

O SIVA precisa de um backend que: (1) o time (formado durante um curso técnico) já tenha familiaridade ou consiga aprender rápido; (2) tenha ecossistema maduro para o que o projeto precisa — validação, ORM, autenticação, documentação de API; (3) rode bem tanto localmente (Windows/Linux dos alunos) quanto em containers de produção.

## Decisão

Node.js 22+ com TypeScript, compilado como módulos ES (`"type": "module"` no `package.json`, `module`/`moduleResolution: NodeNext` no `tsconfig.json`) — não CommonJS.

## Alternativas consideradas

- **JavaScript puro (sem TypeScript)**: descartado — o domínio tem uma hierarquia de 5 níveis (Empresa→Setor→Ativo/ESP32→Sensor→Leitura) com regras de acesso cruzadas entre módulos; tipos pegam um erro de "passei o `id` errado" em tempo de compilação, antes de virar um bug de produção silencioso.
- **CommonJS em vez de ESM**: descartado — ESM é o padrão atual do ecossistema Node (a maioria das libs novas publica ESM-first ou dual), e como o projeto começa do zero, não há legado CommonJS para manter compatibilidade.
- **Outra linguagem/runtime** (Python/Django, Java/Spring, Go): descartado por não estarem na trilha de aprendizado do curso e por trocarem tudo (deploy, testes, ecossistema) sem ganho claro para o escopo do projeto.

## Consequências

- ✅ Tipo forte em todo o domínio, refletido nas entidades/DTOs de cada módulo (ver [ARCHITECTURE.md](../ARCHITECTURE.md)).
- ✅ Alinhado com o que o time já usa no frontend (o dashboard também é JS/TS, por hipótese — reduz troca de contexto).
- ⚠️ ESM com `NodeNext` exige import com extensão `.js` mesmo em arquivos `.ts` (`import { x } from './y.js'`) — não intuitivo para quem nunca viu, mas é a exigência real do resolvedor de módulo do Node; documentado em [DEVELOPMENT.md](../DEVELOPMENT.md#convenções-de-código).
- ⚠️ Nem toda lib do ecossistema tem tipos/suporte ESM perfeito — já apareceu uma fricção real neste projeto: a lib `pino-http` foi abandonada em favor de um middleware de log escrito à mão ([`request-logger.middleware.ts`](../../src/middlewares/request-logger.middleware.ts)) porque seus tipos não resolviam corretamente sob `moduleResolution: NodeNext`.
