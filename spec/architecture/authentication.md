# Arquitetura: autenticação

- **Estado atual**: dois mecanismos independentes, nunca misturados na mesma
  rota: usuários via JWT (`Authorization: Bearer`, HS256, `JWT_SECRET`,
  exp. `8h`, `authenticateUser` → `req.user {id, email, tipo, empresaId}`);
  ESP32 via token fixo (`X-Token`, `authenticateDevice` → `req.device`), usado
  só em `POST /readings`. Sem sessão servidora, sem logout/revogação.
  Detalhe: `docs/AUTHENTICATION.md`.
- **Estado planejado**: `JWT_SECRET` obrigatório em prod; hash do
  `device.token`; revalidação JWT crítica; avaliar refresh/MFA (P3).
