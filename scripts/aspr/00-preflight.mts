/**
 * CHANTIER 02 — LOT 0 : PRÉ-VOL / DIAGNOSTIC (LECTURE SEULE, AUCUNE ÉCRITURE)
 *
 * Dresse l'état des dossiers EDOF importés chez ASPR FORMATION, dossier par
 * dossier. Script AUTONOME (n'importe aucun autre fichier du dépôt) : il tourne
 * même si `main` n'est pas encore à jour. La checklist ci-dessous reprend les
 * éléments Qualiopi DÉTECTABLES EN BASE (le reste — programme, règlement
 * intérieur, émargement… — se vise à la main dans le module Audit).
 *
 * - Résout les tenants PAR organismeId (2 « ASPR FORMATION » homonymes).
 * - Cible le lot EDOF : Inscription.source commençant par "EDOF ", hors ANNULEE.
 * - Produit, par tenant : un récap chiffré + un CSV (scripts/aspr/out/preflight-*.csv).
 *
 *   npx tsx scripts/aspr/00-preflight.mts
 *
 * Ne modifie RIEN.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

// — Chargement .env (comme les autres scripts du dépôt) —
const env: Record<string, string> = {};
try {
  for (const l of readFileSync(path.join(process.cwd(), ".env"), "utf8").split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i);
    if (m) { let v = m[2].trim(); if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1); env[m[1]] = v; }
  }
} catch { /* .env absent : on utilisera process.env */ }
process.env.DATABASE_URL = env.DIRECT_URL || env.DATABASE_URL || process.env.DATABASE_URL;

const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient();

// Les deux tenants ASPR FORMATION (résolus par id, jamais par nom).
const TENANTS = [
  { id: "cmsrj9dyw0000l7041hv7dm86", label: "ASPR-A" },
  { id: "cmtijd7350000jo0454cobb25", label: "ASPR-B" },
];

const csvCell = (s: unknown) => {
  const v = s == null ? "" : String(s);
  return /[",;\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
};
const d = (x: Date | null | undefined) => (x ? x.toISOString().slice(0, 10) : "");

type Insc = {
  signedAt: Date | null; piecesRecues: string[];
  positionnementCompletedAt: Date | null; convocationSentAt: Date | null;
  satisfactionCompletedAt: Date | null; docsFinSentAt: Date | null;
  attestationReussiteSentAt: Date | null;
  resultatCertification: string;
  session: { formation: { piecesAttendues: string[]; examen: boolean | null; positionnementQuestions: unknown } } | null;
};

/** Éléments Qualiopi détectables en base → manques (auto). */
function manques(i: Insc): string[] {
  const out: string[] = [];
  const f = i.session?.formation;
  if (!i.signedAt) out.push("Documents contractuels non signés");
  for (const p of f?.piecesAttendues ?? []) if (!i.piecesRecues?.includes(p)) out.push(`Pièce manquante : ${p}`);
  const pq = f?.positionnementQuestions;
  const aPositionnement = Array.isArray(pq) ? pq.length > 0 : pq != null;
  if (aPositionnement && !i.positionnementCompletedAt) out.push("Positionnement non complété");
  if (!i.convocationSentAt) out.push("Convocation non envoyée");
  if (f?.examen && (!i.resultatCertification || i.resultatCertification === "NON_EVALUE")) out.push("Résultat non saisi");
  if (!i.docsFinSentAt && !i.attestationReussiteSentAt) out.push("Documents de fin non envoyés");
  if (!i.satisfactionCompletedAt) out.push("Satisfaction non complétée");
  return out;
}

async function main() {
  console.log("=== CHANTIER 02 — LOT 0 : PRÉ-VOL (lecture seule) ===\n");
  const outDir = path.join(process.cwd(), "scripts", "aspr", "out");
  try { mkdirSync(outDir, { recursive: true }); } catch { /* existe déjà */ }

  for (const t of TENANTS) {
    const org = await prisma.organisme.findUnique({ where: { id: t.id }, select: { id: true, nom: true, emailsSuspendus: true } });
    if (!org) { console.log(`⚠️  Tenant ${t.label} (${t.id}) introuvable — ignoré.\n`); continue; }

    const inscriptions = await prisma.inscription.findMany({
      where: { organismeId: org.id, source: { startsWith: "EDOF " }, statut: { not: "ANNULEE" } },
      select: {
        source: true, signedAt: true, dateInscription: true, piecesRecues: true,
        positionnementCompletedAt: true, convocationSentAt: true, satisfactionCompletedAt: true,
        docsFinSentAt: true, attestationReussiteSentAt: true, resultatCertification: true,
        candidat: { select: { nom: true, prenom: true, email: true, dateNaissance: true } },
        session: {
          select: {
            reference: true, dateDebut: true, dateFin: true,
            formation: { select: { titre: true, piecesAttendues: true, examen: true, positionnementQuestions: true } },
          },
        },
      },
      orderBy: [{ session: { dateDebut: "asc" } }],
    });

    const sessionRefs = new Set(inscriptions.map((i) => i.session?.reference).filter(Boolean));
    let sansEmail = 0, sansDN = 0, dateInscNull = 0, conformes = 0;
    const rows: string[] = [
      ["session", "dates", "formation", "candidat", "email", "date_naissance", "date_inscription", "nb_manques", "elements_a_traiter"].join(";"),
    ];

    for (const i of inscriptions) {
      if (!i.candidat.email || !i.candidat.email.includes("@")) sansEmail++;
      if (!i.candidat.dateNaissance) sansDN++;
      if (!i.dateInscription) dateInscNull++;
      const mq = manques(i as unknown as Insc);
      if (mq.length === 0) conformes++;
      rows.push([
        csvCell(i.session?.reference),
        csvCell(`${d(i.session?.dateDebut)}→${d(i.session?.dateFin)}`),
        csvCell(i.session?.formation.titre),
        csvCell(`${i.candidat.prenom} ${i.candidat.nom}`.trim()),
        csvCell(i.candidat.email),
        csvCell(d(i.candidat.dateNaissance)),
        csvCell(d(i.dateInscription)),
        csvCell(mq.length),
        csvCell(mq.join(" | ")),
      ].join(";"));
    }

    const outPath = path.join(outDir, `preflight-${t.label}.csv`);
    writeFileSync(outPath, "﻿" + rows.join("\r\n"), "utf8");

    console.log(`— ${org.nom} (${t.label} · ${org.id})`);
    console.log(`   e-mails automatiques : ${org.emailsSuspendus ? "SUSPENDUS ✅ (aucun envoi)" : "ACTIFS ⚠️"}`);
    console.log(`   dossiers EDOF (hors annulés) : ${inscriptions.length}`);
    console.log(`   sessions distinctes         : ${sessionRefs.size}`);
    console.log(`   dossiers sans manque (auto) : ${conformes}`);
    console.log(`   à traiter                   : ${inscriptions.length - conformes}`);
    console.log(`   sans e-mail                 : ${sansEmail}`);
    console.log(`   sans date de naissance      : ${sansDN}`);
    console.log(`   date d'inscription NULL     : ${dateInscNull}`);
    console.log(`   → CSV : ${outPath}\n`);
  }

  await prisma.$disconnect();
  console.log("Terminé. Aucune donnée modifiée.");
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
