import JSZip from "jszip";
import { auth } from "@/auth";
import { getTenantDb } from "@/lib/tenant";
import { parseDataUrl, extFromMime } from "@/lib/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Export du dossier d'audit Qualiopi : un ZIP prêt à présenter à l'auditeur,
// contenant la synthèse des 32 indicateurs, les preuves jointes (classées par
// critère/indicateur) et les registres (réclamations, veille, partenaires).
const STAFF = ["ADMIN", "RESPONSABLE_FORMATION"];

const critereDeNumero = (n: number) =>
  n <= 3 ? 1 : n <= 8 ? 2 : n <= 16 ? 3 : n <= 20 ? 4 : n <= 22 ? 5 : n <= 29 ? 6 : 7;

const fdate = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "");

// Neutralise l'injection de formules CSV (=, +, -, @ en tête de cellule).
function cell(v: unknown): string {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
}
const row = (cells: unknown[]) => cells.map(cell).join(";");
const csv = (lines: string[]) => "﻿" + lines.join("\r\n");

export async function GET() {
  const session = await auth();
  if (!session?.user || !STAFF.includes(session.user.role as string)) {
    return new Response("Non autorisé", { status: 401 });
  }
  const db = await getTenantDb();
  const [indicateurs, reclamations, veille, partenaires] = await Promise.all([
    db.qualiopiIndicateur.findMany({
      orderBy: { numero: "asc" },
      include: { preuves: true, responsable: { select: { name: true } } },
    }),
    db.reclamation.findMany({ orderBy: { date: "desc" } }),
    db.veilleEntree.findMany({ orderBy: { date: "desc" } }),
    db.partenaire.findMany({ orderBy: { nom: "asc" } }),
  ]);

  const zip = new JSZip();

  // 1) Synthèse des indicateurs
  zip.file(
    "SYNTHESE.csv",
    csv([
      row(["Critère", "Indicateur", "Libellé", "Statut", "Responsable", "Nb preuves", "Commentaire"]),
      ...indicateurs.map((ind) =>
        row([
          `Critère ${critereDeNumero(ind.numero)}`,
          ind.numero,
          ind.libelle,
          ind.statut,
          ind.responsable?.name ?? "",
          ind.preuves.length,
          ind.commentaire ?? "",
        ]),
      ),
    ]),
  );

  // 2) Registres (critères 6 & 7)
  zip.file(
    "registres/reclamations.csv",
    csv([
      row(["Date", "Origine", "Déclarant", "Objet", "Gravité", "Statut", "AR le", "Réponse le", "Clôture le"]),
      ...reclamations.map((r) =>
        row([fdate(r.date), r.origine, r.declarant, r.objet, r.gravite, r.statut, fdate(r.arDate), fdate(r.reponseDate), fdate(r.clotureDate)]),
      ),
    ]),
  );
  zip.file(
    "registres/veille.csv",
    csv([
      row(["Date", "Type", "Source", "Sujet", "Résumé", "Mise en œuvre", "Lien"]),
      ...veille.map((v) => row([fdate(v.date), v.type, v.source, v.sujet, v.resume ?? "", v.action ?? "", v.lien ?? ""])),
    ]),
  );
  zip.file(
    "registres/partenaires.csv",
    csv([
      row(["Nom", "Catégorie", "Contact", "Téléphone", "E-mail", "Objet"]),
      ...partenaires.map((p) => row([p.nom, p.categorie, p.contact ?? "", p.telephone ?? "", p.email ?? "", p.objet ?? ""])),
    ]),
  );

  // 3) Pièces justificatives, classées par critère/indicateur
  for (const ind of indicateurs) {
    for (const [i, p] of ind.preuves.entries()) {
      if (!p.fileUrl) continue;
      let data: Uint8Array | null = null;
      let ext = "bin";
      if (p.fileUrl.startsWith("data:")) {
        const parsed = parseDataUrl(p.fileUrl);
        if (parsed) {
          data = new Uint8Array(parsed.data);
          ext = extFromMime(parsed.mime);
        }
      } else {
        const up = await fetch(p.fileUrl).catch(() => null);
        if (up && up.ok) {
          data = new Uint8Array(await up.arrayBuffer());
          ext = p.fileUrl.match(/\.([a-z0-9]{2,5})(?:\?|$)/i)?.[1] ?? "bin";
        }
      }
      if (!data) continue;
      const safe = (p.label || `preuve-${i + 1}`).normalize("NFD").replace(/[^a-zA-Z0-9._-]+/g, "-");
      const dir = `preuves/Critere-${critereDeNumero(ind.numero)}/Indicateur-${String(ind.numero).padStart(2, "0")}`;
      zip.folder(dir)?.file(`${safe}.${ext}`, data);
    }
  }

  const buf = await zip.generateAsync({ type: "nodebuffer" });
  const today = new Date().toISOString().slice(0, 10);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="dossier-qualiopi-${today}.zip"`,
      "Cache-Control": "private, no-store",
    },
  });
}
