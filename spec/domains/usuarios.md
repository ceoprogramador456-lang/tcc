# Domínio: Usuários

**Status: IMPLEMENTADO**

- Entidade/tabela: `Usuario` → `usuario` (`id`, `nome`, `email unique`, `senha`
  hash, `tipo`, `especialidade?`, `status`, `empresa_id`, `criado_em`).
- Relações: N-1 `Empresa` (obrigatória para todos os perfis); 1-N
  `OrdemServico` (como `funcionarioId`/`solicitanteId`/`aceitoPor`); 1-N
  `Manutencao` (como `funcionarioId`).
- Tipos (`tipo`): `ADMIN`, `GESTOR`, `TECNICO`.
  - `ADMIN`: vinculado à SIVA (`empresaId = SIVA.id`), autorização global;
    sem especialidade.
  - `GESTOR`: empresa cliente obrigatória; sem especialidade.
  - `TECNICO`: **exclusivo da SIVA** (`Empresa.tipo = SIVA`); especialidade
    obrigatória (`MECANICO|ELETRICISTA`).
- Regras de cadastro (somente `ADMIN`):
  - empresa SIVA → `ADMIN` ou `TECNICO`;
  - empresa cliente → somente `GESTOR`;
  - todo usuário pertence a uma empresa (inclusive o `ADMIN`);
  - `TECNICO` sem especialidade ou perfil incompatível com a empresa → `422`.
- Status `ATIVO|INATIVO`; inativo não autentica e o token deixa de ser aceito
  nas requisições protegidas (o usuário é recarregado do banco a cada request).
- Acesso do `TECNICO`: apenas `GET /api/solicitacoes-servico` (escopado por
  `funcionarioId`) e o detalhe da própria OS; qualquer outro módulo retorna `403`.
