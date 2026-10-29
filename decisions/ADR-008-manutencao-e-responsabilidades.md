# ADR-008 — Manutenção interna e responsabilidades (sensor × ESP32/LCD)

**Status:** Accepted

## Contexto

`Manutencao {sensorId, tipo preventiva|corretiva|inspecao, status, descricao?, funcionarioId?}` existe parcialmente (`prisma/schema.prisma:145`, `maintenance.validators.ts`, `maintenance.routes.ts` sem `authorize`). Regra definitiva consolidada: manutenção preventiva/inspeção é atividade interna da cliente, atribuída a funcionário, concluída sem gerar chamado por obrigação. Ver `docs/analise-regras-negocio.md` §8 (e §§7, 9, 10 para o contraponto Chamado/OS).

## Decisão

- Manutenção preventiva/inspeção = interna da cliente (funcionário), fluxo sem chamado obrigatório.
- NÃO adotar `Manutencao.alvo` (`sensor|esp32|lcd|comunicacao`) como campo obrigatório.
- ESP32, LCD, comunicação e atendimento especializado da vendedora trafegam via Chamado → OS (PLANEJADO — entidades ainda inexistentes), não via `Manutencao`.

## Motivo

Evitar duplicação (Chamado/OS já expressam solicitação × atendimento), evitar reabrir trava por perfil em todo CRUD de manutenção, e não poluir o fluxo interno simples do funcionário. ESP32/LCD atendidos pela vendedora deixam rastro melhor em `Chamado.local` + `OS.servico` do que em `Manutencao` ambígua (§8 da análise).

## Consequências

- `Manutencao` permanece simples e centrada no sensor / atividade atribuída.
- Se um dia for preciso distinguir defeito físico do ponto de medição vs falha de telemetria dentro da manutenção interna, admite-se campo opcional (ex.: `origem/equipamento`) com justificativa — o caminho padrão continua Chamado → OS.
- Uso de `corretiva` interna simples pelo funcionário segue como ponto [NECESSITA DEFINIÇÃO] (manter com escopo restrito ou reservar à OS) — ver §7 da análise; não decidido aqui.

## Alternativas

- **`Manutencao.alvo` obrigatório (`sensor|esp32|lcd|comunicacao`)**: descartado pelos motivos acima (duplicação, trava por perfil em todo CRUD, poluição do fluxo interno).
- **Toda corretiva via Chamado → OS, sem exceção**: não adotado agora — a corretiva simples interna permanece como indefinição a decidir (§7 da análise).
