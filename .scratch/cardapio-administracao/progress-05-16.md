# Implementação das issues 05–16

Base para revisão: `8768da3cea8b9cab2790b375f09c373d65912c0d` (HEAD ao iniciar).
Branch autorizada: main. Preservar arquivos de documentação e issues já presentes e não rastreados.

Fronteiras dos testes: HTTP dos Workers e navegador móvel, conforme os critérios das issues solicitadas. Usar D1/KV descartáveis e serviços externos simulados.

- Issues 05–15 implementadas localmente, critérios marcados e commit inicial `d2d218c`.
- Code-review em dois agentes concluído. Dois P2 e um P3 corrigidos; detalhes em `review-issues-05-16.md`. Testes focados dos ajustes aprovados.
- Validação: typecheck, suíte completa 15 testes HTTP/backup, quatro fluxos móveis e builds aprovados. Depois da revisão, oito testes HTTP de pedidos passaram e o teste móvel focado de resposta perdida/bloqueio passou. Não repetir a suíte inteira sem mudança/falha que justifique.
- Backup por terminal e download no painel restaurados em runtimes isolados, inclusive por navegador; screenshots em `.wrangler/restored-*-mobile.png`.
- Em andamento: issue 16, publicação e validação real de homologação, CI e produção/DNS.
- Sessão Cloudflare OAuth válida com IPv4. Usar `node --dns-result-order=ipv4first node_modules/wrangler/bin/wrangler.js ...`; o caminho padrão falha por conectividade IPv6.
- Backup anterior remoto (SQL + duas fotos KV) salvo em `.private-backups/pre-issues-05-16-staging/`, ACL restrita. Não publicar essa pasta.
- No início da migração faltavam `0002_orders.sql` e `0003_order_guards.sql` em staging. Conferir o resultado das próximas operações antes de repetir.
- Navegador CUA in-app tem sessão Access autorizada válida em `https://saver-admin-staging.fazcents.workers.dev/`. Havia somente produto/categoria de teste antigos arquivados. Se a sessão CUA for reiniciada, obter documentação e reler estado da aba.
- WhatsApp real do site antigo em `js/carrinho.js`: `5585986531190`. Pode preencher a configuração pelo painel; nenhum número fica fixo no novo frontend.
- Produção ainda tem ACCESS_ISSUER/AUD/ADMIN_EMAIL vazios; `scripts/check-deploy.mjs production` bloqueia corretamente. Domínio previsto: saverdoceria.com.br/admin.saverdoceria.com.br. Não trocar DNS sem validar Access/backup/fluxo completo.
- Workflows preparados em `.github/workflows/`; não houve push nem configuração de secrets/environments no GitHub. `gh` não está instalado. Preserve o site antigo até o aceite.
- Automação: `retomar-issues-5-16-da-saver-doceria`, heartbeat horário nesta conversa para retomar após limites, sem duplicar trabalho ativo.
- Publicação real depende de validação completa e acesso Cloudflare/DNS; não marcar migração concluída apenas por testes locais.

Executar typecheck e arquivos de teste durante cada fatia, suíte completa no final, code-review em dois agentes (autorizados pela skill) e commit na branch atual.
