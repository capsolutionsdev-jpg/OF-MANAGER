import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileSignature, CheckCircle2 } from "lucide-react";
import { requireSection } from "@/lib/section-guard";
import { getTenantDb } from "@/lib/tenant";
import { getCurrentOrganisme } from "@/lib/org";
import { hasFeature } from "@/lib/features";
import { orgConfigFor } from "@/lib/org-identity";
import { Button } from "@/components/ui/button";
import { PrintButton } from "@/components/documents/print-button";
import { CopyAcceptLink } from "@/components/devis/copy-accept-link";
import { setDevisStatut, requestDevisSignature } from "@/lib/actions/devis-actions";

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
    { statut: "PAYEE", label: "Marquer accepté" },
    { statut: "ANNULEE", label: "Marquer refusé" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/devis" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Retour aux devis
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {statutActions.map((a) => (
            <form key={a.statut} action={setDevisStatut}>
              <input type="hidden" name="id" value={d.id} />
              <input type="hidden" name="statut" value={a.statut} />
              <Button type="submit" size="sm" variant="outline">{a.label}</Button>
            </form>
          ))}
          <PrintButton />
        </div>
      </div>

      {/* Signature électronique du devis (module avancé) */}
      {signEnabled && (
        <div className="mx-auto max-w-3xl rounded-lg border bg-muted/30 p-4 print:hidden">
          {d.acceptedAt ? (
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <div className="text-sm">
                <p className="font-semibold text-emerald-700">Devis accepté en ligne</p>
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
                  <form action={requestDevisSignature}>
                    <input type="hidden" name="id" value={d.id} />
                    <Button type="submit" size="sm">
                      <FileSignature className="mr-2 h-4 w-4" /> Générer le lien de signature
                    </Button>
                  </form>
                </>
              )}
            </div>
          )}
        </div>
      )}

      <article className="mx-auto max-w-3xl rounded-lg bg-white p-10 text-black shadow-sm print:shadow-none">
        <header className="flex items-start justify-between gap-6 border-b-2 border-[#111] pb-4">
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
            <div className="text-xs text-[#555]">Émis le {fmt(d.dateEmission)}</div>
            {d.validUntil && <div className="text-xs text-[#555]">Valable jusqu&apos;au {fmt(d.validUntil)}</div>}
          </div>
        </header>

        <div className="mt-6 flex justify-between gap-6 text-sm">
          <div>
            <div className="mb-1 text-xs font-semibold uppercase text-[#777]">Client</div>
            <div className="font-medium">{clientNom}</div>
            {clientAdresse && <div className="text-xs text-[#555]">{clientAdresse}</div>}
            {d.entreprise?.siret && <div className="text-xs text-[#555]">SIRET {d.entreprise.siret}</div>}
          </div>
          {d.objet && (
            <div className="max-w-xs text-right">
              <div className="mb-1 text-xs font-semibold uppercase text-[#777]">Objet</div>
              <div className="text-sm">{d.objet}</div>
            </div>
          )}
        </div>

        <div className="mt-6 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-[#ccc] text-left text-xs uppercase text-[#777]">
              <th className="py-2">Désignation</th>
              <th className="py-2 text-right">Qté</th>
              <th className="py-2 text-right">PU HT</th>
              <th className="py-2 text-right">Total HT</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((l, i) => (
              <tr key={i} className="border-b border-[#eee]">
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
            <div className="flex justify-between"><span className="text-[#555]">Total HT</span><span className="tabular-nums">{euro(ht)}</span></div>
            <div className="flex justify-between"><span className="text-[#555]">TVA ({tva}%)</span><span className="tabular-nums">{euro(ttc - ht)}</span></div>
            <div className="flex justify-between border-t border-[#111] pt-1 text-base font-bold"><span>Total TTC</span><span className="tabular-nums">{euro(ttc)}</span></div>
          </div>
        </div>

        {d.acceptedAt && d.signatureUrl ? (
          <div className="mt-8 flex justify-end">
            <div className="w-64 text-sm">
              <div className="mb-1 text-xs font-semibold uppercase text-[#777]">Bon pour accord</div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={d.signatureUrl} alt="Signature" className="h-20 w-auto" />
              <div className="mt-1 border-t border-[#111] pt-1 text-xs">
                {d.signataire}
                <br />
                Le {d.acceptedAt.toLocaleDateString("fr-FR")}
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-10 border-t border-[#ddd] pt-3 text-[10px] leading-relaxed text-[#777]">
          {org.name} — {org.qualiopi} · SIRET {org.siret} · NDA {org.nda}.
          Devis valable {d.validUntil ? `jusqu'au ${fmt(d.validUntil)}` : "30 jours"}.
          {d.acceptedAt ? "" : " Bon pour accord (date + signature) :"}
        </div>
      </article>
    </div>
  );
}
