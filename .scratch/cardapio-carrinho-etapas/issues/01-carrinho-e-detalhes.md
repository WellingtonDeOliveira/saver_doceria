Status: ready-for-human
Type: task

# Carrinho em etapas e detalhes dos doces

Implementar o fluxo descrito em [spec.md](../spec.md), preservando os contratos de solicitação, revalidação e estoque existentes.

## Comments

- Implementação local: contador no topo, modais nativos, etapas com conclusão visual, validação de dados, revisão, encaminhamento ao WhatsApp e detalhes dos produtos.
- Implementação, validação e publicação concluídas após autorização explícita do usuário.

## Answer

- `npm test`: 18 testes aprovados.
- `npm run test:browser`: 9 testes aprovados. Após os ajustes finais de espaçamento e mensagem de etapa, checkout e shopping foram reexecutados: 4 aprovados. O teste adicional de limites do modal também passou.
- `npm run typecheck`, `npm run build` (dry-run dos dois Workers) e `git diff --check`: aprovados.
- Conferência visual móvel e desktop; ausência de rolagem horizontal em 320px, navegação de volta preservando dados, validação de nome/celular, modal com Escape e retorno de foco, atualização de quantidade/contador, aceitação explícita de preço alterado, ViaCEP e preenchimento manual.
- Solicitação com resposta perdida é recuperada sem duplicar; abertura automática do WhatsApp testada com destino interceptado e link de reabertura preservado. Nenhuma mensagem real foi enviada.
- Capturas locais em `.wrangler/product-details-mobile.png`, `.wrangler/cart-mobile.png`, `.wrangler/checkout-review-mobile.png` e `.wrangler/checkout-desktop.png`.
- Publicação concluída em 25/10/2026, após autorização explícita do usuário.

## Publicação

- Commit publicado: `baa349081651a42146ca51692803655cf30d9f53`.
- [CI aprovado](https://github.com/WellingtonDeOliveira/saver_doceria/actions/runs/40201701457), [produção aprovada e publicada](https://github.com/WellingtonDeOliveira/saver_doceria/actions/runs/40201752864) e [homologação publicada](https://github.com/WellingtonDeOliveira/saver_doceria/actions/runs/40201819836).
- Backup novo de produção em `.private-backups/pre-carrinho-2026-10-25/backup.json`, protegido por ACL local e ignorado pelo Git. Exportação consistente das oito tabelas por consulta única à API D1; 19 fotos recuperadas pela chave exata no KV, verificadas em tamanho e SHA-256. Restauração no runtime isolado concluída com integridade de fotos, estoque e revisões.
- A sessão OAuth do Wrangler permitiu backup pelo terminal; nenhuma credencial foi impressa ou versionada. A consulta de assinaturas retornou 403; não houve alteração de plano ou contratação de serviços nesta publicação.
- O controle da janela Chrome foi interrompido pela ferramenta por não conseguir determinar a URL com segurança. Nenhuma interação adicional ocorreu nessa janela; publicação e verificações seguiram por CLI/API e navegador Playwright isolado.
- Conferência no domínio real `https://saverdoceria.com.br`: HTTP 200, produto real com detalhes, adição, contador, revalidação, dados, retirada e revisão funcionando; sem erros JavaScript e sem rolagem horizontal em 320px e desktop. Nenhuma solicitação de produção foi criada nem mensagem enviada. Captura local em `.wrangler/live-checkout-mobile.png`.
- Login real administrativo sem sessão segue exigindo Access e oferecendo código por e-mail. Não houve nova sessão autenticada disponível para conferir o painel pela interface após esta publicação; os testes locais administrativos e o deploy do Worker passaram.
