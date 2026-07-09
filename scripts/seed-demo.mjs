/**
 * Seed d'un tenant de DÉMONSTRATION isolé (compte bien rempli pour présenter
 * la plateforme aux clients). N'écrit QUE dans le nouvel organisme démo.
 * Idempotent : refuse de recréer si le sous-domaine "demo-presentation" existe.
 * Usage : node scripts/seed-demo.mjs   (via DIRECT_URL)
 */
import { readFileSync } from "node:fs";
import bcrypt from "bcryptjs";

const env = {};
for (const l of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i);
  if (m) { let v = m[2].trim(); if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1); env[m[1]] = v; }
}
process.env.DATABASE_URL = env.DIRECT_URL || env.DATABASE_URL;

const { PrismaClient } = await import("@prisma/client");
const p = new PrismaClient();
async function wr(fn, n = 5) { for (let i = 0; i < n; i++) { try { return await fn(); } catch (e) { if (i === n - 1) throw e; await new Promise((r) => setTimeout(r, 2500)); } } }

// ── Helpers aléatoires ──
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const sample = (arr, k) => { const c = [...arr]; const o = []; while (o.length < k && c.length) o.push(c.splice(Math.floor(Math.random() * c.length), 1)[0]); return o; };
const chance = (p) => Math.random() < p;
const NOW = new Date("2026-07-09T10:00:00Z");
const dOffset = (days) => new Date(NOW.getTime() + days * 86400000);

const PRENOMS = ["Camille","Lucas","Léa","Hugo","Manon","Nathan","Chloé","Enzo","Jade","Louis","Sarah","Théo","Inès","Adam","Emma","Yanis","Nina","Rayan","Zoé","Mehdi","Julie","Karim","Sofia","Antoine","Fatima","Maxime","Aïcha","Julien","Sabrina","Kevin","Nadia","Romain","Amel","Quentin","Leïla","Florian","Samira","Damien","Wassim","Céline"];
const NOMS = ["Martin","Bernard","Dubois","Thomas","Robert","Petit","Durand","Leroy","Moreau","Simon","Laurent","Lefèvre","Michel","Garcia","David","Bertrand","Roux","Vincent","Fournier","Morel","Girard","André","Mercier","Blanc","Guerin","Boyer","Garnier","Chevalier","Benali","Ouldtaleb","Bouzid","Nguyen","Diallo","Traoré","Faure","Rousseau","Blanchard","Gaillard","Barbier","Renard"];
const VILLES = [["Paris","75011"],["Lyon","69003"],["Marseille","13008"],["Lille","59000"],["Bordeaux","33000"],["Toulouse","31000"],["Nantes","44000"],["Les Lilas","93260"],["Montreuil","93100"],["Créteil","94000"],["Nanterre","92000"],["Saint-Denis","93200"]];
const ENTREPRISES = ["Sécuritas France","Prosegur","Groupe Onet","Samsic Sécurité","Fiducial Sécurité","Byblos Sécurité","Protectas","Seris Security","City One","Elior Services","Derichebourg","Atalian","GSF Propreté","Vinci Facilities","Engie Solutions","Bouygues Énergies","La Poste","Transdev"];
const OPCOS = ["OPCO EP","AKTO","OPCO 2i","Constructys","Atlas"];

// ── Reset : si un tenant démo existe (même partiel), on le supprime pour repartir propre ──
const exist = await wr(() => p.organisme.findFirst({ where: { sousDomaine: "demo-presentation" }, select: { id: true } }));
if (exist) {
  const eid = exist.id;
  console.log("♻️  Tenant démo existant détecté — nettoyage avant recréation…");
  const dels = ["paiement","facture","diplome","juryAffectation","documentGenere","signatureRequest","consentement","reclamation","candidatMessage","candidatInteraction","pieceJointe","inscription","devis","depenseCentre","emailLog","session","apprenant","candidat","entreprise","jury","formateur","salle","formation","auditLog","user"];
  for (const d of dels) { try { await wr(() => p[d].deleteMany({ where: { organismeId: eid } })); } catch { /* table sans organismeId ou vide */ } }
  await wr(() => p.organisme.delete({ where: { id: eid } }));
  console.log("   nettoyage terminé.");
}

const ALL_FEATURES = ["crm","candidats","clients-pro","formations","sessions","suivi-pedagogique","formateurs","planning","salles","documents","signatures","automatisations","elearning","comptabilite","facturation","qualiopi","bpf","rgpd","kanban","taches","notifications","devis-signature","leads-multicanal","sms","portail-client","rapports","scoring","ia","support","diplomes","jurys"];

// ── 1) Organisme démo ──
const org = await wr(() => p.organisme.create({ data: {
  nom: "Académie Démo Formation",
  raisonSociale: "Académie Démo Formation SAS",
  representant: "Sophie Marchand",
  representantQualite: "Directrice",
  siret: "90210345600017",
  nda: "11930012893",
  numeroTva: "FR90902103456",
  adresse: "24 avenue de la Formation",
  codePostal: "93260", ville: "Les Lilas",
  telephone: "01 84 22 55 10", email: "contact@academie-demo.fr",
  certificateur: "France Compétences",
  assujettiTva: false,
  couleurPrimaire: "#7C3AED", design: "defaut",
  sousDomaine: "demo-presentation",
  statut: "ACTIF", formule: "COMPLET",
  fonctionnalites: { set: ALL_FEATURES },
  referentHandicapNom: "Sophie Marchand", referentHandicapContact: "handicap@academie-demo.fr",
} }));
const OID = org.id;
console.log("Organisme démo créé :", OID);

// ── 2) Admin ──
await wr(() => p.user.create({ data: {
  email: "demo@academie-demo.fr", name: "Sophie Marchand (Démo)", role: "ADMIN",
  organismeId: OID, isActive: true, mustChangePassword: false,
  passwordHash: bcrypt.hashSync("Demo2026!", 10),
} }));

// ── 3) Salles ──
for (const s of [["Salle Curie", 12], ["Salle Ampère", 16], ["Plateau technique incendie", 20]])
  await p.salle.create({ data: { organismeId: OID, nom: s[0], capacite: s[1], lieu: "Les Lilas (93)", actif: true } });
const salles = await p.salle.findMany({ where: { organismeId: OID }, select: { id: true } });

// ── 4) Formateurs ──
const formateursData = [
  ["Lefèvre","Marc","SST, PRAP","SAFETY"],["Benali","Karim","TFP APS, MAC APS","SAFETY"],
  ["Petit","Hugo","SSIAP 1/2/3","SAFETY"],["Moreau","Alice","Habilitation électrique","SAFETY"],
  ["Garcia","Elena","Gestes & postures, secourisme","SAFETY"],["Nguyen","Paul","SSIAP, incendie","SAFETY"],
];
const formateurs = [];
for (const f of formateursData) {
  const fr = await p.formateur.create({ data: { organismeId: OID, nom: f[0], prenom: f[1], email: `${f[1].toLowerCase()}.${f[0].toLowerCase().replace(/[^a-z]/g,"")}@academie-demo.fr`, telephone: "06 " + rnd(10,99) + " " + rnd(10,99) + " " + rnd(10,99) + " " + rnd(10,99), specialites: f[2], academies: { set: [f[3]] }, tarifJournalier: rnd(250, 480) } });
  formateurs.push(fr.id);
}

// ── 5) Formations ──
const P = ["Pièce d'identité","Justificatif de domicile","CV à jour"];
const formationsData = [
  // titre, ref, heures, tarif, examen, diplomante, soumisJury, nbJury, certif
  ["SST — Sauveteur Secouriste du Travail","F-SST",14,220,false,false,false,null,"INRS"],
  ["MAC SST — Maintien des compétences","F-MACSST",7,190,false,false,false,null,"INRS"],
  ["TFP APS — Agent de prévention et sécurité","F-TFPAPS",175,1400,true,true,true,2,"RNCP1717"],
  ["MAC APS — Recyclage agent de sécurité","F-MACAPS",31,350,true,false,false,null,"RNCP1717"],
  ["SSIAP 1 — Agent de sécurité incendie","F-SSIAP1",67,700,true,true,true,2,"Arrêté 2 mai 2005"],
  ["SSIAP 2 — Chef d'équipe sécurité incendie","F-SSIAP2",70,1100,true,true,true,2,"Arrêté 2 mai 2005"],
  ["SSIAP 3 — Chef de service sécurité incendie","F-SSIAP3",216,2200,true,true,true,3,"Arrêté 2 mai 2005"],
  ["Habilitation électrique B0-H0-BS","F-HABELEC",21,320,false,false,false,null,"NF C18-510"],
  ["Gestes & postures — Manutention","F-GESTES",7,180,false,false,false,null,null],
  ["Recyclage SSIAP 1","F-RSSIAP1",21,400,true,false,true,2,"Arrêté 2 mai 2005"],
];
const formations = [];
for (const f of formationsData) {
  const fo = await p.formation.create({ data: {
    organismeId: OID, titre: f[0], reference: f[1], dureeHeures: f[2], duree: `${f[2]} h`,
    tarif: f[3], examen: f[4], diplomante: f[5], soumisJury: f[6], nbJury: f[7],
    certification: f[8], academy: "SAFETY", modalite: "PRESENTIEL",
    objectifs: "Acquérir les compétences réglementaires et pratiques nécessaires à l'exercice du métier, en conformité avec le référentiel.",
    prerequis: "Aptitude médicale. Maîtrise du français (B1).", publicVise: "Demandeurs d'emploi, salariés, personnes en reconversion.",
    piecesAttendues: { set: f[6] ? [...P, "Aptitude médicale"] : P },
  } });
  formations.push({ id: fo.id, ...Object.fromEntries([["titre",f[0]],["tarif",f[3]],["examen",f[4]],["diplomante",f[5]],["jury",f[6]],["pieces", f[6] ? [...P,"Aptitude médicale"] : P]]) });
}
const juryFormations = formations.filter((f) => f.jury);

// ── 6) Jurys ──
const jurys = [];
for (const j of [["Ramos","Isabelle","Formatrice experte incendie"],["Klein","Daniel","Ancien officier SP"],["Sow","Awa","Responsable sécurité"],["Faure","Bruno","Formateur SSIAP 3"],["Meyer","Claire","Référente APS"]]) {
  const jr = await p.jury.create({ data: { organismeId: OID, nom: j[0], prenom: j[1], email: `${j[1].toLowerCase()}.${j[0].toLowerCase()}@jury-demo.fr`, telephone: "06 " + rnd(10,99) + " " + rnd(10,99) + " " + rnd(10,99) + " " + rnd(10,99), qualite: j[2], actif: true, formationsValidables: { set: sample(juryFormations, rnd(2, juryFormations.length)).map((f) => f.id) } } });
  jurys.push(jr.id);
}

// ── 7) Entreprises ──
const entreprises = [];
for (const e of ENTREPRISES) {
  const [ville, cp] = pick(VILLES);
  const en = await p.entreprise.create({ data: { organismeId: OID, raisonSociale: e, siret: String(rnd(100,999)) + String(rnd(100,999)) + String(rnd(100,999)) + "000" + rnd(10,99), ville, codePostal: cp, adresse: `${rnd(1,120)} rue de l'Industrie`, contactNom: `${pick(PRENOMS)} ${pick(NOMS)}`, contactEmail: `rh@${e.toLowerCase().replace(/[^a-z]/g,"")}.fr`, contactTel: "01 " + rnd(10,99) + " " + rnd(10,99) + " " + rnd(10,99) + " " + rnd(10,99), opco: pick(OPCOS), stage: "GAGNE" } });
  entreprises.push(en.id);
}

// ── 8) Candidats ──
const FIN = ["CPF","OPCO","FRANCE_TRAVAIL","AUTOFINANCEMENT","ENTREPRISE"];
const candidats = [];
for (let i = 0; i < 70; i++) {
  const [ville, cp] = pick(VILLES);
  const prenom = pick(PRENOMS), nom = pick(NOMS);
  const fin = pick(FIN);
  const c = await p.candidat.create({ data: {
    organismeId: OID, nom, prenom,
    email: `${prenom.toLowerCase()}.${nom.toLowerCase().replace(/[^a-z]/g,"")}${i}@email-demo.fr`,
    telephone: "06 " + rnd(10,99) + " " + rnd(10,99) + " " + rnd(10,99) + " " + rnd(10,99),
    dateNaissance: new Date(rnd(1975, 2004), rnd(0,11), rnd(1,28)),
    lieuNaissance: ville, adresse: `${rnd(1,150)} rue ${pick(NOMS)}`, ville, codePostal: cp,
    financementType: fin, situationPro: pick(["Demandeur d'emploi","Salarié","En reconversion","Intérimaire"]),
    entrepriseId: fin === "ENTREPRISE" || fin === "OPCO" ? pick(entreprises) : null,
    statut: "INSCRIT", crmStage: "GAGNE",
  } });
  candidats.push(c.id);
}

// ── 9) Sessions + inscriptions + factures + jurys + diplômes ──
let facSeq = 1, caTotal = 0, nbInsc = 0, nbFac = 0, nbDip = 0, chargesSessions = 0;
const anneeRef = (d) => d.getFullYear();
const NB_SESSIONS = 52;
for (let s = 0; s < NB_SESSIONS; s++) {
  const f = pick(formations);
  const start = dOffset(rnd(-330, 60)); // -11 mois → +2 mois
  const dur = Math.max(1, Math.round((f.tarif > 1000 ? rnd(8, 20) : rnd(1, 5))));
  const end = new Date(start.getTime() + dur * 86400000);
  const past = end < NOW, ongoing = start <= NOW && end >= NOW;
  const statut = past ? "TERMINEE" : ongoing ? "EN_COURS" : pick(["PLANIFIEE","OUVERTE"]);
  const nbPlaces = rnd(8, 14);
  const sess = await p.session.create({ data: {
    organismeId: OID, formationId: f.id, reference: `SES-${f.id.slice(-4)}-${s}`,
    dateDebut: start, dateFin: end, modalite: "PRESENTIEL",
    lieu: "Les Lilas (93)", horaires: "9h00-12h30 / 13h30-17h00", nbPlaces, statut,
    salleId: pick(salles).id, dateExamen: f.examen ? new Date(end.getTime() + 86400000 * 3) : null,
    isArchived: past && chance(0.5),
    formateurs: { connect: [{ id: pick(formateurs) }] },
    resultatsDeclaresAt: past && f.examen ? new Date(end.getTime() + 86400000 * 5) : null,
  } });

  // Charge : sous-traitance formateur de la session (réaliste, alimente les charges)
  {
    const fcents = dur * rnd(280, 420) * 100;
    await p.depenseCentre.create({ data: { organismeId: OID, date: new Date(end.getTime() + 86400000 * rnd(2, 12)), categorie: "FORMATEUR", libelle: `Sous-traitance formateur — ${f.titre.split("—")[0].trim()}`, montantCents: fcents, statut: past ? "PAYE" : "EN_ATTENTE" } });
    chargesSessions += fcents;
  }

  // Jury si formation soumise à jury
  if (f.jury) {
    for (const jid of sample(jurys, f.nbJury ?? 2)) {
      const paye = past && chance(0.7);
      await p.juryAffectation.create({ data: { organismeId: OID, sessionId: sess.id, juryId: jid, prixCents: rnd(150, 400) * 100, natureExamen: `Examen ${f.titre.split("—")[0].trim()}`, statut: paye ? "PAYE" : "A_PAYER", payeAt: paye ? new Date(end.getTime() + 86400000 * 10) : null } });
    }
  }

  // Inscriptions
  const inscrits = sample(candidats, rnd(6, Math.min(nbPlaces, 13)));
  for (const cid of inscrits) {
    const fin = pick(FIN);
    let resultat = "NON_EVALUE", certifDate = null, signedAt = null;
    if (past) {
      resultat = chance(0.82) ? "CERTIFIE" : chance(0.6) ? "AJOURNE" : "ABANDON";
      certifDate = resultat !== "NON_EVALUE" ? new Date(end.getTime() + 86400000 * 2) : null;
      signedAt = new Date(start.getTime() - 86400000 * rnd(3, 20));
    } else if (chance(0.7)) {
      signedAt = new Date(start.getTime() - 86400000 * rnd(3, 20));
    }
    const insc = await p.inscription.create({ data: {
      organismeId: OID, candidatId: cid, sessionId: sess.id, financementType: fin,
      statut: past || chance(0.8) ? "VALIDEE" : "EN_ATTENTE",
      resultatCertification: resultat, certificationDate: certifDate,
      montant: f.tarif, modePaiement: fin === "CPF" ? "CPF" : fin === "OPCO" ? "OPCO" : "VIREMENT",
      paiementStatut: past ? "PAYE" : chance(0.5) ? "PAYE" : "EN_ATTENTE",
      signedAt, formCompletedAt: signedAt, convocationSentAt: signedAt,
      piecesRecues: { set: signedAt ? f.pieces : sample(f.pieces, rnd(0, f.pieces.length)) },
    } });
    nbInsc++;

    // Facture (facturé) — CA
    const billed = past || chance(0.75);
    if (billed) {
      const ht = f.tarif; const ttc = ht; // exonéré TVA
      const emis = new Date((past ? end : start).getTime() - 86400000 * rnd(0, 20));
      const paid = past ? chance(0.9) : chance(0.35);
      await p.facture.create({ data: {
        organismeId: OID, reference: `FAC-${anneeRef(emis)}-${String(facSeq++).padStart(4, "0")}`,
        inscriptionId: insc.id, entrepriseId: fin === "ENTREPRISE" || fin === "OPCO" ? pick(entreprises) : null,
        dateEmission: emis, montantHT: ht, tva: 0, montantTTC: ttc,
        statut: paid ? "PAYEE" : chance(0.5) ? "ENVOYEE" : "PARTIELLE",
        datePaiement: paid ? new Date(emis.getTime() + 86400000 * rnd(5, 40)) : null,
        financementType: fin,
      } });
      nbFac++; caTotal += ttc;
      if (paid) await p.paiement.create({ data: { organismeId: OID, montant: ttc, date: new Date(emis.getTime() + 86400000 * rnd(5, 40)), mode: fin === "CPF" ? "CPF" : fin === "OPCO" ? "OPCO" : "VIREMENT" } });
    }

    // Diplôme si certifié + formation diplômante
    if (resultat === "CERTIFIE" && f.diplomante) {
      const st = pick(["ENVOYE_CERTIFICATEUR","RECU","REMIS","REMIS"]);
      const cc = await p.candidat.findUnique({ where: { id: cid }, select: { nom: true, prenom: true, dateNaissance: true, lieuNaissance: true } });
      await p.diplome.create({ data: {
        organismeId: OID, inscriptionId: insc.id, sessionId: sess.id, formationId: f.id,
        nom: cc.nom, prenom: cc.prenom, dateNaissance: cc.dateNaissance, lieuNaissance: cc.lieuNaissance,
        numeroDiplome: st === "ENVOYE_CERTIFICATEUR" ? null : `DIP-${anneeRef(end)}-${rnd(1000,9999)}`,
        statut: st, envoyeCertificateurAt: certifDate,
        recuAt: st !== "ENVOYE_CERTIFICATEUR" ? new Date(certifDate.getTime() + 86400000 * 20) : null,
        remisAt: st === "REMIS" ? new Date(certifDate.getTime() + 86400000 * 30) : null,
        remiseParNom: st === "REMIS" ? "Sophie Marchand" : null,
      } });
      nbDip++;
    }
  }
}

// ── 10) Devis ──
for (let d = 0; d < 16; d++) {
  const emis = dOffset(rnd(-200, 20));
  const ht = rnd(3, 12) * 350;
  await p.devis.create({ data: { organismeId: OID, reference: `DEV-${anneeRef(emis)}-${String(d + 1).padStart(4, "0")}`, entrepriseId: pick(entreprises), clientNom: pick(ENTREPRISES), objet: `Formation ${pick(formations).titre.split("—")[0].trim()} — groupe`, dateEmission: emis, montantHT: ht, tva: 0, montantTTC: ht, statut: pick(["BROUILLON","ENVOYEE","PAYEE","ENVOYEE"]) } });
}

// ── 11) Charges (DepenseCentre) sur 12 mois ──
const CAT = [["LOYER","Loyer du centre",180000],["ELECTRICITE","Électricité",42000],["FORMATEUR","Sous-traitance formateur",250000],["JURY_EXAMEN","Défraiement jury",90000],["FOURNITURE_BUREAU","Fournitures",18000],["DIPLOME","Édition diplômes",22000],["ADS","Publicité en ligne",65000],["CARBURANT","Carburant",30000]];
let chargeTotal = 0;
for (let mo = -11; mo <= 0; mo++) {
  const base = new Date(NOW.getFullYear(), NOW.getMonth() + mo, rnd(3, 26));
  // loyer + électricité mensuels
  await p.depenseCentre.create({ data: { organismeId: OID, date: base, categorie: "LOYER", libelle: "Loyer du centre", montantCents: 180000, statut: "PAYE" } });
  await p.depenseCentre.create({ data: { organismeId: OID, date: new Date(base.getTime() + 86400000 * 2), categorie: "ELECTRICITE", libelle: "Électricité + chauffage", montantCents: rnd(300, 520) * 100, statut: "PAYE" } });
  chargeTotal += 180000;
  // 1-2 charges variables
  for (let k = 0; k < rnd(1, 3); k++) {
    const c = pick(CAT);
    const cents = rnd(Math.round(c[2] * 0.3), c[2]);
    await p.depenseCentre.create({ data: { organismeId: OID, date: new Date(base.getTime() + 86400000 * rnd(1, 20)), categorie: c[0], libelle: c[1], montantCents: cents, statut: chance(0.85) ? "PAYE" : "EN_ATTENTE" } });
    chargeTotal += cents;
  }
}

console.log("\n════════ TENANT DÉMO CRÉÉ ════════");
console.log(`Organisme : Académie Démo Formation (${OID})`);
console.log(`Connexion : demo@academie-demo.fr / Demo2026!  (rôle ADMIN)`);
console.log(`Formations: ${formations.length} · Formateurs: ${formateurs.length} · Jurys: ${jurys.length} · Salles: ${salles.length}`);
console.log(`Entreprises: ${entreprises.length} · Candidats: ${candidats.length}`);
console.log(`Sessions: ${NB_SESSIONS} · Inscriptions: ${nbInsc} · Factures: ${nbFac} · Diplômes: ${nbDip} · Devis: 16`);
console.log(`CA facturé (démo): ${(caTotal).toLocaleString("fr-FR")} € · Charges: ${((chargeTotal + chargesSessions)/100).toLocaleString("fr-FR")} €`);
await p.$disconnect();
