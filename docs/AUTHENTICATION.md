# Autenticação e Autorização

O sistema tem **dois mecanismos de autenticação independentes**, para dois tipos de cliente completamente diferentes:

| | Usuário do dashboard | Dispositivo ESP32 |
| --- | --- | --- |
| Credencial | e-mail + senha → JWT | `token` fixo gerado no cadastro |
| Header | `Authorization: Bearer <jwt>` | `X-Token: <token>` |
| Middleware | [`authenticateUser`](../src/middlewares/auth.middleware.ts) | [`authenticateDevice`](../src/middlewares/auth.middleware.ts) |
| Usado em | quase todas as rotas de `/api` | só `POST /api/readings` |
| Identifica | uma pessoa, com papel (`tipo`) e empresa | um ESP32 específico, com setor |

Os dois nunca se misturam na mesma rota — ver a lista completa em [API.md](./API.md#catálogo-de-endpoints).

## Autenticação de usuário (JWT)

```mermaid
sequenceDiagram
    participant U as Cliente (dashboard)
    participant API as API
    U->>API: POST /api/auth/login { email, senha }
    API->>API: bcrypt.compare(senha, hash)
    API-->>U: 200 { token, user }
    Note over U: token guardado pelo cliente (não é cookie)
    U->>API: GET /api/sectors<br/>Authorization: Bearer <token>
    API->>API: jwt.verify(token, JWT_SECRET)
    API-->>U: 200 (dados escopados por empresa)
```

- O token é assinado com `HS256` (padrão da lib `jsonwebtoken`), segredo em `JWT_SECRET`, validade em `JWT_EXPIRES_IN` (default `8h`).
- **Payload do JWT** (visível — JWT não é criptografado, só assinado; nunca coloque dado sensível aqui):
  ```json
  { "id": 2, "email": "carla.mendes@aquaplas.com", "tipo": "GESTOR", "empresaId": 1, "iat": ..., "exp": ... }
  ```
- `authenticateUser` (em [`auth.middleware.ts`](../src/middlewares/auth.middleware.ts)) lê o header `Authorization`, exige o prefixo `Bearer `, valida assinatura e expiração, consulta o usuário no banco e popula `req.user` com os dados atuais. Token inválido/expirado ou usuário removido retorna `401`; usuário inativo retorna `403`.
- Não há armazenamento de sessão no servidor: é um JWT stateless clássico. O logout descarta o token no cliente. Em cada requisição protegida, o back-end consulta o usuário atual para aplicar status, papel e empresa vigentes; usuários excluídos ou inativos são bloqueados e alterações de papel/empresa têm efeito imediato. Não há blacklist nem revogação geral por troca de senha — ver [SECURITY.md](./SECURITY.md#tokens-jwt-sem-revogação).

## Autorização por papel (roles)

Três papéis, definidos na coluna `usuario.tipo`, com status `ATIVO|INATIVO` (inativo não faz login — `403 FORBIDDEN` — e é barrado em recursos protegidos):

| Papel | Escopo | O que só ele pode fazer |
| --- | --- | --- |
| `ADMIN` | todas as empresas (`empresaId = NULL`, sem especialidade) | CRUD de empresas; criar `ADMIN`/`GESTOR`/`TECNICO`; editar qualquer usuário; ativar/inativar; deletar usuário; dashboard admin |
| `GESTOR` | só a própria empresa (`empresaId` obrigatório, sem especialidade) | CRUD de setores/ativos/ESP32s/sensores da empresa; leitura de usuários da própria empresa |
| `TECNICO` | só a própria empresa + especialidade `MECANICO\|ELETRICISTA` obrigatória | ver dados, abrir/atualizar chamados de manutenção |

Aplicado em duas camadas, sempre nessa ordem:

1. **`authorize(...papéis)`** (middleware, por rota) — checagem grosseira, antes de tocar em qualquer dado: "esse papel pode nem tentar chegar aqui". Ex.: `sectorRoutes.post('/', authorize('ADMIN', 'GESTOR'), ...)`.
2. **`assertSameCompany(user, recurso.empresaId)`** (dentro do service, depois de já ter buscado o recurso) — checagem fina: "mesmo sendo `GESTOR`, isso é da empresa desse usuário?". Está em [`shared/auth/scope.ts`](../src/shared/auth/scope.ts):
   ```ts
   export function assertSameCompany(user: AuthenticatedUser, empresaId: number | null): void {
     if (isAdmin(user)) return;
     if (user.empresaId === null || user.empresaId !== empresaId) {
       throw new ForbiddenError('Você não tem acesso aos dados desta empresa.');
     }
   }
   ```

Para recursos que não têm `empresaId` direto (ativo, ESP32, sensor, leitura, manutenção), a checagem "sobe" a cadeia da hierarquia até achar o setor e, a partir dele, a empresa — ver o diagrama em [ARCHITECTURE.md](./ARCHITECTURE.md#multi-tenant-como-o-isolamento-entre-empresas-é-aplicado).

## Autenticação de dispositivo (X-Token)

```mermaid
sequenceDiagram
    participant FW as Firmware ESP32
    participant API as API
    FW->>API: POST /api/readings<br/>X-Token: dev-token-esp01
    API->>API: findByToken(token) na tabela esp32
    alt não encontrado
        API-->>FW: 401 UNAUTHORIZED
    else encontrado
        API->>API: req.device = { id, espId, setorId }
        API-->>FW: 201 Created
    end
```

- O `token` é gerado pelo backend no momento do `POST /api/devices` (não é escolhido pelo cliente) e só aparece **naquela** resposta — ver [API.md](./API.md#3-criar-um-esp32-token-só-aparece-aqui).
- **Armazenamento por hash (2026-10-21)**: o banco guarda apenas o SHA-256 do token
  (`esp32.token_hash CHAR(64)`). O `authenticateDevice` calcula o hash do `X-Token` recebido e
  busca pelo hash. O token é gerado com `randomBytes(24)` (entropia criptográfica) e o hash
  nunca sai do back-end. Migration: `db/migrations/002_device_token_hash.sql`.
- Não tem validade (não expira sozinho) nem escopo de permissão — um X-Token válido só serve para uma coisa: `POST /api/readings` em nome daquele ESP32 específico.
- `authenticateDevice` não usa JWT nem assinatura: é uma busca pelo hash do token na tabela `esp32` (`findUnique`). O hash serve de indexador único, então a comparação não é por igualdade sobre o segredo em si.
- O estado **online/offline** de um dispositivo deriva de `esp32.ultimo_contato`, atualizado a cada leitura aceita. A janela usada pelo back-end é de 10 minutos (`DEVICE_ONLINE_WINDOW_MS`): acima disso, o dispositivo é considerado offline — estar cadastrado não significa estar online.

## Registro e troca de senha

- Não existe endpoint de **auto-registro**: usuários só são criados por um `ADMIN` via `POST /api/users` (ver regras em [BUSINESS_FLOWS.md](./BUSINESS_FLOWS.md#usuário)).
- Não existe fluxo de "esqueci minha senha" (envio de e-mail, token de reset). A única forma de trocar senha hoje é `PATCH /api/users/:id` (somente ADMIN) enviando o campo `senha`.
- 🚧 **Não implementado nesta etapa**: recuperação de senha por e-mail, MFA/2FA, refresh token (o cliente reloga quando o JWT expira).
# Pareamento automático ESP32

O novo firmware usa [USB + OLED](ESP32_PAIRING.md). `X-Pairing-Key` autentica a sessão temporária da placa; o código no OLED confirma a seleção no painel. Após aprovação, a placa recebe o `X-Token` e o guarda na NVS. O navegador não recebe esse token. As seções de criação manual permanecem como referência do contrato legado.
