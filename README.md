# Saver Doceria

Cardápio público e painel administrativo das issues 01–04, em dois Cloudflare Workers, com D1 e KV. O novo fluxo começa vazio. O site estático antigo na raiz permanece disponível para a migração futura do domínio (issue 16); os Workers publicam exclusivamente os diretórios `public/` e `admin/`.

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

O painel exige Access também localmente. Configure as variáveis de desenvolvimento com um emissor/AUD/e-mail válidos e encaminhe o JWT pelo proxy de desenvolvimento da sua aplicação Access. Para uma demonstração descartável, `npm run demo` serve `http://localhost:8787` e `http://localhost:8788` com dados e identidade fictícios; esse servidor não é implantado nem conectado aos bancos remotos.

## Homologação e produção

Os IDs D1/KV nos dois arquivos Wrangler já apontam a recursos separados da conta usada nesta sessão. A migração de homologação foi aplicada. A produção foi apenas provisionada, sem publicação ou troca de domínio.

Antes de publicar o painel, configurar uma aplicação **Cloudflare Access** que cubra todo o hostname administrativo, com política Allow para somente o e-mail da proprietária. Preencher em `wrangler.admin.jsonc`, no ambiente escolhido:

- `ACCESS_ISSUER`: `https://<equipe>.cloudflareaccess.com`, sem barra final.
- `ACCESS_AUD`: audiência da aplicação administrativa.
- `ADMIN_EMAIL`: e-mail autorizado da proprietária.
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

O endereço previsto do Worker público de homologação é `saver-public-staging.fazcents.workers.dev`; os Workers ainda não foram publicados. O emissor e o e-mail de homologação foram informados pelo usuário; falta a audiência da aplicação administrativa. A credencial atual não tem permissões de Access; a validação da política com identidade autorizada e não autorizada permanece pendente. Os testes locais não substituem esse aceite.

Usar apenas Workers Free, D1 Free, KV Free e Access Free. Nenhum comando do projeto contrata plano, R2 ou excedentes pagos. Confirmar os planos gratuitos da conta antes da publicação, pois o token atual não permite consultar assinaturas. Esgotamento de cota retorna indisponibilidade; não existe fallback pago.

## Contratos HTTP

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

Implementação baseada em `docs/design/Saver Doceria — Design.html`: Fraunces para títulos, DM Sans para interface, paleta chocolate/rosa, cartões arredondados, navegação lateral no desktop e formulários acessíveis no celular. Logo e fontes são locais; a licença das fontes extraída da referência está em `public/assets/FONT-LICENSE.txt`. Carrinho, solicitações e pedidos continuam nas issues seguintes.
