# SIVA — Visão do produto

## Objetivo

Sistema Inteligente de Vazão de Água: monitoramento e controle de vazão de água
em tempo real para ambientes industriais, usando IoT para coletar, transmitir e
analisar dados de consumo hídrico por setor/equipamento.

Cadeia: `[YF-S201] → [ESP32] → [API Node.js/Express] → [MySQL] → [Dashboard Web]`
com display OLED SSD1306 local no ESP32. Hierarquia: Empresa → Setor → Ativo/ESP32 → Sensor → Leitura.

Fonte: `README.md`, `docs/README.md`.

## Problema

Gestão hídrica industrial tradicional depende de leituras manuais e periódicas:
detecção tardia de vazamentos e alto desperdício de água tratada. O SIVA permite
visualizar consumo por setor/equipamento, identificar padrões, detectar
vazamentos rápido e apoiar decisões (alinhado aos ODS).

## Público

- **Indústrias clientes**: gestores e funcionários que monitoram consumo e fazem
  manutenção interna (preventiva/inspeção).
- **Empresa fornecedora (vendedora)**: opera a plataforma e presta atendimento
  técnico via Chamado → Ordem de Serviço (PLANEJADO — ver `spec/business-rules/`).

Modelo: vendedora `super_admin + operador (planejado)`; cliente `admin/gestor +
funcionario (+ cargo planejado)`.

## Escopo

Monitoramento de vazão (ingestão, consulta), gestão de empresas/setores/ativos/
sensores/ESP32, usuários e permissões, manutenção interna avulsa (PARCIAL).

## Limites (não implementado — PLANEJADO)

Chamados, Ordens de Serviço, papel operador, cargo, motor de alertas
(`GET /alerts` retorna 501), agenda/recorrência, checklist, SLA, dashboard
operador. Detalhe: `docs/analise-regras-negocio.md` §§20–21.
