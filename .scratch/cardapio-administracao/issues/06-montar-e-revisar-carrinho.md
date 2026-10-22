# 06: Montar e revisar o carrinho

**What to build:** O cliente monta o carrinho, mantém sua seleção ao atualizar a página e revisa explicitamente diferenças de preço ou disponibilidade antes de avançar.

**Blocked by:** 01 — Primeiro doce cadastrado e exibido

**Status:** ready-for-agent

- [x] Permitir adicionar produtos, alterar quantidades e remover itens usando identificadores estáveis, sem confundir produtos de mesmo nome.
- [x] Exibir quantidades, subtotais e total dos doces com cálculo em centavos inteiros.
- [x] Preservar o carrinho no navegador ao recarregar; tratar conteúdo persistido inválido sem quebrar a página.
- [x] Revalidar produtos, quantidades, visibilidade e preços por consulta HTTP autoritativa, sem confiar nos valores enviados pelo navegador.
- [x] Preço alterado, produto indisponível ou quantidade insuficiente apresenta as diferenças e exige revisão explícita antes de prosseguir.
- [x] Revalidar não reserva nem baixa estoque; carrinho vazio e falhas de conexão têm comportamento compreensível.
- [x] Testes HTTP verificam o contrato de revalidação; testes de navegador cobrem seleção, persistência, revisão e uso no celular.



## Comments

Implementação local concluída nesta execução. Validação: HTTP dos Workers com D1/KV descartáveis e fluxos móveis Playwright. Contratos e limitações em README.md; backup, restauração isolada e publicação em docs/backup-e-publicacao.md. Publicação e migração reais são acompanhadas separadamente na issue 16.
