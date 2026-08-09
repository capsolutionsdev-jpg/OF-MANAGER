import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import {
  ArrowRight, Check, X, Clock, Target, RefreshCw,
  Send, PenLine, FileText, Sparkles,
  CalendarCheck, GraduationCap, Cloud, Building2,
} from "lucide-react";
import { auth } from "@/auth";
import { getResolvedPlans } from "@/lib/pricing";
import { PLAN_ORDER } from "@/lib/plans";
import { ScrollReveal } from "@/components/site/scroll-reveal";

export const metadata: Metadata = {
  title: "OFManager — Le logiciel des OF en sécurité, incendie & secourisme",
  description:
    "OFManager : le logiciel des organismes de formation en sécurité privée, incendie, secourisme et prévention. SST, TFP APS, SSIAP, habilitation électrique : prérequis CNAPS, recyclages, grilles de certification, conformité Qualiopi. Édité par CAP Compétences.",
};

const NAVY = "#221F19";
const BRAND = "#2C53C0";

const features = [
  { icon: Target, title: "CRM & pipeline", desc: "Prospects multicanaux, scoring, relances et pipeline Kanban, du premier contact à l'inscription." },
  { icon: CalendarCheck, title: "Sessions & planning", desc: "Sessions, salles, formateurs, planning visuel, convocations et émargement signé." },
  { icon: PenLine, title: "Dossiers & signatures", desc: "Checklist du dossier administratif par candidat, relances, signature électronique légale." },
  { icon: FileText, title: "Documents automatiques", desc: "Conventions, convocations, attestations et certificats générés à votre charte." },
  { icon: GraduationCap, title: "E-learning & suivi", desc: "Parcours en ligne, quiz, suivi de progression et grilles de certification." },
  { icon: Sparkles, title: "Assistant IA", desc: "Rédaction d'e-mails, résumés de dossiers, qualification des leads — du temps gagné." },
];

const formations: { ic: string; t: string; d: string; href?: string }[] = [
  { ic: "⛑️", t: "Secourisme", d: "SST & MAC SST, PSC1. Grilles de certification INRS pré-remplies, signées par le formateur." },
  { ic: "🛡️", t: "Sécurité privée", d: "TFP APS, MAC APS. Prérequis CNAPS, dossier réglementaire, convocation d'examen.", href: "/solutions/tfp-aps" },
  { ic: "🚒", t: "Sécurité incendie", d: "SSIAP 1·2·3 et leurs recyclages / remises à niveau. Agréments & dossiers gérés." },
  { ic: "⚡", t: "Habilitation électrique", d: "B0–H0, BS, BE, BR, B1/B2… (NF C18-510). Recyclage triennal et avis de fin." },
  { ic: "🦺", t: "Prévention", d: "Gestes & postures, manipulation d'extincteurs (EPI), évacuation, risques pro." },
  { ic: "＋", t: "Votre catalogue, illimité", d: "Ajoutez autant de formations que vous voulez, avec leur dossier & prérequis." },
];

// Habillage marketing par formule (couleur + points-clés). Le nom, le prix, la
// tagline et le badge « le plus choisi » viennent de la console (getResolvedPlans).
const PLAN_MARKETING: Record<string, { color: string; items: string[] }> = {
  BASIQUE: { color: NAVY, items: ["Cœur métier (CRM, sessions, candidats)", "Conformité Qualiopi · BPF · RGPD", "Documents & signatures", "Marque blanche"] },
  MEDIUM: { color: BRAND, items: ["Tout Basique +", "Gestion étendue (B2B, e-learning, compta)", "Notifications, Tâches, Rapports", "Kanban & scoring"] },
  COMPLET: { color: "#7C3AED", items: ["Tout Medium +", "Assistant IA & SMS", "Leads multicanal & portail client", "Support prioritaire"] },
};

const faqs = [
  { q: "Gère-t-il l'autorisation préalable / la carte pro CNAPS (APS) ?", a: "Oui. Pour le TFP APS et le MAC APS, chaque candidat a un suivi de l'autorisation préalable (non fait → en cours → complètement de dossier → accepté/refusé) ou de sa carte pro, dès l'étape prospect." },
  { q: "Comment fonctionnent les grilles de certification (SST, INRS) ?", a: "Elles sont pré-remplies à partir des inscrits et du formateur. Il ne reste qu'à cocher et signer, puis chaque grille se télécharge. Aucune convocation d'examen pour le SST/MAC." },
  { q: "Et les recyclages (MAC SST, recyclage SSIAP, habilitation) ?", a: "La plateforme tient l'échéancier des recyclages et MAC obligatoires et relance avant expiration." },
  { q: "Est-ce conforme Qualiopi ?", a: "Oui : preuves structurées sur les 32 indicateurs, dossier d'audit exportable, BPF pré-rempli, alignés sur vos certificateurs (INRS, France Compétences…)." },
  { q: "Peut-on l'héberger en interne et le personnaliser ?", a: "Deux options : notre cloud clé en main, ou une installation sur vos serveurs. Logo, couleurs, domaine, modules et parcours métier sont personnalisables." },
];

export default async function HomePage() {
  const session = await auth();
  if (session?.user) {
    const role = session.user.role as Role;
    redirect(role === "SUPERADMIN" ? "/console" : role === "APPRENANT" ? "/mon-espace" : "/dashboard");
  }

  // Tarifs LIVE (console éditeur → PlanTarif), fusionnés avec l'habillage
  // marketing statique ci-dessus. Repli automatique sur les défauts si DB down.
  const { plans: resolved, popular } = await getResolvedPlans();
  const plans = PLAN_ORDER.map((key) => ({
    name: resolved[key].name,
    price: `${resolved[key].price}€`,
    tagline: resolved[key].tagline,
    pop: key === popular,
    color: PLAN_MARKETING[key]?.color ?? NAVY,
    items: PLAN_MARKETING[key]?.items ?? [],
  }));

  return (
    <main className="min-h-screen bg-white text-[#221F19]">
      <ScrollReveal skip={2} />
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Image src="/ofmanager-logo.png" alt="OFManager" width={150} height={48} priority className="h-9 w-auto" />
          <nav className="ml-2 hidden items-center gap-6 text-sm font-medium text-slate-600 lg:flex">
            <a href="#solution" className="hover:text-[#2C53C0]">Pourquoi OFManager</a>
            <a href="#formations" className="hover:text-[#2C53C0]">Formations</a>
            <a href="#automatisations" className="hover:text-[#2C53C0]">Automatisations</a>
            <a href="#tarifs" className="hover:text-[#2C53C0]">Tarifs</a>
            <Link href="/partenaires" className="hover:text-[#2C53C0]">Clients</Link>
            <Link href="/contact" className="hover:text-[#2C53C0]">Contact</Link>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <Link href="/login" className="hidden text-sm font-semibold text-[#221F19] hover:text-[#2C53C0] sm:block">Connexion</Link>
            <Link href="/demo" className="inline-flex items-center gap-1.5 rounded-lg bg-[#2C53C0] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#21429E]">
              Demander une démo
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden text-white" style={{ background: `radial-gradient(1100px 600px at 78% -10%, #3A3550, transparent 60%), linear-gradient(180deg, ${NAVY}, #1B1825)` }}>
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_.95fr] lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold text-[#cfe0ff]">★ Sécurité privée · Incendie · Secourisme · Prévention</span>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              Le logiciel des organismes de formation en <span className="bg-gradient-to-r from-[#7B93E8] to-[#a9cbff] bg-clip-text text-transparent">sécurité &amp; prévention</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-[#bccbe9]">
              SST, TFP APS, SSIAP, habilitation électrique… OFManager gère vos <strong className="text-white">prérequis réglementaires</strong>, vos <strong className="text-white">recyclages</strong> et vos <strong className="text-white">grilles de certification</strong> — en toute conformité Qualiopi.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/demo" className="inline-flex items-center gap-2 rounded-xl bg-[#2C53C0] px-6 py-3 text-base font-semibold shadow-lg transition hover:bg-[#21429E]">Demander une démo <ArrowRight className="h-5 w-5" /></Link>
              <a href="#formations" className="inline-flex items-center gap-2 rounded-xl border border-white/25 px-6 py-3 text-base font-semibold transition hover:bg-white/10">Voir les formations gérées</a>
            </div>
            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#cdd8f0]">
              {["Prérequis CNAPS & agréments", "Recyclages / MAC suivis", "Grilles de certification"].map((t) => (
                <span key={t} className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" /> {t}</span>
              ))}
            </div>
            <p className="mt-7 flex items-center gap-2 text-xs text-[#8ba0c8]">
              <Image src="/ofmanager-logo.png" alt="" width={18} height={18} className="h-4 w-auto opacity-80" /> Une solution éditée par <span className="font-semibold text-[#dbe7ff]">CAP Compétences</span>
            </p>
          </div>
          {/* dashboard mock */}
          <div className="rounded-2xl border border-white/15 bg-white/5 p-3.5 shadow-2xl">
            <div className="flex gap-1.5 px-1.5 pb-3 pt-1">
              <i className="h-2.5 w-2.5 rounded-full bg-white/25" /><i className="h-2.5 w-2.5 rounded-full bg-white/25" /><i className="h-2.5 w-2.5 rounded-full bg-white/25" />
            </div>
            <div className="rounded-xl bg-white p-4 text-[#11131a]">
              <div className="mb-3 text-[13px] font-bold text-[#221F19]">Tableau de bord</div>
              <div className="mb-3 grid grid-cols-3 gap-2.5">
                {[["Candidats", "248"], ["Sessions", "14"], ["Réussite", "94%"]].map(([l, v]) => (
                  <div key={l} className="rounded-lg bg-slate-50 p-2.5"><div className="text-[10px] text-slate-500">{l}</div><div className="text-xl font-extrabold text-[#221F19]">{v}</div></div>
                ))}
              </div>
              {[["ML", "Marie Lefèvre · SST", "Inscrit", "bg-emerald-100 text-emerald-700", BRAND], ["KB", "Karim Benali · TFP APS", "Dossier", "bg-amber-100 text-amber-700", "#7C3AED"], ["HP", "Hugo Petit · MAC APS", "Certifié", "bg-emerald-100 text-emerald-700", "#0D9488"]].map(([i, n, tag, cls, av]) => (
                <div key={i as string} className="flex items-center gap-2.5 border-t border-slate-100 py-2.5 text-xs">
                  <span className="grid h-6 w-6 place-items-center rounded-md text-[10px] font-bold text-white" style={{ background: av as string }}>{i}</span>
                  <span className="text-slate-700">{n}</span>
                  <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold ${cls}`}>{tag}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-slate-100 bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-11 text-center sm:px-6 lg:grid-cols-4">
          {[["100%", "conforme Qualiopi — 32 indicateurs"], ["95%", "de réussite aux certifications*"], ["−70%", "de temps administratif*"], ["6", "certifications préconfigurées"]].map(([n, l]) => (
            <div key={l}><div className="font-display text-4xl font-extrabold text-[#2C53C0]">{n}</div><div className="mt-1 text-sm text-slate-500">{l}</div></div>
          ))}
        </div>
        <p className="mx-auto max-w-6xl px-4 text-center text-[11px] text-slate-400 sm:px-6">* Chiffres indicatifs — à remplacer par vos résultats réels.</p>
      </section>

      {/* Problème / Solution */}
      <section id="solution" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2C53C0]">Le quotidien des organismes de formation</p>
          <h2 className="mt-3 text-3xl font-extrabold">Vous reconnaissez ces galères ?</h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-600">La gestion d'un OF se transforme vite en course aux tableurs, aux e-mails et aux relances. OFManager remplace tout ça.</p>
        </div>
        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-red-100 bg-red-50/60 p-7">
            <h3 className="flex items-center gap-2 text-lg font-bold text-red-700"><X className="h-5 w-5" /> Sans OFManager</h3>
            <ul className="mt-4 space-y-3 text-sm text-red-900/80">
              {["Données éparpillées dans 5 tableurs Excel", "Convocations, attestations & relances tapées à la main", "Signatures papier scannées, classées, perdues", "Pièces du dossier oubliées, recyclages non suivis", "Stress avant l'audit Qualiopi", "Des heures de ressaisie, des erreurs qui coûtent cher"].map((t) => <li key={t} className="flex gap-2"><X className="mt-0.5 h-4 w-4 shrink-0" /> {t}</li>)}
            </ul>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-7">
            <h3 className="flex items-center gap-2 text-lg font-bold text-emerald-700"><Check className="h-5 w-5" /> Avec OFManager</h3>
            <ul className="mt-4 space-y-3 text-sm text-emerald-900/80">
              {["Une seule plateforme, toutes vos données reliées", "Convocations, attestations & relances envoyées automatiquement", "Signature électronique légale, horodatée, archivée", "Checklists & recyclages suivis, relance des pièces manquantes", "Dossier d'audit prêt en permanence, exportable en 1 clic", "Fini la ressaisie : zéro double saisie, zéro oubli"].map((t) => <li key={t} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0" /> {t}</li>)}
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-wrap justify-center gap-8 text-base font-semibold text-[#221F19]">
          <span className="flex items-center gap-2"><Clock className="h-6 w-6 text-[#2C53C0]" /> Gagnez des heures chaque semaine</span>
          <span className="flex items-center gap-2"><Target className="h-6 w-6 text-[#2C53C0]" /> Supprimez les erreurs de saisie</span>
          <span className="flex items-center gap-2"><RefreshCw className="h-6 w-6 text-[#2C53C0]" /> Éliminez les tâches répétitives</span>
        </div>
      </section>

      {/* Aperçu (captures) */}
      <section id="apercu" className="bg-slate-50/70 py-20">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2C53C0]">La plateforme en images</p>
          <h2 className="mt-3 text-3xl font-extrabold">Découvrez OFManager en action</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[["dashboard", "Tableau de bord"], ["kanban", "Pipeline Kanban"], ["sessions", "Sessions & émargement"], ["qualiopi", "Conformité Qualiopi"], ["bpf", "BPF automatisé"], ["ia", "Assistant IA"]].map(([f, cap]) => (
              <figure key={f} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex h-7 items-center gap-1.5 bg-[#0f1830] px-3"><i className="h-2 w-2 rounded-full bg-white/25" /><i className="h-2 w-2 rounded-full bg-white/25" /></div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/screenshots/${f}.png`} alt={cap} className="w-full" />
                <figcaption className="px-4 py-3 text-left text-sm text-slate-500">{cap}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Automatisations / CRM */}
      <section id="automatisations" className="py-20 text-white" style={{ background: `linear-gradient(180deg, #1B1825, ${NAVY})` }}>
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7B93E8]">Automatisation &amp; CRM</p>
          <h2 className="mt-3 text-3xl font-extrabold">La plateforme travaille pendant que vous formez</h2>
          <p className="mx-auto mt-3 max-w-xl text-[#bccbe9]">Les tâches répétitives partent en automatique. Vous gardez le contrôle et la relation client.</p>
          <div className="mt-12 grid gap-5 text-left lg:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <Send className="h-7 w-7 text-[#7B93E8]" />
              <h3 className="mt-3 text-lg font-bold">Envois automatiques</h3>
              <p className="mt-2 text-sm text-[#aebbd6]">Convocations (J-7), attestations, certificats, enquêtes et relances : programmés et envoyés tout seuls.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <PenLine className="h-7 w-7 text-[#7B93E8]" />
              <h3 className="mt-3 text-lg font-bold">Signature électronique</h3>
              <p className="mt-2 text-sm text-[#aebbd6]">Conventions, devis, émargements signés en ligne (eIDAS), horodatés et archivés. Zéro papier, zéro scan.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <Target className="h-7 w-7 text-[#7B93E8]" />
              <h3 className="mt-3 text-lg font-bold">CRM &amp; pipeline</h3>
              <p className="mt-2 text-sm text-[#aebbd6]">Prospects multicanaux, scoring, relances programmées, pipeline Kanban : aucun lead oublié.</p>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {["⏱️ Des heures gagnées chaque semaine", "🎯 Plus d'erreurs de saisie", "🔁 Fin des tâches répétitives"].map((t) => (
              <span key={t} className="rounded-full border border-emerald-400/30 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-300">{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Fonctionnalités */}
      <section id="fonctionnalites" className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2C53C0]">Une plateforme, tous vos métiers</p>
        <h2 className="mt-3 text-3xl font-extrabold">De l'acquisition à la certification</h2>
        <div className="mt-11 grid gap-5 text-left sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#2C53C0]/10 text-[#2C53C0]"><f.icon className="h-5 w-5" /></div>
              <h3 className="mt-4 font-bold text-[#221F19]">{f.title}</h3>
              <p className="mt-1.5 text-sm text-slate-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Qualiopi & audit */}
      <section id="conformite" className="py-20 text-white" style={{ background: `linear-gradient(180deg, #1B1825, ${NAVY})` }}>
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7B93E8]">Qualiopi &amp; préparation à l'audit</p>
            <h2 className="mt-3 text-3xl font-extrabold">Arrivez à votre audit l'esprit tranquille</h2>
            <p className="mt-4 text-lg text-[#bccbe9]">OFManager rattache automatiquement vos preuves aux <strong className="text-white">7 critères et 32 indicateurs</strong>. Le jour de l'audit, tout est prêt — exportable en un clic.</p>
            <ul className="mt-6 space-y-3.5">
              {[["Preuves rattachées en continu", "Chaque session, émargement et document alimente votre dossier qualité."], ["Dossier d'audit exportable", "Toutes les preuves classées par indicateur, prêtes pour l'auditeur."], ["BPF pré-rempli + RGPD", "BPF automatique, registre RGPD, émargements horodatés (eIDAS)."]].map(([b, s]) => (
                <li key={b} className="flex gap-3"><span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-emerald-500/15 text-emerald-400"><Check className="h-4 w-4" /></span><span><b className="block text-[15px]">{b}</b><span className="text-sm text-[#aebbd6]">{s}</span></span></li>
              ))}
            </ul>
            <Link href="/demo" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#2C53C0] px-6 py-3 font-semibold transition hover:bg-[#21429E]">Préparez votre prochain audit <ArrowRight className="h-5 w-5" /></Link>
          </div>
          <div className="text-center">
            <div className="mx-auto grid h-48 w-48 place-items-center rounded-full" style={{ background: "conic-gradient(#10B981 0 100%, #1c2c52 0)" }}>
              <div className="grid h-36 w-36 place-items-center rounded-full" style={{ background: NAVY }}><div><div className="font-display text-4xl font-extrabold">100%</div><div className="text-sm text-[#aebbd6]">conforme</div></div></div>
            </div>
            <div className="mx-auto mt-6 flex max-w-sm flex-wrap justify-center gap-2">
              {["C1 · Information", "C2 · Objectifs", "C3 · Accueil & suivi", "C4 · Moyens", "C5 · Formateurs", "C6 · Environnement", "C7 · Appréciations"].map((c) => (
                <span key={c} className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-[#cfe0ff]">{c}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Formations */}
      <section id="formations" className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2C53C0]">Vos formations, prêtes à l'emploi</p>
        <h2 className="mt-3 text-3xl font-extrabold">Conçu autour de vos certifications</h2>
        <p className="mx-auto mt-3 max-w-xl text-slate-600">Parcours, prérequis et documents de chaque formation préconfigurés — vous gagnez un temps précieux dès la première session.</p>
        <div className="mt-11 grid gap-5 text-left sm:grid-cols-2 lg:grid-cols-3">
          {formations.map((f) => {
            const inner = (
              <>
                <div className="text-2xl">{f.ic}</div>
                <h3 className="mt-3 font-bold text-[#221F19]">{f.t}</h3>
                <p className="mt-1.5 text-sm text-slate-600">{f.d}</p>
                {f.href && <span className="mt-3 inline-block text-sm font-semibold text-[#2C53C0]">Voir le process TFP APS →</span>}
              </>
            );
            return f.href ? (
              <Link key={f.t} href={f.href} className="block rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:shadow-lg">{inner}</Link>
            ) : (
              <div key={f.t} className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:shadow-lg">{inner}</div>
            );
          })}
        </div>
        {/* suivi pédagogique */}
        <div className="mt-9 rounded-3xl bg-[#221F19] p-8 text-left text-white">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div className="max-w-md">
              <h3 className="text-2xl font-extrabold">Un suivi pédagogique complet</h3>
              <p className="mt-2 text-[#bccbe9]">Pour chaque session et chaque stagiaire, du premier jour à la certification — tout est tracé.</p>
            </div>
            <div className="flex max-w-xl flex-wrap gap-2">
              {["Test de positionnement", "Émargement signé", "Évaluations", "Progression e-learning", "Grille de certification", "Attestation & certificat", "Satisfaction"].map((c) => (
                <span key={c} className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-[#cfe0ff]">{c}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Hébergement */}
      <section id="hebergement" className="bg-slate-50/70 py-20">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2C53C0]">Hébergement au choix</p>
          <h2 className="mt-3 text-3xl font-extrabold">Chez nous, ou chez vous</h2>
          <div className="mt-11 grid gap-6 text-left lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-8">
              <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-[#2C53C0]/10 p-3 text-[#2C53C0]"><Cloud className="h-6 w-6" /></div>
              <h3 className="mt-4 text-xl font-bold text-[#221F19]">Cloud OFManager <span className="ml-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">Recommandé</span></h3>
              <p className="mt-2 text-sm text-slate-600">Hébergé chez nous, prêt à l'emploi. Vous vous concentrez sur la formation.</p>
              <ul className="mt-4 space-y-2.5 text-sm text-slate-700">{["Mise en route immédiate", "Mises à jour & sauvegardes automatiques", "Hébergement en France, RGPD", "Supervision & sécurité incluses"].map((t) => <li key={t} className="flex gap-2"><Check className="h-4 w-4 text-emerald-500" /> {t}</li>)}</ul>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-8">
              <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-violet-100 p-3 text-violet-600"><Building2 className="h-6 w-6" /></div>
              <h3 className="mt-4 text-xl font-bold text-[#221F19]">Sur vos serveurs (interne) <span className="ml-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">Souveraineté</span></h3>
              <p className="mt-2 text-sm text-slate-600">Installée sur votre infrastructure. Vos données restent intégralement chez vous.</p>
              <ul className="mt-4 space-y-2.5 text-sm text-slate-700">{["Vos données sur votre infrastructure", "Souveraineté & contrôle total", "Idéal grands comptes & sécurité", "Déploiement & maintenance accompagnés"].map((t) => <li key={t} className="flex gap-2"><Check className="h-4 w-4 text-emerald-500" /> {t}</li>)}</ul>
            </div>
          </div>
        </div>
      </section>

      {/* Tarifs */}
      <section id="tarifs" className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2C53C0]">Tarifs simples</p>
        <h2 className="mt-3 text-3xl font-extrabold">Une formule pour chaque organisme</h2>
        <p className="mx-auto mt-3 max-w-xl text-slate-600">Sans engagement, support inclus partout. Tarif sur mesure pour l'hébergement interne.</p>
        <div className="mt-11 grid items-start gap-6 text-left lg:grid-cols-3">
          {plans.map((p) => (
            <div key={p.name} className={`relative rounded-2xl bg-white p-8 ${p.pop ? "border-2 border-[#2C53C0] shadow-xl" : "border border-slate-200"}`}>
              {p.pop && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#2C53C0] px-3 py-1 text-xs font-bold text-white">Le plus choisi</span>}
              <div className="font-display text-lg font-bold" style={{ color: p.color }}>{p.name}</div>
              <div className="mt-2 font-display text-4xl font-extrabold text-[#221F19]">{p.price} <span className="text-base font-medium text-slate-500">/ mois</span></div>
              <p className="mt-2 text-sm text-slate-500">{p.tagline}</p>
              <ul className="my-6 space-y-2.5">{p.items.map((t) => <li key={t} className="flex gap-2 text-sm text-slate-700"><Check className="h-4 w-4 shrink-0 text-emerald-500" /> {t}</li>)}</ul>
              <Link href="/demo" className={`block rounded-xl px-5 py-3 text-center text-sm font-semibold ${p.pop ? "bg-[#2C53C0] text-white hover:bg-[#21429E]" : "border border-slate-200 text-[#221F19] hover:bg-slate-50"}`}>Choisir {p.name}</Link>
            </div>
          ))}
        </div>
      </section>

      {/* Témoignage */}
      <section className="bg-slate-50/70 py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <div className="text-xl tracking-widest text-amber-400">★★★★★</div>
          <p className="mt-5 font-display text-2xl font-medium leading-snug text-[#221F19]">« On a remplacé Excel, les e-mails et les signatures papier par OFManager. L'audit Qualiopi s'est préparé en quelques clics. »</p>
          <p className="mt-5 text-sm text-slate-500"><strong className="text-[#221F19]">Sophie M.</strong> — Directrice, organisme de sécurité privée</p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <h2 className="text-center text-3xl font-extrabold">Tout ce qu'il faut savoir</h2>
        <div className="mt-10 space-y-3">
          {faqs.map((f) => (
            <details key={f.q} className="rounded-xl border border-slate-200 bg-white p-0">
              <summary className="cursor-pointer list-none px-5 py-4 font-semibold text-[#221F19]">{f.q}</summary>
              <p className="px-5 pb-4 text-sm text-slate-600">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="text-white" style={{ background: `linear-gradient(135deg, ${BRAND}, #2A2740)` }}>
        <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
          <h2 className="text-3xl font-extrabold sm:text-4xl">Prêt à digitaliser votre organisme ?</h2>
          <p className="mx-auto mt-3 max-w-lg text-[#dce7ff]">Démonstration personnalisée et mise en route accompagnée. Réponse sous 24 h.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/demo" className="rounded-xl bg-white px-7 py-3 font-semibold text-[#221F19] hover:bg-slate-100">Demander une démo</Link>
            <Link href="/tarifs" className="rounded-xl border border-white/40 px-7 py-3 font-semibold hover:bg-white/10">Voir les tarifs</Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#221F19] text-[#aebbd6]">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-4">
          <div>
            <Image src="/ofmanager-logo.png" alt="OFManager" width={150} height={48} className="h-9 w-auto" />
            <p className="mt-3 max-w-xs text-sm">Le logiciel des organismes de formation en sécurité &amp; prévention.</p>
            <p className="mt-4 text-sm">Édité par <strong className="text-white">CAP Compétences</strong></p>
          </div>
          <div><h4 className="mb-3 font-bold text-white">Produit</h4>{[["Fonctionnalités", "#fonctionnalites"], ["Tarifs", "#tarifs"], ["Hébergement", "#hebergement"]].map(([t, h]) => <a key={t} href={h} className="block py-1 text-sm hover:text-white">{t}</a>)}<Link href="/login" className="block py-1 text-sm hover:text-white">Connexion</Link></div>
          <div><h4 className="mb-3 font-bold text-white">Entreprise</h4><Link href="/partenaires" className="block py-1 text-sm hover:text-white">Partenaires & clients</Link><Link href="/solutions/tfp-aps" className="block py-1 text-sm hover:text-white">TFP APS</Link><Link href="/demo" className="block py-1 text-sm hover:text-white">Demander une démo</Link><Link href="/contact" className="block py-1 text-sm hover:text-white">Contact</Link></div>
          <div><h4 className="mb-3 font-bold text-white">Légal</h4>{["Mentions légales", "CGV", "Confidentialité", "RGPD"].map((t) => <a key={t} href="#" className="block py-1 text-sm hover:text-white">{t}</a>)}</div>
        </div>
        <div className="border-t border-white/10 py-5 text-center text-xs text-[#8493b5]">© 2026 OFManager — une solution CAP Compétences. Tous droits réservés.</div>
      </footer>
    </main>
  );
}
