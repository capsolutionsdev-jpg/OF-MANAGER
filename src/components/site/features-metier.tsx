"use client";

import { useState } from "react";

// Élément signature de la page /fonctionnalites : un sélecteur MÉTIER qui
// reconfigure le parcours de l'OF (6 étapes, vraie séquence → numérotées). Le
// prospect se reconnaît immédiatement dans SON quotidien. Styles sous .ofm-v2
// (classes fonc-* définies dans la page).

type Metier = "securite" | "transport";

type Etape = {
  n: number;
  titre: string;
  punch: string;
  commun: string[];
  securite: string;
  transport: string;
};

const PARCOURS: Etape[] = [
  {
    n: 1,
    titre: "Attirer",
    punch: "Remplissez vos sessions, sans rien laisser filer.",
    commun: [
      "CRM : chaque lead capté, qualifié et relancé jusqu'à la signature",
      "Site vitrine + capture de leads, scoring et pipeline visuel",
      "Prospection multicanale (formulaire, e-mail, import)",
    ],
    securite: "Suivez chaque prospect APS / SSIAP dès le premier contact — carte pro ou autorisation CNAPS déjà tracée.",
    transport: "Un candidat VTC / Taxi intéressé ? Son parcours T3P démarre dès le lead.",
  },
  {
    n: 2,
    titre: "Vendre & inscrire",
    punch: "Du devis à l'inscription, zéro ressaisie.",
    commun: [
      "Devis & convention Qualiopi générés en 1 clic",
      "Inscription multicanale : web, e-mail, sur place, import CSV",
      "Espace client B2B : les entreprises inscrivent leurs salariés en autonomie",
      "Financement : simulateur CPF, OPCO, France Travail, PTP",
    ],
    securite: "Prérequis vérifiés automatiquement : autorisation préalable CNAPS, carte pro, SST, aptitude médicale.",
    transport: "Prérequis T3P vérifiés : permis B (+ 3 ans), aptitude médicale préfecture, PSC1, casier.",
  },
  {
    n: 3,
    titre: "Préparer & animer",
    punch: "Le jour J se prépare tout seul.",
    commun: [
      "Sessions & planning : salles, capacités, multi-formateurs",
      "Convocations automatiques, émargement signé sur tablette",
      "Dossier administratif déposé en ligne par le client ou le candidat",
      "E-learning & examens blancs intégrés",
    ],
    securite: "Jury SSIAP + grilles de certification pré-remplies ; examens blancs SSIAP prêts à l'emploi.",
    transport: "Calendrier des sessions d'examen CMA ; examens blancs T3P VTC & Taxi intégrés.",
  },
  {
    n: 4,
    titre: "Certifier & sécuriser",
    punch: "Certifiez, puis prouvez-le — sans fraude possible.",
    commun: [
      "Résultats, paliers & attestations générés automatiquement",
      "Diplômes & badges numériques",
      "Vérification anti-fraude publique : chaque titre a un numéro + QR vérifiable",
    ],
    securite: "Attestations APS / SSIAP, suivi des recyclages MAC & SSIAP, habilitations.",
    transport: "Réussite T3P suivie jusqu'à la carte professionnelle, formation continue programmée.",
  },
  {
    n: 5,
    titre: "Financer & facturer",
    punch: "L'argent rentre, sans frottement.",
    commun: [
      "Devis & factures automatisés (paiement Stripe : CB, SEPA)",
      "BPF pré-rempli à partir de vos données réelles",
      "Trésorerie, suivi des OPCO, relances de paiement",
    ],
    securite: "Formations éligibles CPF (TFP APS, MAC APS…) : dossier de financement prêt.",
    transport: "Formations CPF (RS 5635 Taxi / RS 5637 VTC) : financement facilité.",
  },
  {
    n: 6,
    titre: "Piloter & fidéliser",
    punch: "Votre chiffre d'affaires récurrent, sécurisé.",
    commun: [
      "Tableau de bord, coûts & marge, analytics",
      "Studio de circuits d'automatisation (timeline visuelle, multi-audience)",
      "Communication & réseaux sociaux assistés par IA",
    ],
    securite: "Chaque MAC APS, recyclage SSIAP et habilitation relancé à temps — du CA qui revient tout seul.",
    transport: "Chaque formation continue obligatoire (14 h / 5 ans) relancée avant l'échéance.",
  },
];

const METIERS: { key: Metier; label: string; emoji: string }[] = [
  { key: "securite", label: "Sécurité privée", emoji: "🛡️" },
  { key: "transport", label: "Transport VTC · Taxi", emoji: "🚖" },
];

export function FeaturesMetier() {
  const [metier, setMetier] = useState<Metier>("securite");

  return (
    <div>
      <div className="fonc-toggle" role="tablist" aria-label="Choisir un métier">
        {METIERS.map((m) => (
          <button
            key={m.key}
            role="tab"
            aria-selected={metier === m.key}
            className={metier === m.key ? "active" : ""}
            onClick={() => setMetier(m.key)}
          >
            <span aria-hidden>{m.emoji}</span> {m.label}
          </button>
        ))}
      </div>

      <ol className="fonc-steps">
        {PARCOURS.map((e) => (
          <li key={e.n} className="fonc-step">
            <div className="fonc-step-head">
              <span className="fonc-step-n" aria-hidden>{e.n}</span>
              <h3>{e.titre}</h3>
            </div>
            <p className="fonc-punch">{e.punch}</p>
            <p className="fonc-metier" data-metier={metier}>
              <span className="fonc-metier-tag">{metier === "securite" ? "🛡️" : "🚖"}</span>
              {metier === "securite" ? e.securite : e.transport}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
