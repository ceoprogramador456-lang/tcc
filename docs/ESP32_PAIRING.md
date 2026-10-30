# ESP32: instalação, pareamento e primeira leitura

O MAC da interface Wi-Fi identifica a placa. O código no OLED permite que um ADMIN ou GESTOR confirme qual placa está instalando. O `X-Token` autentica as leituras após a aprovação. O MAC sozinho **não** prova identidade: a placa também gera uma chave privada aleatória de 256 bits para receber a credencial com segurança.

## O que já existia e o que mudou

| Parte | Base encontrada | Ajuste desta entrega |
| --- | --- | --- |
| Backend | Express/TypeScript, JWT, empresas/setores/ativos, CRUD de ESP32/sensores, ingestão `X-Token` | Módulo `src/modules/pairings`, aprovação atômica, revogação e preservação de histórico |
| Banco | MySQL/Prisma; identificação `esp_id` e hash do token | MAC opcional único, autorização de novo pareamento e sessões persistidas |
| Frontend separado | React/Vite com cadastro manual e painel | “Conectar ESP32”, confirmação pelo código, equipamento e atualização a cada 5 s |
| Firmware | Leitura de pulsos, OLED, WiFiManager e credenciais manuais | USB + NVS, código no OLED, entrega automática de credencial, HTTPS validado |
| Testes | Suíte de API usando adaptador em memória | Casos de pareamento, MySQL real e Playwright com API real em modo mock |

Prioridade de implantação: migration e configuração do backend → API → frontend → firmware. Os pontos de contrato são `prisma/schema.prisma`, `src/modules/pairings`, `src/modules/devices`, `siva-frontend/src/services/devices/pairing.service.ts` e `firmware/src/api_client.h`. A landing page não interfere no pareamento.

## 1. Preparar servidor e painel

1. Faça backup do banco existente. Configure `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN` com a origem do frontend e `DEVICE_PAIRING_SECRET` com um segredo exclusivo gerado por `openssl rand -hex 32`. Em produção a API exige o segredo de pareamento; mantenha o mesmo valor entre reinícios e réplicas.
2. Execute `npm ci`, `npx prisma generate`, `npx prisma migrate deploy` e `npm run build`. Inicie com `npm start`. Use migrations para preservar os dados; `db/db.sql` é somente referência de recriação e contém `DROP DATABASE`.
3. No frontend, configure `VITE_API_URL` conforme `siva-frontend/.env.example`, instale as dependências e faça o build. Cadastre empresa, setor e equipamento antes de conectar a placa.
4. Para demonstração sem MySQL, `npm run dev:mock` usa dados descartáveis. Reiniciar esse modo perde os cadastros; faça novo pareamento após reiniciar. O modo real preserva as sessões no MySQL.

## 2. Gravar o firmware

O protótipo configurado usa ESP32 DevKit (`esp32dev`), OLED SSD1306 I²C 128×64 em `0x3C` (SDA 21, SCL 22) e entrada de pulsos no GPIO 27. Confirme o modelo do seu OLED: tamanho de 0,96 polegada sozinho não identifica o controlador. Ajustes de pinos/calibração ficam em `firmware/src/config.h`; confira também a compatibilidade elétrica do circuito de pulsos antes de ligar o hardware.

```bash
python -m pip install platformio pyserial
python -m platformio run -d firmware
python -m platformio run -d firmware -t upload --upload-port COM4
```

No Linux, substitua `COM4` por sua porta, por exemplo `/dev/ttyUSB0`. Não há `ESP_ID`, senha de Wi-Fi ou token para editar no firmware. `flow_01` é o identificador lógico do canal de medição, não a identidade da placa.

## 3. Configurar rede uma vez pelo USB

Feche o Monitor Serial antes de executar:

```bash
python scripts/configure-esp32.py --port COM4 --ssid Escola --api-url http://192.168.1.10:3000/api
```

O script solicita a senha sem exibi-la e envia a configuração por USB. Use o IP do computador/servidor acessível pela placa, nunca `localhost`. A placa precisa alcançar a rede Wi-Fi e o backend; abrir o painel no navegador não configura a rede da ESP32.

HTTP é aceito somente com IP privado e serve para demonstração em rede confiável: nessa modalidade as credenciais trafegam sem criptografia. Para implantação use HTTPS e uma CA PEM confiável correspondente ao certificado do servidor:

```bash
python scripts/configure-esp32.py --port COM4 --ssid Escola --api-url https://siva.exemplo.com/api --ca certificado-raiz.pem
```

O firmware valida certificado e nome do servidor e sincroniza o relógio por NTP. Não usa `setInsecure`. A configuração e a credencial ficam em Preferences/NVS; este protótipo não habilita criptografia de flash/NVS contra extração física.

## 4. Aprovar e acompanhar

1. A placa conectada solicita pareamento e mostra um código como `AB12-CD34` por até 10 minutos. Se o OLED falhar, o código também aparece no USB a 115200 baud.
2. Entre como ADMIN ou GESTOR. Abra **Dispositivos → Conectar ESP32**, informe o código e clique em **Localizar placa**.
3. Confira o MAC, selecione o equipamento monitorado e clique em **Aprovar e conectar**. O backend deriva o setor e cria placa e sensor na mesma transação.
4. A placa consulta a aprovação, recebe `espId`, `sensorId` e token, salva tudo na NVS e confirma a entrega. O navegador nunca recebe o token deste fluxo.
5. As leituras usam o endpoint existente, a cada 5 segundos: `POST /api/readings`, cabeçalho `X-Token`, corpo `{ "esp_id": "esp_A4CF12345678", "sensor_id": "flow_01", "vazao": 8.25 }`. O painel atualiza automaticamente. “Online” mantém a regra existente: leitura recebida nos últimos 10 minutos.

Reiniciar a placa reutiliza a credencial salva. Uma resposta de aprovação perdida pode ser solicitada novamente com a mesma chave privada durante a janela de entrega; a placa salva antes de confirmar. Leituras durante indisponibilidade não são armazenadas para envio posterior nesta versão.

## 5. Editar, refazer pareamento e excluir

- **Editar:** permite descrição e mudanças de setor compatíveis com os sensores; o identificador gerado do MAC fica protegido.
- **Novo pareamento:** revoga o token imediatamente e autoriza um novo código. A placa percebe o `401` na próxima leitura, remove a credencial local e solicita pareamento. Selecione o equipamento já vinculado para preservar sensor e histórico. Reset não transfere a placa para outra empresa.
- **Excluir:** o backend retorna `409` enquanto existirem sensores vinculados. Use novo pareamento para recuperar uma placa mantendo os dados; não apague o histórico para trocar credenciais.
- **USB:** `{"command":"status"}` mostra o estado sem segredos. `{"command":"forget-pairing"}` apaga a credencial local, mas não substitui a autorização de novo pareamento no painel. Trocar a URL por USB também remove a credencial local para não enviá-la a outro servidor.

Dispositivos antigos sem MAC continuam aceitando `X-Token` e o cadastro legado por API continua disponível. Eles não ganham um MAC fictício na migration. Ao instalar o novo firmware, a placa recebe um cadastro novo; eventual unificação do histórico legado exige uma migração específica, sem apagar registros antigos.

## Contrato e falhas comuns

Todas as rotas abaixo ficam sob `/api/device-pairings`; detalhes e schemas estão no Swagger.

| POST | Autenticação | Resultado |
| --- | --- | --- |
| `/request` | `X-Pairing-Key` | 201 com código/validade; chave privada gerada pela placa |
| `/status` | `X-Pairing-Key` | PENDING, APPROVED com credencial, ou DELIVERED sem credencial |
| `/acknowledge` | `X-Pairing-Key` | 204 após salvar credencial |
| `/lookup` | JWT, ADMIN/GESTOR | Identidade da placa pelo código; sem segredos |
| `/approve` | JWT, ADMIN/GESTOR | 201 com dispositivo e sensor; valida empresa/equipamento |
| `/devices/:id/reset` | JWT, ADMIN/GESTOR | 204; revoga token e habilita pareamento |

`404`: código expirado/inexistente; a placa renova a chave e o código. `409`: placa já cadastrada, solicitação concorrente ou equipamento incompatível; autorize novo pareamento quando necessário. `429`: aguarde o limite; o firmware aumenta o intervalo. Falha de HTTPS: confira CA, URL e acesso ao NTP. OLED exibe recebimento somente após resposta de sucesso da API.

O limite global e os limites de pareamento usam IP e memória por processo. Para muitos dispositivos atrás de um mesmo NAT ou múltiplas réplicas, dimensione o limite global e adote armazenamento compartilhado de rate limit antes da expansão. Isso não altera o isolamento por empresa nem a autorização dos endpoints.

## Verificação

```bash
npm run typecheck
npm run lint
npm test
# Banco de testes MySQL isolado, com DATABASE_URL configurada:
npx prisma migrate deploy
npm run test:mysql
# Na pasta siva-frontend:
npx playwright install chromium
npm run test:e2e
# Na raiz:
python -m platformio run -d firmware
```

Playwright simula a placa por HTTP e usa o painel real; não valida rádio, NVS física, OLED ou calibração. O aceite em bancada deve confirmar: USB → Wi-Fi → código OLED → aprovação → primeira leitura → desligar/ligar sem novo cadastro → revogar → novo pareamento → token antigo rejeitado e histórico mantido.
