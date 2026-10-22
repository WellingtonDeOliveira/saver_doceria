import { createServer } from "node:http";
import { harness } from "./harness";
import { restoreBackup } from "../scripts/restore-backup";
const h = await harness({
  publicOrigin: "http://localhost:8797",
  adminOrigin: "http://localhost:8798",
});
if (process.env.SAVER_RESTORE_DIR)
  await restoreBackup(
    process.env.SAVER_RESTORE_DIR,
    h.db as unknown as D1Database,
    h.photos as unknown as KVNamespace,
  );
const servers = [8797, 8798].map((port) =>
  createServer(async (req, res) => {
    try {
      const chunks = [];
      for await (const chunk of req) chunks.push(Buffer.from(chunk));
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers))
        if (value)
          headers.set(key, Array.isArray(value) ? value.join(",") : value);
      // Test-only reverse proxy: real signed Access JWT, never a bypass in the shipped Worker.
      if (port === 8798) headers.set("Cf-Access-Jwt-Assertion", h.auth);
      const worker = port === 8798 ? h.admin : h.publicWorker;
      const response = await worker.fetch(
        `http://localhost:${port}${req.url}`,
        {
          method: req.method,
          headers: Object.fromEntries(headers),
          body: ["GET", "HEAD"].includes(req.method ?? "GET")
            ? undefined
            : Buffer.concat(chunks),
        },
      );
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch (error) {
      res.writeHead(500);
      res.end(String(error));
    }
  }).listen(port, "127.0.0.1"),
);
console.log("Browser fixtures ready");
async function shutdown() {
  for (const server of servers) server.close();
  await h.dispose();
  process.exit();
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
