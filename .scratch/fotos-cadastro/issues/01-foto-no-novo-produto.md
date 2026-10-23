Status: ready-for-agent
Type: task

# Foto no cadastro de produto

Relato: não é possível inserir foto ao criar produto, pelo celular ou PC.

## Diagnóstico

`npx playwright test tests/browser/product-photo.spec.ts` reproduziu o campo
"Selecionar foto" desabilitado em 390px e 1280px antes de qualquer envio.
O cadastro impedia a seleção até a primeira gravação; o teste anterior cobria
somente adicionar foto ao editar um produto já salvo.

## Implementação

Permitir seleção e prévia no novo produto e na duplicação. Salvar os dados e
depois vincular a foto pelo fluxo existente ao clicar em Salvar produto.
Se a foto falhar, preservar o produto criado e a prévia, exibindo erro explícito
e permitindo repetir somente o envio sem duplicar produto/estoque inicial.
Manter validações, compressão e limites gratuitos existentes.

## Validação

- Cadastro com foto e persistência após recarga em 390px e 1280px: aprovado.
- Falha simulada no vínculo da foto: cadastro preservado e nova tentativa aprovada,
  sem duplicar produto ou estoque inicial.
- Typecheck, 18 testes HTTP, 8 testes de navegador e build: aprovados.
- Backup real completo de produção baixado pelo painel e restaurado em D1/KV
  locais descartáveis em 23/10/2026 (1 foto, 1 pedido e 1 cliente). Cópia privada
  em `.private-backups/pre-foto-cadastro-2026-10-23/backup.json` (ignorada pelo Git).
- Configurações staging/production verificadas pelo guard existente.
- Publicação pendente.
