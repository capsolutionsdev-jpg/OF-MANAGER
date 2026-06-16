import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { orgConfigFor } from "@/lib/org-identity";
import { DevisAcceptForm } from "@/components/devis/devis-accept-form";

export const dynamic = "force-dynamic";

type Ligne = { designation: string; quantite: number; puHT: number };

const euro = (n: number) =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
const fmt = (d: Date | null) => (d ? d.toLocaleDateString("fr-FR") : "—");

export default async function DevisAcceptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const d = await prisma.devis.findUnique({
    where: { acceptToken: token },
    include: { entreprise: true },
  });
  if (!d) notFound();

  const org = await orgConfigFor(d.organismeId);
  const lignes = (d.lignesJson as unknown as Ligne[] | null) ?? [];
  const ht = Number(d.montantHT);
  const ttc = Number(d.montantTTC);
  const tva = Number(d.tva);
  const clientNom = d.entreprise?.raisonSociale ?? d.clientNom ?? "—";
  const clientAdresse = d.entreprise
    ? [d.entreprise.adresse, d.entreprise.codePostal, d.entreprise.ville].filter(Boolean).join(", ")
    : null;
  const accepted = !!d.acceptedAt;

  return (
    <div className="min-h-screen bg-muted/40 py-8">
      <div className="mx-auto max-w-3xl space-y-4 px-4">
        {accepted ? (
          <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <div className="text-sm">
              <p className="font-semibold text-emerald-700">Devis déjà accepté</p>
              <p className="text-emerald-800/80">
                Signé par {d.signataire} le {d.acceptedAt!.toLocaleString("fr-FR")}. Merci !
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border bg-background p-4 text-sm">
            <p className="font-semibold">{org.name} vous propose un devis</p>
            <p className="text-muted-foreground">
              Relisez le détail ci-dessous, puis donnez votre « bon pour accord » en signant en bas de page.
            </p>
          </div>
        )}

        <article className="rounded-lg bg-white p-8 text-black shadow-sm sm:p-10">
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
              {d.validUntil && (
                <div className="text-xs text-[#555]">Valable jusqu&apos;au {fmt(d.validUntil)}</div>
              )}
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

          <table className="mt-6 w-full border-collapse text-sm">
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

          <div className="mt-4 flex justify-end">
            <div className="w-64 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-[#555]">Total HT</span><span className="tabular-nums">{euro(ht)}</span></div>
              <div className="flex justify-between"><span className="text-[#555]">TVA ({tva}%)</span><span className="tabular-nums">{euro(ttc - ht)}</span></div>
              <div className="flex justify-between border-t border-[#111] pt-1 text-base font-bold"><span>Total TTC</span><span className="tabular-nums">{euro(ttc)}</span></div>
            </div>
          </div>

          {accepted && d.signatureUrl ? (
            <div className="mt-8 flex justify-end">
              <div className="w-64 text-sm">
                <div className="mb-1 text-xs font-semibold uppercase text-[#777]">Bon pour accord</div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={d.signatureUrl} alt="Signature" className="h-20 w-auto" />
                <div className="mt-1 border-t border-[#111] pt-1 text-xs">
                  {d.signataire}
                  <br />
                  Le {d.acceptedAt!.toLocaleDateString("fr-FR")}
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-10 border-t border-[#ddd] pt-3 text-[10px] leading-relaxed text-[#777]">
            {org.name} — {org.qualiopi} · SIRET {org.siret} · NDA {org.nda}.
            Devis valable {d.validUntil ? `jusqu'au ${fmt(d.validUntil)}` : "30 jours"}.
          </div>
        </article>

        {!accepted && (
          <DevisAcceptForm token={token} defaultName={d.entreprise?.contactNom ?? ""} />
        )}

        <p className="text-center text-xs text-muted-foreground">
          Document transmis par {org.name}. En cas de question, contactez {org.email}.
        </p>
      </div>
    </div>
  );
}
