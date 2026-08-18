"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Sparkles,
  RefreshCw,
  Copy,
  Save,
  Check,
  X,
  Download,
  AlertTriangle,
  Loader2,
  CalendarClock,
  CheckCircle2,
} from "lucide-react";
import type { SocialPlatform } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SOCIAL_PLATFORMS, platformByEnum } from "@/lib/social-platforms";
import {
  genererContenuSession,
  regenererAsset,
  mettreAJourAsset,
  validerAsset,
  planifierAsset,
  marquerPublie,
} from "@/lib/actions/social-content-actions";

export type AssetStatut = "BROUILLON" | "A_VALIDER" | "APPROUVE" | "REJETE";

export type AssetView = {
  id: string;
  platform: SocialPlatform;
  statut: AssetStatut;
  version: number;
  notesValidation: string | null;
  valideLe: string | null;
  scheduledAt: string | null;
  publishedAt: string | null;
  content: {
    titre: string;
    corps: string;
    cta: string;
    hashtags: string[];
    avertissements: string[];
  };
};

/** ISO (UTC) → valeur d'un <input type="datetime-local"> (heure locale). */
function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

const STATUT_META: Record<AssetStatut, { label: string; className: string }> = {
  BROUILLON: { label: "Brouillon", className: "border-border text-muted-foreground" },
  A_VALIDER: { label: "À valider", className: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  APPROUVE: { label: "Approuvé", className: "border-transparent bg-emerald-600 text-white" },
  REJETE: { label: "Rejeté", className: "border-transparent bg-destructive/15 text-destructive" },
};

const dotColor: Record<AssetStatut, string> = {
  BROUILLON: "bg-muted-foreground/40",
  A_VALIDER: "bg-amber-500",
  APPROUVE: "bg-emerald-500",
  REJETE: "bg-destructive",
};

export function AssetsPanel({ sessionId, assets }: { sessionId: string; assets: AssetView[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  // Plateformes présentes, dans l'ordre canonique ; plateformes manquantes.
  const present = SOCIAL_PLATFORMS.filter((p) => assets.some((a) => a.platform === p.enum));
  const missing = SOCIAL_PLATFORMS.filter((p) => !assets.some((a) => a.platform === p.enum));
  const byEnum = (e: SocialPlatform) => assets.find((a) => a.platform === e);

  const [active, setActive] = useState<string>(present[0]?.enum ?? SOCIAL_PLATFORMS[0].enum);

  function generate(platforms?: SocialPlatform[], label = "Contenus générés") {
    start(async () => {
      const res = await genererContenuSession(sessionId, platforms);
      if (!res.ok) {
        toast.error(res.error ?? "La génération a échoué.");
        return;
      }
      toast.success(`${label} (${res.count ?? 0} réseau${(res.count ?? 0) > 1 ? "x" : ""}).`);
      router.refresh();
    });
  }

  function exportAll() {
    const blocks = present.map((p) => {
      const a = byEnum(p.enum)!;
      const parts = [a.content.titre, a.content.corps, a.content.cta, a.content.hashtags.join(" ")]
        .map((s) => s.trim())
        .filter(Boolean);
      return `━━━ ${p.label} ━━━\n\n${parts.join("\n\n")}`;
    });
    const text = blocks.join("\n\n\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reseaux-sociaux-${sessionId}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("Export téléchargé (.txt).");
  }

  // ── État vide : aucune génération encore faite ──
  if (assets.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-4 p-12 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Sparkles className="size-7" />
        </span>
        <div className="space-y-1">
          <p className="font-semibold">Générez vos contenus réseaux sociaux</p>
          <p className="max-w-md text-sm text-muted-foreground">
            L&apos;IA rédige un post adapté à chaque réseau à partir des informations de la session
            (formation, dates, tarif, certification, Qualiopi…). Vous pourrez tout relire et ajuster avant publication.
          </p>
        </div>
        <Button onClick={() => generate(undefined, "Contenus générés")} disabled={pending}>
          {pending ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <Sparkles className="mr-1.5 size-4" />}
          Générer les {SOCIAL_PLATFORMS.length} réseaux
        </Button>
        <p className="text-xs text-muted-foreground">
          Aucune publication automatique : les contenus restent en brouillon jusqu&apos;à votre validation.
        </p>
      </Card>
    );
  }

  // ── Panneau avec onglets ──
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {present.length} réseau{present.length > 1 ? "x" : ""} généré{present.length > 1 ? "s" : ""}
          {" · "}
          {assets.filter((a) => a.statut === "APPROUVE").length} approuvé(s)
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {missing.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => generate(missing.map((p) => p.enum), "Réseaux manquants générés")}
              disabled={pending}
            >
              {pending ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <Sparkles className="mr-1.5 size-4" />}
              Générer les {missing.length} manquant{missing.length > 1 ? "s" : ""}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={exportAll} disabled={pending}>
            <Download className="mr-1.5 size-4" /> Exporter tout
          </Button>
        </div>
      </div>

      <Tabs value={active} onValueChange={(v) => setActive(String(v))}>
        <TabsList className="flex-wrap">
          {present.map((p) => {
            const a = byEnum(p.enum)!;
            return (
              <TabsTrigger key={p.enum} value={p.enum}>
                <span className={`size-2 rounded-full ${dotColor[a.statut]}`} aria-hidden />
                {p.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {present.map((p) => {
          const a = byEnum(p.enum)!;
          return (
            <TabsContent key={p.enum} value={p.enum} className="mt-4">
              <AssetEditor asset={a} />
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

function AssetEditor({ asset }: { asset: AssetView }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const meta = platformByEnum(asset.platform);
  const maxChars = meta?.maxChars ?? 0;

  const [titre, setTitre] = useState(asset.content.titre);
  const [corps, setCorps] = useState(asset.content.corps);
  const [cta, setCta] = useState(asset.content.cta);
  const [hashtags, setHashtags] = useState(asset.content.hashtags.join(" "));
  const [rejecting, setRejecting] = useState(false);
  const [notes, setNotes] = useState("");
  const [sched, setSched] = useState(isoToLocalInput(asset.scheduledAt));

  // « Modifié » = comparaison live avec les props (mises à jour après refresh).
  const dirty =
    titre !== asset.content.titre ||
    corps !== asset.content.corps ||
    cta !== asset.content.cta ||
    hashtags !== asset.content.hashtags.join(" ");

  const over = maxChars > 0 && corps.length > maxChars;
  const statut = STATUT_META[asset.statut];

  function save() {
    start(async () => {
      const res = await mettreAJourAsset(asset.id, {
        titre,
        corps,
        cta,
        hashtags: hashtags.split(/[\s,]+/).map((t) => t.trim()).filter(Boolean),
      });
      if (!res.ok) {
        toast.error(res.error ?? "Enregistrement impossible.");
        return;
      }
      toast.success("Modifications enregistrées.");
      router.refresh();
    });
  }

  function regen() {
    start(async () => {
      const res = await regenererAsset(asset.id);
      if (!res.ok) {
        toast.error(res.error ?? "Régénération impossible.");
        return;
      }
      toast.success(`${meta?.label ?? "Réseau"} régénéré.`);
      router.refresh();
    });
  }

  function valider(approuve: boolean) {
    start(async () => {
      const res = await validerAsset(asset.id, approuve, approuve ? undefined : notes);
      if (!res.ok) {
        toast.error(res.error ?? "Action impossible.");
        return;
      }
      toast.success(approuve ? "Contenu approuvé." : "Contenu rejeté.");
      setRejecting(false);
      setNotes("");
      router.refresh();
    });
  }

  function planifier(clear = false) {
    start(async () => {
      const iso = clear || !sched ? null : new Date(sched).toISOString();
      const res = await planifierAsset(asset.id, iso);
      if (!res.ok) {
        toast.error(res.error ?? "Planification impossible.");
        return;
      }
      if (clear) setSched("");
      toast.success(clear || !iso ? "Planification retirée." : "Publication planifiée.");
      router.refresh();
    });
  }

  function togglePublie() {
    start(async () => {
      const res = await marquerPublie(asset.id, !asset.publishedAt);
      if (!res.ok) {
        toast.error(res.error ?? "Action impossible.");
        return;
      }
      toast.success(asset.publishedAt ? "Marqué non publié." : "Marqué comme publié.");
      router.refresh();
    });
  }

  async function copy() {
    const parts = [titre, corps, cta, hashtags].map((s) => s.trim()).filter(Boolean);
    try {
      await navigator.clipboard.writeText(parts.join("\n\n"));
      toast.success("Contenu copié dans le presse-papiers.");
    } catch {
      toast.error("Copie impossible (autorisez l'accès au presse-papiers).");
    }
  }

  return (
    <Card className="space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="inline-block size-2.5 rounded-full"
            style={{ backgroundColor: meta?.color }}
            aria-hidden
          />
          <span className="font-medium">{meta?.label ?? asset.platform}</span>
          <Badge variant="outline" className={statut.className}>
            {statut.label}
          </Badge>
          {asset.version > 1 && (
            <span className="text-xs text-muted-foreground">v{asset.version}</span>
          )}
        </div>
        {meta?.guidance && (
          <span className="text-xs text-muted-foreground">{meta.guidance}</span>
        )}
      </div>

      {asset.content.avertissements.length > 0 && (
        <div className="flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <ul className="space-y-0.5">
            {asset.content.avertissements.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {asset.statut === "REJETE" && asset.notesValidation && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <span className="font-medium">Motif du rejet :</span> {asset.notesValidation}
        </div>
      )}

      <div className="grid gap-3">
        <div className="space-y-1.5">
          <Label htmlFor={`titre-${asset.id}`}>Accroche / titre</Label>
          <Input
            id={`titre-${asset.id}`}
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            placeholder="Accroche du post"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor={`corps-${asset.id}`}>Texte du post</Label>
            <span className={`text-xs tabular-nums ${over ? "font-medium text-destructive" : "text-muted-foreground"}`}>
              {corps.length}
              {maxChars > 0 ? ` / ${maxChars}` : ""} car.
            </span>
          </div>
          <Textarea
            id={`corps-${asset.id}`}
            value={corps}
            onChange={(e) => setCorps(e.target.value)}
            rows={corps.length > 600 ? 12 : 7}
            className={over ? "border-destructive focus-visible:ring-destructive/30" : undefined}
          />
          {over && (
            <p className="text-xs text-destructive">
              Dépasse la limite conseillée de {meta?.label} ({maxChars} caractères).
            </p>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={`cta-${asset.id}`}>Appel à l&apos;action</Label>
            <Input
              id={`cta-${asset.id}`}
              value={cta}
              onChange={(e) => setCta(e.target.value)}
              placeholder="Inscrivez-vous…"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`tags-${asset.id}`}>Hashtags</Label>
            <Input
              id={`tags-${asset.id}`}
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              placeholder="#formation #CPF"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2 border-t pt-4">
        <Button variant="outline" size="sm" onClick={copy} disabled={pending}>
          <Copy className="mr-1.5 size-4" /> Copier
        </Button>
        <Button size="sm" onClick={save} disabled={pending || !dirty}>
          <Save className="mr-1.5 size-4" /> Enregistrer
        </Button>
        <Button variant="outline" size="sm" onClick={regen} disabled={pending}>
          {pending ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <RefreshCw className="mr-1.5 size-4" />}
          Régénérer
        </Button>

        <div className="ml-auto flex items-center gap-2">
          {asset.statut !== "APPROUVE" && (
            <Button
              size="sm"
              onClick={() => valider(true)}
              disabled={pending || dirty}
              title={dirty ? "Enregistrez d'abord vos modifications" : undefined}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <Check className="mr-1.5 size-4" /> Approuver
            </Button>
          )}
          {asset.statut !== "REJETE" && (
            <Button variant="outline" size="sm" onClick={() => setRejecting((v) => !v)} disabled={pending}>
              <X className="mr-1.5 size-4" /> Rejeter
            </Button>
          )}
        </div>
      </div>

      {rejecting && (
        <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
          <Label htmlFor={`notes-${asset.id}`}>Motif du rejet (optionnel)</Label>
          <Textarea
            id={`notes-${asset.id}`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Ce qui doit être corrigé…"
          />
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" onClick={() => valider(false)} disabled={pending}>
              Confirmer le rejet
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setRejecting(false)} disabled={pending}>
              Annuler
            </Button>
          </div>
        </div>
      )}

      {/* Planification éditoriale — l'OF publie à la main au moment prévu. */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-muted/20 p-3">
        <div className="space-y-1.5">
          <Label htmlFor={`sched-${asset.id}`} className="flex items-center gap-1.5">
            <CalendarClock className="size-3.5" /> Publication prévue
          </Label>
          <Input
            id={`sched-${asset.id}`}
            type="datetime-local"
            value={sched}
            onChange={(e) => setSched(e.target.value)}
            className="w-auto"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => planifier(false)} disabled={pending || !sched}>
            Planifier
          </Button>
          {asset.scheduledAt && (
            <Button size="sm" variant="ghost" onClick={() => planifier(true)} disabled={pending}>
              Retirer
            </Button>
          )}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {asset.publishedAt ? (
            <Badge variant="default" className="bg-emerald-600 text-white">
              <CheckCircle2 className="mr-1 size-3" /> Publié le {fmtDateTime(asset.publishedAt)}
            </Badge>
          ) : asset.scheduledAt ? (
            <Badge variant="outline" className="border-primary/30 text-primary">
              Prévu le {fmtDateTime(asset.scheduledAt)}
            </Badge>
          ) : null}
          <Button size="sm" variant={asset.publishedAt ? "outline" : "default"} onClick={togglePublie} disabled={pending}>
            <CheckCircle2 className="mr-1.5 size-4" />
            {asset.publishedAt ? "Annuler « publié »" : "Marquer publié"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
