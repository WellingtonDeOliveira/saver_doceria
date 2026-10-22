# Corrigir login de administradora externa à conta Cloudflare

**Status:** ready-for-agent

**Execução:** configuração corrigida em produção em 22/10/2026; Sarah realiza a confirmação do código no próprio e-mail.

## Problema e causa

Sarah estava na política Allow e na lista ADMIN_EMAILS do Worker, mas a tela anterior à autorização oferecia somente o provedor Cloudflare, restrito a membros da conta. O teste anterior com a identidade da proprietária não detectou essa restrição. Não era erro de digitação do e-mail nem falha na lista do Worker.

Reprodução remota anônima executada duas vezes: `emailInput=false`, sem botão de código, falha do verificador. A interface Identity providers confirmou que só existia Cloudflare. Documentação primária: https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/cloudflare/ e https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/one-time-pin/.

## Correção

- [x] Adicionar One-time PIN, ID `574e022d-4215-4c45-914f-e8e0058d072a`.
- [x] Selecionar explicitamente One-time PIN e Cloudflare na aplicação de produção, preservando o login existente.
- [x] Fixar homologação somente no provedor Cloudflare anterior, preservando seu comportamento e sua política de e-mail.
- [x] Preservar as duas políticas de e-mail exato de produção e ADMIN_EMAILS; não adicionar Sarah como membro da conta Cloudflare.
- [x] Repetir a leitura anônima do login e verificar campo Email + botão Send login code.
- [x] Verificar que APIs privadas continuam redirecionando sem sessão e que a sessão autorizada existente funciona.

## Validação e limite

`node scripts/check-access-login.mjs` consulta o login real sem cookies e sem enviar e-mails. Resultado após correção: `Access exige autenticação e oferece código por e-mail no login real sem sessão.` O script não imprime HTML, cookies, nonce nem URL completa de autenticação. Uma configuração só com Cloudflare volta a falhar por ausência do formulário de e-mail.

One-time PIN e Cloudflare foram conferidos selecionados na aplicação de produção após salvar/reabrir; homologação continua somente Cloudflare. A causa está na configuração remota do Access, portanto não foi necessário republicar Workers nem reaplicar migrações. O teste HTTP real é a fronteira adequada; a suíte local de JWT não reproduz a seleção remota de provedores.

Não foi solicitado/enviado código à Sarah pelo agente nem acessada sua caixa postal. A chegada do e-mail e a conclusão com o código devem ser feitas por ela. Ela deve abrir novamente https://admin.saverdoceria.com.br/ em vez de reutilizar a tela antiga, preencher sarahnogueira957@gmail.com e usar Send login code. Código expira em 10 minutos; conferir spam se necessário.
