import { describe, it, expect } from "vitest";
import {
  stepFireDate,
  stepIsDue,
  dueSteps,
  describeOffset,
  timelineColumns,
  fillBalises,
  recipientFor,
  type StepLike,
} from "@/lib/automation/circuits";

const dates = { dateDebut: new Date("2026-09-10T09:00:00Z"), dateFin: new Date("2026-09-20T17:00:00Z") };

function step(over: Partial<StepLike> = {}): StepLike {
  return { id: over.id ?? "s1", ancre: "DEBUT", offsetJours: 0, audience: "APPRENANT", typeAction: "EMAIL", ...over };
}

describe("stepFireDate()", () => {
  it("ancre DÉBUT − offset négatif = avant le début", () => {
    expect(stepFireDate(step({ ancre: "DEBUT", offsetJours: -15 }), dates))
      .toEqual(new Date("2026-08-26T09:00:00Z")); // 10 sept − 15 j
  });
  it("ancre FIN + offset positif = après la fin", () => {
    expect(stepFireDate(step({ ancre: "FIN", offsetJours: 45 }), dates))
      .toEqual(new Date("2026-11-04T17:00:00Z")); // 20 sept + 45 j
  });
  it("offset 0 = l'ancre elle-même", () => {
    expect(stepFireDate(step({ ancre: "FIN", offsetJours: 0 }), dates)).toEqual(dates.dateFin);
  });
});

describe("stepIsDue()", () => {
  const s = step({ ancre: "DEBUT", offsetJours: -10 }); // dû le 31 août
  it("faux avant la date de déclenchement", () => {
    expect(stepIsDue(s, dates, new Date("2026-08-30T09:00:00Z"))).toBe(false);
  });
  it("vrai à/après la date de déclenchement", () => {
    expect(stepIsDue(s, dates, new Date("2026-08-31T09:00:00Z"))).toBe(true);
    expect(stepIsDue(s, dates, new Date("2026-09-05T09:00:00Z"))).toBe(true);
  });
});

describe("dueSteps()", () => {
  const steps = [
    step({ id: "a", ancre: "DEBUT", offsetJours: -15 }), // dû 26 août
    step({ id: "b", ancre: "DEBUT", offsetJours: 0 }), // dû 10 sept
    step({ id: "c", ancre: "FIN", offsetJours: 45 }), // dû 4 nov
  ];
  it("ne renvoie que les étapes dues et non déjà exécutées", () => {
    const now = new Date("2026-09-11T09:00:00Z"); // a et b dus, c pas encore
    expect(dueSteps(steps, dates, now, new Set()).map((s) => s.id)).toEqual(["a", "b"]);
  });
  it("exclut les étapes déjà journalisées (idempotence)", () => {
    const now = new Date("2026-09-11T09:00:00Z");
    expect(dueSteps(steps, dates, now, new Set(["a"])).map((s) => s.id)).toEqual(["b"]);
  });
  it("aucune étape due avant tout", () => {
    expect(dueSteps(steps, dates, new Date("2026-08-01T00:00:00Z"), new Set())).toHaveLength(0);
  });
});

describe("describeOffset()", () => {
  it("reproduit les libellés de la timeline", () => {
    expect(describeOffset(step({ ancre: "DEBUT", offsetJours: -15 }))).toBe("15 jours avant début");
    expect(describeOffset(step({ ancre: "DEBUT", offsetJours: -1 }))).toBe("1 jour avant début");
    expect(describeOffset(step({ ancre: "DEBUT", offsetJours: 0 }))).toBe("Jour Début");
    expect(describeOffset(step({ ancre: "FIN", offsetJours: 0 }))).toBe("Jour Fin");
    expect(describeOffset(step({ ancre: "FIN", offsetJours: 45 }))).toBe("45 jours après fin");
  });
});

describe("fillBalises()", () => {
  const ctx = { prenom: "Awa", nom: "Diallo", formation: "SSIAP 1", dateDebut: new Date("2026-09-10T09:00:00Z"), dateFin: new Date("2026-09-20T17:00:00Z"), entreprise: "ACME" };
  it("remplace toutes les balises (casse insensible)", () => {
    expect(fillBalises("Bonjour {prenom} {NOM}", ctx)).toBe("Bonjour Awa Diallo");
    expect(fillBalises("{formation} chez {entreprise}", ctx)).toBe("SSIAP 1 chez ACME");
    expect(fillBalises("Début {dateDebut}", ctx)).toContain("septembre 2026");
  });
  it("laisse le texte sans balise intact", () => {
    expect(fillBalises("Aucune balise ici.", ctx)).toBe("Aucune balise ici.");
  });
});

describe("recipientFor()", () => {
  const ctx = { apprenantEmail: "a@of.fr", entrepriseEmail: "e@of.fr" };
  it("route selon l'audience", () => {
    expect(recipientFor("APPRENANT", ctx)).toBe("a@of.fr");
    expect(recipientFor("ENTREPRISE", ctx)).toBe("e@of.fr");
    expect(recipientFor("FORMATEUR", ctx)).toBeNull(); // Lot 4
  });
  it("null si l'e-mail de l'audience manque", () => {
    expect(recipientFor("APPRENANT", { apprenantEmail: null, entrepriseEmail: "e@of.fr" })).toBeNull();
  });
});

describe("timelineColumns()", () => {
  it("colonnes distinctes triées chronologiquement (début avant fin)", () => {
    const cols = timelineColumns([
      step({ id: "1", ancre: "FIN", offsetJours: 1 }),
      step({ id: "2", ancre: "DEBUT", offsetJours: -15 }),
      step({ id: "3", ancre: "DEBUT", offsetJours: 0 }),
      step({ id: "4", ancre: "DEBUT", offsetJours: -15 }), // doublon de colonne
    ]);
    expect(cols.map((c) => c.label)).toEqual([
      "15 jours avant début",
      "Jour Début",
      "1 jour après fin",
    ]);
  });
});
