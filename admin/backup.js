export function setupBackup({ api, guarded }) {
  const status = document.querySelector("#backup-status");
  document.querySelector("#download-backup").addEventListener(
    "click",
    guarded(async () => {
      status.textContent = "Preparando cópia privada…";
      try {
        const snapshot = await api("/api/backup");
        const media = snapshot.tables.media.filter(
          (m) => m.state !== "deleting",
        );
        if (media.reduce((sum, m) => sum + m.bytes, 0) > 16 * 1024 * 1024)
          throw new Error(
            "As fotos excedem 16 MiB. Use o exportador por terminal documentado para baixar os arquivos separadamente.",
          );
        snapshot.photos = [];
        for (const photo of media) {
          const response = await fetch(
            `/api/backup/media/${encodeURIComponent(photo.id)}`,
            { cache: "no-store" },
          );
          if (
            !response.ok ||
            response.redirected ||
            response.headers.get("Content-Type") !== photo.mime
          )
            throw new Error(
              "Foto ainda indisponível ou sessão encerrada. Tente novamente após a distribuição; a cópia não foi concluída.",
            );
          const bytes = new Uint8Array(await response.arrayBuffer());
          if (bytes.length !== photo.bytes)
            throw new Error("Foto incompleta. Tente novamente.");
          const hash = await crypto.subtle.digest("SHA-256", bytes);
          let binary = "";
          for (let i = 0; i < bytes.length; i += 8192)
            binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
          snapshot.photos.push({
            id: photo.id,
            sha256: Array.from(new Uint8Array(hash), (b) =>
              b.toString(16).padStart(2, "0"),
            ).join(""),
            data: btoa(binary),
          });
        }
        const url = URL.createObjectURL(
          new Blob([JSON.stringify(snapshot)], { type: "application/json" }),
        );
        const download = document.createElement("a");
        download.href = url;
        download.download = `saver-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
        download.click();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        status.textContent =
          "Backup gerado para download. Guarde em pasta privada e confira a restauração.";
      } catch (error) {
        status.textContent = error.message;
        throw error;
      }
    }),
  );
}
