# Parear ESP32 ao SIVA

Ator humano: ADMIN ou GESTOR com acesso ao equipamento. Ator de máquina: placa conectada à rede, com MAC Wi-Fi unicast e segredo aleatório próprio. Pré-condições: empresa, setor e equipamento cadastrados; API alcançável; configuração Wi-Fi por USB.

1. Sem credencial, a placa persiste uma chave de 256 bits e solicita código de 8 caracteres, válido por 10 minutos.
2. O instalador lê o código no OLED, encontra a placa no painel e escolhe equipamento acessível à sua empresa.
3. O servidor aprova uma única vez e vincula dispositivo e sensor atomicamente ao setor do equipamento.
4. Somente a placa que possui a chave privada obtém a credencial. Salva em NVS antes do acknowledge; tentativas repetidas recuperam entrega perdida durante sua validade.
5. Leituras autenticadas preservam `POST /api/readings` e o contrato `esp_id`, `sensor_id`, `vazao`. Reinício reutiliza a NVS.

Estados persistidos: PENDING → APPROVED → DELIVERED. Solicitações expiradas exigem chave e código novos. Novo pareamento revoga o token anterior, preserva os IDs/histórico e precisa de nova aprovação por usuário autorizado. Código é prova de acesso ao display, não a credencial das leituras. MAC é identificador e não segredo.

Critérios: rejeitar usuário sem autenticação/papel; impedir acesso a equipamento/dispositivo de outra empresa; rejeitar MAC inválido, chave errada, código expirado e aprovações duplicadas; não retornar token ao navegador; persistir sessões no banco real; confirmar ingestão/estado online no painel; manter compatibilidade de placas legadas.
