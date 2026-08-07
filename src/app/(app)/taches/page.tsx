import Link from "next/link";
import { Check, ListTodo, Trash2, CalendarClock, User as UserIcon } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import {
  CreateTacheForm,
  type CandidatOption,
} from "@/components/taches/create-tache-form";
import { toggleTache, deleteTache } from "@/lib/actions/tache-actions";

export const dynamic = "force-dynamic";

type TacheRow = {
  id: string;
  titre: string;
  description: string | null;
  dueDate: Date | null;
  done: boolean;
  candidatId: string | null;
};

export default async function TachesPage() {
  const db = await getTenantDb();

  const [taches, candidats] = await Promise.all([
    db.tache.findMany({ orderBy: [{ done: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }] }),
    db.candidat.findMany({
      where: { statut: { not: "ARCHIVE" } },
      select: { id: true, prenom: true, nom: true },
      orderBy: [{ nom: "asc" }, { prenom: "asc" }],
    }),
  ]);

  const candidatMap = new Map(candidats.map((c) => [c.id, `${c.prenom} ${c.nom}`]));
  const options: CandidatOption[] = candidats.map((c) => ({
    id: c.id,
    label: `${c.prenom} ${c.nom}`,
  }));

  const todo = (taches as TacheRow[]).filter((t) => !t.done);
  const done = (taches as TacheRow[]).filter((t) => t.done);
  const now = new Date();
  const enRetard = todo.filter((t) => t.dueDate && t.dueDate < now).length;

  const fmt = (d: Date | null) => (d ? d.toLocaleDateString("fr-FR") : null);

  function Row({ t }: { t: TacheRow }) {
    const late = !t.done && t.dueDate && t.dueDate < now;
    const candidatName = t.candidatId ? candidatMap.get(t.candidatId) : null;
    return (
      <div className="flex items-start gap-3 border-b px-4 py-3 last:border-0">
        <form action={toggleTache}>
          <input type="hidden" name="id" value={t.id} />
          <input type="hidden" name="done" value={String(t.done)} />
          <button
            type="submit"
            aria-label={t.done ? "Marquer à faire" : "Marquer terminée"}
            className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded border ${
              t.done
                ? "border-emerald-500 bg-emerald-500 text-white"
                : "border-input hover:border-primary"
            }`}
          >
            {t.done && <Check className="h-3.5 w-3.5" />}
          </button>
        </form>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-medium ${t.done ? "text-muted-foreground line-through" : ""}`}>
            {t.titre}
          </p>
          {t.description && (
            <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {t.dueDate && (
              <span
                className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] ${
                  late ? "bg-red-500/10 text-red-700 dark:text-red-300" : "bg-muted text-muted-foreground"
                }`}
              >
                <CalendarClock className="h-3 w-3" /> {fmt(t.dueDate)}
                {late ? " · en retard" : ""}
              </span>
            )}
            {candidatName && (
              <Link
                href={`/candidats/${t.candidatId}`}
                className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[11px] text-primary hover:underline"
              >
                <UserIcon className="h-3 w-3" /> {candidatName}
              </Link>
            )}
          </div>
        </div>
        <form action={deleteTache}>
          <input type="hidden" name="id" value={t.id} />
          <button
            type="submit"
            aria-label="Supprimer"
            className="mt-0.5 text-muted-foreground/60 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tâches & rappels"
        subtitle={
          todo.length === 0
            ? "Aucune tâche en cours"
            : `${todo.length} à faire${enRetard > 0 ? ` · ${enRetard} en retard` : ""}`
        }
      >
        <CreateTacheForm candidats={options} />
      </PageHeader>

      <Card>
        <CardContent className="p-0">
          {todo.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-12 text-center">
              <ListTodo className="h-8 w-8 text-muted-foreground" />
              <p className="font-medium">Rien à faire pour l&apos;instant</p>
              <p className="text-sm text-muted-foreground">
                Ajoutez une tâche ou un rappel pour ne rien oublier.
              </p>
            </div>
          ) : (
            todo.map((t) => <Row key={t.id} t={t} />)
          )}
        </CardContent>
      </Card>

      {done.length > 0 && (
        <div className="space-y-2">
          <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Terminées ({done.length})
          </p>
          <Card>
            <CardContent className="p-0">
              {done.map((t) => (
                <Row key={t.id} t={t} />
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
