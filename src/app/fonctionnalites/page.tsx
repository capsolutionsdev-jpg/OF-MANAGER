import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SITE_URL } from "@/lib/site-url";
import { OFM_CSS } from "@/components/site/ofm-css";
import { ScrollReveal } from "@/components/site/scroll-reveal";
import { FeaturesMetier } from "@/components/site/features-metier";

export const metadata: Metadata = {
  title: "Fonctionnalités — OFManager, le logiciel tout-en-un des OF réglementés",
  description:
    "Toutes les fonctionnalités d'OFManager : CRM, inscriptions, sessions, documents & signature eIDAS, certifications, vérification anti-fraude, Qualiopi, BPF, facturation, e-learning et automatisation — préconfiguré pour la sécurité privée (SSIAP, TFP APS, CNAPS) et le transport (T3P VTC/Taxi).",
  keywords: [
    "fonctionnalités logiciel organisme de formation",
    "logiciel gestion OF",
    "logiciel formation tout-en-un",
    "logiciel SSIAP",
    "logiciel T3P VTC taxi",
    "vérification anti-fraude titre",
    "logiciel Qualiopi BPF",
  ],
  alternates: { canonical: "/fonctionnalites" },
  openGraph: {
    title: "Fonctionnalités OFManager — tout le cycle de votre OF, dans un seul outil",
    description:
      "CRM, inscriptions, documents, signature, certifications, anti-fraude, Qualiopi, facturation, e-learning et automatisation. Préconfiguré sécurité privée & VTC/Taxi.",
    url: "/fonctionnalites",
  },
};

// CSS spécifique à la page (nouveaux éléments), scopé .ofm-v2 pour ne pas
// heurter l'app. Complète les classes partagées d'OFM_CSS.
const FONC_CSS = `
.ofm-v2 .fonc-hero{padding:72px 0 8px;background:linear-gradient(180deg,var(--paper),var(--white));text-align:center}
.ofm-v2 .fonc-hero h1{font-size:clamp(2.1rem,4.6vw,3.4rem);max-width:16ch;margin:0 auto}
.ofm-v2 .fonc-hero .hl{color:var(--primary)}
.ofm-v2 .fonc-hero .lead{max-width:56ch;margin:1.1rem auto 1.6rem;color:var(--muted);font-size:1.08rem}
.ofm-v2 .fonc-hero .hero-cta{justify-content:center}
.ofm-v2 .fonc-intro{max-width:60ch;margin:0 auto 8px;text-align:center;color:var(--muted)}

/* Sélecteur métier (élément signature) */
.ofm-v2 .fonc-toggle{display:flex;gap:6px;padding:6px;border:1px solid var(--line);border-radius:16px;background:var(--white);box-shadow:var(--shadow-sm);width:max-content;max-width:100%;margin:0 auto 40px}
.ofm-v2 .fonc-toggle button{font-family:var(--font-sora);font-weight:600;font-size:.98rem;padding:.8rem 1.4rem;border:0;border-radius:11px;background:transparent;color:var(--navy);cursor:pointer;transition:.18s ease;white-space:nowrap}
.ofm-v2 .fonc-toggle button:hover{color:var(--primary)}
.ofm-v2 .fonc-toggle button.active{background:var(--navy);color:#fff;box-shadow:0 8px 20px -10px rgba(13,27,62,.6)}

/* Parcours — grille compacte de cartes (le sélecteur métier reste l'interactif) */
.ofm-v2 .fonc-steps{list-style:none;padding:0;margin:0 auto;max-width:980px;display:grid;grid-template-columns:1fr 1fr;gap:16px}
.ofm-v2 .fonc-step{border:1px solid var(--line);border-radius:14px;padding:18px 20px;background:var(--white)}
.ofm-v2 .fonc-step-head{display:flex;align-items:center;gap:12px;margin-bottom:.4rem}
.ofm-v2 .fonc-step-n{font-family:var(--font-sora);font-weight:700;font-size:.92rem;width:32px;height:32px;border-radius:9px;background:var(--navy);color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.ofm-v2 .fonc-step-head h3{font-size:1.12rem}
.ofm-v2 .fonc-punch{color:var(--muted);font-weight:600;font-size:.92rem;margin:0 0 .7rem}
.ofm-v2 .fonc-metier{padding:.7rem .85rem;border-radius:10px;border-left:3px solid var(--primary);font-size:.9rem;transition:.2s ease}
.ofm-v2 .fonc-metier[data-metier=securite]{background:rgba(18,184,134,.09);border-color:var(--green)}
.ofm-v2 .fonc-metier[data-metier=transport]{background:rgba(59,110,245,.09);border-color:var(--primary)}
.ofm-v2 .fonc-metier-tag{margin-right:.4rem}

/* Deep-dives — grille 2×2 compacte */
.ofm-v2 .dd-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;max-width:980px;margin-inline:auto}
.ofm-v2 .dd-card{border:1px solid var(--line);border-radius:16px;padding:22px 24px;background:var(--white)}
.ofm-v2 .dd-card .dd-badge{display:inline-flex;font-family:var(--font-sora);font-weight:700;font-size:.72rem;letter-spacing:.04em;color:var(--primary);background:rgba(59,110,245,.1);padding:.25rem .65rem;border-radius:999px;margin-bottom:.65rem}
.ofm-v2 .dd-card h3{font-size:1.22rem;margin-bottom:.35rem}
.ofm-v2 .dd-card p{color:var(--muted);font-size:.93rem}
.ofm-v2 .dd-card ul{list-style:none;padding:0;margin:.75rem 0 0;display:grid;gap:.4rem}
.ofm-v2 .dd-card ul li{font-size:.88rem}
.ofm-v2 .dd-card ul .chk{color:var(--green);font-weight:800;margin-right:.4rem}

/* Comparatif */
.ofm-v2 .cmp{background:var(--navy);color:#fff;border-radius:22px;padding:44px;text-align:center;box-shadow:var(--shadow)}
.ofm-v2 .cmp h2{font-size:1.9rem}
.ofm-v2 .cmp .cmp-grid{display:grid;grid-template-columns:1fr auto 1fr;gap:24px;align-items:center;margin-top:26px;max-width:820px;margin-inline:auto}
.ofm-v2 .cmp .col{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:20px;text-align:left}
.ofm-v2 .cmp .col.win{background:rgba(59,110,245,.16);border-color:rgba(59,110,245,.5)}
.ofm-v2 .cmp .col h4{font-size:1rem;margin-bottom:.7rem}
.ofm-v2 .cmp .col ul{list-style:none;padding:0;margin:0;display:grid;gap:.4rem;font-size:.88rem;color:rgba(255,255,255,.82)}
.ofm-v2 .cmp .arrow{font-size:1.6rem;color:var(--amber)}

/* Grille exhaustive des fonctionnalités */
.ofm-v2 .feat-cat{margin-top:28px}
.ofm-v2 .feat-cat:first-of-type{margin-top:14px}
.ofm-v2 .feat-cat-h{display:flex;align-items:center;gap:.55rem;font-family:var(--font-sora);font-weight:700;font-size:1.05rem;color:var(--navy);margin-bottom:11px}
.ofm-v2 .feat-cat-h .em{font-size:1.15rem}
.ofm-v2 .feat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:11px}
.ofm-v2 .feat-card{background:var(--white);border:1px solid var(--line);border-radius:12px;padding:13px 14px;transition:.16s ease}
.ofm-v2 .feat-card:hover{border-color:var(--primary);box-shadow:var(--shadow-sm)}
.ofm-v2 .feat-card .fn{font-family:var(--font-sora);font-weight:600;font-size:.92rem;color:var(--ink);display:block;margin-bottom:.2rem}
.ofm-v2 .feat-card .fd{font-size:.82rem;color:var(--muted);line-height:1.45}
@media(max-width:1000px){.ofm-v2 .feat-grid{grid-template-columns:repeat(3,1fr)}}
@media(max-width:760px){.ofm-v2 .feat-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:520px){.ofm-v2 .feat-grid{grid-template-columns:1fr}}

/* CTA final */
.ofm-v2 .cta-final{background:linear-gradient(135deg,var(--navy),var(--navy-2));color:#fff;padding:64px 0;text-align:center}
.ofm-v2 .cta-final h2{font-size:1.9rem}
.ofm-v2 .cta-final p{color:rgba(255,255,255,.72);max-width:52ch;margin:.8rem auto 1.5rem}

@media(max-width:820px){
  .ofm-v2 .dd-grid,.ofm-v2 .fonc-steps,.ofm-v2 .cmp .cmp-grid{grid-template-columns:1fr}
  .ofm-v2 .cmp .arrow{transform:rotate(90deg)}
}
`;

const DEEP = [
  {
    badge: "0 paramétrage",
    h: "Préconfiguré pour votre métier",
    p: "Vous n'installez rien, vous ne paramétrez rien : vos formations réglementées, leurs prérequis et leurs modèles Qualiopi sont déjà là.",
    li: [
      "32 formations sécurité & transport prêtes à l'emploi",
      "Prérequis réglementaires vérifiés par formation",
      "Modèles de documents Qualiopi par formation",
    ],
  },
  {
    badge: "Anti-fraude",
    h: "Vérification publique des titres",
    p: "Chaque titre porte un numéro unique et un QR code, vérifiables en ligne par n'importe qui — un différenciateur que vos concurrents n'ont pas.",
    li: [
      "Numéro de vérification + QR sur chaque diplôme",
      "Page publique (candidat, employeur, préfecture)",
      "Traçabilité complète, titres infalsifiables",
    ],
  },
  {
    badge: "32/32 indicateurs",
    h: "Qualiopi, prêt à tout moment",
    p: "Chaque session, émargement et document alimente votre dossier qualité en continu. Le jour de l'audit, tout est déjà rangé.",
    li: [
      "Preuves rattachées en continu sur les 32 indicateurs",
      "Dossier d'audit exportable en 1 clic",
      "BPF pré-rempli à partir de vos données réelles",
    ],
  },
  {
    badge: "−70 % de temps admin",
    h: "L'automatisation qui travaille pour vous",
    p: "Composez vos circuits sur une timeline visuelle et laissez le répétitif partir en tâche de fond — apprenants, entreprises et formateurs.",
    li: [
      "Studio de circuits d'automatisation (multi-audience)",
      "27 e-mails candidats prêts + assistant IA",
      "Espace client B2B : vos entreprises en autonomie",
    ],
  },
];

const FAQ_F = [
  { q: "Faut-il paramétrer les formations une par une ?", a: "Non. Les formations sécurité (SSIAP, TFP APS, MAC, habilitation…) et transport (T3P VTC/Taxi, formation continue) sont préconfigurées avec leurs prérequis et leurs documents Qualiopi. Vous ajustez, vous ne repartez pas de zéro." },
  { q: "OFManager remplace combien d'outils ?", a: "En général cinq : le tableur, la messagerie/relances, l'outil de signature, la solution e-learning et la facturation. Tout est réuni et relié — zéro double saisie." },
  { q: "Les documents sont-ils vraiment générés automatiquement ?", a: "Oui — conventions, convocations, attestations, feuilles d'émargement, certificats : 95 % de vos documents sont générés et signés électroniquement (eIDAS), puis archivés." },
  { q: "Mes titres peuvent-ils être vérifiés par un tiers ?", a: "Oui. Chaque titre délivré porte un numéro et un QR code vérifiables sur une page publique — utile pour les employeurs, les préfectures et la lutte anti-fraude." },
];

// Catalogue EXHAUSTIF : chaque fonctionnalité + sa description courte, groupé par
// catégorie. C'est la preuve « tout est là ».
const FEATURES: { cat: string; em: string; items: { nom: string; desc: string }[] }[] = [
  {
    cat: "CRM & acquisition", em: "🎯",
    items: [
      { nom: "Pipeline CRM Kanban", desc: "Chaque lead capté, scoré et relancé jusqu'à la signature." },
      { nom: "Prospection sortante", desc: "Importez vos fichiers de prospects, découpage géographique, ajout manuel." },
      { nom: "Site vitrine & capture de leads", desc: "Votre vitrine et vos formulaires alimentent directement le CRM." },
      { nom: "Scoring & qualification", desc: "Les prospects chauds remontent automatiquement en priorité." },
    ],
  },
  {
    cat: "Catalogue & conformité", em: "📚",
    items: [
      { nom: "Formations préconfigurées", desc: "SSIAP, TFP APS, MAC, T3P… prêtes avec leurs prérequis." },
      { nom: "Modèles Qualiopi par formation", desc: "Objectifs, public, prérequis, évaluation déjà rédigés." },
      { nom: "Jury & grilles de certification", desc: "Grilles INRS / certificateur configurables et pré-remplies." },
    ],
  },
  {
    cat: "Sessions & planning", em: "🗓️",
    items: [
      { nom: "Planning des sessions", desc: "Salles, capacités et multi-formateurs en un coup d'œil." },
      { nom: "Convocations automatiques", desc: "Envoyées au bon moment, sans y penser." },
      { nom: "Émargement électronique signé", desc: "Tablette ou mobile, en salle ou à distance, avec QR code." },
      { nom: "Listes d'attente & alertes J-1", desc: "Remplissez vos sessions, ne ratez aucun rappel." },
    ],
  },
  {
    cat: "Inscriptions & candidats", em: "🧑‍🎓",
    items: [
      { nom: "Inscription multicanale", desc: "Web, e-mail, sur place ou import CSV." },
      { nom: "Fiche candidat 360°", desc: "Historique, pièces, résultats et suivi réunis." },
      { nom: "Suivi des prérequis", desc: "CNAPS, carte pro, permis, aptitude médicale, SST vérifiés." },
      { nom: "Dossier administratif en ligne", desc: "Le candidat ou l'entreprise dépose ses pièces, vous validez." },
    ],
  },
  {
    cat: "Espace client B2B", em: "🏢",
    items: [
      { nom: "Portail entreprises", desc: "Vos clients pros suivent leurs salariés en autonomie." },
      { nom: "Inscription self-service", desc: "L'entreprise inscrit ses salariés à vos sessions." },
      { nom: "Convention générée & signée", desc: "Convention Qualiopi éditée puis signée en ligne." },
      { nom: "Factures & documents", desc: "Le client récupère ses factures et documents 24/7." },
    ],
  },
  {
    cat: "Documents & signature", em: "✍️",
    items: [
      { nom: "Génération automatique", desc: "Conventions, convocations, attestations en PDF en 1 clic." },
      { nom: "Signature électronique eIDAS", desc: "Signature horodatée conforme (YouSign)." },
      { nom: "GED & archivage", desc: "Tous les documents rattachés, classés et retrouvables." },
      { nom: "Exports CSV / Excel / PDF", desc: "Par module, pour vos analyses et vos obligations." },
    ],
  },
  {
    cat: "Certifications & anti-fraude", em: "🎖️",
    items: [
      { nom: "Résultats & attestations", desc: "Générés automatiquement à la fin de la session." },
      { nom: "Diplômes & badges numériques", desc: "Titres remis avec un rendu professionnel." },
      { nom: "Vérification anti-fraude publique", desc: "Chaque titre a un numéro + QR vérifiable par un tiers." },
      { nom: "Suivi de délivrance des diplômes", desc: "Envoyé au certificateur → reçu → remis, tracé." },
    ],
  },
  {
    cat: "Financement & facturation", em: "💶",
    items: [
      { nom: "Simulateur de financement", desc: "CPF, OPCO, France Travail, PTP selon le profil." },
      { nom: "Devis & factures automatisés", desc: "Paiement en ligne Stripe (CB, SEPA)." },
      { nom: "BPF pré-rempli", desc: "Votre Bilan Pédagogique et Financier à partir de vos données." },
      { nom: "Trésorerie & relances", desc: "Suivi des paiements et des OPCO, relances intégrées." },
    ],
  },
  {
    cat: "E-learning & examens", em: "💻",
    items: [
      { nom: "Parcours e-learning", desc: "Cours, quiz et progression suivis par stagiaire." },
      { nom: "Examens blancs intégrés", desc: "SSIAP et T3P VTC/Taxi, prêts à l'emploi." },
      { nom: "Grilles par stagiaire", desc: "Évaluation de certification individualisée." },
    ],
  },
  {
    cat: "Automatisation & IA", em: "🤖",
    items: [
      { nom: "Studio de circuits d'automatisation", desc: "Composez vos parcours sur une timeline visuelle, multi-audience." },
      { nom: "27 e-mails candidats prêts", desc: "Toute la relation candidat, automatisée au bon moment." },
      { nom: "Assistant IA", desc: "Rédaction, résumés et tri assistés." },
      { nom: "Communication & réseaux sociaux", desc: "Génération de posts à partir de vos sessions." },
    ],
  },
  {
    cat: "Qualité & pilotage", em: "📈",
    items: [
      { nom: "Dossier d'audit Qualiopi", desc: "Preuves classées par indicateur, exportables en 1 clic." },
      { nom: "Tableau de bord & analytics", desc: "L'activité de votre organisme en temps réel." },
      { nom: "Coûts & marge", desc: "Le coût de revient et la marge par client." },
      { nom: "Amélioration continue & veille", desc: "Le registre d'amélioration et la veille réglementaire." },
    ],
  },
  {
    cat: "Plateforme & sécurité", em: "🔐",
    items: [
      { nom: "Multi-tenant & marque blanche", desc: "Votre logo, votre domaine, vos couleurs." },
      { nom: "Rôles & permissions", desc: "Des accès granulaires par collaborateur." },
      { nom: "API publique & webhooks", desc: "Connectez OFManager à vos autres outils." },
      { nom: "Application mobile", desc: "iOS & Android (PWA) avec notifications push." },
      { nom: "RGPD & hébergement UE", desc: "Chiffrement, journalisation, données hébergées en Europe." },
    ],
  },
];

export default function FonctionnalitesPage() {
  const base = SITE_URL;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: "OFManager",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        inLanguage: "fr-FR",
        description: "Logiciel tout-en-un de gestion des organismes de formation réglementés (sécurité privée, VTC/Taxi).",
        featureList: [
          "CRM & acquisition", "Inscriptions multicanales", "Sessions & planning",
          "Documents & signature électronique eIDAS", "Certifications & diplômes",
          "Vérification anti-fraude publique", "Conformité Qualiopi & BPF",
          "Financement & facturation", "E-learning & examens blancs",
          "Circuits d'automatisation", "Espace client B2B",
        ],
        offers: { "@type": "Offer", price: "59", priceCurrency: "EUR" },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Accueil", item: base },
          { "@type": "ListItem", position: 2, name: "Fonctionnalités", item: `${base}/fonctionnalites` },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQ_F.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      },
    ],
  };

  return (
    <main className="ofm-v2">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <style dangerouslySetInnerHTML={{ __html: OFM_CSS + FONC_CSS }} />
      <ScrollReveal skip={2} />

      {/* HEADER */}
      <header>
        <div className="wrap nav">
          <Link href="/" className="logo">
            <Image src="/ofmanager-logo.png" alt="OFManager" width={150} height={48} priority className="h-9 w-auto" />
          </Link>
          <nav className="nav-links">
            <Link href="/">Accueil</Link>
            <Link href="/fonctionnalites">Fonctionnalités</Link>
            <Link href="/tarifs">Tarifs</Link>
            <a href="#faq">FAQ</a>
          </nav>
          <div className="nav-cta">
            <Link className="login" href="/login">Connexion</Link>
            <Link className="btn btn-primary" href="/demo">Demander une démo</Link>
          </div>
        </div>
      </header>

      {/* HERO — thèse */}
      <section className="fonc-hero">
        <div className="wrap">
          <span className="eyebrow">Fonctionnalités</span>
          <h1>Tout le cycle de votre organisme réglementé, dans <span className="hl">un seul outil</span>.</h1>
          <p className="lead">De la première prise de contact à l&apos;audit Qualiopi : suivez votre métier étape par étape, avec des fonctionnalités déjà pensées pour la sécurité privée et le transport.</p>
          <div className="hero-cta">
            <Link className="btn btn-primary" href="/demo">Demander une démo gratuite →</Link>
            <Link className="btn btn-ghost" href="/tarifs">Voir les tarifs</Link>
          </div>
        </div>
      </section>

      {/* PARCOURS + sélecteur métier (signature) */}
      <section className="blk">
        <div className="wrap">
          <div className="center">
            <span className="eyebrow">Le parcours de votre OF</span>
            <h2>Choisissez votre métier — la plateforme s&apos;adapte</h2>
            <p className="fonc-intro">Le même logiciel, mais des exemples et des prérequis pensés pour <b>votre</b> réglementation.</p>
          </div>
          <FeaturesMetier />
        </div>
      </section>

      {/* TOUTES LES FONCTIONNALITÉS — catalogue exhaustif */}
      <section className="blk">
        <div className="wrap">
          <div className="center">
            <span className="eyebrow">Le catalogue complet</span>
            <h2>Toutes les fonctionnalités, en un coup d&apos;œil</h2>
            <p className="fonc-intro">De l&apos;acquisition à l&apos;audit, tout est inclus et relié. Aucun module en option caché.</p>
          </div>
          {FEATURES.map((c) => (
            <div className="feat-cat" key={c.cat}>
              <p className="feat-cat-h"><span className="em" aria-hidden>{c.em}</span> {c.cat}</p>
              <div className="feat-grid">
                {c.items.map((it) => (
                  <div className="feat-card" key={it.nom}>
                    <span className="fn">{it.nom}</span>
                    <span className="fd">{it.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* DEEP-DIVES — différenciateurs */}
      <section className="blk" style={{ background: "var(--paper)" }}>
        <div className="wrap">
          <div className="center"><span className="eyebrow">Ce que les autres n&apos;ont pas</span><h2>4 raisons de choisir OFManager</h2></div>
          <div className="dd-grid">
            {DEEP.map((d) => (
              <div className="dd-card" key={d.h}>
                <span className="dd-badge">{d.badge}</span>
                <h3>{d.h}</h3>
                <p>{d.p}</p>
                <ul>{d.li.map((x) => <li key={x}><span className="chk">✓</span> {x}</li>)}</ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPARATIF */}
      <section className="blk">
        <div className="wrap">
          <div className="cmp">
            <h2>Ailleurs, 5 outils. Ici, un seul.</h2>
            <div className="cmp-grid">
              <div className="col">
                <h4>Sans OFManager</h4>
                <ul>
                  <li>Tableur pour les candidats</li>
                  <li>Messagerie pour les relances</li>
                  <li>Outil de signature séparé</li>
                  <li>Plateforme e-learning à part</li>
                  <li>Logiciel de facturation</li>
                </ul>
              </div>
              <div className="arrow" aria-hidden>→</div>
              <div className="col win">
                <h4>Avec OFManager</h4>
                <ul>
                  <li>CRM + inscriptions + dossiers</li>
                  <li>Relances & circuits automatiques</li>
                  <li>Signature eIDAS intégrée</li>
                  <li>E-learning & examens blancs inclus</li>
                  <li>Devis, factures & BPF réunis</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST */}
      <section className="band">
        <div className="wrap band-grid">
          <div><div className="n">eIDAS</div><div className="l">signatures électroniques horodatées</div></div>
          <div><div className="n">RGPD</div><div className="l">hébergement en Union européenne</div></div>
          <div><div className="n">32</div><div className="l">indicateurs Qualiopi couverts</div></div>
          <div><div className="n">📱</div><div className="l">application mobile (iOS & Android)</div></div>
        </div>
      </section>

      {/* FAQ */}
      <section className="blk" id="faq" style={{ background: "var(--paper)" }}>
        <div className="wrap">
          <div className="center"><span className="eyebrow">Questions fréquentes</span><h2>À propos des fonctionnalités</h2></div>
          <div className="faq">
            {FAQ_F.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-final">
        <div className="wrap center">
          <h2>Voyez OFManager sur vos formations</h2>
          <p>Une démo gratuite, avec un environnement déjà rempli à votre métier — sans carte bancaire.</p>
          <Link className="btn btn-primary" href="/demo">Demander ma démo gratuite →</Link>
        </div>
      </section>

      {/* FOOTER */}
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
              <Link href="/fonctionnalites">Fonctionnalités</Link>
              <Link href="/tarifs">Tarifs</Link>
              <Link href="/login">Connexion</Link>
            </div>
            <div>
              <h4>Solutions</h4>
              <Link href="/solutions/tfp-aps">TFP APS</Link>
              <Link href="/solutions/ssiap">SSIAP</Link>
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
