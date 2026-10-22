import { createRemoteJWKSet, jwtVerify } from "jose";
import type { Env } from "./env";
import { HttpError } from "./http";

const keySets = new Map<string, ReturnType<typeof createRemoteJWKSet>>();
export async function authorize(request: Request, env: Env) {
  const adminEmails = (env.ADMIN_EMAILS || env.ADMIN_EMAIL || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (
    !env.ACCESS_ISSUER ||
    !env.ACCESS_AUD ||
    !adminEmails.length ||
    !env.ADMIN_ORIGIN
  )
    throw new HttpError(503, "Acesso administrativo ainda não configurado.");
  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!token) throw new HttpError(401, "Entre pelo acesso protegido da loja.");
  try {
    let keys = keySets.get(env.ACCESS_ISSUER);
    if (!keys) {
      keys = createRemoteJWKSet(
        new URL(`${env.ACCESS_ISSUER}/cdn-cgi/access/certs`),
      );
      keySets.set(env.ACCESS_ISSUER, keys);
    }
    const { payload } = await jwtVerify(token, keys, {
      issuer: env.ACCESS_ISSUER,
      audience: env.ACCESS_AUD,
      algorithms: ["RS256"],
      requiredClaims: ["exp", "iat", "sub", "email"],
    });
    if (
      typeof payload.email !== "string" ||
      !adminEmails.includes(payload.email.toLowerCase())
    )
      throw new Error();
    if (
      !["GET", "HEAD"].includes(request.method) &&
      request.headers.get("Origin") !== env.ADMIN_ORIGIN
    )
      throw new HttpError(403, "Origem não autorizada.");
    return payload.email;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(403, "Acesso não autorizado ou sessão expirada.");
  }
}
