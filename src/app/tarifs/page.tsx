import Link from "next/link";
import type { Metadata } from "next";
import { Check, Minus, LifeBuoy, ArrowRight } from "lucide-react";
import { PLAN_ORDER, euros, type FormuleKey } from "@/lib/plans";
import { getResolvedPlans } from "@/lib/pricing";
import { FEATURES, FEATURE_GROUPS, type Feature } from "@/lib/features";

export const metadata: Metadata = {
  title: "Tarifs — OFManager",
  description: "Quatre formules pour digitaliser votre organisme de formation : Indépendant, Pro, Croissance, Réseau. Conforme Qualiopi, 100% à votre marque.",
};

// Les tarifs sont éditables dans la console → on rend la page dynamiquement
// pour refléter immédiatement tout changement de prix.
export const dynamic = "force-dynamic";

const GROUP_LABEL: Record<string, string> = {
  "Cœur": "Cœur métier & conformité",
  "Modules avancés": "Modules avancés",
  "Support": "Support",
};

export default async function TarifsPage() {
  const { plans, popular } = await getResolvedPlans();
  const has = (planKey: string, feat: string) => plans[planKey as FormuleKey].features.includes(feat);

  return (
    <div className="min-h-screen bg-[#1B1825] text-white">
      {/* Header */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold">
          <span>OF</span><span className="text-[#7B93E8]">Manager</span>
        </Link>
        <Link href="/login" className="rounded-lg border border-white/15 px-4 py-2 text-sm font-medium hover:bg-white/10">
          Se connecter
        </Link>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-6 pt-10 pb-14 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-[#9fb0d0]">
          <Check className="h-3.5 w-3.5 text-emerald-400" /> Conforme Qualiopi · BPF · 100% à votre marque
        </span>
        <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl" style={{ fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif" }}>
          Un tarif simple pour <span className="text-[#7B93E8]">chaque organisme</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-[#b9c4dd]">
          Du premier contact à la certification — gérez, formez et restez conforme sur une seule plateforme.
          Changez de formule à tout moment, le support est inclus partout.
        </p>
      </section>

      {/* Pricing cards */}
      <section className="mx-auto grid max-w-6xl gap-5 px-6 sm:grid-cols-2 lg:grid-cols-4">
        {PLAN_ORDER.map((key) => {
          const p = plans[key];
          const isPopular = key === popular;
          return (
            <div
              key={key}
              className={[
                "relative flex flex-col rounded-2xl border p-6",
                isPopular ? "border-[#7B93E8] bg-white/[0.07] shadow-[0_20px_60px_-20px_rgba(77,159,255,.5)]" : "border-white/10 bg-white/[0.03]",
              ].join(" ")}
            >
              {isPopular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#2C53C0] px-3 py-1 text-[11px] font-bold uppercase tracking-wide">
                  Le plus choisi
                </span>
              )}
              <div className="text-sm font-semibold" style={{ color: key === "INDEPENDANT" ? "#9fb0d0" : key === "PRO" ? "#7B93E8" : key === "CROISSANCE" ? "#b794ff" : "#e0a34a" }}>
                {p.name}
              </div>
              <div className="mt-2 flex items-end gap-1">
                <span className="text-4xl font-bold tracking-tight">{euros(p.price)}</span>
                <span className="mb-1 text-sm text-[#9fb0d0]">/ mois</span>
              </div>
              <p className="mt-2 text-[13px] text-[#b9c4dd]">{p.tagline}</p>
              <p className="mt-3 flex items-center gap-1.5 text-[12px] text-[#9fb0d0]">
                <LifeBuoy className="h-3.5 w-3.5" /> {p.supportLevel}
              </p>
              <Link
                href="/login"
                className={[
                  "mt-5 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition",
                  popular ? "bg-[#2C53C0] hover:bg-[#2C53C0]/90" : "border border-white/15 hover:bg-white/10",
                ].join(" ")}
              >
                Demander une démo <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="mt-2 text-center text-[11px] text-[#7e8aa3]">{p.features.length} fonctionnalités incluses</p>
            </div>
          );
        })}
      </section>

      {/* Comparison table */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="mb-6 text-center text-2xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif" }}>
          Comparatif détaillé
        </h2>
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white/[0.04]">
                <th className="px-4 py-3 text-left font-medium text-[#b9c4dd]">Fonctionnalité</th>
                {PLAN_ORDER.map((key) => (
                  <th key={key} className="px-4 py-3 text-center font-semibold">
                    {plans[key].name}
                    <div className="text-[11px] font-normal text-[#9fb0d0]">{euros(plans[key].price)}/mois</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURE_GROUPS.map((g) => {
                const items = FEATURES.filter((f: Feature) => f.group === g);
                if (items.length === 0) return null;
                return (
                  <FeatureGroupRows key={g} label={GROUP_LABEL[g] ?? g} items={items} has={has} />
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-center text-[12px] text-[#7e8aa3]">
          Prix indicatifs HT par organisme. Marque blanche (logo, couleurs, 10 designs) incluse dans toutes les formules.
        </p>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-3xl px-6 pb-20 text-center">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-transparent p-10">
          <h2 className="text-2xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif" }}>
            Prêt à digitaliser votre organisme ?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[15px] text-[#b9c4dd]">
            Démarrez avec une démonstration personnalisée et une mise en route accompagnée.
          </p>
          <Link href="/login" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#2C53C0] px-6 py-3 font-semibold hover:bg-[#2C53C0]/90">
            Demander une démo <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <p className="mt-8 text-[12px] text-[#7e8aa3]">© {new Date().getFullYear()} OFManager — Le logiciel tout-en-un des organismes de formation.</p>
      </section>
    </div>
  );
}

function FeatureGroupRows({
  label,
  items,
  has,
}: {
  label: string;
  items: Feature[];
  has: (planKey: string, feat: string) => boolean;
}) {
  return (
    <>
      <tr className="bg-white/[0.02]">
        <td colSpan={4} className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#7B93E8]">
          {label}
        </td>
      </tr>
      {items.map((f) => (
        <tr key={f.key} className="border-t border-white/5">
          <td className="px-4 py-2.5 text-[#dbe4f7]">{f.label}</td>
          {PLAN_ORDER.map((key) => (
            <td key={key} className="px-4 py-2.5 text-center">
              {has(key, f.key) ? (
                <Check className="mx-auto h-4 w-4 text-emerald-400" />
              ) : (
                <Minus className="mx-auto h-4 w-4 text-white/20" />
              )}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
