# 14: Cancelar concluídos e registrar retorno físico

**What to build:** A proprietária registra o cancelamento de um pedido já concluído sem presumir que os doces voltaram fisicamente, registrando eventual retorno por entrada manual justificada.

**Blocked by:** 12 — Cancelar e reabrir pedidos

**Status:** ready-for-agent

- [x] Permitir cancelar pedido concluído pelo painel, mantendo seu histórico e sem devolver estoque automaticamente.
- [x] Distinguir esse cancelamento daquele realizado a partir de confirmado, inclusive após novas tentativas da mesma ação.
- [x] Permitir registrar retorno físico como entrada manual de estoque com justificativa e referência ao pedido para rastreio.
- [x] Registrar quantidade devolvida fisicamente sem presumir retorno integral; somente a entrada explícita aumenta o saldo.
- [x] Repetir cancelamento ou a mesma entrada não duplica efeitos e não converte cancelamento de concluído em devolução automática.
- [x] Se o cancelado for reaberto, voltar a aguardando confirmação sem movimentação; nova confirmação verifica e baixa o saldo disponível, independentemente da ausência de devolução anterior.
- [x] Testes HTTP e fluxo administrativo verificam cancelamento após conclusão, retorno parcial/manual, justificativa obrigatória, repetição e reabertura sem devolução fictícia.



## Comments

Implementação local concluída nesta execução. Validação: HTTP dos Workers com D1/KV descartáveis e fluxos móveis Playwright. Contratos e limitações em README.md; backup, restauração isolada e publicação em docs/backup-e-publicacao.md. Publicação e migração reais são acompanhadas separadamente na issue 16.
