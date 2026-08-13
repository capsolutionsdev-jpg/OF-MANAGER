/**
 * Audit Qualiopi automatique d'un dossier de formation (session).
 *
 * Au lieu d'une checklist cochée à la main, on inspecte les données réelles
 * déjà saisies (fiche formation, formateur, positionnement, émargement,
 * résultats, satisfaction, suivi à 6 mois…) et on en déduit, indicateur par
 * indicateur du Référentiel National Qualité, ce qui est en place et ce qu'il
 * reste à compléter — en tenant compte de l'avancement de la session
 * (un émargement n'est pas « manquant » avant le 1er jour).
 *
 * Fonction pure → testable sans base de données.
 */

export type CheckStatut = "OK" | "PARTIEL" | "MANQUANT" | "NA";

export type CheckResult = {
  key: string;
  label: string;
  indicateur: number | null; // n° d'indicateur RNQ concerné
  statut: CheckStatut;
  detail: string;
};

export type SessionAuditInput = {
  now: Date;
  session: {
    statut: string; // SessionStatut
    dateDebut: Date;
    dateFin: Date;
    formateurCount: number;
    emargementTotal: number; // feuilles d'émargement générées
    emargementSignes: number; // dont signées
    crFormateurCompletedAt: Date | null;
  };
  formation: {
    objectifs: string | null;
    programme: string | null;
    prerequis: string | null;
    publicVise: string | null;
    modalitesEvaluation: string | null;
    dureeHeures: number | null;
    tarif: number | null;
    hasPositionnement: boolean; // des questions de positionnement sont configurées
  };
  inscriptions: Array<{
    positionnementCompletedAt: Date | null;
    convocationSentAt: Date | null;
    resultatCertification: string; // CertificationResultat
    attestationReussiteSentAt: Date | null;
    satisfactionCompletedAt: Date | null;
    suivi6moisCompletedAt: Date | null;
  }>;
  org: { referentHandicap: boolean };
};

export type SessionAudit = {
  checks: CheckResult[];
  score: number; // % de conformité sur les points applicables (0..100)
  nbAComplete: number; // points MANQUANT ou PARTIEL
  statutGlobal: "CONFORME" | "A_COMPLETER" | "ANNULEE";
};

const MS_JOUR = 86_400_000;
const SUIVI_DELAI_JOURS = 180; // enquête à 6 mois

type Phase = "amont" | "encours" | "termine";
function phaseDe(now: Date, s: SessionAuditInput["session"]): Phase {
  if (s.statut === "TERMINEE") return "termine";
  if (+now > +s.dateFin) return "termine";
  if (+now >= +s.dateDebut) return "encours";
  return "amont";
}

/** Couverture d'un critère sur les inscrits : OK si tous, PARTIEL si certains. */
function couverture<T>(applicable: boolean, items: T[], done: (t: T) => boolean): { statut: CheckStatut; detail: string } {
  if (!applicable || items.length === 0) return { statut: "NA", detail: "" };
  const n = items.filter(done).length;
  const detail = `${n}/${items.length}`;
  if (n === items.length) return { statut: "OK", detail };
  if (n === 0) return { statut: "MANQUANT", detail };
  return { statut: "PARTIEL", detail };
}

const bool = (applicable: boolean, ok: boolean): CheckStatut =>
  !applicable ? "NA" : ok ? "OK" : "MANQUANT";

export function auditSession(input: SessionAuditInput): SessionAudit {
  const { now, session: s, formation: f, inscriptions: ins, org } = input;

  if (s.statut === "ANNULEE") {
    return { checks: [], score: 100, nbAComplete: 0, statutGlobal: "ANNULEE" };
  }

  const phase = phaseDe(now, s);
  const demarree = phase !== "amont";
  const terminee = phase === "termine";
  const checks: CheckResult[] = [];

  // ── Ind. 1 — Fiche formation complète (info accessible au public) ──
  const champs: Array<[string, unknown]> = [
    ["objectifs", f.objectifs], ["programme", f.programme], ["prérequis", f.prerequis],
    ["public visé", f.publicVise], ["durée", f.dureeHeures], ["tarif", f.tarif],
    ["modalités d'évaluation", f.modalitesEvaluation],
  ];
  const manquants = champs.filter(([, v]) => v === null || v === undefined || v === "").map(([k]) => k);
  checks.push({
    key: "fiche", label: "Fiche formation complète", indicateur: 1,
    statut: manquants.length === 0 ? "OK" : "MANQUANT",
    detail: manquants.length ? `manque : ${manquants.join(", ")}` : "",
  });

  // ── Ind. 21 — Formateur qualifié affecté ──
  checks.push({
    key: "formateur", label: "Formateur affecté", indicateur: 21,
    statut: bool(true, s.formateurCount > 0),
    detail: s.formateurCount > 0 ? `${s.formateurCount} formateur(s)` : "aucun formateur affecté",
  });

  // ── Ind. 8 — Positionnement à l'entrée (dès le démarrage) ──
  {
    const applicable = f.hasPositionnement && demarree;
    const c = couverture(applicable, ins, (i) => !!i.positionnementCompletedAt);
    checks.push({
      key: "positionnement", label: "Positionnement à l'entrée", indicateur: 8,
      statut: !f.hasPositionnement ? "NA" : c.statut,
      detail: !f.hasPositionnement ? "pas de test configuré" : c.detail,
    });
  }

  // ── Ind. 5 — Convocation / information des stagiaires ──
  {
    const c = couverture(demarree, ins, (i) => !!i.convocationSentAt);
    checks.push({ key: "convocation", label: "Convocation envoyée", indicateur: 5, statut: c.statut, detail: c.detail });
  }

  // ── Ind. 9 — Émargement / assiduité ──
  {
    let statut: CheckStatut = "NA";
    let detail = "";
    if (demarree) {
      if (s.emargementTotal === 0) { statut = "MANQUANT"; detail = "aucune feuille d'émargement"; }
      else if (s.emargementSignes >= s.emargementTotal) { statut = "OK"; detail = `${s.emargementSignes}/${s.emargementTotal} signés`; }
      else if (s.emargementSignes === 0) { statut = "MANQUANT"; detail = `0/${s.emargementTotal} signés`; }
      else { statut = "PARTIEL"; detail = `${s.emargementSignes}/${s.emargementTotal} signés`; }
    }
    checks.push({ key: "emargement", label: "Émargement signé", indicateur: 9, statut, detail });
  }

  // ── Ind. 11 — Évaluation des acquis / résultats ──
  {
    const c = couverture(terminee, ins, (i) => i.resultatCertification !== "NON_EVALUE");
    checks.push({ key: "resultats", label: "Résultats d'évaluation saisis", indicateur: 11, statut: c.statut, detail: c.detail });
  }

  // ── Ind. 11 — Attestation de fin (pour les certifiés) ──
  {
    const certifies = ins.filter((i) => i.resultatCertification === "CERTIFIE");
    const c = couverture(terminee && certifies.length > 0, certifies, (i) => !!i.attestationReussiteSentAt);
    checks.push({ key: "attestation", label: "Attestation de réussite délivrée", indicateur: 11, statut: c.statut, detail: c.detail });
  }

  // ── Ind. 30 — Évaluation de satisfaction (à chaud) ──
  {
    const c = couverture(terminee, ins, (i) => !!i.satisfactionCompletedAt);
    checks.push({ key: "satisfaction", label: "Enquête de satisfaction", indicateur: 30, statut: c.statut, detail: c.detail });
  }

  // ── Ind. 22 — Compte-rendu pédagogique du formateur ──
  checks.push({
    key: "cr_formateur", label: "Compte-rendu formateur", indicateur: 22,
    statut: bool(terminee, !!s.crFormateurCompletedAt),
    detail: s.crFormateurCompletedAt ? "reçu" : terminee ? "non reçu" : "",
  });

  // ── Ind. 11 — Suivi à 6 mois (devenir / insertion) ──
  {
    const applicable = +now >= +s.dateFin + SUIVI_DELAI_JOURS * MS_JOUR;
    const c = couverture(applicable, ins, (i) => !!i.suivi6moisCompletedAt);
    checks.push({ key: "suivi6mois", label: "Suivi à 6 mois", indicateur: 11, statut: c.statut, detail: c.detail });
  }

  // ── Ind. 26 — Référent handicap désigné (niveau organisme) ──
  checks.push({
    key: "referent_handicap", label: "Référent handicap désigné", indicateur: 26,
    statut: bool(true, org.referentHandicap),
    detail: org.referentHandicap ? "" : "à renseigner dans les paramètres",
  });

  const applicables = checks.filter((c) => c.statut !== "NA");
  const nbOk = applicables.filter((c) => c.statut === "OK").length;
  const nbAComplete = checks.filter((c) => c.statut === "MANQUANT" || c.statut === "PARTIEL").length;
  const score = applicables.length === 0 ? 100 : Math.round((nbOk / applicables.length) * 100);

  return {
    checks,
    score,
    nbAComplete,
    statutGlobal: nbAComplete === 0 ? "CONFORME" : "A_COMPLETER",
  };
}
