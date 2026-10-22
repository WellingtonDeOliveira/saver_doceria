# 12: Cancelar e reabrir pedidos

**What to build:** A proprietária cancela solicitações pendentes ou pedidos confirmados e pode reabri-los para retomar o atendimento, mantendo histórico e estoque consistentes.

**Blocked by:** 11 — Confirmar e concluir pedidos com baixa consistente

**Status:** ready-for-agent

- [x] Cancelar pedido aguardando confirmação não movimenta estoque.
- [x] Cancelar confirmado devolve uma única vez as quantidades da versão confirmada vigente, incluindo ajustes existentes, com movimentações vinculadas e histórico.
- [x] Pedido, revisão e devoluções são gravados juntos; repetição ou falha não duplica nem deixa retorno parcial.
- [x] Permitir reabrir cancelado como aguardando confirmação, preservando original e histórico sem movimentar estoque.
- [x] Confirmar novamente exige saldo atual e realiza nova baixa uma vez; repetir o ciclo não reaproveita indevidamente devoluções ou baixas anteriores.
- [x] Apresentar os estados e ações disponíveis no painel e tratar versões antigas sem sobrescrever alterações posteriores.
- [x] Testes HTTP cobrem cancelamento pendente/confirmado, repetição, reabertura, nova confirmação e ciclos sucessivos; fluxo móvel verifica ações e histórico.
- [x] Não aplicar a regra de devolução de confirmado a pedidos concluídos; seu tratamento específico pertence à entrega seguinte correspondente.



## Comments

Implementação local concluída nesta execução. Validação: HTTP dos Workers com D1/KV descartáveis e fluxos móveis Playwright. Contratos e limitações em README.md; backup, restauração isolada e publicação em docs/backup-e-publicacao.md. Publicação e migração reais são acompanhadas separadamente na issue 16.
