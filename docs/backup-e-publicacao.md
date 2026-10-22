# Backup, restauração e publicação

## Backup privado

No painel autenticado, abra **Configurações → Baixar backup completo**. O download JSON inclui o manifesto, todas as tabelas e as fotos com SHA-256. Mova o arquivo de Downloads para uma pasta privada/criptografada, não o publique nem o envie ao chat. Para conferir a recuperação, `SAVER_RESTORE_DIR` também aceita o caminho absoluto desse arquivo JSON. O download pelo navegador admite até 16 MiB de fotos; para acervos maiores, use o terminal abaixo, que mantém fotos em arquivos separados.

O exportador usa a API administrativa protegida pelo Access. Obtenha um JWT da sessão autorizada (ou `cloudflared access token --app https://painel` se já tiver esse cliente instalado) e coloque-o somente na variável de ambiente `CF_ACCESS_JWT` do terminal. Não cole tokens em issues, commits ou conversas. O token não é gravado no backup. Uma sessão expirada encerra a exportação sem produzir um manifesto completo.

Em uma janela sem manutenção de catálogo/fotos/pedidos, execute:

```powershell
npm run backup -- https://saver-admin-staging.fazcents.workers.dev .private-backups/staging-AAAA-MM-DD-HHMM
Remove-Item Env:CF_ACCESS_JWT
```

A pasta precisa ser nova. O script restringe permissões ao usuário atual no Windows com `icacls`; em sistemas POSIX usa diretórios 0700 e arquivos 0600. Mantenha-a em disco privado/criptografado e fora de `public`, `admin`, `dist`, sincronizações públicas e artefatos de CI. `.private-backups/` é ignorada pelo Git. O backup contém dados pessoais e links de WhatsApp: compartilhe apenas com quem administra a loja. Este procedimento não envia backups para serviços pagos.

`manifest.json` só é escrito ao final, após baixar todos os bytes de cada mídia não removida e calcular SHA-256. A consulta dos oito conjuntos de dados usa um único batch D1 consistente. Cada foto é obtida por sua chave exata; o exportador não usa a alternativa de uma foto anterior como se fosse a nova. Erro de rede, cota, foto ainda não propagada ou tamanho divergente interrompe a cópia. Uma pasta sem manifesto é incompleta: aguarde a propagação e repita em outra pasta. Uploads interrompidos podem deixar mídia sem bytes; descarte os uploads órfãos pelo painel antes de refazer o backup. Fotos anteriores da cadeia de distribuição são incluídas.

O endpoint JSON comporta até 8 MiB de dados estruturados, sem embutir fotos. Se esse limite for atingido, suspenda a publicação e use a exportação D1 do Wrangler (`wrangler d1 export ... --remote --output arquivo.sql`) junto da cópia das chaves KV em janela de manutenção; esse caminho maior exige ensaio próprio de restauração antes de ser considerado backup validado. Não prometa recuperabilidade dessa alternativa sem esse ensaio. Fotos e chamadas consomem as cotas gratuitas; falhas não ativam plano pago. Guarde uma cópia local adicional em dispositivo privado desconectado.

## Restauração isolada executável

Não há rota HTTP de restauração em produção. O procedimento executa o mesmo restaurador usado no teste de recuperação, com Workers, D1 e KV descartáveis do Miniflare:

```powershell
$env:SAVER_RESTORE_DIR = (Resolve-Path .private-backups/staging-AAAA-MM-DD-HHMM).Path
npm run restore:demo
# Cardápio: http://localhost:8797
# Painel com identidade fictícia local: http://localhost:8798
# Encerrar com Ctrl+C ao terminar a conferência.
Remove-Item Env:SAVER_RESTORE_DIR
```

Esse servidor é exclusivo de teste local, não usa recursos remotos, não é publicado e nunca deve ser exposto à rede. Os dados restaurados são pessoais: faça a conferência em computador privado. Sem `SAVER_RESTORE_DIR`, `npm run demo` continua iniciando uma demonstração vazia nessas portas. A persistência do ensaio dura somente enquanto o processo está aberto; o backup continua intacto em disco.

O restaurador aceita somente banco vazio, valida fotos e colunas, mantém originais, revisões, clientes, configurações, referências e saldos. Durante uma única transação, suspende os triggers de efeitos, insere os registros históricos, verifica chaves estrangeiras, soma de movimentos/saldos e contagem de revisões, e recria os triggers. Não reaplica baixas ou devoluções. Uma falha no batch preserva o banco vazio; fotos copiadas antes da falha são apenas resíduos no KV isolado, que deve ser descartado antes de novo ensaio.

Conferir pelo painel: busca por celular, endereço atual, pedido com original e revisões, estados após cancelamento/reabertura, preço negociado e estoque/histórico. Conferir pelo cardápio a foto substituída. Concluir um confirmado restaurado não pode baixar novamente. Registre referências fictícias ou evidência privada; não publique dados pessoais reais em logs de CI. O teste `tests/backup.test.ts` executa o exportador de verdade, restaura em outro runtime e verifica os efeitos por HTTP. Com `$env:SAVER_BACKUP_BROWSER='1'`, também confere as telas e grava capturas locais em `.wrangler/restored-*-mobile.png`.

## Publicação automática e ambientes

Os workflows em `.github/workflows/` validam pushes/PRs. Um push em `main` aprovado publica homologação automaticamente; produção exige `workflow_dispatch` explícito. Os environments GitHub `staging` e `production` foram criados com restrição à branch `main`; produção exige aprovação de `WellingtonDeOliveira`. A variável pública `CLOUDFLARE_ACCOUNT_ID` e o secret cifrado `CLOUDFLARE_API_TOKEN` foram configurados nos dois environments após autorização explícita do usuário. Use permissão de edição de Workers/D1/KV apenas na conta necessária e não coloque tokens no repositório. O workflow falha cedo com mensagem clara se faltar credencial.

A configuração de ambientes foi conferida pela API oficial. O endpoint e os campos estão documentados em [GitHub: ambientes de publicação](https://docs.github.com/en/rest/deployments/environments#create-or-update-an-environment). Uma aprovação pelo próprio proprietário é permitida, pois esta operação possui um único administrador; cada job de produção aguarda essa aprovação. O primeiro foi aprovado sob a autorização explícita do usuário e concluiu com sucesso.

`scripts/check-deploy.mjs` rejeita Access incompleto, banco/KV compartilhados entre ambientes, vínculos divergentes e endpoints alternativos habilitados em produção. Nenhum workflow cria assinatura ou serviço pago. A cota gratuita do GitHub Actions também pode suspender a publicação. Migrações são aplicadas no banco do ambiente antes da publicação; não altere IDs para contornar falhas.

Antes de cada publicação de produção: backup completo e restaurado, plano Workers Free/Access Free/D1 Free/KV Free confirmado na conta, Access cobrindo todo o hostname administrativo e somente o e-mail autorizado, ausência de caminhos alternativos, teste com sessão autorizada e outra não autorizada. Tokens locais assinados não substituem a validação real do Access. `ACCESS_ISSUER`, `ACCESS_AUD` e `ADMIN_EMAIL` de produção foram preenchidos com a aplicação Access real; o guard de produção passou.

## Troca de domínio e retorno

1. Validar em homologação manutenção de produtos/fotos/configurações, seleção persistente, revisão de preço/disponibilidade, retirada/entrega, falha do ViaCEP, clientes e o ciclo integrado dos pedidos. Confirmar os saldos após edição, cancelamento, reabertura, reconfirmação e retorno físico parcial. Simular falhas/cotas nos testes; não esgotar cotas reais.
2. Registrar o commit atualmente servido pelo site antigo e sua configuração Pages/DNS (incluindo CNAME, apex, www e TTL) antes de alterar. O site antigo estático permanece na raiz e os Workers usam apenas `dist/public` e `dist/admin`.
3. Fazer backup novo, ensaiar restauração e pausar atendimento administrativo durante a troca. Preservar uma cópia das configurações de DNS/rotas anteriores.
4. Publicar os Workers de produção após preencher e validar Access. Criar rotas/custom domains para `saverdoceria.com.br` e `admin.saverdoceria.com.br`; configurar `www.saverdoceria.com.br` para redirecionar ao principal preservando caminho e consulta. Manter `workers_dev=false` e `preview_urls=false` em produção. Verificar certificados e HTTPS nos três nomes.
5. Conferir catálogo/solicitação real de teste e painel autenticado, acesso sem sessão/identidade não autorizada, rejeição de origem externa, ausência de administração pública e fotos novas. Só então desativar a publicação antiga. Não importar o catálogo sazonal para o novo banco.
6. Se for preciso voltar: pausar novas solicitações, exportar **também os dados novos** do período, preservar D1/KV de produção e restaurar DNS/Pages/rotas ao registro anterior. Não restaure backup antigo sobre pedidos novos. O atendimento das solicitações já registradas continua pelo WhatsApp/painel protegido; o site antigo não consome o novo banco. Conciliar manualmente esses registros antes de reabrir o novo site.

Sem reserva no envio, a disponibilidade final é confirmada no atendimento. Interrupções por cotas gratuitas e atraso de propagação KV são limitações aceitas. Ausência de credencial, secrets, política Access, backup ou teste de domínio deve permanecer como pendência, nunca como publicação concluída.

## Estado real conferido em 22/10/2026

### Atualização do painel móvel e segundo administrador

O painel móvel foi publicado em `aa18b60`, com navegação inferior, filtros recolhíveis, cartões de produtos e formulários adaptados. CI `39760172366` e deploys staging `39760407580` / produção `39760185855` aprovados. Validação real em 320/390px e desktop 1024px realizada após publicação.

Após confirmação explícita do usuário, produção permite também sarahnogueira957@gmail.com, com as mesmas permissões administrativas completas, incluindo clientes e backups. A lista `ADMIN_EMAILS` no Worker e a política Access exclusiva de produção `4c90a8ae-c57a-405f-af24-8fa45a1fb05d` correspondem a essa autorização. A política anterior e o acesso atual foram preservados; homologação mantém apenas sua identidade anterior. Para alterar administradores, é necessário manter tanto a lista do Worker quanto as políticas de e-mail exato do Access correspondentes ao ambiente. `ADMIN_EMAIL` continua compatível quando ADMIN_EMAILS não está definida.

O primeiro login de Sarah deve ser realizado por ela no endereço do painel; o agente conferiu a política salva e os testes de autorização, sem acessar a conta de e-mail dela. Registro detalhado em [.scratch/painel-mobile/issues/01-painel-mobile-e-acesso.md](../.scratch/painel-mobile/issues/01-painel-mobile-e-acesso.md).

### Publicação inicial

- Homologação e produção publicadas após autorização explícita do usuário. Zona ativa, NS sue.ns.cloudflare.com/wesley.ns.cloudflare.com conferidos publicamente; Universal SSL ativo, Always Use HTTPS ligado; HTTP apex retorna 301 HTTPS e www retorna 308 ao principal preservando caminho/consulta.
- Produção: [cardápio](https://saverdoceria.com.br) e [painel](https://admin.saverdoceria.com.br). D1/KV exclusivos inicialmente vazios, migrações 0001–0003 aplicadas, catálogo sazonal não importado. Dados da loja configurados. Item técnico oculto/arquivado e categoria inativa após o ensaio; catálogo final vazio.
- Access produção a02bbdce-ab80-4b94-90df-ddb2e32f76b4, hostname administrativo inteiro, política de e-mail exato da proprietária. Sessão autorizada real conferida; rotas raiz/index/admin.js/orders/clients/backup sem sessão/JWT inválido retornam 302 Access. Workers.dev produção retorna 404 e previews estão desligados. Origem externa no POST retorna 403; administração no site público retorna 404. Não houve segunda identidade autenticada não autorizada disponível para ensaio; não confundir os testes sem sessão com esse teste adicional.
- Token de conta criado no escopo autorizado: Workers Scripts Write/D1 Write/Workers KV Storage Write/Account Settings Read, validade até 20/01/2027. O escopo alcança esses recursos de toda a conta. Secret cifrado nos environments GitHub staging/production; não reutilizado o token Pages de outro projeto. Renovar antes do vencimento, revogar o anterior após testar a substituição e nunca versionar valores.
- Backup remoto de staging atualizado antes da troca e backup real de produção baixado pelo painel foram restaurados em runtimes locais vazios. Fotos, cliente, pedido original/revisões e saldos conferidos. Arquivos privados em .private-backups/pre-production-2026-10-22/, incluindo exportação do D1 de produção inicialmente vazio e configuração Pages anterior; pasta ignorada e ACL restrita. Fazer cópias privadas regulares conforme o procedimento acima.
- Ensaio fictício de produção sem mensagem WhatsApp: pedido 74da64e0-ed65-4675-af13-1691d949a4be; confirmar levou saldo 2→1, cancelar 1→2; backup restaurou cancelado v3 e duas revisões sem reaplicar movimentos. Evidências completas em [acceptance-issue-16.md](../.scratch/cardapio-administracao/acceptance-issue-16.md).
- Site antigo GitHub Pages desativado somente após validar o novo domínio. Branch remota codex/site-antigo-pre-migracao preserva 5d7c6cefd5620b1f7496ecbd7092dba90e53e0fa, CNAME saverdoceria.shop; configuração Pages/DNS anterior privada preservada. Para retorno, usar essa branch/configuração, preservar pedidos novos e seguir a janela de manutenção acima. Não reativar Pages apontando a main atual e seu CNAME novo.
- PR #2 integrado à main em 81154fa; CI completo aprovado no PR (39753400274) e main (39754702694). Publicação automática de staging comprovada na execução [39755014365](https://github.com/WellingtonDeOliveira/saver_doceria/actions/runs/39755014365); produção pela execução [39754830782](https://github.com/WellingtonDeOliveira/saver_doceria/actions/runs/39754830782), com aprovação do environment. Ambos aplicaram/verificaram migrações e publicaram os dois Workers com sucesso. A cópia local temporária do token foi removida; os secrets permanecem cifrados no GitHub. Automação de retomada pausada por conclusão das issues 05–16.
