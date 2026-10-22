# 09: Consultar clientes e histórico no administrador

**What to build:** A proprietária busca clientes pelo celular e consulta nome, endereço atual e histórico de pedidos, preservando o contexto de cada solicitação.

**Blocked by:** 08 — Solicitar entrega com endereço e ViaCEP

**Status:** ready-for-agent

- [x] Disponibilizar busca administrativa por celular e detalhe do cliente com endereço atual e pedidos associados.
- [x] Representações equivalentes do mesmo celular normalizado não criam cadastros duplicados.
- [x] Mostrar referência, data, estado e valores dos pedidos e permitir abrir seus detalhes, distinguindo solicitação de compra concluída.
- [x] Exibir em cada pedido seus próprios dados preservados; nova solicitação, alteração do produto ou mudança no endereço atual não reescreve registros anteriores.
- [x] Retirada posterior mantém o último endereço atual disponível no cadastro.
- [x] Nenhuma consulta pública de catálogo, mídia, erro ou envio de solicitação expõe endereço ou histórico existente de um telefone.
- [x] Testes HTTP provam isolamento administrativo e integridade histórica; um fluxo móvel cobre busca do cliente e abertura de um pedido.



## Comments

Implementação local concluída nesta execução. Validação: HTTP dos Workers com D1/KV descartáveis e fluxos móveis Playwright. Contratos e limitações em README.md; backup, restauração isolada e publicação em docs/backup-e-publicacao.md. Publicação e migração reais são acompanhadas separadamente na issue 16.
