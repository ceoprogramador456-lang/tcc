# Domínio: Ordens de Serviço

**Status: IMPLEMENTADO**

- Entidade/tabela: `OrdemServico` → `ordem_servico` (`id`, `nome`, `tipo`
  `preventiva|corretiva|inspecao`, `descricao?`, `status`
  `aberto|em_andamento|concluido`, `empresa_id`, `solicitante_id`,
  `funcionario_id?`, `aceito_por?`, `aceito_em?`, `concluido_em?`,
  `criado_em`, `atualizado_em`).
- Relações: N-1 `Empresa` (cliente), N-1 `Usuario` solicitante (`GESTOR`),
  N-1 `Usuario` executor (`TECNICO` da SIVA), N-1 `Usuario` que aceitou (`ADMIN`).
- Fluxo: `GESTOR` cria (`aberto`) → `ADMIN` aceita e designa um `TECNICO` da SIVA
  (`em_andamento`) → `ADMIN` conclui (`concluido`).
- Acesso:
  - `GESTOR`: cria e lista somente as OS da própria empresa;
  - `ADMIN`: lista todas (filtro opcional por empresa), aceita, conclui e troca
    o técnico responsável;
  - `TECNICO`: lista e abre o detalhe **somente** das OS em que é o
    `funcionarioId`; não cria, aceita, conclui nem altera.
- O técnico designado precisa ser `TECNICO` ativo vinculado a uma empresa `SIVA`.
- Não há vínculo obrigatório com `Chamado` (entidade ainda planejada).
