# 04: Enviar e substituir fotos

**What to build:** A proprietária seleciona, visualiza e envia fotos pelo painel e as substitui no cardápio sem perder a imagem anterior quando houver falha.

**Blocked by:** 01 — Primeiro doce cadastrado e exibido

**Status:** ready-for-agent

- [x] Permitir selecionar JPEG, PNG ou WebP, visualizar prévia e tamanho e comprimir/redimensionar antes do envio.
- [x] Definir e validar limites de tamanho e formato no servidor, além da validação no navegador; rejeitar arquivos inválidos com mensagem clara.
- [x] Armazenar fotos no KV Free, atribuindo chave e URL novas por imagem sem exigir nova publicação do site para cada foto.
- [x] Persistir a referência no produto e servir somente imagens destinadas ao cardápio, com cache e carregamento sob demanda.
- [x] Preservar a foto anterior em upload ou salvamento malsucedido e tratar o atraso de propagação sem anunciar sucesso que produza perda da referência anterior.
- [x] Limpar mídias órfãs sem remover imagens ainda referenciadas; upload e remoção exigem autorização administrativa.
- [x] Respeitar o plano gratuito e tratar indisponibilidade ou esgotamento de cota sem ativar excedentes pagos.
- [x] Testes cobrem formatos inválidos, upload, substituição, falhas, atraso e referências em uso; um fluxo móvel demonstra prévia e troca de foto.


## Comments

### Implementação — 2026-10-21

Implementado no painel e na API; contratos HTTP e fluxo móvel cobrem os critérios acima. A validação remota integrada depende da configuração Access e publicação da issue 01.

Frontend segue `docs/design/Saver Doceria — Design.html`. Pontos de teste HTTP dos Workers e navegador móvel, com base de revisão `5d7c6ce`, confirmados pelo usuário. Instruções operacionais e limites em `README.md`.

### Validação remota — 2026-10-21

Pelo painel autenticado de homologação, selecionada imagem de teste (logo já pública), exibidas prévia e compressão de 35 KB para 33 KB, realizado upload no KV e carregada a imagem no cardápio. Substituição gerou outra URL, com imagem novamente carregada. Nenhuma publicação adicional do Worker foi necessária para os uploads. Testes locais cobrem formatos inválidos, falhas, cota, propagação e referências em uso.
