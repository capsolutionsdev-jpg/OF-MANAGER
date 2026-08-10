/**
 * Règles métier du parcours T3P (examen Taxi / VTC — CMA).
 *
 * Source réglementaire : arrêté du 6 avril 2017 (examen T3P), art. R.3120-6 à
 * R.3120-9 du code des transports, règlement d'examen CMA France :
 *  - prérequis : permis B depuis ≥ 3 ans (2 ans en conduite accompagnée),
 *    casier judiciaire compatible, aptitude médicale (médecin agréé, cerfa 14880),
 *    PSC1 pour la profession de taxi ;
 *  - admissibilité (théorie) : ≥ 10/20 sans note éliminatoire ;
 *  - admission (pratique) : organisée au plus 2 mois après l'admissibilité ;
 *    3 présentations maximum dans un délai d'1 an après l'admissibilité ;
 *  - frais d'examen non remboursables, réévalués chaque 1er janvier.
 *
 * Module PUR (aucune dépendance serveur) : utilisable côté client et serveur.
 */

// ── Constantes (montants CMA, année 2026 — modifiables à la saisie) ──
export const T3P_FRAIS_EXAMEN = 241; // € — épreuves complètes (admissibilité + admission)
export const T3P_FRAIS_MOBILITE = 168; // € — passerelle Taxi↔VTC (mobilité)
export const T3P_MAX_TENTATIVES_PRATIQUE = 3; // présentations max à l'admission
export const T3P_DELAI_PRATIQUE_MOIS = 12; // délai (mois) après l'admissibilité
export const T3P_FENETRE_ADMISSION_MOIS = 2; // la CMA organise l'admission sous 2 mois

export type T3PMetier = "TAXI" | "VTC";

export const T3P_METIER_LABELS: Record<T3PMetier, string> = {
  TAXI: "Taxi",
  VTC: "VTC",
};

export const T3P_STATUT_LABELS: Record<string, string> = {
  EN_COURS: "En cours",
  REUSSI: "Réussi",
  ABANDONNE: "Abandonné",
};

export const T3P_RESULTAT_LABELS: Record<string, string> = {
  EN_ATTENTE: "En attente",
  ADMIS: "Admis",
  AJOURNE: "Ajourné",
  ABSENT: "Absent",
};

export type FormationLike = { reference?: string | null; titre?: string | null };

/**
 * Métier T3P d'une formation de préparation (TAXI, VTC) — null si la formation
 * n'est pas T3P ou si elle mentionne les deux métiers (passerelle : le parcours
 * est alors créé manuellement avec l'option « mobilité »).
 */
export function t3pMetierOfFormation(f: FormationLike): T3PMetier | null {
  const s = `${f.reference ?? ""} ${f.titre ?? ""}`.toUpperCase();
  const isVtc = /\bVTC\b/.test(s);
  const isTaxi = /\bTAXI\b/.test(s);
  if (isVtc === isTaxi) return null;
  return isVtc ? "VTC" : "TAXI";
}

/** Date à laquelle l'ancienneté de permis B requise est atteinte (3 ans, 2 en CA). */
export function permisEligibleLe(permisBDate: Date, conduiteAccompagnee: boolean): Date {
  const d = new Date(permisBDate);
  d.setFullYear(d.getFullYear() + (conduiteAccompagnee ? 2 : 3));
  return d;
}

/** Date limite pour réussir l'admission (1 an après la publication de l'admissibilité). */
export function limitePratiqueLe(admissibiliteLe: Date): Date {
  const d = new Date(admissibiliteLe);
  d.setMonth(d.getMonth() + T3P_DELAI_PRATIQUE_MOIS);
  return d;
}

/**
 * Types STRUCTURELS (sous-ensemble des modèles Prisma) : acceptent aussi bien
 * l'objet Prisma qu'un DTO sérialisé pour le client (sans Decimal).
 */
export type T3PEpreuveLike = {
  id: string;
  type: "THEORIE" | "PRATIQUE";
  tentative: number;
  convocationRecueLe: Date | null;
  date: Date | null;
  resultat: "EN_ATTENTE" | "ADMIS" | "AJOURNE" | "ABSENT";
  resultatLe: Date | null;
  note: string | null;
  commentaire: string | null;
};

export type ParcoursT3PComplet = {
  id: string;
  metier: T3PMetier;
  statut: "EN_COURS" | "REUSSI" | "ABANDONNE";
  mobilite: boolean;
  permisBDate: Date | null;
  conduiteAccompagnee: boolean;
  permisVerifieLe: Date | null;
  casierVerifieLe: Date | null;
  psc1VerifieLe: Date | null;
  medicalDate: Date | null;
  medicalVerifieLe: Date | null;
  dossierCompletLe: Date | null;
  cmaDepartement: string | null;
  cmaNumeroDossier: string | null;
  cmaInscritLe: Date | null;
  fraisPayesLe: Date | null;
  fraisAvancesParOF: boolean;
  formationTheoriqueFaiteLe: Date | null;
  formationPratiqueFaiteLe: Date | null;
  admissibiliteLe: Date | null;
  carteProDemandeeLe: Date | null;
  carteProObtenueLe: Date | null;
  carteProNumero: string | null;
  commentaire: string | null;
  epreuves: T3PEpreuveLike[];
  /** Visas manuels des étapes par les collaborateurs (JSON brut Prisma ; parsé
   * par parcoursEtapes via parseEtapesValidation). */
  etapesValidation?: unknown;
};

/** Visa manuel d'une étape par un collaborateur (traçabilité Qualiopi). */
export type EtapeValidation = {
  nom: string; // nom du collaborateur ayant validé
  userId?: string;
  date: string; // ISO
  comment?: string;
};

export type EtapeValidationMap = Record<string, EtapeValidation>;

/** Parse le champ JSON `etapesValidation` (issu de Prisma) en map typée. */
export function parseEtapesValidation(json: unknown): EtapeValidationMap {
  if (!json || typeof json !== "object") return {};
  const out: EtapeValidationMap = {};
  for (const [k, v] of Object.entries(json as Record<string, unknown>)) {
    if (v && typeof v === "object" && typeof (v as { date?: unknown }).date === "string") {
      const rec = v as Record<string, unknown>;
      out[k] = {
        nom: typeof rec.nom === "string" ? rec.nom : "—",
        userId: typeof rec.userId === "string" ? rec.userId : undefined,
        date: rec.date as string,
        comment: typeof rec.comment === "string" ? rec.comment : undefined,
      };
    }
  }
  return out;
}

/** Épreuves d'un type, triées par n° de tentative croissant. */
export function epreuvesDuType(p: ParcoursT3PComplet, type: "THEORIE" | "PRATIQUE"): T3PEpreuveLike[] {
  return p.epreuves.filter((e) => e.type === type).sort((a, b) => a.tentative - b.tentative);
}

/** Dernière tentative (n° max) d'un type d'épreuve, s'il y en a. */
export function derniereEpreuve(p: ParcoursT3PComplet, type: "THEORIE" | "PRATIQUE"): T3PEpreuveLike | null {
  const list = epreuvesDuType(p, type);
  return list.length > 0 ? list[list.length - 1] : null;
}

/** La théorie (admissibilité) est-elle acquise ? */
export function theorieAdmise(p: ParcoursT3PComplet): boolean {
  return p.epreuves.some((e) => e.type === "THEORIE" && e.resultat === "ADMIS");
}

/** La pratique (admission) est-elle acquise ? */
export function pratiqueAdmise(p: ParcoursT3PComplet): boolean {
  return p.epreuves.some((e) => e.type === "PRATIQUE" && e.resultat === "ADMIS");
}

/** Présentations à l'admission déjà consommées (résultat AJOURNÉ ou ABSENT). */
export function tentativesPratiqueConsommees(p: ParcoursT3PComplet): number {
  return p.epreuves.filter(
    (e) => e.type === "PRATIQUE" && (e.resultat === "AJOURNE" || e.resultat === "ABSENT"),
  ).length;
}

// ── Moteur d'étapes : les 11 étapes du parcours, avec statut + alertes ──

export type T3PAlerte = { niveau: "info" | "warn" | "danger"; message: string };

export type T3PEtape = {
  num: number;
  key: string;
  label: string;
  /** Précision affichée sous le libellé (règle applicable, contexte). */
  detail?: string;
  statut: "fait" | "en_cours" | "a_faire";
  faitLe?: Date | null;
  alerte?: T3PAlerte;
  /** Visa manuel du collaborateur pour cette étape (sinon non validée). */
  validation?: EtapeValidation;
};

const fmtDate = (d: Date) => d.toLocaleDateString("fr-FR");

/**
 * Calcule les 11 étapes du parcours avec leur statut et les alertes
 * réglementaires (ancienneté permis, délai d'1 an, 3 présentations max).
 */
export function parcoursEtapes(p: ParcoursT3PComplet, now: Date = new Date()): T3PEtape[] {
  const etapes: T3PEtape[] = [];
  const taxi = p.metier === "TAXI";

  // 1 — Prérequis & dossier administratif
  {
    const checks = [p.permisVerifieLe, p.casierVerifieLe, p.medicalVerifieLe, taxi ? p.psc1VerifieLe : undefined].filter(
      (c) => c !== undefined,
    );
    const done = !!p.dossierCompletLe;
    let alerte: T3PAlerte | undefined;
    if (p.permisBDate) {
      const eligible = permisEligibleLe(p.permisBDate, p.conduiteAccompagnee);
      if (eligible > now) {
        alerte = {
          niveau: "danger",
          message: `Ancienneté de permis insuffisante : éligible le ${fmtDate(eligible)} (${p.conduiteAccompagnee ? "2 ans — conduite accompagnée" : "3 ans"}).`,
        };
      }
    }
    etapes.push({
      num: 1,
      key: "prerequis",
      label: "Prérequis & dossier administratif",
      detail: `Permis B ≥ 3 ans (2 en CA)${taxi ? ", PSC1" : ""}, casier compatible, avis médical (cerfa 14880), expression du besoin, financement`,
      statut: done ? "fait" : checks.some(Boolean) ? "en_cours" : "a_faire",
      faitLe: p.dossierCompletLe,
      alerte,
    });
  }

  // 2 — Inscription à l'examen (CMA)
  etapes.push({
    num: 2,
    key: "cma",
    label: "Inscription à l'examen (CMA)",
    detail: "Dossier en ligne sur le site de la CMA régionale — clôture ~3 semaines avant l'épreuve",
    statut: p.cmaInscritLe ? "fait" : "a_faire",
    faitLe: p.cmaInscritLe,
  });

  // 3 — Paiement des frais d'examen
  etapes.push({
    num: 3,
    key: "frais",
    label: "Paiement des frais d'examen",
    detail: `${p.mobilite ? T3P_FRAIS_MOBILITE : T3P_FRAIS_EXAMEN} € (2026) — non remboursables, réévalués chaque 1er janvier`,
    statut: p.fraisPayesLe ? "fait" : "a_faire",
    faitLe: p.fraisPayesLe,
  });

  // Épreuves théoriques (dernière tentative en cours)
  const th = derniereEpreuve(p, "THEORIE");
  const thAdmis = theorieAdmise(p);

  // 4 — Convocation à l'examen théorique
  etapes.push({
    num: 4,
    key: "convoc-theorie",
    label: "Convocation à l'examen théorique",
    detail: "Reçue de la CMA (espace en ligne) — à archiver dans les pièces du candidat",
    statut: th?.convocationRecueLe || thAdmis ? "fait" : "a_faire",
    faitLe: th?.convocationRecueLe ?? null,
  });

  // 5 — Formation théorique
  etapes.push({
    num: 5,
    key: "formation-theorie",
    label: "Formation théorique",
    detail: "Préparation aux épreuves d'admissibilité (assiduité tracée par les émargements de session)",
    statut: p.formationTheoriqueFaiteLe ? "fait" : "a_faire",
    faitLe: p.formationTheoriqueFaiteLe,
  });

  // 6 — Résultat de l'examen théorique
  {
    let alerte: T3PAlerte | undefined;
    if (th && th.resultat === "AJOURNE") {
      alerte = { niveau: "warn", message: "Ajourné : nouvelle inscription CMA et frais à régler de nouveau." };
    } else if (th && th.resultat === "ABSENT") {
      alerte = { niveau: "warn", message: "Absent : frais perdus (sauf force majeure), réinscription nécessaire." };
    }
    etapes.push({
      num: 6,
      key: "resultat-theorie",
      label: "Résultat de l'examen théorique (admissibilité)",
      detail: "Admissible si moyenne ≥ 10/20 sans note éliminatoire",
      statut: thAdmis ? "fait" : th && th.resultat !== "EN_ATTENTE" ? "en_cours" : "a_faire",
      faitLe: thAdmis ? (p.admissibiliteLe ?? th?.resultatLe ?? null) : null,
      alerte,
    });
  }

  // Fenêtre réglementaire de l'admission
  const pr = derniereEpreuve(p, "PRATIQUE");
  const prAdmis = pratiqueAdmise(p);
  const tentatives = tentativesPratiqueConsommees(p);
  let alertePratique: T3PAlerte | undefined;
  if (p.admissibiliteLe && !prAdmis && p.statut === "EN_COURS") {
    const limite = limitePratiqueLe(p.admissibiliteLe);
    const joursRestants = Math.ceil((limite.getTime() - now.getTime()) / 86400000);
    if (tentatives >= T3P_MAX_TENTATIVES_PRATIQUE) {
      alertePratique = {
        niveau: "danger",
        message: "3 présentations à l'admission épuisées : l'examen complet doit être repassé.",
      };
    } else if (joursRestants < 0) {
      alertePratique = {
        niveau: "danger",
        message: `Délai d'un an dépassé depuis l'admissibilité (${fmtDate(limite)}) : le bénéfice de l'admissibilité est perdu.`,
      };
    } else if (joursRestants <= 90) {
      alertePratique = {
        niveau: "warn",
        message: `Plus que ${joursRestants} j pour réussir l'admission (limite : ${fmtDate(limite)}) — ${tentatives}/${T3P_MAX_TENTATIVES_PRATIQUE} présentation(s) consommée(s).`,
      };
    } else {
      alertePratique = {
        niveau: "info",
        message: `Admission à réussir avant le ${fmtDate(limite)} (3 présentations max) — la CMA convoque sous ${T3P_FENETRE_ADMISSION_MOIS} mois.`,
      };
    }
  }

  // 7 — Convocation à l'examen pratique (si admissible)
  etapes.push({
    num: 7,
    key: "convoc-pratique",
    label: "Convocation à l'examen pratique",
    detail: "Réservée aux candidats admissibles — organisée par la CMA dans les 2 mois",
    statut: pr?.convocationRecueLe || prAdmis ? "fait" : thAdmis ? "en_cours" : "a_faire",
    faitLe: pr?.convocationRecueLe ?? null,
    alerte: alertePratique,
  });

  // 8 — Formation pratique
  etapes.push({
    num: 8,
    key: "formation-pratique",
    label: "Formation pratique",
    detail: "Préparation à la mise en situation (conduite, relation client, facturation)",
    statut: p.formationPratiqueFaiteLe ? "fait" : "a_faire",
    faitLe: p.formationPratiqueFaiteLe,
  });

  // 9 — Examen pratique
  etapes.push({
    num: 9,
    key: "examen-pratique",
    label: "Examen pratique (admission)",
    detail: `Mise en situation d'une course ${taxi ? "taxi" : "VTC"} — ${tentatives} présentation(s) consommée(s) sur ${T3P_MAX_TENTATIVES_PRATIQUE}`,
    statut: prAdmis || (pr?.date && pr.date <= now) ? "fait" : pr?.date ? "en_cours" : "a_faire",
    faitLe: pr?.date && pr.date <= now ? pr.date : null,
  });

  // 10 — Résultat de l'examen pratique
  {
    let alerte: T3PAlerte | undefined;
    if (!prAdmis && pr && (pr.resultat === "AJOURNE" || pr.resultat === "ABSENT") && tentatives < T3P_MAX_TENTATIVES_PRATIQUE) {
      alerte = {
        niveau: "warn",
        message: `${T3P_RESULTAT_LABELS[pr.resultat]} — nouvelle présentation possible (${tentatives}/${T3P_MAX_TENTATIVES_PRATIQUE} consommées).`,
      };
    }
    etapes.push({
      num: 10,
      key: "resultat-pratique",
      label: "Résultat de l'examen pratique",
      detail: "Admis → le parcours passe en « Réussi » et alimente le taux de réussite (Qualiopi ind. 2)",
      statut: prAdmis ? "fait" : pr && pr.resultat !== "EN_ATTENTE" ? "en_cours" : "a_faire",
      faitLe: prAdmis ? (pr?.resultatLe ?? null) : null,
      alerte,
    });
  }

  // 11 — Carte professionnelle (préfecture)
  etapes.push({
    num: 11,
    key: "carte-pro",
    label: "Carte professionnelle (préfecture)",
    detail: "Demande sur Démarches Simplifiées après la réussite — délivrée par la préfecture",
    statut: p.carteProObtenueLe ? "fait" : p.carteProDemandeeLe ? "en_cours" : "a_faire",
    faitLe: p.carteProObtenueLe,
  });

  // Visas manuels des collaborateurs (indépendants du statut calculé).
  const visas = parseEtapesValidation(p.etapesValidation);
  for (const e of etapes) {
    if (visas[e.key]) e.validation = visas[e.key];
  }

  return etapes;
}

/** Nombre d'étapes explicitement validées par un collaborateur / total. */
export function etapesValidees(etapes: T3PEtape[]): { validees: number; total: number } {
  return { validees: etapes.filter((e) => e.validation).length, total: etapes.length };
}

/** Étape courante = première étape non « faite » (ou la 11ᵉ si tout est fait). */
export function etapeCourante(etapes: T3PEtape[]): T3PEtape {
  return etapes.find((e) => e.statut !== "fait") ?? etapes[etapes.length - 1];
}

/** Alerte la plus grave du parcours (danger > warn > info), s'il y en a une. */
export function alertePrincipale(etapes: T3PEtape[]): T3PAlerte | null {
  const poids = { danger: 3, warn: 2, info: 1 } as const;
  let max: T3PAlerte | null = null;
  for (const e of etapes) {
    if (e.alerte && (!max || poids[e.alerte.niveau] > poids[max.niveau])) max = e.alerte;
  }
  return max;
}

/** Progression : nombre d'étapes faites / total. */
export function progression(etapes: T3PEtape[]): { faites: number; total: number } {
  return { faites: etapes.filter((e) => e.statut === "fait").length, total: etapes.length };
}
