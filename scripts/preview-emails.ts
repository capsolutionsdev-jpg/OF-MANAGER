import { writeFileSync } from "node:fs";
import {
  emailShell, emailHeading, emailParagraph, emailButton, emailBox, emailSignoff, esc,
} from "../src/lib/email-templates";

const org = "AGUYSE Formation";
const rep = "M. Diallo";
const L = "https://app.capacademy.fr/parcours/abc123";

const samples: { name: string; html: string }[] = [
  {
    name: "A1 · Convocation (avec LOGO de l'OF + lien « Espace candidat »)",
    html: emailShell({ organisme: org, representant: rep, accent: "primary",
      logoUrl: "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='120'%20height='34'%3E%3Crect%20width='120'%20height='34'%20rx='5'%20fill='%23ffffff'/%3E%3Ctext%20x='60'%20y='23'%20font-family='Arial'%20font-size='15'%20font-weight='bold'%20fill='%230D1B3E'%20text-anchor='middle'%3EAGUYSE%3C/text%3E%3C/svg%3E",
      body:
      emailHeading(`C'est confirmé, ${esc("Awa")} 👍`) +
      emailParagraph(`Vous êtes officiellement convoqué(e) à la formation <b>« ${esc("SSIAP 1 — Agent de sécurité incendie")} »</b>. Voici l'essentiel&nbsp;:`) +
      emailBox(`📅 <b>Dates</b> : du ${esc("12/03/2026")} au ${esc("20/03/2026")}<br>🕘 <b>Horaires</b> : ${esc("9h00–17h00")}<br>📍 <b>Lieu</b> : ${esc("Les Lilas (93)")}`) +
      emailParagraph(`👉 Merci de vous présenter à l'heure, muni(e) d'une <b>pièce d'identité en cours de validité</b>.`) +
      emailSignoff("À très vite,", rep) }),
  },
  {
    name: "A7 · Satisfaction (bouton CTA + encadré amber)",
    html: emailShell({ organisme: org, representant: rep, accent: "primary", body:
      emailHeading(`Merci d'avoir suivi « ${esc("SST")} », ${esc("Karim")} 🙏`) +
      emailParagraph(`Votre retour est <b>précieux</b> : il nous aide à améliorer nos formations. 2 minutes suffisent.`) +
      emailButton("Donner mon avis (2 min) →", L) +
      emailBox(`Une difficulté à signaler&nbsp;? Déposez une <b>réclamation</b> ici (traitée sous 15 jours ouvrés).`, "amber") +
      emailSignoff("Merci encore,", rep) }),
  },
  {
    name: "D3 · Félicitations réussite (green)",
    html: emailShell({ organisme: org, representant: rep, accent: "green", body:
      emailHeading(`Toutes nos félicitations, ${esc("Awa")} ! 🏆`) +
      emailParagraph(`Vous avez <b>satisfait aux épreuves</b> et obtenu la certification <b>« ${esc("TFP APS")} »</b>. Bravo&nbsp;!`) +
      emailBox(`📎 <b>En pièce jointe</b> : votre attestation de réussite (PDF).<br>🎓 Votre <b>diplôme officiel</b> vous sera transmis dès sa réception.`, "green") +
      emailSignoff("Encore bravo, et à bientôt,", rep) }),
  },
  {
    name: "F1 · Civique (amber, code d'accès)",
    html: emailShell({ organisme: org, representant: "L'équipe CAP Compétences", accent: "amber", body:
      emailHeading(`Merci pour votre inscription, ${esc("Nadia")} 🎉`) +
      emailParagraph(`Bienvenue dans la <b>préparation à l'examen civique — ${esc("Naturalisation")}</b>. Paiement de <b>${esc("149,00")} €</b> confirmé.`) +
      emailBox(`🔑 <b>Votre code d'accès</b> : <span style="font-family:monospace;font-size:16px;font-weight:bold">${esc("XY12-AB34-CD56")}</span>`, "amber") +
      emailButton("Démarrer ma préparation →", L, "amber") +
      emailSignoff("À bientôt,", "L'équipe CAP Compétences") }),
  },
];

const page =
  `<!doctype html><meta charset="utf-8"><title>Aperçu e-mails (code)</title>` +
  `<body style="background:#dfe4ee;font-family:system-ui,sans-serif;margin:0;padding:24px">` +
  `<h2 style="max-width:640px;margin:0 auto 16px">Rendu produit par le CODE (src/lib/email-templates)</h2>` +
  samples.map((s) =>
    `<div style="max-width:640px;margin:0 auto 26px"><div style="font-weight:600;margin:0 0 6px;color:#0D1B3E">${s.name}</div>` +
    `<iframe style="width:100%;height:600px;border:1px solid #b9c3d6;border-radius:10px;background:#fff" srcdoc="${s.html.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}"></iframe></div>`,
  ).join("") +
  `</body>`;

writeFileSync("docs/emails-preview-code.html", page);
console.log("Écrit : docs/emails-preview-code.html");
