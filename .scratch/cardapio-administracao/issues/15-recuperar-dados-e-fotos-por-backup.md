# 15: Recuperar dados e fotos por backup

**What to build:** A proprietária dispõe de um procedimento executável de backup e restauração de dados e fotos, demonstrado em ambiente isolado sem contratar serviços pagos.

**Blocked by:** 04 — Enviar e substituir fotos; 09 — Consultar clientes e histórico no administrador; 13 — Editar um pedido confirmado aplicando a diferença; 14 — Cancelar concluídos e registrar retorno físico

**Status:** ready-for-agent

- [x] Criar procedimento de exportação e recuperação de produtos, categorias, clientes, pedidos, originais/revisões, configurações, saldos, movimentações e referências de mídia.
- [x] Copiar fotos e preservar a correspondência entre conteúdo e referências para que o cardápio restaurado exiba as imagens corretas.
- [x] Restringir acesso aos backups com dados pessoais e evitar sua publicação junto ao conteúdo público.
- [x] Restaurar em ambiente isolado sem sobrescrever produção ou usar dados reais nos testes automatizados.
- [x] Demonstrar pela interface e consultas HTTP a recuperação de um cliente, pedido editado, histórico de estoque e foto substituída.
- [x] Conferir integridade de saldos, referências e estados, inclusive cancelamento/reabertura; restaurar não reaplica baixas ou devoluções.
- [x] Documentar execução, verificações e limitações da recuperação, incluindo falhas ou cotas atingidas, respeitando o orçamento zero.
- [x] Registrar evidência da restauração realizada; não considerar a existência de exportação, sozinha, prova de recuperabilidade.



## Comments

Implementação local concluída nesta execução. Validação: HTTP dos Workers com D1/KV descartáveis e fluxos móveis Playwright. Contratos e limitações em README.md; backup, restauração isolada e publicação em docs/backup-e-publicacao.md. Publicação e migração reais são acompanhadas separadamente na issue 16.
