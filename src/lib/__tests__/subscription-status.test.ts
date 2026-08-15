import { describe, it, expect } from "vitest";
import { OrganismeStatut } from "@prisma/client";
import { organismeStatutForSubscription } from "@/lib/billing/subscription-status";

describe("organismeStatutForSubscription() — machine à états dunning", () => {
  it("actif / essai → ACTIF", () => {
    expect(organismeStatutForSubscription("active")).toBe(OrganismeStatut.ACTIF);
    expect(organismeStatutForSubscription("trialing")).toBe(OrganismeStatut.ACTIF);
  });

  it("past_due (impayé, relances en cours) → reste ACTIF (période de grâce, PAS de suspension)", () => {
    expect(organismeStatutForSubscription("past_due")).toBe(OrganismeStatut.ACTIF);
  });

  it("échec définitif → SUSPENDU", () => {
    expect(organismeStatutForSubscription("unpaid")).toBe(OrganismeStatut.SUSPENDU);
    expect(organismeStatutForSubscription("canceled")).toBe(OrganismeStatut.SUSPENDU);
    expect(organismeStatutForSubscription("incomplete_expired")).toBe(OrganismeStatut.SUSPENDU);
  });

  it("états transitoires → ne change pas le statut (undefined)", () => {
    expect(organismeStatutForSubscription("incomplete")).toBeUndefined();
    expect(organismeStatutForSubscription("paused")).toBeUndefined();
    expect(organismeStatutForSubscription("n'importe quoi")).toBeUndefined();
  });
});
