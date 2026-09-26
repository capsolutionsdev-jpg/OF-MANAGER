# OFManager — Mapping OWASP (Phase 38)

> Cible : prod `7a198cd`. Légende : **PASS** / **PARTIAL** / **FAIL** / **N/A** / **NOT TESTED**.
> `NOT TESTED` n'est jamais compté comme `PASS`.

## OWASP Top 10:2021

| # | Catégorie | Verdict | Findings liés / justification |
|---|---|---|---|
| A01 | Broken Access Control | **PARTIAL** | Isolation cross-tenant **saine** (`scopedPrisma`), console SUPERADMIN re-gardée. MAIS motif racine **BFLA** : rôle `ENTREPRISE` non rejeté par plusieurs gardes (OFM-01, 04–10). `assertLiveSession()` contournable sur certaines actions (OFM-11). |
| A02 | Cryptographic Failures | **PARTIAL** | bcrypt, TOTP chiffré AES-256-GCM, secrets tenant chiffrés = OK. **Token d'invitation entreprise en clair** en base (OFM-19). PII sur Blob public (URL-secret, OFM-21). |
| A03 | Injection | **PARTIAL** | **Pas de SQLi** (ORM paramétré). **XSS stockée `photoUrl`** (OFM-03, blocker). **Injection de formule CSV/FEC** (OFM-14, +INFO). XSS signatures PDF (OFM-13). |
| A04 | Insecure Design | **PARTIAL** | Idempotence paiement heuristique (10 s), quota sièges TOCTOU (OFM-24, +INFO), idempotence provisioning civique (OFM-16). |
| A05 | Security Misconfiguration | **PARTIAL** | En-têtes solides. **CORS wildcard** API civique (INFO), **Cache-Control** manquant sur PDF privés (OFM-22), **stack trace** en prod (OFM-12). |
| A06 | Vulnerable & Outdated Components | **PARTIAL→FAIL** | **`next@16.3.1`** porte un advisory **critique** (AVIF/Windows RCE, corrigé 16.3.3) — atténué en prod Vercel mais bump requis (OFM-02). Transitifs (axios, image-size, sharp) essentiellement hors chemin requête. |
| A07 | Identification & Auth Failures | **PASS*** | Rate-limit e-mail+IP, 2FA TOTP, anti-énumération, révocation de session. Réserve : token invitation clair (OFM-19). |
| A08 | Software & Data Integrity | **PARTIAL** | Stripe signé. **Webhook Wedof sans anti-rejeu** (INFO), idempotence métier partielle (OFM-16). |
| A09 | Security Logging & Monitoring | **PARTIAL** | Sentry + AuditLog présents. **Exports de masse PII non tracés** (OFM-15), lecture SUPERADMIN cross-tenant non tracée (INFO). |
| A10 | SSRF | **PARTIAL** | **SSRF PDF latent** : Chromium rend le HTML sans filtrage d'egress (OFM-20) — non exploitable en l'état (pas de source d'URL attaquant confirmée). |

## OWASP API Security Top 10:2023

| # | Catégorie | Verdict | Justification |
|---|---|---|---|
| API1 | Broken Object Level Auth (BOLA) | **PASS*** | Route handlers scopés/vérifiés. Réserve : Blob PII public (OFM-21), `piece/logo/[id]` publics (INFO). |
| API2 | Broken Authentication | **PASS** | cf. A07. |
| API3 | Broken Object Property Level Auth | **PARTIAL** | `organismeId` non écrasable (scopedPrisma) ; mais `entrepriseId` de devis non vérifié (OFM-18). |
| API4 | Unrestricted Resource Consumption | **PARTIAL** | Rate-limit login/IA. `civique/candidates/[id]/state` écriture non bornée (OFM-23), image-size DoS (OFM-25). |
| API5 | Broken Function Level Auth (BFLA) | **FAIL** | **Motif racine de l'audit** : `ENTREPRISE`/non-staff peuvent invoquer des actions de gestion (OFM-01, 04–10, 17). |
| API6 | Unrestricted Access to Sensitive Business Flows | **PARTIAL** | submitParcoursForm sans idempotence (OFM-26), liens tokenisés sans revérif d'expiration en écriture (OFM-27). |
| API7 | SSRF | **PARTIAL** | cf. A10 (OFM-20). |
| API8 | Security Misconfiguration | **PARTIAL** | CORS `*` civique, stack trace, cache. |
| API9 | Improper Inventory Management | **PASS*** | Endpoints recensés ; `pdf-test` de debug exposé (à retirer). |
| API10 | Unsafe Consumption of APIs | **PARTIAL** | Wedof/Brevo : secret en query (OFM-20-brevo), anti-rejeu absent. |

## OWASP ASVS 5.0 (chapitres clés)

| Chapitre | Verdict | Note |
|---|---|---|
| V1 Encoding & Injection | **PARTIAL** | XSS `photoUrl`/signatures, CSV formula. SQL OK. |
| V2 Validation / Business Logic | **PARTIAL** | Zod large ; idempotence/TOCTOU à durcir. |
| V3 Web Frontend (CSP, headers) | **PARTIAL** | CSP `unsafe-inline` (nonce OFF) ; sinon solide. |
| V6 Authentication | **PASS** | bcrypt, 2FA, anti-brute-force. |
| V7 Session Management | **PARTIAL** | Révocation OK mais contournable sur actions à garde inline (OFM-11). |
| V8 Authorization | **FAIL** | BFLA (motif racine ENTREPRISE). |
| V9 Self-contained Tokens (JWT) | **PASS** | JWT signé, pas de données secrètes exposées. |
| V11 Cryptography | **PARTIAL** | AES-GCM OK ; token invitation clair. |
| V12 Secure Communication | **PASS** | HSTS preload, TLS. |
| V14 Data Protection / Privacy | **PARTIAL** | Effacement RGPD incomplet (EmailLog/SmsLog), Blob public. |
| V15 Files & Resources | **PARTIAL** | Upload durci (magic bytes, SVG refusé) ; download Blob public. |
| V16 Logging | **PARTIAL** | Exports masse non tracés. |
