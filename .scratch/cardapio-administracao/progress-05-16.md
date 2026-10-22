# Implementação das issues 05–16

## Estado atual — 22/10/2026, após retomada

Este estado substitui os checkpoints históricos abaixo. Issues 05–15 concluídas; issue 16 continua aberta, aguardando ação humana.

- Migrações 0002/0003 aplicadas em staging; público publicado na versão `47d16077-4acc-4590-8811-fd889cd3f433` e painel final `80c035ae-857c-40ea-aa91-b2658d4a9f48`. Não reaplicar por presumir os timeouts antigos. CLI estável: `node --dns-result-order=ipv4first --no-network-family-autoselection node_modules/wrangler/bin/wrangler.js ...`.
- Fluxo remoto completo validado, inclusive negociação, estoque, entrega/retirada, clientes, fotos e restauração do backup real baixado. Ver `acceptance-issue-16.md`. Dados sintéticos ocultos/arquivados e categoria desativada ao final; nenhuma mensagem WhatsApp enviada.
- Commit `fecba57` corrige navegação/rótulos do painel e variável pública do CI. Revisões incrementais independentes de standards e spec: zero achados. Destaque Pedidos confirmado remotamente (`aria-current=page`).
- Branch remota `codex/cardapio-administracao-01-16`, PR draft #2: https://github.com/WellingtonDeOliveira/saver_doceria/pull/2. CI real aprovado no commit `fecba577d01c1009897cfe72cd8be5eaaf3633ea`, run https://github.com/WellingtonDeOliveira/saver_doceria/actions/runs/39717556176.
- GitHub environments staging/production criados, restritos à main; produção exige aprovação de WellingtonDeOliveira. Variável pública da conta cadastrada nos dois. Nenhum token secret criado.
- Backup remoto baixado em `.private-backups/staging-validated-05-16/manifest.json`, restaurado em D1/KV locais vazios: fotos, cliente, oito revisões, pedido cancelado e saldo 6 conferidos. Snapshot anterior ao segundo pedido/limpeza; gerar outro antes de produção. Backup pré-migração SQL/KV e DNS em `.private-backups/pre-issues-05-16-staging/`. Nunca publicar essas pastas, ignoradas e com ACL restrita.
- Access staging validado com sessão autorizada e sem sessão/JWT inválido em todas as rotas verificadas. Segunda identidade autenticada não autorizada ainda não testada.
- **Bloqueio DNS:** zona saverdoceria.com.br pendente. Registro.br ainda usa a.auto.dns.br/b.auto.dns.br; Cloudflare pede **sue.ns.cloudflare.com** e **wesley.ns.cloudflare.com**. Exige ação no registrador autorizado e verificação de propagação/DNSSEC. Nenhum DNS alterado.
- **Bloqueio Access/CI:** produção não publicada, Access de produção não criado e configuração Access vazia. Formulário preparado para admin.saverdoceria.com.br, somente wellington220100@gmail.com. Token apenas revisado, não criado: `saver-doceria-github-deploy`, 90 dias até 20/01/2027, Workers Scripts Write, D1 Write, Workers KV Storage Write e Account Settings Read na conta `2121ce905dd87582cafefab587f97b9a`. Permite esses recursos em toda a conta, não somente dois Workers. Destino proposto: secrets GitHub dos dois environments. A política de segurança do navegador exige confirmação no momento da criação de credenciais/acesso; aguardar autorização explícita.
- Site antigo preservado: GitHub Pages da main remota, pasta /, CNAME saverdoceria.shop, commit `5d7c6cefd5620b1f7496ecbd7092dba90e53e0fa`. **Não enviar main nem fazer merge antes da troca**, pois o novo CNAME mudaria o site antigo. Verificação HTTP independente do domínio antigo teve timeout; não afirmar disponibilidade atual sem nova verificação.
- Planos Workers Free e Teams Free Base conferidos; nada pago contratado. Não há bloqueio de tokens nesta retomada.
- Automação `retomar-issues-5-16-da-saver-doceria` deve ficar pausada enquanto depende das ações humanas acima. Após autorização: criar Access/token no escopo revisado, cadastrar secrets sem expor valores, validar segunda identidade, ativar zona, configurar Access de produção e somente publicar após novo backup restaurado. Conferir HTTPS apex/www/admin, rotas alternativas, fluxo móvel e rollback antes de desativar publicação antiga. Não repetir suíte inteira ou migrações sem mudança/falha que justifique.

## Checkpoints históricos (superados pelo estado acima)

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
- Checkpoint final da janela: commits `d2d218c` e `1c93422` em main. Tentativa de `d1 migrations apply` falhou por timeout antes de publicar qualquer Worker. A consulta posterior confirmou que **ambas** as migrações 0002 e 0003 ainda estão pendentes em staging. Nenhum deploy desta execução foi realizado. Próximo passo: repetir aplicação e publicação staging com IPv4, depois validar por navegador.
- Uso chegou a 99% da janela de cinco horas; renovação prevista para 22/10 às 00:03:58 de São Paulo. Heartbeat ajustado para minuto 05 de cada hora (primeira retomada prevista 00:05), ativo nesta conversa. Consultar limites de novo; não presumir que uma janela nova elimina o limite semanal.
- A aba in-app de homologação foi marcada para continuar na próxima execução. Ainda exibe a versão anterior (issues01–04), com sessão autorizada válida.
- Automação: `retomar-issues-5-16-da-saver-doceria`, heartbeat horário nesta conversa para retomar após limites, sem duplicar trabalho ativo.
- Publicação real depende de validação completa e acesso Cloudflare/DNS; não marcar migração concluída apenas por testes locais.

Executar typecheck e arquivos de teste durante cada fatia, suíte completa no final, code-review em dois agentes (autorizados pela skill) e commit na branch atual.
