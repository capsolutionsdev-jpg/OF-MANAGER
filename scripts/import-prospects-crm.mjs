// Import CRM des prospects de prospection sortante (fichiers Excel sécurité /
// transport, normalisés en JSON par scripts/parse_prospects.py).
//
//   node scripts/import-prospects-crm.mjs <prospects.json>            # DRY-RUN (par défaut)
//   node scripts/import-prospects-crm.mjs <prospects.json> --commit   # écrit en base
//
// Idempotent : dédoublonnage par SIRET normalisé (chiffres) si présent, sinon
// par nom d'OF + code postal, RESTREINT aux sources sortantes (jamais un lead
// entrant démo/contact). Une 2ᵉ exécution met à jour SANS écraser l'état
// commercial saisi en console (statut / priorité / notes / prochaine action).

import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const path = process.argv[2];
const COMMIT = process.argv.includes("--commit");
if (!path) {
  console.error("Usage: node scripts/import-prospects-crm.mjs <prospects.json> [--commit]");
  process.exit(1);
}

// Sources de prospection sortante (le dédoublonnage n'y touche que celles-ci).
const OUTBOUND_SOURCES = ["prospection-securite", "prospection-transport", "manuel"];

/** Statut Excel → étape pipeline (miroir de lib/growth/crm-prospect.ts). */
function mapStatut(label) {
  const s = (label || "").toLowerCase().trim();
  if (!s) return "FICHIER";
  if (/[àa]\s*contacter/.test(s)) return "FICHIER"; // état initial (avant « contacté »)
  if (/rdv|rendez|d[ée]mo|planifi/.test(s)) return "DEMO_PLANIFIEE";
  if (/discussion|[ée]chang|relanc|int[ée]ress/.test(s)) return "ENGAGE";
  if (/contact[ée](?!r)/.test(s)) return "CONTACTE"; // « contacté(s) » — pas « contacter »
  if (/client|sign[ée]|gagn/.test(s)) return "SIGNE";
  if (/perdu|sans int[ée]r[êe]t|refus|pas int|clos/.test(s)) return "PERDU";
  return "FICHIER";
}
function normPriorite(v) {
  const s = (v || "").toLowerCase().trim();
  if (!s) return null;
  if (s.startsWith("h")) return "haute";
  if (s.startsWith("m")) return "moyenne";
  if (s.startsWith("b")) return "basse";
  return null;
}
/** SIRET normalisé (chiffres uniquement) — cohérent avec createLeadManuel. */
function normSiret(v) {
  const d = String(v || "").replace(/\D/g, "");
  return d || null;
}

/** Trouve un prospect sortant existant (idempotence). */
async function findExisting(siret, nomOF, cp, source) {
  if (siret) {
    const bySiret = await prisma.lead.findFirst({ where: { siret }, select: { id: true } });
    if (bySiret) return bySiret;
  }
  // Repli nom + CP (source sortante) si le CP est connu, sinon nom + source
  // exacte (dernier recours pour les fiches sans adresse ni SIRET). Restreint
  // aux sources sortantes : jamais un lead entrant démo/contact homonyme.
  return prisma.lead.findFirst({
    where: cp
      ? { organisme: nomOF, codePostal: cp, source: { in: OUTBOUND_SOURCES } }
      : { organisme: nomOF, codePostal: null, siret: null, source },
    select: { id: true },
  });
}

async function main() {
  const rows = JSON.parse(readFileSync(path, "utf-8"));
  console.log(`${rows.length} prospects lus depuis ${path} — mode ${COMMIT ? "COMMIT" : "DRY-RUN"}`);

  let crees = 0, maj = 0, sansEmail = 0, echus = 0;
  const parVerticale = {};
  for (const row of rows) {
    const siret = normSiret(row.siret);
    const cp = row.codePostal || null;
    const source = row.vertical === "transport" ? "prospection-transport" : "prospection-securite";

    // Faits sur l'organisme (rafraîchis à chaque import).
    const faits = {
      telephone: row.telephone || null,
      representantLegal: row.representantLegal || null,
      region: row.region || null,
      departement: row.departement || null,
      codePostal: cp,
      ville: row.ville || null,
      adresse: row.adresse || null,
      siteWeb: row.siteWeb || null,
      siret,
      typeFormation: row.typeFormation || null,
      agrement: row.agrement || null,
      agrementEchu: !!row.agrementEchu,
      sourceRemarques: row.sourceRemarques || null,
    };
    // À la création uniquement : état commercial initial (jamais réécrit ensuite).
    const createData = {
      ...faits,
      nom: row.nomOF,
      organisme: row.nomOF,
      email: row.mail || "",
      verticale: row.vertical,
      priorite: normPriorite(row.priorite),
      statut: mapStatut(row.statut),
      prochaineAction: row.prochaineAction || null,
      notes: row.notes || null,
      source,
      lu: true,
    };

    if (!createData.email) sansEmail++;
    if (faits.agrementEchu) echus++;
    parVerticale[row.vertical] = (parVerticale[row.vertical] || 0) + 1;

    if (COMMIT) {
      const existing = await findExisting(siret, row.nomOF, cp, source);
      if (existing) {
        // Mise à jour = enrichissement des faits ; on préserve l'état commercial
        // (statut / priorité / notes / prochaineAction / verticale / lu).
        const majData = { ...faits };
        if (row.mail) majData.email = row.mail; // ne jamais écraser un e-mail par ""
        await prisma.lead.update({ where: { id: existing.id }, data: majData });
        maj++;
      } else {
        await prisma.$transaction(async (tx) => {
          const lead = await tx.lead.create({ data: createData, select: { id: true } });
          await tx.leadEvent.create({
            data: { leadId: lead.id, type: "import", titre: `Import prospection ${row.vertical}` },
          });
        });
        crees++;
      }
    }
  }

  console.log("Par verticale :", JSON.stringify(parVerticale));
  console.log(`Sans e-mail : ${sansEmail} · Agréments échus : ${echus}`);
  if (COMMIT) {
    console.log(`✅ ${crees} créés · ${maj} mis à jour.`);
    const total = await prisma.lead.count();
    console.log(`Total leads en base : ${total}`);
  } else {
    console.log("ℹ️  DRY-RUN : rien écrit. Relancer avec --commit pour importer.");
  }
}

main()
  .catch((e) => {
    console.error("❌ Échec import :", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
