import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site-url";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { auth } from "@/auth";
import { getResolvedPlans } from "@/lib/pricing";
import { PLAN_ORDER } from "@/lib/plans";
import { ScrollReveal } from "@/components/site/scroll-reveal";

export const metadata: Metadata = {
  title:
    "OFManager — Logiciel de gestion pour organismes de formation | Sécurité privée & VTC-Taxi",
  description:
    "OFManager : le logiciel des organismes de formation en sécurité privée (TFP APS, SSIAP, SST) et VTC/Taxi (examen T3P, RS 5635/5637). Génère 95 % de vos documents, prépare vos audits Qualiopi et sécurise vos données (RGPD, hébergement France). Édité par CAP SOLUTIONS.",
  keywords: [
    "logiciel organisme de formation",
    "logiciel OF",
    "logiciel Qualiopi",
    "logiciel formation sécurité privée",
    "logiciel formation VTC taxi",
    "gestion examen T3P",
    "TFP APS",
    "SSIAP",
    "SST",
    "BPF automatique",
    "RGPD organisme formation",
    "logiciel CNAPS",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: "OFManager — Le logiciel des OF en sécurité privée & VTC/Taxi",
    description:
      "Générez 95 % de vos documents, préparez vos audits Qualiopi et sécurisez vos données (RGPD). Le logiciel pensé pour les OF réglementés : sécurité privée & VTC/Taxi.",
    url: "/",
  },
  twitter: {
    title: "OFManager — Le logiciel des OF en sécurité privée & VTC/Taxi",
    description:
      "95 % des documents générés automatiquement. Audit Qualiopi prêt en 1 clic. RGPD & hébergement France.",
  },
};

// Habillage marketing statique par formule (période + puces). Le nom, le prix,
// la tagline (desc) et le badge « le plus choisi » sont pilotés depuis la console
// (PlanTarif) et résolus côté serveur via getResolvedPlans (cf. HomePage).
const PLAN_MARKETING: Record<string, { period: string; features: string[] }> = {
  INDEPENDANT: {
    period: "/ mois",
    features: [
      "100 stagiaires/mois · 1 formateur",
      "Cœur métier (CRM, sessions, candidats)",
      "Qualiopi · BPF · RGPD · documents & signatures",
      "Devis & facturation inclus",
    ],
  },
  PRO: {
    period: "/ mois",
    features: [
      "300 stagiaires/mois · 3 formateurs",
      "Tout Indépendant +",
      "Clients B2B, CPF/OPCO, e-learning",
      "Kanban, scoring, SMS & relances",
    ],
  },
  CROISSANCE: {
    period: "/ mois",
    features: [
      "800 stagiaires/mois · formateurs illimités",
      "Tout Pro +",
      "Site vitrine, capture de leads, assistant IA",
      "Communication & réseaux sociaux",
    ],
  },
  RESEAU: {
    period: "/ mois",
    features: [
      "Stagiaires & formateurs illimités",
      "Tout Croissance +",
      "Multi-sites, API, marque blanche",
      "Support dédié",
    ],
  },
};

// FAQ — source unique : alimente à la fois la FAQ visible ET le JSON-LD FAQPage
// (les deux doivent rester identiques pour les rich snippets Google).
const faqs = [
  {
    q: "OFManager gère-t-il l'examen T3P (VTC / Taxi) ?",
    a: "Oui. Chaque candidat est suivi de l'inscription à l'examen T3P organisé par la CMA jusqu'à l'obtention de la carte professionnelle. La plateforme conserve les identifiants du compte candidat T3P et relance automatiquement vos stagiaires avant l'échéance de leur formation continue obligatoire (14 h tous les 5 ans).",
  },
  {
    q: "Gère-t-il l'autorisation préalable / la carte pro CNAPS (sécurité privée) ?",
    a: "Oui. Pour le TFP APS et le MAC APS, chaque candidat a un suivi de l'autorisation préalable CNAPS (non fait → en cours → complétude du dossier → accepté/refusé) ou de sa carte pro, dès l'étape prospect.",
  },
  {
    q: "Comment fonctionnent les recyclages (MAC SST, recyclage SSIAP, habilitation, formation continue T3P) ?",
    a: "La plateforme tient l'échéancier de tous les recyclages, MAC et formations continues obligatoires, et relance stagiaires comme organisme avant l'expiration. Vous ne ratez plus jamais une échéance — et vous récupérez du chiffre d'affaires récurrent.",
  },
  {
    q: "Est-ce vraiment conforme Qualiopi ?",
    a: "Oui : preuves structurées sur les 7 critères et 32 indicateurs, dossier d'audit exportable, BPF pré-rempli, alignés sur vos certificateurs (INRS, France Compétences, CMA…).",
  },
  {
    q: "Mes données sont-elles conformes au RGPD ?",
    a: "Oui. Hébergement en France, registre des traitements, contrat de sous-traitance (DPA) fourni, chiffrement, gestion des rôles et durées de conservation, signatures électroniques horodatées (eIDAS).",
  },
  {
    q: "Combien de temps pour être opérationnel ?",
    a: "Mise en route immédiate en cloud, avec vos certifications préconfigurées. La plupart des organismes gèrent leur première session dès la première semaine, sans reprise de saisie lourde.",
  },
];

// Styles portés depuis le blueprint, TOUS scopés sous `.ofm-v2` pour ne pas
// entrer en collision avec Tailwind/shadcn (design global de l'app). Les polices
// utilisent les variables next/font déjà chargées par le layout (--font-sora /
// --font-inter). Les variables de couleurs sont posées sur `.ofm-v2` (et non
// `:root`) pour rester confinées au sous-arbre de la landing.
const OFM_CSS = `
.ofm-v2{
  --navy:#0D1B3E;--navy-2:#12245a;--navy-deep:#070f28;--ink:#0f1729;
  --primary:#3B6EF5;--primary-d:#2954d4;--amber:#E8A33D;--amber-d:#c9832a;
  --green:#12B886;--paper:#F5F8FD;--white:#ffffff;--line:#E3E9F4;--muted:#5b6b86;
  --shadow:0 20px 50px -24px rgba(13,27,62,.35);
  --shadow-sm:0 8px 24px -14px rgba(13,27,62,.30);
  --r:16px;
  font-family:var(--font-inter),system-ui,sans-serif;
  color:var(--ink);background:var(--white);line-height:1.6;-webkit-font-smoothing:antialiased;
}
.ofm-v2 *{box-sizing:border-box}
.ofm-v2 h1,.ofm-v2 h2,.ofm-v2 h3,.ofm-v2 h4{font-family:var(--font-sora),sans-serif;line-height:1.12;margin:0;letter-spacing:-.02em}
.ofm-v2 a{color:inherit;text-decoration:none}
.ofm-v2 img{max-width:100%;display:block}
.ofm-v2 .wrap{max-width:1140px;margin:0 auto;padding:0 22px}
.ofm-v2 .eyebrow{font-family:var(--font-sora);font-size:.74rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--primary)}
.ofm-v2 .btn{display:inline-flex;align-items:center;gap:.5rem;font-family:var(--font-sora);font-weight:600;font-size:.96rem;padding:.85rem 1.4rem;border-radius:12px;border:1px solid transparent;cursor:pointer;transition:.18s ease;white-space:nowrap}
.ofm-v2 .btn-primary{background:var(--primary);color:#fff;box-shadow:0 10px 24px -12px rgba(59,110,245,.75)}
.ofm-v2 .btn-primary:hover{background:var(--primary-d);transform:translateY(-1px)}
.ofm-v2 .btn-ghost{background:transparent;color:var(--navy);border-color:var(--line)}
.ofm-v2 .btn-ghost:hover{border-color:var(--primary);color:var(--primary)}

/* ---------- HEADER ---------- */
.ofm-v2 header{position:sticky;top:0;z-index:50;background:rgba(255,255,255,.86);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-bottom:1px solid var(--line)}
.ofm-v2 .nav{display:flex;align-items:center;justify-content:space-between;height:68px}
.ofm-v2 .logo{display:flex;align-items:center;gap:.6rem}
.ofm-v2 .nav-links{display:flex;gap:1.6rem;font-size:.92rem;font-weight:500;color:#33415c}
.ofm-v2 .nav-links a:hover{color:var(--primary)}
.ofm-v2 .nav-cta{display:flex;align-items:center;gap:.7rem}
.ofm-v2 .nav-cta .login{font-size:.92rem;font-weight:600;color:var(--navy)}
@media(max-width:900px){.ofm-v2 .nav-links{display:none}.ofm-v2 .nav-cta .login{display:none}}

/* ---------- HERO ---------- */
.ofm-v2 .hero{background:radial-gradient(1200px 500px at 78% -10%,rgba(59,110,245,.16),transparent 60%),radial-gradient(900px 500px at 8% 120%,rgba(232,163,61,.12),transparent 55%),linear-gradient(180deg,#fff,#fff 60%,var(--paper));padding:clamp(48px,7vw,86px) 0 64px}
.ofm-v2 .hero-grid{display:grid;grid-template-columns:1.05fr .95fr;gap:52px;align-items:center}
@media(max-width:940px){.ofm-v2 .hero-grid{grid-template-columns:1fr;gap:38px}}
.ofm-v2 .hero .tag{display:inline-flex;gap:.5rem;align-items:center;background:#fff;border:1px solid var(--line);border-radius:999px;padding:.4rem .9rem;font-size:.78rem;font-weight:600;color:var(--navy);box-shadow:var(--shadow-sm)}
.ofm-v2 .hero .tag b{color:var(--amber-d)}
.ofm-v2 h1{font-size:clamp(2.1rem,4.6vw,3.35rem);font-weight:800;color:var(--navy);margin:1.1rem 0}
.ofm-v2 h1 .hl{background:linear-gradient(120deg,var(--primary),var(--amber));-webkit-background-clip:text;background-clip:text;color:transparent}
.ofm-v2 .hero p.lead{font-size:1.12rem;color:#3a4a66;max-width:560px}
.ofm-v2 .hero-cta{display:flex;gap:.8rem;flex-wrap:wrap;margin:1.7rem 0 1.3rem}
.ofm-v2 .trust-strip{display:flex;gap:1.4rem;flex-wrap:wrap;font-size:.86rem;color:#43536f;font-weight:500}
.ofm-v2 .trust-strip span{display:flex;align-items:center;gap:.45rem}
.ofm-v2 .trust-strip .dot{width:8px;height:8px;border-radius:50%;background:var(--green)}

/* hero mockup */
.ofm-v2 .mock{background:var(--navy);border-radius:20px;padding:16px;box-shadow:var(--shadow);position:relative;overflow:hidden}
.ofm-v2 .mock:before{content:"";position:absolute;inset:0;background:radial-gradient(600px 200px at 80% 0,rgba(59,110,245,.35),transparent 60%)}
.ofm-v2 .mock-head{display:flex;justify-content:space-between;align-items:center;color:#c7d3ef;font-size:.78rem;position:relative;margin-bottom:12px}
.ofm-v2 .mock-dots{display:flex;gap:6px}
.ofm-v2 .mock-dots i{width:9px;height:9px;border-radius:50%;background:rgba(255,255,255,.22)}
.ofm-v2 .mock-card{background:#fff;border-radius:13px;padding:16px;position:relative}
.ofm-v2 .kpi-row{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px}
.ofm-v2 .kpi{background:var(--paper);border:1px solid var(--line);border-radius:10px;padding:11px 12px}
.ofm-v2 .kpi .n{font-family:var(--font-sora);font-weight:700;font-size:1.35rem;color:var(--navy);line-height:1}
.ofm-v2 .kpi .l{font-size:.68rem;color:var(--muted);margin-top:3px}
.ofm-v2 .kpi.green .n{color:var(--green)}
.ofm-v2 .row-item{display:flex;align-items:center;gap:10px;padding:9px 0;border-top:1px solid var(--line);font-size:.82rem}
.ofm-v2 .av{width:28px;height:28px;border-radius:8px;display:grid;place-items:center;font-size:.7rem;font-weight:700;color:#fff}
.ofm-v2 .pill{margin-left:auto;font-size:.68rem;font-weight:700;padding:.2rem .55rem;border-radius:999px}
.ofm-v2 .pill.b{background:#e7efff;color:var(--primary-d)}
.ofm-v2 .pill.a{background:#fdf1dd;color:var(--amber-d)}
.ofm-v2 .pill.g{background:#e2f7ee;color:#0c8f66}

/* ---------- STAT BAND ---------- */
.ofm-v2 .band{background:var(--navy);color:#fff;padding:34px 0}
.ofm-v2 .band-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:24px;text-align:center}
@media(max-width:760px){.ofm-v2 .band-grid{grid-template-columns:repeat(2,1fr);gap:26px}}
.ofm-v2 .band .n{font-family:var(--font-sora);font-weight:800;font-size:2rem;background:linear-gradient(120deg,#fff,var(--primary));-webkit-background-clip:text;background-clip:text;color:transparent}
.ofm-v2 .band .l{font-size:.85rem;color:#aab8d8;margin-top:2px}
.ofm-v2 .band small{display:block;text-align:center;color:#7f8cad;font-size:.72rem;margin-top:22px}

/* ---------- SECTIONS ---------- */
.ofm-v2 section.blk{padding:clamp(56px,7vw,92px) 0}
.ofm-v2 .center{text-align:center;max-width:720px;margin:0 auto 44px}
.ofm-v2 h2{font-size:clamp(1.7rem,3.2vw,2.35rem);font-weight:700;color:var(--navy)}
.ofm-v2 .center p{color:var(--muted);font-size:1.05rem;margin-top:.7rem}

/* problem / solution */
.ofm-v2 .ps{display:grid;grid-template-columns:1fr 1fr;gap:22px}
@media(max-width:820px){.ofm-v2 .ps{grid-template-columns:1fr}}
.ofm-v2 .ps-col{border-radius:var(--r);padding:26px;border:1px solid var(--line)}
.ofm-v2 .ps-col.bad{background:#fff}
.ofm-v2 .ps-col.good{background:linear-gradient(180deg,#0d1b3e,#12245a);color:#fff;border:none}
.ofm-v2 .ps-col h3{font-size:1.05rem;margin-bottom:14px;display:flex;align-items:center;gap:.5rem}
.ofm-v2 .ps-col ul{list-style:none;padding:0;margin:0}
.ofm-v2 .ps-col li{display:flex;gap:.6rem;padding:.42rem 0;font-size:.94rem}
.ofm-v2 .ps-col.bad li:before{content:"✕";color:#d64b4b;font-weight:700}
.ofm-v2 .ps-col.good li:before{content:"✓";color:var(--green);font-weight:700}
.ofm-v2 .ps-col.good li{color:#dfe6f6}

/* MÉTIERS (dual) */
.ofm-v2 .metiers{display:grid;grid-template-columns:1fr 1fr;gap:22px}
@media(max-width:820px){.ofm-v2 .metiers{grid-template-columns:1fr}}
.ofm-v2 .metier{border-radius:var(--r);padding:30px;border:1px solid var(--line);background:#fff;position:relative;overflow:hidden}
.ofm-v2 .metier:before{content:"";position:absolute;top:0;left:0;right:0;height:5px}
.ofm-v2 .metier.sec:before{background:linear-gradient(90deg,var(--primary),#6f9bff)}
.ofm-v2 .metier.vtc:before{background:linear-gradient(90deg,var(--amber),#f4c778)}
.ofm-v2 .metier .ic{width:52px;height:52px;border-radius:13px;display:grid;place-items:center;font-size:1.5rem;margin-bottom:14px}
.ofm-v2 .metier.sec .ic{background:#e9f0ff}
.ofm-v2 .metier.vtc .ic{background:#fdf3e2}
.ofm-v2 .metier h3{font-size:1.28rem;color:var(--navy)}
.ofm-v2 .metier .sub{font-size:.83rem;font-weight:600;letter-spacing:.02em;margin:.15rem 0 .9rem}
.ofm-v2 .metier.sec .sub{color:var(--primary-d)}
.ofm-v2 .metier.vtc .sub{color:var(--amber-d)}
.ofm-v2 .metier ul{list-style:none;padding:0;margin:.4rem 0 0}
.ofm-v2 .metier li{display:flex;gap:.55rem;padding:.4rem 0;font-size:.92rem;color:#33415c;border-top:1px dashed var(--line)}
.ofm-v2 .metier li:first-child{border-top:none}
.ofm-v2 .metier li b{color:var(--navy)}
.ofm-v2 .chk{color:var(--green);font-weight:700;flex:none}

/* features grid */
.ofm-v2 .feat{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
@media(max-width:820px){.ofm-v2 .feat{grid-template-columns:1fr 1fr}}
@media(max-width:520px){.ofm-v2 .feat{grid-template-columns:1fr}}
.ofm-v2 .fcard{background:#fff;border:1px solid var(--line);border-radius:14px;padding:22px;transition:.18s}
.ofm-v2 .fcard:hover{transform:translateY(-3px);box-shadow:var(--shadow-sm);border-color:#cfd9ef}
.ofm-v2 .fcard .fi{width:44px;height:44px;border-radius:11px;background:linear-gradient(135deg,var(--navy),var(--primary));display:grid;place-items:center;color:#fff;font-size:1.2rem;margin-bottom:12px}
.ofm-v2 .fcard h3{font-size:1.05rem;color:var(--navy);margin-bottom:6px}
.ofm-v2 .fcard p{font-size:.9rem;color:var(--muted);margin:0}
.ofm-v2 .fcard ul{list-style:none;padding:12px 0 0;margin:12px 0 0;border-top:1px solid var(--line);display:flex;flex-direction:column;gap:7px}
.ofm-v2 .fcard li{display:flex;gap:.5rem;font-size:.82rem;color:var(--ink);line-height:1.45}
.ofm-v2 .fcard li .chk{color:var(--green);font-weight:700;flex:none}
.ofm-v2 .also{margin-top:30px;text-align:center}
.ofm-v2 .also .lbl{font-family:var(--font-sora);font-size:.72rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin-bottom:13px}
.ofm-v2 .chips{display:flex;flex-wrap:wrap;gap:9px;justify-content:center;max-width:840px;margin:0 auto}
.ofm-v2 .chips span{font-size:.8rem;background:#fff;border:1px solid var(--line);color:var(--navy);padding:.42rem .82rem;border-radius:999px;transition:.16s}
.ofm-v2 .chips span:hover{border-color:#cfd9ef;box-shadow:var(--shadow-sm)}

/* QUALIOPI (signature) */
.ofm-v2 .qua{background:linear-gradient(160deg,var(--navy-deep),var(--navy) 55%,var(--navy-2));color:#fff;border-radius:24px;padding:clamp(30px,4vw,52px);position:relative;overflow:hidden}
.ofm-v2 .qua:before{content:"";position:absolute;right:-80px;top:-80px;width:340px;height:340px;border-radius:50%;background:radial-gradient(circle,rgba(59,110,245,.35),transparent 65%)}
.ofm-v2 .qua-grid{display:grid;grid-template-columns:1.1fr .9fr;gap:40px;align-items:center;position:relative}
@media(max-width:860px){.ofm-v2 .qua-grid{grid-template-columns:1fr;gap:30px}}
.ofm-v2 .qua h2{color:#fff;font-size:clamp(1.6rem,3vw,2.2rem)}
.ofm-v2 .qua .badge{display:inline-flex;align-items:center;gap:.5rem;background:rgba(18,184,134,.16);color:#4ee0ac;border:1px solid rgba(18,184,134,.35);border-radius:999px;padding:.4rem .9rem;font-size:.78rem;font-weight:700;margin-bottom:1rem}
.ofm-v2 .qua ul{list-style:none;padding:0;margin:1.3rem 0 0}
.ofm-v2 .qua li{display:flex;gap:.7rem;padding:.55rem 0;font-size:.96rem;color:#d9e2f6}
.ofm-v2 .qua li b{color:#fff;display:block}
.ofm-v2 .qua li .chk{color:#4ee0ac}
.ofm-v2 .ring{width:100%;aspect-ratio:1;max-width:280px;margin:0 auto;position:relative;display:grid;place-items:center}
.ofm-v2 .ring svg{width:100%;transform:rotate(-90deg)}
.ofm-v2 .ring .ctr{position:absolute;text-align:center}
.ofm-v2 .ring .ctr .p{font-family:var(--font-sora);font-weight:800;font-size:2.6rem;line-height:1}
.ofm-v2 .ring .ctr .t{font-size:.72rem;color:#9fb0d6;letter-spacing:.08em;text-transform:uppercase}
.ofm-v2 .crits{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:18px}
.ofm-v2 .crits span{font-size:.68rem;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);color:#cdd9f2;padding:.28rem .6rem;border-radius:999px}

/* RGPD */
.ofm-v2 .rgpd{display:grid;grid-template-columns:.85fr 1.15fr;gap:40px;align-items:center}
@media(max-width:860px){.ofm-v2 .rgpd{grid-template-columns:1fr}}
.ofm-v2 .rgpd-shield{background:linear-gradient(160deg,#0d1b3e,#1a2f66);border-radius:20px;padding:34px;color:#fff;text-align:center;box-shadow:var(--shadow)}
.ofm-v2 .rgpd-shield .lock{font-size:2.6rem}
.ofm-v2 .rgpd-shield .big{font-family:var(--font-sora);font-weight:800;font-size:1.5rem;margin:.4rem 0}
.ofm-v2 .rgpd-shield p{color:#b9c6e6;font-size:.86rem;margin:0}
.ofm-v2 .rgpd-list{display:grid;grid-template-columns:1fr 1fr;gap:14px}
@media(max-width:520px){.ofm-v2 .rgpd-list{grid-template-columns:1fr}}
.ofm-v2 .rgpd-item{background:#fff;border:1px solid var(--line);border-radius:12px;padding:16px}
.ofm-v2 .rgpd-item .h{font-family:var(--font-sora);font-weight:600;font-size:.96rem;color:var(--navy);display:flex;gap:.5rem;align-items:center;margin-bottom:4px}
.ofm-v2 .rgpd-item p{font-size:.84rem;color:var(--muted);margin:0}
.ofm-v2 .rgpd-item .chk{color:var(--green)}

/* hosting */
.ofm-v2 .host{display:grid;grid-template-columns:1fr 1fr;gap:22px}
@media(max-width:760px){.ofm-v2 .host{grid-template-columns:1fr}}
.ofm-v2 .host-card{border:1px solid var(--line);border-radius:var(--r);padding:28px;background:#fff}
.ofm-v2 .host-card.reco{border-color:var(--primary);box-shadow:0 0 0 3px rgba(59,110,245,.1)}
.ofm-v2 .host-card .tagt{font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em}
.ofm-v2 .host-card.reco .tagt{color:var(--primary)}
.ofm-v2 .host-card.own .tagt{color:var(--amber-d)}
.ofm-v2 .host-card h3{font-size:1.2rem;color:var(--navy);margin:.35rem 0 .6rem}
.ofm-v2 .host-card ul{list-style:none;padding:0;margin:0}
.ofm-v2 .host-card li{display:flex;gap:.55rem;font-size:.9rem;padding:.35rem 0;color:#33415c}

/* pricing */
.ofm-v2 .pricing{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;align-items:start}
@media(max-width:820px){.ofm-v2 .pricing{grid-template-columns:1fr;max-width:420px;margin:0 auto}}
.ofm-v2 .price{border:1px solid var(--line);border-radius:18px;padding:28px;background:#fff;position:relative}
.ofm-v2 .price.pop{border-color:var(--primary);box-shadow:var(--shadow);transform:scale(1.03)}
@media(max-width:820px){.ofm-v2 .price.pop{transform:none}}
.ofm-v2 .price .flag{position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:var(--primary);color:#fff;font-size:.7rem;font-weight:700;padding:.3rem .8rem;border-radius:999px}
.ofm-v2 .price h3{font-family:var(--font-sora);font-size:1.15rem;color:var(--navy)}
.ofm-v2 .price .amt{font-family:var(--font-sora);font-weight:800;font-size:2.3rem;color:var(--navy);margin:.4rem 0 .1rem}
.ofm-v2 .price .amt span{font-size:.9rem;font-weight:500;color:var(--muted)}
.ofm-v2 .price .desc{font-size:.86rem;color:var(--muted);min-height:38px}
.ofm-v2 .price ul{list-style:none;padding:0;margin:16px 0}
.ofm-v2 .price li{display:flex;gap:.5rem;font-size:.88rem;padding:.34rem 0;color:#33415c}
.ofm-v2 .price .btn{width:100%;justify-content:center;margin-top:6px}
.ofm-v2 .price-note{text-align:center;color:var(--muted);font-size:.85rem;margin-top:22px}

/* testimonial */
.ofm-v2 .quote{background:linear-gradient(160deg,#0d1b3e,#16295f);color:#fff;border-radius:22px;padding:clamp(30px,4vw,48px);text-align:center;box-shadow:var(--shadow)}
.ofm-v2 .quote .stars{color:var(--amber);letter-spacing:3px;margin-bottom:14px}
.ofm-v2 .quote blockquote{font-family:var(--font-sora);font-weight:500;font-size:clamp(1.15rem,2.3vw,1.55rem);line-height:1.4;margin:0;max-width:760px;margin-inline:auto}
.ofm-v2 .quote cite{display:block;margin-top:18px;color:#aab8d8;font-style:normal;font-size:.9rem}

/* FAQ */
.ofm-v2 .faq{max-width:820px;margin:0 auto}
.ofm-v2 details{border:1px solid var(--line);border-radius:12px;margin-bottom:12px;background:#fff;overflow:hidden}
.ofm-v2 summary{cursor:pointer;padding:18px 20px;font-family:var(--font-sora);font-weight:600;color:var(--navy);font-size:1rem;list-style:none;display:flex;justify-content:space-between;gap:1rem;align-items:center}
.ofm-v2 summary::-webkit-details-marker{display:none}
.ofm-v2 summary:after{content:"+";font-size:1.4rem;color:var(--primary);font-weight:400;transition:.2s}
.ofm-v2 details[open] summary:after{transform:rotate(45deg)}
.ofm-v2 details p{padding:0 20px 18px;margin:0;color:#44526d;font-size:.94rem}

/* DEMO / CTA */
.ofm-v2 .demo{background:linear-gradient(160deg,var(--navy-deep),var(--navy) 60%,var(--navy-2));border-radius:26px;padding:clamp(30px,4vw,52px);color:#fff}
.ofm-v2 .demo-grid{display:grid;grid-template-columns:1fr 1fr;gap:44px;align-items:center}
@media(max-width:840px){.ofm-v2 .demo-grid{grid-template-columns:1fr;gap:30px}}
.ofm-v2 .demo h2{color:#fff}
.ofm-v2 .demo .lead{color:#c2cee9;font-size:1.02rem;margin-top:.8rem}
.ofm-v2 .demo .how{list-style:none;padding:0;margin:1.6rem 0 0}
.ofm-v2 .demo .how li{display:flex;gap:.9rem;padding:.5rem 0;font-size:.94rem;color:#d9e2f6;align-items:flex-start}
.ofm-v2 .demo .how .num{flex:none;width:26px;height:26px;border-radius:8px;background:rgba(59,110,245,.25);color:#9dc0ff;display:grid;place-items:center;font-family:var(--font-sora);font-weight:700;font-size:.82rem}
.ofm-v2 .demo .how b{color:#fff}
.ofm-v2 .form{background:#fff;border-radius:18px;padding:26px;color:var(--ink)}
.ofm-v2 .form h3{font-size:1.15rem;color:var(--navy);margin-bottom:4px}
.ofm-v2 .form .fh{font-size:.85rem;color:var(--muted);margin-bottom:16px}
.ofm-v2 .form p{font-size:.92rem;color:var(--muted);margin:0 0 18px}
.ofm-v2 .form .btn{width:100%;justify-content:center;margin-top:6px}
.ofm-v2 .form .rgpd-mini{font-size:.72rem;color:var(--muted);margin-top:12px;text-align:center}

/* footer */
.ofm-v2 footer{background:var(--navy-deep);color:#aeb9d6;padding:52px 0 30px;font-size:.9rem}
.ofm-v2 .foot-grid{display:grid;grid-template-columns:1.6fr 1fr 1fr 1fr;gap:30px;margin-bottom:30px}
@media(max-width:760px){.ofm-v2 .foot-grid{grid-template-columns:1fr 1fr}}
.ofm-v2 footer h4{color:#fff;font-size:.82rem;text-transform:uppercase;letter-spacing:.08em;margin-bottom:12px}
.ofm-v2 footer a{display:block;padding:.28rem 0;color:#aeb9d6}
.ofm-v2 footer a:hover{color:#fff}
.ofm-v2 .foot-bottom{border-top:1px solid rgba(255,255,255,.1);padding-top:20px;text-align:center;font-size:.8rem;color:#7f8cad}
`;

export default async function HomePage() {
  const session = await auth();
  if (session?.user) {
    const role = session.user.role as Role;
    redirect(
      role === "SUPERADMIN"
        ? "/console"
        : role === "APPRENANT"
          ? "/mon-espace"
          : role === "FORMATEUR"
            ? "/mes-sessions"
            : "/dashboard",
    );
  }

  // Tarifs LIVE (console éditeur → PlanTarif) fusionnés avec l'habillage marketing
  // statique (période + puces). Repli automatique sur les défauts si la BD est
  // indisponible (getResolvedPlans est tolérant aux pannes).
  const { plans: resolved, popular } = await getResolvedPlans();
  const plans = PLAN_ORDER.map((key) => ({
    name: resolved[key].name,
    price: `${resolved[key].price}€`,
    period: PLAN_MARKETING[key]?.period ?? "/ mois",
    desc: resolved[key].tagline,
    pop: key === popular,
    features: PLAN_MARKETING[key]?.features ?? [],
  }));
  const prixNums = plans.map((p) => Number(p.price.replace(/[^\d]/g, "")));

  // JSON-LD domaine-agnostique : le domaine vient de NEXT_PUBLIC_SITE_URL, le
  // canonical reste "/" (cf. metadata). Organization + WebSite +
  // SoftwareApplication (AggregateOffer) + FAQPage (identique à la FAQ visible).
  const base = SITE_URL;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${base}/#organization`,
        name: "OFManager",
        url: base,
        logo: `${base}/ofmanager-logo.png`,
        description:
          "Logiciel de gestion des organismes de formation en sécurité privée (APS, SSIAP, SST…) et VTC/Taxi (examen T3P) — conforme Qualiopi. Édité par CAP SOLUTIONS.",
      },
      {
        "@type": "WebSite",
        "@id": `${base}/#website`,
        url: base,
        name: "OFManager",
        inLanguage: "fr-FR",
        publisher: { "@id": `${base}/#organization` },
      },
      {
        "@type": "SoftwareApplication",
        name: "OFManager",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        inLanguage: "fr-FR",
        description:
          "Logiciel des organismes de formation en sécurité privée et VTC/Taxi : CRM, sessions, documents automatiques, signatures eIDAS, conformité Qualiopi, BPF, RGPD, e-learning.",
        offers: {
          "@type": "AggregateOffer",
          priceCurrency: "EUR",
          lowPrice: String(Math.min(...prixNums)),
          highPrice: String(Math.max(...prixNums)),
          offerCount: plans.length,
          offers: plans.map((p) => ({
            "@type": "Offer",
            name: p.name,
            price: p.price.replace(/[^\d]/g, ""),
            priceCurrency: "EUR",
          })),
        },
        publisher: { "@id": `${base}/#organization` },
      },
      {
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };

  return (
    <main className="ofm-v2">
      {/* Données structurées (SEO) — Organization, WebSite, SoftwareApplication
          + AggregateOffer, FAQPage. Domaine via NEXT_PUBLIC_SITE_URL. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Styles blueprint, scopés sous .ofm-v2 (aucune collision avec l'app). */}
      <style dangerouslySetInnerHTML={{ __html: OFM_CSS }} />
      {/* Reveal au scroll : cible main > section (saute le hero + la bande). */}
      <ScrollReveal skip={2} />

      {/* ===== HEADER ===== */}
      <header>
        <div className="wrap nav">
          <Link href="/" className="logo">
            <Image src="/ofmanager-logo.png" alt="OFManager" width={150} height={48} priority className="h-9 w-auto" />
          </Link>
          <nav className="nav-links">
            <a href="#metiers">Métiers</a>
            <a href="#fonctionnalites">Fonctionnalités</a>
            <a href="#qualiopi">Qualiopi</a>
            <a href="#rgpd">Sécurité &amp; RGPD</a>
            <a href="#tarifs">Tarifs</a>
            <a href="#faq">FAQ</a>
          </nav>
          <div className="nav-cta">
            <Link className="login" href="/login">Connexion</Link>
            <Link className="btn btn-primary" href="/demo">Demander une démo</Link>
          </div>
        </div>
      </header>

      {/* ===== HERO ===== */}
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <span className="tag">🛡️ Sécurité privée · 🚖 <b>VTC / Taxi</b></span>
            <h1>Le logiciel des organismes de formation <span className="hl">réglementés</span>.</h1>
            <p className="lead"><b>Toutes vos formations en sécurité privée</b> (APS, SSIAP, cynophile, aéroportuaire, A3P…) et <b>VTC/Taxi</b> (examen T3P). OFManager génère <b>95 % de vos documents</b>, suit vos prérequis et vos recyclages, et tient votre dossier Qualiopi prêt en permanence.</p>
            <div className="hero-cta">
              <Link className="btn btn-primary" href="/demo">Demander une démo gratuite →</Link>
              <a className="btn btn-ghost" href="#metiers">Voir par métier</a>
            </div>
            <div className="trust-strip">
              <span><i className="dot" /> Conforme Qualiopi — 32 indicateurs</span>
              <span><i className="dot" /> RGPD · Hébergement France</span>
              <span><i className="dot" /> Sans engagement</span>
            </div>
          </div>

          <div className="mock">
            <div className="mock-head">
              <div className="mock-dots"><i /><i /><i /></div>
              <span>Tableau de bord — OFManager</span>
            </div>
            <div className="mock-card">
              <div className="kpi-row">
                <div className="kpi"><div className="n">248</div><div className="l">Candidats</div></div>
                <div className="kpi"><div className="n">14</div><div className="l">Sessions</div></div>
                <div className="kpi green"><div className="n">94%</div><div className="l">Réussite</div></div>
              </div>
              <div className="row-item"><span className="av" style={{ background: "#3B6EF5" }}>ML</span> Marie Lefèvre · TFP APS <span className="pill b">Autorisation CNAPS</span></div>
              <div className="row-item"><span className="av" style={{ background: "#E8A33D" }}>KB</span> Karim Benali · Examen T3P VTC <span className="pill a">Inscrit CMA</span></div>
              <div className="row-item"><span className="av" style={{ background: "#12B886" }}>HP</span> Hugo Petit · Form. continue Taxi <span className="pill g">À jour</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== STAT BAND ===== */}
      <section className="band">
        <div className="wrap band-grid">
          <div><div className="n">95 %</div><div className="l">des documents générés &amp; pré-remplis</div></div>
          <div><div className="n">32</div><div className="l">indicateurs Qualiopi couverts</div></div>
          <div><div className="n">0</div><div className="l">double saisie — vos données reliées</div></div>
          <div><div className="n">2</div><div className="l">métiers préconfigurés : sécurité &amp; T3P</div></div>
        </div>
      </section>

      {/* ===== PROBLÈME / SOLUTION ===== */}
      <section className="blk" style={{ background: "var(--paper)" }}>
        <div className="wrap">
          <div className="center">
            <span className="eyebrow">Le quotidien des OF</span>
            <h2>Vous reconnaissez ces galères ?</h2>
            <p>Tableurs, e-mails, relances, dossiers CNAPS ou T3P éparpillés… OFManager remplace tout ça par une seule plateforme.</p>
          </div>
          <div className="ps">
            <div className="ps-col bad">
              <h3>😰 Sans OFManager</h3>
              <ul>
                <li>Données éclatées dans 5 tableurs Excel</li>
                <li>Convocations, attestations &amp; relances tapées à la main</li>
                <li>Suivi CNAPS / inscriptions T3P au cas par cas</li>
                <li>Recyclages &amp; formations continues oubliés</li>
                <li>Stress avant l'audit Qualiopi</li>
                <li>Des heures de ressaisie, des erreurs qui coûtent cher</li>
              </ul>
            </div>
            <div className="ps-col good">
              <h3>✨ Avec OFManager</h3>
              <ul>
                <li>Une seule plateforme, toutes vos données reliées</li>
                <li>95 % des documents générés &amp; envoyés automatiquement</li>
                <li>Suivi CNAPS &amp; examen T3P intégré, dès le prospect</li>
                <li>Échéancier des recyclages &amp; relances automatiques</li>
                <li>Dossier d'audit Qualiopi prêt en permanence, export 1 clic</li>
                <li>Zéro double saisie, zéro oubli</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ===== MÉTIERS (dual) ===== */}
      <section className="blk" id="metiers">
        <div className="wrap">
          <div className="center">
            <span className="eyebrow">Pensé pour vos certifications</span>
            <h2>Un logiciel sur mesure pour votre métier</h2>
            <p>Parcours, prérequis, documents réglementaires et échéances : tout est préconfiguré selon votre activité.</p>
          </div>
          <div className="metiers">
            <div className="metier sec">
              <div className="ic">🛡️</div>
              <h3>Sécurité privée — tout votre catalogue</h3>
              <div className="sub">APS · MAC APS · SSIAP 1·2·3 · Cynophile (ASC) · Aéroportuaire (ASA) · A3P · Vidéoprotection · SST…</div>
              <ul>
                <li><span className="chk">✓</span><span>Conçu pour <b>toutes vos formations sécurité privée</b>, pas seulement l'APS — de l'agent de prévention à la sûreté aéroportuaire</span></li>
                <li><span className="chk">✓</span><span>Suivi de l'<b>autorisation préalable &amp; carte pro CNAPS</b>, dès l'étape prospect</span></li>
                <li><span className="chk">✓</span><span>Prérequis réglementaires vérifiés automatiquement par formation</span></li>
                <li><span className="chk">✓</span><span>Grilles de certification pré-remplies, signées par le formateur</span></li>
                <li><span className="chk">✓</span><span>Échéancier des <b>recyclages MAC / SSIAP / habilitation</b> avec relance</span></li>
                <li><span className="chk">✓</span><span>Convocations d'examen &amp; dossiers réglementaires générés</span></li>
              </ul>
            </div>
            <div className="metier vtc">
              <div className="ic">🚖</div>
              <h3>VTC / Taxi</h3>
              <div className="sub">Examen T3P · RS 5635 (Taxi) · RS 5637 (VTC) · Formation continue</div>
              <ul>
                <li><span className="chk">✓</span><span>Suivi de chaque candidat de l'inscription à l'<b>examen T3P (CMA)</b> jusqu'à la carte pro</span></li>
                <li><span className="chk">✓</span><span>Gestion des <b>identifiants de la plateforme nationale T3P</b> par candidat</span></li>
                <li><span className="chk">✓</span><span>Relance automatique avant l'échéance de la <b>formation continue (14 h / 5 ans)</b></span></li>
                <li><span className="chk">✓</span><span>Dossier CPF conforme (RS 5635 / RS 5637), livret &amp; attestations générés</span></li>
                <li><span className="chk">✓</span><span>Suivi des sessions d'examen limitées &amp; calendrier CMA</span></li>
              </ul>
            </div>
          </div>
          <p className="price-note">➕ Et votre catalogue reste illimité : ajoutez toute autre formation avec son dossier et ses prérequis.</p>
        </div>
      </section>

      {/* ===== FONCTIONNALITÉS ===== */}
      <section className="blk" id="fonctionnalites" style={{ background: "var(--paper)" }}>
        <div className="wrap">
          <div className="center">
            <span className="eyebrow">Fonctionnalités complètes</span>
            <h2>Tout le cycle de votre organisme, dans un seul outil</h2>
            <p>De l'acquisition à la certification, les tâches répétitives partent en automatique. Vous gardez le contrôle et la relation client.</p>
          </div>
          <div className="feat">
            <div className="fcard">
              <div className="fi">📊</div>
              <h3>CRM &amp; acquisition</h3>
              <p>Chaque lead capté, qualifié et relancé — jusqu'à la signature.</p>
              <ul>
                <li><span className="chk">✓</span> Pipeline Kanban &amp; scoring des leads</li>
                <li><span className="chk">✓</span> Prospects multicanaux (vitrine, e-mail, import)</li>
                <li><span className="chk">✓</span> Relances programmées, aucun oubli</li>
              </ul>
            </div>
            <div className="fcard">
              <div className="fi">📚</div>
              <h3>Catalogue &amp; modèles réglementaires</h3>
              <p>Des formations prêtes à l'emploi, conformes au cadre réglementaire.</p>
              <ul>
                <li><span className="chk">✓</span> Sécurité (SSIAP, SST, CNAPS) &amp; VTC/Taxi T3P</li>
                <li><span className="chk">✓</span> Modèles Qualiopi complets par formation</li>
                <li><span className="chk">✓</span> Jury &amp; grilles INRS configurables</li>
              </ul>
            </div>
            <div className="fcard">
              <div className="fi">📅</div>
              <h3>Sessions &amp; planning</h3>
              <p>Planifiez, affectez, remplissez — sans double-saisie.</p>
              <ul>
                <li><span className="chk">✓</span> Salles, capacités &amp; multi-formateurs</li>
                <li><span className="chk">✓</span> Convocations &amp; émargement signé</li>
                <li><span className="chk">✓</span> Alertes J-1 &amp; listes d'attente</li>
              </ul>
            </div>
            <div className="fcard">
              <div className="fi">👥</div>
              <h3>Inscriptions &amp; candidats</h3>
              <p>De l'inscription en ligne au dossier complet, en continu.</p>
              <ul>
                <li><span className="chk">✓</span> Multicanal : web, e-mail, sur place, CSV</li>
                <li><span className="chk">✓</span> Prérequis CNAPS, carte pro, SSIAP</li>
                <li><span className="chk">✓</span> Fiche candidat 360° &amp; suivi des pièces</li>
              </ul>
            </div>
            <div className="fcard">
              <div className="fi">✍️</div>
              <h3>Documents &amp; signature</h3>
              <p>95 % de vos documents générés, signés et archivés.</p>
              <ul>
                <li><span className="chk">✓</span> Conventions, devis, attestations en un clic</li>
                <li><span className="chk">✓</span> Signature électronique eIDAS (YouSign)</li>
                <li><span className="chk">✓</span> Exports CSV/Excel/PDF par module</li>
              </ul>
            </div>
            <div className="fcard">
              <div className="fi">🎖️</div>
              <h3>Certifications &amp; examens</h3>
              <p>Du résultat à l'attestation vérifiable, automatiquement.</p>
              <ul>
                <li><span className="chk">✓</span> Résultats, paliers &amp; attestations auto</li>
                <li><span className="chk">✓</span> Vérification anti-fraude publique</li>
                <li><span className="chk">✓</span> Diplômes &amp; badges numériques</li>
              </ul>
            </div>
            <div className="fcard">
              <div className="fi">💰</div>
              <h3>Financement &amp; facturation</h3>
              <p>Le bon dispositif, le bon document, la bonne facture.</p>
              <ul>
                <li><span className="chk">✓</span> Simulateur CPF, OPCO, France Travail, PTP</li>
                <li><span className="chk">✓</span> Devis &amp; factures automatisés (Stripe)</li>
                <li><span className="chk">✓</span> Trésorerie &amp; BPF pré-rempli</li>
              </ul>
            </div>
            <div className="fcard">
              <div className="fi">🎓</div>
              <h3>E-learning &amp; parcours</h3>
              <p>La formation en ligne et son suivi, intégrés.</p>
              <ul>
                <li><span className="chk">✓</span> Parcours, quiz &amp; progression</li>
                <li><span className="chk">✓</span> Examens blancs (SSIAP, T3P VTC/Taxi)</li>
                <li><span className="chk">✓</span> Grilles de certification par stagiaire</li>
              </ul>
            </div>
            <div className="fcard">
              <div className="fi">🤖</div>
              <h3>Automatisations &amp; IA</h3>
              <p>Le travail répétitif part en tâche de fond.</p>
              <ul>
                <li><span className="chk">✓</span> 27 e-mails candidats prêts à l'emploi</li>
                <li><span className="chk">✓</span> Notifications staff &amp; jobs planifiés</li>
                <li><span className="chk">✓</span> Assistant IA (rédaction, résumés, tri)</li>
              </ul>
            </div>
          </div>

          <div className="also">
            <div className="lbl">Et aussi dans la plateforme</div>
            <div className="chips">
              <span>📱 Application mobile (PWA + native)</span>
              <span>📷 Scanner QR → PDF</span>
              <span>🔔 Notifications push</span>
              <span>🔗 API publique &amp; webhooks</span>
              <span>🔄 Sync Wedof (CPF) &amp; Brevo</span>
              <span>🏢 Multi-tenant &amp; marque blanche</span>
              <span>🔑 Rôles &amp; permissions granulaires</span>
              <span>🇫🇷 Hébergement France / Europe</span>
              <span>📈 Monitoring &amp; supervision</span>
              <span>🚀 Mode démo 48 h</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== QUALIOPI (signature) ===== */}
      <section className="blk" id="qualiopi">
        <div className="wrap">
          <div className="qua">
            <div className="qua-grid">
              <div>
                <span className="badge">✓ AUDIT-READY EN PERMANENCE</span>
                <h2>Arrivez à votre audit Qualiopi l'esprit tranquille</h2>
                <p style={{ color: "#c2cee9", marginTop: ".8rem" }}>Chaque session, émargement et document alimente automatiquement votre dossier qualité. Le jour de l'audit, tout est classé par indicateur — exportable en un clic.</p>
                <ul>
                  <li><span className="chk">✓</span><span><b>Preuves rattachées en continu</b>Sur les 7 critères &amp; 32 indicateurs du Référentiel National Qualité.</span></li>
                  <li><span className="chk">✓</span><span><b>Dossier d'audit exportable</b>Toutes les preuves classées par indicateur, prêtes pour l'auditeur.</span></li>
                  <li><span className="chk">✓</span><span><b>BPF pré-rempli</b>Votre Bilan Pédagogique et Financier généré à partir de vos données réelles.</span></li>
                </ul>
                <div style={{ marginTop: "1.6rem" }}><Link className="btn btn-primary" href="/demo">Préparez votre prochain audit →</Link></div>
              </div>
              <div>
                <div className="ring">
                  <svg viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="10" />
                    <circle cx="60" cy="60" r="52" fill="none" stroke="#12B886" strokeWidth="10" strokeLinecap="round" strokeDasharray="326.7" strokeDashoffset="0" />
                  </svg>
                  <div className="ctr"><div className="p">100%</div><div className="t">conforme</div></div>
                </div>
                <div className="crits">
                  <span>C1 · Information</span><span>C2 · Objectifs</span><span>C3 · Accueil &amp; suivi</span>
                  <span>C4 · Moyens</span><span>C5 · Formateurs</span><span>C6 · Environnement</span><span>C7 · Appréciations</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== RGPD & SÉCURITÉ ===== */}
      <section className="blk" id="rgpd" style={{ background: "var(--paper)" }}>
        <div className="wrap">
          <div className="center">
            <span className="eyebrow">Confiance &amp; conformité</span>
            <h2>Vos données de stagiaires, protégées</h2>
            <p>Vous manipulez des données personnelles sensibles (identités, financements, dossiers CNAPS/T3P). OFManager est conçu RGPD by design.</p>
          </div>
          <div className="rgpd">
            <div className="rgpd-shield">
              <div className="lock">🔒</div>
              <div className="big">RGPD by design</div>
              <p>Hébergement en France · Chiffrement · Journalisation des accès · Signatures eIDAS horodatées</p>
            </div>
            <div className="rgpd-list">
              <div className="rgpd-item"><div className="h"><span className="chk">✓</span> Hébergement en France</div><p>Vos données restent sur le territoire, chez un hébergeur conforme.</p></div>
              <div className="rgpd-item"><div className="h"><span className="chk">✓</span> Registre des traitements</div><p>Traitements documentés et prêts à présenter en cas de contrôle CNIL.</p></div>
              <div className="rgpd-item"><div className="h"><span className="chk">✓</span> Contrat de sous-traitance (DPA)</div><p>Un DPA vous est fourni : vous êtes couvert vis-à-vis de vos stagiaires.</p></div>
              <div className="rgpd-item"><div className="h"><span className="chk">✓</span> Accès &amp; durées maîtrisés</div><p>Rôles par utilisateur, purge des données selon vos durées de conservation.</p></div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== HÉBERGEMENT ===== */}
      <section className="blk">
        <div className="wrap">
          <div className="center">
            <span className="eyebrow">Hébergement au choix</span>
            <h2>Chez nous, ou chez vous</h2>
          </div>
          <div className="host">
            <div className="host-card reco">
              <div className="tagt">Recommandé</div>
              <h3>Cloud OFManager</h3>
              <ul>
                <li><span className="chk">✓</span> Mise en route immédiate, prêt à l'emploi</li>
                <li><span className="chk">✓</span> Mises à jour &amp; sauvegardes automatiques</li>
                <li><span className="chk">✓</span> Hébergement en France, RGPD</li>
                <li><span className="chk">✓</span> Supervision &amp; sécurité incluses</li>
              </ul>
            </div>
            <div className="host-card own">
              <div className="tagt">Souveraineté</div>
              <h3>Sur vos serveurs (interne)</h3>
              <ul>
                <li><span className="chk">✓</span> Vos données sur votre infrastructure</li>
                <li><span className="chk">✓</span> Contrôle &amp; souveraineté totale</li>
                <li><span className="chk">✓</span> Idéal grands comptes &amp; marchés sensibles</li>
                <li><span className="chk">✓</span> Déploiement &amp; maintenance accompagnés</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ===== TARIFS (rendus côté serveur) ===== */}
      <section className="blk" id="tarifs" style={{ background: "var(--paper)" }}>
        <div className="wrap">
          <div className="center">
            <span className="eyebrow">Tarifs simples</span>
            <h2>Une formule pour chaque organisme</h2>
            <p>Sans engagement, support inclus partout. Tarif sur mesure pour l'hébergement interne.</p>
          </div>
          <div className="pricing">
            {plans.map((p) => (
              <div key={p.name} className={`price${p.pop ? " pop" : ""}`}>
                {p.pop && <div className="flag">Le plus choisi</div>}
                <h3>{p.name}</h3>
                <div className="amt">{p.price}<span> {p.period}</span></div>
                <div className="desc">{p.desc}</div>
                <ul>
                  {p.features.map((f) => (
                    <li key={f}><span className="chk">✓</span> {f}</li>
                  ))}
                </ul>
                <Link className={`btn ${p.pop ? "btn-primary" : "btn-ghost"}`} href="/demo">Choisir {p.name}</Link>
              </div>
            ))}
          </div>
          <p className="price-note">Les formules, fonctionnalités et tarifs sont pilotés en temps réel depuis la console OFManager.</p>
        </div>
      </section>

      {/* ===== PROMESSE (remplace un faux témoignage — à substituer par de vrais avis clients dès disponibles) ===== */}
      <section className="blk">
        <div className="wrap">
          <div className="quote">
            <blockquote>« Un seul outil, pensé pour les métiers réglementés : de la première inscription à l&apos;audit Qualiopi, sans double saisie ni signature papier. »</blockquote>
            <cite>La promesse OFManager</cite>
          </div>
        </div>
      </section>

      {/* ===== FAQ (identique au JSON-LD FAQPage) ===== */}
      <section className="blk" id="faq" style={{ background: "var(--paper)" }}>
        <div className="wrap">
          <div className="center"><span className="eyebrow">Questions fréquentes</span><h2>Tout ce qu'il faut savoir</h2></div>
          <div className="faq">
            {faqs.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ===== DÉMO / CTA (vers /demo, pas de formulaire stub) ===== */}
      <section className="blk" id="demo">
        <div className="wrap">
          <div className="demo">
            <div className="demo-grid">
              <div>
                <span className="eyebrow" style={{ color: "#9dc0ff" }}>Démo gratuite</span>
                <h2>Testez OFManager en conditions réelles</h2>
                <p className="lead">Demandez une démo : vous recevez un e-mail avec le lien de la plateforme et un accès de démonstration prêt à l'emploi.</p>
                <ul className="how">
                  <li><span className="num">1</span><span>Vous remplissez le formulaire (30 secondes).</span></li>
                  <li><span className="num">2</span><span>Vous recevez un <b>e-mail de bienvenue</b> avec le lien et vos <b>identifiants de démo</b>.</span></li>
                  <li><span className="num">3</span><span>Vous explorez librement un environnement pré-rempli à votre métier.</span></li>
                  <li><span className="num">4</span><span>On vous rappelle sous 24 h pour répondre à vos questions.</span></li>
                </ul>
              </div>
              <div className="form">
                <h3>Recevoir mon accès de démo</h3>
                <div className="fh">Réponse rapide par e-mail · sans carte bancaire.</div>
                <p>Un environnement de démonstration pré-rempli à votre métier, prêt à explorer. Vous remplissez un court formulaire, on s'occupe du reste.</p>
                <Link className="btn btn-primary" href="/demo">Demander ma démo gratuite →</Link>
                <div className="rgpd-mini">🔒 Vos données ne servent qu'à traiter votre demande. RGPD — hébergement France.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer>
        <div className="wrap">
          <div className="foot-grid">
            <div>
              <Image src="/ofmanager-logo.png" alt="OFManager" width={150} height={48} className="h-9 w-auto" style={{ marginBottom: "10px" }} />
              <p style={{ maxWidth: "280px" }}>Le logiciel des organismes de formation réglementés : sécurité privée &amp; VTC/Taxi.</p>
              <p>Édité par <b style={{ color: "#fff" }}>CAP SOLUTIONS</b></p>
            </div>
            <div>
              <h4>Produit</h4>
              <a href="#metiers">Métiers</a>
              <a href="#fonctionnalites">Fonctionnalités</a>
              <a href="#tarifs">Tarifs</a>
              <Link href="/login">Connexion</Link>
            </div>
            <div>
              <h4>Solutions</h4>
              <Link href="/solutions/tfp-aps">TFP APS</Link>
              <Link href="/solutions/ssiap">SSIAP</Link>
              <Link href="/solutions/sst">SST</Link>
              <Link href="/solutions/vtc-taxi">VTC / Taxi</Link>
              <Link href="/solutions/qualiopi">Qualiopi</Link>
            </div>
            <div>
              <h4>Légal</h4>
              <Link href="/mentions-legales">Mentions légales</Link>
              <Link href="/cgv">CGV</Link>
              <Link href="/confidentialite">Confidentialité</Link>
              <Link href="/confidentialite">RGPD</Link>
            </div>
          </div>
          <div className="foot-bottom">© 2026 OFManager — une solution CAP SOLUTIONS. Tous droits réservés.</div>
        </div>
      </footer>
    </main>
  );
}
