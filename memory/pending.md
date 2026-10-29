# Pending Decisions

Aguardando definição. Itens 1–7 são do domínio de negócio (back-end); 8–12 surgiram com a
construção do front-end (2026-10-21).

1. Operador: todas as clientes ou só atribuídas? Quem atribui?
2. Quem abre Chamado (funcionário direto ou só via gestor)? Quem vê quais chamados?
3. Cardinalidade Chamado→OS (1-N ou 1-1)? OS sem chamado permitida?
4. Corretiva interna do sensor permitida ou só via OS?
5. Renomear `admin_empresa` → `gestor` (ou alias)? → RESOLVIDO 2026-10-13:
   `ADMIN|GESTOR|TECNICO` + `especialidade MECANICO|ELETRICISTA` implementados
   (migration `db/migrations/001_roles_status.sql`).
6. SLA/prioridade/custo/anexos obrigatórios?
7. MySQL × Postgres; `db.sql` × Prisma como fonte da verdade?

## Front-end (2026-10-21)

8. Área do `GESTOR`/`TECNICO` no painel: o que cada perfil vê e edita
   (leituras de vazão, chamados/OS, ativos)? Sem isso o front cobre só ADMIN.
9. Refresh token / reautenticação: hoje o JWT expira em 8 h e o front volta ao login.
   Adotar refresh token no back-end ou aceitar? (ver PROB-013)
10. Recuperação de senha e e-mail transacional: hoje só o ADMIN troca a senha
    (`PATCH /users/:id`) — falta fluxo "esqueci minha senha".
11. Identidade visual: as imagens de referência não chegaram ao ambiente de execução e o
    front-end original não está no workspace. Confirmar paleta/medidas/pesos reais?
12. Tema claro/escuro: hoje há um tema claro (área admin) e um escuro (público/login).
    Unificar em um tema comutável?
13. Idioma: interface 100% em pt-BR. Confirmar ou prever i18n?
