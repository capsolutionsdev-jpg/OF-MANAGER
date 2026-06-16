import { getTenantDb } from "@/lib/tenant";
import { auth } from "@/auth";
import { htmlToPdf } from "@/lib/pdf";
import { orgConfigFor } from "@/lib/org-identity";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ coursId: string }> },
) {
  const { coursId } = await params;
  const session = await auth();
  if (!session?.user?.id) return new Response("Non autorisé", { status: 401 });
  const db = await getTenantDb();
  const apprenant = await db.apprenant.findUnique({
    where: { userId: session.user.id },
    include: { candidat: { select: { prenom: true, nom: true } } },
  });
  if (!apprenant) return new Response("Non autorisé", { status: 401 });

  const acces = await db.coursApprenant.findUnique({
    where: { coursId_apprenantId: { coursId, apprenantId: apprenant.id } },
  });
  if (!acces) return new Response("Accès refusé", { status: 403 });

  const cours = await db.cours.findUnique({
    where: { id: coursId },
    include: {
      formation: { select: { titre: true } },
      modules: { include: { lecons: { where: { isPublished: true }, select: { id: true } } } },
    },
  });
  if (!cours) return new Response("Cours introuvable", { status: 404 });

  const lecons = cours.modules.flatMap((m) => m.lecons.map((l) => l.id));
  const done = await db.progressionLecon.count({
    where: { apprenantId: apprenant.id, leconId: { in: lecons } },
  });
  if (lecons.length === 0 || done < lecons.length) {
    return new Response("Cours non terminé", { status: 400 });
  }

  const nom = `${apprenant.candidat.prenom} ${apprenant.candidat.nom}`;
  const date = new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const org = await orgConfigFor(session.user.organismeId);
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    body { font-family: Georgia, "Times New Roman", serif; color: #0D1B3E; padding: 0; margin: 0; }
    .sheet { padding: 60px; border: 6px double #1A5FD4; margin: 24px; text-align: center; }
    .org { font-size: 13px; color: #555; }
    h1 { font-size: 30px; letter-spacing: 2px; margin: 28px 0 6px; }
    .sub { font-size: 13px; color: #1A5FD4; text-transform: uppercase; letter-spacing: 3px; }
    .nom { font-size: 26px; font-weight: bold; margin: 26px 0 6px; }
    .cours { font-size: 18px; margin: 10px 0; }
    .meta { font-size: 13px; color: #555; margin-top: 24px; }
    .foot { font-size: 11px; color: #777; margin-top: 40px; border-top: 1px solid #ccc; padding-top: 10px; }
  </style></head><body>
    <div class="sheet">
      <div class="org"><strong>${org.name}</strong> — ${org.qualiopi}</div>
      <p class="sub">Attestation de réalisation</p>
      <h1>ATTESTATION</h1>
      <p>Le présent document atteste que</p>
      <div class="nom">${nom}</div>
      <p>a suivi et terminé l'intégralité du module e-learning :</p>
      <div class="cours">« ${cours.titre} »${cours.formation ? `<br/><span style="font-size:13px;color:#555">${cours.formation.titre}</span>` : ""}</div>
      <p class="meta">Fait le ${date}.</p>
      <div class="foot">
        ${org.name} · SIRET ${org.siret} · NDA ${org.nda}<br/>
        ${org.representant}, représentant légal
      </div>
    </div>
  </body></html>`;

  const pdf = await htmlToPdf(html);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="attestation-${cours.slug}.pdf"`,
    },
  });
}
