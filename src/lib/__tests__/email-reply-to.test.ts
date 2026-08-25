import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// PC-MAIL-05 : les e-mails candidats doivent porter un Reply-To = adresse de l'OF,
// pour que les réponses reviennent à l'organisme et non au no-reply mutualisé.

const { prisma, getCurrentOrganisme, fetchMock } = vi.hoisted(() => ({
  prisma: { organisme: { findUnique: vi.fn() } },
  getCurrentOrganisme: vi.fn(async () => null as unknown),
  fetchMock: vi.fn(
    async (_input: unknown, _init?: unknown) => new Response(null, { status: 200 }),
  ),
}));

vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("@/lib/crypto", () => ({
  decryptSecret: (v: unknown) => (v ? String(v) : undefined),
}));
vi.mock("@/lib/org", () => ({ getCurrentOrganisme: () => getCurrentOrganisme() }));

import { sendEmail } from "@/lib/email";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("RESEND_API_KEY", "re_test");
  vi.stubEnv("RESEND_SENDER", "OFManager <no-reply@ofmanager.info>");
  prisma.organisme.findUnique.mockResolvedValue(null);
  getCurrentOrganisme.mockResolvedValue(null);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function resendPayload(): Record<string, unknown> {
  const call = fetchMock.mock.calls.find((c) =>
    String(c[0]).includes("resend.com"),
  );
  if (!call) throw new Error("aucun appel Resend capturé");
  const init = call[1] as { body?: unknown };
  return JSON.parse(String(init.body));
}

describe("sendEmail — Reply-To (PC-MAIL-05)", () => {
  it("Resend : reply_to = adresse de l'OF, from = expéditeur mutualisé inchangé", async () => {
    prisma.organisme.findUnique.mockResolvedValue({
      nom: "OF X",
      emailExpediteurNom: "OF X",
      emailExpediteur: "contact@of-x.fr",
      brevoApiKey: null,
      isDemo: false,
    });

    const r = await sendEmail({
      to: "c@candidat.fr",
      subject: "Convocation",
      html: "<p>hi</p>",
      organismeId: "o1",
    });

    expect(r.sent).toBe(true);
    const payload = resendPayload();
    expect(payload.reply_to).toBe("contact@of-x.fr");
    expect(String(payload.from)).toContain("no-reply@ofmanager.info");
  });

  it("Resend : sans OF, reply_to = expéditeur de repli (jamais vide)", async () => {
    const r = await sendEmail({ to: "c@candidat.fr", subject: "Test", body: "x" });

    expect(r.sent).toBe(true);
    expect(resendPayload().reply_to).toBeTruthy();
  });

  it("Brevo : replyTo = { email, name } de l'OF quand Resend n'est pas configuré", async () => {
    vi.stubEnv("RESEND_API_KEY", ""); // pas de Resend → bascule sur Brevo
    prisma.organisme.findUnique.mockResolvedValue({
      nom: "OF Y",
      emailExpediteurNom: "OF Y",
      emailExpediteur: "hello@of-y.fr",
      brevoApiKey: "brevo-key-of",
      isDemo: false,
    });

    const r = await sendEmail({
      to: "c@candidat.fr",
      subject: "Test",
      body: "x",
      organismeId: "o2",
    });

    expect(r.sent).toBe(true);
    const call = fetchMock.mock.calls.find((c) =>
      String(c[0]).includes("brevo.com"),
    );
    if (!call) throw new Error("aucun appel Brevo capturé");
    const payload = JSON.parse(String((call[1] as { body?: unknown }).body));
    expect(payload.replyTo).toEqual({ email: "hello@of-y.fr", name: "OF Y" });
  });
});
