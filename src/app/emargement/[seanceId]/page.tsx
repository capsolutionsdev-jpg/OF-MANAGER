import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, PenLine } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import { orgConfigFor } from "@/lib/org-identity";
import { PRESENCE_LABELS } from "@/lib/presence";
import { MODALITE_LABELS } from "@/lib/validators/formation";
import { PrintButton } from "@/components/documents/print-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { yousignConfigured } from "@/lib/yousign";
import {
  requestEmargementSignature,
  markSignatureSigned,
} from "@/lib/actions/signature-actions";

export default async function FeuilleEmargementPage({
  params,
}: {
  params: Promise<{ seanceId: string }>;
}) {
  const { seanceId } = await params;
  const db = await getTenantDb();
  const seance = await db.seance.findUnique({
    where: { id: seanceId },
    include: {
      presences: true,
      session: {
        include: {
          formation: true,
          inscriptions: { include: { candidat: true } },
        },
      },
    },
  });
  if (!seance) notFound();
  const org = await orgConfigFor(seance.organismeId);

  const sig = await db.signatureRequest.findFirst({
    where: { signataires: { path: ["seanceId"], equals: seanceId } },
    orderBy: { createdAt: "desc" },
  });
  const demoSign = !yousignConfigured();

  const s = seance.session;
  const fmt = (d: Date) =>
    d.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  const participants = s.inscriptions;

  return (
    <div className="min-h-screen bg-muted/40 py-8">
      <div className="mx-auto max-w-3xl px-4">
        <div className="mb-4 space-y-3 print:hidden">
          <div className="flex items-center justify-between">
            <Link
              href={`/sessions/${s.id}/emargement`}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Retour
            </Link>
            <PrintButton />
          </div>
          <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3 text-sm">
            <span className="font-medium">Signature électronique :</span>
            {sig?.statut === "SIGNEE" ? (
              <Badge className="bg-emerald-100 text-emerald-700">
                Signé le {sig.signedAt?.toLocaleDateString("fr-FR")}
              </Badge>
            ) : sig?.statut === "ENVOYEE" ? (
              <>
                <Badge variant="secondary">Envoyée — en attente</Badge>
                <form action={markSignatureSigned}>
                  <input type="hidden" name="id" value={sig.id} />
                  <input type="hidden" name="back" value={`/emargement/${seanceId}`} />
                  <Button type="submit" size="sm" variant="outline">
                    Marquer comme signé
                  </Button>
                </form>
              </>
            ) : (
              <form action={requestEmargementSignature}>
                <input type="hidden" name="seanceId" value={seanceId} />
                <Button type="submit" size="sm" variant="outline">
                  <PenLine className="mr-1.5 h-4 w-4" /> Demander la signature électronique
                </Button>
              </form>
            )}
            {demoSign && (
              <span className="text-xs text-muted-foreground">
                Signature électronique interne (manuscrite, horodatée, IP).
              </span>
            )}
          </div>
        </div>

        <article className="doc-page mx-auto bg-white p-12 text-black shadow-sm">
          <div className="doc-header">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={org.logoUrl ?? "/ofmanager-logo.png"}
              alt={org.name}
              className="doc-logo"
            />
            <div className="doc-org">
              <strong>{org.name}</strong> — {org.qualiopi}
              <br />
              {org.adresse}
              <br />
              SIRET {org.siret} · NDA {org.nda}
            </div>
          </div>

          <h1 className="doc-title">Feuille d&apos;émargement</h1>

          <table className="doc-table">
            <tbody>
              <tr>
                <td>Formation</td>
                <td>
                  {s.formation.titre} ({s.formation.reference})
                </td>
              </tr>
              <tr>
                <td>Séance</td>
                <td className="capitalize">{fmt(seance.date)}</td>
              </tr>
              <tr>
                <td>Horaires</td>
                <td>
                  {seance.heureDebut} – {seance.heureFin}
                </td>
              </tr>
              <tr>
                <td>Lieu / modalité</td>
                <td>
                  {s.lieu ?? "—"} — {MODALITE_LABELS[s.modalite]}
                </td>
              </tr>
            </tbody>
          </table>

          <table className="emarge mt">
            <thead>
              <tr>
                <th>#</th>
                <th>Nom et prénom</th>
                <th>Présence</th>
                <th>Signature matin</th>
                <th>Signature après-midi</th>
              </tr>
            </thead>
            <tbody>
              {participants.map((insc, i) => {
                const presence = seance.presences.find(
                  (p) => p.apprenantId === insc.apprenantId,
                );
                return (
                  <tr key={insc.id}>
                    <td>{i + 1}</td>
                    <td>
                      {insc.candidat.prenom} {insc.candidat.nom}
                    </td>
                    <td>{presence ? PRESENCE_LABELS[presence.statut] : ""}</td>
                    <td></td>
                    <td></td>
                  </tr>
                );
              })}
              {participants.length === 0 && (
                <tr>
                  <td colSpan={5}>Aucun participant inscrit.</td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="doc-signatures">
            <div>
              <div className="sig-label">Le formateur</div>
              <div className="sig-box"></div>
            </div>
            <div>
              <div className="sig-label">
                Cachet et signature de l&apos;organisme — {org.representant}
              </div>
              <div className="sig-box">
                {/* Cachet du tenant uniquement — jamais l'asset CAP (marque
                    blanche). Box vide tant qu'il n'a pas été chargé. */}
                {org.cachetUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={org.cachetUrl} alt={`Cachet ${org.name}`} className="doc-stamp" />
                )}
              </div>
            </div>
          </div>

          <div className="doc-footer">
            {org.name} — Déclaration d&apos;activité n° {org.nda}. Cet
            enregistrement ne vaut pas agrément de l&apos;État.
          </div>
        </article>
      </div>

      <style>{`
        .doc-header { display:flex; align-items:center; justify-content:space-between; gap:16px; font-size:12px; color:#333; border-bottom:2px solid #111; padding-bottom:12px; margin-bottom:24px; }
        .doc-logo { height:48px; width:auto; }
        .doc-title { font-size:20px; font-weight:700; text-align:center; margin:0 0 24px; }
        .doc-page .mt { margin-top:16px; }
        .doc-table { width:100%; border-collapse:collapse; margin:8px 0; font-size:13px; }
        .doc-table td { border:1px solid #ccc; padding:6px 10px; }
        .doc-table td:first-child { width:35%; background:#f5f5f5; font-weight:600; }
        .emarge { width:100%; border-collapse:collapse; font-size:12px; }
        .emarge th, .emarge td { border:1px solid #999; padding:6px 8px; text-align:left; height:34px; }
        .emarge th { background:#f5f5f5; font-size:11px; }
        .emarge td:nth-child(4), .emarge td:nth-child(5) { width:22%; }
        .doc-signatures { display:flex; justify-content:space-between; gap:24px; margin-top:36px; }
        .doc-signatures > div { flex:1; }
        .sig-label { font-size:12px; margin-bottom:6px; }
        .sig-box { min-height:90px; border:1px dashed #aaa; border-radius:6px; padding:4px; }
        .doc-stamp { max-height:96px; max-width:240px; }
        .doc-footer { margin-top:28px; padding-top:12px; border-top:1px solid #ddd; font-size:10px; color:#777; text-align:center; }
        @media print { body { background:white; } .doc-page { box-shadow:none; padding:0; max-width:none; } }
      `}</style>
    </div>
  );
}
