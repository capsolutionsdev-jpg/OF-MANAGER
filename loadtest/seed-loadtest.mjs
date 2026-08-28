/**
 * GÉNÉRATEUR DE VOLUME — Audit 07 (performance / charge).
 * Remplit une base de test ISOLÉE avec un gros volume de fausses données, pour
 * mesurer le comportement d'OFMANAGER à l'échelle d'un organisme « mûr ».
 *
 * SÉCURITÉ (lire) :
 *   - N'écrit JAMAIS sur la prod : utilise UNIQUEMENT `LOADTEST_DATABASE_URL`
 *     (jamais DATABASE_URL / DIRECT_URL).
 *   - Refuse une base qui contient déjà d'autres organismes (probable prod),
 *     sauf `LOADTEST_FORCE=1`.
 *   - Exige `LOADTEST_CONFIRM=1` pour écrire.
 *
 * Usage :
 *   1) Mettre l'adresse de la base de TEST dans `.env.loadtest` :
 *        LOADTEST_DATABASE_URL="postgresql://user:pwd@ep-xxx.neon.tech/db?sslmode=require"
 *   2) Pousser le schéma une fois sur cette base (voir loadtest/README.md).
 *   3) LOADTEST_CONFIRM=1 node loadtest/seed-loadtest.mjs
 *
 * Échelle : LOADTEST_SCALE = petit | moyen (défaut) | grand
 */
import { readFileSync, existsSync } from "node:fs";
import bcrypt from "bcryptjs";

// ── Charge .env.loadtest (et lui seul : jamais le .env de prod) ──
if (existsSync(".env.loadtest")) {
  for (const l of readFileSync(".env.loadtest", "utf8").split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i);
    if (m) {
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (!process.env[m[1]]) process.env[m[1]] = v;
    }
  }
}

const URL = process.env.LOADTEST_DATABASE_URL;
if (!URL) {
  console.error("✋ LOADTEST_DATABASE_URL manquant. Mets l'adresse de la base de TEST dans .env.loadtest. (Jamais la prod.)");
  process.exit(1);
}
const host = (URL.match(/@([^/:?]+)/) || [])[1] || "?";
console.log("Base cible :", host);

const SCALE = (process.env.LOADTEST_SCALE || "moyen").toLowerCase();
const CONF = {
  petit: { candidats: 800, sessions: 150, emarg: 12000 },
  moyen: { candidats: 3000, sessions: 700, emarg: 45000 },
  grand: { candidats: 8000, sessions: 1800, emarg: 130000 },
}[SCALE];
if (!CONF) { console.error("LOADTEST_SCALE doit être : petit | moyen | grand"); process.exit(1); }
console.log("Échelle :", SCALE, JSON.stringify(CONF));

const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient({ datasourceUrl: URL });

// ── Garde anti-prod ──
const orgCount = await prisma.organisme.count();
const existingLoad = await prisma.organisme.findFirst({ where: { sousDomaine: "loadtest" }, select: { id: true } });
if (orgCount > 0 && !existingLoad && process.env.LOADTEST_FORCE !== "1") {
  console.error(`✋ Cette base contient déjà ${orgCount} organisme(s) et aucun tenant « loadtest ».`);
  console.error("   Par sécurité (ça ressemble à une base réelle), j'arrête. Si c'est BIEN une base de test, relance avec LOADTEST_FORCE=1.");
  process.exit(1);
}
if (process.env.LOADTEST_CONFIRM !== "1") {
  console.error("✋ Ajoute LOADTEST_CONFIRM=1 pour confirmer l'écriture en volume sur cette base de test.");
  process.exit(1);
}

// ── Helpers ──
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const sample = (arr, k) => { const c = [...arr]; const o = []; while (o.length < k && c.length) o.push(c.splice(Math.floor(Math.random() * c.length), 1)[0]); return o; };
const chance = (p) => Math.random() < p;
let _c = 0;
const genId = (p) => p + (_c++).toString(36) + Math.random().toString(36).slice(2, 8);
const NOW = new Date();
const dOffset = (days) => new Date(NOW.getTime() + days * 86400000);
async function insertMany(model, rows, size = 1000) {
  for (let i = 0; i < rows.length; i += size) {
    await prisma[model].createMany({ data: rows.slice(i, i + size), skipDuplicates: true });
    process.stdout.write(`  ${model}: ${Math.min(i + size, rows.length)}/${rows.length}\r`);
  }
  if (rows.length) console.log(`  ${model}: ${rows.length} lignes créées.        `);
}

const PRENOMS = ["Camille","Lucas","Léa","Hugo","Manon","Nathan","Chloé","Enzo","Jade","Louis","Sarah","Théo","Inès","Adam","Emma","Yanis","Nina","Rayan","Zoé","Mehdi","Julie","Karim","Sofia","Antoine","Fatima","Maxime","Aïcha","Julien","Sabrina","Kevin","Nadia","Romain","Amel","Quentin","Leïla","Florian","Samira","Damien","Wassim","Céline"];
const NOMS = ["Martin","Bernard","Dubois","Thomas","Robert","Petit","Durand","Leroy","Moreau","Simon","Laurent","Michel","Garcia","David","Roux","Vincent","Fournier","Morel","Girard","André","Mercier","Blanc","Guerin","Boyer","Garnier","Benali","Nguyen","Diallo","Traoré","Faure"];
const VILLES = [["Paris","75011"],["Lyon","69003"],["Marseille","13008"],["Lille","59000"],["Bordeaux","33000"],["Nantes","44000"],["Les Lilas","93260"],["Créteil","94000"]];
const FIN = ["CPF","OPCO","FRANCE_TRAVAIL","AUTOFINANCEMENT","ENTREPRISE"];

// ── Reset du tenant loadtest s'il existe déjà ──
if (existingLoad) {
  console.log("♻️  Tenant loadtest existant — nettoyage…");
  const eid = existingLoad.id;
  const dels = ["emargementSignature","presence","seance","paiement","facture","documentGenere","inscription","session","candidat","formateur","salle","formation","auditLog","emailLog","user"];
  for (const d of dels) { try { await prisma[d].deleteMany({ where: { organismeId: eid } }); } catch { /* table sans organismeId */ } }
  await prisma.organisme.delete({ where: { id: eid } });
}

// ── 1) Organisme + admin ──
const OID = genId("org");
await prisma.organisme.create({ data: {
  id: OID, nom: "OF Loadtest (volume)", raisonSociale: "OF Loadtest SAS",
  representant: "Test Charge", representantQualite: "Directeur",
  siret: "00000000000000", nda: "00000000000",
  adresse: "1 rue du Test", codePostal: "93260", ville: "Les Lilas",
  email: "contact@loadtest.local", telephone: "0100000000",
  certificateur: "France Compétences", assujettiTva: false,
  couleurPrimaire: "#1A5FD4", sousDomaine: "loadtest", statut: "ACTIF",
  fonctionnalites: { set: ["crm","candidats","clients-pro","formations","sessions","comptabilite","bpf","qualiopi","documents","signatures","formateurs","salles","rapports"] },
} });
await prisma.user.create({ data: { email: "admin@loadtest.local", name: "Admin Loadtest", role: "ADMIN", organismeId: OID, isActive: true, mustChangePassword: false, passwordHash: bcrypt.hashSync("Loadtest2026!", 10) } });
console.log("Organisme loadtest :", OID);

// ── 2) Salles / formateurs / formations ──
const salles = Array.from({ length: 6 }, (_, i) => ({ id: genId("sal"), organismeId: OID, nom: `Salle ${i + 1}`, capacite: rnd(10, 24), lieu: "Les Lilas (93)", actif: true }));
await insertMany("salle", salles);
const formateurs = Array.from({ length: 12 }, (_, i) => ({ id: genId("for"), organismeId: OID, nom: pick(NOMS), prenom: pick(PRENOMS), email: `formateur${i}@loadtest.local`, telephone: "0600000000", specialites: "Sécurité", academies: ["SAFETY"], tarifJournalier: rnd(250, 480) }));
await insertMany("formateur", formateurs);
const FORMS = [["SST",14,220,false],["MAC SST",7,190,false],["TFP APS",175,1400,true],["MAC APS",31,350,false],["SSIAP 1",67,700,true],["SSIAP 2",70,1100,true],["SSIAP 3",216,2200,true],["Habilitation élec.",21,320,false],["Gestes & postures",7,180,false],["Recyclage SSIAP 1",21,400,false],["H0B0",7,160,false],["EPI",7,150,false],["Capacité transport",105,1600,true],["Formation continue",35,600,false]];
const formations = FORMS.map((f, i) => ({ id: genId("fm"), organismeId: OID, titre: f[0], reference: `F-${i}-${genId("r").slice(-4)}`, dureeHeures: f[1], duree: `${f[1]} h`, tarif: f[2], examen: f[3], diplomante: f[3], soumisJury: f[3], academy: "SAFETY", modalite: "PRESENTIEL", objectifs: "Acquérir les compétences réglementaires.", prerequis: "Aptitude médicale.", publicVise: "Demandeurs d'emploi, salariés.", piecesAttendues: ["Pièce d'identité","Justificatif de domicile"] }));
await insertMany("formation", formations);

// ── 3) Candidats ──
const candidats = Array.from({ length: CONF.candidats }, (_, i) => {
  const [ville, cp] = pick(VILLES);
  return { id: genId("cd"), organismeId: OID, nom: pick(NOMS), prenom: pick(PRENOMS), email: `cand${i}@loadtest.local`, telephone: "0600000000", dateNaissance: new Date(rnd(1975, 2004), rnd(0, 11), rnd(1, 28)), lieuNaissance: ville, adresse: `${rnd(1, 150)} rue du Test`, ville, codePostal: cp, financementType: pick(FIN), situationPro: pick(["Demandeur d'emploi","Salarié","En reconversion"]), statut: "INSCRIT", crmStage: "GAGNE" };
});
await insertMany("candidat", candidats);
const candIds = candidats.map((c) => c.id);

// ── 4) Sessions ──
const sessions = Array.from({ length: CONF.sessions }, (_, s) => {
  const f = pick(formations);
  const start = dOffset(rnd(-400, 40));
  const durDays = Math.max(1, f.tarif > 1000 ? rnd(6, 20) : rnd(1, 5));
  const end = new Date(start.getTime() + durDays * 86400000);
  const past = end < NOW;
  return { id: genId("ses"), organismeId: OID, formationId: f.id, _tarif: f.tarif, _start: start, _end: end, _past: past, reference: `SES-${s}-${genId("r").slice(-3)}`, dateDebut: start, dateFin: end, modalite: "PRESENTIEL", lieu: "Les Lilas (93)", horaires: "9h-12h30 / 13h30-17h", nbPlaces: rnd(8, 16), statut: past ? "TERMINEE" : (start <= NOW ? "EN_COURS" : pick(["PLANIFIEE","OUVERTE"])), salleId: pick(salles).id };
});
await insertMany("session", sessions.map(({ _tarif, _start, _end, _past, ...row }) => row));

// ── 5) Inscriptions (respecte @@unique[candidatId, sessionId]) ──
const inscriptions = [];
for (const ses of sessions) {
  const k = rnd(8, 22);
  for (const cid of sample(candIds, Math.min(k, candIds.length))) {
    const past = ses._past;
    const resultat = past ? (chance(0.82) ? "CERTIFIE" : chance(0.6) ? "AJOURNE" : "ABANDON") : "NON_EVALUE";
    inscriptions.push({ id: genId("in"), organismeId: OID, candidatId: cid, sessionId: ses.id, _start: ses._start, _end: ses._end, _tarif: ses._tarif, _past: past, financementType: pick(FIN), statut: past || chance(0.8) ? "VALIDEE" : "EN_ATTENTE", resultatCertification: resultat, certificationDate: past ? new Date(ses._end.getTime() + 2 * 86400000) : null, montant: ses._tarif, modePaiement: "VIREMENT", paiementStatut: past ? "PAYE" : (chance(0.5) ? "PAYE" : "EN_ATTENTE") });
  }
}
await insertMany("inscription", inscriptions.map(({ _start, _end, _tarif, _past, ...row }) => row));
console.log(`  → ${inscriptions.length} inscriptions.`);

// ── 6) Émargements (grosse table) — jusqu'à la cible ──
const emargs = [];
let ei = 0;
outer: for (const ins of inscriptions) {
  const nHalf = rnd(2, 12);
  for (let h = 0; h < nHalf; h++) {
    if (emargs.length >= CONF.emarg) break outer;
    const day = new Date(ins._start.getTime() + Math.floor(h / 2) * 86400000);
    emargs.push({ id: genId("em"), organismeId: OID, sessionId: ins.sessionId, date: day, demi: h % 2 === 0 ? "MATIN" : "APRES_MIDI", role: "STAGIAIRE", nom: "Stagiaire", email: `em${ei}@loadtest.local`, candidatId: ins.candidatId, token: genId("tok") + ei, signedAt: ins._past ? day : null });
    ei++;
  }
}
await insertMany("emargementSignature", emargs);

// ── 7) Factures + paiements (sur ~70 % des inscriptions) ──
const factures = [], paiements = [];
let fseq = 1;
for (const ins of inscriptions) {
  if (!(ins._past || chance(0.7))) continue;
  const emis = new Date((ins._past ? ins._end : ins._start).getTime() - rnd(0, 20) * 86400000);
  const paid = ins._past ? chance(0.9) : chance(0.35);
  const fid = genId("fa");
  factures.push({ id: fid, organismeId: OID, reference: `FAC-${emis.getFullYear()}-${String(fseq++).padStart(5, "0")}`, inscriptionId: ins.id, dateEmission: emis, montantHT: ins._tarif, tva: 0, montantTTC: ins._tarif, statut: paid ? "PAYEE" : (chance(0.5) ? "ENVOYEE" : "PARTIELLE"), datePaiement: paid ? new Date(emis.getTime() + rnd(5, 40) * 86400000) : null, financementType: ins.financementType });
  if (paid) paiements.push({ id: genId("pa"), organismeId: OID, factureId: fid, inscriptionId: ins.id, montant: ins._tarif, date: new Date(emis.getTime() + rnd(5, 40) * 86400000), mode: "VIREMENT" });
}
await insertMany("facture", factures);
await insertMany("paiement", paiements);

// ── Résumé ──
console.log("\n════════ BASE DE TEST REMPLIE ════════");
console.log(`Organisme    : OF Loadtest (${OID})  sousDomaine=loadtest`);
console.log(`Connexion    : admin@loadtest.local / Loadtest2026!  (ADMIN)`);
console.log(`Candidats    : ${candidats.length}`);
console.log(`Sessions     : ${sessions.length}`);
console.log(`Inscriptions : ${inscriptions.length}`);
console.log(`Émargements  : ${emargs.length}`);
console.log(`Factures     : ${factures.length}  ·  Paiements : ${paiements.length}`);
console.log("Lance ensuite :  node loadtest/bench-db.mjs");
await prisma.$disconnect();
