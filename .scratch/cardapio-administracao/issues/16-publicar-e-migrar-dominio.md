# 16: Publicar e migrar o domínio

**What to build:** A proprietária valida a experiência completa no celular e publica o novo cardápio no domínio da loja, com painel protegido, publicação automática e retorno ao site anterior preparado.

**Blocked by:** 02 — Administrar produtos e categorias; 05 — Configurar informações da loja; 15 — Recuperar dados e fotos por backup

**Status:** ready-for-human

- [x] Validar em homologação o escopo integrado, incluindo manutenção de produtos/fotos/configurações, carrinho, entrega/retirada, clientes e ciclo completo de pedidos.
- [x] Verificar especialmente a integração entre edição de confirmado, cancelamento, reabertura, reconfirmação e retorno manual, sem movimentações duplicadas.
- [ ] Confirmar política real do Access com acesso autorizado e não autorizado e ausência de rotas alternativas administrativas desprotegidas.
- [ ] Configurar publicação automática com ambientes isolados e somente planos gratuitos; não contratar excedentes ou migrar automaticamente para serviço pago.
- [x] Verificar erros de conexão, esgotamento simulado de cotas, propagação de fotos e comportamento móvel sem esgotar cotas reais para testar.
- [x] Preparar backup validado, plano de troca e retorno ao site antigo, preservando dados novos se houver necessidade de retorno.
- [ ] Migrar o domínio e conferir HTTPS, endereço principal, www e domínio administrativo, somente após validação completa do novo escopo.
- [ ] Desativar a publicação antiga somente após confirmar a migração; não importar o catálogo sazonal nem introduzir pagamentos, login de cliente ou serviços fora do escopo.
- [ ] Registrar verificações finais e limitações aceitas, incluindo ausência de reserva no envio e possível interrupção nas cotas gratuitas.

## Comments

Atualização de 22/10/2026, substituindo o checkpoint histórico abaixo: migrações aplicadas, ambos os Workers publicados e fluxo integrado remoto/backup baixado e restaurado conferidos. CI real do PR #2 aprovado. Evidências em `../acceptance-issue-16.md`. Environments GitHub e variável pública configurados; token ainda não criado. Access autorizado e sem sessão verificados, segunda identidade autenticada não autorizada pendente.

Exige ação humana: ativação do domínio no Registro.br com `sue.ns.cloudflare.com` e `wesley.ns.cloudflare.com`; autorização de criação de Access exclusivo da proprietária e token de CI no escopo revisado. Política de segurança do navegador exige confirmação para criar acesso/credenciais. Produção/DNS não alterados; main remota e site antigo preservados. Automação pausada enquanto esses bloqueios persistirem. Não marcar publicação automática/migração concluídas; detalhes em `../progress-05-16.md`.

Implementação local das issues 05–15 concluída, com 15 testes HTTP/backup, quatro fluxos móveis, typecheck, builds e revisão em dois agentes. Backup por CLI e download no painel restaurados isoladamente; plano operacional de CI, troca e retorno em `docs/backup-e-publicacao.md`. Workflows versionados, ainda sem secrets/environments configurados no GitHub.

Backup remoto anterior de staging (SQL e duas fotos KV) preservado em pasta privada local. Sessão Access autorizada de staging conferida no navegador. A aplicação das novas migrações falhou por timeout da API Cloudflare; consulta posterior confirmou 0002 e 0003 ainda pendentes. Nenhum Worker novo publicado, DNS ou produção alterados nesta execução. Produção permanece bloqueada pela configuração Access vazia. Continuação agendada após a renovação dos limites; checkpoint detalhado em `../progress-05-16.md`.

