import { describe, it, expect, vi, beforeEach } from "vitest";

// Seule frontière mockée : la couche Prisma (claim atomique emailSentAt).
const updateMany = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: { civicPaiement: { updateMany: (...a: unknown[]) => updateMany(...a) } },
}));

import { sendCivicPaiementEmailOnce } from "@/lib/civique-email";

beforeEach(() => vi.clearAllMocks());

describe("sendCivicPaiementEmailOnce — envoi « une seule fois » mais RETENTABLE (A12-003)", () => {
  it("relâche le claim si l'envoi échoue → e-mail retentable à la prochaine entrée", async () => {
    updateMany.mockResolvedValueOnce({ count: 1 }); // claim gagné (emailSentAt null→now)
    updateMany.mockResolvedValueOnce({ count: 1 }); // relâche (now→null)
    const send = vi.fn().mockResolvedValue({ sent: false });

    const r = await sendCivicPaiementEmailOnce("p1", send);

    expect(r).toEqual({ sent: false, claimed: true });
    expect(send).toHaveBeenCalledOnce();
    expect(updateMany).toHaveBeenCalledTimes(2);
    // Le 2e appel remet emailSentAt à null → un rejeu (webhook / page succès) retentera.
    expect(updateMany.mock.calls[1][0]).toMatchObject({
      where: { id: "p1" },
      data: { emailSentAt: null },
    });
  });

  it("garde le claim si l'envoi réussit (aucune relâche)", async () => {
    updateMany.mockResolvedValueOnce({ count: 1 });
    const send = vi.fn().mockResolvedValue({ sent: true });

    const r = await sendCivicPaiementEmailOnce("p1", send);

    expect(r).toEqual({ sent: true, claimed: true });
    expect(send).toHaveBeenCalledOnce();
    expect(updateMany).toHaveBeenCalledTimes(1); // 1 seul appel : pas de relâche
  });

  it("n'envoie pas si le claim est déjà pris (double entrée concurrente webhook+page succès)", async () => {
    updateMany.mockResolvedValueOnce({ count: 0 }); // un autre appel détient déjà le claim
    const send = vi.fn();

    const r = await sendCivicPaiementEmailOnce("p1", send);

    expect(r).toEqual({ sent: false, claimed: false });
    expect(send).not.toHaveBeenCalled(); // pas de double envoi
  });

  it("relâche le claim si l'envoi lève une exception", async () => {
    updateMany.mockResolvedValueOnce({ count: 1 });
    updateMany.mockResolvedValueOnce({ count: 1 });
    const send = vi.fn().mockRejectedValue(new Error("boom"));

    const r = await sendCivicPaiementEmailOnce("p1", send);

    expect(r).toEqual({ sent: false, claimed: true });
    expect(send).toHaveBeenCalledOnce();
    expect(updateMany).toHaveBeenCalledTimes(2); // claim puis relâche
  });
});
