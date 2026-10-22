# 13: Editar um pedido confirmado aplicando a diferença

**What to build:** A proprietária altera o combinado de um pedido confirmado e o estoque acompanha somente o acréscimo ou a redução por produto, sem repetir a baixa original.

**Blocked by:** 10 — Editar a solicitação conforme o WhatsApp; 11 — Confirmar e concluir pedidos com baixa consistente

**Status:** ready-for-agent

- [x] Permitir aumentar, reduzir, remover e trocar itens de um confirmado, preservando original e revisões.
- [x] Calcular a diferença líquida por produto entre a versão vigente e a nova: acréscimos baixam e reduções devolvem.
- [x] Alterações apenas de preço, desconto, frete e endereço recalculam o pedido sem movimentar estoque.
- [x] Se qualquer acréscimo não tiver saldo, bloquear todo o salvamento, incluindo devoluções de outros itens, preservando pedido, saldos e revisões.
- [x] Gravar revisão, pedido e diferenças de estoque atomicamente; repetição da mesma operação não repete a diferença.
- [x] Rejeitar edição baseada em versão antiga, inclusive em múltiplas abas, sem sobrescrever o estado atual.
- [x] O cancelamento posterior usa as quantidades da versão confirmada vigente, e não as da solicitação original.
- [x] Testes HTTP cobrem aumentos, reduções, trocas, alterações financeiras, falta de saldo em um item e cancelamento após edição; fluxo móvel mostra negociação e saldos resultantes.



## Comments

Implementação local concluída nesta execução. Validação: HTTP dos Workers com D1/KV descartáveis e fluxos móveis Playwright. Contratos e limitações em README.md; backup, restauração isolada e publicação em docs/backup-e-publicacao.md. Publicação e migração reais são acompanhadas separadamente na issue 16.
