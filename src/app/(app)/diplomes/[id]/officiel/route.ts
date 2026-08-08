import { promises as fs } from "node:fs";
import path from "node:path";
import { auth } from "@/auth";
import { getTenantDb } from "@/lib/tenant";
import { orgConfigFor } from "@/lib/org-identity";
import { htmlToPdf } from "@/lib/pdf";
import { hasStrictFeature } from "@/lib/feature-guard";
import { readAgrements } from "@/lib/agrements";
import {
  getTitreDef,
  niveauFromNumero,
  renderTitreHtml,
  type TitreData,
} from "@/lib/documents/titres";

export const runtime = "nodejs";
export const maxDuration = 60; // génération PDF (Chromium serverless)

const STAFF = ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"];
const safe = (s: string) =>
  (s || "diplome").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-");

/**
 * Diplôme officiel SSIAP (PDF, A4 paysage) — direction artistique « grande école »
 * rendue par `@/lib/documents/titres`. Le niveau est déduit du numéro préfectoral
 * stocké dans le diplôme (`093-0042-1-2026-00001` → niveau 1). Réservé au module
 * `diplomes`.
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
  const d = await db.diplome.findFirst({ where: { id } });
  if (!d) return new Response("Diplôme introuvable", { status: 404 });
  if (!d.numeroDiplome) {
    return new Response("Ce diplôme n'a pas encore de numéro généré.", { status: 409 });
  }

  const niveau = niveauFromNumero(d.numeroDiplome) ?? 1;
  const def = getTitreDef(`SSIAP${niveau}_DIPLOME`);
  if (!def) return new Response("Type de diplôme non pris en charge", { status: 422 });

  const org = await orgConfigFor(organismeId);

  // Logo : préférence à celui de l'organisme, repli sur l'asset public.
  let logoUri = org.logoUrl ?? "";
  if (!logoUri) {
    const buf = await fs.readFile(path.join(process.cwd(), "public", "cap-competences-logo.png"));
    logoUri = `data:image/png;base64,${buf.toString("base64")}`;
  }

  const data: TitreData = {
    nom: d.nom,
    prenom: d.prenom,
    dateNaissance: d.dateNaissance,
    lieuNaissance: d.lieuNaissance,
    numero: d.numeroDiplome,
    dateDelivrance: d.remisAt ?? d.createdAt,
    ville: org.ville,
    dateJury: null,
    president: null,
  };

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
      agrement: readAgrements(org.documentsConfig).ssiap,
    },
    { logoUri, signatureUri: org.signatureUrl },
  );

  const pdf = await htmlToPdf(html, { landscape: true });
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Diplome-SSIAP${niveau}-${safe(d.nom)}.pdf"`,
    },
  });
}
