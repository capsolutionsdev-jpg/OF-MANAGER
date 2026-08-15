/**
 * Effacement RGPD COMPLET d'un candidat (droit à l'effacement, art. 17).
 *
 * Source unique de vérité, partagée par :
 *   - l'effacement MANUEL (console RGPD, `lib/actions/rgpd-actions.ts`),
 *   - la purge AUTOMATIQUE par durée de conservation (`lib/rgpd-retention.ts`).
 *
 * On CONSERVE les enregistrements liés (obligations Qualiopi/comptables) mais on
 * efface TOUTES les données identifiantes du candidat ET des enregistrements qui
 * en portent : pièces déposées (CNI/CV/diplômes), signatures manuscrites
 * (inscription, positionnement, français, suivi 6 mois, émargement, présence),
 * IP de signature, messages du portail.
 *
 * Avant ce correctif, l'anonymisation ne touchait que quelques champs du
 * `Candidat` et laissait en clair les pièces et toutes les signatures → le
 * « droit à l'effacement » n'effaçait pas réellement toutes les données
 * personnelles (constat d'audit de pré-commercialisation, §4).
 */

/** Client Prisma minimal accepté (client scopé tenant OU client brut). Signatures
 * en syntaxe MÉTHODE (bivariantes) pour rester assignable par les deux clients. */
type AnonDb = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  candidat: { updateMany(args: any): Promise<any> };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pieceJointe: { findMany(args: any): Promise<any[]>; updateMany(args: any): Promise<any> };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inscription: { updateMany(args: any): Promise<any> };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  emargementSignature: { updateMany(args: any): Promise<any> };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apprenant: { findFirst(args: any): Promise<any> };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  presence: { updateMany(args: any): Promise<any> };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  candidatMessage: { deleteMany(args: any): Promise<any> };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  auditLog: { create(args: any): Promise<any> };
};

/** E-mail de remplacement déterministe (permet le dédoublonnage et évite les collisions). */
export function anonymisedEmail(candidatId: string): string {
  return `anonymise-${candidatId}@rgpd.local`;
}

/**
 * Données d'anonymisation du `Candidat` — fonction PURE (testable sans base).
 * Met à null / neutralise TOUTES les données identifiantes du candidat.
 */
export function anonymisedCandidatData(candidatId: string) {
  return {
    // Identité
    nom: "Anonymisé",
    prenom: "—",
    email: anonymisedEmail(candidatId),
    telephone: null,
    adresse: null,
    ville: null,
    codePostal: null,
    pays: null,
    dateNaissance: null,
    lieuNaissance: null,
    departementNaissance: null,
    paysNaissance: null,
    nationalite: null,
    photoUrl: null,
    // Situation / parcours
    situationPro: null,
    employeur: null,
    posteOccupe: null,
    dernierDiplome: null,
    objectifsFormation: null,
    besoinsAdaptation: null,
    // Numéros identifiants réglementaires
    cnapsNumero: null,
    carteProNumero: null,
    ssiapDiplomeNumero: null,
    carteProVtcTaxiNumero: null,
    // Signature & jeton prospect
    prospectSignatureUrl: null,
    prospectSignatureIp: null,
    civicToken: null,
    // État
    statut: "ARCHIVE" as const,
    anonymiseLe: new Date(),
  };
}

/** Champs PII du Candidat mis à null par l'anonymisation (hors valeurs neutralisées). */
export const CANDIDAT_PII_NULLED = [
  "telephone", "adresse", "ville", "codePostal", "pays", "dateNaissance",
  "lieuNaissance", "departementNaissance", "paysNaissance", "nationalite", "photoUrl",
  "situationPro", "employeur", "posteOccupe", "dernierDiplome", "objectifsFormation",
  "besoinsAdaptation", "cnapsNumero", "carteProNumero", "ssiapDiplomeNumero",
  "carteProVtcTaxiNumero", "prospectSignatureUrl", "prospectSignatureIp", "civicToken",
] as const;

/** Suppression best-effort des fichiers Blob référencés (ne bloque jamais l'effacement). */
async function bestEffortDeleteBlobs(urls: string[]): Promise<void> {
  const httpUrls = urls.filter((u) => /^https?:\/\//i.test(u));
  if (httpUrls.length === 0) return; // data: URLs → contenu déjà effacé en base
  try {
    const { del } = await import("@vercel/blob");
    await del(httpUrls);
  } catch {
    /* Blob non configuré / erreur réseau : les références en base sont déjà effacées. */
  }
}

/**
 * Efface TOUTES les données personnelles d'un candidat, dans son organisme.
 * Idempotent (updateMany/deleteMany scopés). `db` peut être le client scopé tenant
 * ou le client brut : le `organismeId` est passé explicitement comme garde-fou.
 */
export async function anonymiseCandidatComplet(
  db: AnonDb,
  organismeId: string,
  candidatId: string,
  opts: { action: string; userId?: string | null },
): Promise<void> {
  const scope = { candidatId, organismeId };

  // 1) Candidat : toutes les données identifiantes.
  await db.candidat.updateMany({
    where: { id: candidatId, organismeId },
    data: anonymisedCandidatData(candidatId),
  });

  // 2) Pièces déposées (CNI, CV, diplômes) : effacer le contenu + le fichier Blob.
  const pieces: { url: string }[] = await db.pieceJointe.findMany({
    where: scope,
    select: { url: true },
  });
  await db.pieceJointe.updateMany({
    where: scope,
    data: { url: "", mimeType: null, taille: null, label: "Pièce supprimée (RGPD)", motifRefus: null },
  });
  await bestEffortDeleteBlobs(pieces.map((p) => p.url).filter(Boolean));

  // 3) Signatures manuscrites + IP portées par les inscriptions.
  await db.inscription.updateMany({
    where: scope,
    data: {
      signatureIp: null,
      signatureDataUrl: null,
      positionnementSignature: null,
      francaisSignature: null,
      suivi6moisSignature: null,
    },
  });

  // 4) Émargement électronique (nom/email/IP/signature).
  await db.emargementSignature.updateMany({
    where: scope,
    data: {
      nom: "Anonymisé",
      email: anonymisedEmail(candidatId),
      signatureIp: null,
      signatureDataUrl: null,
    },
  });

  // 5) Feuilles de présence (signature) — reliées via l'apprenant.
  const apprenant: { id: string } | null = await db.apprenant.findFirst({
    where: { candidatId, organismeId },
    select: { id: true },
  });
  if (apprenant) {
    await db.presence.updateMany({
      where: { apprenantId: apprenant.id, organismeId },
      data: { signatureUrl: null },
    });
  }

  // 6) Messages du portail candidat (contenu personnel).
  await db.candidatMessage.deleteMany({ where: scope });

  // 7) Traçabilité.
  await db.auditLog.create({
    data: {
      organismeId,
      userId: opts.userId ?? undefined,
      action: opts.action,
      entityType: "Candidat",
      entityId: candidatId,
    },
  });
}
