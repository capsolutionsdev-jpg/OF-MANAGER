import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    organisme: { findMany: vi.fn() },
    candidat: { findMany: vi.fn(), updateMany: vi.fn() },
    pieceJointe: { findMany: vi.fn(), updateMany: vi.fn() },
    inscription: { updateMany: vi.fn() },
    emargementSignature: { updateMany: vi.fn() },
    apprenant: { findFirst: vi.fn() },
    presence: { updateMany: vi.fn() },
    candidatMessage: { deleteMany: vi.fn() },
    candidatInteraction: { deleteMany: vi.fn() },
    smsLog: { updateMany: vi.fn() },
    consentement: { updateMany: vi.fn() },
    auditLog: { create: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import { purgeExpiredCandidats } from "@/lib/rgpd-retention";
import { anonymisedCandidatData, CANDIDAT_PII_NULLED, anonymisedEmail } from "@/lib/rgpd/anonymise";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

beforeEach(() => {
  db.organisme.findMany.mockReset();
  db.candidat.findMany.mockReset();
  db.candidat.updateMany.mockReset().mockResolvedValue({ count: 1 });
  db.pieceJointe.findMany.mockReset().mockResolvedValue([]);
  db.pieceJointe.updateMany.mockReset().mockResolvedValue({ count: 0 });
  db.inscription.updateMany.mockReset().mockResolvedValue({ count: 0 });
  db.emargementSignature.updateMany.mockReset().mockResolvedValue({ count: 0 });
  db.apprenant.findFirst.mockReset().mockResolvedValue(null);
  db.presence.updateMany.mockReset().mockResolvedValue({ count: 0 });
  db.candidatMessage.deleteMany.mockReset().mockResolvedValue({ count: 0 });
  db.candidatInteraction.deleteMany.mockReset().mockResolvedValue({ count: 0 });
  db.smsLog.updateMany.mockReset().mockResolvedValue({ count: 0 });
  db.consentement.updateMany.mockReset().mockResolvedValue({ count: 0 });
  db.auditLog.create.mockReset().mockResolvedValue({});
});

describe("anonymisedCandidatData() — effacement complet du candidat", () => {
  it("neutralise l'identité et marque anonymiseLe", () => {
    const d = anonymisedCandidatData("cand-1");
    expect(d.nom).toBe("Anonymisé");
    expect(d.prenom).toBe("—");
    expect(d.email).toBe(anonymisedEmail("cand-1"));
    expect(d.email).toContain("@rgpd.local");
    expect(d.statut).toBe("ARCHIVE");
    expect(d.anonymiseLe).toBeInstanceOf(Date);
  });

  it("met à null TOUS les champs PII (dont ceux oubliés avant le correctif)", () => {
    const d = anonymisedCandidatData("cand-1") as Record<string, unknown>;
    for (const champ of CANDIDAT_PII_NULLED) {
      expect(d[champ], `${champ} doit être null`).toBeNull();
    }
    // Régression : champs historiquement oubliés par l'effacement manuel.
    for (const champ of ["photoUrl", "lieuNaissance", "paysNaissance", "nationalite",
      "cnapsNumero", "carteProNumero", "prospectSignatureUrl", "prospectSignatureIp", "civicToken"]) {
      expect(d[champ], `${champ} doit être null`).toBeNull();
    }
  });
});

describe("purgeExpiredCandidats() — purge RGPD par durée de conservation", () => {
  it("efface complètement chaque candidat expiré + journalise", async () => {
    db.organisme.findMany.mockResolvedValue([{ id: "o1", dureeConservationMois: 36 }]);
    db.candidat.findMany.mockResolvedValue([{ id: "c1" }, { id: "c2" }]);

    const res = await purgeExpiredCandidats();

    expect(res.organismes).toBe(1);
    expect(res.anonymises).toBe(2);
    expect(db.candidat.updateMany).toHaveBeenCalledTimes(2);
    expect(db.auditLog.create).toHaveBeenCalledTimes(2);
    // L'effacement touche aussi les enregistrements liés (pièces, signatures, messages).
    expect(db.pieceJointe.updateMany).toHaveBeenCalledTimes(2);
    expect(db.inscription.updateMany).toHaveBeenCalledTimes(2);
    expect(db.emargementSignature.updateMany).toHaveBeenCalledTimes(2);
    expect(db.candidatMessage.deleteMany).toHaveBeenCalledTimes(2);
    // Correctif A02-007 : interactions CRM, journaux SMS et IP de consentement effacés.
    expect(db.candidatInteraction.deleteMany).toHaveBeenCalledTimes(2);
    expect(db.smsLog.updateMany).toHaveBeenCalledTimes(2);
    expect(db.consentement.updateMany).toHaveBeenCalledTimes(2);

    const where = db.candidat.findMany.mock.calls[0][0].where;
    expect(where.organismeId).toBe("o1");
    expect(where.anonymiseLe).toBeNull();
    expect(where.updatedAt.lt).toBeInstanceOf(Date);

    const data = db.candidat.updateMany.mock.calls[0][0].data;
    expect(data.nom).toBe("Anonymisé");
    expect(data.email).toContain("@rgpd.local");
    expect(data.anonymiseLe).toBeInstanceOf(Date);
    // Garde-fou tenant présent sur les opérations liées.
    expect(db.inscription.updateMany.mock.calls[0][0].where.organismeId).toBe("o1");
  });

  it("purge les feuilles de présence quand un apprenant existe", async () => {
    db.organisme.findMany.mockResolvedValue([{ id: "o1", dureeConservationMois: 36 }]);
    db.candidat.findMany.mockResolvedValue([{ id: "c1" }]);
    db.apprenant.findFirst.mockResolvedValue({ id: "app-1" });

    await purgeExpiredCandidats();

    expect(db.presence.updateMany).toHaveBeenCalledTimes(1);
    expect(db.presence.updateMany.mock.calls[0][0].where.apprenantId).toBe("app-1");
    expect(db.presence.updateMany.mock.calls[0][0].data.signatureUrl).toBeNull();
  });

  it("ne touche à rien s'il n'y a aucun candidat expiré", async () => {
    db.organisme.findMany.mockResolvedValue([{ id: "o1", dureeConservationMois: 36 }]);
    db.candidat.findMany.mockResolvedValue([]);
    const res = await purgeExpiredCandidats();
    expect(res.anonymises).toBe(0);
    expect(db.candidat.updateMany).not.toHaveBeenCalled();
  });

  it("applique la durée propre à chaque organisme", async () => {
    db.organisme.findMany.mockResolvedValue([{ id: "o1", dureeConservationMois: 12 }]);
    db.candidat.findMany.mockResolvedValue([]);
    const before = new Date();
    before.setMonth(before.getMonth() - 12);
    await purgeExpiredCandidats();
    const cutoff = db.candidat.findMany.mock.calls[0][0].where.updatedAt.lt as Date;
    expect(Math.abs(cutoff.getTime() - before.getTime())).toBeLessThan(60_000);
  });
});
