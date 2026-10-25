Status: ready-for-human
Type: task

# Carrinho em etapas e detalhes dos doces

Implementar o fluxo descrito em [spec.md](../spec.md), preservando os contratos de solicitação, revalidação e estoque existentes.

## Comments

- Implementação local: contador no topo, modais nativos, etapas com conclusão visual, validação de dados, revisão, encaminhamento ao WhatsApp e detalhes dos produtos.
- Implementação e validação concluídas; disponível para conferência visual antes da publicação.

## Answer

- `npm test`: 18 testes aprovados.
- `npm run test:browser`: 9 testes aprovados. Após os ajustes finais de espaçamento e mensagem de etapa, checkout e shopping foram reexecutados: 4 aprovados. O teste adicional de limites do modal também passou.
- `npm run typecheck`, `npm run build` (dry-run dos dois Workers) e `git diff --check`: aprovados.
- Conferência visual móvel e desktop; ausência de rolagem horizontal em 320px, navegação de volta preservando dados, validação de nome/celular, modal com Escape e retorno de foco, atualização de quantidade/contador, aceitação explícita de preço alterado, ViaCEP e preenchimento manual.
- Solicitação com resposta perdida é recuperada sem duplicar; abertura automática do WhatsApp testada com destino interceptado e link de reabertura preservado. Nenhuma mensagem real foi enviada.
- Capturas locais em `.wrangler/product-details-mobile.png`, `.wrangler/cart-mobile.png`, `.wrangler/checkout-review-mobile.png` e `.wrangler/checkout-desktop.png`.
- Publicação não realizada.
