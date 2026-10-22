import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

const [originArg, directoryArg] = process.argv.slice(2);
if (!originArg || !directoryArg || !process.env.CF_ACCESS_JWT)
  throw new Error(
    "Uso: CF_ACCESS_JWT no ambiente; node scripts/backup.mjs https://painel pasta-nova-privada",
  );
const origin = new URL(originArg).origin;
if (!origin.startsWith("https://") && !origin.startsWith("http://localhost:"))
  throw new Error("Use HTTPS ou localhost.");
const directory = resolve(directoryArg);
await mkdir(directory, { mode: 0o700 }); // refuse an existing backup directory
if (process.platform === "win32")
  execFileSync(
    "icacls",
    [
      directory,
      "/inheritance:r",
      "/grant:r",
      `${process.env.USERDOMAIN}\\${process.env.USERNAME}:(OI)(CI)F`,
    ],
    { stdio: "ignore", windowsHide: true },
  );
async function get(path) {
  const response = await fetch(`${origin}${path}`, {
    headers: { "Cf-Access-Jwt-Assertion": process.env.CF_ACCESS_JWT },
    redirect: "error",
  });
  if (!response.ok)
    throw new Error(
      `Backup incompleto: HTTP ${response.status} em ${path}. Não use esta pasta para restaurar.`,
    );
  return response;
}
const snapshot = await (await get("/api/backup")).json();
if (snapshot.format !== 1) throw new Error("Formato de backup incompatível.");
snapshot.photos = [];
await mkdir(resolve(directory, "photos"), { mode: 0o700 });
for (const media of snapshot.tables.media.filter(
  (m) => m.state !== "deleting",
)) {
  if (!/^[0-9a-f-]{36}$/.test(media.id))
    throw new Error("Identificador de mídia inválido.");
  const bytes = Buffer.from(
    await (
      await get(`/api/backup/media/${encodeURIComponent(media.id)}`)
    ).arrayBuffer(),
  );
  if (bytes.length !== media.bytes)
    throw new Error("Tamanho da foto não confere; backup incompleto.");
  await writeFile(resolve(directory, "photos", `${media.id}.bin`), bytes, {
    flag: "wx",
    mode: 0o600,
  });
  snapshot.photos.push({
    id: media.id,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
}
// The manifest is the final completion marker. Incomplete directories have none.
await writeFile(resolve(directory, "manifest.json"), JSON.stringify(snapshot), {
  flag: "wx",
  mode: 0o600,
});
console.log(
  `Backup concluído: ${snapshot.photos.length} fotos. Pasta privada: ${directory}`,
);
