# 01: Primeiro doce cadastrado e exibido

**What to build:** Em homologação, a proprietária acessa o painel protegido, cadastra uma categoria e um doce com preço e estoque inicial e vê esse doce no cardápio público, inclusive pelo celular.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] Disponibilizar o primeiro fluxo completo em Workers público e administrativo, com persistência no D1 Free e ambientes de teste e produção isolados.
- [x] O painel começa vazio, sem importação do catálogo sazonal ou fluxo de personalização de Páscoa; o cardápio vazio apresenta mensagem adequada.
- [x] A proprietária consegue cadastrar uma categoria e um produto com apresentação, preço em centavos e estoque inteiro inicial; o cadastro permanece após recarregar.
- [x] O produto recebe identificador estável e aparece no cardápio quando publicado, com saldo positivo e categoria ativa; um cadastro zerado permanece apenas no painel.
- [x] O acesso administrativo é restrito ao e-mail autorizado pelo Access, com validação do token e sem endereço alternativo de edição desprotegida.
- [x] O cadastro e sua primeira quantidade registram responsável e origem de forma que o histórico de estoque possa ser ampliado sem perder o saldo inicial.
- [x] Testes de integração pelo contrato HTTP comprovam persistência, visibilidade e rejeição de mutações sem autorização; um fluxo de navegador verifica cadastro e exibição no celular.
- [x] Manter o estilo existente como ponto de partida, renderizar textos de forma segura e introduzir somente a infraestrutura mínima necessária, sem ativar serviços pagos.


## Comments

### Implementação — 2026-10-21

Fluxo implementado com Workers separados, D1/KV isolados, cadastro vazio, saldo inicial auditável e validação de JWT Access em todas as rotas administrativas, incluindo assets. Banco de homologação migrado; recursos de produção provisionados sem publicar ou migrar o domínio. Testes HTTP e fluxo móvel locais executados. Aceite remoto permanece pendente: a credencial não permite configurar Access nem consultar assinaturas; faltam e-mail autorizado, emissor e audiência da aplicação. Não considerar esta issue integralmente concluída até validar o acesso real e o fluxo em homologação.

Frontend segue `docs/design/Saver Doceria — Design.html`. Pontos de teste HTTP dos Workers e navegador móvel, com base de revisão `5d7c6ce`, confirmados pelo usuário. Instruções operacionais e limites em `README.md`.

### Configuração do Access — 2026-10-21

Domínio da equipe informado pelo usuário: `curly-silence-d3a6.cloudflareaccess.com`. Emissor configurado em homologação. Continuam pendentes o e-mail autorizado e o Application Audience (AUD) Tag da aplicação administrativa, além do aceite remoto.

E-mail autorizado informado posteriormente: `wellington220100@gmail.com`, configurado em homologação. AUD ainda não localizado. A consulta pelo navegador chegou à tela de login da Cloudflare; aguardando autenticação do usuário para localizar a aplicação administrativa.

Após login, a lista do Access mostrou somente a aplicação `fazcents.com.br`; a aplicação administrativa Saver ainda não existe. Preparada aplicação separada de homologação, com hostname `saver-admin-staging.fazcents.workers.dev` e política Allow para o e-mail autorizado. Criação ainda pendente. O usuário corrigiu também o domínio de produção para `saverdoceria.com.br`, com painel previsto em `admin.saverdoceria.com.br`; `CNAME` e origens de produção foram atualizados, sem publicar ou alterar DNS.

### Publicação e validação remota — 2026-10-21

Com autorização do usuário, criada a aplicação Access `Saver Doceria — Administração (homologação)` (`2e28ba3a-ce5c-465b-b0c6-028eda54bc07`) e a política `Saver homologação — proprietária`, Allow somente para `wellington220100@gmail.com`. AUD registrado em `wrangler.admin.jsonc`; previews continuam desativados. Planos Workers Free e Teams Free Base confirmados pelo painel da conta.

Publicados os Workers público e administrativo em `saver-public-staging.fazcents.workers.dev` e `saver-admin-staging.fazcents.workers.dev`. Versões iniciais: público `2a66e13f-c036-407e-b9cd-4ecfc93e8538`, administrativo `24892dea-8dcb-42b5-af41-7a86d1b06af2`.

Validado no navegador: login real da proprietária, painel inicialmente vazio, cadastro de categoria e produto com apresentação/preço/saldo, persistência após recarregar e exibição no cardápio com foto carregada. O teste de políticas do Access confirmou Access granted. Requisições independentes sem sessão à raiz, ao HTML direto e à API de mutação, inclusive com JWT inválido, retornaram 302 para o Access; o catálogo público retornou 200. Não foi usada uma segunda conta autenticada para o teste negativo de e-mail, coberto localmente por HTTP.

O produto `Doce de teste — homologação` foi ocultado e arquivado e a categoria `Homologação — teste` foi desativada após os testes. Saldo e histórico foram preservados. Produção e DNS não foram publicados ou alterados.
