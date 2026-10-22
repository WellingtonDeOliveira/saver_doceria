import type { Env } from "./env";
import { catalog } from "./catalog";
import { handle, json } from "./http";
import { servePhoto } from "./media";
import { settings } from "./settings";
import { publicQuote, submitOrder } from "./orders";
export default {
  fetch(request: Request, env: Env) {
    return handle(async () => {
      const path = new URL(request.url).pathname;
      if (path === "/api/orders" && request.method === "POST")
        return submitOrder(request, env);
      if (path === "/api/quote" && request.method === "POST")
        return publicQuote(request, env);
      if (request.method !== "GET" && request.method !== "HEAD")
        return json({ error: "Ação não permitida." }, 405);
      if (path === "/api/catalog") return catalog(env);
      if (path === "/api/settings") return settings(request, env);
      const media = path.match(/^\/media\/([^/]+)$/);
      if (media) return servePhoto(request, env, media[1]);
      if (path.startsWith("/api/") || path.startsWith("/admin"))
        return json({ error: "Não encontrado." }, 404);
      return env.ASSETS.fetch(request);
    });
  },
};
