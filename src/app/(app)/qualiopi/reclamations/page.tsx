import Link from "next/link";
import { ArrowLeft, AlertTriangle, CheckCircle2 } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  creerReclamation,
  avancerReclamation,
  supprimerReclamation,
} from "@/lib/actions/registre-actions";

export const dynamic = "force-dynamic";

const ORIGINES: Record<string, string> = {
  STAGIAIRE: "Stagiaire",
  FORMATEUR: "Formateur",
  ENTREPRISE: "Entreprise cliente",
  FINANCEUR: "Financeur (OPCO/CPF…)",
  AUTRE: "Autre",
};

const STATUTS: Record<string, { label: string; cls: string }> = {
  NOUVELLE: { label: "Nouvelle", cls: "bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-300" },
  ACCUSE_RECEPTION: { label: "AR envoyé", cls: "bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  EN_TRAITEMENT: { label: "En traitement", cls: "bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300" },
  CLOTUREE: { label: "Clôturée", cls: "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
};

const GRAVITES = ["", "Mineure", "Modérée", "Majeure"];

function joursOuvresDepuis(d: Date): number {
  let n = 0;
  const cur = new Date(d);
  const now = new Date();
  while (cur < now) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) n++;
    cur.setDate(cur.getDate() + 1);
  }
  return n;
}

export default async function ReclamationsPage() {
  const db = await getTenantDb();
  const reclamations = await db.reclamation.findMany({
    orderBy: { date: "desc" },
  });
  const ouvertes = reclamations.filter((r) => r.statut !== "CLOTUREE");
  const fmt = (d: Date | null) => (d ? d.toLocaleDateString("fr-FR") : "—");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/qualiopi"
            className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline"
          >
            <ArrowLeft className="h-3 w-3" /> Conformité Qualiopi
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">
            Registre des réclamations
          </h1>
          <p className="text-sm text-muted-foreground">
            Traitement des aléas, difficultés et réclamations (indicateurs 31-32).
            Objectifs : accusé de réception sous 5 jours ouvrés, réponse sous 15 jours ouvrés.
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {ouvertes.length} en cours / {reclamations.length} au total
        </Badge>
      </div>

      {/* Nouvelle réclamation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Enregistrer une réclamation</CardTitle>
          <CardDescription>
            Toute réclamation reçue (e-mail, courrier, oral formalisé) est enregistrée ici, datée et identifiée.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={creerReclamation} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="declarant">Réclamant (nom)</Label>
              <Input id="declarant" name="declarant" required placeholder="Nom du réclamant" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact">Contact (e-mail / téléphone)</Label>
              <Input id="contact" name="contact" placeholder="contact@exemple.fr" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="origine">Origine</Label>
              <select
                id="origine"
                name="origine"
                className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
              >
                {Object.entries(ORIGINES).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gravite">Gravité</Label>
              <select
                id="gravite"
                name="gravite"
                className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
              >
                <option value="1">Mineure</option>
                <option value="2">Modérée</option>
                <option value="3">Majeure</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="formation">Formation / session concernée</Label>
              <Input id="formation" name="formation" placeholder="ex. SST — session de janvier" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="objet">Objet</Label>
              <Input id="objet" name="objet" required placeholder="Objet de la réclamation" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="description">Description de l&apos;écart</Label>
              <textarea
                id="description"
                name="description"
                required
                rows={3}
                className="w-full rounded-md border bg-transparent p-3 text-sm"
                placeholder="Description détaillée de l'aléa, l'anomalie ou la réclamation…"
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit">Enregistrer au registre</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Registre */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registre</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {reclamations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune réclamation enregistrée. C&apos;est une bonne nouvelle — le registre
              vide reste une preuve : il montre que le dispositif existe.
            </p>
          ) : (
            reclamations.map((r) => {
              const st = STATUTS[r.statut];
              const retardAr =
                r.statut === "NOUVELLE" && joursOuvresDepuis(r.date) > 5;
              const retardReponse =
                r.statut !== "CLOTUREE" && joursOuvresDepuis(r.date) > 15;
              return (
                <div key={r.id} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className={st.cls}>{st.label}</Badge>
                      <span className="text-sm font-semibold">{r.objet}</span>
                      <span className="text-xs text-muted-foreground">
                        {ORIGINES[r.origine]} · gravité {GRAVITES[r.gravite]}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      reçue le {fmt(r.date)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{r.description}</p>
                  <div className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-3">
                    <span>Réclamant : {r.declarant}{r.contact ? ` (${r.contact})` : ""}</span>
                    <span>Formation : {r.formation ?? "—"}</span>
                    <span>AR : {fmt(r.arDate)} · Réponse : {fmt(r.reponseDate)} · Clôture : {fmt(r.clotureDate)}</span>
                  </div>
                  {(retardAr || retardReponse) && (
                    <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-red-600">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {retardAr
                        ? "Accusé de réception en retard (objectif : 5 jours ouvrés)."
                        : "Réponse en retard (objectif : 15 jours ouvrés)."}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {r.statut === "NOUVELLE" && (
                      <form action={avancerReclamation}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="statut" value="ACCUSE_RECEPTION" />
                        <Button type="submit" size="sm" variant="outline">
                          AR envoyé
                        </Button>
                      </form>
                    )}
                    {(r.statut === "NOUVELLE" || r.statut === "ACCUSE_RECEPTION") && (
                      <form action={avancerReclamation}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="statut" value="EN_TRAITEMENT" />
                        <Button type="submit" size="sm" variant="outline">
                          Passer en traitement
                        </Button>
                      </form>
                    )}
                    {r.statut !== "CLOTUREE" && (
                      <form action={avancerReclamation}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="statut" value="CLOTUREE" />
                        <Button type="submit" size="sm">
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Clôturer
                        </Button>
                      </form>
                    )}
                    <form action={supprimerReclamation}>
                      <input type="hidden" name="id" value={r.id} />
                      <Button type="submit" size="sm" variant="ghost" className="text-destructive">
                        Supprimer
                      </Button>
                    </form>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
