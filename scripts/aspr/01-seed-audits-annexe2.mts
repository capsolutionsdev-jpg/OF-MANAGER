/**
 * CHANTIER 02 — LOT 1 : PRÉ-REMPLISSAGE DES AUDITS (Annexe 2 « à justifier »)
 *
 * Crée, par site ASPR, UN audit par session (périmètre SESSION → la rubrique
 * « Documents de la session » s'affiche dans /audit/[id]), contenant les
 * dossiers cités à l'Annexe 2 du courrier CDC.
 *
 * Rapprochement des dossiers cités :
 *  1) par n° EDOF : Inscription.source « EDOF <n°> — … »
 *  2) repli par NOM + DATE DE NAISSANCE (pour les dossiers créés à la main,
 *     sans étiquette EDOF — ex. la session SSIAP 1 du 21/01→03/02/2026).
 *
 * - Résout les tenants PAR organismeId (2 homonymes).
 * - Idempotent : ne recrée pas un audit au même titre ; @@unique(auditId,inscriptionId).
 * - Signale les n° CDC toujours INTROUVABLES (à traiter à part).
 *
 *   npx tsx scripts/aspr/01-seed-audits-annexe2.mts           → SIMULATION
 *   npx tsx scripts/aspr/01-seed-audits-annexe2.mts --commit  → écriture réelle
 */
import { readFileSync } from "node:fs";
import path from "node:path";

const env: Record<string, string> = {};
try {
  for (const l of readFileSync(path.join(process.cwd(), ".env"), "utf8").split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i);
    if (m) { let v = m[2].trim(); if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1); env[m[1]] = v; }
  }
} catch { /* .env absent */ }
process.env.DATABASE_URL = env.DIRECT_URL || env.DATABASE_URL || process.env.DATABASE_URL;

const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient();
const COMMIT = process.argv.includes("--commit");

type Ident = { nom: string; prenom: string; dn: string | null };
// Identité (nom + date de naissance ISO) des dossiers Annexe 2 Herblay → repli.
const HERBLAY_IDENT: Record<string, Ident> = {
  "381466950431": { nom: "LMOURI", prenom: "Nour Eddine", dn: "1970-12-04" },
  "391405001627": { nom: "SEMEDO VARELA", prenom: "JONI", dn: "1991-11-17" },
  "391453360024": { nom: "DESPRES", prenom: "TOM", dn: "1996-12-09" },
  "391475895619": { nom: "LOPES DA ROCHA", prenom: "KEVIN", dn: "1998-05-12" },
  "391476953615": { nom: "HADRI", prenom: "SABRINA", dn: "1991-06-28" },
  "391481223012": { nom: "AMAMRA", prenom: "MILOUD", dn: "1971-05-13" },
  "391481329439": { nom: "KOTLARSKI", prenom: "LUKA", dn: "1993-05-23" },
  "401444862542": { nom: "BEN MOUSSA", prenom: "BELAID", dn: "1977-04-10" },
  "401468453418": { nom: "BELADASSI", prenom: "ABDELKARIM", dn: "1985-12-31" },
  "421348109412": { nom: "SELLAI", prenom: "Rabie", dn: "1987-02-11" },
  "421424171229": { nom: "KHADDAR", prenom: "Bilal", dn: "2004-04-16" },
  "421444479248": { nom: "LAKHMISTI", prenom: "Bilal", dn: "1997-11-15" },
  "421445994211": { nom: "AHMED YOUSSEF", prenom: "Khaled", dn: "1992-02-03" },
  "421446967216": { nom: "HAZAZETA", prenom: "Laid", dn: "1968-03-13" },
  "421448681211": { nom: "BOUZERZARA", prenom: "AMMAR", dn: "1967-02-05" },
  "421448688828": { nom: "CHELOUCHE", prenom: "ABDELMADJID", dn: "1982-08-21" },
  "421449817830": { nom: "ABDALLAH EL HIRTSI", prenom: "Ramdane", dn: "1967-07-11" },
  "421451021610": { nom: "BOULAHCEN", prenom: "Faissal", dn: "1984-10-31" },
  "421455620011": { nom: "YOBOUE", prenom: "N'da", dn: "1985-02-17" },
  "421457225397": { nom: "NAMOUNE", prenom: "Mohamed", dn: "1984-07-29" },
  "421462216225": { nom: "ABDELKAOUI", prenom: "ABDELHALIM", dn: "1991-04-27" },
  "421464928462": { nom: "BOUKERCHE", prenom: "Mourad", dn: "1989-01-06" },
  "421466109020": { nom: "FARKH", prenom: "Jaouhar", dn: "1990-08-22" },
  "421467040067": { nom: "TOUAZI", prenom: "Yacine", dn: "1987-09-08" },
  "421476062011": { nom: "BELHI", prenom: "Torki", dn: "1975-12-03" },
};

const SITES: { org: string; nom: string; numeros: string[]; identite?: Record<string, Ident> }[] = [
  {
    org: "cmsrj9dyw0000l7041hv7dm86", nom: "ASPR Herblay", identite: HERBLAY_IDENT,
    numeros: Object.keys(HERBLAY_IDENT),
  },
  {
    org: "cmtijd7350000jo0454cobb25", nom: "ASPR Neuilly",
    numeros: ["381465891909","391443522568","391457209912","391457409611","391457642062","391465899621","391467110621","391468030828","391468152416","391475980437","401422385839","401427564222","401440842423","401445987611","401448721611","401464872512","401466112271","401467242416","401469168833","401472053444","401472610417","401472731825","401477049231","421422140424","421430168813","421433941018","421441151824","421443814262","421447760412","421450252646","421453313411","421454180629","421455492825","421455716140","421457166864","421460614819","421465921813","421468363062","421468446305","421469089013","421473669420","421473675237","421476028418","421476734817","421483403026","431425050414","431428708265","431455654879","431455667715","431468262074"],
  },
];

const numFromSource = (src: string | null) => (src || "").match(/^EDOF\s+(\S+)/)?.[1] ?? null;
const dfr = (d: Date) => d.toLocaleDateString("fr-FR");
const DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");
const normNom = (s: string | null) => (s || "").normalize("NFD").replace(DIACRITICS, "").toUpperCase().replace(/\s+/g, " ").trim();
function dobMatches(dbDate: Date | null, iso: string | null): boolean {
  if (!dbDate || !iso) return false;
  const [Y, M, D] = iso.split("-").map(Number);
  const u = dbDate.getUTCFullYear() === Y && dbDate.getUTCMonth() + 1 === M && dbDate.getUTCDate() === D;
  const l = dbDate.getFullYear() === Y && dbDate.getMonth() + 1 === M && dbDate.getDate() === D;
  return u || l;
}

type Insc = {
  id: string; sessionId: string | null; source: string | null;
  candidat: { nom: string; prenom: string; dateNaissance: Date | null };
  session: { reference: string | null; dateDebut: Date; formation: { titre: string } } | null;
};

async function main() {
  console.log(`=== LOT 1 : pré-remplissage audits Annexe 2 ${COMMIT ? "(ÉCRITURE)" : "(SIMULATION)"} ===\n`);
  let totalAudits = 0, totalDossiers = 0;

  for (const site of SITES) {
    const wanted = new Set(site.numeros);
    const insc = (await prisma.inscription.findMany({
      where: { organismeId: site.org },
      select: {
        id: true, sessionId: true, source: true,
        candidat: { select: { nom: true, prenom: true, dateNaissance: true } },
        session: { select: { reference: true, dateDebut: true, formation: { select: { titre: true } } } },
      },
    })) as Insc[];

    // 1) rapprochement par n° EDOF
    const matched = new Map<string, Insc>(); // inscriptionId -> insc
    const foundNums = new Set<string>();
    for (const i of insc) {
      const n = numFromSource(i.source);
      if (n && wanted.has(n)) { matched.set(i.id, i); foundNums.add(n); }
    }

    // 2) repli par NOM + DATE DE NAISSANCE (dossiers non étiquetés EDOF)
    const fallback: string[] = [];
    const stillMissing: string[] = [];
    const ambigu: string[] = [];
    for (const n of site.numeros) {
      if (foundNums.has(n)) continue;
      const id = site.identite?.[n];
      if (!id) { stillMissing.push(n); continue; }
      const hits = insc.filter((i) => i.candidat && normNom(i.candidat.nom) === normNom(id.nom) && dobMatches(i.candidat.dateNaissance, id.dn));
      const fresh = hits.filter((h) => !matched.has(h.id));
      if (fresh.length === 1) { matched.set(fresh[0].id, fresh[0]); foundNums.add(n); fallback.push(`${n} → ${id.nom} ${id.prenom}`); }
      else {
        stillMissing.push(`${n} ${id.nom} ${id.prenom}${hits.length > 1 ? ` (AMBIGU ${hits.length})` : ""}`);
        for (const h of hits) ambigu.push(`      · ${id.nom} ${id.prenom} → insc ${h.id} | session ${h.session?.reference ?? "?"} ${h.session ? dfr(h.session.dateDebut) : ""} | ${h.session?.formation.titre ?? ""} | source: ${h.source ?? "(aucune)"}`);
      }
    }

    // Groupe par session
    const bySession = new Map<string, Insc[]>();
    for (const i of matched.values()) {
      if (!i.sessionId) continue;
      let arr = bySession.get(i.sessionId);
      if (!arr) { arr = []; bySession.set(i.sessionId, arr); }
      arr.push(i);
    }

    console.log(`— ${site.nom} : ${matched.size}/${site.numeros.length} dossiers rattachés · ${bySession.size} session(s)`);
    if (fallback.length) console.log(`   ↪ ${fallback.length} rattaché(s) par nom+DN : ${fallback.join(" ; ")}`);
    if (stillMissing.length) console.log(`   ⚠️ ${stillMissing.length} toujours introuvable(s) : ${stillMissing.join(" ; ")}`);
    if (ambigu.length) console.log(`   🔎 fiches en double / ambiguës (à trancher) :\n${ambigu.join("\n")}`);

    for (const [sessionId, dossiers] of bySession) {
      const s = dossiers[0].session!;
      const ref = s.reference ? ` [${s.reference}]` : "";
      const titre = `Contrôle CDC — Annexe 2 — ${s.formation.titre} — ${dfr(s.dateDebut)}${ref}`.slice(0, 200);
      // Idempotence PAR SESSION (robuste au format du titre) : 1 audit CDC/session.
      const exists = await prisma.auditControle.findFirst({
        where: { organismeId: site.org, sessionId, titre: { startsWith: "Contrôle CDC — Annexe 2" } },
        select: { id: true },
      });
      if (exists) {
        // Synchronise : ajoute les dossiers manquants (idempotent via @@unique).
        if (COMMIT) {
          await prisma.auditControleDossier.createMany({
            data: dossiers.map((d) => ({ organismeId: site.org, auditId: exists.id, inscriptionId: d.id })),
            skipDuplicates: true,
          });
        }
        console.log(`   = déjà présent (sync dossiers) : ${titre} (${dossiers.length})`);
        continue;
      }

      console.log(`   + audit : ${titre} — ${dossiers.length} dossier(s)`);
      totalAudits++; totalDossiers += dossiers.length;
      if (COMMIT) {
        await prisma.auditControle.create({
          data: {
            organismeId: site.org, type: "CONTROLE", perimetre: "SESSION", sessionId,
            titre, responsableNom: "Contrôle CDC",
            dossiers: { create: dossiers.map((d) => ({ organismeId: site.org, inscriptionId: d.id })) },
          },
        });
      }
    }
    console.log("");
  }

  console.log(`${COMMIT ? "✅ Écrit" : "SIMULATION"} — ${totalAudits} audit(s) · ${totalDossiers} dossier(s) rattaché(s)`);
  if (!COMMIT) console.log("→ Relancer avec --commit pour écrire réellement.");
  await prisma.$disconnect();
}
main().catch(async (e) => { console.error("ERREUR", e); await prisma.$disconnect(); process.exit(1); });
