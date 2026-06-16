const pptxgen = require("pptxgenjs");
const path = require("path");

const SHOTS = path.join(__dirname, "presentation-shots");
const LOGO = path.join(__dirname, "..", "public", "cap-competences-logo.png");
const img = (n) => path.join(SHOTS, n);

const NAVY = "0D1B3E";
const BLUE = "1A5FD4";
const LIGHTB = "4D9FFF";
const SURFACE = "F1F5FC";
const GRAY = "5F6B7A";
const GREEN = "10B981";
const HF = "Trebuchet MS";
const BF = "Calibri";

const p = new pptxgen();
p.layout = "LAYOUT_WIDE"; // 13.33 x 7.5
p.author = "CAP Compétence Manager";
p.title = "CAP Compétence Manager — Présentation produit";

const W = 13.33;
const shadow = () => ({ type: "outer", color: "000000", blur: 8, offset: 3, angle: 135, opacity: 0.18 });

// ---------- Slide de titre / clôture (fond navy) ----------
function darkSlide(title, subtitle, tagline, isClosing) {
  const s = p.addSlide();
  s.background = { color: NAVY };
  // bande d'accent verticale
  s.addShape(p.shapes.RECTANGLE, { x: 0, y: 0, w: 0.18, h: 7.5, fill: { color: BLUE } });
  // logo dans une pastille blanche
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: 5.17, y: 1.15, w: 3.0, h: 1.15, fill: { color: "FFFFFF" }, rectRadius: 0.12, shadow: shadow() });
  s.addImage({ path: LOGO, x: 5.42, y: 1.34, w: 2.5, h: 0.77, sizing: { type: "contain", w: 2.5, h: 0.77 } });
  s.addText(title, { x: 0.8, y: 2.75, w: 11.73, h: 1.2, align: "center", fontFace: HF, fontSize: isClosing ? 36 : 42, bold: true, color: "FFFFFF" });
  s.addText(subtitle, { x: 1.3, y: 4.0, w: 10.73, h: 0.9, align: "center", fontFace: BF, fontSize: 18, color: "CADCFC" });
  if (tagline) s.addText(tagline, { x: 1.3, y: 4.95, w: 10.73, h: 0.8, align: "center", fontFace: BF, fontSize: 14, italic: true, color: LIGHTB });
  return s;
}

// ---------- Slide de contenu : texte à gauche, capture à droite ----------
function featureSlide(num, title, tagline, bullets, imageName, benefit) {
  const s = p.addSlide();
  s.background = { color: "FFFFFF" };
  // motif : pastille bleue numérotée
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: 0.5, y: 0.45, w: 0.62, h: 0.62, fill: { color: BLUE }, rectRadius: 0.1 });
  s.addText(String(num), { x: 0.5, y: 0.45, w: 0.62, h: 0.62, align: "center", valign: "middle", fontFace: HF, fontSize: 20, bold: true, color: "FFFFFF", margin: 0 });
  // titre
  s.addText(title, { x: 1.28, y: 0.42, w: 11.5, h: 0.7, fontFace: HF, fontSize: 27, bold: true, color: NAVY, valign: "middle", margin: 0 });
  s.addText(tagline, { x: 1.28, y: 1.12, w: 11.5, h: 0.45, fontFace: BF, fontSize: 14, italic: true, color: GRAY, margin: 0 });

  // carte texte (gauche)
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: 0.5, y: 1.75, w: 4.35, h: 5.25, fill: { color: SURFACE }, rectRadius: 0.08 });
  const items = bullets.map((b, i) => ({ text: b, options: { bullet: { code: "2022", indent: 14 }, breakLine: true, paraSpaceAfter: 10, color: NAVY, fontSize: 14, fontFace: BF } }));
  s.addText(items, { x: 0.78, y: 2.0, w: 3.85, h: 3.7, valign: "top" });
  // bandeau bénéfice
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: 0.78, y: 5.85, w: 3.79, h: 0.95, fill: { color: NAVY }, rectRadius: 0.08 });
  s.addText([{ text: "GAIN", options: { color: LIGHTB, fontSize: 9, bold: true, charSpacing: 2, breakLine: true } }, { text: benefit, options: { color: "FFFFFF", fontSize: 11.5, bold: true } }], { x: 0.95, y: 5.95, w: 3.45, h: 0.75, valign: "middle", fontFace: BF });

  // carte image (droite)
  s.addShape(p.shapes.RECTANGLE, { x: 5.15, y: 1.75, w: 7.68, h: 5.25, fill: { color: "FFFFFF" }, line: { color: "D9E2F0", width: 1 }, shadow: shadow() });
  s.addImage({ path: img(imageName), x: 5.32, y: 1.92, w: 7.34, h: 4.91, sizing: { type: "contain", w: 7.34, h: 4.91 } });
  return s;
}

// ---------- Slide « stats / gain de temps » ----------
function statsSlide(num, title, tagline, stats, footer) {
  const s = p.addSlide();
  s.background = { color: "FFFFFF" };
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: 0.5, y: 0.45, w: 0.62, h: 0.62, fill: { color: BLUE }, rectRadius: 0.1 });
  s.addText(String(num), { x: 0.5, y: 0.45, w: 0.62, h: 0.62, align: "center", valign: "middle", fontFace: HF, fontSize: 20, bold: true, color: "FFFFFF", margin: 0 });
  s.addText(title, { x: 1.28, y: 0.42, w: 11.5, h: 0.7, fontFace: HF, fontSize: 27, bold: true, color: NAVY, valign: "middle", margin: 0 });
  s.addText(tagline, { x: 1.28, y: 1.12, w: 11.5, h: 0.45, fontFace: BF, fontSize: 14, italic: true, color: GRAY, margin: 0 });

  const n = stats.length;
  const gap = 0.4, marg = 0.5;
  const cw = (W - 2 * marg - (n - 1) * gap) / n;
  stats.forEach((st, i) => {
    const x = marg + i * (cw + gap);
    s.addShape(p.shapes.ROUNDED_RECTANGLE, { x, y: 2.1, w: cw, h: 3.4, fill: { color: SURFACE }, rectRadius: 0.1 });
    s.addShape(p.shapes.RECTANGLE, { x, y: 2.1, w: cw, h: 0.14, fill: { color: BLUE } });
    s.addText(st.big, { x: x + 0.1, y: 2.55, w: cw - 0.2, h: 1.2, align: "center", fontFace: HF, fontSize: 38, bold: true, color: BLUE });
    s.addText(st.label, { x: x + 0.2, y: 3.85, w: cw - 0.4, h: 1.4, align: "center", valign: "top", fontFace: BF, fontSize: 14, color: NAVY });
  });
  if (footer) s.addText(footer, { x: 0.8, y: 5.9, w: 11.73, h: 1.0, align: "center", fontFace: HF, fontSize: 18, bold: true, color: NAVY });
  return s;
}

// ---------- Slide « vue d'ensemble » : grille de modules ----------
function gridSlide(num, title, tagline, items, footer) {
  const s = p.addSlide();
  s.background = { color: "FFFFFF" };
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: 0.5, y: 0.45, w: 0.62, h: 0.62, fill: { color: BLUE }, rectRadius: 0.1 });
  s.addText(String(num), { x: 0.5, y: 0.45, w: 0.62, h: 0.62, align: "center", valign: "middle", fontFace: HF, fontSize: 20, bold: true, color: "FFFFFF", margin: 0 });
  s.addText(title, { x: 1.28, y: 0.42, w: 11.5, h: 0.7, fontFace: HF, fontSize: 27, bold: true, color: NAVY, valign: "middle", margin: 0 });
  s.addText(tagline, { x: 1.28, y: 1.12, w: 11.5, h: 0.45, fontFace: BF, fontSize: 14, italic: true, color: GRAY, margin: 0 });

  const cols = 5, rows = Math.ceil(items.length / cols);
  const marg = 0.5, gx = 0.3, gy = 0.3;
  const cw = (W - 2 * marg - (cols - 1) * gx) / cols;
  const top = 1.85, ch = 2.05;
  items.forEach((it, i) => {
    const r = Math.floor(i / cols), c = i % cols;
    const x = marg + c * (cw + gx), y = top + r * (ch + gy);
    s.addShape(p.shapes.ROUNDED_RECTANGLE, { x, y, w: cw, h: ch, fill: { color: SURFACE }, rectRadius: 0.08 });
    s.addShape(p.shapes.RECTANGLE, { x, y, w: cw, h: 0.12, fill: { color: LIGHTB } });
    s.addText(it.t, { x: x + 0.12, y: y + 0.22, w: cw - 0.24, h: 0.8, fontFace: HF, fontSize: 12.5, bold: true, color: NAVY, valign: "top", margin: 0 });
    s.addText(it.d, { x: x + 0.12, y: y + 0.95, w: cw - 0.24, h: 0.95, fontFace: BF, fontSize: 9.5, color: GRAY, valign: "top", margin: 0 });
  });
  if (footer) s.addText(footer, { x: 0.5, y: top + rows * ch + (rows - 1) * gy + 0.1, w: 12.33, h: 0.5, align: "center", fontFace: BF, fontSize: 12, italic: true, color: BLUE });
  return s;
}

// ---------- Slide « offres / 3 formules » ----------
function packagingSlide(num, title, tagline, plans, footer) {
  const s = p.addSlide();
  s.background = { color: "FFFFFF" };
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: 0.5, y: 0.45, w: 0.62, h: 0.62, fill: { color: BLUE }, rectRadius: 0.1 });
  s.addText(String(num), { x: 0.5, y: 0.45, w: 0.62, h: 0.62, align: "center", valign: "middle", fontFace: HF, fontSize: 20, bold: true, color: "FFFFFF", margin: 0 });
  s.addText(title, { x: 1.28, y: 0.42, w: 11.5, h: 0.7, fontFace: HF, fontSize: 27, bold: true, color: NAVY, valign: "middle", margin: 0 });
  s.addText(tagline, { x: 1.28, y: 1.12, w: 11.5, h: 0.45, fontFace: BF, fontSize: 14, italic: true, color: GRAY, margin: 0 });

  const n = plans.length, marg = 0.5, gap = 0.4;
  const cw = (W - 2 * marg - (n - 1) * gap) / n;
  plans.forEach((pl, i) => {
    const x = marg + i * (cw + gap);
    const accent = pl.highlight ? BLUE : NAVY;
    s.addShape(p.shapes.ROUNDED_RECTANGLE, { x, y: 1.85, w: cw, h: 4.95, fill: { color: pl.highlight ? NAVY : SURFACE }, rectRadius: 0.1, shadow: pl.highlight ? shadow() : undefined });
    s.addShape(p.shapes.RECTANGLE, { x, y: 1.85, w: cw, h: 0.16, fill: { color: accent } });
    s.addText(pl.name, { x: x + 0.2, y: 2.15, w: cw - 0.4, h: 0.5, align: "center", fontFace: HF, fontSize: 18, bold: true, color: pl.highlight ? "FFFFFF" : NAVY });
    s.addText(pl.price, { x: x + 0.2, y: 2.7, w: cw - 0.4, h: 0.5, align: "center", fontFace: HF, fontSize: 16, bold: true, color: pl.highlight ? LIGHTB : BLUE });
    s.addText(pl.feats.map((f) => ({ text: f, options: { bullet: { code: "2022", indent: 12 }, breakLine: true, paraSpaceAfter: 7, color: pl.highlight ? "E6EEFC" : NAVY, fontSize: 11, fontFace: BF } })), { x: x + 0.25, y: 3.3, w: cw - 0.5, h: 3.3, valign: "top" });
  });
  if (footer) s.addText(footer, { x: 0.5, y: 6.95, w: 12.33, h: 0.4, align: "center", fontFace: BF, fontSize: 11, italic: true, color: GRAY });
  return s;
}

// ===================== CONSTRUCTION =====================

// 1. Titre
darkSlide(
  "CAP Compétence Manager",
  "Le logiciel tout-en-un qui pilote votre organisme de formation",
  "De la prospection à la facturation — centralisé, automatisé et conforme Qualiopi.",
);

// 2. Le problème
(() => {
  const s = p.addSlide();
  s.background = { color: "FFFFFF" };
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: 0.5, y: 0.45, w: 0.62, h: 0.62, fill: { color: BLUE }, rectRadius: 0.1 });
  s.addText("!", { x: 0.5, y: 0.45, w: 0.62, h: 0.62, align: "center", valign: "middle", fontFace: HF, fontSize: 22, bold: true, color: "FFFFFF", margin: 0 });
  s.addText("Le quotidien d'un organisme de formation", { x: 1.28, y: 0.42, w: 11.5, h: 0.7, fontFace: HF, fontSize: 27, bold: true, color: NAVY, valign: "middle", margin: 0 });
  s.addText("Trop de temps perdu sur l'administratif, et un risque en cas d'audit.", { x: 1.28, y: 1.12, w: 11.5, h: 0.45, fontFace: BF, fontSize: 14, italic: true, color: GRAY, margin: 0 });
  const probs = [
    "Convocations, attestations et certificats rédigés et envoyés à la main",
    "Conventions, contrats et feuilles d'émargement imprimés, signés, scannés",
    "Relances des prospects, des impayés et des enquêtes dispersées",
    "BPF et preuves Qualiopi reconstitués à la main, juste avant l'audit",
  ];
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: 0.5, y: 1.85, w: 6.6, h: 4.9, fill: { color: SURFACE }, rectRadius: 0.08 });
  s.addText(probs.map((b) => ({ text: b, options: { bullet: { code: "2022", indent: 16 }, breakLine: true, paraSpaceAfter: 16, color: NAVY, fontSize: 16, fontFace: BF } })), { x: 0.85, y: 2.2, w: 5.9, h: 4.2, valign: "top" });
  // gros chiffre
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: 7.45, y: 1.85, w: 5.38, h: 4.9, fill: { color: NAVY }, rectRadius: 0.1, shadow: shadow() });
  s.addText("1 à 2 jours", { x: 7.6, y: 2.7, w: 5.08, h: 1.2, align: "center", fontFace: HF, fontSize: 50, bold: true, color: "FFFFFF" });
  s.addText("par semaine perdus en tâches administratives", { x: 7.9, y: 4.0, w: 4.48, h: 1.6, align: "center", valign: "top", fontFace: BF, fontSize: 18, color: "CADCFC" });
})();

// 3 → 17 : fonctionnalités
featureSlide(3, "Une seule plateforme, votre cockpit",
  "CRM, pédagogie, documents, e-learning, comptabilité et conformité réunis.",
  ["Une donnée saisie une seule fois alimente tout : documents, e-mails, stats, BPF", "Tableau de bord en temps réel : remplissage des sessions, candidats, apprenants", "Encart « à traiter » : inscriptions en attente, relances, activité de l'équipe", "Moins de logiciels, zéro double saisie"],
  "01-tableau-de-bord.png", "En 10 s, vous savez quoi traiter aujourd'hui");

featureSlide(4, "CRM & prospects",
  "Transformez plus de prospects en stagiaires, sans rien oublier.",
  ["Tous vos prospects centralisés et classés par formation", "Suivi des sources d'acquisition et du taux de conversion", "Affectation des dossiers aux collaborateurs", "Relances programmées"],
  "02-crm-prospects.png", "Plus aucun prospect oublié");

featureSlide(5, "Pipeline commercial",
  "Visualisez et pilotez vos opportunités étape par étape.",
  ["Pipeline clair : du nouveau prospect à l'inscription", "Valeur estimée des opportunités", "Priorisation des relances commerciales", "Vision globale de l'activité commerciale"],
  "03-crm-pipeline.png", "Un suivi commercial structuré");

featureSlide(6, "Dossiers candidats — la fiche 360°",
  "Toute l'information du candidat au même endroit.",
  ["Coordonnées, situation, financement, photo d'identité", "Inscriptions, avancement du parcours et historique", "Checklist des pièces du dossier administratif", "Relance automatique des pièces manquantes"],
  "04-candidats.png", "Un dossier conforme, sans ressaisie");

featureSlide(7, "Clients pro (B2B)",
  "Gérez vos entreprises clientes aussi simplement que les particuliers.",
  ["Coordonnées légales, salariés, financements OPCO", "Conventions de formation entreprise générées", "Copies automatiques des documents à l'entreprise", "Suivi des conventions et des financeurs"],
  "05-clients-pro.png", "Le B2B géré sans effort");

featureSlide(8, "Catalogue de formations",
  "Une source unique, réutilisée partout dans la plateforme.",
  ["Objectifs, public, prérequis, durée, modalités", "Tarif, certification et n° RS", "Réutilisé dans documents, sessions et statistiques", "Toujours à jour et conforme Qualiopi"],
  "06-formations.png", "Un catalogue toujours à jour");

featureSlide(9, "Sessions & émargement dématérialisé",
  "Planifiez, remplissez et émargez — sans papier.",
  ["Planification et suivi du remplissage des sessions", "Émargement signé en ligne, par demi-journée", "Signé par les stagiaires et le formateur", "Suivi des pièces par participant"],
  "07-sessions.png", "Fini les feuilles papier");

featureSlide(10, "E-learning intégré",
  "Votre offre 100 % distancielle, sans outil supplémentaire.",
  ["Cours organisés par pôle et par formation", "Modules, leçons et quiz", "Suivi de la progression des apprenants", "Espace apprenant dédié et attestations"],
  "08-elearning.png", "Le distanciel intégré");

featureSlide(11, "Les automatismes — le gros gain de temps",
  "Le parcours administratif d'une session tourne tout seul.",
  ["Convocation 7 jours avant le début (documents signés joints)", "Attestation d'entrée le 1er jour", "Émargement quotidien (matin / après-midi)", "Enquête de satisfaction à la fin", "Attestation de fin + certificat de réalisation"],
  "10-automatisations.png", "Les e-mails partent tout seuls");

featureSlide(12, "Signatures électroniques",
  "Signez en ligne, en sécurité — sans impression ni scan.",
  ["Contrats, conventions et feuilles d'émargement", "Signature manuscrite ou prestataire (Yousign)", "Sécurisée et horodatée", "Traçabilité complète"],
  "09-signatures.png", "Des signatures conformes en un clic");

featureSlide(13, "Suivi comptable",
  "Votre trésorerie et vos impayés sous contrôle, en temps réel.",
  ["États par candidat : payé / partiel / impayé", "Modes de financement : CPF, OPCO, entreprise…", "Récap par mois et par année, clients non soldés", "Règlements enregistrés avec traçabilité du collaborateur"],
  "12-suivi-comptable.png", "Vos impayés sous contrôle");

featureSlide(14, "Conformité Qualiopi",
  "La conformité intégrée, prête pour l'audit à tout moment.",
  ["Indicateurs Qualiopi et preuves centralisés", "Registre des réclamations", "Veille et partenaires", "Documents générés sur des trames conformes"],
  "14-qualiopi.png", "Toujours prêt pour l'audit");

featureSlide(15, "Bilan Pédagogique & Financier (BPF)",
  "Le BPF généré automatiquement à partir de vos données réelles.",
  ["Heures, stagiaires, financements agrégés", "Réparti par formation et par formateur", "Plus de reconstitution manuelle dans Excel", "Exportable pour votre déclaration"],
  "13-bpf.png", "Le BPF en minutes, pas en jours");

featureSlide(16, "RGPD & traçabilité",
  "La protection des données intégrée à votre gestion.",
  ["Suivi des consentements", "Gestion des demandes de données", "Journal d'audit des actions", "Conformité au RGPD facilitée"],
  "15-rgpd.png", "Conformité RGPD simplifiée");

featureSlide(17, "À votre image & multi-comptes",
  "Un outil de gestion interne, sur-mesure et sécurisé.",
  ["Logo, couleurs, coordonnées et documents personnalisés", "Comptes : gérant, responsable, assistant, formateur", "Droits par section (CRM, candidats, compta, Qualiopi…)", "Chacun ne voit que ce qui le concerne — données isolées"],
  "16-administration.png", "Délégez en toute sécurité");

// 18. Modules avancés — vue d'ensemble
gridSlide(18, "Modules avancés — à la carte",
  "Des options à activer en un clic pour monter en gamme, selon les besoins du client.",
  [
    { t: "Pipeline Kanban", d: "Glisser-déposer + prévisionnel pondéré" },
    { t: "Tâches & rappels", d: "Agenda commercial, échéances, relances" },
    { t: "Notifications", d: "Leads, relances, impayés, devis à signer" },
    { t: "Signature du devis", d: "« Bon pour accord » en ligne, en 1 clic" },
    { t: "Leads multi-canal", d: "Web + EDOF (CPF) / Kairos centralisés" },
    { t: "SMS & séquences", d: "Convocations, rappels et relances SMS" },
    { t: "Espace client", d: "Portail B2B self-service (salariés, factures)" },
    { t: "Rapports", d: "Conversion, CA prévisionnel, acquisition" },
    { t: "Scoring prospects", d: "Priorisation auto : chaud / tiède / froid" },
    { t: "Assistant IA", d: "Relances, qualification, résumés (Claude)" },
  ],
  "Activables individuellement par organisme depuis la console — inclus dans la formule Premium.");

// 19 → 26 : modules avancés en détail (captures réelles)
featureSlide(19, "Pipeline Kanban",
  "Pilotez vos opportunités d'un glissement, étape par étape.",
  ["Colonnes du pipeline : nouveau → gagné", "Glisser-déposer pour faire avancer un prospect", "Valeur estimée et prévisionnel pondéré", "Vue commerciale claire en temps réel"],
  "22-kanban.png", "Le commercial sous contrôle visuel");

featureSlide(20, "Notifications & alertes",
  "Ne ratez plus jamais une action à mener.",
  ["Nouveaux leads, relances dues, tâches en retard", "Devis à signer, factures à encaisser", "Badge « non lus » dans la barre + centre dédié", "Tout est dérivé de vos données, sans saisie"],
  "17-notifications-page.png", "Zéro relance oubliée");

featureSlide(21, "Capture de leads multi-canal",
  "Centralisez tous vos prospects, quelle que soit la source.",
  ["Formulaire web → CRM via une API simple", "EDOF (CPF) & Kairos importés en un clic", "Répartition par canal d'acquisition", "Leads récents en un coup d'œil"],
  "20-leads.png", "Toutes vos sources réunies");

featureSlide(22, "Scoring & segmentation",
  "Priorisez automatiquement les prospects les plus chauds.",
  ["Score d'engagement 0–100 calculé tout seul", "Segments chaud / tiède / froid", "Basé sur coordonnées, étape, valeur, échanges", "Vos commerciaux savent qui rappeler d'abord"],
  "19-scoring.png", "Le bon prospect, au bon moment");

featureSlide(23, "Rapports analytiques",
  "Pilotez l'activité avec des chiffres consolidés.",
  ["Taux de conversion et CA prévisionnel pondéré", "Sources d'acquisition et remplissage des sessions", "Devis émis / acceptés, revenus encaissés / en attente", "Une vue de direction, sans tableur"],
  "18-rapports.png", "Décidez sur des données");

featureSlide(24, "Assistant IA",
  "Rédigez relances et qualifications en quelques secondes.",
  ["Rédaction d'e-mails de relance personnalisés", "Qualification de prospect + prochaine action", "Résumé de l'historique d'un dossier", "Propulsé par Claude, à votre image"],
  "21-assistant-ia.png", "Gagnez du temps sur l'écrit");

featureSlide(25, "Signature électronique du devis",
  "Faites accepter vos devis à distance, en un clic.",
  ["Lien sécurisé envoyé au client", "« Bon pour accord » signé en ligne, horodaté", "Adresse IP enregistrée, valeur probante", "Signature reportée sur le devis imprimable"],
  "26-devis-signature.png", "Des devis signés plus vite");

featureSlide(26, "Espace client entreprise",
  "Offrez à vos clients B2B un portail self-service.",
  ["Lien sécurisé en lecture seule par entreprise", "Salariés en formation, conventions", "Devis et factures consultables", "Moins de sollicitations, plus de service"],
  "25-portail-client.png", "Un service B2B différenciant");

// 27. Offres & formules
packagingSlide(27, "Trois formules, claires",
  "De la digitalisation de base au pilotage commercial complet.",
  [
    { name: "Essentiel", price: "dès 49 €/mois", feats: ["Candidats & inscriptions", "Sessions & émargement en ligne", "Documents & signatures", "Qualiopi, BPF, RGPD"] },
    { name: "Pro", price: "dès 99 €/mois", highlight: true, feats: ["Tout l'Essentiel", "CRM & pipeline commercial", "Clients pro, comptabilité, devis", "Planning, e-learning, automatisations", "Modules avancés en option"] },
    { name: "Premium", price: "dès 179 €/mois", feats: ["Tout le Pro", "Les 10 modules avancés inclus", "Kanban, IA, SMS, rapports…", "Espace client entreprise"] },
  ],
  "Montants indicatifs — à ajuster. Multi-tenant, données isolées par organisme, hébergement UE.");

// 28. Gain de temps chiffré
statsSlide(28, "Le gain de temps, chiffré",
  "Estimations à adapter à votre activité.",
  [
    { big: "~15 min", label: "par stagiaire\nConvocations, attestations & certificats automatiques" },
    { big: "~30 min", label: "par session\nÉmargement dématérialisé" },
    { big: "instantané", label: "Génération des conventions & contrats (vs ~20 min)" },
    { big: "minutes", label: "Préparation du BPF (vs plusieurs jours)" },
  ],
  "Au total : l'équivalent de 1 à 2 jours par semaine récupérés sur l'administratif.");

// 19. Clôture
darkSlide(
  "Passons à la démonstration",
  "Démo sur vos propres données · Mise en place à vos couleurs · Formation de votre équipe",
  "Un seul outil, conçu pour Qualiopi, automatisé et à votre image. Contactez-nous pour démarrer.",
  true,
);

p.writeFile({ fileName: path.join(__dirname, "CAP-Competence-Manager-Presentation.pptx") }).then((f) => console.log("WROTE", f));
