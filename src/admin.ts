import type { Env } from "./env";
import { authorize } from "./auth";
import { categories, products } from "./catalog";
import { stock } from "./stock";
import { upload, attachPhoto, cleanMedia, previewPhoto } from "./media";
import { handle, json } from "./http";
export default {
  fetch(request: Request, env: Env) {
    return handle(async () => {
      const actor = await authorize(request, env);
      const path = new URL(request.url).pathname;
      if (path === "/api/session" && request.method === "GET")
        return json({ email: actor, public_origin: env.PUBLIC_ORIGIN });
      if (path === "/api/media" && request.method === "POST")
        return upload(request, env, actor);
      if (path === "/api/media/cleanup") return cleanMedia(request, env);
      const preview = path.match(/^\/api\/media\/([^/]+)\/preview$/);
      if (preview && request.method === "GET")
        return previewPhoto(request, env, preview[1]);
      const media = path.match(/^\/api\/media\/([^/]+)$/);
      if (media) return cleanMedia(request, env, media[1]);
      const photo = path.match(/^\/api\/products\/([^/]+)\/photo$/);
      if (photo) return attachPhoto(request, env, actor, photo[1]);
      const category = path.match(/^\/api\/categories(?:\/([^/]+))?$/);
      if (category) return categories(request, env, actor, category[1]);
      const movement = path.match(/^\/api\/products\/([^/]+)\/stock$/);
      if (movement) return stock(request, env, actor, movement[1]);
      const item = path.match(/^\/api\/products(?:\/([^/]+))?(\/duplicate)?$/);
      if (item) return products(request, env, actor, item[1], !!item[2]);
      if (path.startsWith("/api/"))
        return json({ error: "Não encontrado." }, 404);
      if (request.method !== "GET" && request.method !== "HEAD")
        return json({ error: "Ação não permitida." }, 405);
      const response = await env.ASSETS.fetch(request);
      const headers = new Headers(response.headers);
      headers.set("Cache-Control", "private, no-store");
      return new Response(response.body, { status: response.status, headers });
    });
  },
};
