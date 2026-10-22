export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
export async function body(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get("Content-Type")?.startsWith("application/json"))
    throw new HttpError(415, "Envie dados em JSON.");
  const bytes = await boundedBody(request, 16_384);
  try {
    const value = JSON.parse(new TextDecoder().decode(bytes));
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new Error();
    return value;
  } catch {
    throw new HttpError(400, "Dados inválidos.");
  }
}
export async function boundedBody(
  request: Request,
  limit: number,
): Promise<Uint8Array> {
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > limit) {
      await reader.cancel();
      throw new HttpError(
        413,
        `Arquivo ou dados excedem o limite de ${limit} bytes.`,
      );
    }
    chunks.push(value);
  }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}
export function text(
  value: unknown,
  name: string,
  max = 120,
  optional = false,
): string {
  if (optional && value === undefined) return "";
  if (
    typeof value !== "string" ||
    (!optional && !value.trim()) ||
    value.length > max
  )
    throw new HttpError(400, `${name} inválido.`);
  return value.trim();
}
export function integer(
  value: unknown,
  name: string,
  min = 0,
  max = 1_000_000,
) {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < min ||
    value > max
  )
    throw new HttpError(400, `${name} deve ser inteiro entre ${min} e ${max}.`);
  return value;
}
export function flag(value: unknown, fallback: number) {
  if (value === undefined) return fallback;
  if (typeof value !== "boolean") throw new HttpError(400, "Estado inválido.");
  return Number(value);
}
export async function handle(action: () => Promise<Response>) {
  try {
    const response = await action();
    const headers = new Headers(response.headers);
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Referrer-Policy", "same-origin");
    headers.set(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' https: blob: http://localhost:*; font-src 'self'; connect-src 'self' https:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    );
    return new Response(response.body, { status: response.status, headers });
  } catch (error) {
    if (error instanceof HttpError)
      return json({ error: error.message }, error.status);
    // No SQL, identities or service credentials in errors returned to browsers.
    console.error(
      "Request failed",
      error instanceof Error ? error.name : "UnknownError",
    );
    return json(
      {
        error:
          "Serviço temporariamente indisponível. Seus dados anteriores foram preservados. Tente novamente.",
      },
      503,
    );
  }
}
