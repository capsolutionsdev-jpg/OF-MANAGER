import { Search } from "lucide-react";
import { requireSuperAdmin } from "@/lib/superadmin-guard";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getGlobalAuditLog, getAuditActions } from "@/lib/console-audit";

export const dynamic = "force-dynamic";

// Événements sensibles mis en évidence (sécurité / conformité).
const SENSIBLE = new Set([
  "IMPERSONATION_START",
  "IMPERSONATION_STOP",
  "FACTURE_TRANSMISE_PDP",
  "DELETE",
]);

export default async function ConsoleAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; q?: string }>;
}) {
  await requireSuperAdmin();
  const sp = await searchParams;
  const action = sp.action ?? "all";
  const q = sp.q ?? "";

  const [rows, actions] = await Promise.all([
    getGlobalAuditLog({ action, q, take: 200 }),
    getAuditActions(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Journal d'audit"
        subtitle="Tous les événements tracés de la plateforme, tous organismes confondus."
      />

      {/* Filtres (GET → rechargement serveur) */}
      <form className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Rechercher (organisme, action, entité, acteur…)"
            aria-label="Recherche"
            className="w-72 max-w-full rounded-md border bg-background py-1.5 pl-8 pr-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
        <select
          name="action"
          defaultValue={action}
          aria-label="Type d'action"
          className="rounded-md border bg-background px-2 py-1.5 text-sm"
        >
          <option value="all">Toutes les actions</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted">
          Filtrer
        </button>
      </form>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Organisme</th>
                  <th className="px-3 py-2 font-medium">Action</th>
                  <th className="px-3 py-2 font-medium">Entité</th>
                  <th className="px-3 py-2 font-medium">Acteur</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                      Aucun événement.
                    </td>
                  </tr>
                )}
                {rows.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="whitespace-nowrap px-3 py-2 tabular-nums text-muted-foreground">
                      {r.createdAt.toLocaleString("fr-FR")}
                    </td>
                    <td className="px-3 py-2">{r.orgNom ?? <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-3 py-2">
                      <Badge variant={SENSIBLE.has(r.action) ? "info" : "secondary"}>
                        {r.action}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{r.entityType}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.userLabel ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <p className="text-[11px] text-muted-foreground">{rows.length} événement(s) affiché(s) · 200 max.</p>
    </div>
  );
}
