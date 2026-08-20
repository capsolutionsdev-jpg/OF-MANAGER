# Espace client B2B — Phase 1a : Fondation & accès sécurisé — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un client professionnel peut recevoir un accès créé par l'OF, définir son mot de passe via un e-mail d'invitation, se connecter, et atterrir dans une coquille d'espace `/espace-entreprise` strictement isolée (il ne voit que sa propre entreprise, jamais le back-office ni un autre client).

**Architecture:** On ajoute un rôle `ENTREPRISE` et un lien `Entreprise.userId` (calqués sur le patron `Apprenant`). La création de compte (staff) génère un jeton d'invitation et envoie un e-mail Resend vers une page publique `/definir-mot-de-passe/[token]`. Le confinement des routes se fait dans `authorized()` (via un helper pur testable), l'isolation des données via une garde `getCurrentEntreprise()`. Aucune rubrique métier ici (Plan 1b).

**Tech Stack:** Next.js 16 (App Router), Prisma + PostgreSQL (Neon), NextAuth v5 (Credentials + bcrypt), vitest, TailwindCSS. Node lancé via `C:\Program Files\nodejs` (hors PATH).

**Spec:** `docs/superpowers/specs/2026-08-20-espace-client-b2b-design.md`

## Global Constraints

- **Multi-tenant** : le `User` est une entité GLOBALE (e-mail unique cross-tenant) → toute écriture sur `User`/`Entreprise.userId` passe par le client BRUT `prisma` (`@/lib/prisma`), JAMAIS le client cloisonné `getTenantDb()`. Les lectures scopées entreprise passent par `getTenantDb()`.
- **Sécurité** : bcrypt `hash(password, 12)` ; refuser un mot de passe < 8 caractères et un mot de passe présent dans une fuite (`isPasswordPwned` de `@/lib/security/password`).
- **Commandes** : préfixer Node par `C:\Program Files\nodejs`. Tests : `node node_modules/vitest/vitest.mjs run <fichier>`. Types : `node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit`. Schéma : `node node_modules/prisma/build/index.js db push` (JAMAIS `migrate` — le repo se synchronise par `db push`).
- **Branche** : tout se fait sur `feat/espace-client-b2b` (déjà créée).
- **Rôle** : la valeur du rôle est exactement `ENTREPRISE` (enum Prisma `Role`).

## File Structure

- `prisma/schema.prisma` — enum `Role` (+ENTREPRISE), modèle `Entreprise` (+`userId`), modèle `User` (+`inviteToken`, `inviteTokenExpiry`, back-relation `entreprise`).
- `src/lib/entreprise-portal.ts` — **créer** : garde `getCurrentEntreprise()` + helper pur `isEntrepriseAllowedPath(path)`. Responsabilité : résolution + périmètre de l'espace entreprise.
- `src/lib/__tests__/entreprise-portal.test.ts` — **créer** : tests du helper pur de confinement.
- `src/auth.config.ts` — **modifier** : brancher le confinement `ENTREPRISE` dans `authorized()`.
- `src/lib/actions/entreprise-account-actions.ts` — **créer** : `createEntrepriseAccount(entrepriseId)` (staff) + `setPasswordFromInvite(token, password)` (public).
- `src/lib/__tests__/entreprise-invite.test.ts` — **créer** : tests de la logique d'expiration du jeton d'invitation (fonction pure).
- `src/lib/entreprise-invite.ts` — **créer** : fonction pure `inviteTokenExpired(expiry, now)` (testable sans DB).
- `src/app/definir-mot-de-passe/[token]/page.tsx` + `set-password-form.tsx` — **créer** : page publique de définition du mot de passe.
- `src/middleware.ts` — **modifier** : exclure `definir-mot-de-passe` du matcher (route publique).
- `src/app/(app)/espace-entreprise/layout.tsx` + `page.tsx` — **créer** : coquille de l'espace + page d'accueil.
- `src/lib/actions/client-pro-actions.ts` (ou la fiche `/clients-pro/[id]`) — **modifier** : bouton « Créer l'accès » appelant `createEntrepriseAccount`.

---

### Task 1: Schéma — rôle ENTREPRISE, lien Entreprise.userId, jeton d'invitation

**Files:**
- Modify: `prisma/schema.prisma` (enum `Role`, modèles `Entreprise` et `User`)

**Interfaces:**
- Produces: enum `Role.ENTREPRISE` ; `Entreprise.userId String?` (+ relation `user`) ; `User.inviteToken String?`, `User.inviteTokenExpiry DateTime?`, back-relation `User.entreprise Entreprise?`.

- [ ] **Step 1: Ajouter la valeur d'enum** — dans `enum Role { … }`, ajouter `ENTREPRISE` à la fin de la liste.

- [ ] **Step 2: Lien Entreprise → User** — dans `model Entreprise`, ajouter :

```prisma
  userId String? @unique
  user   User?   @relation("EntrepriseCompte", fields: [userId], references: [id])
```

- [ ] **Step 3: Champs d'invitation + back-relation sur User** — dans `model User`, ajouter :

```prisma
  inviteToken       String?   @unique
  inviteTokenExpiry DateTime?
  entreprise        Entreprise? @relation("EntrepriseCompte")
```

- [ ] **Step 4: Régénérer le client + pousser le schéma**

Run (depuis le dossier du fork) :
```bash
node node_modules/prisma/build/index.js generate
node node_modules/prisma/build/index.js db push
```
Expected: « Your database is now in sync with your Prisma schema. »

- [ ] **Step 5: Vérifier les types**

Run: `node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(b2b): schema role ENTREPRISE + lien Entreprise.userId + jeton invitation"
```

---

### Task 2: Confinement des routes ENTREPRISE (helper pur + garde middleware)

**Files:**
- Create: `src/lib/entreprise-portal.ts`
- Create: `src/lib/__tests__/entreprise-portal.test.ts`
- Modify: `src/auth.config.ts` (bloc `authorized`, après le bloc `FORMATEUR` ~ligne 82)

**Interfaces:**
- Produces: `isEntrepriseAllowedPath(path: string): boolean` — vrai si le chemin fait partie de l'espace entreprise autorisé.

- [ ] **Step 1: Écrire le test qui échoue** — `src/lib/__tests__/entreprise-portal.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { isEntrepriseAllowedPath } from "@/lib/entreprise-portal";

describe("isEntrepriseAllowedPath (confinement espace entreprise)", () => {
  it("autorise l'espace entreprise", () => {
    expect(isEntrepriseAllowedPath("/espace-entreprise")).toBe(true);
    expect(isEntrepriseAllowedPath("/espace-entreprise/documents")).toBe(true);
  });
  it("bloque le back-office et les autres espaces", () => {
    for (const p of ["/dashboard", "/sessions", "/clients-pro", "/mon-espace", "/console", "/administration"]) {
      expect(isEntrepriseAllowedPath(p)).toBe(false);
    }
  });
});
```

- [ ] **Step 2: Lancer le test → il échoue**

Run: `node node_modules/vitest/vitest.mjs run src/lib/__tests__/entreprise-portal.test.ts`
Expected: FAIL (`isEntrepriseAllowedPath` n'existe pas).

- [ ] **Step 3: Créer le helper** — `src/lib/entreprise-portal.ts` (le fichier contiendra aussi la garde en Task 5 ; on ajoute d'abord le helper pur, sans import serveur pour rester edge-compatible) :

```ts
/**
 * Chemins autorisés pour un compte ENTREPRISE (confinement du portail client).
 * Fonction PURE (utilisable dans le middleware edge — aucune dépendance runtime).
 */
export function isEntrepriseAllowedPath(path: string): boolean {
  return path === "/espace-entreprise" || path.startsWith("/espace-entreprise/");
}
```

- [ ] **Step 4: Lancer le test → il passe**

Run: `node node_modules/vitest/vitest.mjs run src/lib/__tests__/entreprise-portal.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Brancher dans `authorized()`** — dans `src/auth.config.ts`, juste APRÈS le bloc `if (role === "FORMATEUR") { … }` (~ligne 82) et AVANT le bloc `/administration`, insérer :

```ts
      // Espace ENTREPRISE (client professionnel) : confiné à /espace-entreprise/*,
      // jamais le back-office ni un autre espace. Toute autre URL → /espace-entreprise.
      if (role === "ENTREPRISE") {
        return isEntrepriseAllowedPath(path)
          ? true
          : Response.redirect(new URL("/espace-entreprise", nextUrl));
      }
```

Ajouter l'import en tête du fichier :
```ts
import { isEntrepriseAllowedPath } from "@/lib/entreprise-portal";
```

- [ ] **Step 6: Vérifier types + test**

Run: `node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit` (exit 0) puis le test de Step 4 (PASS).

- [ ] **Step 7: Commit**

```bash
git add src/lib/entreprise-portal.ts src/lib/__tests__/entreprise-portal.test.ts src/auth.config.ts
git commit -m "feat(b2b): confinement du role ENTREPRISE a /espace-entreprise"
```

---

### Task 3: Expiration du jeton d'invitation (fonction pure)

**Files:**
- Create: `src/lib/entreprise-invite.ts`
- Create: `src/lib/__tests__/entreprise-invite.test.ts`

**Interfaces:**
- Produces: `INVITE_TTL_DAYS = 7` ; `inviteTokenExpired(expiry: Date | null, now?: number): boolean`.

- [ ] **Step 1: Écrire le test qui échoue** — `src/lib/__tests__/entreprise-invite.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { inviteTokenExpired, INVITE_TTL_DAYS } from "@/lib/entreprise-invite";

describe("inviteTokenExpired", () => {
  const now = new Date("2026-08-20T12:00:00Z").getTime();
  it("TTL = 7 jours", () => expect(INVITE_TTL_DAYS).toBe(7));
  it("expiry nul → expiré (jeton absent/consommé)", () => {
    expect(inviteTokenExpired(null, now)).toBe(true);
  });
  it("expiry futur → non expiré", () => {
    expect(inviteTokenExpired(new Date(now + 1000), now)).toBe(false);
  });
  it("expiry passé → expiré", () => {
    expect(inviteTokenExpired(new Date(now - 1000), now)).toBe(true);
  });
});
```

- [ ] **Step 2: Lancer le test → il échoue**

Run: `node node_modules/vitest/vitest.mjs run src/lib/__tests__/entreprise-invite.test.ts`
Expected: FAIL (module absent).

- [ ] **Step 3: Créer la fonction** — `src/lib/entreprise-invite.ts` :

```ts
/** Durée de validité d'un lien d'invitation entreprise (jours). */
export const INVITE_TTL_DAYS = 7;

/**
 * Un jeton d'invitation est-il EXPIRÉ ? `expiry` nul = pas de jeton valide
 * (jamais émis ou déjà consommé) → considéré expiré. `now` injectable (tests).
 */
export function inviteTokenExpired(expiry: Date | null, now: number = Date.now()): boolean {
  if (!expiry) return true;
  return expiry.getTime() < now;
}
```

- [ ] **Step 4: Lancer le test → il passe**

Run: `node node_modules/vitest/vitest.mjs run src/lib/__tests__/entreprise-invite.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/entreprise-invite.ts src/lib/__tests__/entreprise-invite.test.ts
git commit -m "feat(b2b): logique d'expiration du jeton d'invitation entreprise"
```

---

### Task 4: Création du compte entreprise + e-mail d'invitation (staff)

**Files:**
- Create: `src/lib/actions/entreprise-account-actions.ts`

**Interfaces:**
- Consumes: `generateToken` (`@/lib/token`), `INVITE_TTL_DAYS` (`@/lib/entreprise-invite`), `sendEmail` + `emailShell` + `emailButton` + `emailParagraph` (`@/lib/email`, `@/lib/email-templates`), `appBaseUrl` (`@/lib/token`), `isPasswordPwned` (`@/lib/security/password`), `prisma` (`@/lib/prisma`), `getTenantDb` + `auth`.
- Produces: `createEntrepriseAccount(entrepriseId: string): Promise<{ ok: boolean; error?: string }>`.

- [ ] **Step 1: Écrire l'action** — `src/lib/actions/entreprise-account-actions.ts`. Elle est **staff-only**, crée le `User` (rôle `ENTREPRISE`, mot de passe temporaire aléatoire inutilisable), lie l'entreprise, pose le jeton d'invitation, et envoie l'e-mail. Calquée sur `createApprenantAccount` (`src/lib/actions/apprenant-actions.ts`).

```ts
"use server";

import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getTenantDb } from "@/lib/tenant";
import { auth } from "@/auth";
import { generateToken, appBaseUrl } from "@/lib/token";
import { INVITE_TTL_DAYS } from "@/lib/entreprise-invite";
import { sendEmail } from "@/lib/email";
import { emailShell, emailParagraph, emailButton, emailHeading } from "@/lib/email-templates";

const STAFF = ["SUPERADMIN", "ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"];
type Res = { ok: boolean; error?: string };

/**
 * Crée l'accès d'une entreprise cliente : User (rôle ENTREPRISE) lié à
 * l'entreprise, avec un jeton d'invitation envoyé par e-mail (le client définit
 * son mot de passe via /definir-mot-de-passe/[token]).
 */
export async function createEntrepriseAccount(entrepriseId: string): Promise<Res> {
  const session = await auth();
  if (!session?.user || !STAFF.includes(session.user.role as string))
    return { ok: false, error: "Non autorisé." };

  const db = await getTenantDb();
  const ent = await db.entreprise.findUnique({
    where: { id: entrepriseId },
    select: { id: true, raisonSociale: true, contactEmail: true, organismeId: true, userId: true },
  });
  if (!ent) return { ok: false, error: "Entreprise introuvable." };
  if (ent.userId) return { ok: false, error: "Un accès existe déjà pour cette entreprise." };

  const email = (ent.contactEmail ?? "").trim().toLowerCase();
  if (!email) return { ok: false, error: "Renseignez d'abord l'e-mail de contact de l'entreprise." };

  // User = entité GLOBALE → client BRUT prisma (cf. Global Constraints).
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return { ok: false, error: "Cette adresse e-mail est déjà utilisée par un compte." };

  const inviteToken = generateToken(24);
  const inviteTokenExpiry = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
  // Mot de passe temporaire aléatoire et inutilisable (le client en définira un).
  const passwordHash = await bcrypt.hash(randomBytes(24).toString("base64url"), 12);

  const user = await prisma.user.create({
    data: {
      name: ent.raisonSociale,
      email,
      passwordHash,
      role: "ENTREPRISE",
      isActive: true,
      organismeId: ent.organismeId,
      inviteToken,
      inviteTokenExpiry,
    },
    select: { id: true },
  });
  await prisma.entreprise.update({ where: { id: ent.id }, data: { userId: user.id } });

  const link = `${appBaseUrl()}/definir-mot-de-passe/${inviteToken}`;
  const html = emailShell({
    organisme: ent.raisonSociale,
    representant: "L'équipe OFManager",
    accent: "primary",
    body:
      emailHeading("Votre espace client est prêt") +
      emailParagraph("Vous pouvez désormais suivre vos formations, inscrire vos salariés et récupérer vos documents en ligne.") +
      emailButton("Définir mon mot de passe", link, "primary") +
      emailParagraph(`Ce lien est valable ${INVITE_TTL_DAYS} jours.`),
  });
  await sendEmail({ to: email, subject: "Votre accès à l'espace client", html });

  return { ok: true };
}
```

- [ ] **Step 2: Vérifier les types**

Run: `node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit`
Expected: exit 0. *(Si un nom d'export e-mail diffère, aligner sur `src/lib/email-templates.ts` — `emailShell/emailParagraph/emailButton/emailHeading` sont exportés là.)*

- [ ] **Step 3: Commit**

```bash
git add src/lib/actions/entreprise-account-actions.ts
git commit -m "feat(b2b): createEntrepriseAccount + e-mail d'invitation"
```

---

### Task 5: Page publique « définir mon mot de passe »

**Files:**
- Create: `src/app/definir-mot-de-passe/[token]/page.tsx`
- Create: `src/app/definir-mot-de-passe/[token]/set-password-form.tsx`
- Modify: `src/lib/actions/entreprise-account-actions.ts` (ajout `setPasswordFromInvite`)
- Modify: `src/middleware.ts` (exclure la route du matcher)

**Interfaces:**
- Consumes: `inviteTokenExpired` (`@/lib/entreprise-invite`), `isPasswordPwned` (`@/lib/security/password`), `prisma`.
- Produces: `setPasswordFromInvite(token: string, password: string): Promise<{ ok: boolean; error?: string }>`.

- [ ] **Step 1: Ajouter l'action** dans `src/lib/actions/entreprise-account-actions.ts` :

```ts
import { inviteTokenExpired } from "@/lib/entreprise-invite";
import { isPasswordPwned } from "@/lib/security/password";

/** Le titulaire d'un lien d'invitation valide définit son mot de passe. */
export async function setPasswordFromInvite(token: string, password: string): Promise<Res> {
  if (!password || password.length < 8)
    return { ok: false, error: "Mot de passe : 8 caractères minimum." };
  if (await isPasswordPwned(password))
    return { ok: false, error: "Ce mot de passe figure dans une fuite connue — choisissez-en un autre." };

  const user = await prisma.user.findUnique({
    where: { inviteToken: token },
    select: { id: true, inviteTokenExpiry: true },
  });
  if (!user || inviteTokenExpired(user.inviteTokenExpiry))
    return { ok: false, error: "Lien invalide ou expiré. Demandez un nouvel accès à votre organisme." };

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, isActive: true, inviteToken: null, inviteTokenExpiry: null },
  });
  return { ok: true };
}
```

- [ ] **Step 2: Exclure la route du middleware** — dans `src/middleware.ts`, ajouter `definir-mot-de-passe` à la liste des segments publics exclus du `matcher` (à côté de `portail`, `signer`, `login`…). Suivre la forme exacte du matcher existant.

- [ ] **Step 3: Formulaire client** — `src/app/definir-mot-de-passe/[token]/set-password-form.tsx` :

```tsx
"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setPasswordFromInvite } from "@/lib/actions/entreprise-account-actions";

export function SetPasswordForm({ token }: { token: string }) {
  const [pw, setPw] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await setPasswordFromInvite(token, pw);
          if (r.ok) { toast.success("Mot de passe défini. Vous pouvez vous connecter."); router.push("/login"); }
          else toast.error(r.error ?? "Erreur");
        });
      }}
    >
      <Input type="password" minLength={8} required placeholder="Nouveau mot de passe (8+ caractères)" value={pw} onChange={(e) => setPw(e.target.value)} />
      <Button type="submit" disabled={pending} className="w-full">Valider</Button>
    </form>
  );
}
```

- [ ] **Step 4: Page serveur** — `src/app/definir-mot-de-passe/[token]/page.tsx` (vérifie la validité du lien avant d'afficher le formulaire) :

```tsx
import { prisma } from "@/lib/prisma";
import { inviteTokenExpired } from "@/lib/entreprise-invite";
import { SetPasswordForm } from "./set-password-form";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const user = await prisma.user.findUnique({ where: { inviteToken: token }, select: { inviteTokenExpiry: true } });
  const valide = !!user && !inviteTokenExpired(user.inviteTokenExpiry);
  return (
    <div className="grid min-h-screen place-items-center bg-muted/40 p-6">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-sm">
        <h1 className="mb-4 text-center text-xl font-bold">Définir mon mot de passe</h1>
        {valide ? <SetPasswordForm token={token} /> : (
          <p className="text-center text-sm text-muted-foreground">Lien invalide ou expiré. Contactez votre organisme de formation pour un nouvel accès.</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Vérifier build + types**

Run: `node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit` (exit 0).
*(Si `Input`/`Button` ont un chemin d'import différent, aligner sur un formulaire existant, ex. `src/components/account/two-factor-settings.tsx`.)*

- [ ] **Step 6: Commit**

```bash
git add src/lib/actions/entreprise-account-actions.ts src/app/definir-mot-de-passe src/middleware.ts
git commit -m "feat(b2b): page publique de definition du mot de passe (invitation)"
```

---

### Task 6: Garde d'isolation `getCurrentEntreprise()` + coquille `/espace-entreprise`

**Files:**
- Modify: `src/lib/entreprise-portal.ts` (ajout `getCurrentEntreprise`)
- Create: `src/app/(app)/espace-entreprise/layout.tsx`
- Create: `src/app/(app)/espace-entreprise/page.tsx`

**Interfaces:**
- Consumes: `auth` (`@/auth`), `getTenantDb` (`@/lib/tenant`).
- Produces: `getCurrentEntreprise(): Promise<{ id: string; raisonSociale: string } | null>` — l'entreprise du user connecté, sinon null. **Toutes les requêtes des rubriques (Plan 1b) filtreront via cette garde.**

- [ ] **Step 1: Ajouter la garde** dans `src/lib/entreprise-portal.ts` (le helper pur reste en tête ; on ajoute la partie serveur en dessous, avec `import "server-only"`). Calquée sur `getCurrentApprenant` (`src/lib/candidat-portal.ts`) :

```ts
import "server-only";
import { auth } from "@/auth";
import { getTenantDb } from "@/lib/tenant";

/**
 * Entreprise du user connecté (portail client). NULL si le compte n'est pas
 * rattaché à une entreprise. Le client BD est cloisonné par organisme ; on
 * filtre en plus par `userId` → un client ne voit QUE sa propre entreprise.
 */
export async function getCurrentEntreprise() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const db = await getTenantDb();
  return db.entreprise.findUnique({
    where: { userId: session.user.id },
    select: { id: true, raisonSociale: true },
  });
}
```

*(Note : `import "server-only"` en tête du bloc serveur n'empêche pas le helper pur `isEntrepriseAllowedPath` d'être importé par le middleware — vérifier au build que le middleware n'importe QUE le helper pur ; si un souci edge apparaît, déplacer le helper pur dans `src/lib/entreprise-routes.ts` et l'importer des deux côtés.)*

- [ ] **Step 2: Coquille (layout)** — `src/app/(app)/espace-entreprise/layout.tsx`. Redirige tout non-ENTREPRISE / non-rattaché (défense en profondeur, en plus du middleware) :

```tsx
import { redirect } from "next/navigation";
import { getCurrentEntreprise } from "@/lib/entreprise-portal";

export const dynamic = "force-dynamic";

export default async function EspaceEntrepriseLayout({ children }: { children: React.ReactNode }) {
  const entreprise = await getCurrentEntreprise();
  if (!entreprise) redirect("/login");
  return (
    <div className="mx-auto max-w-5xl p-6">
      <header className="mb-6 border-b pb-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Espace client</p>
        <h1 className="text-xl font-bold">{entreprise.raisonSociale}</h1>
      </header>
      {children}
    </div>
  );
}
```

- [ ] **Step 3: Page d'accueil** — `src/app/(app)/espace-entreprise/page.tsx` (placeholder de navigation vers les futures rubriques — Plan 1b) :

```tsx
import Link from "next/link";

const RUBRIQUES = [
  { href: "/espace-entreprise/formation", label: "Formations (planning)" },
  { href: "/espace-entreprise/inscriptions", label: "Inscriptions" },
  { href: "/espace-entreprise/suivi", label: "Suivi pédagogique" },
  { href: "/espace-entreprise/documents", label: "Documents" },
  { href: "/espace-entreprise/factures", label: "Factures" },
];

export default function EspaceEntrepriseHome() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {RUBRIQUES.map((r) => (
        <Link key={r.href} href={r.href} className="rounded-xl border bg-card p-4 hover:border-primary">
          {r.label}
        </Link>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Vérifier build + types**

Run: `node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit` (exit 0), puis `node node_modules/next/dist/bin/next build` (build OK, la route `/espace-entreprise` apparaît).

- [ ] **Step 5: Commit**

```bash
git add src/lib/entreprise-portal.ts "src/app/(app)/espace-entreprise"
git commit -m "feat(b2b): garde getCurrentEntreprise + coquille /espace-entreprise"
```

---

### Task 7: Bouton « Créer l'accès » sur la fiche client-pro (staff)

**Files:**
- Modify: `src/app/(app)/clients-pro/[id]/page.tsx` (ajout d'un bouton) et/ou un petit composant client `src/components/clients-pro/create-access-button.tsx`

**Interfaces:**
- Consumes: `createEntrepriseAccount` (Task 4).

- [ ] **Step 1: Composant bouton** — `src/components/clients-pro/create-access-button.tsx` :

```tsx
"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createEntrepriseAccount } from "@/lib/actions/entreprise-account-actions";

export function CreateAccessButton({ entrepriseId, hasAccess }: { entrepriseId: string; hasAccess: boolean }) {
  const [pending, start] = useTransition();
  if (hasAccess) return <span className="text-xs text-emerald-600">Accès client actif</span>;
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() => start(async () => {
        const r = await createEntrepriseAccount(entrepriseId);
        toast[r.ok ? "success" : "error"](r.ok ? "Invitation envoyée au client." : (r.error ?? "Erreur"));
      })}
    >
      Créer l'accès client
    </Button>
  );
}
```

- [ ] **Step 2: Brancher sur la fiche** — dans `src/app/(app)/clients-pro/[id]/page.tsx`, sélectionner `userId` de l'entreprise dans la requête et afficher `<CreateAccessButton entrepriseId={ent.id} hasAccess={!!ent.userId} />` dans l'entête de la fiche.

- [ ] **Step 3: Vérifier build + types**

Run: `node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit` (exit 0).

- [ ] **Step 4: Commit**

```bash
git add src/components/clients-pro/create-access-button.tsx "src/app/(app)/clients-pro/[id]/page.tsx"
git commit -m "feat(b2b): bouton staff 'creer l'acces client' sur la fiche client-pro"
```

---

## Self-Review

- **Couverture spec (§4.1 auth)** : rôle ENTREPRISE (T1), lien userId (T1), createEntrepriseAccount + invite (T4), session — *non requise dans le JWT* : `getCurrentEntreprise` relit par `userId` comme `getCurrentApprenant` (pas de `candidatId` en JWT) → on ne modifie donc PAS `next-auth.d.ts`, simplification assumée vs spec. Confinement (T2), `getCurrentEntreprise` (T6). ✅
- **Isolation** : garde `getCurrentEntreprise` + confinement middleware + layout redirect. La preuve d'isolation cross-entreprise (test d'intégration BD) est **hors périmètre de 1a** (aucune rubrique ne lit encore de données) → elle sera écrite en **Plan 1b** avec la première rubrique qui lit des données, en suivant la suite `SECURITY_TESTS/`.
- **Hors périmètre 1a** (→ Plan 1b) : les 5 rubriques, `Facture.fileUrl`, `DemandeInscription` (→ Phase 2).
- **Placeholders** : aucun TODO/vague ; chemins d'import à confirmer signalés explicitement (email-templates, ui/Input) avec le fichier de référence.
- **Cohérence des types** : `createEntrepriseAccount`/`setPasswordFromInvite` renvoient `Res = {ok, error?}` ; `getCurrentEntreprise` renvoie `{id, raisonSociale} | null` ; `isEntrepriseAllowedPath(string): boolean` — noms constants entre tâches.

*Prochain plan : 1b — les 5 rubriques (Formation, Inscriptions, Suivi pédagogique, Documents, Factures) + le premier test d'isolation cross-entreprise.*
