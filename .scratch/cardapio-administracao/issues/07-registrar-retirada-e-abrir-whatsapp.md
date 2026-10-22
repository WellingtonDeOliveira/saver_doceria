# 07: Registrar solicitação de retirada e abrir o WhatsApp

**What to build:** O cliente informa nome e celular para retirada, registra sua solicitação e abre a mensagem do WhatsApp com referência; a proprietária encontra o pedido aguardando confirmação no painel.

**Blocked by:** 06 — Montar e revisar o carrinho

**Status:** ready-for-agent

- [x] Exigir nome e celular válidos para retirada, sem exigir endereço e sem apresentar área ou login do cliente.
- [x] Normalizar o celular e agrupar o cadastro por esse número, com identificador interno estável; não retornar dados pessoais previamente cadastrados ao navegador.
- [x] Revalidar preço, visibilidade e saldo novamente ao registrar e exigir revisão caso tenham mudado desde a consulta anterior.
- [x] Salvar pedido aguardando confirmação, cliente, dados preservados e solicitação original antes de abrir o WhatsApp; não reservar nem baixar estoque.
- [x] Usar chave de idempotência para que repetição do mesmo envio ou tentativa após resposta perdida retorne a mesma referência sem duplicar o pedido.
- [x] Gerar mensagem com referência, itens, apresentações, quantidades, valores e modalidade, usando as configurações da loja disponíveis; abrir o aplicativo não marca confirmação ou envio comprovado.
- [x] Disponibilizar lista e detalhe administrativo mínimos para localizar a solicitação pela referência, com acesso protegido; não criar consulta pública de clientes ou histórico.
- [x] Falha no registro não é apresentada como pedido salvo e não encaminha uma mensagem que afirme registro bem-sucedido; proteger o recebimento público contra abuso.
- [x] Testes HTTP verificam registro, revalidação, idempotência e ausência de baixa; um fluxo de navegador verifica a mensagem sem enviar mensagens reais.



## Comments

Implementação local concluída nesta execução. Validação: HTTP dos Workers com D1/KV descartáveis e fluxos móveis Playwright. Contratos e limitações em README.md; backup, restauração isolada e publicação em docs/backup-e-publicacao.md. Publicação e migração reais são acompanhadas separadamente na issue 16.
