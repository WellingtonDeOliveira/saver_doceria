# Aceite remoto da issue 16 — 22/10/2026

Homologação nos Workers saver-public-staging e saver-admin-staging, apenas dados sintéticos. Produção não publicada.

| Verificação real | Resultado |
|---|---|
| Configurações, catálogo e fotos | Nome, WhatsApp, saudação e aviso persistidos; categoria/produto/apresentação criados; foto enviada e substituída; versões preservadas no backup |
| Carrinho e revisão | Carrinho preservado após reload; preço de R$18 para R$20 exigiu revisão e aceite explícito |
| Entrega | ViaCEP real resolveu 01001000; endereço sintético; pedido salvo antes do link WhatsApp; href conferido sem enviar mensagem |
| Pedido/cliente | Referência `2ed403f3-90f6-4ae1-8494-db134b3bb936`; celular normalizado; original R$20 preservado |
| Negociar pendente | Saldo inicial 8; 2 unidades × R$15, desconto R$2, frete R$5, total R$33; nenhuma baixa |
| Confirmar e editar | Confirmar levou saldo a 6; editar confirmado para 3 unidades baixou só diferença, saldo 5 e total R$48 |
| Cancelar/reabrir/reconfirmar | Cancelar devolveu para 8; reabrir manteve 8; reconfirmar baixou para 5 |
| Concluir/cancelar concluído | Ambos mantiveram saldo 5, sem devolução automática |
| Retorno físico | Retorno manual de 1 com razão e referência levou saldo a 6; histórico preservado |
| Histórico | Final cancelado v9, oito revisões preservadas, snapshot original intacto |
| Retirada | Referência `9f10da4d-7a4b-4327-a8a4-994e6b020d2b`; sem endereço obrigatório; celular formatado agrupou mesmo cliente, preservando endereço atual e snapshots; cancelamento pendente sem baixa |
| Access | Proprietária autorizada no painel e policy tester; raiz, index.html, admin.js, orders, clients e backup sem sessão/JWT inválido retornam 302 login; catálogo público 200 |
| Backup remoto real | Download pelo painel, quatro fotos e registros restaurados em runtime local vazio; cliente, endereço, v9, oito revisões, saldo 6, retorno físico e foto substituída conferidos no navegador |
| Móvel | Pedido remoto e catálogo restaurado em 390px sem transbordamento; capturas em `.wrangler/staging-order-mobile.png` e `.wrangler/remote-restored-catalog-mobile.png` |
| Limpeza | Produto oculto/arquivado e categoria desativada, catálogo vazio novamente; histórico mantido |
| CI | PR #2, Validar cardápio, run 39717556176: sucesso em fecba57 |
| Custo | Workers Free ativo e Teams Free Base; nenhum plano/excedente pago contratado |

Falhas de conexão, cota simulada, propagação KV, atomicidade e idempotência cobertas nos testes HTTP/navegador aprovados. Não esgotar cotas reais. Sem reserva no envio; disponibilidade depende do atendimento. Segunda identidade autenticada não autorizada ainda pendente; teste sem sessão não a substitui.

Backup privado em `.private-backups/staging-validated-05-16/manifest.json`, fora do Git. Esse snapshot antecede o segundo pedido e a limpeza; criar outro antes de produção. Nenhum backup/fluxo de produção foi validado. Bloqueios de DNS e autorização Access/token em `progress-05-16.md`; plano operacional em `../../docs/backup-e-publicacao.md`. Aceite da proprietária e validação de produção permanecem necessários.
