"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  ChevronDown,
  Save,
  Video,
  FileText,
  HelpCircle,
  Paperclip,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addModule,
  deleteModule,
  addLecon,
  updateLecon,
  deleteLecon,
} from "@/lib/actions/cours-actions";

export type BuilderLecon = {
  id: string;
  titre: string;
  contenu: string;
  videoUrl: string;
  dureeMin: number | null;
  ressources: { label: string; url: string }[];
  quiz: { enonce: string; options: string[]; reponse: number }[];
  isPublished: boolean;
};
export type BuilderModule = { id: string; titre: string; lecons: BuilderLecon[] };

const fieldCls =
  "w-full rounded-md border border-input bg-transparent p-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40";

export function CoursBuilder({
  coursId,
  modules,
}: {
  coursId: string;
  modules: BuilderModule[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [newModule, setNewModule] = useState("");

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, ok?: string) {
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) toast.error(res.error ?? "Erreur.");
      else {
        if (ok) toast.success(ok);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      {modules.length === 0 && (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Aucun module. Ajoutez votre premier module ci-dessous.
        </p>
      )}

      {modules.map((m, mi) => (
        <ModuleBlock key={m.id} module={m} index={mi} run={run} />
      ))}

      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-3">
        <Input
          value={newModule}
          onChange={(e) => setNewModule(e.target.value)}
          placeholder="Titre du nouveau module (ex. Module 1 — Introduction)"
          className="flex-1"
        />
        <Button
          size="sm"
          disabled={isPending || !newModule.trim()}
          onClick={() =>
            run(async () => {
              const r = await addModule(coursId, newModule);
              if (r.ok) setNewModule("");
              return r;
            }, "Module ajouté.")
          }
        >
          <Plus className="mr-1.5 h-4 w-4" /> Ajouter un module
        </Button>
      </div>
    </div>
  );
}

function ModuleBlock({
  module,
  index,
  run,
}: {
  module: BuilderModule;
  index: number;
  run: (fn: () => Promise<{ ok: boolean; error?: string }>, ok?: string) => void;
}) {
  const [newLecon, setNewLecon] = useState("");
  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
        <span className="text-sm font-semibold">
          {index + 1}. {module.titre}
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {module.lecons.length} leçon{module.lecons.length > 1 ? "s" : ""}
          </span>
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Supprimer le module"
          onClick={() => {
            if (confirm("Supprimer ce module et ses leçons ?"))
              run(() => deleteModule(module.id), "Module supprimé.");
          }}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>

      <div className="space-y-2 p-3">
        {module.lecons.map((l) => (
          <LeconBlock key={l.id} lecon={l} run={run} />
        ))}

        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={newLecon}
            onChange={(e) => setNewLecon(e.target.value)}
            placeholder="Titre de la nouvelle leçon"
            className="flex-1"
          />
          <Button
            size="sm"
            variant="outline"
            disabled={!newLecon.trim()}
            onClick={() =>
              run(async () => {
                const r = await addLecon(module.id, newLecon);
                if (r.ok) setNewLecon("");
                return r;
              }, "Leçon ajoutée.")
            }
          >
            <Plus className="mr-1.5 h-4 w-4" /> Ajouter une leçon
          </Button>
        </div>
      </div>
    </div>
  );
}

function LeconBlock({
  lecon,
  run,
}: {
  lecon: BuilderLecon;
  run: (fn: () => Promise<{ ok: boolean; error?: string }>, ok?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [titre, setTitre] = useState(lecon.titre);
  const [videoUrl, setVideoUrl] = useState(lecon.videoUrl);
  const [dureeMin, setDureeMin] = useState(lecon.dureeMin?.toString() ?? "");
  const [contenu, setContenu] = useState(lecon.contenu);
  const [ressources, setRessources] = useState(lecon.ressources);
  const [quiz, setQuiz] = useState(lecon.quiz);
  const [isPublished, setIsPublished] = useState(lecon.isPublished);

  function save() {
    run(
      () =>
        updateLecon(lecon.id, {
          titre,
          videoUrl,
          dureeMin: dureeMin ? parseInt(dureeMin, 10) : null,
          contenu,
          ressources,
          quiz,
          isPublished,
        }),
      "Leçon enregistrée.",
    );
  }

  return (
    <div className="rounded-lg border bg-background">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm"
      >
        <span className="flex items-center gap-2 font-medium">
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          {titre || "Leçon sans titre"}
          {lecon.videoUrl && <Video className="h-3.5 w-3.5 text-primary" />}
          {lecon.quiz.length > 0 && (
            <HelpCircle className="h-3.5 w-3.5 text-amber-600" />
          )}
          {!isPublished && (
            <span className="rounded bg-muted px-1.5 text-[10px] text-muted-foreground">
              brouillon
            </span>
          )}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="space-y-3 border-t p-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <input
              className={`${fieldCls} sm:col-span-2`}
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              placeholder="Titre de la leçon"
            />
            <input
              className={fieldCls}
              value={dureeMin}
              onChange={(e) => setDureeMin(e.target.value)}
              inputMode="numeric"
              placeholder="Durée (min)"
            />
          </div>

          <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Video className="h-3.5 w-3.5" /> Lien vidéo (YouTube / Vimeo)
          </label>
          <input
            className={fieldCls}
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=…"
          />

          <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <FileText className="h-3.5 w-3.5" /> Contenu (texte)
          </label>
          <textarea
            className={`${fieldCls} min-h-[120px]`}
            value={contenu}
            onChange={(e) => setContenu(e.target.value)}
            placeholder="Le texte de la leçon. Vous pouvez coller du HTML simple (titres, listes, gras…)."
          />

          {/* Ressources */}
          <div className="rounded-md border p-2.5">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold">
              <Paperclip className="h-3.5 w-3.5" /> Ressources téléchargeables
            </p>
            {ressources.map((r, i) => (
              <div key={i} className="mb-2 flex flex-wrap gap-2">
                <input
                  className={`${fieldCls} flex-1`}
                  value={r.label}
                  onChange={(e) =>
                    setRessources((prev) =>
                      prev.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)),
                    )
                  }
                  placeholder="Nom (ex. Support PDF)"
                />
                <input
                  className={`${fieldCls} flex-1`}
                  value={r.url}
                  onChange={(e) =>
                    setRessources((prev) =>
                      prev.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)),
                    )
                  }
                  placeholder="URL du fichier (PDF…)"
                />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setRessources((prev) => prev.filter((_, j) => j !== i))}
                  aria-label="Retirer"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRessources((prev) => [...prev, { label: "", url: "" }])}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Ajouter une ressource
            </Button>
          </div>

          {/* Quiz */}
          <div className="rounded-md border p-2.5">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold">
              <HelpCircle className="h-3.5 w-3.5" /> Quiz de la leçon (optionnel)
            </p>
            {quiz.map((q, i) => (
              <div key={i} className="mb-3 rounded border bg-muted/20 p-2">
                <input
                  className={`${fieldCls} mb-1.5`}
                  value={q.enonce}
                  onChange={(e) =>
                    setQuiz((prev) =>
                      prev.map((x, j) => (j === i ? { ...x, enonce: e.target.value } : x)),
                    )
                  }
                  placeholder="Question"
                />
                <textarea
                  className={`${fieldCls} mb-1.5 min-h-[60px]`}
                  value={q.options.join("\n")}
                  onChange={(e) =>
                    setQuiz((prev) =>
                      prev.map((x, j) =>
                        j === i
                          ? { ...x, options: e.target.value.split("\n") }
                          : x,
                      ),
                    )
                  }
                  placeholder="Une réponse par ligne"
                />
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs text-muted-foreground">
                    N° de la bonne réponse :
                    <input
                      className="ml-2 w-16 rounded border border-input bg-transparent px-1.5 py-0.5 text-sm"
                      value={q.reponse + 1}
                      onChange={(e) =>
                        setQuiz((prev) =>
                          prev.map((x, j) =>
                            j === i
                              ? {
                                  ...x,
                                  reponse: Math.max(0, (parseInt(e.target.value, 10) || 1) - 1),
                                }
                              : x,
                          ),
                        )
                      }
                      inputMode="numeric"
                    />
                  </label>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setQuiz((prev) => prev.filter((_, j) => j !== i))}
                    aria-label="Retirer la question"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setQuiz((prev) => [...prev, { enonce: "", options: ["", ""], reponse: 0 }])
              }
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Ajouter une question
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
              />
              Leçon publiée
            </label>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (confirm("Supprimer cette leçon ?"))
                    run(() => deleteLecon(lecon.id), "Leçon supprimée.");
                }}
              >
                <Trash2 className="mr-1.5 h-4 w-4 text-destructive" /> Supprimer
              </Button>
              <Button size="sm" onClick={save}>
                <Save className="mr-1.5 h-4 w-4" /> Enregistrer la leçon
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
