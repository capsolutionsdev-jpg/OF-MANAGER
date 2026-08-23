import { promises as fs } from "node:fs";
import path from "node:path";
import QRCode from "qrcode";
import { auth } from "@/auth";
import { getTenantDb } from "@/lib/tenant";
import { orgConfigFor } from "@/lib/org-identity";
import { htmlToPdf } from "@/lib/pdf";
import { hasStrictFeature } from "@/lib/feature-guard";
import { getTitreDef, renderTitreHtml, type TitreData } from "@/lib/documents/titres";
import { readAgrements, agrementPourTypeCode } from "@/lib/agrements";

export const runtime = "nodejs";
export const maxDuration = 60; // génération PDF (Chromium serverless)

const STAFF = ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"];
const safe = (s: string) =>
  (s || "titre").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-");

/**
 * PDF d'un titre délivré (attestation de recyclage / remise à niveau, formation
 * continue VTC-Taxi, habilitation H0B0 / BS-BE, ou diplôme) rendu par le moteur
 * `@/lib/documents/titres`. Les champs d'affichage (date/lieu de naissance,
 * diplôme initial, dates de formation) proviennent de l'inscription liée.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const organismeId = session?.user?.organismeId;
  if (!session?.user || !STAFF.includes(session.user.role as string) || !organismeId) {
    return new Response("Non autorisé", { status: 401 });
  }
  if (!(await hasStrictFeature("diplomes"))) {
    return new Response("Module non activé", { status: 403 });
  }

  const { id } = await params;
  const db = await getTenantDb();
  const titre = await db.titreDelivre.findFirst({ where: { id } });
  if (!titre) return new Response("Titre introuvable", { status: 404 });

  const def = getTitreDef(titre.typeCode);
  if (!def) return new Response("Type de titre non pris en charge", { status: 422 });

  // Champs d'affichage repris de l'inscription liée (candidat + session).
  const insc = titre.inscriptionId
    ? await db.inscription.findFirst({
        where: { id: titre.inscriptionId },
        include: { candidat: true, session: { select: { dateDebut: true, dateFin: true } } },
      })
    : null;
  const c = insc?.candidat;

  const org = await orgConfigFor(organismeId);

  let logoUri = org.logoUrl ?? "";
  if (!logoUri) {
    const buf = await fs.readFile(path.join(process.cwd(), "public", "ofmanager-logo.png"));
    logoUri = `data:image/png;base64,${buf.toString("base64")}`;
  }

  const data: TitreData = {
    nom: titre.nomTitulaire,
    prenom: titre.prenomTitulaire,
    dateNaissance: c?.dateNaissance ?? null,
    lieuNaissance: c?.lieuNaissance ?? null,
    numero: titre.numeroVerification,
    dateDelivrance: titre.dateDelivrance,
    dateFinValidite: titre.dateFinValidite,
    ville: org.ville,
    diplomeRef: c?.ssiapDiplomeNumero ?? null,
    diplomeObtenuLe: c?.ssiapDiplomeDate ?? null,
    dateDebut: insc?.session.dateDebut ?? null,
    dateFin: insc?.session.dateFin ?? null,
  };

  // QR de vérification RÉEL sur TOUS les titres (attestations ET diplômes) : chacun
  // est vérifiable via son numéro. Encode l'URL publique + le numéro (préremplissage).
  const base = process.env.VITRINE_BASE_URL || "https://ofmanager.info";
  const verifTargetUrl = `${base}/verification?n=${encodeURIComponent(titre.numeroVerification)}`;
  const qrDataUri = await QRCode.toDataURL(verifTargetUrl, { margin: 1, width: 260 });

  const html = renderTitreHtml(
    def,
    data,
    {
      name: org.name,
      representant: org.representant,
      ville: org.ville,
      adresse: org.adresse,
      siret: org.siret,
      nda: org.nda,
      agrement: agrementPourTypeCode(titre.typeCode, readAgrements(org.documentsConfig)),
    },
    { logoUri, signatureUri: org.signatureUrl, cachetUri: org.cachetUrl, verifUrl: "ofmanager.info/verification", qrDataUri },
  );

  const pdf = await htmlToPdf(html, { landscape: true });
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${safe(def.label)}-${safe(titre.nomTitulaire)}.pdf"`,
    },
  });
}
