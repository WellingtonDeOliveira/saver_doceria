# 11: Confirmar e concluir pedidos com baixa consistente

**What to build:** A proprietária confirma o pedido pelo painel, comprometendo as unidades disponíveis, e depois o conclui sem uma segunda baixa.

**Blocked by:** 03 — Movimentar estoque pelo painel; 07 — Registrar solicitação de retirada e abrir o WhatsApp

**Status:** ready-for-agent

- [x] Permitir confirmar pedido aguardando confirmação após verificar o saldo de todos os produtos.
- [x] Na confirmação, baixar uma vez as quantidades vigentes, vincular movimentações ao pedido e registrar a revisão e o estado confirmado.
- [x] Se faltar saldo em qualquer item, rejeitar toda a operação sem alteração de pedido, revisão ou estoque.
- [x] Permitir concluir um confirmado, registrando o encerramento sem baixa adicional.
- [x] Gravar estado, revisão e movimentações de forma atômica, sem saldo negativo e sem aplicar efeitos novamente por repetição da mesma ação.
- [x] Impedir confirmação baseada em versão desatualizada e proteger concorrência entre pedidos pela última unidade; somente a operação com saldo pode comprometer a unidade.
- [x] Refletir saldo zerado no cardápio e apresentar no painel o resultado ou motivo do bloqueio.
- [x] Testes HTTP cobrem ciclo, repetição, falta de saldo, falha de gravação e concorrência; um fluxo móvel demonstra confirmar e concluir.



## Comments

Implementação local concluída nesta execução. Validação: HTTP dos Workers com D1/KV descartáveis e fluxos móveis Playwright. Contratos e limitações em README.md; backup, restauração isolada e publicação em docs/backup-e-publicacao.md. Publicação e migração reais são acompanhadas separadamente na issue 16.
