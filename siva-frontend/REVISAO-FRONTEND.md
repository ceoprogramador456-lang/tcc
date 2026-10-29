# Revisão do frontend — 29/10/2026

## Clareza e finalidade das páginas

- Menus e páginas distinguem Administração, Visão geral, Equipamentos, Dispositivos e Equipe. As rotas existentes e as permissões foram preservadas.
- Cabeçalhos explicam a finalidade de cada tela. A localização e o perfil aparecem juntos, com ajuda expansível em “Como usar esta tela”, explicação dos conceitos e atalhos para o próximo passo.
- Administração oferece acesso direto a empresas clientes e gestão de contas. A equipe do gestor permanece somente para consulta.
- Visão geral distingue vazão em L/min de volume em litros, informa o período, destaca sensores e dispositivos sem leitura recente e oferece acesso às respectivas listas.
- Alertas indisponíveis deixam de ocupar um indicador principal. Atividades mostram cinco itens inicialmente, com opção para expandir os demais eventos recebidos.
- Formulários e mensagens usam “equipamento” para o objeto monitorado e “dispositivo” para o aparelho que transmite os dados.
- O login explica o acesso à operação da empresa ou à administração da plataforma.

Esta etapa não adiciona filtros de período ou gráficos sem dados disponíveis na API. Os atalhos de atenção abrem as listas correspondentes, sem simular filtros que elas não oferecem.

Alterações restritas ao frontend. Os contratos e as permissões existentes da API foram consultados, sem alterações no backend.

## Comportamento por perfil

| Perfil | Administração | Operação | Usuários da empresa |
| --- | --- | --- | --- |
| Administrador | Empresas e contas | Consulta e escrita, com seleção de empresa | Gestão em `/admin/usuarios` |
| Gestor | Sem acesso | Consulta e escrita na própria empresa | Consulta em `/painel/usuarios` |
| Técnico | Sem acesso | Consulta na própria empresa | Sem acesso |

Criar, editar, excluir e alterar o status de contas continuam exclusivos do administrador, conforme a API atual.

## Correções

- Navegação operacional preserva a empresa selecionada. Gestores e técnicos usam sempre a empresa da sessão, mesmo com outro `empresaId` na URL.
- Trocar de empresa reinicia filtros, paginação e formulários da tela operacional. Dados de um filtro anterior deixam de aparecer enquanto a nova consulta carrega.
- Detalhes da empresa oferecem atalhos para seu painel e sua lista de usuários; o filtro da lista administrativa fica na URL.
- Gestores podem consultar sua equipe em uma tela sem ações de escrita, com rota protegida por perfil.
- Edição de usuário deixa de oferecer o campo de status que essa operação não salvava. A alteração permanece na ação dedicada da lista.
- Seletores opcionais permitem voltar a “Todos”; seletores obrigatórios mantêm a opção inicial desabilitada.
- Nome de empresa valida de 2 a 100 caracteres. Formulários de empresa e usuário aceitam envio por Enter.
- Diálogos preservam o foco durante a digitação, contêm a navegação por Tab e devolvem o foco ao fechar. Cada diálogo tem identificadores próprios.
- Formulários administrativos e confirmações de exclusão evitam fechar durante a requisição.
- Excluir o último registro de uma página administrativa retorna à página anterior.
- Aviso de lint do ano no rodapé corrigido.

## Validação

Build TypeScript/Vite e lint executados. A revisão com Playwright CLI e Chromium utilizou a API local em `MOCK_MODE=true`:

- Login de administrador, dois gestores de empresas diferentes e técnico.
- Consulta de equipe com isolamento entre as duas empresas e ausência de ações de escrita para gestores.
- Técnico sem ações de escrita em setores, ativos, ESP32 e sensores; acesso administrativo bloqueado.
- Preservação do filtro de empresa na navegação.
- Cadastro, edição e exclusão de empresa temporária, incluindo rejeição de nome com 101 caracteres.
- Cadastro, edição, inativação e exclusão de usuário temporário vinculado a uma empresa.
- Envio por Enter, foco de campo, ciclo de Tab e retorno de foco ao fechar diálogo.
- Tela de equipe em viewport de 390 × 844, sem transbordamento horizontal da página, e abertura/fechamento do menu.

Os registros temporários foram removidos após a validação. Capturas e scripts locais ficam em `output/playwright/`, ignorados pelo Git. A configuração `playwright.config.ts` aponta para o frontend na porta 5173 e guarda relatórios nessa pasta; não foram adicionados testes de exemplo nem uma suíte de especificações automatizadas.

A validação cobre os fluxos descritos no ambiente de demonstração. Não substitui a validação com MySQL ou uma auditoria de segurança do servidor.
