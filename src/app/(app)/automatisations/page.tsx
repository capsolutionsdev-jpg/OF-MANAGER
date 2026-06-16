import { Bell, Plus, Clock } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
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
import { emailConfigured } from "@/lib/email";
import {
  createWorkflowRule,
  toggleWorkflowRule,
} from "@/lib/actions/email-actions";
import { RunAutomationsButton } from "@/components/automatisations/run-automations-button";
import { getAutomationSettings } from "@/lib/automation-settings";
import { updateAutomationSettings } from "@/lib/actions/automation-settings-actions";

const TRIGGER_LABELS: Record<string, string> = {
  AVANT_SESSION: "Avant la session",
  DEBUT_SESSION: "Au début de la session",
  PENDANT_SESSION: "Pendant la session",
  FIN_SESSION: "À la fin de la session",
  APRES_SESSION: "Après la session",
};
const ACTION_LABELS: Record<string, string> = {
  ENVOI_CONVOCATION: "Envoi de la convocation",
  RAPPEL: "Rappel",
  ENVOI_EMARGEMENT: "Envoi de l'émargement",
  ENVOI_ATTESTATION: "Envoi de l'attestation",
  ENVOI_CERTIFICAT: "Envoi du certificat",
  ENVOI_QUESTIONNAIRE_SATISFACTION: "Questionnaire de satisfaction",
  EMAIL_PERSONNALISE: "E-mail personnalisé",
};
const EMAIL_STATUT_LABELS: Record<string, string> = {
  EN_ATTENTE: "En attente",
  ENVOYE: "Envoyé",
  ECHEC: "Échec",
};
const selectClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50";

export default async function AutomatisationsPage() {
  const db = await getTenantDb();
  const [rules, emails, settings] = await Promise.all([
    db.workflowRule.findMany({ orderBy: { createdAt: "desc" } }),
    db.emailLog.findMany({ orderBy: { createdAt: "desc" }, take: 25 }),
    getAutomationSettings(),
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Automatisations e-mail</h1>
          <p className="text-sm text-muted-foreground">
            Règles d&apos;envoi automatique et journal des e-mails.
            {demo && " Mode démo — renseignez BREVO_API_KEY pour l'envoi réel."}
          </p>
        </div>
        <RunAutomationsButton />
      </div>

      {/* Parcours automatisé (cron quotidien) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" /> Parcours candidat automatisé
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">
            Une tâche planifiée s&apos;exécute chaque jour et envoie automatiquement,
            au bon moment, les e-mails du parcours Qualiopi :
          </p>
          <ul className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <li className="rounded-md border bg-muted/30 px-3 py-2">
              📨 <strong>Convocation</strong> — 7 jours avant le début (docs signés)
            </li>
            <li className="rounded-md border bg-muted/30 px-3 py-2">
              ✅ <strong>Attestation d&apos;entrée</strong> — le 1<sup>er</sup> jour
            </li>
            <li className="rounded-md border bg-muted/30 px-3 py-2">
              ⭐ <strong>Enquête de satisfaction</strong> — à la fin (lien)
            </li>
            <li className="rounded-md border bg-muted/30 px-3 py-2">
              📄 <strong>Documents de fin</strong> — à la fin (attestation, certificat)
            </li>
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            Vous pouvez aussi déclencher l&apos;ensemble immédiatement avec le bouton
            « Exécuter les automatismes » (utile pour tester).
          </p>
        </CardContent>
      </Card>

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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Règles d&apos;automatisation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {rules.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune règle. Créez-en une ci-dessous (déclencheur + action).
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

          <form
            action={createWorkflowRule}
            className="grid grid-cols-1 gap-3 rounded-lg border bg-muted/30 p-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end"
          >
            <div className="grid gap-1.5 lg:col-span-2">
              <Label htmlFor="nom">Nom de la règle</Label>
              <Input id="nom" name="nom" placeholder="Convocation J-7" required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="trigger">Déclencheur</Label>
              <select id="trigger" name="trigger" className={selectClass}>
                {Object.entries(TRIGGER_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="action">Action</Label>
              <select id="action" name="action" className={selectClass}>
                {Object.entries(ACTION_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="offsetDays">Décalage (jours)</Label>
              <Input id="offsetDays" name="offsetDays" type="number" defaultValue={0} />
            </div>
            <div className="lg:col-span-5">
              <Button type="submit">
                <Plus className="mr-2 h-4 w-4" /> Ajouter la règle
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4" /> Journal des e-mails
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {emails.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              Aucun e-mail envoyé pour le moment. (Ex. : « Envoyer les convocations »
              depuis une session.)
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Destinataire</TableHead>
                  <TableHead>Sujet</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emails.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-muted-foreground">
                      {e.destinataire}
                    </TableCell>
                    <TableCell className="font-medium">{e.sujet}</TableCell>
                    <TableCell>
                      <Badge
                        variant={e.statut === "ENVOYE" ? "default" : "secondary"}
                      >
                        {EMAIL_STATUT_LABELS[e.statut]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {e.createdAt.toLocaleDateString("fr-FR")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
