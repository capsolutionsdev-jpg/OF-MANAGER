import { notFound } from "next/navigation";
import { CheckCircle2, FileText } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { eurosDoc } from "@/lib/plans";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ENGAGEMENT_LABELS, montantNet, montantEngagement } from "@/lib/contrats/prestation";
import { getPrestataire, clientFromOrg, contratDataFrom } from "@/lib/contrats/prestation-data";
import { ContratPrestationSignForm } from "@/components/contrat/contrat-prestation-sign-form";

export const dynamic = "force-dynamic";

function fmtDate(d?: Date | null) {
  return d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }) : "—";
}

function Partie({ label, i }: { label: string; i: { nom: string; raisonSociale?: string | null; siret?: string | null; adresse?: string | null; representant?: string | null } }) {
  return (
    <div className="space-y-0.5 text-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-semibold">{i.raisonSociale || i.nom}</p>
      {i.siret && <p className="text-muted-foreground">SIRET {i.siret}</p>}
      {i.adresse && <p className="text-muted-foreground">{i.adresse}</p>}
      {i.representant && <p className="text-muted-foreground">Représenté(e) par {i.representant}</p>}
    </div>
  );
}

export default async function ContratPrestationPublicPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const contrat = await prisma.contratPrestation.findUnique({
    where: { token },
    include: { organisme: true },
  });
  if (!contrat) notFound();

  const prestataire = await getPrestataire();
  const client = clientFromOrg(contrat.organisme);
  const data = contratDataFrom(contrat);
  const net = montantNet(data.montantMensuel, data.remisePct);
  const total = montantEngagement(net, data.engagement);
  const signed = contrat.statut === "SIGNE";

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6 text-center">
        <p className="text-sm font-semibold text-primary">{prestataire.raisonSociale || prestataire.nom}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Contrat de prestation</h1>
        <p className="text-sm text-muted-foreground">
          Abonnement OFManager · Réf. {contrat.reference}
        </p>
      </div>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm text-muted-foreground">Les parties</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <Partie label="Le prestataire" i={prestataire} />
          <Partie label="Le client" i={client} />
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader className="py-3">
          <CardTitle className="text-sm text-muted-foreground">Conditions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Ligne label="Formule" value={data.formuleNom} strong />
          <Ligne label="Abonnement mensuel (HT)" value={eurosDoc(data.montantMensuel)} />
          {data.remisePct > 0 && <Ligne label="Remise commerciale" value={`− ${data.remisePct} %`} />}
          <Ligne label="Montant mensuel net (HT)" value={eurosDoc(net)} strong />
          <Ligne label="Engagement" value={ENGAGEMENT_LABELS[data.engagement]} />
          {data.engagement === "ANNUEL" && <Ligne label="Total annuel (HT)" value={eurosDoc(total)} />}
          <Ligne label="Date d'effet" value={fmtDate(data.dateDebut)} />
          {data.options.length > 0 && (
            <div className="pt-1">
              <p className="text-muted-foreground">Options incluses :</p>
              <ul className="ml-4 list-disc">
                {data.options.map((o, i) => <li key={i}>{o}</li>)}
              </ul>
            </div>
          )}
          <p className="border-t pt-2 text-xs text-muted-foreground">
            Prix HT — paiement par prélèvement SEPA à échéance mensuelle. Reconduction tacite,
            résiliation avec préavis de 30 jours. Données hébergées dans l&apos;UE (RGPD, accord de
            sous-traitance annexé).
          </p>
        </CardContent>
      </Card>

      <div className="mt-6">
        {signed ? (
          <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50/70 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Contrat signé.</p>
              <p>
                Signé par {contrat.signataireNom} le {fmtDate(contrat.signedAt)}. Merci — une copie
                est conservée par le prestataire.
              </p>
            </div>
          </div>
        ) : (
          <>
            <p className="mb-3 flex items-center gap-1.5 text-sm font-medium">
              <FileText className="h-4 w-4 text-primary" /> Signez votre contrat
            </p>
            <ContratPrestationSignForm token={token} defaultName={client.representant ?? ""} />
          </>
        )}
      </div>
    </main>
  );
}

function Ligne({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "font-semibold" : ""}>{value}</span>
    </div>
  );
}
