# 07 — Expert sécurité / RGPD

> Fiche d'audit (Livrable 2). Constats sourcés. **Aucune correction appliquée.**

## Expert sécurité / RGPD

### 1. Périmètre analysé
- AuthN/Z : [src/auth.ts](../src/auth.ts), [src/auth.config.ts](../src/auth.config.ts), [src/middleware.ts](../src/middleware.ts), gardes `permissions.ts`/`section-guard.ts`.
- Isolation : [src/lib/tenant.ts](../src/lib/tenant.ts). Anti-abus : [src/lib/rate-limit.ts](../src/lib/rate-limit.ts).
- Secrets : [src/lib/crypto.ts](../src/lib/crypto.ts). En-têtes/CSP : [next.config.ts](../next.config.ts).
- Upload/fichiers : [src/lib/blob.ts](../src/lib/blob.ts). RGPD : [src/lib/rgpd-retention.ts](../src/lib/rgpd-retention.ts), modèles `Consentement`, `DataRequest`.

### 2. Constats — sécurité applicative & conformité RGPD

| ID | Description | Fichier:ligne | Sévérité | Impact |
|----|-------------|---------------|----------|--------|
| SEC-01 | **Pièces personnelles sensibles sur URLs Blob publiques.** `storeUpload` écrit en `access: "public"` ; les pièces du dossier candidat (CNI, diplômes, RIB…) sont accessibles via une URL non authentifiée (devinabilité faible mais **pas de contrôle d'accès**). | [blob.ts:17-23](../src/lib/blob.ts) | **Critique** | Fuite de données personnelles/sensibles via URL ; violation RGPD (confidentialité) si une URL fuite. |
| SEC-02 | **Crons d'anonymisation/e-mails non authentifiés si `CRON_SECRET` absent** (cf. OPS-01) + secret en query string (OPS-02). | [api/cron/parcours/route.ts:9-17](../src/app/api/cron/parcours/route.ts) | **Critique** | Déclenchement public d'effets destructifs/diffusion. |
| SEC-03 | **Isolation tenant uniquement applicative** (`organismeId` nullable, pas de RLS). Tout chemin oubliant `scopedPrisma` lit/écrit cross-OF. À vérifier exhaustivement (audit des usages du client `prisma` brut hors auth/console). | [tenant.ts:43](../src/lib/tenant.ts), [schema.prisma:421](../prisma/schema.prisma) | **Critique** (à confirmer) | Fuite inter-organismes = incident RGPD majeur. |
| SEC-04 | **Chiffrement des secrets tenant optionnel** : sans `SECRETS_ENCRYPTION_KEY`, clés Brevo/Anthropic/Yousign **en clair** en base. | [crypto.ts:13-24](../src/lib/crypto.ts) | Majeure | Compromission de secrets tiers en cas d'accès base. |
| SEC-05 | **CSP avec `'unsafe-inline'` (scripts & styles).** Choix documenté (bootstrap Next + styles charte), mais affaiblit la protection XSS : une injection HTML pourrait exécuter du JS inline. | [next.config.ts:9-13](../next.config.ts) | Majeure | Surface XSS résiduelle ; à compenser par un échappement strict + nonces à terme. |
| SEC-06 | **Rate-limit en mémoire par instance** si Upstash non configuré : en serverless multi-instances, la limite est contournable (chaque instance a son compteur). | [rate-limit.ts:14-33,50-53](../src/lib/rate-limit.ts) | Majeure | Brute-force/credential-stuffing partiellement efficace sans Redis. |
| SEC-07 | **Registre des traitements & sous-traitants non outillés.** Sous-traitants (Brevo, Stripe, Anthropic, Yousign, Vercel/OVH, Neon) → DPA + registre RGPD requis ; pas de modèle/trace dans l'app. Droits (accès/suppression) partiellement outillés (`DataRequest`, anonymisation), mais pas d'**export** des données d'une personne. | `schema.prisma` (absence registre), `rgpd-actions` | Majeure | Non-conformité documentaire RGPD (art. 30, droits art. 15/17/20). |

### 3. Corrections proposées
- **SEC-01** : servir les pièces **uniquement via le proxy authentifié** (`/api/public/piece/[id]` déjà esquissé) en stockant les blobs en accès **privé** (token de lecture court) ou hors Blob public ; ne jamais exposer l'URL brute.
- **SEC-02** : `CRON_SECRET` obligatoire + en-tête Bearer seul (cf. OPS-01/02).
- **SEC-03** : audit exhaustif des accès `prisma` brut sur modèles tenant + test d'isolation en CI (QA-01) ; viser RLS (ARC-01/DB-03).
- **SEC-04** : rendre la clé de chiffrement obligatoire en prod ; re-chiffrer l'existant.
- **SEC-05** : feuille de route CSP à base de **nonces** (supprimer `'unsafe-inline'` scripts) ; échappement strict des contenus riches (HTML des leçons, modèles de documents).
- **SEC-07** : ajouter un **registre des traitements** + suivi des DPA sous-traitants ; implémenter l'**export RGPD** (portabilité) en plus de la suppression.

### 4. AVIS DU SPÉCIALISTE
**Niveau de sécurité au-dessus de la moyenne, mais 3 points critiques à fermer avant d'exploiter de vraies données d'apprenants.** Beaucoup de bonnes pratiques sont en place : anti-brute-force, anti-énumération au login, magic-bytes + rejet SVG sur l'upload, en-têtes de sécurité complets + HSTS, chiffrement AES-256-GCM des secrets, anonymisation RGPD propre avec garde-fou « dossier vivant », `AuditLog`. Les **trois rouges** sont : **pièces sensibles sur URL publique** (SEC-01), **crons non authentifiables par défaut** (SEC-02) et **isolation purement applicative** (SEC-03, à confirmer exhaustivement). S'y ajoutent le chiffrement optionnel (SEC-04) et la conformité documentaire RGPD (SEC-07 : registre, sous-traitance, droit à la portabilité). **Verdict : sécurité sérieuse mais non encore « production données réelles »** tant que SEC-01/02/03 ne sont pas traités.

### 5. AMÉLIORATIONS À AJOUTER
1. **RLS PostgreSQL** + `organismeId` NOT NULL (défense en profondeur).
2. **CSP à nonces** et suppression progressive de `'unsafe-inline'`.
3. **Coffre à secrets** + rotation ; clé de chiffrement obligatoire.
4. **Module conformité RGPD** : registre des traitements, suivi DPA, export de portabilité, journal des consentements consolidé.
5. **2FA** pour les comptes ADMIN/SUPERADMIN (TOTP).
