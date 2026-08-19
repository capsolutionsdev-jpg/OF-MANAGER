"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Save,
  Video,
  FileText,
  HelpCircle,
  Paperclip,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConfirm } from "@/components/ui/confirm-dialog";
import {
  QUIZ_TYPE_LABELS,
  type QuizType,
  type LeconQuizItem,
} from "@/lib/validators/cours";
import {
  addModule,
  deleteModule,
  moveModule,
  addLecon,
  updateLecon,
  deleteLecon,
  moveLecon,
} from "@/lib/actions/cours-actions";

export type BuilderLecon = {
  id: string;
  titre: string;
  contenu: string;
  videoUrl: string;
  dureeMin: number | null;
  images: { url: string; legende?: string }[];
  ressources: { label: string; url: string }[];
  quiz: LeconQuizItem[];
  isPublished: boolean;
};
export type BuilderModule = { id: string; titre: string; lecons: BuilderLecon[] };

const fieldCls =
  "w-full rounded-md border border-input bg-transparent p-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40";

type RunFn = (
  fn: () => Promise<{ ok: boolean; error?: string }>,
  ok?: string,
) => void;

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

  const run: RunFn = (fn, ok) =>
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) toast.error(res.error ?? "Erreur.");
      else {
        if (ok) toast.success(ok);
        router.refresh();
      }
    });

  return (
    <div className="space-y-4">
      {modules.length === 0 && (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Aucun chapitre. Ajoutez votre premier chapitre (module) ci-dessous.
        </p>
      )}

      {modules.map((m, mi) => (
        <ModuleBlock
          key={m.id}
          module={m}
          index={mi}
          total={modules.length}
          run={run}
        />
      ))}

      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-3">
        <Input
          value={newModule}
          onChange={(e) => setNewModule(e.target.value)}
          placeholder="Titre du chapitre (ex. Chapitre 1 — Introduction)"
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
            }, "Chapitre ajouté.")
          }
        >
          <Plus className="mr-1.5 h-4 w-4" /> Ajouter un chapitre
        </Button>
      </div>
    </div>
  );
}

function ModuleBlock({
  module,
  index,
  total,
  run,
}: {
  module: BuilderModule;
  index: number;
  total: number;
  run: RunFn;
}) {
  const [newLecon, setNewLecon] = useState("");
  const confirm = useConfirm();
  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
        <span className="text-sm font-semibold">
          {index + 1}. {module.titre}
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {module.lecons.length} leçon{module.lecons.length > 1 ? "s" : ""}
          </span>
        </span>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Monter"
            disabled={index === 0}
            onClick={() => run(() => moveModule(module.id, "up"))}
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Descendre"
            disabled={index === total - 1}
            onClick={() => run(() => moveModule(module.id, "down"))}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Supprimer le chapitre"
            onClick={async () => {
              if (
                await confirm({
                  title: "Supprimer ce chapitre et ses leçons ?",
                  description: "Le chapitre et toutes ses leçons seront supprimés définitivement.",
                  destructive: true,
                  confirmLabel: "Supprimer",
                })
              )
                run(() => deleteModule(module.id), "Chapitre supprimé.");
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      <div className="space-y-2 p-3">
        {module.lecons.map((l, li) => (
          <LeconBlock
            key={l.id}
            lecon={l}
            index={li}
            total={module.lecons.length}
            run={run}
          />
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
  index,
  total,
  run,
}: {
  lecon: BuilderLecon;
  index: number;
  total: number;
  run: RunFn;
}) {
  const [open, setOpen] = useState(false);
  const confirm = useConfirm();
  const [titre, setTitre] = useState(lecon.titre);
  const [videoUrl, setVideoUrl] = useState(lecon.videoUrl);
  const [dureeMin, setDureeMin] = useState(lecon.dureeMin?.toString() ?? "");
  const [contenu, setContenu] = useState(lecon.contenu);
  const [images, setImages] = useState(lecon.images);
  const [ressources, setRessources] = useState(lecon.ressources);
  const [quiz, setQuiz] = useState<LeconQuizItem[]>(lecon.quiz);
  const [isPublished, setIsPublished] = useState(lecon.isPublished);

  function save() {
    run(
      () =>
        updateLecon(lecon.id, {
          titre,
          videoUrl,
          dureeMin: dureeMin ? parseInt(dureeMin, 10) : null,
          contenu,
          images,
          ressources,
          quiz,
          isPublished,
        }),
      "Leçon enregistrée.",
    );
  }

  return (
    <div className="rounded-lg border bg-background">
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex flex-1 items-center gap-2 text-left text-sm"
        >
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-medium">{titre || "Leçon sans titre"}</span>
          {lecon.videoUrl && <Video className="h-3.5 w-3.5 text-primary" />}
          {lecon.images.length > 0 && <ImageIcon className="h-3.5 w-3.5 text-info" />}
          {lecon.quiz.length > 0 && <HelpCircle className="h-3.5 w-3.5 text-warning" />}
          {!isPublished && (
            <span className="rounded bg-muted px-1.5 text-[10px] text-muted-foreground">
              brouillon
            </span>
          )}
        </button>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Monter"
            disabled={index === 0}
            onClick={() => run(() => moveLecon(lecon.id, "up"))}
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Descendre"
            disabled={index === total - 1}
            onClick={() => run(() => moveLecon(lecon.id, "down"))}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="px-1 text-muted-foreground"
            aria-label="Ouvrir"
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

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
            <FileText className="h-3.5 w-3.5" /> Contenu (texte — HTML simple accepté)
          </label>
          <textarea
            className={`${fieldCls} min-h-[120px]`}
            value={contenu}
            onChange={(e) => setContenu(e.target.value)}
            placeholder="Le texte de la leçon. Titres, listes, gras (HTML) acceptés."
          />

          {/* Images */}
          <div className="rounded-md border p-2.5">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold">
              <ImageIcon className="h-3.5 w-3.5" /> Images de la leçon
            </p>
            {images.map((img, i) => (
              <div key={i} className="mb-2 flex flex-wrap gap-2">
                <input
                  className={`${fieldCls} flex-1`}
                  value={img.url}
                  onChange={(e) =>
                    setImages((p) => p.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))
                  }
                  placeholder="URL de l'image"
                />
                <input
                  className={`${fieldCls} flex-1`}
                  value={img.legende ?? ""}
                  onChange={(e) =>
                    setImages((p) => p.map((x, j) => (j === i ? { ...x, legende: e.target.value } : x)))
                  }
                  placeholder="Légende (optionnel)"
                />
                <Button variant="ghost" size="icon-sm" aria-label="Retirer"
                  onClick={() => setImages((p) => p.filter((_, j) => j !== i))}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm"
              onClick={() => setImages((p) => [...p, { url: "", legende: "" }])}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Ajouter une image
            </Button>
          </div>

          {/* Ressources */}
          <div className="rounded-md border p-2.5">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold">
              <Paperclip className="h-3.5 w-3.5" /> Ressources téléchargeables
            </p>
            {ressources.map((r, i) => (
              <div key={i} className="mb-2 flex flex-wrap gap-2">
                <input className={`${fieldCls} flex-1`} value={r.label}
                  onChange={(e) => setRessources((p) => p.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                  placeholder="Nom (ex. Support PDF)" />
                <input className={`${fieldCls} flex-1`} value={r.url}
                  onChange={(e) => setRessources((p) => p.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))}
                  placeholder="URL du fichier (PDF…)" />
                <Button variant="ghost" size="icon-sm" aria-label="Retirer"
                  onClick={() => setRessources((p) => p.filter((_, j) => j !== i))}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm"
              onClick={() => setRessources((p) => [...p, { label: "", url: "" }])}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Ajouter une ressource
            </Button>
          </div>

          {/* Quiz V2 */}
          <div className="rounded-md border p-2.5">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold">
              <HelpCircle className="h-3.5 w-3.5" /> Quiz (QCU / QCM / question rédigée)
            </p>
            {quiz.map((q, i) => (
              <QuizEditor
                key={i}
                item={q}
                onChange={(next) => setQuiz((p) => p.map((x, j) => (j === i ? next : x)))}
                onRemove={() => setQuiz((p) => p.filter((_, j) => j !== i))}
              />
            ))}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm"
                onClick={() => setQuiz((p) => [...p, { type: "QCU", enonce: "", options: ["", ""], bonnes: [0] }])}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> QCU
              </Button>
              <Button variant="outline" size="sm"
                onClick={() => setQuiz((p) => [...p, { type: "QCM", enonce: "", options: ["", "", ""], bonnes: [] }])}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> QCM
              </Button>
              <Button variant="outline" size="sm"
                onClick={() => setQuiz((p) => [...p, { type: "REDIGEE", enonce: "", options: [], bonnes: [], corrige: "" }])}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Question rédigée
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4" checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)} />
              Leçon publiée
            </label>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm"
                onClick={async () => {
                  if (
                    await confirm({
                      title: "Supprimer cette leçon ?",
                      destructive: true,
                      confirmLabel: "Supprimer",
                    })
                  )
                    run(() => deleteLecon(lecon.id), "Leçon supprimée.");
                }}>
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

function QuizEditor({
  item,
  onChange,
  onRemove,
}: {
  item: LeconQuizItem;
  onChange: (next: LeconQuizItem) => void;
  onRemove: () => void;
}) {
  const isChoice = item.type === "QCU" || item.type === "QCM";
  return (
    <div className="mb-3 rounded border bg-muted/20 p-2">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <select
          className="h-7 rounded border border-input bg-transparent px-1.5 text-xs"
          value={item.type}
          onChange={(e) => {
            const type = e.target.value as QuizType;
            onChange({
              ...item,
              type,
              options: type === "REDIGEE" ? [] : item.options.length ? item.options : ["", ""],
              bonnes: [],
            });
          }}
        >
          {(Object.keys(QUIZ_TYPE_LABELS) as QuizType[]).map((t) => (
            <option key={t} value={t}>
              {QUIZ_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <Button variant="ghost" size="icon-sm" aria-label="Retirer la question" onClick={onRemove}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>

      <input
        className={`${fieldCls} mb-1.5`}
        value={item.enonce}
        onChange={(e) => onChange({ ...item, enonce: e.target.value })}
        placeholder="Énoncé de la question"
      />

      {isChoice ? (
        <div className="space-y-1">
          {item.options.map((opt, oi) => {
            const checked = item.bonnes.includes(oi);
            return (
              <div key={oi} className="flex items-center gap-2">
                <input
                  type={item.type === "QCU" ? "radio" : "checkbox"}
                  checked={checked}
                  onChange={() => {
                    if (item.type === "QCU") onChange({ ...item, bonnes: [oi] });
                    else
                      onChange({
                        ...item,
                        bonnes: checked
                          ? item.bonnes.filter((b) => b !== oi)
                          : [...item.bonnes, oi],
                      });
                  }}
                  title="Bonne réponse"
                />
                <input
                  className={`${fieldCls} flex-1`}
                  value={opt}
                  onChange={(e) =>
                    onChange({
                      ...item,
                      options: item.options.map((x, j) => (j === oi ? e.target.value : x)),
                    })
                  }
                  placeholder={`Réponse ${oi + 1}`}
                />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Retirer la réponse"
                  onClick={() =>
                    onChange({
                      ...item,
                      options: item.options.filter((_, j) => j !== oi),
                      bonnes: item.bonnes.filter((b) => b !== oi).map((b) => (b > oi ? b - 1 : b)),
                    })
                  }
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            );
          })}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onChange({ ...item, options: [...item.options, ""] })}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Réponse
          </Button>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Cochez {item.type === "QCU" ? "la bonne réponse" : "les bonnes réponses"}.
          </p>
        </div>
      ) : (
        <textarea
          className={`${fieldCls} min-h-[60px]`}
          value={item.corrige ?? ""}
          onChange={(e) => onChange({ ...item, corrige: e.target.value })}
          placeholder="Corrigé / éléments de réponse attendus (visible par le correcteur)"
        />
      )}
    </div>
  );
}
