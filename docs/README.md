# Documentação do SIVA — Backend

Índice de toda a documentação técnica do backend. O [README.md](../README.md) na raiz é a porta de entrada rápida (o que é, como instalar, como rodar); os documentos abaixo aprofundam cada assunto.

| Documento | Conteúdo |
| --- | --- |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Camadas, arquitetura hexagonal, estrutura de pastas, papel de cada módulo |
| [DATABASE.md](./DATABASE.md) | Diagrama entidade-relacionamento, tabelas, chaves, índices, constraints |
| [BUSINESS_FLOWS.md](./BUSINESS_FLOWS.md) | Fluxos de negócio (cadastro, ingestão de leitura, login) e regras de negócio |
| [API.md](./API.md) | Guia de uso da API REST com exemplos de request/response por recurso |
| [AUTHENTICATION.md](./AUTHENTICATION.md) | Autenticação de usuários (JWT) e de dispositivos ESP32 (X-Token), papéis e permissões |
| [SECURITY.md](./SECURITY.md) | Postura de segurança: o que está implementado, o que é gap conhecido |
| [ERROR_HANDLING.md](./ERROR_HANDLING.md) | Formato de erro, catálogo de códigos, como tratar cada um no frontend |
| [OBSERVABILITY.md](./OBSERVABILITY.md) | Logs estruturados (Pino), níveis, health check, o que falta em métricas/tracing |
| [TESTING.md](./TESTING.md) | Como rodar os testes, estratégia de cobertura, como escrever um novo teste |
| [DEVELOPMENT.md](./DEVELOPMENT.md) | Guia do dia a dia: criar módulo, criar rota, migration, convenções de branch/commit |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Deploy (Docker/Compose/Caddy), pipeline de CI/CD, estratégia de versionamento |
| [RUNBOOK.md](./RUNBOOK.md) | O que fazer quando algo dá errado em produção (guia de operação) |
| [adr/](./adr/README.md) | Architecture Decision Records — por que cada decisão técnica importante foi tomada |

## Convenção usada nestes documentos

O SIVA está na sua primeira etapa (bootstrap da arquitetura — ver `README.md`). Sempre que um documento descrever algo que **ainda não foi implementado**, ele é marcado explicitamente como:

> 🚧 **Não implementado nesta etapa.**

Isso é intencional: a ideia é documentar o sistema real, não um sistema aspiracional. Itens marcados assim aparecem também na lista de "Próximas etapas" do README raiz.
