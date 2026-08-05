import { esc, fdateLong } from "./util";

/**
 * Catalogue des types de titres délivrés par CAP Compétences.
 * Chaque type est une entrée de configuration — ajouter un 14ᵉ type ne demande
 * qu'une entrée ici, pas de réécriture du moteur de rendu ni de la numérotation.
 */

export type TitreKind = "diplome" | "attestation";

export type TitreTypeCode =
  | "SSIAP1_DIPLOME" | "SSIAP2_DIPLOME" | "SSIAP3_DIPLOME"
  | "SSIAP1_RECYCLAGE" | "SSIAP2_RECYCLAGE" | "SSIAP3_RECYCLAGE"
  | "SSIAP1_RAN" | "SSIAP2_RAN" | "SSIAP3_RAN"
  | "HABIL_H0B0" | "HABIL_BSBE"
  | "FC_VTC" | "FC_TAXI";

/** Données titulaire + acte, transmises au corps de chaque type. */
export type TitreData = {
  nom: string;
  prenom: string;
  dateNaissance?: Date | string | null;
  lieuNaissance?: string | null;
  numero: string;
  dateDelivrance?: Date | string | null;   // « Fait à … le … »
  ville?: string;                           // ville de délivrance (défaut : org.ville)
  // Spécifiques :
  dateJury?: Date | string | null;          // diplôme
  president?: { nom?: string; grade?: string } | null; // jury
  diplomeRef?: string | null;               // recyclage / RAN : n° du diplôme initial
  diplomeObtenuLe?: Date | string | null;
  dateDebut?: Date | string | null;         // période de formation
  dateFin?: Date | string | null;
};

/** Identité minimale de l'organisme utilisée par les corps de texte. */
export type OrgLike = { name: string; ville: string };

export type TitreTypeDef = {
  code: TitreTypeCode;
  kind: TitreKind;
  niveau?: 1 | 2 | 3;
  label: string;            // libellé public (menus, registre)
  overline: string;         // sur-titre du document
  title: string;            // titre principal
  badge?: string;           // pastille de niveau
  refLabel: string;         // libellé du n° affiché
  photo?: boolean;          // emplacement photo d'identité (diplômes)
  showVerif?: boolean;      // bloc de vérification anti-fraude (QR + phrase)
  sigRole: string;          // rôle du signataire
  showJury?: boolean;       // seconde signature (président du jury)
  sealCenter: string;       // texte central du sceau
  sealSub: string;          // sous-texte du sceau
  footer: string;           // mentions légales de pied de page
  numberPrefix?: string;    // préfixe du n° (attestations)
  appliqueLuhn: boolean;    // clé de contrôle (false pour diplômes SSIAP)
  body: (d: TitreData, org: OrgLike) => string;
};

/* ------------------------------------------------------------------ */
/* Constantes réutilisées                                              */
/* ------------------------------------------------------------------ */

const SSIAP_TITLE: Record<1 | 2 | 3, string> = {
  1: "Agent des Services de Sécurité Incendie et d'Assistance à Personnes",
  2: "Chef d'Équipe des Services de Sécurité Incendie et d'Assistance à Personnes",
  3: "Chef de Service de Sécurité Incendie et d'Assistance à Personnes",
};

const FOOT_SSIAP =
  "Délivré conformément à l'arrêté du 2 mai 2005 modifié relatif aux missions, à l'emploi et à la qualification du personnel permanent des services de sécurité incendie des ERP et des IGH.";
const FOOT_ELEC =
  "Formation à la prévention du risque électrique — norme NF C 18-510 · articles R.4544-9 et suivants du Code du travail. L'habilitation est délivrée par l'employeur.";
// « [AGREMENT] » est remplacé au rendu par l'agrément de l'organisme pour la
// famille concernée (cf. lib/agrements) ; la mention disparaît s'il est absent.
const FOOT_T3P =
  "Action de formation professionnelle continue (art. L.6313-1 du Code du travail).[AGREMENT]";

/** Bloc identité titulaire commun (nom + date/lieu de naissance). */
function titulaire(d: TitreData, bornSize = 11): string {
  const born = d.dateNaissance
    ? `<p class="born" style="font-size:${bornSize}pt">né(e) le <b>${fdateLong(d.dateNaissance)}</b>${
        d.lieuNaissance ? ` à <b>${esc(d.lieuNaissance)}</b>` : ""
      }</p>`
    : "";
  return `<div class="name">${esc(d.nom.toUpperCase())} ${esc(capitalize(d.prenom))}</div>${born}`;
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/** Élision « de » → « d' » devant une voyelle (Agent → d'Agent). */
function elide(s: string): string {
  return /^[aàâäeéèêëiîïoôöuùûüyAÀÂÄEÉÈÊËIÎÏOÔÖUÙÛÜY]/.test(s) ? `d'${s}` : `de ${s}`;
}

/* ------------------------------------------------------------------ */
/* Construction des 13 définitions                                     */
/* ------------------------------------------------------------------ */

const defs: TitreTypeDef[] = [];

// --- Diplômes SSIAP 1/2/3 ---
for (const n of [1, 2, 3] as const) {
  defs.push({
    code: `SSIAP${n}_DIPLOME` as TitreTypeCode,
    kind: "diplome",
    niveau: n,
    label: `Diplôme SSIAP ${n}`,
    overline: "Diplôme",
    title: SSIAP_TITLE[n],
    badge: `S.S.I.A.P. ${n}`,
    refLabel: "Référence",
    photo: true,
    showJury: true,
    sigRole: "Le Directeur de Formation",
    sealCenter: "SSIAP",
    sealSub: "ARRÊTÉ 02·05·2005",
    footer: FOOT_SSIAP,
    appliqueLuhn: false,
    body: (d) => `
      <p class="lead">Vu le procès-verbal du jury d'examen en date du <b>${fdateLong(d.dateJury)}</b>, déclarant que&nbsp;:</p>
      ${titulaire(d)}
      <p style="margin-top:2mm">a subi avec succès les épreuves exigées pour l'obtention du</p>
      <p class="strong" style="font-size:12.4pt">Diplôme ${elide(SSIAP_TITLE[n])}</p>
      <p class="arrete">telles que définies dans l'arrêté du 02 mai 2005 modifié.</p>`,
  });
}

// --- Recyclage SSIAP 1/2/3 ---
for (const n of [1, 2, 3] as const) {
  defs.push({
    code: `SSIAP${n}_RECYCLAGE` as TitreTypeCode,
    kind: "attestation",
    niveau: n,
    label: `Attestation de recyclage SSIAP ${n}`,
    overline: "Attestation de Recyclage",
    title: `Recyclage du Diplôme ${elide(SSIAP_TITLE[n])}`,
    badge: `S.S.I.A.P. ${n}`,
    refLabel: "N° de vérification",
    showVerif: true,
    sigRole: "Le Directeur d'établissement",
    sealCenter: "SSIAP",
    sealSub: "ARRÊTÉ 02·05·2005",
    footer: FOOT_SSIAP,
    numberPrefix: `RECYC-SSIAP${n}`,
    appliqueLuhn: true,
    body: (d) => `
      <p>Vu le diplôme SSIAP&nbsp;${n} n°&nbsp;<b>${esc(d.diplomeRef) || "……………………"}</b>${
        d.diplomeObtenuLe ? `, obtenu le <b>${fdateLong(d.diplomeObtenuLe)}</b>` : ""
      },</p>
      ${titulaire(d)}
      <p style="margin-top:2mm">a suivi et validé${
        d.dateDebut && d.dateFin ? `, du <b>${fdateLong(d.dateDebut)}</b> au <b>${fdateLong(d.dateFin)}</b>,` : ""
      } le recyclage de son diplôme,</p>
      <p class="arrete">conformément à l'arrêté du 02 mai 2005 modifié, relatif aux missions, à l'emploi et à la qualification du personnel permanent des services de sécurité incendie des ERP et des IGH.</p>`,
  });
}

// --- Remise à niveau SSIAP 1/2/3 ---
for (const n of [1, 2, 3] as const) {
  defs.push({
    code: `SSIAP${n}_RAN` as TitreTypeCode,
    kind: "attestation",
    niveau: n,
    label: `Remise à niveau SSIAP ${n}`,
    overline: "Attestation de Remise à Niveau",
    title: `Remise à Niveau du Diplôme ${elide(SSIAP_TITLE[n])}`,
    badge: `S.S.I.A.P. ${n}`,
    refLabel: "N° de vérification",
    showVerif: true,
    sigRole: "Le Directeur d'établissement",
    sealCenter: "SSIAP",
    sealSub: "ARRÊTÉ 02·05·2005",
    footer: FOOT_SSIAP,
    numberPrefix: `RAN-SSIAP${n}`,
    appliqueLuhn: true,
    body: (d) => `
      <p>Vu le diplôme SSIAP&nbsp;${n} n°&nbsp;<b>${esc(d.diplomeRef) || "……………………"}</b>${
        d.diplomeObtenuLe ? `, obtenu le <b>${fdateLong(d.diplomeObtenuLe)}</b>` : ""
      },</p>
      ${titulaire(d)}
      <p style="margin-top:2mm">a suivi et validé${
        d.dateDebut && d.dateFin ? `, du <b>${fdateLong(d.dateDebut)}</b> au <b>${fdateLong(d.dateFin)}</b>,` : ""
      } la remise à niveau de son diplôme (interruption d'activité au-delà du délai réglementaire),</p>
      <p class="arrete">conformément à l'arrêté du 02 mai 2005 modifié, relatif aux missions, à l'emploi et à la qualification du personnel permanent des services de sécurité incendie des ERP et des IGH.</p>`,
  });
}

// --- Formation continue VTC ---
defs.push({
  code: "FC_VTC",
  kind: "attestation",
  label: "Formation continue VTC",
  overline: "Attestation de Formation",
  title: "Formation Continue V.T.C.",
  badge: "V.T.C.",
  refLabel: "N° de vérification",
  showVerif: true,
  sigRole: "Le Directeur d'établissement",
  sealCenter: "VTC",
  sealSub: "T3P",
  footer: FOOT_T3P,
  numberPrefix: "FC-VTC",
  appliqueLuhn: true,
  body: (d, org) => `
    <p>${esc(org.name)} certifie que</p>
    ${titulaire(d)}
    <p style="margin-top:2mm">a suivi${
      d.dateDebut ? `, les <b>${fdateLong(d.dateDebut)}${d.dateFin ? ` et ${fdateLong(d.dateFin)}` : ""}</b>,` : ""
    } dans le cadre d'une action de formation professionnelle continue (art. L.6313-1 du Code du travail), la</p>
    <p class="strong" style="font-size:12.4pt">Formation Continue VTC — 14 heures · 4 modules</p>
    <p class="arrete">Sécurité routière · Développement commercial · Réglementation de l'activité de Voiture de Transport avec Chauffeur · Droit du transport public particulier de personnes (T3P).</p>`,
});

// --- Formation continue Taxi ---
defs.push({
  code: "FC_TAXI",
  kind: "attestation",
  label: "Formation continue Taxi",
  overline: "Attestation de Formation",
  title: "Formation Continue Taxi",
  badge: "TAXI",
  refLabel: "N° de vérification",
  showVerif: true,
  sigRole: "Le Directeur d'établissement",
  sealCenter: "TAXI",
  sealSub: "T3P",
  footer: FOOT_T3P,
  numberPrefix: "FC-TAXI",
  appliqueLuhn: true,
  body: (d, org) => `
    <p>${esc(org.name)} certifie que</p>
    ${titulaire(d)}
    <p style="margin-top:2mm">a suivi${
      d.dateDebut ? `, les <b>${fdateLong(d.dateDebut)}${d.dateFin ? ` et ${fdateLong(d.dateFin)}` : ""}</b>,` : ""
    } dans le cadre d'une action de formation professionnelle continue (art. L.6313-1 du Code du travail), la</p>
    <p class="strong" style="font-size:12.4pt">Formation Continue Taxi — 14 heures · 4 modules</p>
    <p class="arrete">Sécurité routière · Développement commercial et gestion · Réglementation de l'activité de conducteur de taxi · Droit du transport public particulier de personnes (T3P).</p>`,
});

// --- Habilitation électrique H0B0 ---
defs.push({
  code: "HABIL_H0B0",
  kind: "attestation",
  label: "Habilitation électrique H0B0",
  overline: "Attestation d'Habilitation Électrique",
  title: "Prévention des Risques Électriques",
  badge: "H0 – B0",
  refLabel: "N° de vérification",
  showVerif: true,
  sigRole: "Le Directeur d'établissement",
  sealCenter: "H0B0",
  sealSub: "NF C 18-510",
  footer: FOOT_ELEC,
  numberPrefix: "HAB-H0B0",
  appliqueLuhn: true,
  body: (d, org) => `
    <p>${esc(org.name)} certifie que</p>
    ${titulaire(d)}
    <p style="margin-top:2mm">a suivi${
      d.dateDebut ? ` le <b>${fdateLong(d.dateDebut)}</b>` : ""
    } une formation à la prévention des risques électriques d'une durée de <b>7 heures</b>, selon la norme <b>NF C 18-510</b>. Un avis favorable a été rendu ; l'employeur peut délivrer l'habilitation&nbsp;:</p>
    <p class="strong" style="font-size:12.8pt">H0 – B0 « Non électricien »</p>
    <p class="arrete">(personnel réalisant exclusivement des travaux d'ordre non électrique et/ou des manœuvres permises).</p>`,
});

// --- Habilitation électrique BS / BE Manœuvre ---
defs.push({
  code: "HABIL_BSBE",
  kind: "attestation",
  label: "Habilitation électrique BS / BE Manœuvre",
  overline: "Attestation d'Habilitation Électrique",
  title: "Prévention des Risques Électriques",
  badge: "BS / BE Manœuvre",
  refLabel: "N° de vérification",
  showVerif: true,
  sigRole: "Le Directeur d'établissement",
  sealCenter: "BS·BE",
  sealSub: "NF C 18-510",
  footer: FOOT_ELEC,
  numberPrefix: "HAB-BSBE",
  appliqueLuhn: true,
  body: (d, org) => `
    <p>${esc(org.name)} certifie que</p>
    ${titulaire(d)}
    <p style="margin-top:2mm">a suivi${
      d.dateDebut && d.dateFin ? ` les <b>${fdateLong(d.dateDebut)} et ${fdateLong(d.dateFin)}</b>` : ""
    } une formation à la prévention des risques électriques d'une durée de <b>14 heures</b>, selon la norme <b>NF C 18-510</b>. Un avis favorable a été rendu ; l'employeur peut délivrer l'habilitation&nbsp;:</p>
    <p class="strong" style="font-size:12.8pt">H0-B0 · BS · BE Manœuvre</p>
    <p class="arrete">(interventions élémentaires et manœuvres permises en basse tension, hors travaux d'ordre électrique).</p>`,
});

export const TITRE_TYPES: TitreTypeDef[] = defs;

export const TITRE_BY_CODE: Record<TitreTypeCode, TitreTypeDef> = Object.fromEntries(
  defs.map((d) => [d.code, d]),
) as Record<TitreTypeCode, TitreTypeDef>;

export function getTitreDef(code: string): TitreTypeDef | undefined {
  return TITRE_BY_CODE[code as TitreTypeCode];
}

/**
 * Déduit, à partir d'une formation, le niveau du DIPLÔME SSIAP initial délivrable
 * (1/2/3) — ou `null` si la formation n'est pas un SSIAP initial (recyclage,
 * remise à niveau, SST, VTC…). Sert à n'afficher le bouton « Générer le diplôme »
 * que sur les sessions concernées (et à filtrer les documents par famille).
 */
/**
 * Déduit le code du type d'ATTESTATION délivrable pour une formation (recyclage
 * / RAN SSIAP, VTC, Taxi, H0B0, BS-BE) — ou `null` si la formation ne délivre pas
 * d'attestation vérifiable (ex. SSIAP initial → diplôme, SST…). Sert à afficher
 * le bon bouton « Générer l'attestation » sur la session.
 */
export function attestationCodeForFormation(f: {
  reference?: string | null;
  titre?: string | null;
}): TitreTypeCode | null {
  const S = `${f.reference ?? ""} ${f.titre ?? ""}`.toUpperCase();
  const ssiapN = S.match(/SSIAP\s*-?\s*([123])/)?.[1];
  if (ssiapN) {
    if (/RAN|REMISE/.test(S)) return `SSIAP${ssiapN}_RAN` as TitreTypeCode;
    if (/REC|RECYC/.test(S)) return `SSIAP${ssiapN}_RECYCLAGE` as TitreTypeCode;
    return null; // SSIAP initial → diplôme, pas attestation
  }
  if (/\bVTC\b/.test(S)) return "FC_VTC";
  if (/\bTAXI\b/.test(S)) return "FC_TAXI";
  if (/BS\s*\/?\s*BE|BS-?BE/.test(S)) return "HABIL_BSBE";
  if (/H0\s*-?\s*B0|H0B0/.test(S)) return "HABIL_H0B0";
  return null;
}

export function ssiapDiplomeNiveau(f: {
  reference?: string | null;
  titre?: string | null;
}): 1 | 2 | 3 | null {
  const ref = (f.reference ?? "").toUpperCase().replace(/\s+/g, "");
  const titre = (f.titre ?? "").toLowerCase();
  // Recyclage / remise à niveau → attestation, pas un diplôme initial.
  if (/REC|RAN|RECYC|REMISE/.test(ref) || /recycl|remise\s*à?\s*niveau/.test(titre)) return null;
  const m = ref.match(/SSIAP([123])/) ?? titre.replace(/\s+/g, "").match(/ssiap([123])/);
  return m ? (Number(m[1]) as 1 | 2 | 3) : null;
}
