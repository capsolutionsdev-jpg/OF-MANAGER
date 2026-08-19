import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileSignature, CheckCircle2 } from "lucide-react";
import { requireSection } from "@/lib/section-guard";
import { getTenantDb } from "@/lib/tenant";
import { getCurrentOrganisme } from "@/lib/org";
import { hasFeature } from "@/lib/features";
import { orgConfigFor } from "@/lib/org-identity";
import { PrintButton } from "@/components/documents/print-button";
import { CopyAcceptLink } from "@/components/devis/copy-accept-link";
import { DevisStatutButtons, GenerateSignatureLinkButton } from "@/components/devis/devis-status-actions";

export const dynamic = "force-dynamic";

type Ligne = { designation: string; quantite: number; puHT: number };

const euro = (n: number) =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
const fmt = (d: Date | null) => (d ? d.toLocaleDateString("fr-FR") : "—");

export default async function DevisDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSection("facturation");
  const db = await getTenantDb();
  const { id } = await params;
  const d = await db.devis.findUnique({
    where: { id },
    include: { entreprise: true },
  });
  if (!d) notFound();

  const org = await orgConfigFor(d.organismeId);
  const currentOrg = await getCurrentOrganisme();
  const signEnabled = hasFeature(currentOrg?.fonctionnalites, "devis-signature");
  const lignes = (d.lignesJson as unknown as Ligne[] | null) ?? [];
  const ht = Number(d.montantHT);
  const ttc = Number(d.montantTTC);
  const tva = Number(d.tva);
  const clientNom = d.entreprise?.raisonSociale ?? d.clientNom ?? "—";
  const clientAdresse = d.entreprise
    ? [d.entreprise.adresse, d.entreprise.codePostal, d.entreprise.ville].filter(Boolean).join(", ")
    : null;

  const statutActions: { statut: string; label: string }[] = [
    { statut: "ENVOYEE", label: "Marquer envoyé" },
    { statut: "PAYEE", label: "Marquer payé" },
    { statut: "ANNULEE", label: "Marquer annulé" },
  ];

  return (
    <div className="space-y-4">
      {/* Barre d'actions collante — reste accessible pendant le scroll du document A4 */}
      <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b bg-background/95 py-2 backdrop-blur print:hidden">
        <Link href="/devis" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Retour aux devis
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <DevisStatutButtons id={d.id} actions={statutActions} />
          <PrintButton />
        </div>
      </div>

      {/* Signature électronique du devis (module avancé) */}
      {signEnabled && (
        <div className="mx-auto max-w-3xl rounded-lg border bg-muted/30 p-4 print:hidden">
          {d.acceptedAt ? (
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
              <div className="text-sm">
                <p className="font-semibold text-success">Devis accepté en ligne</p>
                <p className="text-muted-foreground">
                  Signé par <span className="font-medium text-foreground">{d.signataire}</span> le{" "}
                  {d.acceptedAt.toLocaleString("fr-FR")}
                  {d.signatureIp ? ` · IP ${d.signatureIp}` : ""}.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <FileSignature className="h-4 w-4" /> Acceptation / signature en ligne
              </div>
              {d.acceptToken ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Lien actif — transmettez-le au client pour qu&apos;il signe son « bon pour accord ».
                  </p>
                  <CopyAcceptLink path={`/devis-accept/${d.acceptToken}`} />
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Générez un lien sécurisé permettant au client de signer ce devis à distance.
                  </p>
                  <GenerateSignatureLinkButton id={d.id} />
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Aperçu « papier » A4 — theme-aware à l'écran, forcé blanc à l'impression */}
      <article className="mx-auto max-w-3xl rounded-lg border bg-card p-10 text-card-foreground shadow-sm print:rounded-none print:border-0 print:bg-white print:text-black print:shadow-none">
        <header className="flex items-start justify-between gap-6 border-b-2 border-foreground/60 pb-4 print:border-black">
          <div className="flex items-center gap-3">
            {org.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={org.logoUrl} alt={org.name} className="h-12 w-auto" />
            ) : null}
            <div className="text-xs leading-snug">
              <div className="text-sm font-bold">{org.name}</div>
              {org.adresse}
              <br />
              SIRET {org.siret} · NDA {org.nda}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold">DEVIS</div>
            <div className="text-sm">{d.reference}</div>
            <div className="text-xs text-muted-foreground print:text-neutral-600">Émis le {fmt(d.dateEmission)}</div>
            {d.validUntil && <div className="text-xs text-muted-foreground print:text-neutral-600">Valable jusqu&apos;au {fmt(d.validUntil)}</div>}
          </div>
        </header>

        <div className="mt-6 flex justify-between gap-6 text-sm">
          <div>
            <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground print:text-neutral-500">Client</div>
            <div className="font-medium">{clientNom}</div>
            {clientAdresse && <div className="text-xs text-muted-foreground print:text-neutral-600">{clientAdresse}</div>}
            {d.entreprise?.siret && <div className="text-xs text-muted-foreground print:text-neutral-600">SIRET {d.entreprise.siret}</div>}
          </div>
          {d.objet && (
            <div className="max-w-xs text-right">
              <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground print:text-neutral-500">Objet</div>
              <div className="text-sm">{d.objet}</div>
            </div>
          )}
        </div>

        <div className="mt-6 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground print:border-neutral-300 print:text-neutral-500">
              <th className="py-2">Désignation</th>
              <th className="py-2 text-right">Qté</th>
              <th className="py-2 text-right">PU HT</th>
              <th className="py-2 text-right">Total HT</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((l, i) => (
              <tr key={i} className="border-b border-border/70 print:border-neutral-200">
                <td className="py-2">{l.designation}</td>
                <td className="py-2 text-right tabular-nums">{l.quantite}</td>
                <td className="py-2 text-right tabular-nums">{euro(l.puHT)}</td>
                <td className="py-2 text-right tabular-nums">{euro(l.quantite * l.puHT)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        <div className="mt-4 flex justify-end">
          <div className="w-64 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground print:text-neutral-600">Total HT</span><span className="tabular-nums">{euro(ht)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground print:text-neutral-600">TVA ({tva}%)</span><span className="tabular-nums">{euro(ttc - ht)}</span></div>
            <div className="flex justify-between border-t border-foreground/60 pt-1 text-base font-bold print:border-black"><span>Total TTC</span><span className="tabular-nums">{euro(ttc)}</span></div>
          </div>
        </div>

        {d.acceptedAt && d.signatureUrl ? (
          <div className="mt-8 flex justify-end">
            <div className="w-64 text-sm">
              <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground print:text-neutral-500">Bon pour accord</div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={d.signatureUrl} alt="Signature" className="h-20 w-auto" />
              <div className="mt-1 border-t border-foreground/60 pt-1 text-xs print:border-black">
                {d.signataire}
                <br />
                Le {d.acceptedAt.toLocaleDateString("fr-FR")}
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-10 border-t border-border pt-3 text-[10px] leading-relaxed text-muted-foreground print:border-neutral-300 print:text-neutral-500">
          {org.name} — {org.qualiopi} · SIRET {org.siret} · NDA {org.nda}.
          Devis valable {d.validUntil ? `jusqu'au ${fmt(d.validUntil)}` : "30 jours"}.
          {d.acceptedAt ? "" : " Bon pour accord (date + signature) :"}
        </div>
      </article>
    </div>
  );
}
