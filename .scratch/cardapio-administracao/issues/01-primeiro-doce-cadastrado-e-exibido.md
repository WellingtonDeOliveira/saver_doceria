# 01: Primeiro doce cadastrado e exibido

**What to build:** Em homologação, a proprietária acessa o painel protegido, cadastra uma categoria e um doce com preço e estoque inicial e vê esse doce no cardápio público, inclusive pelo celular.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Disponibilizar o primeiro fluxo completo em Workers público e administrativo, com persistência no D1 Free e ambientes de teste e produção isolados.
- [x] O painel começa vazio, sem importação do catálogo sazonal ou fluxo de personalização de Páscoa; o cardápio vazio apresenta mensagem adequada.
- [x] A proprietária consegue cadastrar uma categoria e um produto com apresentação, preço em centavos e estoque inteiro inicial; o cadastro permanece após recarregar.
- [x] O produto recebe identificador estável e aparece no cardápio quando publicado, com saldo positivo e categoria ativa; um cadastro zerado permanece apenas no painel.
- [ ] O acesso administrativo é restrito ao e-mail autorizado pelo Access, com validação do token e sem endereço alternativo de edição desprotegida.
- [x] O cadastro e sua primeira quantidade registram responsável e origem de forma que o histórico de estoque possa ser ampliado sem perder o saldo inicial.
- [x] Testes de integração pelo contrato HTTP comprovam persistência, visibilidade e rejeição de mutações sem autorização; um fluxo de navegador verifica cadastro e exibição no celular.
- [x] Manter o estilo existente como ponto de partida, renderizar textos de forma segura e introduzir somente a infraestrutura mínima necessária, sem ativar serviços pagos.


## Comments

### Implementação — 2026-10-21

Fluxo implementado com Workers separados, D1/KV isolados, cadastro vazio, saldo inicial auditável e validação de JWT Access em todas as rotas administrativas, incluindo assets. Banco de homologação migrado; recursos de produção provisionados sem publicar ou migrar o domínio. Testes HTTP e fluxo móvel locais executados. Aceite remoto permanece pendente: a credencial não permite configurar Access nem consultar assinaturas; faltam e-mail autorizado, emissor e audiência da aplicação. Não considerar esta issue integralmente concluída até validar o acesso real e o fluxo em homologação.

Frontend segue `docs/design/Saver Doceria — Design.html`. Pontos de teste HTTP dos Workers e navegador móvel, com base de revisão `5d7c6ce`, confirmados pelo usuário. Instruções operacionais e limites em `README.md`.
