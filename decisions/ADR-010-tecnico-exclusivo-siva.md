# ADR-010 — Técnico exclusivo da SIVA e cadastro de usuários por empresa

**Status:** Accepted

## Contexto

O perfil `TECNICO` era usado por mecânicos/eletricistas das empresas clientes.
A regra de negócio passou a exigir que `TECNICO` seja um funcionário da SIVA
(dona do sistema) e que ele veja apenas as Ordens de Serviço designadas a ele.
Também era necessário impedir, no cadastro e na API, combinações de perfil ×
empresa que não fazem sentido (ex.: `ADMIN` ou `TECNICO` em empresa cliente).

Antes da mudança, `ADMIN` não tinha empresa (`empresaId = null`) e não havia
como distinguir a SIVA de uma empresa cliente.

## Decisão

- Criar `Empresa.tipo` (`SIVA|CLIENTE`), com a SIVA única identificada pelo CNPJ
  reservado `00.000.000/0001-00`.
- Vincular `ADMIN` à SIVA, preservando autorização global por papel.
- `TECNICO` passa a ser exclusivo de empresa `SIVA` e exige especialidade
  (`MECANICO|ELETRICISTA`).
- Cadastro de usuários (somente `ADMIN`):
  - SIVA → `ADMIN` ou `TECNICO`;
  - cliente → somente `GESTOR`;
  - todo usuário tem empresa.
- Migrar técnicos existentes de empresas clientes para a SIVA, preservando
  histórico (OS/manutenções continuam referenciando o mesmo usuário).
- O `TECNICO` lista/abre somente OS em que é `funcionarioId`; `denyTecnico`
  bloqueia os demais módulos no back-end.
- A manutenção interna da cliente passa a ser executada pelo `GESTOR`.

## Motivo

- Separa a equipe técnica da SIVA dos usuários das empresas clientes, refletindo
  o modelo de negócio (SIVA executa OS; cliente solicita e acompanha).
- Evita perfis sem sentido em empresas clientes e mantém o isolamento
  multiempresa explícito.
- O escopo por `funcionarioId` garante que um técnico nunca veja a OS de outro,
  mesmo que conheça o ID.

## Consequências

- `Empresa.tipo` passa a ser campo de domínio (não editável pela API).
- `ADMIN` deixa de ter `empresaId = null`; `empresaId` passa a ser obrigatório
  para todos os usuários.
- Empresas clientes não podem mais ter `ADMIN`/`TECNICO`; tentativas retornam
  `422` com mensagem clara.
- A área do técnico no front é uma única tela (`/tecnico`), sem menu para outros
  módulos; o login redireciona por perfil.
- Técnicos migrados para a SIVA mantêm o histórico; novas designações só aceitam
  técnico ativo da SIVA.
- Nome da empresa não é retornado nas OS; a tela do técnico exibe `Empresa #id`
  até uma decisão futura de contrato.

## Alternativas

- **Manter técnicos nas empresas clientes e apenas esconder telas no front**:
  descartado — a regra precisa ser aplicada no back-end e o perfil deixa de
  representar o negócio.
- **Criar um novo tipo `TECNICO_SIVA` e manter `TECNICO` nas clientes**:
  descartado — adicionaria complexidade sem necessidade, já que o técnico de
  cliente deixa de existir.
- **Identificar a SIVA por nome**: descartado — nome é editável/ambíguo; o
  `tipo` + CNPJ reservado dão unicidade.
