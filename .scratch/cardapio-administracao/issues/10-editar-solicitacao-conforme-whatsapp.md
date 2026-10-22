# 10: Editar a solicitação conforme o WhatsApp

**What to build:** A proprietária ajusta um pedido aguardando confirmação para refletir a conversa no WhatsApp, recalcula o total e consulta o original e as revisões.

**Blocked by:** 07 — Registrar solicitação de retirada e abrir o WhatsApp

**Status:** ready-for-agent

- [x] Permitir editar produtos, apresentações, quantidades, preços negociados, desconto, frete e endereço no pedido aguardando confirmação.
- [x] Recalcular totais em centavos a partir dos dados válidos e identificar frete ainda não combinado sem confundi-lo com frete gratuito.
- [x] Preço negociado, desconto e frete afetam somente o pedido, sem alterar preços do cardápio.
- [x] Preservar a solicitação original e registrar cada revisão com responsável, data e alterações, acessíveis no detalhe administrativo.
- [x] Editar um pedido aguardando confirmação não movimenta estoque e não reescreve pedidos anteriores nem o original preservado.
- [x] Rejeitar salvamento baseado em versão antiga ou dados inválidos, preservando o pedido e suas revisões anteriores.
- [x] Testes HTTP cobrem cálculos, preservação do original, ausência de movimentação e conflito de versão; um fluxo de interface demonstra a negociação registrada.



## Comments

Implementação local concluída nesta execução. Validação: HTTP dos Workers com D1/KV descartáveis e fluxos móveis Playwright. Contratos e limitações em README.md; backup, restauração isolada e publicação em docs/backup-e-publicacao.md. Publicação e migração reais são acompanhadas separadamente na issue 16.
