# Pareamento de um medidor SIVA

Ao ligar uma placa nova, o operador precisa ter acesso ao display do medidor e ao painel da empresa. O setor deve existir. A aprovação cria o ESP32 e o primeiro sensor na mesma transação, com um ativo existente ou um ativo criado nessa etapa.

## Preparar a instalação

1. Configure a API com Node.js 22, MySQL 8.4 e as variáveis da instalação. `PAIRING_COMPANY_ID` é o ID de uma empresa existente. A API associa a descoberta à empresa configurada no servidor. Em instalações de empresas diferentes que compartilhem o banco, direcione cada placa ao endereço da API da sua instalação.
2. Gere `PAIRING_KEY` com `openssl rand -hex 32` e guarde-a com os segredos do servidor. As réplicas que atendem a mesma instalação precisam compartilhar a chave entre reinicializações. A troca da chave durante a aprovação pode invalidar códigos e retiradas em andamento. Use um `JWT_SECRET` independente, aleatório e com pelo menos 32 caracteres em produção.
3. Em uma instalação Prisma existente, use `npm ci`, `npm run prisma:generate` e `npm run prisma:deploy`. A migração acrescenta colunas opcionais a `esp32` e cria `device_pairing`. Se o banco foi instalado pelo conjunto SQL manual e já recebeu a migração 002, aplique `db/migrations/003_device_pairing.sql` uma vez pelo mesmo processo. Ao atualizar dados existentes, use apenas a trilha de migração que já administra esse banco.
4. Para a implantação com Caddy, aponte o DNS de `SIVA_API_DOMAIN` para o servidor, disponibilize as portas 80 e 443 e configure também `MYSQL_ROOT_PASSWORD`, `JWT_SECRET`, `CORS_ORIGIN`, `PAIRING_COMPANY_ID` e `PAIRING_KEY`. Para o compose fornecido, uma senha MySQL aleatória em hexadecimal pode ser usada diretamente na URL de conexão. Execute `docker compose -f docker-compose.enterprise.yml up -d --build`. O proxy recebe HTTPS e é a única entrada pública para a API. O compose define um salto confiável entre eles. Cadastre a empresa e o setor antes de ligar as placas.
5. Sirva o painel por HTTPS. Quando o domínio da API for diferente do domínio do painel, defina `VITE_API_URL=https://<domínio-da-api>/api` antes de compilar o frontend e permita a origem do painel em `CORS_ORIGIN`.
6. Em `firmware/src`, copie `secrets.h.example` para `secrets.h`. Em `API_HOST`, use o nome que consta no certificado do servidor. `API_PORT` tem padrão 443. Obtenha o certificado público da CA raiz que assina a cadeia do servidor da sua instalação. Para uma CA pública, use o repositório oficial da autoridade certificadora. Para uma CA interna, solicite o PEM público ao administrador da instalação. Cole o PEM completo, incluindo `BEGIN CERTIFICATE` e `END CERTIFICATE`, em `API_ROOT_CA` usando `R"PEM(...)PEM"`. O servidor precisa apresentar os certificados intermediários da cadeia. Use apenas o nome DNS em `API_HOST`, sem esquema ou caminho. A placa precisa conseguir sincronizar o relógio por NTP para validar a conexão. O arquivo de exemplo acompanha o firmware e o arquivo local fica fora do Git. Com o PlatformIO, use `pio run -d firmware` para compilar e `pio run -d firmware -t upload` para gravar a placa selecionada.

## Cadastrar um equipamento

1. Ligue a placa. Se ela já tem rede salva, vai tentar conectar automaticamente. Quando o OLED pedir configuração, conecte a placa por USB e envie pelo monitor serial a 115200 baud uma linha JSON terminada em LF ou CRLF no formato `{"ssid":"nome-da-rede","password":"senha-da-rede"}`. O SSID deve ter de 1 a 32 bytes. Use senha vazia para rede aberta, senha de 8 a 63 caracteres ASCII imprimíveis ou PSK hexadecimal de 64 dígitos. Após conectar e alcançar a API, o ESP32 mostra no OLED um código de seis algarismos, válido por dez minutos.
2. Abra **Dispositivos** com uma conta de gestor da empresa ou de administrador. A lista **Aguardando aprovação** se atualiza quando chegam notificações da API e também consulta as pendências a cada dez segundos. Localize o MAC da placa e selecione **Conferir código**.
3. Digite o código do OLED e escolha o setor. Selecione o ativo monitorado ou crie um novo com o nome. Se o setor já tiver um ativo com aquele nome, selecione-o na lista. Você pode dar um nome ao medidor. Clique em **Aprovar**.
4. A placa retira a credencial individual por HTTPS, grava-a na NVS e confirma a gravação. Após a primeira leitura aceita, confira o setor, o último contato e o estado de conexão no painel. A janela de conexão é de dez minutos.

A reconfiguração usa o mesmo comando USB e pressupõe acesso físico autorizado. Desative o eco e a gravação de sessão no monitor serial antes de enviar a senha. O firmware grava a configuração em NVS antes de tentar a nova rede. Uma falha de conexão mantém a rede cadastrada e a credencial SIVA. Caso o SSID ou a senha estejam incorretos, envie a configuração corrigida pelo USB.

## Contrato entre a placa, o painel e a API

As rotas abaixo têm o prefixo `/api/devices`. Respostas de sucesso com corpo usam `{ "success": true, "data": ... }`. As respostas de falha incluem `error.code` e `error.message`. Envie os segredos em cabeçalhos e o código em corpo JSON.

| Chamada | Identificação | Resultado |
| --- | --- | --- |
| `POST /discovery` | `X-Pairing-Secret` com 32 bytes aleatórios em hexadecimal, gerados pela placa | Recebe `mac`, `firmwareVersion`, `model`, `sensorId`. Retorna `sessionId`, `code` e `expiresAt`. A repetição com a mesma sessão recupera o código. |
| `GET /pending` | JWT de ADMIN ou GESTOR | Lista pendências visíveis ao usuário, com identificador de sessão, equipamento, sensor, empresa e validade. |
| `GET /events` | JWT no cabeçalho `Authorization` | Abre um stream SSE para atualizar o painel. O corpo de cada evento é `{}`. |
| `POST /pairing/:id/approve` | JWT de ADMIN ou GESTOR | Recebe `code`, `setorId`, `ativoId` ou `novoAtivo` e `descricao` opcional. Devolve o cadastro público. |
| `POST /pairing/:id/reject` | JWT de ADMIN ou GESTOR | Encerra a solicitação com HTTP 204. |
| `POST /pairing/status` | Segredo temporário e `{ "sessionId": "…" }` | Devolve `pending`, `approved`, `rejected` ou `expired`. |
| `POST /credentials` | Segredo temporário e `sessionId` | Devolve `token` e `espId`. Após a aprovação, a placa tem dez minutos para retirar a credencial. Pode repetir a retirada se perder a resposta. |
| `POST /pairing/ack` | `X-Token` da placa e `sessionId` | Confirma a gravação em NVS e encerra a retirada. Repetir a confirmação devolve 204. |
| `GET /me` | `X-Token` | Valida a credencial salva e retorna o `espId`. |
| `POST /:id/revoke` | JWT de ADMIN ou GESTOR | Invalida a credencial e mantém dispositivo, sensor e histórico. |

As leituras continuam em `POST /api/readings`, com `X-Token` e os campos `esp_id`, `sensor_id` e `vazao`. O MAC identifica a placa. O conhecimento do segredo temporário permite retirar a credencial da sessão aprovada. O código do OLED comprova o acesso físico de quem autoriza.

Exemplo de corpo para aprovar e criar um ativo no setor selecionado. Para usar um ativo existente, envie `ativoId` no lugar de `novoAtivo`.

```json
{
  "code": "012345",
  "setorId": 1,
  "novoAtivo": { "nome": "Bomba de reúso" },
  "descricao": "Medidor da saída"
}
```

As notificações `device:discovered`, `device:approved`, `device:rejected` e `device:revoked` são visíveis a administradores e gestores no escopo da sessão. `device:online` e `device:offline` também chegam a técnicos da empresa. A lista usa as rotas REST para obter os dados. Cada instância da API publica suas próprias notificações. As consultas periódicas recuperam mudanças de outras réplicas, de períodos offline e da expiração da janela de conexão após reiniciar a API. O Caddy encaminha SSE conforme os eventos chegam. [Documentação de streaming do Caddy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy#streaming)

## Recuperação

- **Código expirado ou rejeitado.** Aguarde a nova sessão e confira o código atual no equipamento. Cinco tentativas incorretas encerram a sessão. Uma placa já aprovada que perdeu a janela de retirada requer revogação pelo painel antes de um novo pareamento.
- **Falha de DNS, TLS ou timeout.** O OLED mostra a categoria do erro. Confira o DNS da instalação, o nome no certificado, a CA configurada, a cadeia apresentada pela API e o acesso da placa ao NTP. A serial informa apenas códigos de diagnóstico de transporte.
- **Falha de NVS.** O OLED informa falha de leitura ou gravação. Em falha ao gravar o Wi-Fi, a nova configuração pode ser enviada novamente via USB. O firmware só confirma a retirada da credencial após a gravação em NVS.
- **Falha de rede ou API indisponível.** A medição local continua durante a interrupção. O backend volta a receber as próximas amostras após a reconexão. As amostras do intervalo offline ficam sem registro no servidor. Restabeleça a conectividade e confira o último contato. O equipamento pode reapresentar o segredo da sessão ou a credencial persistida. O painel volta a atualizar os dados quando a API responde.
- **Troca de credencial.** Use **Revogar**, volte ao equipamento e aprove a nova sessão com o mesmo setor, ativo e sensor. O cadastro mantém seus IDs e a série de leituras. A credencial antiga passa a receber HTTP 401.
- **Equipamento anterior à migração.** As credenciais válidas continuam aceitas em `POST /api/readings` por HTTPS. Para uma placa antiga que envia `X-Token` por HTTP, planeje atualizar o transporte e configurar a CA ao ativar a exigência de HTTPS em produção. O cadastro manual via `POST /api/devices` passa a responder HTTP 410. Cadastros anteriores podem ter MAC ausente. Se atualizar o firmware de um deles e iniciar o primeiro pareamento, será criado um novo vínculo para as próximas leituras. O histórico antigo continua no cadastro anterior. Verifique se a instalação já usou a credencial pública do antigo seed de demonstração e revogue esse cadastro pelo painel.

## Verificação

Execute `npm test` para verificar o contrato com a persistência em memória. A suíte inclui pareamento, criação de ativo, proteção contra duplicatas, revogação, envio de leituras e isolamento do stream por empresa e cargo. Consulte o [README](../README.md) para iniciar a API e o painel e o [guia de implantação](DEPLOYMENT.md) para preparar o ambiente persistente.

No ensaio em Chrome com largura de 390 px, o painel recebeu uma descoberta por SSE sem recarregar a página, exibiu o erro de código incorreto, aprovou a placa simulada com um ativo novo e mostrou os estados de comunicação e revogação. No ensaio HTTPS com MySQL 8.4.13 descartável, a sessão, a credencial e as leituras foram recuperadas após reiniciar a API. A migração incremental preservou um cadastro e uma leitura anteriores. Duas aprovações concorrentes que pediram o mesmo ativo criaram um único ativo e sensor. O segundo pedido recebeu HTTP 409.

O firmware compilou para `esp32dev` com PlatformIO, plataforma Espressif 32 8.0.0 e Arduino ESP32 3.3.12. A compilação com host e CA de teste exercitou a configuração do caminho HTTPS. A execução em placa física requer equipamento conectado e a configuração da instalação.

Para a validação em bancada, grave uma placa, acompanhe a vazão e o código no OLED, desligue a alimentação após aprovar e ligue novamente. Interrompa e restabeleça o Wi-Fi e confirme que as próximas leituras aparecem no mesmo sensor. Teste também uma primeira inicialização sem rede, o envio de JSON inválido, uma reconfiguração USB com erro de senha e a recuperação sem novo pareamento. Em uma instalação de teste, confirme que uma CA incorreta ou um nome DNS fora do certificado impedem a conexão e mantêm a medição local no OLED. Registre o MAC, a versão do firmware e os horários observados durante esse ensaio.
