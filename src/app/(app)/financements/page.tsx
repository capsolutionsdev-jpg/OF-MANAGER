import { Landmark } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getTenantDb } from "@/lib/tenant";
import { appBaseUrl } from "@/lib/token";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WedofConnexion } from "@/components/financements/wedof-connexion";
import { WedofSyncButton } from "@/components/financements/wedof-sync-button";
import { NewOpcoDossier } from "@/components/financements/new-opco-dossier";
import { OpcoDossierActions } from "@/components/financements/opco-dossier-actions";
import { saveWedofWebhookSecret } from "@/lib/actions/financements-actions";

export const dynamic = "force-dynamic";

// Enveloppe pour le <form> : une action de formulaire doit renvoyer void.
async function submitWebhookSecret(formData: FormData) {
  "use server";
  await saveWedofWebhookSecret(formData);
}

const ETAT_LABEL: Record<string, string> = {
  A_MONTER: "À monter", EN_COURS: "En cours", ACCEPTE: "Accepté", REFUSE: "Refusé",
  A_FACTURER: "À facturer", FACTURE: "Facturé", SOLDE: "Soldé", ANNULE: "Annulé",
};

export default async function FinancementsPage() {
  const session = await auth();
  const orgId = session?.user?.organismeId ?? null;
  const org = orgId
    ? await prisma.organisme.findUnique({
        where: { id: orgId },
        select: { wedofApiKey: true, wedofWebhookSecret: true },
      })
    : null;
  const wedofConnecte = !!org?.wedofApiKey;
  const webhookConfigure = !!org?.wedofWebhookSecret;
  const webhookUrl = orgId ? `${appBaseUrl()}/api/webhooks/wedof/${orgId}` : "";

  const db = await getTenantDb();
  const [dossiers, inscriptionsRaw] = await Promise.all([
    db.dossierFinancement.findMany({
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: { candidat: { select: { nom: true, prenom: true } } },
    }),
    db.inscription.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        candidat: { select: { nom: true, prenom: true } },
        session: { select: { formation: { select: { titre: true } } } },
      },
    }),
  ]);
  const inscriptions = inscriptionsRaw.map((i) => ({
    id: i.id,
    label: `${i.candidat.prenom} ${i.candidat.nom} — ${i.session?.formation?.titre ?? "formation"}`,
  }));

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Landmark className="h-6 w-6 text-primary" /> Financements
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Suivi des prises en charge CPF (via Wedof) et OPCO — sans ressaisie.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">CPF — connexion Wedof</CardTitle></CardHeader>
        <CardContent><WedofConnexion connected={wedofConnecte} /></CardContent>
      </Card>

      {wedofConnecte && (
        <Card>
          <CardHeader><CardTitle className="text-base">Notifications temps réel (optionnel)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Pour que les dossiers CPF se mettent à jour <b>automatiquement</b>, ajoutez dans Wedof
              (menu « Webhooks ») un webhook vers cette adresse, avec un secret de votre choix —
              puis collez le même secret ci-dessous.
            </p>
            <div className="grid gap-1.5">
              <label className="text-xs font-medium">Adresse du webhook (à coller dans Wedof)</label>
              <Input readOnly value={webhookUrl} className="font-mono text-xs" />
            </div>
            <form action={submitWebhookSecret} className="flex items-end gap-2">
              <div className="grid flex-1 gap-1.5">
                <label htmlFor="wh-secret" className="text-xs font-medium">
                  Secret du webhook {webhookConfigure ? "(déjà configuré — laisser vide pour garder)" : ""}
                </label>
                <Input id="wh-secret" name="wedofWebhookSecret" type="password" placeholder="votre secret Wedof" autoComplete="off" />
              </div>
              <Button type="submit" variant="outline">Enregistrer</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">Dossiers de financement</CardTitle>
          <div className="flex items-center gap-2">
            {wedofConnecte && <WedofSyncButton />}
            <NewOpcoDossier inscriptions={inscriptions} />
          </div>
        </CardHeader>
        <CardContent>
          {dossiers.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Aucun dossier pour l&apos;instant. Créez un dossier OPCO, ou connectez Wedof pour le CPF.
            </p>
          ) : (
            <div className="divide-y">
              {dossiers.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium">
                      {d.candidat ? `${d.candidat.prenom} ${d.candidat.nom}` : "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {d.type}
                      {d.financeur ? ` · ${d.financeur}` : ""}
                      {d.montant ? ` · ${Number(d.montant).toLocaleString("fr-FR")} €` : ""}
                    </div>
                  </div>
                  {d.type === "OPCO" ? (
                    <OpcoDossierActions id={d.id} etat={d.etat} />
                  ) : (
                    <Badge variant="outline">{ETAT_LABEL[d.etat] ?? d.etat}</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
