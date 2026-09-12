import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("server-only", () => ({}));

import { mapEtat, mapFolder, listRegistrationFolders } from "@/lib/wedof";

afterEach(() => vi.unstubAllGlobals());

describe("wedof mapEtat — états Wedof → états internes", () => {
  it("billingState 'paid' est prioritaire → SOLDE", () => {
    expect(mapEtat("inTraining", "paid")).toBe("SOLDE");
    expect(mapEtat("accepted", "billed")).toBe("FACTURE");
    expect(mapEtat("accepted", "toBill")).toBe("A_FACTURER");
  });
  it("refus → REFUSE, annulation → ANNULE", () => {
    expect(mapEtat("rejected")).toBe("REFUSE");
    expect(mapEtat("canceledByAttendee")).toBe("ANNULE");
  });
  it("accepted → ACCEPTE, terminé → A_FACTURER, inconnu → A_MONTER", () => {
    expect(mapEtat("accepted")).toBe("ACCEPTE");
    expect(mapEtat("terminated")).toBe("A_FACTURER");
    expect(mapEtat("notProcessed")).toBe("A_MONTER");
  });
});

describe("wedof mapFolder — normalisation d'un dossier", () => {
  it("mappe id/montant/email (minuscule)/type/nom", () => {
    const m = mapFolder({
      externalId: "w1",
      state: "accepted",
      type: "cpf",
      amountToInvoice: 1500,
      attendee: { email: "A@B.FR", firstName: "Jean", lastName: "Dupont" },
    });
    expect(m.wedofId).toBe("w1");
    expect(m.montant).toBe(1500);
    expect(m.email).toBe("a@b.fr");
    expect(m.type).toBe("CPF");
    expect(m.nom).toBe("Jean Dupont");
  });
});

describe("wedof listRegistrationFolders — appel HTTP (fetch mocké)", () => {
  it("lève une erreur si Wedof répond non-ok", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 500 })));
    await expect(listRegistrationFolders("key", { limit: 10 })).rejects.toThrow(/Wedof 500/);
  });
  it("extrait data[] d'une réponse enveloppée", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ data: [{ externalId: "w1" }] }), { status: 200 })),
    );
    const r = await listRegistrationFolders("key");
    expect(r).toHaveLength(1);
    expect(r[0].externalId).toBe("w1");
  });
});
