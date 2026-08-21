import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const getCurrentEntreprise = vi.fn();
vi.mock("@/lib/entreprise-portal", () => ({ getCurrentEntreprise: () => getCurrentEntreprise() }));

const fakeDb = {
  session: { findFirst: vi.fn() },
  candidat: { findMany: vi.fn() },
  demandeInscription: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
};
const requireStaffTenant = vi.fn();
vi.mock("@/lib/tenant", () => ({
  getTenantDb: vi.fn(async () => fakeDb),
  requireStaffTenant: () => requireStaffTenant(),
}));

const createConventionEntreprise = vi.fn();
vi.mock("@/lib/actions/convention-actions", () => ({
  createConventionEntreprise: (i: unknown) => createConventionEntreprise(i),
}));
vi.mock("@/lib/documents/convention-pdf", () => ({
  generateAndStoreConventionPdf: vi.fn(async () => "blob://conv.pdf"),
}));
vi.mock("@/lib/emails/demande-emails", () => ({
  notifyClientDemande: vi.fn(async () => {}),
}));

import {
  createDemandeInscription,
  confirmerDemandeInscription,
  refuserDemandeInscription,
  proposerAutreDate,
  accepterContreProposition,
  refuserContreProposition,
} from "@/lib/actions/demande-inscription-actions";

beforeEach(() => vi.clearAllMocks());

describe("createDemandeInscription — isolation & validation", () => {
  it("refuse si le user n'est pas une entreprise (getCurrentEntreprise null)", async () => {
    getCurrentEntreprise.mockResolvedValue(null);
    const r = await createDemandeInscription({ sessionId: "s1", salaries: [{ nom: "A", prenom: "B" }] });
    expect(r.ok).toBe(false);
    expect(fakeDb.demandeInscription.create).not.toHaveBeenCalled();
  });

  it("prend l'entrepriseId de la SESSION (jamais du client) + scope la vérif candidat + enrichit", async () => {
    getCurrentEntreprise.mockResolvedValue({ id: "ent-A", raisonSociale: "A" });
    fakeDb.session.findFirst.mockResolvedValue({ id: "s1" });
    fakeDb.candidat.findMany.mockResolvedValue([{ id: "c1", nom: "Doe", prenom: "John" }]);
    fakeDb.demandeInscription.create.mockResolvedValue({ id: "d1" });

    const r = await createDemandeInscription({
      sessionId: "s1",
      salaries: [{ candidatId: "c1" }, { nom: "New", prenom: "Guy", email: "g@x.fr" }],
    });

    expect(r.ok).toBe(true);
    const data = fakeDb.demandeInscription.create.mock.calls[0][0].data;
    expect(data.entrepriseId).toBe("ent-A");
    expect(data.sessionId).toBe("s1");
    // La vérif d'appartenance des candidats est scopée à l'entreprise connectée.
    expect(fakeDb.candidat.findMany.mock.calls[0][0].where.entrepriseId).toBe("ent-A");
    // Le nom des candidats existants est dénormalisé pour l'affichage staff.
    expect(data.salariesJson).toEqual([
      { candidatId: "c1", nom: "Doe", prenom: "John" },
      { nom: "New", prenom: "Guy", email: "g@x.fr" },
    ]);
  });

  it("refuse un candidatId n'appartenant pas à l'entreprise (anti-IDOR)", async () => {
    getCurrentEntreprise.mockResolvedValue({ id: "ent-A", raisonSociale: "A" });
    fakeDb.session.findFirst.mockResolvedValue({ id: "s1" });
    fakeDb.candidat.findMany.mockResolvedValue([]); // aucun candidat possédé
    const r = await createDemandeInscription({ sessionId: "s1", salaries: [{ candidatId: "c-autre" }] });
    expect(r.ok).toBe(false);
    expect(fakeDb.demandeInscription.create).not.toHaveBeenCalled();
  });

  it("refuse une session non ouverte / inexistante dans le tenant", async () => {
    getCurrentEntreprise.mockResolvedValue({ id: "ent-A", raisonSociale: "A" });
    fakeDb.session.findFirst.mockResolvedValue(null);
    const r = await createDemandeInscription({ sessionId: "sX", salaries: [{ nom: "A", prenom: "B" }] });
    expect(r.ok).toBe(false);
  });

  it("refuse une demande vide", async () => {
    getCurrentEntreprise.mockResolvedValue({ id: "ent-A", raisonSociale: "A" });
    fakeDb.session.findFirst.mockResolvedValue({ id: "s1" });
    const r = await createDemandeInscription({ sessionId: "s1", salaries: [] });
    expect(r.ok).toBe(false);
  });
});

describe("confirmerDemandeInscription — réutilise createConventionEntreprise", () => {
  it("scinde salariesJson en candidatIdsExistants + nouveaux, puis passe à CONFIRMEE (verrou atomique)", async () => {
    requireStaffTenant.mockResolvedValue({ db: fakeDb, session: { user: { id: "staff-1" } } });
    fakeDb.demandeInscription.findFirst.mockResolvedValue({
      id: "d1",
      entrepriseId: "ent-A",
      sessionId: "s1",
      statut: "EN_ATTENTE",
      financementType: "OPCO",
      session: { formation: { titre: "Formation X" } },
      salariesJson: [
        { candidatId: "c1", nom: "Doe", prenom: "John" },
        { nom: "New", prenom: "Guy", email: "g@x.fr" },
      ],
    });
    fakeDb.demandeInscription.updateMany.mockResolvedValue({ count: 1 }); // verrou obtenu
    createConventionEntreprise.mockResolvedValue({ ok: true, conventionId: "cv1", inscrits: 2 });

    const r = await confirmerDemandeInscription("d1");

    expect(r.ok).toBe(true);
    const conv = createConventionEntreprise.mock.calls[0][0];
    expect(conv.sessionId).toBe("s1");
    expect(conv.entrepriseId).toBe("ent-A");
    expect(conv.candidatIdsExistants).toEqual(["c1"]);
    expect(conv.nouveaux).toEqual([{ nom: "New", prenom: "Guy", email: "g@x.fr" }]);
    // Le verrou (updateMany #1) passe à CONFIRMEE et n'est pris que si encore en attente.
    const claim = fakeDb.demandeInscription.updateMany.mock.calls[0][0];
    expect(claim.data.statut).toBe("CONFIRMEE");
    expect(claim.data.traiteeParId).toBe("staff-1");
    expect(claim.where.statut).toBe("EN_ATTENTE");
    // Pas de rollback → un seul updateMany.
    expect(fakeDb.demandeInscription.updateMany).toHaveBeenCalledTimes(1);
  });

  it("double-confirm concurrent : le 2e n'obtient pas le verrou (count 0) → pas de convention", async () => {
    requireStaffTenant.mockResolvedValue({ db: fakeDb, session: { user: { id: "staff-2" } } });
    fakeDb.demandeInscription.findFirst.mockResolvedValue({
      id: "d1",
      entrepriseId: "ent-A",
      sessionId: "s1",
      statut: "EN_ATTENTE",
      salariesJson: [{ nom: "A", prenom: "B" }],
    });
    fakeDb.demandeInscription.updateMany.mockResolvedValue({ count: 0 }); // déjà pris par l'autre

    const r = await confirmerDemandeInscription("d1");
    expect(r.ok).toBe(false);
    expect(createConventionEntreprise).not.toHaveBeenCalled();
  });

  it("relâche le verrou (rollback EN_ATTENTE) si createConventionEntreprise échoue", async () => {
    requireStaffTenant.mockResolvedValue({ db: fakeDb, session: { user: { id: "staff-1" } } });
    fakeDb.demandeInscription.findFirst.mockResolvedValue({
      id: "d1",
      entrepriseId: "ent-A",
      sessionId: "s1",
      statut: "EN_ATTENTE",
      salariesJson: [{ nom: "A", prenom: "B" }],
    });
    fakeDb.demandeInscription.updateMany.mockResolvedValue({ count: 1 });
    createConventionEntreprise.mockResolvedValue({ ok: false, error: "capacité" });

    const r = await confirmerDemandeInscription("d1");
    expect(r.ok).toBe(false);
    // updateMany #1 = verrou (CONFIRMEE), #2 = rollback (EN_ATTENTE).
    expect(fakeDb.demandeInscription.updateMany).toHaveBeenCalledTimes(2);
    expect(fakeDb.demandeInscription.updateMany.mock.calls[1][0].data.statut).toBe("EN_ATTENTE");
  });

  it("refuse une demande déjà traitée (avant même le verrou)", async () => {
    requireStaffTenant.mockResolvedValue({ db: fakeDb, session: { user: { id: "staff-1" } } });
    fakeDb.demandeInscription.findFirst.mockResolvedValue({
      id: "d1",
      entrepriseId: "ent-A",
      sessionId: "s1",
      statut: "CONFIRMEE",
      salariesJson: [],
    });
    const r = await confirmerDemandeInscription("d1");
    expect(r.ok).toBe(false);
    expect(createConventionEntreprise).not.toHaveBeenCalled();
    expect(fakeDb.demandeInscription.updateMany).not.toHaveBeenCalled();
  });
});

describe("proposerAutreDate — staff, contre-proposition", () => {
  it("passe en CONTRE_PROPOSEE avec la session proposée (ouverte + différente + même formation)", async () => {
    requireStaffTenant.mockResolvedValue({ db: fakeDb, session: { user: { id: "staff-1" } } });
    fakeDb.demandeInscription.findFirst.mockResolvedValue({
      id: "d1", statut: "EN_ATTENTE", sessionId: "s1", entrepriseId: "ent-A",
      session: { formationId: "f1", formation: { titre: "Formation X" } },
    });
    fakeDb.session.findFirst.mockResolvedValue({ id: "s2", formationId: "f1", dateDebut: new Date("2026-09-01") });
    fakeDb.demandeInscription.updateMany.mockResolvedValue({ count: 1 });

    const r = await proposerAutreDate("d1", "s2");
    expect(r.ok).toBe(true);
    const upd = fakeDb.demandeInscription.updateMany.mock.calls[0][0];
    expect(upd.data.statut).toBe("CONTRE_PROPOSEE");
    expect(upd.data.sessionProposeeId).toBe("s2");
    expect(upd.where.statut).toBe("EN_ATTENTE");
  });

  it("refuse une session proposée d'une AUTRE formation", async () => {
    requireStaffTenant.mockResolvedValue({ db: fakeDb, session: { user: { id: "staff-1" } } });
    fakeDb.demandeInscription.findFirst.mockResolvedValue({
      id: "d1", statut: "EN_ATTENTE", sessionId: "s1", session: { formationId: "f1" },
    });
    fakeDb.session.findFirst.mockResolvedValue({ id: "s2", formationId: "f2" });
    const r = await proposerAutreDate("d1", "s2");
    expect(r.ok).toBe(false);
    expect(fakeDb.demandeInscription.updateMany).not.toHaveBeenCalled();
  });

  it("refuse de proposer la même session que la demande", async () => {
    requireStaffTenant.mockResolvedValue({ db: fakeDb, session: { user: { id: "staff-1" } } });
    fakeDb.demandeInscription.findFirst.mockResolvedValue({ id: "d1", statut: "EN_ATTENTE", sessionId: "s1" });
    const r = await proposerAutreDate("d1", "s1");
    expect(r.ok).toBe(false);
    expect(fakeDb.demandeInscription.updateMany).not.toHaveBeenCalled();
  });

  it("refuse une session proposée non ouverte", async () => {
    requireStaffTenant.mockResolvedValue({ db: fakeDb, session: { user: { id: "staff-1" } } });
    fakeDb.demandeInscription.findFirst.mockResolvedValue({ id: "d1", statut: "EN_ATTENTE", sessionId: "s1" });
    fakeDb.session.findFirst.mockResolvedValue(null);
    const r = await proposerAutreDate("d1", "s2");
    expect(r.ok).toBe(false);
  });
});

describe("accepter/refuser contre-proposition — client, scopé entreprise", () => {
  it("accepter repointe la demande sur la session proposée + repasse EN_ATTENTE", async () => {
    getCurrentEntreprise.mockResolvedValue({ id: "ent-A", raisonSociale: "A" });
    fakeDb.demandeInscription.findFirst.mockResolvedValue({ id: "d1", statut: "CONTRE_PROPOSEE", sessionProposeeId: "s2" });
    fakeDb.demandeInscription.updateMany.mockResolvedValue({ count: 1 });

    const r = await accepterContreProposition("d1");
    expect(r.ok).toBe(true);
    const upd = fakeDb.demandeInscription.updateMany.mock.calls[0][0];
    expect(upd.where.entrepriseId).toBe("ent-A"); // anti-IDOR
    expect(upd.where.statut).toBe("CONTRE_PROPOSEE");
    expect(upd.data.sessionId).toBe("s2");
    expect(upd.data.sessionProposeeId).toBe(null);
    expect(upd.data.statut).toBe("EN_ATTENTE");
  });

  it("accepter échoue si la demande n'appartient pas à l'entreprise", async () => {
    getCurrentEntreprise.mockResolvedValue({ id: "ent-A", raisonSociale: "A" });
    fakeDb.demandeInscription.findFirst.mockResolvedValue(null); // pas trouvée pour ent-A
    const r = await accepterContreProposition("d1");
    expect(r.ok).toBe(false);
    expect(fakeDb.demandeInscription.updateMany).not.toHaveBeenCalled();
  });

  it("refuser annule la demande (ANNULEE), scopé entreprise", async () => {
    getCurrentEntreprise.mockResolvedValue({ id: "ent-A", raisonSociale: "A" });
    fakeDb.demandeInscription.updateMany.mockResolvedValue({ count: 1 });
    const r = await refuserContreProposition("d1");
    expect(r.ok).toBe(true);
    const upd = fakeDb.demandeInscription.updateMany.mock.calls[0][0];
    expect(upd.where.entrepriseId).toBe("ent-A");
    expect(upd.where.statut).toBe("CONTRE_PROPOSEE");
    expect(upd.data.statut).toBe("ANNULEE");
  });

  it("refuser (non authentifié comme entreprise) est rejeté", async () => {
    getCurrentEntreprise.mockResolvedValue(null);
    const r = await refuserContreProposition("d1");
    expect(r.ok).toBe(false);
  });
});

describe("refuserDemandeInscription — staff, verrou atomique EN_ATTENTE", () => {
  it("refuse via updateMany conditionné à EN_ATTENTE", async () => {
    requireStaffTenant.mockResolvedValue({ db: fakeDb, session: { user: { id: "staff-1" } } });
    fakeDb.demandeInscription.updateMany.mockResolvedValue({ count: 1 });
    const r = await refuserDemandeInscription("d1", "pas de place");
    expect(r.ok).toBe(true);
    const upd = fakeDb.demandeInscription.updateMany.mock.calls[0][0];
    expect(upd.where.statut).toBe("EN_ATTENTE");
    expect(upd.data.statut).toBe("REFUSEE");
    expect(upd.data.motif).toBe("pas de place");
    // Ne passe JAMAIS par un update() non gardé.
    expect(fakeDb.demandeInscription.update).not.toHaveBeenCalled();
  });

  it("no-op si la demande n'est plus EN_ATTENTE (count 0, ex. déjà contre-proposée)", async () => {
    requireStaffTenant.mockResolvedValue({ db: fakeDb, session: { user: { id: "staff-1" } } });
    fakeDb.demandeInscription.updateMany.mockResolvedValue({ count: 0 });
    const r = await refuserDemandeInscription("d1");
    expect(r.ok).toBe(false);
  });
});
