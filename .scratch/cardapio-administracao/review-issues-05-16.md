# Revisão das issues 05–16

Base: `8768da3cea8b9cab2790b375f09c373d65912c0d`, HEAD inicial `d2d218c`.
Comando: `git diff 8768da3cea8b9cab2790b375f09c373d65912c0d...HEAD`.
Revisores independentes conforme a skill code-review: `/root/review_standards` e `/root/review_spec`.

## Standards

Nenhuma violação obrigatória encontrada nas normas documentadas. A implementação respeita CONTEXT.md e os ADRs de estoque, privacidade e custo zero.

- **[P3] Possível Duplicated Code — lista de tabelas do backup.** `scripts/restore-backup.ts` repetia a lista `backupTables` já importada de `src/backup.ts`. Uma futura inclusão poderia divergir entre exportação e restauração. Julgamento de manutenção, sem defeito no formato atual. **Corrigido:** o restaurador usa diretamente a lista compartilhada, na mesma ordem.

Standards: 0 violações obrigatórias e 1 observação P3 corrigida; nenhum bloqueador identificado.

## Spec

- **[P2] Alteração paralela do carrinho podia perder itens.** A issue 06 exige “Preservar o carrinho no navegador”. Enquanto o POST aguardava resposta, o cliente podia adicionar doces e o sucesso limpava também os itens novos. **Corrigido:** catálogo, itens e formulário ficam indisponíveis durante o registro. O teste móvel segura a resposta, verifica que adicionar está desabilitado e depois exercita falha de conexão e repetição idempotente com resposta perdida. A asserção final passou.
- **[P2] Retorno físico histórico e sua repetição podiam ser recusados.** A issue 14 exige retorno com referência e repetição sem duplicação. A consulta validava somente produtos da versão atual, antes da idempotência. **Corrigido:** a operação anterior é consultada primeiro; o vínculo aceita original, versão atual e revisões. O teste HTTP registra retorno de A, reabre, troca por B, repete o retorno antigo e registra novo retorno de A; passou.

O revisor conferiu ambos os ajustes e não identificou ampliação indevida de escopo nem outro defeito concreto em atomicidade, histórico, privacidade ou recuperação. A issue 16 permanece condicionada às validações externas.

Spec: 2 achados P2 corrigidos; nenhum defeito local adicional identificado. Pior pendência: aceite remoto/produção da issue 16.

## Validação

- Typecheck aprovado.
- Suíte completa: 15 testes HTTP/recuperação aprovados, incluindo falha de gravação, disputa pela última unidade e limitação de recebimento público.
- Quatro fluxos móveis aprovados antes da revisão; após os ajustes, testes HTTP de pedidos passaram novamente e o fluxo móvel focado de envio/resposta perdida passou.
- Builds dos dois Workers aprovados em dry-run.
- Backup executado pelo CLI e baixado pelo painel foi restaurado em runtimes independentes; saldo, revisões, cliente e duas versões da foto conferidos por HTTP e navegador.
- Capturas locais de pedido e catálogo restaurados em `.wrangler/`, inspecionadas visualmente.
- `check-deploy staging` aprovado; produção corretamente bloqueada por `ACCESS_ISSUER` ainda vazio.
