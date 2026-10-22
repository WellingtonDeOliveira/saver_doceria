# Saver Doceria

Cardápio público e painel administrativo em dois Cloudflare Workers, com D1 e KV. Inclui configurações, carrinho persistente, revalidação, retirada/entrega com ajuda ViaCEP, solicitações pelo WhatsApp, clientes, negociação e ciclo de pedidos com estoque atômico. O novo fluxo começa vazio. O código estático antigo na raiz e a branch `codex/site-antigo-pre-migracao` ficam preservados para retorno; sua publicação Pages foi desativada após a migração. Os Workers publicam exclusivamente os assets gerados a partir de `public/` e `admin/`.

## Desenvolvimento e validação

Requer Node.js 22 ou superior.

```sh
npm ci
npm run typecheck
npm test
npx playwright install chromium
npm run test:browser
npm run build
```

Os testes HTTP usam Workers reais no Miniflare, com D1/KV locais descartáveis. O emissor de chaves do Access é simulado, mas os tokens são assinados e verificados. Falhas de KV e gravação são injetadas somente nos testes. O teste móvel usa um proxy **exclusivo de teste**, com JWT válido, sem criar uma rota de autenticação alternativa no código publicado.

Para desenvolvimento com dados persistentes locais:

```sh
npm run assets
npx wrangler d1 migrations apply saver-local --local --config wrangler.admin.jsonc
npm run dev
```

O painel exige Access também localmente. Configure as variáveis de desenvolvimento com um emissor/AUD/e-mail válidos e encaminhe o JWT pelo proxy de desenvolvimento da sua aplicação Access. Para uma demonstração descartável, `npm run demo` serve `http://localhost:8797` e `http://localhost:8798` com dados e identidade fictícios; esse servidor não é implantado nem conectado aos bancos remotos.

## Homologação e produção

Os IDs D1/KV nos dois arquivos Wrangler apontam a recursos separados da conta usada nesta sessão. Migrações e Workers de homologação e produção foram publicados e validados. A produção usa `saverdoceria.com.br` e `admin.saverdoceria.com.br`, com Access e HTTPS; os endpoints alternativos de produção ficam desativados.

Domínio de produção atualizado pelo usuário: `saverdoceria.com.br`, com painel em `admin.saverdoceria.com.br`. O `CNAME` e as origens previstas de produção refletem esse endereço. Homologação permanece nos hostnames `*.fazcents.workers.dev`.

Antes de publicar o painel, configurar uma aplicação **Cloudflare Access** que cubra todo o hostname administrativo, com política Allow para somente o e-mail da proprietária. Preencher em `wrangler.admin.jsonc`, no ambiente escolhido:

- `ACCESS_ISSUER`: `https://<equipe>.cloudflareaccess.com`, sem barra final.
- `ACCESS_AUD`: audiência da aplicação administrativa.
- `ADMIN_EMAILS`: lista de e-mails administrativos exatos, separada por vírgula. A configuração deve corresponder às políticas Allow do Cloudflare Access para o mesmo ambiente. Cada identidade autorizada tem acesso administrativo completo, incluindo clientes e backups. `ADMIN_EMAIL` permanece compatível como configuração de uma única identidade quando a lista não está definida. Homologação mantém sua própria lista/política.
- `ADMIN_ORIGIN`: origem exata do painel, sem barra final.
- `PUBLIC_ORIGIN`: origem pública do mesmo ambiente.

A API valida assinatura RS256, emissor, audiência, validade e e-mail. Toda mutação confere `Origin`. O Worker executa antes de **todos** os assets, incluindo `index.html`. Não há bypass por variável local, cookie inventado ou cabeçalho de identidade. Sem configuração ou autenticação, o acesso falha fechado. URLs de preview ficam desativadas. Ativar `workers_dev` no painel de homologação somente após configurar o Access para esse hostname, ou configurar uma rota própria protegida pelo Access; manter acesso alternativo bloqueado na produção.

```sh
npm run assets
npx wrangler d1 migrations apply saver-staging --remote --env staging --config wrangler.admin.jsonc
npx wrangler deploy --env staging --config wrangler.public.jsonc
npx wrangler deploy --env staging --config wrangler.admin.jsonc
```

Em redes com falha IPv6, usar `node --dns-result-order=ipv4first node_modules/wrangler/bin/wrangler.js` no lugar de `npx wrangler`.

Ambiente publicado:

- [Cardápio de homologação](https://saver-public-staging.fazcents.workers.dev/).
- [Painel de homologação](https://saver-admin-staging.fazcents.workers.dev/), protegido pelo Access.
- Aplicação Access: `Saver Doceria — Administração (homologação)`, ID `2e28ba3a-ce5c-465b-b0c6-028eda54bc07`, com política Allow exclusivamente para `wellington220100@gmail.com`.
- Emissor e AUD constam em `wrangler.admin.jsonc`. O AUD é identificador público da aplicação, não uma credencial.

A autenticação real da proprietária foi validada pelo navegador e pelo teste de políticas do Access. Requisições independentes sem sessão à raiz administrativa, a `/index.html` e à mutação `/api/categories` retornaram 302 para o Access, inclusive com cabeçalho JWT inválido; o catálogo público retornou 200. Foi validado o fluxo remoto de cadastro, persistência após recarregar, foto, esgotamento, reposição, histórico e substituição de foto com nova URL. O produto de teste foi ocultado e arquivado; sua categoria foi desativada, preservando o histórico e deixando o cardápio vazio novamente. Não foi usada uma segunda conta autenticada para o teste negativo de e-mail; esse caso permanece coberto pelos testes HTTP locais e pela política de e-mail exato.

Usar apenas Workers Free, D1 Free, KV Free e Access Free. O painel de assinaturas confirmou Workers Free ativo e Teams Free Base antes desta publicação. Nenhum comando do projeto contrata plano, R2 ou excedentes pagos. Esgotamento de cota retorna indisponibilidade; não existe fallback pago.

## Contratos HTTP

Os fluxos de solicitação, pedidos e recuperação das issues 05–15 estão implementados. Os procedimentos de backup/restauração, CI, publicação e retorno ao site anterior estão em [docs/backup-e-publicacao.md](docs/backup-e-publicacao.md). A issue 16 só pode ser encerrada após as verificações reais de produção e DNS.

Em 22/10/2026, o escopo integrado foi publicado em homologação e produção após autorização da proprietária. [Cardápio](https://saverdoceria.com.br) e [painel protegido](https://admin.saverdoceria.com.br) usam HTTPS; www redireciona ao principal. Solicitação, confirmação/cancelamento, saldo, foto e backup de produção baixado/restaurado foram conferidos. O [PR #2](https://github.com/WellingtonDeOliveira/saver_doceria/pull/2) passou pelo CI e foi integrado à main. O catálogo começa vazio para cadastro real; o item de ensaio foi arquivado. GitHub Pages antigo foi desativado após o aceite técnico, com a versão anterior preservada na branch `codex/site-antigo-pre-migracao`. Evidências em [.scratch/cardapio-administracao/acceptance-issue-16.md](.scratch/cardapio-administracao/acceptance-issue-16.md).

Além dos contratos abaixo:

- `GET /api/settings` público expõe nome, WhatsApp, mensagem e aviso; `PUT /api/settings` administrativo exige versão.
- `POST /api/quote` revalida de 1 a 50 produtos e até 1000 unidades por produto. Valores são recalculados em centavos; diferenças exigem revisão explícita.
- `POST /api/orders` público exige origem do site, chave UUID v4 de idempotência, nome, celular brasileiro com DDD, modalidade e carrinho revisado; entrega exige endereço. Limite de 10 novas solicitações por IP por hora, sem reserva/baixa. Retorna somente referência e mensagem com os dados do próprio envio.
- `GET /api/orders[/:reference]` e `PATCH /api/orders/:reference` administrativos consultam e negociam; `POST /api/orders/:reference/{confirm,complete,cancel,reopen}` aplica o ciclo. Alterações exigem versão e chave UUID de idempotência; original e revisões permanecem preservados.
- `GET /api/clients?phone=...` e `GET /api/clients/:id` são exclusivos do administrador.
- `GET /api/backup` e `GET /api/backup/media/:id` são exclusivos do administrador e não usam cache. A restauração executável ocorre somente em ambiente local vazio.
- Retorno físico em `/api/products/:id/stock` exige também `order_reference`, vinculando a entrada justificada a um pedido com aquele produto.

| Interface | Comportamento |
|---|---|
| `GET /api/catalog` (público) | Categorias úteis e produtos publicados, não arquivados, com saldo positivo e categoria ativa; sem dados administrativos |
| `GET/POST /api/categories`, `PATCH /api/categories/:id` | Cadastro, nome, ordem e estado; edição exige `version` |
| `GET/POST /api/products`, `GET/PATCH /api/products/:id` | Cadastro e manutenção; busca `q`, filtros `category` e `state`; edição exige `version` |
| `POST /api/products/:id/duplicate` | Nova identidade; `initial_stock` explícito obrigatório; sem copiar foto ou movimentações |
| `GET/POST /api/products/:id/stock` | Histórico ou movimentação; POST exige `Idempotency-Key`, `version`, `kind`, `quantity` e justificativa quando aplicável |
| `POST /api/media` | Corpo binário JPEG/PNG/WebP, até 256 KiB e 1600 × 1600 pixels; retorna referência e URL temporária de prévia |
| `PUT /api/products/:id/photo` | Troca de referência com `media_id` e `version`; mantém anterior em falha e retorna 425 enquanto a foto não estiver acessível |
| `GET /api/media/:id/preview` | Prévia autenticada, inclusive para produtos ocultos e arquivados |
| `POST /api/media/cleanup`, `DELETE /api/media/:id` | Limpeza autenticada; nunca remove referências em uso |
| `GET /media/:id` (público) | Foto de produto visível; prévia de upload exige token temporário imprevisível |

Valores monetários são inteiros em centavos. Cada apresentação é um produto com ID próprio. Edições não alteram estoque. Movimentações são inseridas e aplicadas por trigger na mesma transação, com saldo não negativo e versão otimista. Cadastro de produto e saldo inicial usam uma única transação D1. A mesma chave de estoque com dados diferentes recebe 409. Correção define o saldo final; entrada/saída/retorno físico recebem quantidade positiva. Correção e retorno físico exigem justificativa.

## Fotos, cache e falhas

A prévia comprime no navegador originais de até 5 MiB. O servidor verifica tipo real, dimensões, tamanho e estrutura básica do arquivo. Cada envio tem chave nova. O painel carrega a imagem pela origem pública antes de pedir a troca; o servidor verifica novamente a disponibilidade e a versão do produto. Se qualquer etapa falhar, a referência anterior permanece.

O KV possui propagação eventual. A cadeia de imagens anteriores é preservada como alternativa: caso uma região ainda não encontre a nova foto, serve a anterior sem cache. Respostas da foto atual têm cache de 5 minutos; catálogo e administração usam `no-store`. Imagens públicas são carregadas com `loading="lazy"`. Referências antigas são retidas enquanto integrarem a cadeia de alternativa, inclusive de produtos ocultos/arquivados; consomem armazenamento e não são consideradas órfãs. Uma futura compactação dessa cadeia exige uma política explícita que preserve a distribuição, sem presumir propagação global instantânea.

A limpeza pelo painel remove até 50 uploads órfãos com mais de 24 horas, ou retoma exclusões interrompidas. A exclusão individual permite descartar um upload recente sem referência. Primeiro marca a mídia como indisponível para novos vínculos no D1, depois remove do KV; falhas podem ser repetidas com segurança. Não remova imagens diretamente pelo KV.

## Design

Implementação baseada em `docs/design/Saver Doceria — Design.html`: Fraunces para títulos, DM Sans para interface, paleta chocolate/rosa, cartões arredondados, navegação lateral no desktop e formulários acessíveis no celular. Logo e fontes são locais; a licença das fontes extraída da referência está em `public/assets/FONT-LICENSE.txt`. Carrinho, solicitações e pedidos seguem os mesmos padrões visuais.
