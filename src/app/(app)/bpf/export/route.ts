import { auth } from "@/auth";
import { getTenantDb } from "@/lib/tenant";
import { exportResponse, buildSheet } from "@/lib/export";
import { FINANCEMENT_LABELS } from "@/lib/validators/candidat";
import {
  SITUATION_LABELS,
  EMPLOI_KEYS,
  type Suivi6MoisReponses,
} from "@/lib/suivi6mois";

export const runtime = "nodejs";

// BPF = déclaration officielle : réservé au personnel habilité (cf. section bpf).
const STAFF = ["ADMIN", "RESPONSABLE_FORMATION"];

const hoursOf = (h: number | null | undefined) => h ?? 0;
const finLabel = (k: string) =>
  k === "NON_PRECISE"
    ? "Non précisé"
    : FINANCEMENT_LABELS[k as keyof typeof FINANCEMENT_LABELS] ?? k;

// Export du Bilan Pédagogique & Financier de l'année (CSV / Excel / PDF).
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || !STAFF.includes(session.user.role as string)) {
    return new Response("Non autorisé", { status: 401 });
  }

  const url = new URL(req.url);
  const nowYear = new Date().getFullYear();
  const annee = url.searchParams.get("annee")
    ? parseInt(url.searchParams.get("annee")!, 10)
    : nowYear;

  const db = await getTenantDb();
  const debut = new Date(annee, 0, 1);
  const fin = new Date(annee + 1, 0, 1);

  const sessions = await db.session.findMany({
    where: {
      statut: { not: "ANNULEE" },
      dateDebut: { gte: debut, lt: fin },
    },
    include: {
      formation: { select: { titre: true, reference: true, dureeHeures: true } },
      formateurs: { select: { id: true, nom: true, prenom: true } },
      inscriptions: {
        where: { statut: { not: "ANNULEE" } },
        select: {
          financementType: true,
          montant: true,
          resultatCertification: true,
          suivi6moisJson: true,
          suivi6moisCompletedAt: true,
        },
      },
    },
    orderBy: { dateDebut: "asc" },
  });

  // ── Agrégations (identiques à la page /bpf) ──
  const parFormation = new Map<
    string,
    {
      titre: string;
      reference: string;
      nbSessions: number;
      heures: number;
      stagiaires: number;
      heuresStagiaires: number;
    }
  >();
  const parFormateur = new Map<
    string,
    { nom: string; nbSessions: number; heures: number }
  >();
  const parFinancement = new Map<string, { nb: number; montant: number }>();
  const cert = { CERTIFIE: 0, AJOURNE: 0, ABANDON: 0, NON_EVALUE: 0 };
  const suivi = {
    repondants: 0,
    enEmploi: 0,
    enLien: 0,
    parSituation: new Map<string, number>(),
  };

  let totalHeures = 0;
  let totalStagiaires = 0;
  let totalHeuresStagiaires = 0;

  for (const s of sessions) {
    const h = hoursOf(s.formation.dureeHeures);
    const nbStag = s.inscriptions.length;

    const key = s.formation.reference;
    const fs = parFormation.get(key) ?? {
      titre: s.formation.titre,
      reference: s.formation.reference,
      nbSessions: 0,
      heures: 0,
      stagiaires: 0,
      heuresStagiaires: 0,
    };
    fs.nbSessions += 1;
    fs.heures += h;
    fs.stagiaires += nbStag;
    fs.heuresStagiaires += h * nbStag;
    parFormation.set(key, fs);

    for (const f of s.formateurs) {
      const cur = parFormateur.get(f.id) ?? {
        nom: `${f.prenom} ${f.nom}`,
        nbSessions: 0,
        heures: 0,
      };
      cur.nbSessions += 1;
      cur.heures += h;
      parFormateur.set(f.id, cur);
    }

    for (const i of s.inscriptions) {
      const fk = i.financementType ?? "NON_PRECISE";
      const cur = parFinancement.get(fk) ?? { nb: 0, montant: 0 };
      cur.nb += 1;
      cur.montant += i.montant ? Number(i.montant) : 0;
      parFinancement.set(fk, cur);

      cert[i.resultatCertification] += 1;

      if (i.suivi6moisCompletedAt && i.suivi6moisJson) {
        const r = i.suivi6moisJson as Suivi6MoisReponses;
        suivi.repondants += 1;
        suivi.parSituation.set(
          r.situation,
          (suivi.parSituation.get(r.situation) ?? 0) + 1,
        );
        if (EMPLOI_KEYS.has(r.situation)) suivi.enEmploi += 1;
        if (r.lienFormation === "oui" || r.lienFormation === "partiel")
          suivi.enLien += 1;
      }
    }

    totalHeures += h;
    totalStagiaires += nbStag;
    totalHeuresStagiaires += h * nbStag;
  }

  const formations = [...parFormation.values()].sort((a, b) =>
    a.titre.localeCompare(b.titre),
  );
  const formateurs = [...parFormateur.values()].sort(
    (a, b) => b.heures - a.heures,
  );
  const financements = [...parFinancement.entries()].sort(
    (a, b) => b[1].nb - a[1].nb,
  );

  const certEvalues = cert.CERTIFIE + cert.AJOURNE + cert.ABANDON;
  const tauxReussite =
    certEvalues > 0 ? Math.round((cert.CERTIFIE / certEvalues) * 100) : null;
  const tauxEmploi =
    suivi.repondants > 0
      ? Math.round((suivi.enEmploi / suivi.repondants) * 100)
      : null;

  // Feuille 1 (= CSV) : sessions par formation, avec ligne de total.
  const formationRows = [
    ...formations,
    {
      titre: "TOTAL",
      reference: "",
      nbSessions: sessions.length,
      heures: totalHeures,
      stagiaires: totalStagiaires,
      heuresStagiaires: totalHeuresStagiaires,
    },
  ];
  const sheetFormations = buildSheet("Par formation", formationRows, [
    { header: "Formation", value: (r) => r.titre },
    { header: "Référence", value: (r) => r.reference },
    { header: "Sessions", value: (r) => r.nbSessions },
    { header: "Heures", value: (r) => r.heures },
    { header: "Stagiaires", value: (r) => r.stagiaires },
    { header: "Heures-stagiaires", value: (r) => r.heuresStagiaires },
  ]);

  const sheetCert = buildSheet(
    "Certification",
    [
      { r: "Certifiés", n: cert.CERTIFIE },
      { r: "Ajournés", n: cert.AJOURNE },
      { r: "Abandons", n: cert.ABANDON },
      { r: "Non évalués", n: cert.NON_EVALUE },
      { r: "Taux de réussite (%)", n: tauxReussite ?? "" },
    ],
    [
      { header: "Résultat", value: (x) => x.r },
      { header: "Valeur", value: (x) => x.n },
    ],
  );

  const suiviRows = [
    { s: "Répondants", n: suivi.repondants as number | string },
    { s: "En emploi", n: suivi.enEmploi },
    { s: "Taux d'emploi (%)", n: tauxEmploi ?? "" },
    ...[...suivi.parSituation.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([k, n]) => ({ s: SITUATION_LABELS[k] ?? k, n: n as number | string })),
  ];
  const sheetInsertion = buildSheet("Insertion 6 mois", suiviRows, [
    { header: "Situation à 6 mois", value: (x) => x.s },
    { header: "Bénéficiaires", value: (x) => x.n },
  ]);

  const sheetFormateurs = buildSheet("Formateurs", formateurs, [
    { header: "Formateur", value: (r) => r.nom },
    { header: "Sessions", value: (r) => r.nbSessions },
    { header: "Heures", value: (r) => r.heures },
  ]);

  const sheetFinancements = buildSheet("Financements", financements, [
    { header: "Mode", value: ([k]) => finLabel(k) },
    { header: "Stagiaires", value: ([, v]) => v.nb },
    { header: "Montant (€)", value: ([, v]) => (v.montant > 0 ? v.montant : "") },
  ]);

  return exportResponse({
    req,
    basename: `bpf-${annee}`,
    title: `Bilan Pédagogique & Financier ${annee}`,
    sheets: [
      sheetFormations,
      sheetCert,
      sheetInsertion,
      sheetFormateurs,
      sheetFinancements,
    ],
  });
}
