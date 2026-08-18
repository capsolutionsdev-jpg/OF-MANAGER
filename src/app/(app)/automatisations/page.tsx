import { Bell, Clock, ChevronDown } from "lucide-react";
import { requireTenant } from "@/lib/tenant";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageHeader } from "@/components/ui/page-header";
import { emailConfigured } from "@/lib/email";
import { toggleWorkflowRule } from "@/lib/actions/email-actions";
import { RunAutomationsButton } from "@/components/automatisations/run-automations-button";
import { CreateRuleDialog } from "@/components/automatisations/create-rule-dialog";
import { EmailLogTable, type EmailRow } from "@/components/automatisations/email-log-table";
import { TRIGGER_LABELS, ACTION_LABELS } from "@/components/automatisations/labels";
import { getAutomationSettings } from "@/lib/automation-settings";
import { updateAutomationSettings } from "@/lib/actions/automation-settings-actions";

export default async function AutomatisationsPage() {
  const { organismeId, db } = await requireTenant();
  const [rules, emails, settings] = await Promise.all([
    db.workflowRule.findMany({ orderBy: { createdAt: "desc" } }),
    db.emailLog.findMany({ orderBy: { createdAt: "desc" }, take: 25 }),
    getAutomationSettings(organismeId),
  ]);
  const demo = !emailConfigured();

  const toggles: { key: string; label: string; checked: boolean }[] = [
    { key: "convocationActive", label: "Convocation (avant la session)", checked: settings.convocationActive },
    { key: "attestationEntreeActive", label: "Attestation d'entrée (1er jour)", checked: settings.attestationEntreeActive },
    { key: "emargementActive", label: "Émargement quotidien (matin / après-midi)", checked: settings.emargementActive },
    { key: "satisfactionActive", label: "Enquête de satisfaction (fin)", checked: settings.satisfactionActive },
    { key: "docsFinActive", label: "Documents de fin de formation", checked: settings.docsFinActive },
    { key: "compteRenduActive", label: "Compte-rendu pédagogique formateur", checked: settings.compteRenduActive },
  ];

  const emailRows: EmailRow[] = emails.map((e) => ({
    id: e.id,
    destinataire: e.destinataire,
    sujet: e.sujet,
    statut: e.statut,
    date: e.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Automatisations e-mail"
        subtitle={`Règles d'envoi automatique et journal des e-mails.${
          demo ? " Mode démo — renseignez BREVO_API_KEY pour l'envoi réel." : ""
        }`}
      >
        <RunAutomationsButton />
      </PageHeader>

      <Tabs defaultValue="reglages" className="space-y-6">
        <TabsList>
          <TabsTrigger value="reglages">Réglages</TabsTrigger>
          <TabsTrigger value="regles">
            Règles
            <Count n={rules.length} />
          </TabsTrigger>
          <TabsTrigger value="journal">
            Journal
            <Count n={emailRows.length} />
          </TabsTrigger>
        </TabsList>

        {/* ───────── Réglages ───────── */}
        <TabsContent value="reglages" className="space-y-6">
          {/* Encart pédagogique repliable (plus en pleine hauteur en tête) */}
          <details className="group rounded-lg border bg-muted/20 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Comment ça marche — parcours candidat automatisé
              <ChevronDown className="ml-auto h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="border-t px-4 py-3">
              <p className="mb-3 text-sm text-muted-foreground">
                Une tâche planifiée s&apos;exécute chaque jour et envoie
                automatiquement, au bon moment, les e-mails du parcours Qualiopi :
              </p>
              <ul className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                <li className="rounded-md border bg-background px-3 py-2">
                  📨 <strong>Convocation</strong> — 7 jours avant le début (docs signés)
                </li>
                <li className="rounded-md border bg-background px-3 py-2">
                  ✅ <strong>Attestation d&apos;entrée</strong> — le 1<sup>er</sup> jour
                </li>
                <li className="rounded-md border bg-background px-3 py-2">
                  ⭐ <strong>Enquête de satisfaction</strong> — à la fin (lien)
                </li>
                <li className="rounded-md border bg-background px-3 py-2">
                  📄 <strong>Documents de fin</strong> — à la fin (attestation, certificat)
                </li>
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">
                Vous pouvez aussi déclencher l&apos;ensemble immédiatement avec le
                bouton « Exécuter les automatismes » (utile pour tester).
              </p>
            </div>
          </details>

          {/* Paramètres des automatismes */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Paramètres des automatismes</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={updateAutomationSettings} className="space-y-4">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {toggles.map((t) => (
                    <label
                      key={t.key}
                      className="flex items-center gap-2 rounded-md border bg-muted/20 px-3 py-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        name={t.key}
                        defaultChecked={t.checked}
                        className="h-4 w-4"
                      />
                      {t.label}
                    </label>
                  ))}
                </div>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="convocationJMoins">
                      Délai d&apos;envoi de la convocation (jours avant le début)
                    </Label>
                    <Input
                      id="convocationJMoins"
                      name="convocationJMoins"
                      type="number"
                      min={0}
                      max={60}
                      defaultValue={settings.convocationJMoins}
                      className="w-28"
                    />
                  </div>
                  <Button type="submit">Enregistrer les paramètres</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ───────── Règles ───────── */}
        <TabsContent value="regles">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Règles d&apos;automatisation</CardTitle>
              <CardAction>
                <CreateRuleDialog />
              </CardAction>
            </CardHeader>
            <CardContent className="p-0">
              {rules.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">
                  Aucune règle. Créez-en une avec le bouton « + Règle »
                  (déclencheur + action).
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Déclencheur</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Décalage</TableHead>
                      <TableHead className="text-right">État</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rules.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.nom}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {TRIGGER_LABELS[r.trigger]}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {ACTION_LABELS[r.action]}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {r.offsetDays === 0
                            ? "Le jour J"
                            : r.offsetDays > 0
                              ? `J+${r.offsetDays}`
                              : `J${r.offsetDays}`}
                        </TableCell>
                        <TableCell className="text-right">
                          <form action={toggleWorkflowRule}>
                            <input type="hidden" name="id" value={r.id} />
                            <Button type="submit" size="sm" variant="ghost">
                              <Badge variant={r.isActive ? "default" : "secondary"}>
                                {r.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </Button>
                          </form>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ───────── Journal ───────── */}
        <TabsContent value="journal">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="h-4 w-4" /> Journal des e-mails
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EmailLogTable emails={emailRows} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** Petit compteur affiché dans un onglet. */
function Count({ n }: { n: number }) {
  return (
    <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[0.7rem] font-semibold tabular-nums text-muted-foreground">
      {n}
    </span>
  );
}
