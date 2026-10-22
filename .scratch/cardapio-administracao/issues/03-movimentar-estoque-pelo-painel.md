# 03: Movimentar estoque pelo painel

**What to build:** A proprietária registra entradas, saídas e correções e consulta o histórico de saldo, enquanto o cardápio acompanha o esgotamento e a reposição dos doces.

**Blocked by:** 01 — Primeiro doce cadastrado e exibido

**Status:** ready-for-agent

- [x] Mostrar saldo de cada produto, incluindo zerados e ocultos, e permitir entradas, saídas e correções exclusivamente pelo administrador.
- [x] Registrar quantidade, saldo anterior e posterior, origem, responsável e data; permitir justificativa e exigi-la em correções e retornos físicos justificados.
- [x] A quantidade permanece inteira e não negativa; uma saída superior ao saldo é rejeitada sem alteração parcial.
- [x] A gravação do saldo e de sua movimentação é atômica; repetição da mesma operação não aplica a movimentação duas vezes.
- [x] Zerar o saldo oculta o produto; repor o saldo volta a permitir exibição se produto e categoria estiverem ativos.
- [x] O histórico inclui o saldo inicial já registrado e permanece acessível após ocultação ou arquivamento.
- [x] Testes HTTP verificam entrada, saída, correção, repetição, falta de saldo e saldo observável; o painel permite executar e consultar uma movimentação pelo celular.


## Comments

### Implementação — 2026-10-21

Implementado no painel e na API; contratos HTTP e fluxo móvel cobrem os critérios acima. A validação remota integrada depende da configuração Access e publicação da issue 01.

Frontend segue `docs/design/Saver Doceria — Design.html`. Pontos de teste HTTP dos Workers e navegador móvel, com base de revisão `5d7c6ce`, confirmados pelo usuário. Instruções operacionais e limites em `README.md`.
