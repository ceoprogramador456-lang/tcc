# Refatoração do frontend (siva-frontend) — plano e issues

Referência: guia do sistema de design "Biblioteca TRP"
(https://claude.ai/artifact/XEobATgka7DTgDPcCbhmBH?sk=2QeVTv3svd1kWkUFQqdrug).

Princípios do guia aplicados ao SIVA:

- Quatro camadas (tokens → primitivos → componentes → telas); cada camada só usa a de baixo.
- Escada de superfícies: página, painel, cartão e bloco usam degraus vizinhos; profundidade vem do contraste, não de sombra (sombra só em menu, diálogo e item arrastado).
- Uma única cor de ação, só para o principal e o foco. Cores semânticas (fundo + texto) escolhidas pelo significado. Vermelho só para erro e ação destrutiva.
- Sempre variável de tema, nunca hexadecimal. Tema claro e escuro.
- Altura de controle única (32 px); raio de fora = raio de dentro + espaço.
- Contraste: texto 4,5:1; foco e ícones informativos 3:1.
- Movimento curto, sem mola; só indicadores de espera se repetem; respeitar `prefers-reduced-motion`.

Estado atual (levantado em 2026-11-27): Tailwind v4, tokens em `src/index.css` (paleta SIVA + `slate-*`),
~300 usos de cores literais (`text-slate-500`, `border-slate-200`, `bg-white`…), 0 usos de `dark:`,
componentes base em `src/components/ui/` (13 arquivos), layouts em `src/features/{admin,panel}/layout/`.

Decisão pendente (issue 1): o guia é da marca TRP Imports; o SIVA tem paleta própria (yale-blue / dodger-blue).
Adota-se a **estrutura** do guia (tokens semânticos, camadas, regras) mantendo a paleta SIVA, salvo decisão em contrário.

---

## Issue 1 — Tokens semânticos e escada de superfícies

Criar tokens semânticos em `src/index.css` (`--bg-*`, `--font-*`, `--border-*`, `--accent-*`, `--tag-*`, `--bg-danger`) mapeados para utilitários Tailwind (`bg-paper`, `text-ink`, `border-line`…). Definir a paleta SIVA como fonte dos valores e documentar a decisão sobre a marca.
- [ ] Escada de superfícies (shell, página, painel, cartão, bloco)
- [ ] Oito cores semânticas com fundo e texto
- [ ] Documentar tokens e a decisão de paleta
Bloqueia as issues 2–8.

## Issue 2 — Tema claro e escuro

Hoje não há `dark:` nem alternância. Implementar `data-theme`, respeitar `prefers-color-scheme`, persistir a escolha (com fallback se o storage falhar) e botão de alternância no topbar.
- [ ] Valores claro/escuro de todos os tokens
- [ ] Alternância e persistência
- [ ] Sem flash de tema incorreto no carregamento

## Issue 3 — Substituir cores literais por tokens

Trocar `slate-*`, `white`, `red-*`, `siva-*` literais por tokens em `src/` (≈300 ocorrências, ver `grep`).
- [ ] features/admin
- [ ] features/panel
- [ ] pages e landing
- [ ] Regra de lint/CI proibindo cor literal nova

## Issue 4 — Altura, raio e espaçamento

Padronizar altura de controle (32 px compacta; maior só quando justificado), raio aninhado e escala de espaço em botões, campos, selects e badges.
- [ ] `button-styles.ts`, `form-styles.ts`, `field-styles.ts`
- [ ] Botão e campo lado a lado alinhados sem ajuste

## Issue 5 — Componentes de formulário e ação

Revisar `Button`, `FormField`, `TextField`, `PasswordField`: variantes (principal, secundário, fantasma, destrutivo), estados (hover, foco, desabilitado, carregando, erro) e uma única cor de ação.
- [ ] Variantes e estados documentados
- [ ] Foco visível 3:1 e rótulos/erros acessíveis
- [ ] Preservar comportamentos já corrigidos (Enter, foco, "Todos")

## Issue 6 — Feedback, diálogos e dados

`AlertMessage`, `Badge`, `Modal`, `ConfirmDialog`, `DataTable`, `Pagination`, `EmptyState`, `LoadingBlock`: tokens, sombra só em diálogo/menu, skeletons no lugar de blocos vazios, aviso no canto sem tirar o foco.
- [ ] Skeleton de carregamento (único movimento repetido)
- [ ] Estados vazio/erro/carregando consistentes
- [ ] Preservar foco preso e retorno de foco nos diálogos

## Issue 7 — Shell: sidebar, topbar e páginas de contexto

`AdminLayout`/`PanelLayout`, `*Sidebar`, `*Topbar`, `PageContext`, `SectionHeading`: degraus de superfície, navegação responsiva (390 px sem transbordo), alternância de tema.
- [ ] Layouts admin e painel
- [ ] Menu mobile
- [ ] Manter rotas e permissões por perfil

## Issue 8 — Dashboards e métricas

`StatCard`, `MetricCard`, `ActivityFeed`, dashboards admin/painel: hierarquia por tamanho e peso (não por cor), cor só com significado, unidades L/min × litros mantidas.
- [ ] Cartões de métrica
- [ ] Feed de atividades
- [ ] Contraste nos dois temas

## Issue 9 — Login, landing e páginas de erro

`LoginPage`, `LandingPage` (+ `landing-cinematic.css`), `ForbiddenPage`, `NotFoundPage`: aplicar tokens e tema; manter a identidade visual da landing.
- [ ] Login
- [ ] Landing (movimento reduzido incluído)
- [ ] 403/404

## Issue 10 — Movimento e acessibilidade

Auditar animações (`motion`): curtas, sem mola, repetição só em espera; `useReducedMotion` nos componentes animados (hoje só 11 ocorrências de reduced-motion); contraste 4,5:1 / 3:1 nos dois temas.
- [ ] Revisão de animações
- [ ] Verificação de contraste
- [ ] Navegação por teclado

## Issue 11 — Verificação visual e documentação

Capturas Playwright (claro/escuro, 1280 e 390 px) por perfil (administrador, gestor, técnico); atualizar `siva-frontend/README.md` e `REVISAO-FRONTEND.md`.
- [ ] Roteiro Playwright com `MOCK_MODE=true`
- [ ] Build e lint verdes
- [ ] Documentação de tokens e componentes
