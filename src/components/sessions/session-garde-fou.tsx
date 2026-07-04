import { ShieldAlert, ShieldCheck, FileWarning, PenLine, Send, ClipboardList } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export type GardeFouGroup = { key: string; label: string; noms: string[] };

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  dossier: FileWarning,
  signature: PenLine,
  convocation: Send,
  positionnement: ClipboardList,
};

/** Garde-fou : synthèse des tâches à compléter pour la session. */
export function SessionGardeFou({ groups }: { groups: GardeFouGroup[] }) {
  const actifs = groups.filter((g) => g.noms.length > 0);
  const total = actifs.reduce((n, g) => n + g.noms.length, 0);

  if (total === 0) {
    return (
      <Card className="border-emerald-200 bg-emerald-50/50">
        <CardContent className="flex items-center gap-2 py-3 text-sm font-medium text-emerald-800">
          <ShieldCheck className="h-4 w-4" /> Garde-fou : tout est à jour pour cette session ✓
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-200 bg-amber-50/40">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base text-amber-900">
          <ShieldAlert className="h-4 w-4" /> Garde-fou — à compléter
          <Badge className="bg-amber-500/15 text-amber-800">{total} point{total > 1 ? "s" : ""}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {actifs.map((g) => {
          const Icon = ICONS[g.key] ?? FileWarning;
          return (
            <div key={g.key} className="rounded-lg border border-amber-200 bg-white p-3">
              <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-amber-900">
                <Icon className="h-4 w-4" /> {g.label}
                <span className="ml-auto rounded-full bg-amber-100 px-2 text-xs font-medium text-amber-800">
                  {g.noms.length}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {g.noms.slice(0, 8).join(", ")}
                {g.noms.length > 8 ? `… (+${g.noms.length - 8})` : ""}
              </p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
