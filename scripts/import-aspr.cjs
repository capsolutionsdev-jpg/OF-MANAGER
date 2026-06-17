/**
 * Migration ASPR → OFManager : importe l'export JSON d'ASPR dans la base
 * OFManager comme données du locataire « ASPR Manager ».
 *
 *  - Préserve les ids (les relations restent valides).
 *  - Pose organismeId = ASPR sur tous les modèles cloisonnés.
 *  - Additif & idempotent : ignore les lignes dont l'id existe déjà.
 *  - Conflits gérés : e-mails déjà pris (compte ignoré + userId délié),
 *    références de formation/session en doublon (suffixées), modèles globaux exclus.
 *  - Tout l'import est dans UNE transaction (rollback si erreur).
 *
 * Usage :  node scripts/import-aspr.cjs           → DRY RUN (rapport, aucune écriture)
 *          node scripts/import-aspr.cjs --write   → écriture réelle
 */
const { PrismaClient, Prisma } = require("@prisma/client");
const fs = require("node:fs");

const EXPORT = "C:/Users/GPSP/Downloads/aspr-formation-manager/aspr-export.json";
const WRITE = process.argv.includes("--write");
const p = new PrismaClient();

// Modèles globaux/partagés à NE PAS importer (uniques globaux déjà présents).
const SKIP_MODELS = new Set(["QualiopiIndicateur", "AutomationSettings", "DocumentTemplate"]);

// Ordre d'insertion (parents avant enfants pour respecter les FK).
const ORDER = [
  "User", "Formation", "Formateur", "Entreprise", "Candidat", "Session",
  "Apprenant", "Inscription", "Seance", "Presence", "EmargementSignature",
  "Convention", "Contrat", "Devis", "Facture", "Paiement",
  "CandidatInteraction", "CrmInteraction", "PieceJointe", "Evaluation",
  "EvaluationResultat", "DocumentGenere", "EmailLog", "SignatureRequest",
  "Consentement", "DataRequest", "QualiopiPreuve", "Audit", "AuditLog",
  "Cours", "CoursModule", "Lecon", "ProgressionLecon", "QuizResultat", "CoursApprenant",
];

const modelMeta = {};
for (const m of Prisma.dmmf.datamodel.models) {
  const scalars = m.fields.filter((f) => f.kind === "scalar" || f.kind === "enum");
  modelMeta[m.name] = {
    delegate: m.name.charAt(0).toLowerCase() + m.name.slice(1),
    fields: new Map(scalars.map((f) => [f.name, f])),
    hasOrg: scalars.some((f) => f.name === "organismeId"),
  };
}

function coerce(model, row) {
  const meta = modelMeta[model];
  const out = {};
  for (const [name, f] of meta.fields) {
    if (!(name in row) || row[name] === null || row[name] === undefined) continue;
    let v = row[name];
    if (f.type === "DateTime") v = new Date(v);
    out[name] = v;
  }
  return out;
}

(async () => {
  const data = JSON.parse(fs.readFileSync(EXPORT, "utf8"));
  const org = await p.organisme.findFirst({ where: { nom: "ASPR Manager" } });
  if (!org) throw new Error("Organisme « ASPR Manager » introuvable dans OFManager.");
  console.log(`Cible : ASPR Manager (${org.id})  |  mode : ${WRITE ? "ÉCRITURE" : "DRY RUN"}\n`);

  // Pré-charge des conflits potentiels (lecture seule).
  const existingEmails = new Set((await p.user.findMany({ select: { email: true } })).map((u) => u.email));
  const existingFormationRefs = new Set((await p.formation.findMany({ select: { reference: true } })).map((f) => f.reference));
  const existingSessionRefs = new Set((await p.session.findMany({ where: { reference: { not: null } }, select: { reference: true } })).map((s) => s.reference));

  const skippedUserIds = new Set();
  const report = [];

  const run = async (tx) => {
    for (const model of ORDER) {
      if (SKIP_MODELS.has(model)) continue;
      const rows = data[model];
      if (!rows || rows.length === 0) continue;
      const meta = modelMeta[model];
      if (!meta) continue;

      // ids déjà présents (idempotence)
      const existingIds = new Set(
        (await tx[meta.delegate].findMany({ select: { id: true } })).map((r) => r.id),
      );

      let inserted = 0, skipped = 0;
      const notes = [];
      for (const row of rows) {
        if (existingIds.has(row.id)) { skipped++; continue; }
        const d = coerce(model, row);
        if (meta.hasOrg) d.organismeId = org.id;

        if (model === "User") {
          if (existingEmails.has(d.email)) {
            skippedUserIds.add(row.id); skipped++;
            notes.push(`e-mail déjà pris: ${d.email} (compte ignoré)`);
            continue;
          }
          existingEmails.add(d.email);
        }
        if (model === "Formation" && d.reference && existingFormationRefs.has(d.reference)) {
          const nref = `${d.reference} (ASPR)`;
          notes.push(`réf formation en doublon: ${d.reference} → ${nref}`);
          d.reference = nref; existingFormationRefs.add(nref);
        }
        if (model === "Session" && d.reference && existingSessionRefs.has(d.reference)) {
          const nref = `${d.reference}-ASPR`;
          notes.push(`réf session en doublon: ${d.reference} → ${nref}`);
          d.reference = nref; existingSessionRefs.add(nref);
        }
        // Délier les userId pointant vers un compte ignoré.
        if ((model === "Apprenant" || model === "Formateur") && d.userId && skippedUserIds.has(d.userId)) {
          d.userId = null;
        }

        if (WRITE) {
          try { await tx[meta.delegate].create({ data: d }); inserted++; }
          catch (e) { notes.push(`ERREUR ${row.id}: ${String(e.message).split("\n")[0].slice(0, 80)}`); throw e; }
        } else {
          inserted++;
        }
      }
      report.push({ model, aImporter: inserted, ignores: skipped, notes });
    }
  };

  if (WRITE) {
    await p.$transaction(run, { timeout: 120000 });
  } else {
    await run(p); // lectures seules + simulation
  }

  console.log("=== RAPPORT ===");
  for (const r of report) {
    console.log(`${r.model.padEnd(20)} à importer: ${String(r.aImporter).padStart(3)}   ignorés: ${r.ignores}`);
    for (const n of r.notes) console.log(`     • ${n}`);
  }
  console.log(`\n${WRITE ? "✅ IMPORT EFFECTUÉ (transaction validée)." : "ℹ️  DRY RUN — aucune écriture. Relancer avec --write pour appliquer."}`);
  await p.$disconnect();
})().catch((e) => { console.error("FATAL", e.message); process.exit(1); });
