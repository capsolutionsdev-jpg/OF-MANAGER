import { describe, it, expect } from "vitest";
import type { Role } from "@prisma/client";
import { authConfig } from "@/auth.config";
import { SECTION_ROLES, STAFF_FILTRES } from "@/lib/section-roles";

// =============================================================
//  TEST DE LA MATRICE D'AUTORISATION (rôle × page).
//
//  Vérifie, pour chaque rôle et chaque page, que le middleware
//  `authorized` autorise ou REDIRIGE comme prévu. C'est ce type de
//  test qui aurait attrapé le défaut D1 (formateur/candidat qui
//  voyaient le tableau de bord admin). On teste la LOGIQUE PURE
//  (aucune base de données) en appelant directement le callback.
// =============================================================

type Outcome = { allow: true } | { allow: false; to: string };

function check(
  role: Role | null,
  path: string,
  opts: { permissions?: string[]; fonctionnalites?: string[] } = {},
): Outcome {
  const auth = role
    ? {
        user: {
          role,
          permissions: opts.permissions ?? [],
          fonctionnalites: opts.fonctionnalites ?? [],
        },
      }
    : null;
  const nextUrl = new URL(path, "https://app.test");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = authConfig.callbacks!.authorized!({ auth, request: { nextUrl } } as any);
  if (res === true) return { allow: true };
  if (res === false) return { allow: false, to: "/login" }; // non connecté → page de login
  const loc = (res as Response).headers.get("location") ?? "";
  return { allow: false, to: new URL(loc).pathname };
}

const STAFF: Role[] = ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"];

describe("D1 — le FORMATEUR et le CANDIDAT ne voient jamais le back-office admin", () => {
  const PAGES_STAFF = ["/dashboard", "/candidats", "/sessions", "/crm", "/comptabilite", "/bpf", "/administration", "/formateurs"];

  it("FORMATEUR : toute page admin → redirigé vers /mes-sessions", () => {
    for (const p of PAGES_STAFF) {
      expect(check("FORMATEUR", p)).toEqual({ allow: false, to: "/mes-sessions" });
    }
  });

  it("APPRENANT : toute page admin → redirigé vers /mon-espace", () => {
    for (const p of PAGES_STAFF) {
      expect(check("APPRENANT", p)).toEqual({ allow: false, to: "/mon-espace" });
    }
  });

  it("FORMATEUR : garde l'accès à SES pages", () => {
    for (const p of ["/mes-sessions", "/ma-facturation", "/mes-contrats", "/mon-compte", "/mon-profil", "/elearning"]) {
      expect(check("FORMATEUR", p)).toEqual({ allow: true });
    }
  });

  it("APPRENANT : garde l'accès à SON espace", () => {
    for (const p of ["/mon-espace", "/mes-documents", "/mes-emargements", "/mes-formations", "/mes-certificats"]) {
      expect(check("APPRENANT", p)).toEqual({ allow: true });
    }
  });

  it("ENTREPRISE : toute page admin → redirigé vers /espace-entreprise", () => {
    for (const p of PAGES_STAFF) {
      expect(check("ENTREPRISE", p)).toEqual({ allow: false, to: "/espace-entreprise" });
    }
  });

  it("ENTREPRISE : garde l'accès à SON espace (page racine + sous-page)", () => {
    expect(check("ENTREPRISE", "/espace-entreprise")).toEqual({ allow: true });
    expect(check("ENTREPRISE", "/espace-entreprise/documents")).toEqual({ allow: true });
  });
});

describe("Console éditeur & Administration", () => {
  it("SUPERADMIN est confiné à /console", () => {
    expect(check("SUPERADMIN", "/console")).toEqual({ allow: true });
    expect(check("SUPERADMIN", "/console/organismes")).toEqual({ allow: true });
    expect(check("SUPERADMIN", "/dashboard")).toEqual({ allow: false, to: "/console" });
  });

  it("aucun autre rôle n'accède à /console", () => {
    for (const r of STAFF) {
      expect(check(r, "/console")).toEqual({ allow: false, to: "/dashboard" });
    }
    expect(check("FORMATEUR", "/console").allow).toBe(false);
    expect(check("APPRENANT", "/console").allow).toBe(false);
  });

  it("/administration est réservé à l'ADMIN", () => {
    expect(check("ADMIN", "/administration")).toEqual({ allow: true });
    expect(check("RESPONSABLE_FORMATION", "/administration")).toEqual({ allow: false, to: "/dashboard" });
    expect(check("ASSISTANT", "/administration")).toEqual({ allow: false, to: "/dashboard" });
  });
});

describe("Accès public & non authentifié", () => {
  it("la landing / est publique", () => {
    expect(check(null, "/")).toEqual({ allow: true });
  });
  it("un visiteur non connecté est refusé sur une page privée", () => {
    expect(check(null, "/dashboard")).toEqual({ allow: false, to: "/login" });
  });
  it("un utilisateur connecté sur /login est redirigé", () => {
    expect(check("ADMIN", "/login")).toEqual({ allow: false, to: "/dashboard" });
    expect(check("SUPERADMIN", "/login")).toEqual({ allow: false, to: "/console" });
  });
});

describe("Matrice complète rôles × sections (SECTION_ROLES)", () => {
  for (const seg of Object.keys(SECTION_ROLES)) {
    for (const role of STAFF) {
      const allowed = SECTION_ROLES[seg].includes(role);
      const needsPerm = STAFF_FILTRES.includes(role);
      it(`${role} sur /${seg} → ${allowed ? "autorisé (permission cochée)" : "refusé"}`, () => {
        const withPerm = check(role, `/${seg}`, { permissions: [seg] });
        if (allowed) {
          expect(withPerm).toEqual({ allow: true });
          // RESPONSABLE / ASSISTANT : sans la permission cochée → bloqué.
          if (needsPerm) {
            expect(check(role, `/${seg}`, { permissions: [] })).toEqual({ allow: false, to: "/dashboard" });
          }
        } else {
          expect(withPerm).toEqual({ allow: false, to: "/dashboard" });
        }
      });
    }

    it(`FORMATEUR & APPRENANT sur /${seg}`, () => {
      // FORMATEUR est légitimement admis là où SECTION_ROLES l'inclut (ex. elearning).
      const formAllowed = SECTION_ROLES[seg].includes("FORMATEUR");
      expect(check("FORMATEUR", `/${seg}`, { permissions: [seg] }).allow).toBe(formAllowed);
      // L'APPRENANT n'est admis dans AUCUNE section staff.
      expect(check("APPRENANT", `/${seg}`, { permissions: [seg] }).allow).toBe(false);
    });
  }
});
