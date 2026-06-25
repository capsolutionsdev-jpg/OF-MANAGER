// =============================================================
//  SIMULATEUR DE FINANCEMENT — moteur d'éligibilité.
//  À partir du profil du prospect (statut + micro/auto + activité…),
//  renvoie les dispositifs mobilisables, classés par niveau de priorité.
//  Logique pure (sans React).
// =============================================================

import type { Activite, NiveauEligibilite, ProfilFinancement } from "./dispositifs";

export type ResultatEligibilite = {
  dispositifId: string;
  niveau: NiveauEligibilite;
  note?: string;
};

/** Route un indépendant vers son Fonds d'Assurance Formation (FAF). */
function fafForActivite(activite?: Activite): { id: string; note?: string } {
  switch (activite) {
    case "liberal":
      return { id: "fifpl" };
    case "commercant":
      return { id: "agefice" };
    case "artisan":
      return { id: "fafcea" };
    case "agricole":
      return { id: "vivea" };
    default:
      return {
        id: "agefice",
        note: "FAF à confirmer selon l'activité : FIF-PL (libéral), AGEFICE (commerce), FAFCEA (artisan), VIVEA (agricole).",
      };
  }
}

/** Calcule les dispositifs éligibles pour un profil donné. */
export function eligibiliteFor(p: ProfilFinancement): ResultatEligibilite[] {
  const r: ResultatEligibilite[] = [];
  const add = (id: string, niveau: NiveauEligibilite, note?: string) =>
    r.push({ dispositifId: id, niveau, note });

  switch (p.statut) {
    case "salarie_prive": {
      add("cpf", "prioritaire", "Droits personnels mobilisables tout de suite.");
      const tpePme = p.tailleEntreprise === "tpe" || p.tailleEntreprise === "pme";
      add(
        "opco_pdc",
        tpePme ? "prioritaire" : "eligible",
        "À l'initiative de l'employeur ; demande à déposer AVANT le début de la formation.",
      );
      if (p.reconversion) {
        add("ptp", "prioritaire", "Reconversion (changement de métier) en conservant la rémunération.");
        add("opco_proa", "conditions", "Si la certification est listée par un accord de branche.");
      } else {
        add("opco_proa", "conditions", "Montée en qualification / reconversion interne par l'alternance.");
      }
      add("fne", "conditions", "Si l'entreprise est en mutation économique / transition.");
      break;
    }
    case "alternant": {
      add("opco_pdc", "eligible", "L'alternance (apprentissage / contrat pro) est financée par l'OPCO via le contrat.");
      add("cpf", "eligible");
      break;
    }
    case "independant_tns":
    case "dirigeant_tpe": {
      add("cpf", "prioritaire", "Droits CPF identiques à ceux d'un salarié (≈ 500 €/an).");
      const faf = fafForActivite(p.activite);
      const microNote = p.microEntreprise
        ? "Micro-entrepreneur : vous cotisez à la CFP via l'URSSAF ; vos droits dépendent d'un chiffre d'affaires déclaré suffisant."
        : "Vous cotisez à la CFP : vérifiez votre attestation de versement (URSSAF / MSA).";
      add(faf.id, "prioritaire", [faf.note, microNote].filter(Boolean).join(" "));
      if (p.statut === "dirigeant_tpe") {
        add("opco_pdc", "eligible", "Pour vos salariés : financement par l'OPCO de la branche (TPE prioritaires).");
        add("opco_pcrh", "conditions", "Accompagnement RH cofinancé (TPE-PME).");
      }
      break;
    }
    case "demandeur_emploi": {
      add("ft_aif", "prioritaire", "Instruite par votre conseiller référent ; cumulable avec le CPF.");
      add("cpf", "eligible", "Droits conservés ; le reste à charge peut être pris en charge par France Travail.");
      add("ft_poe", "conditions", "Si une entreprise est prête à recruter (POEI) ou via une action de branche (POEC).");
      break;
    }
    case "agent_public": {
      add("cpf", "prioritaire", "CPF de la fonction publique (dispositifs spécifiques hors OPCO/FAF).");
      break;
    }
  }

  if (p.handicap) {
    add("agefiph", "conditions", "Aide complémentaire (RQTH), cumulable avec les autres dispositifs.");
  }
  add("autofinancement", "eligible", "Pour le reste à charge éventuel après mobilisation des dispositifs.");

  return r;
}

/** Ordre d'affichage : prioritaire d'abord, autofinancement en dernier. */
export function trierResultats(res: ResultatEligibilite[]): ResultatEligibilite[] {
  const rang: Record<NiveauEligibilite, number> = { prioritaire: 0, eligible: 1, conditions: 2 };
  return [...res].sort((a, b) => {
    if (a.dispositifId === "autofinancement") return 1;
    if (b.dispositifId === "autofinancement") return -1;
    return rang[a.niveau] - rang[b.niveau];
  });
}
