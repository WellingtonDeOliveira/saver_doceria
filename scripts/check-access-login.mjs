// Read-only check of the real, anonymous production login; never sends an email.
import { get } from "node:https";
function anonymousGet(url) {
  return new Promise((resolve, reject) => {
    const request = get(
      url,
      { family: 4, signal: AbortSignal.timeout(45000) },
      (response) => {
        let html = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          html += chunk;
          if (html.length > 2 * 1024 * 1024)
            request.destroy(
              new Error("Página de login excede o limite de leitura."),
            );
        });
        response.on("end", () =>
          resolve({
            status: response.statusCode,
            location: response.headers.location,
            html,
          }),
        );
        response.on("error", reject);
      },
    );
    request.on("error", reject);
  });
}
const origin = "https://admin.saverdoceria.com.br";
const response = await anonymousGet(origin);
if (response.status !== 302)
  throw new Error(`Administração deve exigir Access; HTTP ${response.status}.`);
const loginUrl = new URL(response.location);
if (
  loginUrl.protocol !== "https:" ||
  loginUrl.hostname !== "curly-silence-d3a6.cloudflareaccess.com"
)
  throw new Error("Redirecionamento inesperado na autenticação.");
const login = await anonymousGet(loginUrl);
if (login.status !== 200)
  throw new Error(`Login Access indisponível; HTTP ${login.status}.`);
const html = login.html;
const emailInput = /<input\b[^>]*type=["']email["']/i.test(html);
const buttons = [...html.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/gi)].map(
  (match) =>
    match[1]
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
);
if (!emailInput || !buttons.includes("Send login code"))
  throw new Error(
    "Login de produção não oferece código por e-mail para administradores externos.",
  );
// Do not log the HTML, cookies, nonce, or complete authentication redirect URL.
console.log(
  "Access exige autenticação e oferece código por e-mail no login real sem sessão.",
);
