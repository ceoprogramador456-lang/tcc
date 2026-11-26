# SIVA — Front-end

Front-end público do SIVA (página inicial), autenticação, área administrativa e painel
operacional — todos ligados à API real do back-end.

## Stack

| Item | Versão |
|---|---|
| React | 19 |
| Vite | 8 |
| TypeScript | 6 |
| Tailwind CSS | 4 (`@tailwindcss/vite`) |
| React Router | 7 |
| Lucide React | 1 (ícones) |
| Motion | 13 (CountUp dos indicadores e lista animada de atividades) |
| Fontsource | Inter (texto) + Manrope (títulos) |
| Oxlint | lint |

## Como rodar

```bash
npm install

# terminal 1 — back-end (a API precisa estar no ar para o login funcionar)
cd .. && npm run dev:mock     # http://localhost:3000, sem MySQL

# terminal 2 — front-end
npm run dev                   # http://localhost:5173
```

O painel acessa `/api` na mesma origem em desenvolvimento e produção. Durante o desenvolvimento, o Vite encaminha as chamadas para o backend local. Em produção, configure o proxy da aplicação para encaminhar essa rota à API. Se o backend usar outro domínio, defina `VITE_API_URL` com a URL HTTPS completa, incluindo `/api`, antes do build. Para personalizar a configuração local, copie o exemplo.

```bash
cp .env.example .env
```

> A CORS do back-end é configurada por `CORS_ORIGIN` (ver `../.env.example`).
> O padrão do repositório já é `http://localhost:5173`.

### Credenciais de teste (modo mock do back-end)

| Perfil | E-mail | Senha | Acesso |
|---|---|---|---|
| Administrador | `super@siva.com` | `senha123` | `/admin` |
| Gestor (Aquaplás) | `carla.mendes@aquaplas.com` | `senha123` | `/painel` |
| Gestor (Metaltec) | `beatriz.nogueira@metaltec.com` | `senha123` | `/painel` |
| Técnico/Mecânico (SIVA) | `diego.ramos@siva.com` | `senha123` | `/tecnico` |
| Técnico/Eletricista (SIVA) | `marcos.vinicius@siva.com` | `senha123` | `/tecnico` |

## Scripts

```bash
npm run dev       # servidor de desenvolvimento
npm run build     # typecheck (tsc -b) + build de produção em dist/
npm run lint      # oxlint
npm run preview   # serve o build de produção
```

## Rotas

| Rota | Acesso | Descrição |
|---|---|---|
| `/` | público | Página inicial institucional |
| `/login` | público | Autenticação (redireciona por perfil) |
| `/admin` | ADMIN | Dashboard administrativo, Empresas, Usuários e Solicitações |
| `/painel` | GESTOR | Dashboard operacional (consumo, atividades) |
| `/painel/setores` | GESTOR | Setores da empresa + ativos do setor |
| `/painel/ativos` | GESTOR | Ativos, com vínculo por setor |
| `/painel/esp32` | GESTOR | Dispositivos, comunicação e pareamento por código |
| `/painel/sensores` | GESTOR | Sensores, ativação e estado de comunicação |
| `/painel/solicitacoes` | GESTOR | Ordens de serviço da empresa |
| `/painel/usuarios` | GESTOR | Equipe da própria empresa |
| `/tecnico` | TECNICO | Única tela: ordens de serviço designadas ao técnico |

O guard de rota (`<RequireAdmin>` / `<RequireAuthenticated>` / `<RequireTecnico>`) é apenas
UX: **a autorização real é sempre validada no back-end** (RBAC por `tipo` + isolamento
multiempresa + escopo por `funcionarioId` nas OS). O front esconde as ações que o servidor
recusaria — o `TECNICO`, por exemplo, só enxerga `/tecnico`.

## Contrato de autenticação

Confirmado em `../src/modules/auth` (back-end):

| Item | Valor |
|---|---|
| Endpoint | `POST /api/auth/login` |
| Body | `{ email: string, senha: string }` |
| Resposta 200 | `{ success: true, data: { token, user } }` |
| Erros | `401` credenciais inválidas · `403` usuário inativo · `422` validação (Zod) · `429` rate limit |
| Mecanismo | JWT stateless (HS256, 8h) via header `Authorization: Bearer <token>` |
| Sessão | `GET /api/auth/me` revalida o token ao abrir o app |

Não há cookie de sessão, refresh token nem logout no servidor: o front-end guarda o
JWT em `localStorage` (chave `siva.auth.session`) e o descarta no logout.

## Endpoints consumidos

| Recurso | Endpoints | Permissão |
|---|---|---|
| Dashboard | `GET /api/dashboard/overview` (`?empresaId=`), `GET /api/dashboard/admin-summary` | overview: autenticado · admin-summary: ADMIN |
| Setores | `GET /api/sectors?empresaId=`, `GET /:id`, `POST`, `PATCH /:id`, `DELETE /:id` | leitura: autenticado · escrita: ADMIN, GESTOR |
| Ativos | `GET /api/assets?empresaId=&setorId=&criticidade=`, `GET /:id`, `POST`, `PATCH /:id`, `DELETE /:id` | leitura: autenticado · escrita: ADMIN, GESTOR |
| ESP32 | `GET /api/devices`, `GET /pending`, `POST /pairing/:id/approve`, `POST /pairing/:id/reject`, `POST /:id/revoke`, `PATCH /:id`, `DELETE /:id` | consulta de cadastrados para usuários autenticados · pareamento e gestão para ADMIN e GESTOR |
| Sensores | `GET /api/sensors?empresaId=&ativoId=&esp32Id=&ativoStatus=`, `GET /:id`, `POST`, `PATCH /:id`, `DELETE /:id` | leitura: autenticado · escrita: ADMIN, GESTOR |
| Empresas / Usuários | `GET/POST/PATCH/DELETE /api/companies`, `/api/users`, `PATCH /api/users/:id/status` | ver `docs/API.md` |
| Ordens de serviço | `GET/POST /api/solicitacoes-servico`, `GET/PATCH /:id`, `POST /:id/aceitar`, `POST /:id/concluir` | GESTOR cria; ADMIN aceita/conclui; TECNICO vê só as suas |

Regras de negócio replicadas no front (o back-end continua sendo a fonte da verdade):
- todo usuário pertence a uma empresa (inclusive o `ADMIN`, vinculado à SIVA);
- empresa SIVA → `ADMIN` ou `TECNICO`; técnico exige especialidade;
- empresa cliente → somente `GESTOR`;
- o formulário de usuário é dinâmico: ao trocar a empresa, os perfis permitidos e o
  campo de especialidade se atualizam;
- e-mail duplicado → `409`; recursos com vínculos → `409` (usar inativação quando existir).

## Parear um ESP32

1. Abra **Dispositivos** com uma conta ADMIN ou GESTOR. Quando o ESP32 se conectar à API, a solicitação aparecerá em **Aguardando aprovação**. A tela atualiza essa lista a cada dez segundos após a resposta anterior.
2. Confira o MAC, clique em **Conferir código** e digite os seis algarismos exibidos no OLED.
3. Escolha o setor e o ativo monitorado, preencha o nome se desejar e clique em **Aprovar**. O dispositivo recebe a credencial diretamente da API e poderá enviar as leituras do sensor associado.
4. Para interromper o acesso, use **Revogar credencial** na linha do equipamento. Um ESP32 com o firmware de pareamento poderá solicitar nova aprovação. Quando o cadastro veio do firmware manual, a migração para o novo pareamento cria outro cadastro.

## Estado de comunicação

- `online` é calculado pelo back-end a partir de `ultimoContato` (janela de 10 minutos).
- "Estar cadastrado" ≠ "estar online": um sensor pode estar **ativo** com o ESP32 **offline**.
  As duas informações aparecem separadas na interface.

## Estrutura

```text
src/
  components/   # brand (logo) e ui (Button, DataTable, Modal, FormField, Pagination, ...)
  config/       # env (URL da API)
  features/
    admin/      # área administrativa (layout, guard, dashboard, empresas, usuários)
    auth/       # contexto, hooks, componentes e persistência da sessão
    landing/    # seções da página inicial
    panel/      # área operacional (layout, guard, dashboard, setores, ativos, esp32, sensores)
  hooks/        # use-async-data, use-count-up
  pages/        # LandingPage, LoginPage, ForbiddenPage, NotFoundPage
  services/
    api/        # cliente HTTP (fetch + normalização de erro)
    auth/ assets/ catalog/ companies/ dashboard/ devices/ sectors/ sensors/ users/
  types/        # contratos da API
  utils/        # cn, formatação pt-BR
```

A área administrativa e a operacional são carregadas sob demanda (`React.lazy`), isolando as
tabelas e as animações do bundle público.

## Identidade visual

Tokens centralizados em `src/index.css` (`@theme`, Tailwind CSS 4):

| Token | Hex | Uso |
|---|---|---|
| `yale-blue` | `#00487C` | azul institucional |
| `cool-sky` | `#4BB3FD` | destaques e links sobre fundo escuro |
| `blue-slate` | `#3E6680` | neutros |
| `dodger-blue` | `#0496FF` | botões principais |
| `bright-teal-blue` | `#027BCE` | elementos interativos e foco |

A escala `siva-50…950` deriva as superfícies escuras e neutras.

## Identidade (logo)

- `assets/logo.png` — arquivo original fornecido (1024×1024, RGBA).
- `src/assets/siva-logo.png` — mesmo arquivo com as margens transparentes
  removidas (recorte de bounding box do canal alfa; a arte não foi alterada).
- `public/siva-logo.png` — favicon quadrado (256×256) recortado da gota da marca.

## Observações de operação

- O back-end limita a **100 requisições por minuto** por IP (`RATE_LIMIT_MAX`).
  A UI trata o `429` com mensagem própria e botão desabilitado durante o envio.
- O servidor de produção precisa de fallback de SPA (redirecionar rotas desconhecidas
  para `index.html`).
