import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DESIGNS, THEMES, designVars } from "@/lib/themes";

export const dynamic = "force-dynamic";

/** Mini-aperçu d'un design (avec une palette donnée). */
function Preview({ designKey, color }: { designKey: string; color: string }) {
  const style = {
    ...designVars(designKey, color),
    background: "var(--background)",
    color: "var(--foreground)",
  } as CSSProperties;
  const dataDesign = designKey === "defaut" ? undefined : designKey;
  return (
    <div
      data-design={dataDesign}
      style={style}
      className="overflow-hidden rounded-xl border p-3"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-semibold">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: "var(--primary)" }} />
          Tableau de bord
        </span>
        <span
          className="rounded-md px-2 py-1 text-[10px] font-medium"
          style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
        >
          + Nouveau
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div data-slot="card" className="rounded-lg p-2" style={{ background: "var(--card)", color: "var(--card-foreground)" }}>
          <div className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>Candidats</div>
          <div className="text-lg font-bold">128</div>
        </div>
        <div data-slot="card" className="rounded-lg p-2" style={{ background: "var(--card)", color: "var(--card-foreground)" }}>
          <div className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>Sessions</div>
          <div className="text-lg font-bold" style={{ color: "var(--primary)" }}>12</div>
        </div>
      </div>
    </div>
  );
}

export default function DesignsPage() {
  return (
    <div className="space-y-6">
      <Link
        href="/console/organismes"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Retour aux organismes
      </Link>
      <PageHeader
        title="Designs disponibles"
        subtitle={`${DESIGNS.length} styles × ${THEMES.length} couleurs — mêmes fonctionnalités, look différent. À choisir par organisme dans sa configuration.`}
      />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {DESIGNS.map((d) => (
          <div key={d.key} className="space-y-2">
            <Preview designKey={d.key} color={d.defaultColor} />
            <div>
              <p className="text-sm font-medium">{d.name}</p>
              <p className="text-xs text-muted-foreground">{d.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Aperçu des couleurs proposées (sur un même style). */}
      <div className="space-y-2 pt-2">
        <p className="text-sm font-medium">Palettes de couleur</p>
        <div className="flex flex-wrap gap-2">
          {THEMES.map((t) => (
            <span key={t.key} className="flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-3 text-xs">
              <span className="h-5 w-5 rounded-full" style={{ background: t.primary }} />
              {t.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
