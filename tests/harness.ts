import { Miniflare } from "miniflare";
import { build } from "esbuild";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { generateKeyPair, exportJWK, SignJWT } from "jose";

export async function harness(
  options: { adminOrigin?: string; publicOrigin?: string } = {},
) {
  const adminOrigin = options.adminOrigin ?? "http://localhost:8788";
  const publicOrigin = options.publicOrigin ?? "http://localhost:8787";
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const jwk = {
    ...(await exportJWK(publicKey)),
    kid: "test-key",
    alg: "RS256",
    use: "sig",
  };
  const issuer = "https://test.cloudflareaccess.com";
  async function token(
    email = "owner@example.com",
    options: { issuer?: string; audience?: string; expired?: boolean } = {},
  ) {
    return new SignJWT({ email })
      .setProtectedHeader({ alg: "RS256", kid: "test-key" })
      .setIssuer(options.issuer ?? issuer)
      .setAudience(options.audience ?? "admin-test")
      .setSubject("test-owner")
      .setIssuedAt()
      .setExpirationTime(options.expired ? "0s" : "1h")
      .sign(privateKey);
  }
  const auth = await token();
  const scripts = await Promise.all(
    ["public", "admin"].map(async (name) => {
      const result = await build({
        stdin: {
          resolveDir: process.cwd(),
          loader: "ts",
          contents: `
        import app from './src/${name}.ts';
        export default { fetch(request,env,ctx) {
          // Fault injection is confined to this test bundle at the KV service boundary.
          if(request.headers.get('X-Test-KV-Failure')==='put') {
            const photos=env.PHOTOS;
            env={...env,PHOTOS:{get:photos.get.bind(photos),delete:photos.delete.bind(photos),put:async()=>{throw new Error('KV quota exhausted');}}};
          }
          return app.fetch(request,env,ctx);
        }};
      `,
        },
        bundle: true,
        write: false,
        format: "esm",
        target: "es2022",
      });
      return result.outputFiles[0].text;
    }),
  );
  // Real Workers runtime + real D1/KV. Only the external Access JWKS endpoint is simulated.
  const mf = new Miniflare({
    workers: ["public", "admin"].map((name, i) => ({
      name,
      modules: true,
      script: scripts[i],
      compatibilityDate: "2026-07-01",
      d1Databases: { DB: "catalog-test" },
      kvNamespaces: { PHOTOS: "photos-test" },
      serviceBindings: {
        ASSETS: async (request: Request) => {
          const path = new URL(request.url).pathname;
          const root = resolve("dist", name);
          const target = resolve(
            root,
            `.${path === "/" ? "/index.html" : path}`,
          );
          if (!target.startsWith(root + "/") && !target.startsWith(root + "\\"))
            return new Response("Not found", { status: 404 });
          try {
            const bytes = await readFile(target);
            const types: Record<string, string> = {
              ".html": "text/html; charset=utf-8",
              ".js": "text/javascript",
              ".css": "text/css",
              ".jpg": "image/jpeg",
              ".woff2": "font/woff2",
            };
            return new Response(bytes, {
              headers: {
                "Content-Type":
                  types[extname(target)] ?? "application/octet-stream",
              },
            });
          } catch {
            return new Response("Not found", { status: 404 });
          }
        },
      },
      bindings: {
        ACCESS_ISSUER: issuer,
        ACCESS_AUD: "admin-test",
        ADMIN_EMAIL: "owner@example.com",
        ADMIN_ORIGIN: adminOrigin,
        PUBLIC_ORIGIN: publicOrigin,
      },
      outboundService: async (req: Request) =>
        req.url === `${issuer}/cdn-cgi/access/certs`
          ? Response.json({ keys: [jwk] })
          : new Response("Unavailable", { status: 503 }),
    })),
  });
  const db = await mf.getD1Database("DB", "admin");
  const migration = await readFile("migrations/0001_catalog.sql", "utf8");
  // D1 exec splits lines; prepare + batch also supports multiline trigger declarations.
  const statements = migration.split(/;\s*(?:\r?\n|$)/);
  const triggerIndex = statements.findIndex((s) =>
    s.includes("CREATE TRIGGER"),
  );
  await db.batch(
    statements
      .slice(0, triggerIndex)
      .filter((s) => s.trim())
      .map((s) => db.prepare(s)),
  );
  await db
    .prepare(
      statements.slice(triggerIndex).join(";\n").trim().replace(/;$/, ""),
    )
    .run();
  const ordersMigration = await readFile("migrations/0002_orders.sql", "utf8");
  await db.batch(
    ordersMigration
      .split(/;\s*(?:\r?\n|$)/)
      .filter((s) => s.trim())
      .map((s) => db.prepare(s)),
  );
  const guards = await readFile("migrations/0003_order_guards.sql", "utf8");
  for (const statement of guards.split("-- statement"))
    if (statement.trim())
      await db.prepare(statement.trim().replace(/;$/, "")).run();
  const admin = await mf.getWorker("admin");
  const publicWorker = await mf.getWorker("public");
  async function request(
    path: string,
    method = "GET",
    data?: unknown,
    options: { token?: string | null; origin?: string; key?: string } = {},
  ) {
    const headers: Record<string, string> = {
      Origin: options.origin ?? adminOrigin,
    };
    if (options.token !== null)
      headers["Cf-Access-Jwt-Assertion"] = options.token ?? auth;
    if (data !== undefined) headers["Content-Type"] = "application/json";
    if (options.key) headers["Idempotency-Key"] = options.key;
    return admin.fetch(`${adminOrigin}${path}`, {
      method,
      headers,
      body: data === undefined ? undefined : JSON.stringify(data),
    });
  }
  return {
    mf,
    db,
    admin,
    publicWorker,
    request,
    token,
    auth,
    photos: await mf.getKVNamespace("PHOTOS", "admin"),
    dispose: () => mf.dispose(),
  };
}
export const sweet = (
  category_id: string,
  extra: Record<string, unknown> = {},
) => ({
  category_id,
  name: "Brigadeiro",
  presentation: "Caixa com 6",
  description: "Feito à mão",
  price_cents: 1800,
  initial_stock: 8,
  published: true,
  ...extra,
});
