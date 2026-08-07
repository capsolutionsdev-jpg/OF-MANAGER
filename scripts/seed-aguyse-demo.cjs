/**
 * SEED DÉMO — AGUYSE FORMATION (tests + présentation client).
 *
 * Injecte des données FICTIVES dans l'organisme AGUYSE existant (sans toucher
 * à ses 15 formations, ni à l'admin) : salles, formateurs, candidats, sessions
 * (1-2 par formation), inscriptions et factures.
 *
 * TOUT est tagué pour être PURGÉ proprement avant la livraison au client :
 *   - salles     : nom commence par « DÉMO · »
 *   - formateurs : email @demo.aguyse.local
 *   - candidats  : email @demo.aguyse.local
 *   - sessions   : reference commence par « DEMO- »
 *   - factures   : reference commence par « DEMO-FAC- »
 * → purge : node scripts/clean-aguyse-demo.cjs --write
 *
 * Idempotent : purge d'abord les données démo existantes, puis recrée.
 * Usage : node scripts/seed-aguyse-demo.cjs
 */
const { readFileSync } = require("node:fs");
const path = require("node:path");

// Charge .env (DIRECT_URL prioritaire = connexion directe, hors pooler).
const env = {};
try {
  for (const l of readFileSync(path.join(process.cwd(), ".env"), "utf8").split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i);
    if (m) { let v = m[2].trim(); if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1); env[m[1]] = v; }
  }
} catch { /* .env absent : on garde l'env du process */ }
process.env.DATABASE_URL = env.DIRECT_URL || env.DATABASE_URL || process.env.DATABASE_URL;

const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

// ── Marqueurs démo (doivent rester alignés avec clean-aguyse-demo.cjs) ──
const NOM = "AGUYSE FORMATION";
const DOMAIN = "demo.aguyse.local";
const SALLE_PREFIX = "DÉMO · ";
const SESSION_PREFIX = "DEMO-";
const FAC_PREFIX = "DEMO-FAC-";
const LIEU = "Hôtel Mercure Paris Orly Rungis (94)";

// ── Helpers ──
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const sample = (arr, k) => { const c = [...arr]; const o = []; while (o.length < k && c.length) o.push(c.splice(Math.floor(Math.random() * c.length), 1)[0]); return o; };
const chance = (x) => Math.random() < x;
const NOW = new Date();
const dOffset = (days) => new Date(NOW.getTime() + days * 86400000);

const PRENOMS = ["Camille","Lucas","Léa","Hugo","Manon","Nathan","Chloé","Enzo","Jade","Louis","Sarah","Théo","Inès","Adam","Emma","Yanis","Nina","Rayan","Zoé","Mehdi","Julie","Karim","Sofia","Antoine","Fatima","Maxime","Aïcha","Julien","Sabrina","Kevin","Nadia","Romain","Amel","Quentin","Leïla","Florian","Samira","Damien","Wassim","Céline"];
const NOMS = ["Martin","Bernard","Dubois","Thomas","Robert","Petit","Durand","Leroy","Moreau","Simon","Laurent","Lefèvre","Michel","Garcia","David","Bertrand","Roux","Vincent","Fournier","Morel","Girard","André","Mercier","Blanc","Guerin","Boyer","Garnier","Chevalier","Benali","Nguyen","Diallo","Traoré","Faure","Rousseau"];
const VILLES = [["Rungis","94150"],["Paris","75013"],["Créteil","94000"],["Villejuif","94800"],["Vitry-sur-Seine","94400"],["Bagneux","92220"],["Antony","92160"],["Ivry-sur-Seine","94200"],["Orly","94310"],["Thiais","94320"]];
const SITUATIONS = ["Demandeur d'emploi","Salarié","En reconversion","Intérimaire"];
const FIN = ["CPF","OPCO","FRANCE_TRAVAIL","AUTOFINANCEMENT","ENTREPRISE"];

// Tarif démo indicatif selon le type de formation (déduit de la référence).
function demoTarif(ref) {
  if (ref.includes("ssiap-3")) return 2200;
  if (ref.includes("ssiap-2")) return 1100;
  if (ref.includes("ssiap-1")) return 700;
  if (ref.includes("tfp-aps")) return 1400;
  if (ref.includes("mac-aps")) return 350;
  if (ref.includes("habilitation")) return 320;
  if (ref.includes("mac-sst")) return 190;
  if (ref.includes("sst")) return 220;
  return 500;
}
const hasExamen = (ref) => ref.includes("ssiap") || ref.includes("tfp-aps") || ref.includes("mac-aps");

async function purgeDemo(OID) {
  const sessions = await p.session.findMany({ where: { organismeId: OID, reference: { startsWith: SESSION_PREFIX } }, select: { id: true } });
  const sIds = sessions.map((s) => s.id);
  const cands = await p.candidat.findMany({ where: { organismeId: OID, email: { endsWith: "@" + DOMAIN } }, select: { id: true } });
  const cIds = cands.map((c) => c.id);
  const inscr = await p.inscription.findMany({ where: { OR: [{ sessionId: { in: sIds } }, { candidatId: { in: cIds } }] }, select: { id: true } });
  const iIds = inscr.map((i) => i.id);
  const delChild = async (model, where) => { try { await p[model].deleteMany({ where }); } catch { /* table absente / vide */ } };
  // Enfants des inscriptions (Restrict connus) puis best-effort.
  for (const m of ["facture","documentGenere","signatureRequest","consentement","pieceJointe","emailLog"]) await delChild(m, { inscriptionId: { in: iIds } });
  await delChild("inscription", { id: { in: iIds } });
  await delChild("session", { id: { in: sIds }, organismeId: OID });
  // Enfants des candidats démo (best-effort) puis candidats.
  for (const m of ["candidatInteraction","candidatMessage","pieceJointe","consentement","reclamation"]) await delChild(m, { candidatId: { in: cIds } });
  await delChild("candidat", { id: { in: cIds }, organismeId: OID });
  await delChild("formateur", { organismeId: OID, email: { endsWith: "@" + DOMAIN } });
  await delChild("salle", { organismeId: OID, nom: { startsWith: SALLE_PREFIX } });
  return { sessions: sIds.length, candidats: cIds.length, inscriptions: iIds.length };
}

(async () => {
  const org = await p.organisme.findFirst({ where: { nom: NOM }, select: { id: true } });
  if (!org) { console.error(`STOP : organisme « ${NOM} » introuvable. Lancer d'abord seed-aguyse.cjs.`); process.exit(1); }
  const OID = org.id;
  console.log("Organisme AGUYSE :", OID);

  const purged = await purgeDemo(OID);
  if (purged.sessions || purged.candidats) console.log(`♻️  Démo précédente purgée (sessions=${purged.sessions}, candidats=${purged.candidats}, inscriptions=${purged.inscriptions}).`);

  // ── 1) Salles ──
  const salles = [];
  for (const s of [["Salle Rungis A", 14], ["Salle Rungis B", 16], ["Plateau technique incendie", 20]]) {
    const sa = await p.salle.create({ data: { organismeId: OID, nom: SALLE_PREFIX + s[0], capacite: s[1], lieu: LIEU, actif: true } });
    salles.push(sa.id);
  }

  // ── 2) Formateurs ──
  const formateursData = [
    ["Lefèvre","Marc","SSIAP 1/2/3, sécurité incendie"],
    ["Benali","Karim","TFP APS, MAC APS, sûreté"],
    ["Moreau","Alice","Habilitation électrique H0B0, BS/BE"],
    ["Garcia","Elena","SST, gestes & postures, secourisme"],
  ];
  const formateurs = [];
  for (const f of formateursData) {
    const fr = await p.formateur.create({ data: {
      organismeId: OID, nom: f[0], prenom: f[1],
      email: `${f[1].toLowerCase()}.${f[0].toLowerCase().replace(/[^a-z]/g, "")}@${DOMAIN}`,
      telephone: "06 " + rnd(10,99) + " " + rnd(10,99) + " " + rnd(10,99) + " " + rnd(10,99),
      specialites: f[2], academies: { set: ["SAFETY"] }, tarifJournalier: rnd(280, 480),
    } });
    formateurs.push(fr.id);
  }

  // ── 3) Candidats ──
  const candidats = [];
  for (let i = 0; i < 34; i++) {
    const [ville, cp] = pick(VILLES);
    const prenom = pick(PRENOMS), nom = pick(NOMS);
    const c = await p.candidat.create({ data: {
      organismeId: OID, nom, prenom,
      email: `${prenom.toLowerCase()}.${nom.toLowerCase().replace(/[^a-z]/g, "")}${i}@${DOMAIN}`,
      telephone: "06 " + rnd(10,99) + " " + rnd(10,99) + " " + rnd(10,99) + " " + rnd(10,99),
      dateNaissance: new Date(rnd(1975, 2004), rnd(0,11), rnd(1,28)),
      lieuNaissance: ville, adresse: `${rnd(1,150)} rue ${pick(NOMS)}`, ville, codePostal: cp,
      financementType: pick(FIN), situationPro: pick(SITUATIONS),
      statut: "INSCRIT", crmStage: "GAGNE",
    } });
    candidats.push(c.id);
  }

  // ── 4) Sessions + inscriptions + factures (1-2 sessions par formation) ──
  const formations = await p.formation.findMany({ where: { organismeId: OID }, select: { id: true, reference: true, titre: true } });
  let sesSeq = 0, facSeq = 1, nbSess = 0, nbInsc = 0, nbFac = 0, caTotal = 0;

  for (const f of formations) {
    const tarif = demoTarif(f.reference);
    const examen = hasExamen(f.reference);
    const nbSessionsForm = chance(0.5) ? 2 : 1;
    for (let k = 0; k < nbSessionsForm; k++) {
      const start = dOffset(rnd(-120, 75)); // -4 mois → +2,5 mois
      const dur = tarif > 1000 ? rnd(8, 15) : rnd(1, 5);
      const end = new Date(start.getTime() + dur * 86400000);
      const past = end < NOW, ongoing = start <= NOW && end >= NOW;
      const statut = past ? "TERMINEE" : ongoing ? "EN_COURS" : pick(["PLANIFIEE","OUVERTE"]);
      const nbPlaces = rnd(8, 14);
      const sess = await p.session.create({ data: {
        organismeId: OID, formationId: f.id,
        reference: `${SESSION_PREFIX}${String(++sesSeq).padStart(3, "0")}`,
        dateDebut: start, dateFin: end, modalite: "PRESENTIEL",
        lieu: LIEU, horaires: "9h00-12h30 / 13h30-17h00", nbPlaces, statut,
        salleId: pick(salles), dateExamen: examen ? new Date(end.getTime() + 86400000 * 3) : null,
        formateurs: { connect: [{ id: pick(formateurs) }] },
      } });
      nbSess++;

      const inscrits = sample(candidats, rnd(5, Math.min(nbPlaces, 12)));
      for (const cid of inscrits) {
        const fin = pick(FIN);
        let resultat = "NON_EVALUE", certifDate = null, signedAt = null;
        if (past) {
          resultat = chance(0.82) ? "CERTIFIE" : chance(0.6) ? "AJOURNE" : "ABANDON";
          certifDate = new Date(end.getTime() + 86400000 * 2);
          signedAt = new Date(start.getTime() - 86400000 * rnd(3, 20));
        } else if (chance(0.7)) {
          signedAt = new Date(start.getTime() - 86400000 * rnd(3, 20));
        }
        const insc = await p.inscription.create({ data: {
          organismeId: OID, candidatId: cid, sessionId: sess.id, financementType: fin,
          statut: past || chance(0.8) ? "VALIDEE" : "EN_ATTENTE",
          resultatCertification: resultat, certificationDate: certifDate,
          montant: tarif, modePaiement: fin === "CPF" ? "CPF" : fin === "OPCO" ? "OPCO" : "VIREMENT",
          paiementStatut: past ? "PAYE" : chance(0.5) ? "PAYE" : "EN_ATTENTE",
          signedAt, formCompletedAt: signedAt, convocationSentAt: signedAt,
        } });
        nbInsc++;

        // Facture (pour peupler le CA du tableau de bord) — tag DEMO-FAC-
        if (past || chance(0.7)) {
          const emis = new Date((past ? end : start).getTime() - 86400000 * rnd(0, 15));
          const paid = past ? chance(0.9) : chance(0.4);
          await p.facture.create({ data: {
            organismeId: OID, reference: `${FAC_PREFIX}${emis.getFullYear()}-${String(facSeq++).padStart(4, "0")}`,
            inscriptionId: insc.id, dateEmission: emis, montantHT: tarif, tva: 0, montantTTC: tarif,
            statut: paid ? "PAYEE" : chance(0.5) ? "ENVOYEE" : "PARTIELLE",
            datePaiement: paid ? new Date(emis.getTime() + 86400000 * rnd(5, 40)) : null,
            financementType: fin,
          } });
          nbFac++; caTotal += tarif;
        }
      }
    }
  }

  console.log("\n════════ DÉMO AGUYSE CRÉÉE (données fictives) ════════");
  console.log(`Salles: ${salles.length} · Formateurs: ${formateurs.length} · Candidats: ${candidats.length}`);
  console.log(`Formations couvertes: ${formations.length} · Sessions: ${nbSess} · Inscriptions: ${nbInsc} · Factures: ${nbFac}`);
  console.log(`CA facturé (démo): ${caTotal.toLocaleString("fr-FR")} €`);
  console.log("\n⚠️  Données de DÉMO — purger avant livraison : node scripts/clean-aguyse-demo.cjs --write");
  await p.$disconnect();
})().catch(async (e) => { console.error("ERREUR :", e); try { await p.$disconnect(); } catch {} process.exit(1); });
