import Link from "next/link";
import type { Metadata } from "next";
import { Check, Minus, LifeBuoy, ArrowRight } from "lucide-react";
import { PLAN_ORDER, euros, type FormuleKey } from "@/lib/plans";
import { getResolvedPlans } from "@/lib/pricing";
import { FEATURES, FEATURE_GROUPS, type Feature } from "@/lib/features";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";

export const metadata: Metadata = {
  title: "Tarifs — OFManager",
  description: "Quatre formules pour digitaliser votre organisme de formation : Indépendant, Pro, Croissance, Réseau. Conforme Qualiopi, 100% à votre marque.",
  alternates: { canonical: "/tarifs" },
};

// Les tarifs sont éditables dans la console → on rend la page dynamiquement
// pour refléter immédiatement tout changement de prix.
export const dynamic = "force-dynamic";

const NAVY = "#0D1B3E";

const GROUP_LABEL: Record<string, string> = {
  "Cœur": "Cœur métier & conformité",
  "Modules avancés": "Modules avancés",
  "Support": "Support",
};

export default async function TarifsPage() {
  const { plans, popular } = await getResolvedPlans();
  const has = (planKey: string, feat: string) => plans[planKey as FormuleKey].features.includes(feat);

  return (
    <main className="min-h-screen bg-white text-[#0D1B3E]">
      <SiteHeader />

      {/* Hero */}
      <section className="text-white" style={{ background: `radial-gradient(900px 500px at 80% -10%, rgba(59,110,245,.25), transparent 60%), linear-gradient(180deg, ${NAVY}, #12245A)` }}>
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold text-[#cfe0ff]">
            <Check className="h-3.5 w-3.5 text-[#5EEAD4]" /> Conforme Qualiopi · BPF · 100 % à votre marque
          </span>
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight sm:text-5xl" style={{ fontFamily: "var(--font-sora)" }}>
            Un tarif simple pour <span style={{ color: "#7FA3FF" }}>chaque organisme</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-[#bccbe9]">
            Du premier contact à la certification — gérez, formez et restez conforme sur une seule plateforme.
            Changez de formule à tout moment, le support est inclus partout.
          </p>
        </div>
      </section>

      {/* Pricing cards */}
      <section className="mx-auto -mt-8 grid max-w-6xl gap-5 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        {PLAN_ORDER.map((key) => {
          const p = plans[key];
          const isPopular = key === popular;
          return (
            <div
              key={key}
              className={[
                "relative flex flex-col rounded-2xl border bg-white p-6 shadow-sm",
                isPopular ? "border-[#3B6EF5] shadow-lg shadow-[#3B6EF5]/10 ring-1 ring-[#3B6EF5]/20" : "border-slate-200",
              ].join(" ")}
            >
              {isPopular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#3B6EF5] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                  Le plus choisi
                </span>
              )}
              <div className="text-sm font-bold text-[#0D1B3E]" style={{ fontFamily: "var(--font-sora)" }}>{p.name}</div>
              <div className="mt-2 flex items-end gap-1">
                <span className="text-4xl font-extrabold tracking-tight text-[#0D1B3E]" style={{ fontFamily: "var(--font-sora)" }}>{euros(p.price)}</span>
                <span className="mb-1 text-sm text-slate-500">/ mois</span>
              </div>
              <p className="mt-2 text-[13px] text-slate-600">{p.tagline}</p>
              <p className="mt-3 flex items-center gap-1.5 text-[12px] text-slate-500">
                <LifeBuoy className="h-3.5 w-3.5" /> {p.supportLevel}
              </p>
              <Link
                href="/demo"
                className={[
                  "mt-5 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition",
                  isPopular ? "bg-[#3B6EF5] text-white hover:bg-[#2954D4]" : "border border-slate-200 text-[#0D1B3E] hover:border-[#3B6EF5] hover:text-[#3B6EF5]",
                ].join(" ")}
              >
                Demander une démo <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="mt-2 text-center text-[11px] text-slate-400">{p.features.length} fonctionnalités incluses</p>
            </div>
          );
        })}
      </section>

      {/* Comparison table */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <h2 className="mb-8 text-center text-2xl font-extrabold text-[#0D1B3E]" style={{ fontFamily: "var(--font-sora)" }}>
          Comparatif détaillé
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="bg-[#F5F8FD]">
                <th className="px-4 py-3 text-left font-medium text-slate-500">Fonctionnalité</th>
                {PLAN_ORDER.map((key) => (
                  <th key={key} className="px-4 py-3 text-center font-bold text-[#0D1B3E]" style={{ fontFamily: "var(--font-sora)" }}>
                    {plans[key].name}
                    <div className="text-[11px] font-normal text-slate-500">{euros(plans[key].price)}/mois</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURE_GROUPS.map((g) => {
                const items = FEATURES.filter((f: Feature) => f.group === g);
                if (items.length === 0) return null;
                return <FeatureGroupRows key={g} label={GROUP_LABEL[g] ?? g} items={items} has={has} />;
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-center text-[12px] text-slate-400">
          Prix indicatifs HT par organisme. Marque blanche (logo, couleurs, 10 designs) incluse dans toutes les formules.
        </p>
      </section>

      {/* CTA */}
      <section className="text-white" style={{ background: `linear-gradient(135deg, #3B6EF5, ${NAVY})` }}>
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
          <h2 className="text-2xl font-extrabold sm:text-3xl" style={{ fontFamily: "var(--font-sora)" }}>Prêt à digitaliser votre organisme ?</h2>
          <p className="mx-auto mt-3 max-w-md text-[15px] text-[#dce7ff]">
            Démarrez avec une démonstration personnalisée et une mise en route accompagnée.
          </p>
          <Link href="/demo" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3 font-semibold text-[#0D1B3E] hover:bg-slate-100">
            Demander une démo <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <SiteFooter />
    </main>
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
      <tr className="bg-[#F5F8FD]/60">
        <td colSpan={PLAN_ORDER.length + 1} className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-[#3B6EF5]">
          {label}
        </td>
      </tr>
      {items.map((f) => (
        <tr key={f.key} className="border-t border-slate-100">
          <td className="px-4 py-2.5 text-slate-700">{f.label}</td>
          {PLAN_ORDER.map((key) => (
            <td key={key} className="px-4 py-2.5 text-center">
              {has(key, f.key) ? (
                <Check className="mx-auto h-4 w-4 text-[#12B886]" />
              ) : (
                <Minus className="mx-auto h-4 w-4 text-slate-300" />
              )}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
