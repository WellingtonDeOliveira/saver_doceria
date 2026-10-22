# Revisão das issues 01–04

Base confirmada pelo usuário: `5d7c6cefd5620b1f7496ecbd7092dba90e53e0fa`.
Comando da revisão: `git diff 5d7c6ce...HEAD`.
Implementação inicial: `1219be5`. Revisões de padrões e especificação executadas por agentes independentes conforme a skill `code-review`.

## Standards

Nenhuma violação das normas documentadas encontrada. A terminologia segue `CONTEXT.md`; os ADRs de estoque, privacidade e armazenamento gratuito foram respeitados no escopo implementado.

- **[P3] Possível Duplicated Code — regra de visibilidade repetida.** `src/catalog.ts` e `src/media.ts` repetiam `p.published=1 AND p.archived=0 AND p.stock>0`, junto da condição de categoria ativa. Uma alteração futura poderia liberar a foto de um produto que deixou de aparecer no cardápio, ou produzir categorias inconsistentes. É uma sugestão de manutenção, sem defeito observável no comportamento original. **Corrigido:** as consultas compartilham `visibleProductSql`. Testes HTTP de catálogo e mídia passaram após a mudança.

## Spec

- **[P2] A validação aceitava imagens PNG inválidas.** A validação verificava limites dos chunks e `IEND`, mas não exigia dados `IDAT` nem verificava CRC. Um PNG de 66 bytes com cabeçalho válido e nenhum `IDAT` retornava 201 na API, embora fosse indecodificável. Violava a issue 04: “rejeitar arquivos inválidos com mensagem clara”. **Corrigido:** validação de CRC, cabeçalho, paleta, dados comprimidos, tamanho descomprimido, linhas/filtros e Adam7. O teste de regressão confirmou falha antes da correção e aprovação depois. O revisor reproduziu novamente o arquivo inválido e confirmou resposta 400, sem encontrar novo defeito concreto no ajuste.
- **Aceite remoto pendente, corretamente documentado.** A issue 01 exige “Disponibilizar o primeiro fluxo completo em Workers público e administrativo” e acesso restrito “ao e-mail autorizado pelo Access”. Os recursos foram provisionados e o banco de homologação foi migrado, mas faltam publicação, configuração do Access e validação com as identidades reais. Os testes locais não concluem esses critérios. **Permanece aberto:** a credencial não permite configurar Access nem consultar assinaturas, e faltam e-mail autorizado, emissor e audiência. Nenhum Worker foi publicado ou domínio migrado.

Não foi identificada ampliação indevida de escopo.

Standards: 0 violações obrigatórias e 1 observação P3 corrigida. Spec: 2 achados, sendo o defeito de validação corrigido e o aceite remoto pendente. Pior achado restante em Standards: nenhum; em Spec: entrega remota da issue 01.

## Validação

- Typecheck TypeScript aprovado.
- Suíte HTTP completa: 5 cenários aprovados, com D1/KV locais reais.
- Fluxo móvel Playwright aprovado, com cadastro, edição, categorias por teclado, persistência ao recarregar, estoque, prévia e substituição de fotos.
- Capturas móveis de cardápio e estoque inspecionadas contra o design de `docs/design/`.
- Builds dos dois Workers aprovados em dry-run.
- Após os ajustes da revisão: testes HTTP de catálogo e mídia e typecheck aprovados; build refeito.
- `npm audit`: nenhuma vulnerabilidade conhecida na instalação validada.

## Atualização após a revisão: homologação publicada

A pendência de publicação e configuração do Access foi resolvida na continuação autorizada pelo usuário. A aplicação `Saver Doceria — Administração (homologação)` foi criada com Allow para somente `wellington220100@gmail.com`; emissor, AUD e e-mail foram configurados. Workers Free e Teams Free Base foram confirmados pelo painel da conta antes da publicação.

Os Workers de homologação estão publicados. O login real da proprietária e o teste de políticas do Access foram aprovados; requisições independentes sem sessão à página, ao HTML direto e à mutação administrativa foram redirecionadas ao Access. Cadastro, persistência após recarregar, exibição pública, upload e troca de foto, esgotamento/reposição e histórico foram validados remotamente. Dados de teste ficaram ocultos/arquivados, com categoria desativada e histórico preservado. Produção não foi publicada. Não foi usada uma segunda conta autenticada para repetir o teste negativo de e-mail, que segue coberto por HTTP local e pela política exata do Access.

Os apontamentos acima registram a situação na revisão inicial; não há defeito de implementação pendente identificado pelos revisores.
