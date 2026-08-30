// Télécharge tous les blobs Vercel dans un dossier local (sauvegarde offsite — audit A09-001).
// INERTE si BLOB_READ_WRITE_TOKEN est absent (no-op sûr) : n'échoue jamais le pipeline.
// Utilisé par .github/workflows/backup-offsite.yml (qui chiffre puis pousse vers un stockage tiers).
//
// Usage local :  BLOB_READ_WRITE_TOKEN=xxx node scripts/backup-blobs.mjs
//   → écrit dans ./_blob-backup/<pathname> (répertoire configurable via BLOB_BACKUP_DIR)

import { list } from "@vercel/blob";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const token = process.env.BLOB_READ_WRITE_TOKEN;
const OUT = process.env.BLOB_BACKUP_DIR || "_blob-backup";

if (!token) {
  console.log("backup-blobs : BLOB_READ_WRITE_TOKEN absent → rien à sauvegarder (no-op).");
  process.exit(0);
}

let cursor;
let count = 0;
let bytes = 0;
let errors = 0;

do {
  const res = await list({ token, cursor, limit: 1000 });
  for (const b of res.blobs) {
    const dest = join(OUT, b.pathname);
    try {
      await mkdir(dirname(dest), { recursive: true });
      const r = await fetch(b.url);
      if (!r.ok) {
        console.error(`  ! échec ${b.pathname} (HTTP ${r.status})`);
        errors++;
        continue;
      }
      const buf = Buffer.from(await r.arrayBuffer());
      await writeFile(dest, buf);
      count++;
      bytes += buf.length;
    } catch (e) {
      console.error(`  ! échec ${b.pathname} : ${e?.message || e}`);
      errors++;
    }
  }
  cursor = res.hasMore ? res.cursor : undefined;
} while (cursor);

console.log(
  `backup-blobs : ${count} fichiers, ${(bytes / 1048576).toFixed(1)} Mo → ${OUT}` +
    (errors ? ` (${errors} échec(s))` : ""),
);
// On n'échoue le job que si TOUT a échoué alors qu'il y avait des blobs.
if (errors > 0 && count === 0) process.exit(1);
