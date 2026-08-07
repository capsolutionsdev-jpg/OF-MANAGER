/**
 * CONFIG ORGANISME — AGUYSE FORMATION.
 * Complète l'identité de l'organisme dans OF Manager avec les vraies données
 * (représentant, TVA, Qualiopi, référent handicap…) laissées vides au seed initial.
 * Idempotent. Usage : node scripts/configure-aguyse-org.cjs
 */
const { readFileSync } = require("node:fs");
const path = require("node:path");
const env = {};
try {
  for (const l of readFileSync(path.join(process.cwd(), ".env"), "utf8").split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i);
    if (m) { let v = m[2].trim(); if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1); env[m[1]] = v; }
  }
} catch {}
process.env.DATABASE_URL = env.DIRECT_URL || env.DATABASE_URL || process.env.DATABASE_URL;

const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

const DATA = {
  raisonSociale: "AGUYSE FORMATION",
  representant: "Guy AMOUGOU",
  representantQualite: "Président",
  siret: "942 168 196 00015",
  nda: "11 92 28907 92",
  numeroTva: "FR66942168196",
  assujettiTva: false, // organisme de formation : prestations exonérées de TVA
  adresse: "7 rue du Port Galand",
  codePostal: "92220",
  ville: "Bagneux",
  telephone: "06 33 80 57 73",
  email: "contact@aguyse.com",
  siteWeb: "https://aguyse.com",
  qualiopiNumero: "QUA008637", // certificat ICPF (Qualiopi)
  couleurPrimaire: "#9A6E22",
  couleurSecondaire: "#142530",
  referentHandicapNom: "Guy AMOUGOU",
  referentHandicapContact: "07 68 92 90 49",
};

(async () => {
  const org = await p.organisme.findFirst({ where: { nom: "AGUYSE FORMATION" }, select: { id: true } });
  if (!org) { console.error("STOP : organisme AGUYSE FORMATION introuvable."); process.exit(1); }
  await p.organisme.update({ where: { id: org.id }, data: DATA });
  const after = await p.organisme.findUnique({ where: { id: org.id }, select: { nom: true, representant: true, representantQualite: true, numeroTva: true, assujettiTva: true, qualiopiNumero: true, referentHandicapNom: true, referentHandicapContact: true, nda: true, siret: true } });
  console.log("✅ Organisme AGUYSE mis à jour :");
  console.log(after);
  await p.$disconnect();
})().catch(async (e) => { console.error("ERREUR :", e); try { await p.$disconnect(); } catch {} process.exit(1); });
