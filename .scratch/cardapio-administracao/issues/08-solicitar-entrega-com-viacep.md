# 08: Solicitar entrega com endereço e ViaCEP

**What to build:** O cliente escolhe entrega, preenche endereço com auxílio do CEP e registra a solicitação; a proprietária vê o endereço daquele pedido, independentemente de alterações futuras no cadastro.

**Blocked by:** 07 — Registrar solicitação de retirada e abrir o WhatsApp

**Status:** ready-for-agent

- [x] Permitir escolher entrega ou retirada, mantendo nome e celular obrigatórios em ambas.
- [x] Para entrega, coletar CEP, rua, número ou indicação de sem número, bairro e cidade/UF; complemento é opcional.
- [x] Consultar ViaCEP somente para CEP com oito dígitos, preencher os campos disponíveis e permitir correção manual.
- [x] Tratar CEP inválido, inexistente, campos ausentes, falha de rede e resposta atrasada de consulta anterior, sem impedir preenchimento manual.
- [x] Não inferir número residencial ou complemento do imóvel a partir da consulta de CEP.
- [x] Salvar endereço atual do cliente e cópia independente no pedido; nova entrega substitui apenas o endereço atual, preservando pedidos anteriores.
- [x] Retirada dispensa endereço e não apaga o último endereço do cliente; o detalhe administrativo distingue modalidade e endereço do pedido.
- [x] Indicar frete a combinar fora do total público dos doces e incluir modalidade e endereço aplicável na mensagem do WhatsApp.
- [x] Testes HTTP verificam persistência e preservação de endereços; testes móveis cobrem entrega, retirada e falha do ViaCEP sem consultar o serviço real na suíte.



## Comments

Implementação local concluída nesta execução. Validação: HTTP dos Workers com D1/KV descartáveis e fluxos móveis Playwright. Contratos e limitações em README.md; backup, restauração isolada e publicação em docs/backup-e-publicacao.md. Publicação e migração reais são acompanhadas separadamente na issue 16.
