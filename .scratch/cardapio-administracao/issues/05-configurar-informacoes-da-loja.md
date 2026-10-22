# 05: Configurar informações da loja

**What to build:** A proprietária altera nome da loja, WhatsApp, mensagem inicial e aviso no painel e vê o conteúdo atualizado no site e nos próximos encaminhamentos.

**Blocked by:** 01 — Primeiro doce cadastrado e exibido

**Status:** ready-for-agent

- [x] Disponibilizar formulário administrativo para nome da loja, número de WhatsApp, mensagem inicial e aviso público.
- [x] Validar e persistir as alterações e expor somente as configurações destinadas ao público.
- [x] Refletir nome e aviso no cardápio e fornecer as configurações de encaminhamento aos fluxos de solicitação, sem número de destino fixo no navegador.
- [x] Textos são exibidos de forma segura e não executam HTML ou scripts inseridos no formulário.
- [x] Falha ao salvar preserva o estado anterior e informa o resultado pelo painel.
- [x] Testes HTTP verificam autorização, validação e persistência; um fluxo de interface mostra a alteração do aviso e do nome.



## Comments

Implementação local concluída nesta execução. Validação: HTTP dos Workers com D1/KV descartáveis e fluxos móveis Playwright. Contratos e limitações em README.md; backup, restauração isolada e publicação em docs/backup-e-publicacao.md. Publicação e migração reais são acompanhadas separadamente na issue 16.
