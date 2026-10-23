Status: ready-for-agent
Type: task
Execution: resolved

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
- CI GitHub aprovado: execução 40028442926, commit `aae99ed`.
- Homologação publicada e verificada pelo workflow 40028641996.
- Workflow de produção 40028554771 cancelado por ficar retido na instalação
  das ferramentas do Playwright. A mesma versão validada foi publicada pelo
  Wrangler oficial, com OAuth existente, após conferir ausência de migrações
  pendentes. Worker administrativo de produção:
  `db2358e8-be52-4cbc-944c-9f28a23250ce`.
- Workers Free e Teams Free Base conferidos na conta; Access cobre o hostname
  administrativo inteiro e mantém somente os dois e-mails autorizados.
- Conferência autenticada em produção: novo cadastro permite selecionar foto;
  arquivo de 2000 × 1800 pixels foi preparado de 53 KB para 14 KB, com prévia
  pronta antes de salvar. Nenhum produto de ensaio foi gravado em produção.
- Catálogo público HTTP 200; painel, admin.js e API administrativa sem sessão
  continuam redirecionando ao Access (302).
