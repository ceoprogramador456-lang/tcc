# 0004 — Dois mecanismos de autenticação: JWT para usuário, X-Token para dispositivo

**Status**: aceito

## Contexto

O sistema tem dois tipos de "cliente" fundamentalmente diferentes batendo na mesma API: uma pessoa usando o dashboard (que faz login, tem papel/permissão, sessão de horas) e um ESP32 enviando leituras em loop contínuo (sem tela, sem "logar", só uma credencial fixa gravada no firmware). O README original do projeto já previa `X-Token` como mecanismo de autenticação do firmware antes do backend existir.

## Decisão

Dois middlewares de autenticação independentes (ambos em [`auth.middleware.ts`](../../src/middlewares/auth.middleware.ts)):

- `authenticateUser` — JWT assinado (`HS256`) no header `Authorization: Bearer <token>`, emitido por `POST /api/auth/login` após validar e-mail/senha.
- `authenticateDevice` — um token fixo, gerado pelo backend na criação do dispositivo, comparado por igualdade direta no header `X-Token`.

Nenhuma rota aceita os dois métodos ao mesmo tempo — ver mapeamento completo em [AUTHENTICATION.md](../AUTHENTICATION.md).

## Alternativas consideradas

- **Um único mecanismo (JWT) para tudo**, incluindo o ESP32: descartado — obrigaria o firmware (C/C++, recursos limitados) a implementar um fluxo de obtenção/renovação de token JWT, complexidade desproporcional para um dispositivo que só faz uma chamada (`POST /readings`) repetidamente com uma credencial que não muda.
- **mTLS (certificado por dispositivo)**: mais robusto, mas exigiria gerenciar uma PKI e provisionar certificado em cada ESP32 — infraestrutura fora do escopo de um MVP de TCC, com o ESP32 real fazendo requisições HTTP simples via biblioteca Arduino padrão.
- **API key genérica compartilhada entre todos os dispositivos**: descartado — não permitiria identificar/revogar um ESP32 individualmente nem saber, pela credencial, de qual dispositivo veio a leitura (o `X-Token` atual já resolve isso ao mapear 1:1 para uma linha de `esp32`).

## Consequências

- ✅ O firmware do ESP32 fica simples: um header fixo em toda requisição, sem lógica de expiração/refresh.
- ✅ Cada leitura é rastreável ao dispositivo exato que a enviou (`req.device.id`), permitindo a checagem cruzada `payload.esp_id === device.espId` (ver [BUSINESS_FLOWS.md](../BUSINESS_FLOWS.md#fluxo-3--ingestão-de-leitura-pelo-esp32)).
- ⚠️ Como documentado em [SECURITY.md](../SECURITY.md#credenciais-de-dispositivo-x-token), essa simplicidade tem custo: o token não expira, não é rotacionável via API, e fica em texto plano no banco — diferente do JWT (que expira) e da senha do usuário (hasheada). Foi uma escolha consciente de custo/benefício para esta etapa, não um descuido — mas é uma dívida técnica registrada, não esquecida.
