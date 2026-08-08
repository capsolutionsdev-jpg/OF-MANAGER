import { cache } from "react";
import { getTenantDb } from "@/lib/tenant";
import { getSessionValidation } from "@/lib/validation/service";
import {
  ssiapDiplomeNiveau,
  attestationCodeForFormation,
  getTitreDef,
} from "@/lib/documents/titres";
import { formationPrereq } from "@/lib/inscription/prerequis";

/**
 * Chargeur partagé des données de la page « Session » et de ses onglets
 * (Vue d'ensemble / Participants / Dossiers / Documents).
 *
 * Enveloppé dans React `cache()` : la requête et ses dérivés sont dédupliqués
 * entre les composants rendus dans un même passage de rendu (l'en-tête partagé
 * appelle aussi ce chargeur).
 *
 * Retourne `null` si la session est introuvable — chaque page appelle alors
 * `notFound()`.
 */
export const getSessionDetail = cache(async (id: string) => {
  const db = await getTenantDb();
  const s = await db.session.findUnique({
    where: { id },
    include: {
      formation: true,
      formateurs: true,
      inscriptions: {
        include: { candidat: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!s) return null;

  // Pièces justificatives déposées par les candidats de la session (dépôt via le
  // parcours, e-mail, ou scan à l'accueil) — regroupées par candidat.
  // On ne renvoie PAS `url` (souvent une data-URL base64 volumineuse) : l'accès aux
  // pièces passe par la route /api/public/piece/[id] (auth + Content-Disposition).
  const piecesParCandidat = new Map<
    string,
    { id: string; label: string; statut: string }[]
  >();
  const candidatIds = s.inscriptions.map((i) => i.candidatId);
  if (candidatIds.length > 0) {
    const pieces = await db.pieceJointe.findMany({
      where: { candidatId: { in: candidatIds } },
      orderBy: { createdAt: "desc" },
      select: { id: true, candidatId: true, label: true, statut: true },
    });
    for (const p of pieces) {
      const liste = piecesParCandidat.get(p.candidatId) ?? [];
      liste.push({ id: p.id, label: p.label, statut: p.statut });
      piecesParCandidat.set(p.candidatId, liste);
    }
  }

  const enrolledIds = s.inscriptions.map((i) => i.candidatId);
  const candidatsDisponibles = await db.candidat.findMany({
    where: { id: { notIn: enrolledIds }, statut: { not: "ARCHIVE" } },
    select: { id: true, nom: true, prenom: true },
    orderBy: [{ nom: "asc" }, { prenom: "asc" }],
  });

  // Diplôme SSIAP délivrable pour cette session (null hors SSIAP initial) →
  // conditionne l'affichage du bouton « Générer le diplôme ».
  const diplomeSsiapNiv = ssiapDiplomeNiveau(s.formation);
  // Attestation délivrable (recyclage/RAN SSIAP, VTC, Taxi, H0B0, BS-BE) → bouton.
  const attCode = attestationCodeForFormation(s.formation);
  const attDef = attCode ? getTitreDef(attCode) : null;
  const attestationForDocs =
    attCode && attDef ? { code: attCode, label: attDef.label } : null;
  // Prérequis & spécificités de la formation (SSIAP, CNAPS, carte pro…) pour l'inscription.
  const prereq = formationPrereq(s.formation);

  // ── Garde-fou : ce qu'il reste à compléter pour la session ──
  const pa = s.formation.piecesAttendues;
  const gfDossier: string[] = [];
  const gfSign: string[] = [];
  const gfConv: string[] = [];
  const gfPos: string[] = [];
  for (const i of s.inscriptions) {
    if (i.statut === "ANNULEE") continue;
    const nom = `${i.candidat.prenom} ${i.candidat.nom}`.trim();
    if (pa.length > 0 && pa.some((p) => !i.piecesRecues.includes(p))) gfDossier.push(nom);
    if (!i.signedAt) gfSign.push(nom);
    if (!i.convocationSentAt) gfConv.push(nom);
    if (!i.positionnementCompletedAt) gfPos.push(nom);
  }
  const gardeFouGroups = [
    { key: "dossier", label: "Dossiers incomplets", noms: gfDossier },
    { key: "signature", label: "Documents non signés", noms: gfSign },
    { key: "convocation", label: "Convocations à envoyer", noms: gfConv },
    { key: "positionnement", label: "Positionnements non faits", noms: gfPos },
  ];

  // Archivage : la source de vérité est le service de validation (Qualiopi).
  const vstate = await getSessionValidation(id);
  const canArchive = !!vstate?.isValidated;
  const dejaArchivee = !!vstate?.isArchived || s.isArchived;

  return {
    s,
    piecesParCandidat,
    candidatsDisponibles,
    diplomeSsiapNiv,
    attestationForDocs,
    prereq,
    gardeFouGroups,
    vstate,
    canArchive,
    dejaArchivee,
  };
});
