// Donne au tenant « CAP Compétences » son propre logo (data URL), afin que le
// repli marque blanche (EMPTY_IMAGE) ne lui retire pas son logo.
// Idempotent : ne touche que les organismes nommés CAP sans logoUrl.
//   node scripts/set-cap-logo.cjs
const fs = require("fs");
const path = require("path");
for (const f of [".env.local", ".env"]) {
  const p = path.join(process.cwd(), f);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

(async () => {
  const logoPath = path.join(process.cwd(), "public", "cap-competences-logo.png");
  const dataUrl = `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}`;

  const caps = await p.organisme.findMany({
    where: { nom: { contains: "CAP Compétences" }, logoUrl: null },
    select: { id: true, nom: true },
  });
  for (const c of caps) {
    await p.organisme.update({ where: { id: c.id }, data: { logoUrl: dataUrl } });
    console.log("logoUrl posé sur:", c.nom, c.id);
  }
  if (caps.length === 0) console.log("Aucun organisme CAP sans logo (rien à faire).");
  await p.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
