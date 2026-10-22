import type { Env } from "./env";
import { body, HttpError, integer, json, text } from "./http";

export interface Settings {
  name: string;
  whatsapp: string;
  greeting: string;
  notice: string;
  version: number;
}
export async function readSettings(env: Env) {
  return (await env.DB.prepare(
    "SELECT * FROM settings WHERE id=1",
  ).first<Settings>())!;
}
export async function settings(request: Request, env: Env, actor?: string) {
  if (request.method === "GET") {
    const saved = await readSettings(env);
    return json(
      actor
        ? saved
        : {
            name: saved.name,
            whatsapp: saved.whatsapp,
            greeting: saved.greeting,
            notice: saved.notice,
          },
    );
  }
  if (!actor || request.method !== "PUT")
    throw new HttpError(405, "Ação não permitida.");
  const data = await body(request);
  const whatsapp = text(data.whatsapp, "WhatsApp", 15).replace(/\D/g, "");
  if (!/^55\d{10,11}$/.test(whatsapp))
    throw new HttpError(
      400,
      "Informe WhatsApp brasileiro com código 55, DDD e número.",
    );
  const result = await env.DB.prepare(
    "UPDATE settings SET name=?,whatsapp=?,greeting=?,notice=?,version=version+1,updated_by=? WHERE id=1 AND version=?",
  )
    .bind(
      text(data.name, "Nome"),
      whatsapp,
      text(data.greeting, "Mensagem inicial", 1000, true),
      text(data.notice, "Aviso", 2000, true),
      actor,
      integer(data.version, "Versão", 1),
    )
    .run();
  if (!result.meta.changes)
    throw new HttpError(
      409,
      "Configurações alteradas. Recarregue antes de salvar.",
    );
  return json(await readSettings(env));
}
