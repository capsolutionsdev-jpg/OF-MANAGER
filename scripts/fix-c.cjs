const fs = require("fs");
const DB = "const db = await getTenantDb();";
const edits = [
  ["src/lib/actions/candidat-actions.ts",
    "  await db.candidat.update({ where: { id }, data: { statut } });",
    "  " + DB + "\n  await db.candidat.update({ where: { id }, data: { statut } });"],
  ["src/lib/actions/cours-actions.ts",
    "async function uniqueSlug(base: string, ignoreId?: string): Promise<string> {",
    "async function uniqueSlug(base: string, ignoreId?: string): Promise<string> {\n  " + DB],
  ["src/lib/actions/email-actions.ts",
    "\n  const s = await db.session.findUnique({",
    "\n  " + DB + "\n  const s = await db.session.findUnique({"],
  ["src/lib/actions/emargement-actions.ts",
    "\n  await db.presence.upsert({",
    "\n  " + DB + "\n  await db.presence.upsert({"],
  ["src/lib/actions/inscription-actions.ts",
    "\n  const insc = await db.inscription.findUnique({\n    where: { id: inscriptionId },\n    select: { piecesRecues: true, candidatId: true },",
    "\n  " + DB + "\n  const insc = await db.inscription.findUnique({\n    where: { id: inscriptionId },\n    select: { piecesRecues: true, candidatId: true },"],
  ["src/lib/actions/learning-actions.ts",
    "  if (!session?.user?.id) return null;\n  return db.apprenant.findUnique({ where: { userId: session.user.id } });",
    "  if (!session?.user?.id) return null;\n  " + DB + "\n  return db.apprenant.findUnique({ where: { userId: session.user.id } });"],
  ["src/lib/actions/learning-actions.ts",
    "async function leconAutorisee(apprenantId: string, leconId: string) {",
    "async function leconAutorisee(apprenantId: string, leconId: string) {\n  " + DB],
  ["src/lib/actions/qualiopi-actions.ts",
    "\n  await db.qualiopiIndicateur.update({",
    "\n  " + DB + "\n  await db.qualiopiIndicateur.update({"],
];
for (const [f, oldS, newS] of edits) {
  let s = fs.readFileSync(f, "utf8");
  if (!s.includes(oldS)) { console.log("ANCRE INTROUVABLE:", f, "::", oldS.slice(0, 40)); continue; }
  if (s.includes(newS)) { console.log("déjà ok:", f); continue; }
  s = s.replace(oldS, newS);
  fs.writeFileSync(f, s);
  console.log("corrigé:", f);
}
