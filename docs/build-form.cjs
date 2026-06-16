const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType, VerticalAlign,
  Header, Footer, PageNumber, LevelFormat,
} = require("docx");

const NAVY = "0D1B3E";
const BLUE = "1A5FD4";
const HEADFILL = "E6EEFA"; // light blue for label cells
const HEADTXT = "0C447C";
const GRIDC = "C9D4E5";
const CW = 9026; // A4 content width (1" margins)

const border = { style: BorderStyle.SINGLE, size: 4, color: GRIDC };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargin = { top: 90, bottom: 90, left: 130, right: 130 };

function txt(s, opts = {}) { return new TextRun({ text: s, ...opts }); }
function p(children, opts = {}) {
  return new Paragraph({ children: Array.isArray(children) ? children : [txt(children)], ...opts });
}

// Cell with a label (shaded)
function labelCell(text, width) {
  return new TableCell({
    borders, width: { size: width, type: WidthType.DXA },
    shading: { fill: HEADFILL, type: ShadingType.CLEAR }, margins: cellMargin,
    verticalAlign: VerticalAlign.CENTER,
    children: [p([txt(text, { bold: true, color: HEADTXT, size: 20 })])],
  });
}
// Empty answer cell (taller for writing)
function answerCell(width, lines = 1) {
  const kids = [];
  for (let i = 0; i < lines; i++) kids.push(p([txt("")], { spacing: { before: 40, after: 40 } }));
  return new TableCell({
    borders, width: { size: width, type: WidthType.DXA }, margins: cellMargin,
    verticalAlign: VerticalAlign.CENTER, children: kids,
  });
}
// Header cell for multi-col tables
function headCell(text, width) {
  return new TableCell({
    borders, width: { size: width, type: WidthType.DXA },
    shading: { fill: NAVY, type: ShadingType.CLEAR }, margins: cellMargin,
    verticalAlign: VerticalAlign.CENTER,
    children: [p([txt(text, { bold: true, color: "FFFFFF", size: 18 })])],
  });
}
function emptyCell(width) {
  return new TableCell({
    borders, width: { size: width, type: WidthType.DXA }, margins: cellMargin,
    children: [p([txt("")])],
  });
}

// 2-column field table: rows = [labelText, lines?]
function fieldTable(rows) {
  const L = 3200, A = CW - L;
  return new Table({
    width: { size: CW, type: WidthType.DXA }, columnWidths: [L, A],
    rows: rows.map(([label, lines]) =>
      new TableRow({ children: [labelCell(label, L), answerCell(A, lines || 1)] })),
  });
}
// Multi-col table with header + N empty rows
function gridTable(headers, widths, nRows) {
  const rows = [new TableRow({ tableHeader: true, children: headers.map((h, i) => headCell(h, widths[i])) })];
  for (let r = 0; r < nRows; r++) {
    rows.push(new TableRow({ children: widths.map((w) => emptyCell(w)) }));
  }
  return new Table({ width: { size: CW, type: WidthType.DXA }, columnWidths: widths, rows });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 320, after: 140 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 2 } },
    children: [txt(text)],
  });
}
function note(text) {
  return p([txt(text, { italics: true, color: "5F6B7A", size: 18 })], { spacing: { before: 60, after: 120 } });
}
function spacer() { return p([txt("")], { spacing: { after: 60 } }); }

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 21 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, color: NAVY, font: "Arial" },
        paragraph: { spacing: { after: 120 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, color: NAVY, font: "Arial" },
        paragraph: { spacing: { before: 280, after: 140 }, outlineLevel: 1 } },
    ],
  },
  numbering: {
    config: [{ reference: "checklist", levels: [{ level: 0, format: LevelFormat.BULLET, text: "☐",
      alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 600, hanging: 320 } } } }] }],
  },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    headers: { default: new Header({ children: [
      p([txt("FICHE D’INTÉGRATION — NOUVEL ORGANISME DE FORMATION", { color: BLUE, bold: true, size: 16 })]),
    ] }) },
    footers: { default: new Footer({ children: [
      new Paragraph({ alignment: AlignmentType.CENTER, children: [
        txt("Document confidentiel — à retourner complété avec les pièces jointes   ·   Page ", { size: 16, color: "8893A4" }),
        new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "8893A4" }),
      ] }),
    ] }) },
    children: [
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [txt("Fiche d’intégration de votre organisme")] }),
      p([txt("Merci de compléter cette fiche et de nous la retourner accompagnée des pièces demandées (logo, cachet, favicon, catalogue). Ces informations nous permettent de créer votre espace de gestion personnalisé à votre image (logo, coordonnées, documents légaux), avec l’ensemble des fonctionnalités et automatismes de la plateforme.")], { spacing: { after: 80 } }),
      p([txt("Champs marqués d’un astérisque (*) : obligatoires.", { italics: true, color: "5F6B7A", size: 18 })]),

      h2("1. Identité de l’organisme"),
      fieldTable([
        ["Nom commercial *"], ["Raison sociale"], ["Représentant légal (nom + prénom) *"],
        ["Fonction du représentant *"], ["SIRET *"], ["N° de déclaration d’activité (NDA) *"],
        ["N° TVA intracommunautaire"],
      ]),

      h2("2. Coordonnées"),
      fieldTable([
        ["Adresse *"], ["Code postal *"], ["Ville *"], ["Téléphone *"], ["E-mail de contact *"], ["Site web"],
      ]),

      h2("3. Certification & qualité"),
      fieldTable([
        ["Certifié Qualiopi ? (Oui / Non) *"], ["N° de certificat Qualiopi"],
        ["Actions concernées (Formation / Bilan / VAE / Apprentissage)"],
        ["Certificateur(s) partenaire(s)"], ["N° des certifications (RS / RNCP)"],
      ]),

      h2("4. Identité visuelle"),
      note("À joindre séparément. Indiquez ici les couleurs ; déposez les images avec la fiche."),
      fieldTable([
        ["Logo — PNG fond transparent, largeur ≥ 600 px (à joindre) *"],
        ["Cachet / signature scannée — PNG fond transparent (à joindre)"],
        ["Favicon / icône — PNG carré 512×512 (à joindre)"],
        ["Couleur principale (code hex, ex. #1A5FD4) *"], ["Couleur secondaire (option.)"],
      ]),

      h2("5. Communication e-mail"),
      fieldTable([
        ["Nom d’expéditeur (affiché dans les e-mails) *"], ["Adresse e-mail d’envoi *"],
        ["Adresse de réponse (si différente)"], ["Compte Brevo : existant (clé API) / à créer"],
      ]),

      h2("6. Accès à l’application"),
      fieldTable([
        ["Nom de domaine / sous-domaine souhaité (ex. app.mon-of.fr)"],
        ["Compte gérant (administrateur) — Nom *"],
        ["Compte gérant — e-mail de connexion *"],
      ]),

      h2("7. Pôles / sous-marques"),
      note("La plateforme peut regrouper vos formations par pôles (ex. Digital, Sécurité, Transport, Langues)."),
      fieldTable([
        ["Travaillez-vous par pôles / sous-marques ? (Oui / Non)"],
        ["Si oui, listez-les", 2],
      ]),

      h2("8. Catalogue de formations"),
      note("Complétez le tableau ou joignez votre catalogue existant."),
      gridTable(
        ["Intitulé", "Réf. (RS/RNCP)", "Modalité", "Durée (h)", "Tarif", "Certif. (O/N)", "Financements"],
        [2200, 1400, 1200, 800, 1000, 900, 1526], 6,
      ),

      h2("9. Comptes collaborateurs à créer"),
      note("Rôles : Responsable formation · Assistant administratif · Formateur. Précisez les sections autorisées (CRM, Candidats, Sessions, Comptabilité…)."),
      gridTable(
        ["Nom", "E-mail", "Rôle", "Sections autorisées"],
        [2200, 2800, 2000, 2026], 4,
      ),

      h2("10. Conformité & mentions légales"),
      fieldTable([
        ["Référent handicap (nom + contact) *"], ["Référent / DPO RGPD (nom + contact)"],
        ["CGV à joindre ? (Oui / Non)"], ["Règlement intérieur à joindre ? (Oui / Non)"],
        ["Mentions spécifiques à faire figurer sur les documents", 2],
      ]),

      h2("11. Intégrations optionnelles"),
      fieldTable([
        ["Signature électronique Yousign ? (Oui / Non + clé API)"],
        ["Autres outils utilisés (compta, CRM, agenda…)"],
      ]),

      h2("12. Pièces à joindre"),
      ...[
        "Logo (PNG fond transparent)",
        "Cachet / signature scannée (PNG fond transparent)",
        "Favicon / icône (PNG 512×512)",
        "Catalogue de formations (si non rempli ci-dessus)",
        "CGV et règlement intérieur (si disponibles)",
        "Liste des collaborateurs (si non remplie ci-dessus)",
      ].map((t) => new Paragraph({ numbering: { reference: "checklist", level: 0 }, children: [txt(t)] })),

      spacer(),
      p([txt("Fait à ", { size: 20 }), txt(" ···················   le ", { size: 20 }), txt(" ················      Signature :", { size: 20 })], { spacing: { before: 240 } }),
    ],
  }],
});

const out = path.join(__dirname, "Fiche-integration-organisme.docx");
Packer.toBuffer(doc).then((buf) => { fs.writeFileSync(out, buf); console.log("WROTE", out); });
