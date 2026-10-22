# 02: Administrar produtos e categorias

**What to build:** A proprietária organiza e mantém os doces pelo painel e vê suas alterações refletidas no cardápio, sem perder cadastros ou histórico ao ocultar ofertas.

**Blocked by:** 01 — Primeiro doce cadastrado e exibido

**Status:** ready-for-agent

- [x] Permitir editar dados de produto, duplicar cadastro, buscar e filtrar por categoria e estado, e ordenar sua exibição.
- [x] Tratar cada apresentação de venda como produto separado, com preço e estoque próprios e identificador estável.
- [x] Duplicar um cadastro cria nova identidade sem duplicar saldo ou movimentações existentes; a quantidade inicial do novo produto deve ser explicitamente informada.
- [x] Permitir criar, renomear, ordenar e desativar categorias e ocultar produtos manualmente.
- [x] Exibir somente produtos publicados, não arquivados, com estoque positivo e categoria ativa; omitir categorias sem produtos visíveis.
- [x] Ocultar, desativar ou arquivar não apaga cadastros, não altera estoque e preserva referências históricas.
- [x] Atualizações persistem e chegam ao cardápio após atualização do cache; estados de carregamento e erro são compreensíveis no celular.
- [x] Testes HTTP verificam as combinações de visibilidade e alterações; um fluxo pelo navegador cobre manutenção de produto e categoria sem depender de mouse.


## Comments

### Implementação — 2026-10-21

Implementado no painel e na API; contratos HTTP e fluxo móvel cobrem os critérios acima. A validação remota integrada depende da configuração Access e publicação da issue 01.

Frontend segue `docs/design/Saver Doceria — Design.html`. Pontos de teste HTTP dos Workers e navegador móvel, com base de revisão `5d7c6ce`, confirmados pelo usuário. Instruções operacionais e limites em `README.md`.
