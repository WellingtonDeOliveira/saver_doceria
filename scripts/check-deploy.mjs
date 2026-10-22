import { readFileSync } from "node:fs";
import { parse } from "jsonc-parser";
const environment = process.argv[2];
if (!["staging", "production"].includes(environment))
  throw new Error("Escolha staging ou production.");
function configuration(path) {
  const errors = [];
  const config = parse(readFileSync(path, "utf8"), errors, {
    allowTrailingComma: true,
  });
  if (errors.length) throw new Error(`Configuração JSONC inválida: ${path}`);
  return config;
}
const publicConfig = configuration("wrangler.public.jsonc");
const adminConfig = configuration("wrangler.admin.jsonc");
const config = adminConfig.env[environment];
for (const key of [
  "ACCESS_ISSUER",
  "ACCESS_AUD",
  "ADMIN_EMAIL",
  "ADMIN_ORIGIN",
  "PUBLIC_ORIGIN",
])
  if (!config.vars[key])
    throw new Error(`${key} ainda não configurado para ${environment}.`);
if (
  environment === "production" &&
  (config.workers_dev ||
    config.preview_urls ||
    publicConfig.env.production.workers_dev ||
    publicConfig.env.production.preview_urls)
)
  throw new Error("Produção não pode expor workers.dev ou previews.");
for (const field of ["d1_databases", "kv_namespaces"]) {
  const key = field === "d1_databases" ? "database_id" : "id";
  if (
    adminConfig.env.staging[field][0][key] ===
    adminConfig.env.production[field][0][key]
  )
    throw new Error("Ambientes compartilham dados.");
  if (config[field][0][key] !== publicConfig.env[environment][field][0][key])
    throw new Error("Workers do ambiente apontam para dados diferentes.");
}
console.log(
  `Configuração ${environment} conferida. O plano gratuito e a política Access reais devem estar validados na conta antes da publicação.`,
);
