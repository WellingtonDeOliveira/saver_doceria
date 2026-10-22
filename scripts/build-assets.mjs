import { cp, mkdir } from "node:fs/promises";
for (const name of ["public", "admin"]) {
  await mkdir(`dist/${name}`, { recursive: true });
  await cp(name, `dist/${name}`, { recursive: true });
  if (name === "admin") {
    for (const asset of ["assets", "fonts.css", "styles.css"])
      await cp(`public/${asset}`, `dist/admin/${asset}`, { recursive: true });
  }
}
