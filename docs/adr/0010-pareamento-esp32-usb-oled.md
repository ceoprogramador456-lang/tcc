# ADR 0010 — Pareamento ESP32 por USB, OLED e credencial privada

Status: implementado nesta proposta; depende de revisão e validação em bancada antes da implantação.

## Contexto

O protótipo exigia identificador/token no firmware e portal Wi-Fi. A instalação solicitada configura rede por USB e usa o OLED para pareamento, mantendo frontend separado e o contrato de telemetria existente.

## Decisão

Usar MAC Wi-Fi como identificador estável, código curto no OLED para aprovação por ADMIN/GESTOR e chave aleatória privada de 256 bits para autenticar a entrega da credencial. A API persiste a sessão em MySQL, aprova via transação e deriva uma credencial com HMAC-SHA256 usando segredo de servidor e identificador único da sessão. Somente hashes de código, chave privada e token são persistidos. A derivação permite reentrega após perda de resposta sem guardar o token em claro; o segredo do servidor deve ser protegido e compartilhado entre réplicas.

Salvar a credencial na NVS antes da confirmação. Usar HTTPS com verificação de CA/nome; permitir HTTP apenas em IP privado para bancada. O segredo de pareamento é obrigatório em produção. Rotacioná-lo durante sessões ativas interrompe essas entregas; tokens já recebidos continuam válidos pelo hash.

## Consequências

O navegador não recebe tokens de placas pareadas. A migration adiciona MAC opcional para preservar dispositivos legados. Novo pareamento mantém sensor/histórico e requer autorização; exclusão com sensores retorna conflito. O MAC não é atestação criptográfica do hardware; posse do código e aprovação humana são parte do modelo de confiança. NVS sem criptografia não protege contra acesso físico à flash. Rate limit é por IP/processo e deve ser ampliado para implantação com muitos dispositivos/réplicas. Esta versão não mantém fila de leituras offline.

Guia operacional: [ESP32_PAIRING.md](../ESP32_PAIRING.md). Caso de uso: [pareamento-esp32.md](../../spec/use-cases/pareamento-esp32.md).
