"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Send, Undo2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  RELEASE_CATEGORIES,
  RELEASE_AUDIENCES,
  CATEGORY_LABELS,
  AUDIENCE_LABELS,
  type ReleaseCategory,
  type ReleaseAudience,
} from "@/lib/changelog";
import {
  createRelease,
  deleteRelease,
  setReleasePublished,
  addEntry,
  deleteEntry,
} from "@/lib/actions/changelog-actions";

type SerializedEntry = {
  id: string;
  category: ReleaseCategory;
  title: string;
  body: string | null;
  audience: ReleaseAudience;
  order: number;
};
type SerializedRelease = {
  id: string;
  version: string;
  name: string | null;
  releasedAt: string | null;
  entries: SerializedEntry[];
};

type ActionRes = { ok: true; data?: unknown } | { ok: false; error: string };
type RunFn = (action: () => Promise<ActionRes>, okMsg?: string) => void;

const CATEGORY_VARIANT: Record<ReleaseCategory, "success" | "info" | "warning" | "destructive"> = {
  NOUVEAUTE: "success",
  AMELIORATION: "info",
  CORRECTION: "warning",
  SECURITE: "destructive",
};

const SELECT_CLASS =
  "h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

export function ChangelogManager({ releases }: { releases: SerializedRelease[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const run: RunFn = (action, okMsg) => {
    startTransition(async () => {
      const res = await action();
      if (res.ok) {
        if (okMsg) toast.success(okMsg);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <div className="space-y-6">
      <NewReleaseForm pending={pending} run={run} />

      {releases.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune version pour l'instant. Créez la première ci-dessus.</p>
      ) : (
        releases.map((r) => <ReleaseCard key={r.id} release={r} pending={pending} run={run} />)
      )}
    </div>
  );
}

function NewReleaseForm({ pending, run }: { pending: boolean; run: RunFn }) {
  const [version, setVersion] = useState("");
  const [name, setName] = useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nouvelle version</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="cl-version">Version</Label>
          <Input
            id="cl-version"
            placeholder="2.4.0"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            className="w-28"
          />
        </div>
        <div className="min-w-40 flex-1 space-y-1">
          <Label htmlFor="cl-name">Nom (optionnel)</Label>
          <Input
            id="cl-name"
            placeholder="Espace entreprise, corbeille…"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <Button
          type="button"
          disabled={pending || version.trim() === ""}
          onClick={() => run(() => createRelease({ version: version.trim(), name: name.trim() || null }), "Version créée.")}
        >
          <Plus /> Créer
        </Button>
      </CardContent>
    </Card>
  );
}

function ReleaseCard({ release, pending, run }: { release: SerializedRelease; pending: boolean; run: RunFn }) {
  const published = release.releasedAt != null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2">
            <span>v{release.version}</span>
            {release.name ? <span className="font-normal text-muted-foreground">— {release.name}</span> : null}
          </CardTitle>
          {published ? (
            <Badge variant="success">Publié le {formatDate(release.releasedAt as string)}</Badge>
          ) : (
            <Badge variant="neutral">Brouillon</Badge>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          {published ? (
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => run(() => setReleasePublished(release.id, false), "Repassé en brouillon.")}
            >
              <Undo2 /> Dépublier
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={pending}
              onClick={() => run(() => setReleasePublished(release.id, true), "Version publiée.")}
            >
              <Send /> Publier
            </Button>
          )}
          <Button
            variant="destructive"
            size="icon-sm"
            disabled={pending}
            aria-label="Supprimer la version"
            onClick={() => {
              if (window.confirm(`Supprimer la version ${release.version} et toutes ses entrées ?`)) {
                run(() => deleteRelease(release.id), "Version supprimée.");
              }
            }}
          >
            <Trash2 />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {release.entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune entrée dans cette version.</p>
        ) : (
          <ul className="space-y-2">
            {release.entries.map((e) => (
              <li key={e.id} className="flex items-start gap-2 rounded-lg border p-2">
                <Badge variant={CATEGORY_VARIANT[e.category]}>{CATEGORY_LABELS[e.category]}</Badge>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{e.title}</p>
                  {e.body ? <p className="whitespace-pre-wrap text-sm text-muted-foreground">{e.body}</p> : null}
                </div>
                {e.audience === "INTERNE" ? <Badge variant="outline">Interne</Badge> : null}
                <Button
                  variant="ghost"
                  size="icon-xs"
                  disabled={pending}
                  aria-label="Supprimer l'entrée"
                  onClick={() => run(() => deleteEntry(e.id), "Entrée supprimée.")}
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <EntryForm releaseId={release.id} pending={pending} run={run} />
      </CardContent>
    </Card>
  );
}

function EntryForm({ releaseId, pending, run }: { releaseId: string; pending: boolean; run: RunFn }) {
  const [category, setCategory] = useState<ReleaseCategory>("NOUVEAUTE");
  const [audience, setAudience] = useState<ReleaseAudience>("CLIENT");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  return (
    <div className="space-y-2 rounded-lg border border-dashed p-3">
      <div className="flex flex-wrap items-center gap-2">
        <select
          className={SELECT_CLASS}
          value={category}
          onChange={(e) => setCategory(e.target.value as ReleaseCategory)}
          aria-label="Catégorie"
        >
          {RELEASE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
        <select
          className={SELECT_CLASS}
          value={audience}
          onChange={(e) => setAudience(e.target.value as ReleaseAudience)}
          aria-label="Audience"
        >
          {RELEASE_AUDIENCES.map((a) => (
            <option key={a} value={a}>
              {AUDIENCE_LABELS[a]}
            </option>
          ))}
        </select>
        <Input
          placeholder="Titre de la nouveauté"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="min-w-48 flex-1"
        />
      </div>
      <Textarea placeholder="Détail (optionnel)" value={body} onChange={(e) => setBody(e.target.value)} rows={2} />
      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={pending || title.trim() === ""}
          onClick={() => {
            run(
              () => addEntry(releaseId, { category, title: title.trim(), body: body.trim() || null, audience }),
              "Entrée ajoutée.",
            );
            setTitle("");
            setBody("");
          }}
        >
          <Plus /> Ajouter l'entrée
        </Button>
      </div>
    </div>
  );
}
