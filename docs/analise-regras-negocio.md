# SIVA — Análise de Regras de Negócio (consolidada — somente leitura)

> Revisão consolidada após regra definitiva. Nenhum código, Prisma, migration, endpoint, controller ou service foi alterado.
> Tags: `[EXISTENTE]` `[NECESSÁRIO IMPLEMENTAR]` `[NECESSITA DEFINIÇÃO]` `[INCONSISTENTE]`.
> Base: `prisma/schema.prisma`, `src/types/express.d.ts`, `src/middlewares/auth.middleware.ts`, `src/shared/auth/scope.ts`, `src/modules/*/routes|controllers|services|repositories|validators`.

---

## 1. Resumo executivo

Regra definitiva consolidada:

```text
MANUTENÇÃO INTERNA
=
Funcionário da empresa cliente
+
Preventiva/Inspeção
+
Atividade atribuída
```

```text
ATENDIMENTO TÉCNICO
=
Empresa cliente
+
Chamado
+
Operador da empresa vendedora
+
Ordem de Serviço
+
Reparo/serviço
```

- `MANUTENÇÃO (preventiva/inspeção)` é atividade interna da cliente, atribuída a funcionário, concluída sem gerar chamado por obrigação `[EXISTENTE]` parcial.
- `CHAMADO` é solicitação da cliente ("existe um problema/necessidade") `[NECESSÁRIO IMPLEMENTAR]`.
- `ORDEM DE SERVIÇO` é o atendimento técnico da vendedora vinculado ao chamado `[NECESSÁRIO IMPLEMENTAR]`.
- Chamado e Manutenção **não** são sinônimos. O código atual os confunde (string `'Chamado de manutenção'` em `src/modules/maintenances/services/maintenance.service.ts:18,31` + docs chamando `maintenances` de "chamados") `[INCONSISTENTE]`.
- Sensor × ESP32/LCD: funcionário cuida de inspeção/preventiva do sensor; vendedora/operador cuida de ESP32, LCD, comunicação e atendimento especializado **via Chamado → OS**, não via `Manutencao.alvo` obrigatório (ver §8).
- Perfis alvo: vendedora `super_admin + operador`; cliente `admin/gestor + funcionario (+ cargo mecanico/eletricista)`. Hoje só existem 3 `tipos`, sem `operador`, sem `cargo`, sem `Empresa.tipo` (§3–§5).

---

## 2. Arquitetura atual [EXISTENTE]

```text
Route → Middleware (auth → authorize → validate) → Controller → Service → Repository → Prisma → MySQL
```

- `src/app.ts:1-48`, `src/routes/index.ts:1-29` (`GET /api/health` + 10 routers sob `/api`). Ordem helmet→cors→compression→json→logger→rateLimit→rotas→404→erros correta.
- Regra no service (ex: `sensor.service.ts:34` mesmo setor, `reading.service.ts:22` `esp_id` do dono, `user.service.ts:19-41` escopo). Repository sem regra. Route só composição.
- Ressalvas: `findDeviceByToken` direto no middleware (`src/middlewares/auth.middleware.ts:46`); `alert.controller.ts:6` stub 501 sem resposta; parsing `Number()` duplicado nos controllers.

---

## 3. Perfis — atual × desejado

Atuais (`prisma/schema.prisma:14-20`, `src/types/express.d.ts:7`, `validators/user.validators.ts:7`):

- `super_admin` (`empresaId=null`): global, único `DELETE /users/:id` (`user.routes.ts:40`), único CRUD empresas.
- `admin_empresa`: própria empresa, CRUD setor/ativo/device/sensor + users (exceto deletar).
- `funcionario`: leitura escopada + `maintenances` (único módulo sem `authorize`).

Desejado:

```text
EMPRESA VENDEDORA
├── super_admin        [EXISTENTE] administração global
└── operador           [NECESSÁRIO IMPLEMENTAR] atendimento técnico, NÃO é funcionario de cliente

EMPRESA CLIENTE
├── admin/gestor      [EXISTENTE] como admin_empresa (alias/rename [NECESSITA DEFINIÇÃO])
└── funcionario       [EXISTENTE] parcial
    ├── cargo=mecanico     [NECESSÁRIO IMPLEMENTAR] campo, não perfil
    └── cargo=eletricista  [NECESSÁRIO IMPLEMENTAR] campo, não perfil
```

- `tipo/perfil` = autorização (o que pode fazer). `cargo` = função operacional (mecânico, eletricista). Nunca criar `mecanico/eletricista` como `TipoUsuario` — seria explosão de perfis e quebra de `authorize()` em todas as rotas.
- Alterações exatas para chegar ao modelo (sem executar agora): estender `TipoUsuario` com `operador` (migration + `express.d.ts` + validators + OpenAPI + `authorize` nas novas rotas); adicionar `Usuario.cargo String?` opcional sem efeito em `authorize`; vincular `operador` à empresa vendedora (ver §4); travar `authorize('operador')` só em chamados/OS, nunca em preventiva interna.

---

## 4. Empresa vendedora × empresas clientes

Desejado:

```text
Empresa Vendedora
    |
    +-- Operador A
    +-- Operador B
    |
    +-- Empresa Cliente 1
    +-- Empresa Cliente 2
    +-- Empresa Cliente 3
```

- Hoje: `Usuario.empresaId?` + `assertSameCompany` (`src/shared/auth/scope.ts:9`) isolam cliente×cliente `[EXISTENTE]`; sem `Empresa.tipo (vendedora|cliente)`, sem vínculo operador→clientes `[INCONSISTENTE]`.
- `company.service.ts:12` filtra `id = empresaId ?? -1` para não-super; `user.service.ts:19` idem. Padrão deny-by-default correto para clientes.
- Operador → todas × atribuídas: código atual só conhece dois modos — `super_admin` vê tudo, demais veem uma empresa. Logo `operador → todas as clientes` é o mais coerente de imediato (herda padrão super_admin com `authorize('operador')` + bypass seletivo), enquanto `operador → atribuídas` exige M-N nova (`OperadorEmpresa`/`atribuicao`) + `assertOperadorEscopo` + filtros por lista. Recomendação sem arbitrariedade: começar com `todas` + auditoria, evoluir para `atribuídas` quando houver necessidade real de segregação entre operadores. Escopo final `[NECESSITA DEFINIÇÃO]`: todas vs atribuídas, quem atribui, se gestor cliente vê operador.

---

## 5. Funcionário (cliente) [EXISTENTE] parcial

- Hoje: `tipo=funcionario` + `Manutencao.funcionarioId?` (`prisma/schema.prisma:151`). Sem `cargo`.
- Responsável por inspeções, preventivas atribuídas, registrar `descricao`, concluir via `PATCH status` (`maintenance.validators.ts:10`). Fluxo interno sem chamado obrigatório `[EXISTENTE]` parcial.
- Falta: `cargo` (string/enum opcional), atribuição formal (`atribuidoEm`, quem atribuiu), resultado estruturado (além de `descricao`), impedir edição de atividade alheia (hoje qualquer escopado edita/remove — `maintenance.routes.ts:16-40` sem `authorize`), visão sem `sensorId` obrigatório.

---

## 6. Operador (vendedora) [NECESSÁRIO IMPLEMENTAR]

- `grep operador` em `src/` = 0. Sem enum, rota, service, escopo.
- Responsabilidades exclusivas: visualizar/analisar/assumir chamados do escopo; criar/assumir/executar OS; registrar serviço realizado; concluir OS. Não gerir preventiva/inspeção interna da cliente; não ser tratado como `funcionario`.
- Controle necessário: `authorize('super_admin','operador')` em `/chamados` e `/ordens-servico`; gestor/funcionário cliente nunca criam/assumem/executam OS (só visualizam as próprias); operador nunca conclui preventiva interna alheia.

---

## 7. Manutenção interna (cliente) [EXISTENTE] parcial

- `Manutencao {sensorId, tipo preventiva|corretiva|inspecao, status aberto|em_andamento|concluido, descricao?, funcionarioId?, abertoEm, concluidoEm?}` (`prisma/schema.prisma:145`, `validators:3-14`). `concluidoEm` derivado no repository.
- Suporta Fluxos 1 e 2 como registro avulso: gestor cria com `funcionarioId` → funcionário executa → `descricao` + `status=concluido`.
- `corretiva` em sensor pelo funcionário: permitida hoje como valor, mas regra definitiva manda corretiva especializada via Chamado→OS quando exigir vendedora. Uso interno de `corretiva` simples `[NECESSITA DEFINIÇÃO]` (manter com escopo restrito ou reservar à OS).
- Lacunas: sem agenda/recorrência, checklist, evidência, SLA, histórico, filtros globais.

---

## 8. Sensor × ESP32/LCD — regra consolidada

- Funcionário cliente: inspeção do sensor, preventiva do sensor, registro do resultado. Escopo: `Manutencao` interna.
- Vendedora/operador: ESP32, LCD, comunicação, componentes da fornecedora e problemas especializados. Veículo: `Chamado → OrdemServico → Atendimento`, não manutenção interna.
- Sobre `Manutencao.alvo = sensor|esp32|lcd|comunicacao`: **não adotar como obrigatório**. Motivos: (a) duplica o que Chamado/OS já expressam (solicitação × atendimento); (b) reabre trava por perfil em todo CRUD de manutenção; (c) polui o fluxo interno simples do funcionário; (d) ESP32/LCD atendidos pela vendedora deixam rastro melhor em `Chamado.local (sensor/esp32/ativo)` + `OS.servico` do que em `Manutencao` ambígua. Se um dia for preciso distinguir defeito físico do ponto de medição vs falha de telemetria dentro da manutenção interna, adicionar `origem/equipamento` opcional com justificativa — mas o caminho padrão continua `Chamado→OS`.

---

## 9. Chamado [NECESSÁRIO IMPLEMENTAR]

- Definição: "A empresa cliente está solicitando atendimento porque existe um problema/necessidade." Pertence ao fluxo de solicitação. Ex: "Sensor da enchedora apresenta falha."
- Hoje só string/docs, sem entidade, rota ou tabela.
- Mínimo futuro: `empresaId, solicitanteId, setorId?, ativoId?, sensorId?, esp32Id?, titulo, descricao, prioridade, status (aberto→em_analise→em_atendimento→concluído/cancelado), operadorId?, manutencaoOrigemId?, timestamps, histórico`. Quem abre: gestor (e funcionário conforme regra — ver §12). Cliente vê só os próprios; operador vê do escopo; `super_admin` tudo.

---

## 10. Ordem de Serviço [NECESSÁRIO IMPLEMENTAR]

- Definição: "A empresa vendedora irá realizar um atendimento técnico relacionado a esse chamado." Ex: "Verificar comunicação do ESP32, diagnosticar, substituir, testar."
- Fluxo: `Chamado → Análise → OS → Operador executa → Serviço realizado → OS concluída` (1 chamado pode gerar N OS `[NECESSITA DEFINIÇÃO]`; OS sem chamado só excepcional `[NECESSITA DEFINIÇÃO]`).
- Mínimo futuro: `chamadoId, operadorId, descricao_servico, status, iniciadoEm, concluidoEm, laudo/servicoRealizado, custo?`. Só `operador/super_admin` criam/assumem/executam/concluem; cliente só visualiza as próprias.

---

## 11. Fluxos completos

- FLUXO 1 — PREVENTIVA `[EXISTENTE]` parcial: Gestor → cria preventiva (`POST /maintenances tipo=preventiva + funcionarioId`) → funcionário executa → `descricao` → `PATCH concluido`. Falta agenda/dono/filtros.
- FLUXO 2 — INSPEÇÃO `[EXISTENTE]` parcial: idem com `tipo=inspecao`. Falta checklist/evidência.
- FLUXO 3 — ATENDIMENTO VENDEDORA `[NECESSÁRIO IMPLEMENTAR]`: problema → cliente abre Chamado → operador recebe/analisa → OS → operador atende → registra serviço → conclui OS (+ fecha chamado). `alerts` 501 não gera ocorrência automática.

---

## 12. Matriz de permissões (alvo definitivo; código atual entre colchetes quando diverge)

| Ação | Super Admin | Operador | Gestor Cliente | Funcionário Cliente |
|---|---|---|---|---|
| Gerenciar empresas | Sim [EXISTENTE] | Não [NECESSÁRIO IMPLEMENTAR] | Não [EXISTENTE] | Não [EXISTENTE] |
| Visualizar empresas clientes | Sim [EXISTENTE] | Conforme escopo [NECESSÁRIO IMPLEMENTAR; todas vs atribuídas NECESSITA DEFINIÇÃO] | Própria [EXISTENTE] | Própria [EXISTENTE] |
| Criar preventiva | Sim [EXISTENTE] | Não deve gerir preventiva interna [NECESSÁRIO IMPLEMENTAR trava] | Sim [EXISTENTE] | Conforme regra [NECESSITA DEFINIÇÃO: só gestor ou funcionário pode criar própria? Hoje qualquer escopado cria] |
| Criar inspeção | Sim [EXISTENTE] | Não deve gerir inspeção interna [NECESSÁRIO IMPLEMENTAR trava] | Sim [EXISTENTE] | Conforme regra [NECESSITA DEFINIÇÃO, idem] |
| Executar preventiva atribuída | Sim [EXISTENTE] | Não [NECESSÁRIO IMPLEMENTAR] | Não [NECESSITA DEFINIÇÃO trava: hoje gestor pode PATCH qualquer] | Sim, só as próprias [INCONSISTENTE hoje: pode alterar de outro] |
| Executar inspeção atribuída | Sim [EXISTENTE] | Não [NECESSÁRIO IMPLEMENTAR] | Não [idem] | Sim, só as próprias [INCONSISTENTE hoje] |
| Registrar resultado | Sim [EXISTENTE] | Não (exceto serviço da OS) | Não [trava futura] | Sim [EXISTENTE via descricao] |
| Abrir Chamado | Sim [futuro] | Não é o fluxo principal [futuro] | Sim [NECESSÁRIO IMPLEMENTAR] | Conforme regra definida [NECESSITA DEFINIÇÃO: direto ou via gestor] |
| Visualizar Chamado | Sim [futuro] | Sim [NECESSÁRIO IMPLEMENTAR] | Sim, própria empresa [futuro] | Conforme regra [NECESSITA DEFINIÇÃO] |
| Analisar Chamado | Sim [futuro] | Sim [NECESSÁRIO IMPLEMENTAR] | Não | Não |
| Criar/assumir OS | Sim [futuro] | Sim [NECESSÁRIO IMPLEMENTAR] | Não | Não |
| Executar OS | Sim [futuro] | Sim [NECESSÁRIO IMPLEMENTAR] | Não | Não |
| Registrar serviço da OS | Sim [futuro] | Sim [NECESSÁRIO IMPLEMENTAR] | Não | Não |
| Concluir OS | Sim [futuro] | Sim [NECESSÁRIO IMPLEMENTAR] | Não | Não |

---

## 13. Segurança

- Cliente×cliente `[EXISTENTE]`: `assertSameCompany` + `?? -1`. O middleware relê status, papel e empresa do usuário a cada requisição; excluir/inativar bloqueia tokens existentes. Troca de senha não revoga tokens.
- `company.service create/update/remove` sem `actor` (`company.service.ts:23-35`) — defesa só na rota.
- `maintenances` sem `authorize` + sem dono: funcionário altera/conclui/remove atividade de outro; `funcionarioId` sem checar mesma empresa.
- `update` sem revalidar FK destino permite mover registro de empresa.
- Novos riscos a travar: funcionário executar OS; operador alterar preventiva interna; cliente abrir/executar OS; gestor concluir OS.

---

## 14. Banco de dados

- Existentes: `Empresa 1-N Usuario/Setor; Setor 1-N Ativo/Esp32; Sensor N-1 Ativo+Espan32; Sensor 1-N Leitura/Manutencao; Usuario 1-N Manutencao`. Uniques/índices atuais mantidos. Sem `onDelete/updatedAt`/migrations.
- Ausentes: `Chamado`, `OrdemServico (+historico)`, `Empresa.tipo`, `Usuario.cargo`, vínculo operador×clientes (se atribuído), `prioridade/SLA/historico/anexo/custo/laudo`.
- Decisão: **não** adicionar `Manutencao.alvo` agora (§8). `Chamado` referencia origem (sensor/esp32/ativo); `OS` referencia `chamadoId + operadorId`.

---

## 15. Rotas atuais [EXISTENTE]

`POST /auth/login`, `GET /auth/me`, CRUD `users` (delete só super_admin), CRUD `companies` (escrita super_admin), CRUD `sectors/assets/devices/sensors` (escrita super_admin+admin_empresa), `POST /readings` (X-Token) + `GET /readings` (JWT), CRUD `maintenances` (só JWT), `GET /alerts` (501), `GET /health`. Sem `/chamados`, `/ordens-servico`, `/operador/*`.

---

## 16. Services atuais [EXISTENTE]

`auth`, `user` (escopo+hash), `company` (sem actor na escrita), `sector/asset/device/sensor` (cadeia `getAccessible`), `reading` (dono+touch), `maintenance` (gate via sensor), `alert` (501). Regra no service, sem vazamento para repository.

---

## 17. Controllers atuais [EXISTENTE]

Finos (`asyncHandler` + envelope). `device create` retorna token (intencional). `alert` sem resposta. `Number()`/paginação duplicados com validators.

---

## 18. Middlewares atuais [EXISTENTE]

`authenticateUser/authenticateDevice/authorize`, `validate` Zod, `requestLogger`, `notFound`, `errorHandler` (`ZodError→422`, `AppError→status`, 500 sem stack em prod).

---

## 19. INCONSISTÊNCIAS (13 problemas revistos)

1. `TipoUsuario` sem `operador` (`prisma/schema.prisma:14`, `express.d.ts:7`) — Fluxo 3 impossível.
2. Sem `cargo` (`grep cargo`=0) — `tipo` acumula autorização + função.
3. Sem `Empresa.tipo` vendedora|cliente — sem base para vínculo operador.
4. Sem vínculo operador×clientes — escopo todas vs atribuídas indefinido.
5. Sem `Chamado` (só string em `maintenance.service.ts:18`) — solicitação não existe.
6. Sem `OrdemServico` (grep 0) — atendimento não existe.
7. Manutenção confundida com chamado (erro + `openapi.ts:337` + `BUSINESS_FLOWS.md:89`) — renomear e separar.
8. `maintenances` sem `authorize` (`routes:16-40`) — qualquer escopado escreve.
9. Funcionário altera atividade alheia (sem dono `funcionarioId==me`/gestor).
10. Sem controle de quem abre chamado (entidade inexistente).
11. Sem fluxo Chamado→OS (sem FK `chamadoId`, sem transição).
12. Sem controle do operador (sem papel, sem `authorize('operador')`).
13. Isolamento vendedora×clientes ausente (só cliente×cliente existe).

---

## 20. ALTERAÇÕES NECESSÁRIAS (futuras)

### Prioridade 1 — Essencial
- `TipoUsuario.operador` + `Usuario.cargo?` + `Empresa.tipo` + vínculo operador×clientes (se atribuído).
- `Chamado` + `OrdemServico (+historico)` + rotas `/chamados`, `/ordens-servico` (+ `/operador/*` se agregado) com `authorize` e escopo.
- Travar `maintenances`: dono + papel + validação `funcionarioId` mesma empresa + filtros globais.
- Máquinas de estado Chamado e OS guardadas no service.
- Renomear "Chamado de manutenção" e docs que chamam manutenção de chamado.

### Prioridade 2 — Importante
- `company.service` com `actor`; revalidar FK destino em `update`; `cargo` sem efeito em auth.
- `prioridade/prazo/SLA/atribuidoEm/resultado/historico/custo/laudo`; `updatedAt/onDelete`/índices; unificar `db.sql`.
- `device.token` hash + `JWT_SECRET` obrigatório em prod + revalidação JWT crítica.

### Prioridade 3 — Futuro
- Agenda/recorrência, checklist, evidências, motor de alertas→ocorrência, dashboard operador, agregações/jobs, refresh/MFA, `BigInt→string`.

---

## 21. Pontos que precisam de decisão [NECESSITA DEFINIÇÃO]

- Operador: todas as clientes ou atribuídas? Quem atribui? Gestor vê operador?
- `admin_empresa` renomeia para `gestor` ou alias?
- Funcionário abre chamado direto ou só via gestor? Vê quais chamados?
- Chamado→OS 1-N ou 1-1? OS sem chamado permitida?
- `corretiva` interna do sensor permitida ou só via OS?
- SLA/prioridade/custo/anexos obrigatórios? MySQL×Postgres e `db.sql`×Prisma?

---

## 22. Checklist futura

- [ ] `Empresa.tipo` + operador×clientes
- [ ] `operador` + `cargo`
- [ ] `Chamado` + rotas + escopo
- [ ] `OrdemServico` + `chamadoId/operadorId` + estados
- [ ] `maintenances`: dono/papel/`funcionarioId`/filtros
- [ ] `company.service` actor; FK destino revalidada
- [ ] Token hash; JWT prod; renomear "chamado"
- [ ] Índices/`updatedAt`; P3 (agenda/checklist/alertas/dashboard)

---

## Resumo final

### O que já existe
Isolamento cliente×cliente, auth JWT+X-Token, regra no service, CRUDs base, preventiva/inspeção interna avulsa sem chamado obrigatório, leitura imutável, envelope/paginação/erros padrão.

### O que está incorreto
Sem operador/cargo/`Empresa.tipo`; manutenção chamada de "chamado"; `maintenances` sem `authorize`/dono; `company.service` sem `actor`; FK destino sem revalidação; `Manutencao` ambígua sensor×ESP32 (resolver via Chamado→OS, não via `alvo`).

### O que precisa ser criado
`operador`, `cargo`, `Empresa.tipo` (+vínculo se atribuído), `Chamado`, `OrdemServico`, rotas e `authorize`, máquinas de estado, travas de manutenção, renomeações, hardening e migration inicial.

### O que ainda precisa de decisão
§21: escopo do operador, rename gestor, quem abre/vê chamado, cardinalidade Chamado×OS, `corretiva` interna, SLA/custo/anexos, banco/fonte da verdade.

### Ordem recomendada de implementação
1. `Empresa.tipo` + `operador` + `cargo` + vínculo (decidir todas×atribuídas).
2. `Chamado` (abrir/listar/triar/assumir) + travas.
3. `OrdemServico` (gerar a partir do chamado, executar, laudo, concluir/fecha chamado).
4. Travar `maintenances` (dono/papel/filtros) + renomear "chamado".
5. Hardening (`company actor`, FK destino, token/JWT) + índices/migration.
6. P3: agenda, checklist, alertas, dashboard operador.
