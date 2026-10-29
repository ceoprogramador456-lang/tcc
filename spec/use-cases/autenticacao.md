# UC: Autenticação

- **Objetivo**: identificar usuário do dashboard e emitir credencial de acesso.
- **Ator**: usuário (super_admin, admin_empresa, funcionario).
- **Pré-condições**: usuário cadastrado com senha ≥ 8 chars (hash bcrypt).
- **Fluxo**: `POST /api/auth/login {email, senha}` → `bcrypt.compare` →
  `200 {token JWT, user}` → cliente usa `Authorization: Bearer <jwt>` →
  `authenticateUser` valida e popula `req.user`.
- **Resultado**: JWT HS256 (`JWT_SECRET`, exp. `JWT_EXPIRES_IN=8h`) com
  `{id, email, tipo, empresaId}`; `GET /api/auth/me` retorna o perfil.
- **Regras**: JWT stateless, sem revogação/logout backend; falha vira 401 sem
  distinguir motivo. Detalhe: `docs/AUTHENTICATION.md`.
