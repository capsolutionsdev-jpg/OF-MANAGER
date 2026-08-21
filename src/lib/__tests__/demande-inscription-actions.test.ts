import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const getCurrentEntreprise = vi.fn();
vi.mock("@/lib/entreprise-portal", () => ({ getCurrentEntreprise: () => getCurrentEntreprise() }));

const fakeDb = {
  session: { findFirst: vi.fn() },
  candidat: { findMany: vi.fn() },
  demandeInscription: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
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

import {
  createDemandeInscription,
  confirmerDemandeInscription,
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
  it("scinde salariesJson en candidatIdsExistants + nouveaux, puis passe à CONFIRMEE", async () => {
    requireStaffTenant.mockResolvedValue({ db: fakeDb, session: { user: { id: "staff-1" } } });
    fakeDb.demandeInscription.findFirst.mockResolvedValue({
      id: "d1",
      entrepriseId: "ent-A",
      sessionId: "s1",
      statut: "EN_ATTENTE",
      salariesJson: [
        { candidatId: "c1", nom: "Doe", prenom: "John" },
        { nom: "New", prenom: "Guy", email: "g@x.fr" },
      ],
    });
    createConventionEntreprise.mockResolvedValue({ ok: true, conventionId: "cv1", inscrits: 2 });
    fakeDb.demandeInscription.update.mockResolvedValue({});

    const r = await confirmerDemandeInscription("d1");

    expect(r.ok).toBe(true);
    const conv = createConventionEntreprise.mock.calls[0][0];
    expect(conv.sessionId).toBe("s1");
    expect(conv.entrepriseId).toBe("ent-A");
    expect(conv.candidatIdsExistants).toEqual(["c1"]);
    expect(conv.nouveaux).toEqual([{ nom: "New", prenom: "Guy", email: "g@x.fr" }]);
    const upd = fakeDb.demandeInscription.update.mock.calls[0][0];
    expect(upd.data.statut).toBe("CONFIRMEE");
    expect(upd.data.traiteeParId).toBe("staff-1");
  });

  it("n'écrit rien et remonte l'erreur si createConventionEntreprise échoue", async () => {
    requireStaffTenant.mockResolvedValue({ db: fakeDb, session: { user: { id: "staff-1" } } });
    fakeDb.demandeInscription.findFirst.mockResolvedValue({
      id: "d1",
      entrepriseId: "ent-A",
      sessionId: "s1",
      statut: "EN_ATTENTE",
      salariesJson: [{ nom: "A", prenom: "B" }],
    });
    createConventionEntreprise.mockResolvedValue({ ok: false, error: "capacité" });

    const r = await confirmerDemandeInscription("d1");
    expect(r.ok).toBe(false);
    expect(fakeDb.demandeInscription.update).not.toHaveBeenCalled();
  });

  it("refuse une demande déjà traitée", async () => {
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
  });
});
