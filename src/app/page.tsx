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
import { OFM_CSS } from "@/components/site/ofm-css";

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
            <Link href="/fonctionnalites">Fonctionnalités</Link>
            <Link href="/anti-fraude">Anti-fraude</Link>
            <Link href="/guides">Blog</Link>
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

      {/* ===== ANTI-FRAUDE (différenciateur mis en avant) ===== */}
      <section className="blk" style={{ background: "linear-gradient(135deg, #0D1B3E, #0b3b30)" }}>
        <div className="wrap" style={{ textAlign: "center", color: "#fff" }}>
          <span className="eyebrow" style={{ color: "#5EEAD4" }}>Différenciateur exclusif</span>
          <h2 style={{ color: "#fff" }}>Des titres qu&apos;on ne peut pas falsifier</h2>
          <p style={{ maxWidth: "640px", margin: "0.8rem auto 0", color: "#cddaf0" }}>
            Chaque diplôme et attestation que vous délivrez porte un numéro unique et un QR code, vérifiables en ligne par
            n&apos;importe qui — employeur, préfecture, client. La fraude documentaire s&apos;arrête à votre porte.
          </p>
          <div style={{ marginTop: "1.6rem", display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/anti-fraude" style={{ background: "#12B886", color: "#fff", padding: "0.8rem 1.5rem", borderRadius: "12px", fontWeight: 700, textDecoration: "none" }}>Découvrir l&apos;anti-fraude →</Link>
            <Link href="/verification" style={{ border: "1px solid rgba(255,255,255,.4)", color: "#fff", padding: "0.8rem 1.5rem", borderRadius: "12px", fontWeight: 700, textDecoration: "none" }}>Vérifier un titre</Link>
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
              <Link href="/fonctionnalites">Fonctionnalités</Link>
              <Link href="/anti-fraude">Anti-fraude</Link>
              <Link href="/comparatif">Comparatif</Link>
              <Link href="/guides">Blog</Link>
              <Link href="/glossaire">Glossaire</Link>
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
