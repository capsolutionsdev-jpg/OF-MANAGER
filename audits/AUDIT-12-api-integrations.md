# COMPTE RENDU D'AUDIT 12 — Audit API & intégrations
## OFMANAGER — Programme d'audit de pré-commercialisation

**Date :** 2026-09-11
**Version auditée :** `fix/a11y-remediation` @ `5dd1008d1d1c68972c85c921a3319f5d66e38a1e`
**Chef de projet audit :** Claude Code (chef de projet senior)
**Équipe mobilisée :** Architecte API · Ingénieur intégrations tierces · Spécialiste webhooks & événements · Ingénieur qualité API · Analyste résilience & cohérence des données (5 sous-agents) + contre-vérification personnelle du chef de projet.
**Périmètre couvert :** 46 routes API + 101 server actions ; 4 webhooks entrants (Stripe, Resend, Brevo, Wedof) ; 7 crons ; ~15 intégrations sortantes (Stripe, Anthropic, OpenAI, Resend, Brevo, Wedof, Vercel Blob, Firebase, Upstash, Turnstile, HIBP, Sentry, PDP, YouSign). Cohérence des données OFMANAGER ↔ tiers.
**Durée / profondeur :** analyse statique exhaustive du code (lecture seule) + reproduction de la suite de tests (`vitest run`) + contre-vérification manuelle de tous les 🟠 sur `fichier:ligne`. **Non fait :** injection de panne dynamique contre les vrais fournisseurs (nécessite clés réelles + app lancée) — voir §5.

---

### 1. SYNTHÈSE EXÉCUTIVE

Les fondations sont **saines** : l'isolation multi-tenant est prouvée robuste par défaut (`scopedPrisma`), tous les webhooks sont authentifiés (signatures vérifiées avant traitement), les flux financiers Stripe sont idempotents, les 7 crons sont protégés (y compris les destructifs), et l'app dégrade proprement quand une clé tierce manque. **Aucun défaut bloquant actif (🔴) n'a été trouvé.**

En revanche, la **fiabilité opérationnelle** des intégrations n'est pas au niveau d'un produit facturé : hors un seul appel (HIBP), **aucun appel sortant n'a de timeout** ; il n'existe **aucune réconciliation** OFMANAGER ↔ Stripe/Wedof (un webhook perdu peut faire suspendre un client payant) ; le **code d'accès payé de la prépa civique peut être perdu en silence** si l'e-mail échoue ; et surtout **la suite de tests est ROUGE** (3 échecs) — dont le garde-fou d'isolation multi-tenant — ce qui bloque la CI et éteint un filet de sécurité clé. Enfin, un **🔴 est en sommeil** : dès qu'une plateforme de facturation électronique (PDP, obligation 2026) sera branchée, l'absence de garde anti-re-dépôt provoquera des doubles dépôts de factures légales.

| 🔴 Rouge | 🟠 Orange | 🟡 Jaune | 🟢 Vert |
|---|---|---|---|
| 0 | 16 | 18 | 15 |

**VERDICT : GO CONDITIONNEL**
Rien n'interdit techniquement le lancement (isolation, authentification et idempotence financière prouvées). Mais deux conditions sont **impératives avant le Go-Live** : (1) repasser la CI au vert (corriger les 3 tests / rétablir le garde-fou d'isolation) et (2) fiabiliser la remise du code d'accès civique payé. La vague J+30 (timeouts, réconciliation Stripe, robustesse checkout, ordre/journalisation Wedof, durcissement PDP avant activation, garde-fou d'envoi e-mail) doit être traitée avant de multiplier les clients payants.

---

### 2. TABLEAU DES ANOMALIES

| ID | Gravité | Titre | Composant | Preuve | Impact | Recommandation | Charge | Priorité |
|---|---|---|---|---|---|---|---|---|
| A12-001 | 🟠 | Suite de tests ROUGE (3 échecs) dont le garde-fou d'isolation | tests / CI | `prisma-direct-guard.test.ts:71,199` ; `publish-documents.test.ts:29` | CI bloquée ; garde-fou d'isolation inopérant ; 1 régression d'idempotence | Compléter l'allowlist (justifiée) + corriger `publierDocument` ; CI verte | M | P0 |
| A12-002 | 🟠 | Timeouts absents sur les appels sortants (systémique) | `email.ts`, `wedof.ts`, `sms.ts`, `image-gen.ts`, `rate-limit.ts`, `verification/route.ts` | grep `AbortSignal\|timeout` → HIBP seul | Fonction serverless qui traîne sur un tiers suspendu ; `checkLimit` en tête d'endpoints publics = point le plus exposé | `AbortSignal.timeout()` partout + abaisser timeout SDK Anthropic | M | P1 |
| A12-003 | 🟠 | Code d'accès civique perdu en silence si l'e-mail échoue | `civique-api.ts:531-566` | claim `emailSentAt` avant envoi ; retour `sendEmail` ignoré | Client **payant** sans code d'accès, jamais re-tenté (récupérable via page succès/support) | Poser `emailSentAt` seulement après `sent===true` + bouton « renvoyer » | S | P0 |
| A12-004 | 🟠 | Checkout Stripe sans try/catch + CGV écrite avant l'appel + customer orphelin | `billing-actions.ts:70-127` | CGV `:70-73`, `customers.create :94`, `sessions.create :107` sans catch | 500 générique ; acceptation CGV « fantôme » sans abonnement ; doublon customer au retry | try/catch dédié ; écrire CGV après succès ; lookup customer avant create | M | P1 |
| A12-005 | 🟠 | Aucune réconciliation Stripe → suspend-trials peut suspendre un client payant | `cron/suspend-trials/route.ts:17-20` | `updateMany` sans consulter Stripe ; `trial.ts` : 0 réf. Stripe | Webhook perdu → OF resté ESSAI → **suspension d'un client qui a payé** | Cron de réconciliation `subscriptions.list` + alerte sur écart | M | P1 |
| A12-006 | 🟠 | Webhook Wedof : pas de garde d'ordre (écrasement) + aucune journalisation | `webhooks/wedof/[orgId]/route.ts:57-63` | `upsert update:fields` inconditionnel ; `wedofMajLe` stocké mais inutilisé ; pas de `reportError` | État/montant CPF régressé par un event en retard ; incident invisible | Garder si `wedofMajLe ≥` stocké + `reportError` + journal des events | S | P1 |
| A12-007 | 🟠 | PDP : référence non persistée + pas de garde anti-re-dépôt | `facture-editeur-actions.ts:183-203` ; `schema.prisma:270` | `reference` en `auditLog` seul ; pas de colonne `pdpReference` ; `adapter.configured` → inerte | Dormant (NoopPdpAdapter) **→ 🔴 dès activation PDP** : double dépôt d'une facture légale | Colonne `pdpReference @unique` + `$transaction` + garde `where statut=EMISE` + idempotency-key | M | P1 |
| A12-008 | 🟠 | E-mail/SMS : pas de garde-fou par environnement | `email.ts:144-154` ; `sms.ts` | garde `isDemoSender` uniquement, pas de `NODE_ENV`/`VERCEL_ENV` | Staging avec vraie clé + tenant non-démo → **vrais e-mails/SMS à de vrais destinataires** | Bloquer hors prod sauf `EMAIL_LIVE=1` explicite | S | P1 |
| A12-009 | 🟠 | Fichiers Blob orphelins sur échec partiel | `blob.ts:19-23` + appelants | `put()` puis DB après, aucun `del()` de compensation | Fichiers orphelins (coût + **résidu PII hors cycle RGPD**) | Helper `try{DB}catch{del(url)}` ou cron de balayage | M | P2 |
| A12-010 | 🟠 | `syncWedof` plafonné à 100 dossiers sans pagination | `financements-actions.ts:90` | `listRegistrationFolders(limit:100)` sans boucle | OF > 100 dossiers CPF : sync partielle **silencieuse** | Paginer jusqu'à épuisement + signaler si tronqué | S | P1 |
| A12-011 | 🟠 | `provisionDemo` : composite sans transaction ni idempotence | `demo/provision.ts:63-165` | 7 écritures sans `$transaction` ; garde d'unicité posée à l'étape 5 | Tenants démo partiels/dupliqués, comptes « morts » (mitigé par purge TTL) | `$transaction` org+user+seed + idempotence e-mail | M | P2 |
| A12-012 | 🟠 | Aucun test couvrant les intégrations tierces | `src/**` (tests) | 1/88 route testée ; `sms.test`/`yousign.test` triviaux ; 1 seul stub `fetch` | Flux monétaires/comms peuvent casser sans détection | Tests `fetch` mocké par connecteur + rejeu d'events Stripe signés | L | P1 |
| A12-013 | 🟠 | Validation d'entrée par schéma minoritaire (dette systémique) | routes + actions | zod : 2/18 routes mutantes, ~18/101 actions ; `validators/` sous-utilisé | Bugs de données silencieux, UX d'erreur inégale, surface de fuzzing | Convention « toute mutation valide via zod » ; cibler finance/inscription | L | P1 |
| A12-014 | 🟠 | Aucun versionnement d'API + pas de contrat `public/*` | `api/public/*` | 0 `api/v1` ; grep version → 0 ; sortie JSON à plat | Un renommage de champ casse **la vitrine ET l'app mobile Capacitor** déjà distribuée | Préfixe `v1` ou `X-API-Version` + schéma de sortie + règle « champ jamais retiré » | M | P1 |
| A12-015 | 🟠 | Deux stratégies d'isolation tenant (risque IDOR latent) | `app/api/**` | 28 routes `prisma` brut vs 5 `getTenantDb` ; `expression-besoin` check manuel | Pas de fuite active, mais une future route oublieuse exposerait un autre OF (🔴) | `getTenantDb()` par défaut ; lint interdisant `@/lib/prisma` hors allowlist | M | P1 |
| A12-016 | 🟠 | Échecs d'intégration (IA/e-mail/webhooks) non remontés à Sentry | `ai.ts:60-63`, `email.ts`, `webhooks/{brevo,resend}` | `console.error` seul (logs Vercel non conservés) | Pannes de canaux critiques invisibles en supervision | Router les catches vers `reportError({tag})` | S | P2 |
| **🟡 (18)** | 🟡 | *voir §détail ci-dessous* | — | — | Dette / irritants sans risque immédiat | — | S–M | P2/P3 |

**Détail 🟡 :** clés test/live non séparées (`stripe.ts`) · dunning Stripe non idempotent sur redelivery (`stripe/webhook/route.ts:139`) · `checkout.session.completed` traité sans `payment_status==="paid"` (`:70`) · `CRON_SECRET` comparé sans `timingSafeEqual` (`cron-auth.ts:11`) · secret Brevo en query string (`webhooks/brevo/route.ts:39`) · `push/register` réassigne un token sans vérifier le propriétaire (`:33`) · `suspend-trials` planifié 2× (`vercel.json`) · `civicMentions:{push}` non idempotent (`civique-api.ts:508`) · e-reporting d'encaissement jamais transmis (`pdp.ts:99`) · aucun message-id fournisseur stocké (`EmailLog`) · `db-retry` latent sur write non idempotent (`db-retry.ts:45`) · aucun identifiant de corrélation bout-en-bout · forme de réponse API non uniforme (27 réponses texte brut) · pagination quasi absente (3/101 actions) · double appel `auth()` dans des actions · couverture de tests non mesurée (pas de `@vitest/coverage`) · tests smoke `.tsx` exclus de la CI · doc « par intégration » absente · `pdf-test/route.ts` présent en prod (à gater/retirer — croiser audit 01).

---

### 3. FICHES DÉTAILLÉES (toutes les 🔴 et 🟠)

> Aucune 🔴 active. Les 16 fiches 🟠 suivent.

#### A12-001 — Suite de tests ROUGE (3 échecs) dont le garde-fou d'isolation multi-tenant — 🟠
- **Constat :** la commande `vitest run` échoue sur 3 tests, dont deux du garde-fou d'isolation tenant et une régression d'idempotence.
- **Preuve :** reproduit — `npx vitest run src/lib/__tests__/prisma-direct-guard.test.ts src/lib/__tests__/publish-documents.test.ts` → `Tests 3 failed | 7 passed`. Offenders bloc actions (`prisma-direct-guard.test.ts:199`) : `["audit-controle-actions.ts","pieces-organisme-actions.ts"]` ; bloc pages (`:71`) : `audit/organisme/page.tsx` ; idempotence (`publish-documents.test.ts:29`) : `publierDocument` régénère un document déjà publié (`expect(true)`→`false`).
- **Scénario d'impact :** la CI (`.github/workflows/ci.yml:62-65`, `npm test` sans `continue-on-error`) échoue le job `checks` → la branche ne peut pas fusionner proprement. Surtout, **le garde-fou d'isolation est rouge** : tant qu'il l'est, un futur accès `@/lib/prisma` réellement dangereux (fuite inter-organismes) passera inaperçu dans le bruit.
- **Cause racine :** deux fichiers d'actions utilisent `@/lib/prisma` de façon **légitime** (vérifié — voir A12-015) mais n'ont pas été ajoutés à l'`ACTIONS_ALLOWLIST` ; `publierDocument` a perdu son court-circuit d'idempotence.
- **Recommandation :** compléter l'allowlist avec justification (les 2 fichiers respectent « vérifier-puis-muter »/self-scopé) **après** avoir confirmé leur innocuité ; corriger l'idempotence de `publierDocument` (ne pas régénérer si `documentGenere` existe). But : `vitest run` vert.
- **Charge :** M — **Priorité :** P0 — **Type :** Standard
- **Vérification de la correction :** `npx vitest run` = 0 échec ; CI verte sur la branche.

#### A12-002 — Timeouts absents sur les appels sortants (systémique) — 🟠
- **Constat :** hors HIBP, aucun appel réseau sortant n'a de délai d'attente.
- **Preuve :** un grep `AbortSignal|AbortController|signal:|timeout` sur `src/` ne renvoie qu'un seul appel borné (`security/password.ts:21`, 3 s). Sans timeout : `email.ts:99,181`, `wedof.ts:35`, `sms.ts:125`, `image-gen.ts:51`, Turnstile `verification/route.ts:66`, et `rate-limit.ts:83` (`await r.incr()` Upstash). SDK Anthropic laissé au défaut 10 min (`ai.ts:48`).
- **Scénario d'impact :** un tiers qui **accepte la connexion mais ne répond plus** (socket suspendu) fait traîner la fonction serverless jusqu'à la limite Vercel — un `try/catch` ne capte **pas** un hang, seulement un rejet (vérifié : `checkLimit` retombe en mémoire sur *erreur* Redis, pas sur un hang). Cas le plus exposé : `checkLimit` est `await`é en tête des endpoints publics (`verification`, `civique/*`, `lead`, `demo`) → un hang Upstash gèle ces endpoints.
- **Cause racine :** `fetch` natif sans `signal` ; options de timeout des SDK non fixées.
- **Recommandation :** `AbortSignal.timeout(8_000-10_000)` sur tous les `fetch` (3-5 s pour Upstash) ; `new Anthropic({ timeout: 30_000, maxRetries: 1 })` ; fixer `maxDuration` sur les routes concernées. Généraliser le modèle HIBP.
- **Charge :** M — **Priorité :** P1 — **Type :** Standard
- **Vérification :** chaque connecteur possède un timeout ; test simulant un fournisseur lent (serveur qui dort) → l'appel se coupe au seuil.

#### A12-003 — Code d'accès civique perdu en silence si l'e-mail échoue — 🟠
- **Constat :** le marqueur d'envoi de l'e-mail « code d'accès » est posé **avant** l'envoi, et l'échec d'envoi est avalé.
- **Preuve :** `civique-api.ts:531-534` — `updateMany({ id, emailSentAt: null } → emailSentAt: now)` (claim atomique) ; puis `:561-566` `sendEmail(...)` **dont la valeur de retour n'est pas testée**. Or `sendEmail` ne lève jamais : `email.ts:119,123` (Resend) et `:190,192` (Brevo) renvoient `{ sent: false }`.
- **Scénario d'impact :** paiement encaissé + compte provisionné, mais si Resend/Brevo refuse (domaine non vérifié, 5xx), l'e-mail contenant le code n'est jamais envoyé et `emailSentAt` est marqué « envoyé » → **jamais re-tenté**. Le candidat n'a que le token affiché une fois sur la page de succès. Récupérable via support (token en base) mais mauvaise première impression sur un produit payant.
- **Cause racine :** claim avant confirmation + retour ignoré. La bonne recette existe pourtant dans le dépôt (`audit-controle-actions.ts:340` écrit `EmailStatut.EN_ATTENTE` si `!sent.sent`).
- **Recommandation :** ne poser `emailSentAt` qu'après `sent === true` ; sinon laisser `null` (re-tentable) + journaliser `EmailLog EN_ATTENTE` ; ajouter un bouton « renvoyer mon code ».
- **Charge :** S — **Priorité :** P0 — **Type :** Quick win
- **Vérification :** test avec `sendEmail` renvoyant `{sent:false}` → `emailSentAt` reste `null` et un renvoi est possible.

#### A12-004 — Checkout Stripe : appels sans try/catch + CGV écrite avant l'appel + customer orphelin — 🟠
- **Constat :** l'acceptation CGV est persistée avant les appels Stripe, eux-mêmes non protégés.
- **Preuve :** `billing-actions.ts:69-73` écrit `cgvAcceptedAt`/`confidentialiteAcceptedAt` ; puis `stripe.customers.create` (`:94`), `frTvaTaxRateId` (`:106`), `stripe.checkout.sessions.create` (`:107`) **sans try/catch**. Même schéma public : `api/civique/checkout/route.ts`.
- **Scénario d'impact :** sur échec Stripe → erreur générique 500 ; acceptation CGV « fantôme » enregistrée sans abonnement ; si `:100` (persistance `stripeCustomerId`) échoue après `:94`, un customer Stripe orphelin est créé, et le prochain essai en crée un second (`if (!customerId)`).
- **Cause racine :** ordonnancement des écritures + absence de gestion d'erreur autour du tiers. (Le SDK Stripe borne mieux que `fetch` : 80 s + 2 retries.)
- **Recommandation :** try/catch dédié (message clair) ; écrire l'acceptation CGV **après** succès du checkout (ou la rendre idempotente) ; `customers.search({ metadata.organismeId })` avant `create`. Cohérence transactionnelle → croiser audit 13 (paiement métier).
- **Charge :** M — **Priorité :** P1 — **Type :** Standard
- **Vérification :** simuler un échec `sessions.create` → aucune CGV persistée, aucun customer orphelin, message utilisateur explicite.

#### A12-005 — Aucune réconciliation OFMANAGER ↔ Stripe : suspend-trials peut suspendre un client payant — 🟠
- **Constat :** aucun mécanisme ne rapproche l'état local de l'abonnement Stripe.
- **Preuve :** `cron/suspend-trials/route.ts:17-20` — `updateMany({ statut: "ESSAI", createdAt < cutoff } → "SUSPENDU")` **sans consulter Stripe** ; `grep stripe|subscription` sur `lib/trial.ts` → 0 résultat. Aucun des 7 crons ne re-fetch `subscriptions.list` (`mrr-snapshot` calcule depuis la base locale).
- **Scénario d'impact :** si le webhook Stripe qui bascule ESSAI→ACTIF est définitivement perdu (endpoint KO, event non géré), l'OF reste ESSAI ; passé la période d'essai, **suspend-trials suspend un client qui a payé**. Aucun filet ne détecte l'écart. Idem Wedof si une notification est manquée.
- **Cause racine :** dépendance exclusive au flux webhook, sans réconciliation périodique.
- **Recommandation :** cron de réconciliation (par `stripeCustomerId` : `subscriptions.list`, compare statut/période, corrige + alerte) ; endpoint de re-sync Wedof paginé. Croiser audits 05 et 22.
- **Charge :** M — **Priorité :** P1 — **Type :** Standard
- **Vérification :** simuler un OF ESSAI expiré avec un abonnement Stripe actif → le cron le réactive au lieu de le suspendre.

#### A12-006 — Webhook Wedof : pas de garde d'ordre (écrasement) + aucune journalisation sur un flux financier — 🟠
- **Constat :** un événement Wedof plus ancien reçu après un plus récent régresse l'état du dossier ; aucun log/report d'erreur.
- **Preuve :** `webhooks/wedof/[orgId]/route.ts:59-63` — `upsert` avec `update: fields` **inconditionnel**. `wedofMajLe` est stocké (`:57`) mais **jamais utilisé comme garde**. Le handler n'a ni `try/catch` ni `reportError` (contrairement à Stripe/crons).
- **Scénario d'impact :** Wedof pouvant redélivrer/désordonner ses notifications, un event en retard fait régresser `etat`/`montant` (ex. `SOLDE`→`EN_COURS`) → suivi de facturation CPF faussé. Un échec (DB indisponible) renvoie une 500 non tracée : Wedof retente, mais l'incident est invisible (pas de journal des events reçus, pas de rejeu applicatif).
- **Cause racine :** upsert « dernier écrit gagne » sans horodatage source ; pas d'observabilité.
- **Recommandation :** ne mettre à jour que si `wedofMajLe ≥` valeur stockée ; `reportError({tag:"wedof:webhook"})` + journal minimal des notifications (rejeu/preuve).
- **Charge :** S — **Priorité :** P1 — **Type :** Quick win
- **Vérification :** rejouer 2 events dans le désordre → l'état final = le plus récent ; un échec DB apparaît dans Sentry.
- *Point fort associé (🟢) : l'authentification Wedof (HMAC-SHA512 `timingSafeEqual`, secret par tenant, écriture scellée à l'`orgId` du chemin) est robuste — pas d'usurpation cross-tenant.*

#### A12-007 — PDP : référence de dépôt non persistée + pas de garde anti-re-dépôt — 🟠 (→ 🔴 dès activation d'une PDP)
- **Constat :** la transmission d'une facture éditeur à la plateforme de facturation électronique ne stocke pas la référence retournée et n'a pas de garde d'idempotence.
- **Preuve :** `facture-editeur-actions.ts:183-203` — après `adapter.transmit()`, passage `DEPOSEE` par un `update` **séparé**, puis `auditLog`. La `reference` PDP n'est écrite **que** dans `auditLog.changesJson` (`:201`). `grep pdp` sur `prisma/schema.prisma` → seulement `pdpTransmisAt` (`:270`), **aucune colonne `pdpReference`**. Aucune garde « déjà transmis ». Adaptateur par défaut `NoopPdpAdapter` (`adapter.configured` faux `:175`) → **inerte aujourd'hui**.
- **Scénario d'impact :** dormant tant qu'aucune PDP n'est configurée. **Dès activation** (obligation légale 2026, déjà anticipée dans le code) : si l'`update DEPOSEE` échoue après un dépôt réussi, la facture reste `EMISE` → une re-transmission = **2ᵉ dépôt de la même facture légale**, impossible à rapprocher (référence noyée dans les logs).
- **Cause racine :** opération composite sans transaction ni identifiant externe persisté.
- **Recommandation :** colonne `pdpReference String? @unique` ; statut + référence dans **un** `$transaction` ; garde `where { statut: EMISE }` ; idempotency-key envoyée à la PDP. **À traiter avant tout branchement PDP** (sinon P0/🔴).
- **Charge :** M — **Priorité :** P1 (P0 conditionnel à l'activation PDP) — **Type :** Standard
- **Vérification :** simuler un échec de l'`update` post-transmit → pas de re-dépôt possible ; `pdpReference` persistée et unique.

#### A12-008 — E-mail/SMS : pas de garde-fou par environnement contre les envois réels en non-prod — 🟠
- **Constat :** l'envoi n'est inhibé que pour un tenant de démo, pas selon l'environnement.
- **Preuve :** `email.ts:144-154` — `if (await isDemoSender(...)) return { sent: true }` puis envoi dès que `RESEND_API_KEY` existe. Aucune condition sur `NODE_ENV`/`VERCEL_ENV`. Idem `sms.ts`.
- **Scénario d'impact :** un environnement de staging/preview doté d'une vraie clé Resend/Brevo et d'un tenant non-démo enverra de **vrais e-mails/SMS à de vrais destinataires** (candidats, entreprises).
- **Cause racine :** bac à sable pensé « par tenant démo », pas « par environnement ».
- **Recommandation :** hors production, journaliser au lieu d'envoyer (sauf allowlist d'adresses de test) ou exiger une variable explicite `EMAIL_LIVE=1`.
- **Charge :** S — **Priorité :** P1 — **Type :** Quick win
- **Vérification :** en preview avec clé réelle + tenant non-démo → aucun envoi réel.

#### A12-009 — Fichiers Blob orphelins sur échec partiel (systémique, pas de compensation à l'upload) — 🟠
- **Constat :** l'upload Blob précède l'écriture DB sans compensation si celle-ci échoue.
- **Preuve :** `blob.ts:19-23` `put()` puis l'appelant écrit la DB après ; aucun `del()` de compensation. `del()` n'existe qu'au DELETE (`dossier-actions.ts:227`) et à l'anonymisation RGPD (`rgpd/anonymise.ts:113`). Appelants concernés : `dossier-actions.ts:151-174`, `convention-signature-actions.ts:59`, `facture-actions.ts:60`, `api/upload/route.ts:42`, etc.
- **Scénario d'impact :** fichiers orphelins (coût de stockage ; **résidu de PII hors cycle RGPD**). Pas de corruption des données utilisateur.
- **Cause racine :** absence de compensation transactionnelle sur l'effet tiers non annulable.
- **Recommandation :** helper commun `try { create/update DB } catch { await del(url); throw }` ; ou cron de balayage des blobs sans ligne DB référente.
- **Charge :** M — **Priorité :** P2 — **Type :** Standard
- **Vérification :** simuler un échec DB après upload → le blob est supprimé (aucun orphelin).

#### A12-010 — `syncWedof` plafonné à 100 dossiers sans pagination — 🟠
- **Constat :** la synchronisation manuelle Wedof ne traite que la première page.
- **Preuve :** `financements-actions.ts:90` — `listRegistrationFolders(key, { limit: 100 })` sans boucle de pagination ; l'upsert (`:97-121`) ne traite que ces 100.
- **Scénario d'impact :** un OF avec > 100 dossiers CPF ne synchronise jamais le reste via le bouton (seul le webhook, s'il est configuré, complète) → états/montants CPF périmés et invisibles, sans avertissement.
- **Cause racine :** pas de pagination.
- **Recommandation :** paginer jusqu'à épuisement (curseur `page`/`since`) ; remonter le nombre traité + « incomplet » si tronqué.
- **Charge :** S — **Priorité :** P1 — **Type :** Quick win
- **Vérification :** jeu de test > 100 dossiers → tous synchronisés.

#### A12-011 — `provisionDemo` : opération composite sans transaction ni idempotence — 🟠
- **Constat :** le provisionnement d'un tenant démo enchaîne ~7 écritures sans transaction ni rollback.
- **Preuve :** `demo/provision.ts:63-165` — `lead.create` → events → `organisme.create` → `user.create` → `seedDemoData` → `lead.update` → 2 `sendEmail`, sans `$transaction`. La garde d'unicité (`demo/route.ts:56-69`) cherche un Lead avec `demoOrganismeId` non nul, or ce champ n'est posé qu'à l'étape 5 → un échec en étape 3/4 laisse un Lead sans `demoOrganismeId` → le retry crée un 2ᵉ Lead/Org/User.
- **Scénario d'impact :** tenants démo partiels/dupliqués, comptes « morts » (mot de passe jamais délivré si `sendEmail` échoue en silence). Impact commercial (les démos sont l'outil de vente). Atténué par la purge TTL robuste.
- **Cause racine :** composite non atomique + garde d'unicité posée trop tard.
- **Recommandation :** `$transaction` (org+user+seed) ou compensation `purgeDemoOrganisme` sur échec ; idempotence e-mail ; ne confirmer `ok` qu'après `sendEmail.sent`.
- **Charge :** M — **Priorité :** P2 — **Type :** Standard
- **Vérification :** injecter un échec à l'étape 4 → aucun résidu, le retry ne duplique pas.

#### A12-012 — Absence de tests couvrant les intégrations tierces — 🟠
- **Constat :** les connecteurs tiers et les routes ne sont quasiment pas testés (anomalie en soi selon le barème).
- **Preuve :** tests HTTP de route : 1/88 (`mon-dossier/download/route.test.ts`). Aucun test des appels sortants (`ai.ts`, `email.ts`, `wedof.ts`, `stripe.ts`, webhook Stripe, push, Blob). `sms.test.ts` ne teste que `normalizePhone()` ; `yousign.test.ts` n'affirme que le mode démo. 1 seul fichier stub `global.fetch`. Aucun outillage de couverture (`@vitest/coverage-*` absent).
- **Scénario d'impact :** les flux monétaires (checkout, webhook abonnement) et de communication peuvent casser sans détection de non-régression.
- **Cause racine :** effort de test concentré sur la logique métier pure (693 tests verts), pas sur les frontières d'intégration.
- **Recommandation :** tests avec `fetch` mocké par connecteur (requête émise + gestion 4xx/5xx/timeout) ; rejeu d'events Stripe **signés** sur le webhook ; ajouter `@vitest/coverage-v8` (seuils indicatifs).
- **Charge :** L — **Priorité :** P1 — **Type :** Standard
- **Vérification :** couverture mesurée ; au moins un test par connecteur simulant une panne.

#### A12-013 — Validation d'entrée par schéma minoritaire (dette systémique) — 🟠
- **Constat :** la validation zod côté serveur est l'exception, pas la règle.
- **Preuve :** zod présent dans 2/18 routes mutantes et ~18/101 actions ; `src/lib/validators/` (11 schémas) sous-utilisé. Incohérence intra-fichier : `candidat-actions.ts:136` `safeParse` vs `:79-82` validation ad hoc. 10 routes lisent `req.json()` sans schéma (`lead`, `demo`, `verification`, `convention`, `civique/*`…).
- **Facteurs atténuants (vérifiés) :** aucun mass-assignment (les actions mappent les champs explicitement) ; `scopedPrisma` garantit l'isolation ; Prisma rejette les scalaires invalides. Le risque est donc la **robustesse** (formats/énumérations non contrôlés, UX d'erreur inégale), pas une fuite.
- **Cause racine :** convention de validation non systématisée.
- **Recommandation :** « toute action/route mutant des données valide via un schéma zod » ; réutiliser `lib/validators/` ; helper `parseBody(schema, req)` ; prioriser finance + inscription. Ne pas sur-investir sur les actions à argument unique.
- **Charge :** L — **Priorité :** P1 — **Type :** Chantier (incrémental)
- **Vérification :** ratio routes/actions mutantes validées par schéma en hausse ; test de rejet d'entrée malformée.

#### A12-014 — Aucun versionnement d'API alors que vitrine + app mobile consomment `public/*` — 🟠
- **Constat :** l'API publique n'a ni version ni contrat, pour deux consommateurs externes.
- **Preuve :** aucun `api/v1|v2` ; `grep api-version|X-API-Version` → 0. `public/sessions/route.ts:50` renvoie `{ sessions, generatedAt }` à plat ; aucun OpenAPI/contrat (`grep openapi|swagger` → 0).
- **Scénario d'impact :** la **vitrine** (`getCatalogueLive()`) et l'**app mobile Capacitor** (binaire distribué, non force-updatable) consomment `public/*`. Tout renommage/suppression de champ casse **silencieusement** ces clients, sans transition possible côté mobile.
- **Cause racine :** API publique servie sans contrat figé.
- **Recommandation :** préfixe `/api/public/v1/…` ou en-tête `X-API-Version` ; schéma zod de sortie + test de contrat ; règle « champ jamais retiré, seulement ajouté » ; types partagés. ~10 endpoints concernés seulement.
- **Charge :** M — **Priorité :** P1 — **Type :** Standard
- **Vérification :** un test de contrat casse si un champ `public/*` disparaît.

#### A12-015 — Deux stratégies d'isolation tenant coexistent (risque IDOR latent) — 🟠
- **Constat :** l'isolation est tantôt automatique (`getTenantDb`), tantôt manuelle (`prisma` brut + check), sans règle unique.
- **Preuve :** 28 routes importent `@/lib/prisma` brut, 5 passent par `getTenantDb`/`scopedPrisma`. Deux routes de la même famille isolent différemment : `parcours-t3p/[id]/route.ts:29` (`getTenantDb`, sûr) vs `candidats/[id]/expression-besoin/route.ts:29,38` (`prisma` brut + check manuel `organismeId`). Contre-vérifié : **aucun IDOR actif** (les 2 fichiers en échec du garde-fou — `pieces-organisme-actions.ts:19-34` self-scopé par `organismeId` de session ; `audit-controle-actions.ts:291-334` n'accède qu'à des entités globales vérifiées en-tenant).
- **Scénario d'impact :** pas de faille présente, mais une **future** route qui oublie le check manuel exposera les données d'un autre organisme (fuite inter-clients = 🔴). Risque de conception, aggravé par le garde-fou actuellement rouge (A12-001).
- **Cause racine :** absence de règle « `getTenantDb()` par défaut ».
- **Recommandation :** ériger `getTenantDb()`/`requireStaffTenant()` en défaut pour toute route tenant ; réserver `prisma` brut aux flux publics/console/cron (allowlist) ; règle de lint interdisant `@/lib/prisma` dans `app/api/**` hors allowlist. Migrer `expression-besoin` pour l'exemplarité. Croiser audit 05.
- **Charge :** M — **Priorité :** P1 — **Type :** Standard
- **Vérification :** garde-fou vert + lint actif ; revue des 28 routes brutes.

#### A12-016 — Échecs d'intégration (IA / e-mail / webhooks) non remontés à la supervision — 🟠
- **Constat :** plusieurs canaux critiques journalisent leurs échecs en `console.error` sans capture Sentry.
- **Preuve :** `ai.ts:60-63` (catch = `console.error` seul) ; `email.ts` (aucun `reportError` — les échecs renvoient `{sent:false}`) ; webhooks `brevo`/`resend` sans `reportError`. Le helper `reportError` existe et est utilisé ailleurs (`stripe/webhook`, `cron-runner`).
- **Scénario d'impact :** les pannes de l'IA (facturée), de la délivrabilité e-mail et des webhooks e-mail sont invisibles en supervision (logs Vercel non conservés) → aucune alerte, aucun taux d'échec.
- **Cause racine :** capture d'erreur non systématisée sur les frontières d'intégration.
- **Recommandation :** router tous les catches d'intégration vers `reportError(e, { tag })` ; envisager un indicateur taux d'échec/latence par tiers.
- **Charge :** S — **Priorité :** P2 — **Type :** Quick win
- **Vérification :** un échec Resend/IA simulé apparaît dans Sentry avec son tag.

---

### 4. POINTS CONFORMES (🟢)

Vérifiés avec preuve — base d'argumentaire commercial et de documentation de conformité.

1. **Isolation multi-tenant robuste par défaut** — `tenant.ts:42-134` : `scopedPrisma` injecte `organismeId` en dernier en écriture (un `organismeId` du payload client ne peut l'écraser), filtre toutes les lectures, **vérifie l'appartenance** sur update/delete/upsert, double la garantie par variable RLS (`withOrgVar`).
2. **Authentification de tous les webhooks avant traitement** — Stripe HMAC sur **corps brut** (`stripe/webhook/route.ts:54`), Resend **Svix HMAC-SHA256 + anti-rejeu** (`resend-webhook.ts:59-86`), Brevo secret en **temps constant** (`brevo/route.ts:44`), Wedof **HMAC-SHA512 par tenant** (`webhooks/wedof/[orgId]/route.ts:31-38`). Tous **fail-closed en production**.
3. **Idempotence des flux financiers Stripe** — états d'abonnement en valeurs absolues (rejeu = ré-application) ; civique `upsert(stripeSessionId @unique)` + envoi e-mail par claim atomique ; **500 → rejeu Stripe** au lieu d'acquitter un échec (`stripe/webhook/route.ts:161-169`).
4. **Fulfillment civique à double entrée idempotent** — rejouable par webhook **et** page de succès (`civique-api.ts:513-524` ; `checkout/[id]/route.ts:31-38`).
5. **Numérotation de factures atomique anti-trou** — allocation n° + création dans **une** `$transaction` avec retry P2002 (`civique-api.ts:206-273` ; `facture-editeur-actions.ts:130-156`).
6. **7 crons fail-closed** — `assertCronAuthorized` (secret obligatoire, `Authorization: Bearer`, `?secret=` banni), y compris les crons destructifs (`purge-*`, `rgpd-purge`, `suspend-trials`). Filet d'erreur commun `runCron` → `reportError` (`cron-runner.ts:17-28`).
7. **Dégradation exemplaire Vercel Blob** — repli data-URL : l'upload n'est **jamais perdu** (`blob.ts:18-33`).
8. **E-mail non bloquant** — `sendEmail` retourne un objet (jamais d'exception) → une inscription n'échoue pas sur un e-mail (`email.ts:98-193`) ; bac à sable démo (`:146`).
9. **Rate-limit résilient** — Upstash partagé si configuré, repli mémoire sur erreur, **fail-closed en vraie prod** si non configuré et `failClosed` (`rate-limit.ts:74-93`) ; IP réelle non spoofable (`x-real-ip`).
10. **Coût IA maîtrisé** — **Haiku par défaut** + `max_tokens` bornés + quotas 30 gén./h et 15 img./h par OF (`ai.ts:13`, `social-content-actions.ts:105,224`) — piège Opus évité.
11. **YouSign / PDP non branchés mais assumés** — repli explicite, `externalId=null`, `NoopPdpAdapter` : jamais de faux identifiant (`yousign.ts:16-39`, `factures/pdp.ts:29-35`).
12. **Aucune fuite de champ sensible** — `passwordHash`/`totpSecret`/tokens jamais renvoyés au client ; sorties `public/*` en DTO explicites (`public/sessions/route.ts:32-48`).
13. **Endpoint `verification` exemplaire** — comparaison à temps constant + enregistrement leurre, réponses génériques anti-énumération, IP anonymisée RGPD, rate-limit + Turnstile fail-closed.
14. **Supervision Sentry multi-runtime RGPD-safe** — `instrumentation.ts` (server/edge) + `instrumentation-client.ts`, inertes sans DSN, `sendDefaultPii:false`.
15. **Séparation base dev/test/prod prouvée** + gouvernance CI (`ci.yml` : lint → `tsc` → `npm test` bloquant → build) exécutée sur Postgres éphémère.

---

### 5. CONTRÔLES NON RÉALISÉS

| Contrôle | Raison | Ce qu'il faudrait pour le faire |
|---|---|---|
| Injection de panne **dynamique** (timeout/500/réponse invalide) contre les vrais tiers | Lecture seule ; nécessite clés réelles + app lancée ; risque d'effet de bord | Environnement de test dédié + comptes sandbox Stripe/Resend/Wedof + tests de fault-injection (analyse **statique** du chemin d'échec réalisée à la place) |
| Idempotence réelle côté **PDP** | PDP non branchée (`NoopPdpAdapter`) → A12-007 latent | Choix du prestataire PDP + branchement en sandbox |
| Config Stripe (méthodes de paiement du checkout civique) | Non visible en code ; détermine si le 🟡 « payment_status » est exploitable (SEPA différé) | Accès au dashboard Stripe |
| Présence effective des secrets en prod (`CRON_SECRET`, `*_WEBHOOK_SECRET`, `SENTRY_DSN`, `SECRETS_ENCRYPTION_KEY`, `UPSTASH_*`, clés live vs test) | Règle 6 (pas de secret en clair) ; env Vercel non lisible | Revue de la configuration Vercel (checklist `docs/PROD-ENV-CHECKLIST`) |
| Règles d'alerting Sentry (seuils, notifications) | Configurées hors dépôt (dashboard Sentry) | Accès au projet Sentry |
| Taux réel de webhooks perdus / volumes Wedof par OF (> 100 ?) | Dépend des données de prod (MEMORY : « debug via la base, pas de logs Vercel ») | Accès prod en lecture / métriques |
| `pdf-test/route.ts` en production (garde exacte, légitimité) | Non instruit en profondeur | À trancher avec l'audit 01 (retirer/gater avant Go-Live) |

---

### 6. QUICK WINS
*(fort risque / faible charge — à lancer en premier)*

- **A12-003** — Fiabiliser le code d'accès civique (poser `emailSentAt` après succès + bouton « renvoyer »). **S / P0**
- **A12-006** — Garde d'ordre `wedofMajLe` + `reportError` sur le webhook Wedof. **S / P1**
- **A12-008** — Garde-fou d'envoi e-mail/SMS par environnement. **S / P1**
- **A12-010** — Pagination `syncWedof`. **S / P1**
- **A12-016** — Router les catches IA/e-mail/webhooks vers Sentry. **S / P2**
- 🟡 — `timingSafeEqual` sur `CRON_SECRET` ; dédoublonner `suspend-trials` dans `vercel.json` ; sortir le secret Brevo de la query string ; sortir `pdf-test` de la prod.

---

### 7. PLAN DE REMÉDIATION

- **Vague 1 — avant Go-Live (P0) :** A12-001 (CI verte + garde-fou d'isolation rétabli) · A12-003 (code d'accès civique). *Charge cumulée ≈ 1–1,5 j.*
- **Vague 2 — J+30 (P1) :** A12-002 (timeouts) · A12-004 (robustesse checkout Stripe) · A12-005 (réconciliation Stripe) · A12-006 (Wedof ordre/log) · A12-007 (durcissement PDP **avant toute activation**) · A12-008 (garde e-mail) · A12-010 (pagination Wedof) · A12-012 (tests d'intégration) · A12-013 (validation zod) · A12-014 (versionnement `public/*`) · A12-015 (unifier l'isolation). *Charge cumulée ≈ 8–12 j.*
- **Vague 3 — J+90 (P2/P3) :** A12-009 (blobs orphelins) · A12-011 (provisionDemo transactionnel) · A12-016 (observabilité) · l'ensemble des 🟡 (clés test/live, dunning idempotent, correlation-id, message-id e-mail, pagination des listes de gestion, forme de réponse unifiée, e-reporting PDP, couverture de tests mesurée, doc d'intégrations, etc.).

---

### 8. ANNEXES

**Commandes exécutées (extraits) :**
- `git rev-parse HEAD` → `5dd1008d1d1c68972c85c921a3319f5d66e38a1e`
- `find src/app/api -name route.ts | wc -l` → 46
- `grep -rlE "^['\"]use server['\"]" src` → 95 (101 avec sous-dossiers)
- `npx vitest run src/lib/__tests__/prisma-direct-guard.test.ts src/lib/__tests__/publish-documents.test.ts` → `3 failed | 7 passed`
- `grep -niE "pdp|facturx|ereporting" prisma/schema.prisma` → `pdpTransmisAt` seul (pas de `pdpReference`)
- `grep AbortSignal|timeout src` → un seul appel borné (HIBP)

**Fichiers clés analysés :** `src/lib/tenant.ts`, `rate-limit.ts`, `email.ts`, `ai.ts`, `blob.ts`, `wedof.ts`, `stripe.ts`, `civique-api.ts`, `crypto.ts`, `db-retry.ts` ; `src/lib/actions/{billing,console-billing,facture-editeur,financements,audit-controle,pieces-organisme,demo-*}-actions.ts` ; `src/app/api/{stripe/webhook,webhooks/{brevo,resend,wedof/[orgId]},cron/*,public/*,civique/*}/route.ts` ; `prisma/schema.prisma` ; `.github/workflows/ci.yml` ; `vercel.json` ; `.env.example`.

**Outils / versions :** Next.js 16.3.1, React 19.2.4, Prisma 6.19.3, Vitest 4.1.8, Stripe SDK 22.2.2, @anthropic-ai/sdk 0.104.2, @vercel/blob 2.4.0, @upstash/redis 1.38.0.

**Équipe :** 5 sous-agents spécialistes (analyse parallèle) + contre-vérification personnelle du chef de projet sur tous les 🟠 (lecture directe du code + reproduction des tests).

---

### 9. BLOC DE CONSOLIDATION (ne pas modifier le format)

```json
{
  "audit_id": 12,
  "audit_nom": "Audit API & intégrations",
  "date": "2026-09-11",
  "commit": "5dd1008d1d1c68972c85c921a3319f5d66e38a1e",
  "verdict": "GO_CONDITIONNEL",
  "compteurs": {"rouge": 0, "orange": 16, "jaune": 18, "vert": 15, "non_verifie": 7},
  "anomalies": [
    {"id": "A12-001", "gravite": "orange", "titre": "Suite de tests ROUGE (3 echecs) dont le garde-fou d'isolation", "composant": "prisma-direct-guard.test.ts / publish-documents.test.ts / CI", "preuve": "vitest run -> 3 failed; prisma-direct-guard.test.ts:71,199; publish-documents.test.ts:29", "impact": "CI bloquee; garde-fou d'isolation inoperant; regression d'idempotence", "recommandation": "Completer l'allowlist justifiee + corriger publierDocument; CI verte", "charge": "M", "priorite": "P0", "type": "standard", "depend_de": []},
    {"id": "A12-002", "gravite": "orange", "titre": "Timeouts absents sur les appels sortants (systemique)", "composant": "email.ts, wedof.ts, sms.ts, image-gen.ts, rate-limit.ts", "preuve": "grep AbortSignal|timeout -> HIBP seul (password.ts:21); rate-limit.ts:83 await incr sans timeout", "impact": "Fonction serverless qui traine sur tiers suspendu; checkLimit en tete d'endpoints publics", "recommandation": "AbortSignal.timeout() partout + timeout SDK Anthropic + maxDuration", "charge": "M", "priorite": "P1", "type": "standard", "depend_de": []},
    {"id": "A12-003", "gravite": "orange", "titre": "Code d'acces civique perdu en silence si l'e-mail echoue", "composant": "src/lib/civique-api.ts", "preuve": "civique-api.ts:531-534 claim avant envoi; :561-566 retour sendEmail ignore; email.ts:119,190 {sent:false} sans throw", "impact": "Client payant sans code d'acces, jamais re-tente (recuperable page succes/support)", "recommandation": "Poser emailSentAt apres sent===true + bouton renvoyer", "charge": "S", "priorite": "P0", "type": "quick_win", "depend_de": []},
    {"id": "A12-004", "gravite": "orange", "titre": "Checkout Stripe sans try/catch + CGV avant l'appel + customer orphelin", "composant": "src/lib/actions/billing-actions.ts", "preuve": "billing-actions.ts:70-73 CGV; :94,:107 sans try/catch; :93-100 customer orphelin", "impact": "500 generique; acceptation CGV fantome; doublon customer au retry", "recommandation": "try/catch dedie; CGV apres succes; lookup customer avant create", "charge": "M", "priorite": "P1", "type": "standard", "depend_de": []},
    {"id": "A12-005", "gravite": "orange", "titre": "Aucune reconciliation Stripe: suspend-trials peut suspendre un client payant", "composant": "src/app/api/cron/suspend-trials/route.ts", "preuve": "route.ts:17-20 updateMany sans Stripe; grep trial.ts stripe -> 0; aucun cron ne refetch subscriptions", "impact": "Webhook perdu -> OF reste ESSAI -> suspension d'un client qui a paye", "recommandation": "Cron de reconciliation subscriptions.list + alerte sur ecart", "charge": "M", "priorite": "P1", "type": "standard", "depend_de": []},
    {"id": "A12-006", "gravite": "orange", "titre": "Webhook Wedof: pas de garde d'ordre + aucune journalisation", "composant": "src/app/api/webhooks/wedof/[orgId]/route.ts", "preuve": "route.ts:59-63 upsert update:fields inconditionnel; wedofMajLe stocke :57 non utilise; pas de reportError", "impact": "Etat/montant CPF regresse par event en retard; incident invisible", "recommandation": "Garder si wedofMajLe>=stocke + reportError + journal des events", "charge": "S", "priorite": "P1", "type": "quick_win", "depend_de": []},
    {"id": "A12-007", "gravite": "orange", "titre": "PDP: reference non persistee + pas de garde anti-re-depot", "composant": "src/lib/actions/facture-editeur-actions.ts / schema.prisma", "preuve": "facture-editeur-actions.ts:191-201 reference en auditLog seul; schema.prisma:270 pdpTransmisAt sans pdpReference; adapter.configured :175 inerte", "impact": "Dormant (NoopPdpAdapter) -> ROUGE des activation PDP: double depot d'une facture legale", "recommandation": "Colonne pdpReference @unique + $transaction + garde where statut=EMISE + idempotency-key", "charge": "M", "priorite": "P1", "type": "standard", "depend_de": []},
    {"id": "A12-008", "gravite": "orange", "titre": "E-mail/SMS: pas de garde-fou par environnement", "composant": "src/lib/email.ts / sms.ts", "preuve": "email.ts:144-154 garde isDemoSender seule, pas de NODE_ENV/VERCEL_ENV; sendViaResend fire des RESEND_API_KEY", "impact": "Staging avec vraie cle + tenant non-demo -> vrais e-mails/SMS a de vrais destinataires", "recommandation": "Bloquer hors prod sauf EMAIL_LIVE=1 explicite ou allowlist", "charge": "S", "priorite": "P1", "type": "quick_win", "depend_de": []},
    {"id": "A12-009", "gravite": "orange", "titre": "Fichiers Blob orphelins sur echec partiel", "composant": "src/lib/blob.ts + appelants", "preuve": "blob.ts:19-23 put puis DB apres, aucun del() de compensation; del() seulement au DELETE/RGPD", "impact": "Fichiers orphelins (cout + residu PII hors cycle RGPD)", "recommandation": "Helper try{DB}catch{del(url);throw} ou cron de balayage", "charge": "M", "priorite": "P2", "type": "standard", "depend_de": []},
    {"id": "A12-010", "gravite": "orange", "titre": "syncWedof plafonne a 100 dossiers sans pagination", "composant": "src/lib/actions/financements-actions.ts", "preuve": "financements-actions.ts:90 listRegistrationFolders(limit:100) sans boucle", "impact": "OF > 100 dossiers CPF: sync partielle silencieuse", "recommandation": "Paginer jusqu'a epuisement + signaler si tronque", "charge": "S", "priorite": "P1", "type": "quick_win", "depend_de": []},
    {"id": "A12-011", "gravite": "orange", "titre": "provisionDemo: composite sans transaction ni idempotence", "composant": "src/lib/demo/provision.ts", "preuve": "provision.ts:63-165 7 ecritures sans $transaction; garde d'unicite demo/route.ts:56-69 sur demoOrganismeId pose etape 5", "impact": "Tenants demo partiels/dupliques, comptes morts (mitige par purge TTL)", "recommandation": "$transaction org+user+seed + idempotence e-mail + ok apres sendEmail.sent", "charge": "M", "priorite": "P2", "type": "standard", "depend_de": []},
    {"id": "A12-012", "gravite": "orange", "titre": "Aucun test couvrant les integrations tierces", "composant": "src/** (tests)", "preuve": "1/88 route testee; sms.test/yousign.test triviaux; 1 seul stub fetch; pas de coverage", "impact": "Flux monetaires/comms peuvent casser sans detection", "recommandation": "Tests fetch mocke par connecteur + rejeu events Stripe signes + @vitest/coverage", "charge": "L", "priorite": "P1", "type": "standard", "depend_de": []},
    {"id": "A12-013", "gravite": "orange", "titre": "Validation d'entree par schema minoritaire (dette systemique)", "composant": "routes API + server actions", "preuve": "zod 2/18 routes mutantes, ~18/101 actions; validators/ sous-utilise; candidat-actions.ts:79-82 ad hoc vs :136 zod", "impact": "Bugs de donnees silencieux, UX d'erreur inegale, surface de fuzzing", "recommandation": "Convention: toute mutation valide via zod; helper parseBody; cibler finance/inscription", "charge": "L", "priorite": "P1", "type": "chantier", "depend_de": []},
    {"id": "A12-014", "gravite": "orange", "titre": "Aucun versionnement d'API + pas de contrat public/*", "composant": "src/app/api/public/*", "preuve": "0 api/v1; grep version -> 0; public/sessions:50 sortie a plat; grep openapi -> 0", "impact": "Renommage de champ casse la vitrine ET l'app mobile Capacitor distribuee", "recommandation": "Prefixe v1 ou X-API-Version + schema de sortie + regle champ jamais retire", "charge": "M", "priorite": "P1", "type": "standard", "depend_de": []},
    {"id": "A12-015", "gravite": "orange", "titre": "Deux strategies d'isolation tenant (risque IDOR latent)", "composant": "src/app/api/**", "preuve": "28 routes prisma brut vs 5 getTenantDb; expression-besoin check manuel vs parcours-t3p getTenantDb; aucun IDOR actif verifie", "impact": "Pas de fuite active mais une future route oublieuse exposerait un autre OF (rouge)", "recommandation": "getTenantDb() par defaut + lint interdisant @/lib/prisma hors allowlist", "charge": "M", "priorite": "P1", "type": "standard", "depend_de": ["A12-001"]},
    {"id": "A12-016", "gravite": "orange", "titre": "Echecs d'integration (IA/e-mail/webhooks) non remontes a Sentry", "composant": "src/lib/ai.ts, email.ts, webhooks/{brevo,resend}", "preuve": "ai.ts:60-63 console.error; email.ts aucun reportError; webhooks brevo/resend sans reportError", "impact": "Pannes de canaux critiques invisibles en supervision (logs Vercel non conserves)", "recommandation": "Router les catches vers reportError({tag})", "charge": "S", "priorite": "P2", "type": "quick_win", "depend_de": []},
    {"id": "A12-017", "gravite": "jaune", "titre": "Aucune separation cles test/live pour les tiers payants", "composant": "src/lib/stripe.ts / .env.example", "preuve": ".env.example cle unique par service; new Stripe(STRIPE_SECRET_KEY) sans verif prefixe sk_test_/sk_live_", "impact": "Rien n'empeche une cle live en dev/staging (mitige: degradation propre sans cle)", "recommandation": "Verif prefixe-cle/environnement au demarrage + cles test dediees", "charge": "S", "priorite": "P2", "type": "standard", "depend_de": ["A12-008"]},
    {"id": "A12-018", "gravite": "jaune", "titre": "E-mail de relance Stripe (dunning) non idempotent sur redelivery", "composant": "src/app/api/stripe/webhook/route.ts", "preuve": "stripe/webhook/route.ts:139-145 envoi e-mail dans payment_failed sans dedup event.id", "impact": "E-mail d'impaye en double sur redelivery Stripe (pas de double effet monetaire)", "recommandation": "Dedup legere sur event.id (table/Redis) pour handlers a effet non idempotent", "charge": "S", "priorite": "P2", "type": "standard", "depend_de": []},
    {"id": "A12-019", "gravite": "jaune", "titre": "checkout.session.completed traite sans verifier payment_status", "composant": "src/app/api/stripe/webhook/route.ts", "preuve": "route.ts:70-88 provisionne des completed sans s.payment_status===paid; async_payment_* non geres", "impact": "Si methodes differees (SEPA) activees: acces/facture avant encaissement", "recommandation": "Ne fulfiller que si payment_status===paid, sinon attendre async_payment_succeeded", "charge": "S", "priorite": "P2", "type": "standard", "depend_de": []},
    {"id": "A12-020", "gravite": "jaune", "titre": "CRON_SECRET compare sans timingSafeEqual", "composant": "src/lib/cron-auth.ts", "preuve": "cron-auth.ts:11 authorization !== `Bearer ${secret}` (Brevo/Resend/Wedof utilisent timingSafeEqual)", "impact": "Canal temporel theorique sur secret a forte entropie", "recommandation": "timingSafeEqual pour coherence", "charge": "S", "priorite": "P3", "type": "quick_win", "depend_de": []},
    {"id": "A12-021", "gravite": "jaune", "titre": "Secret Brevo transmis en query string", "composant": "src/app/api/webhooks/brevo/route.ts", "preuve": "brevo/route.ts:39 lit ?secret= (compare en temps constant mais fuite dans access-logs/Referer)", "impact": "Fuite possible du secret dans les journaux; incoherence avec la doctrine cron-auth", "recommandation": "En-tete signe/secret d'en-tete si Brevo le permet", "charge": "S", "priorite": "P3", "type": "standard", "depend_de": []},
    {"id": "A12-022", "gravite": "jaune", "titre": "push/register reassigne un deviceToken sans verifier le proprietaire", "composant": "src/app/api/push/register/route.ts", "preuve": "push/register/route.ts:33 upsert cle token update:{userId} (no-op si PUSH_ENABLED off)", "impact": "Un user authentifie connaissant un token FCM d'autrui en reassigne la propriete", "recommandation": "Ne pas reattribuer un token appartenant a un autre userId sans preuve", "charge": "S", "priorite": "P3", "type": "standard", "depend_de": []},
    {"id": "A12-023", "gravite": "jaune", "titre": "suspend-trials planifie deux fois dans vercel.json", "composant": "vercel.json", "preuve": "deux entrees crons 0 2 * * * et 0 6 * * * pour suspend-trials", "impact": "Inoffensif (updateMany idempotent) mais probablement non intentionnel", "recommandation": "Confirmer l'intention ou dedoublonner", "charge": "S", "priorite": "P3", "type": "quick_win", "depend_de": []},
    {"id": "A12-024", "gravite": "jaune", "titre": "civicMentions:{push} non idempotent, rejoue a chaque appel", "composant": "src/lib/civique-api.ts", "preuve": "civique-api.ts:502-510 update civicMentions:{push} a chaque fulfill (webhook + page succes + retries)", "impact": "Accumulation de mentions dupliquees (masque par un Set en aval)", "recommandation": "Push conditionnel (si absente) ou set", "charge": "S", "priorite": "P3", "type": "standard", "depend_de": []},
    {"id": "A12-025", "gravite": "jaune", "titre": "e-reporting d'encaissement construit mais jamais transmis", "composant": "src/lib/factures/pdp.ts", "preuve": "pdp.ts:99-111 buildEreportingPayload sans aucun appelant (hors tests)", "impact": "Obligation 2026 (declaration des encaissements a la PDP) non couverte", "recommandation": "Cabler la transmission e-reporting sur la transition Encaissee, idempotente", "charge": "M", "priorite": "P3", "type": "standard", "depend_de": ["A12-007"]},
    {"id": "A12-026", "gravite": "jaune", "titre": "Aucun message-id fournisseur stocke (tracabilite e-mail)", "composant": "src/lib/email.ts / EmailLog", "preuve": "email.ts ne recupere pas l'id retourne par Resend/Brevo; pas de champ messageId dans EmailLog", "impact": "Impossible de rattacher un bounce a l'e-mail transactionnel precis", "recommandation": "Stocker le message-id provider; traiter email.bounced/complained", "charge": "M", "priorite": "P3", "type": "standard", "depend_de": []},
    {"id": "A12-027", "gravite": "jaune", "titre": "db-retry: risque latent de double-effet si write non idempotent", "composant": "src/lib/db-retry.ts", "preuve": "db-retry.ts:45-57 retry sur P1017/socket hang up; usages actuels tous en lecture (pas de danger actuel)", "impact": "Aucun aujourd'hui; piege futur si on enveloppe un create/increment non idempotent", "recommandation": "Documenter lecture/write idempotent uniquement + garde-fou en revue", "charge": "S", "priorite": "P3", "type": "standard", "depend_de": []},
    {"id": "A12-028", "gravite": "jaune", "titre": "Pas d'identifiant de correlation bout-en-bout", "composant": "src/lib/observability + auditLog/emailLog", "preuve": "grep correlationId|requestId|traceId -> 0; reportError par tag mais pas de correlation propagee", "impact": "Suivre une operation d'un paiement a l'e-mail necessite des recoupements manuels", "recommandation": "correlationId par event entrant propage dans auditLog/emailLog/Sentry", "charge": "M", "priorite": "P2", "type": "standard", "depend_de": []},
    {"id": "A12-029", "gravite": "jaune", "titre": "Forme de reponse API non uniforme", "composant": "src/app/api/** + actions", "preuve": "NextResponse.json ok 22x / error 36x + 27 reponses texte brut; ActionResult importe par 12/94 fichiers", "impact": "Chaque appelant gere plusieurs conventions; friction d'integration/tests", "recommandation": "Helper jsonOk/jsonError aligne sur ActionResult; bannir le texte brut hors binaires", "charge": "M", "priorite": "P2", "type": "standard", "depend_de": []},
    {"id": "A12-030", "gravite": "jaune", "titre": "Pagination quasi absente (dette de scalabilite)", "composant": "src/lib/actions/*", "preuve": "take:|skip:|cursor: dans 3/94 actions; findMany 22x majoritairement sans borne", "impact": "Listes chargees integralement; latence + cout transfert Neon a la hausse", "recommandation": "Plafond take par defaut + pagination curseur sur CRM/candidats/inscriptions", "charge": "M", "priorite": "P2", "type": "standard", "depend_de": []},
    {"id": "A12-031", "gravite": "jaune", "titre": "Double appel d'authentification dans les actions", "composant": "src/lib/actions/*-actions.ts", "preuve": "candidat-actions.ts:132-134 requireStaffTenant() puis auth() redondant", "impact": "Surcharge legere + code redondant qui brouille la regle d'autorisation", "recommandation": "Exposer session depuis requireStaffTenant() et supprimer les auth() redondants", "charge": "S", "priorite": "P3", "type": "quick_win", "depend_de": []},
    {"id": "A12-032", "gravite": "jaune", "titre": "Couverture de tests non mesuree", "composant": "package.json / vitest", "preuve": "aucune dependance @vitest/coverage-*, aucun script --coverage, aucun seuil", "impact": "Impossible d'objectiver la couverture avant commercialisation", "recommandation": "@vitest/coverage-v8 + seuils indicatifs + rapport CI non bloquant", "charge": "S", "priorite": "P3", "type": "quick_win", "depend_de": []},
    {"id": "A12-033", "gravite": "jaune", "titre": "Tests smoke composants exclus du npm test / CI", "composant": "vitest.config.ts / ci.yml", "preuve": "include src/**/*.{test,spec}.ts (pas .tsx); *.smoke.test.tsx non invoques par npm test ni CI", "impact": "Ces tests ne s'executent jamais en CI -> faux sentiment de couverture", "recommandation": "Integrer la config smoke a la CI (script dedie) ou fusionner le pattern", "charge": "S", "priorite": "P3", "type": "standard", "depend_de": []},
    {"id": "A12-034", "gravite": "jaune", "titre": "Documentation d'integration incomplete + pdf-test en prod", "composant": "docs/ + src/app/api/pdf-test", "preuve": "pas de doc par integration (service/cle/support); pdf-test/route.ts present en prod", "impact": "Onboarding integrateur ralenti; endpoint de test expose", "recommandation": "docs/INTEGRATIONS.md (service/usage/variables/webhook/contact) + gater/retirer pdf-test", "charge": "S", "priorite": "P3", "type": "quick_win", "depend_de": []}
  ],
  "conditions_go": [
    "A12-001: repasser la CI au vert (corriger les 3 tests, retablir le garde-fou d'isolation multi-tenant)",
    "A12-003: fiabiliser la remise du code d'acces civique paye (emailSentAt apres succes + renvoi possible)",
    "Avant les premiers clients payants (J+30): A12-002 timeouts, A12-004 robustesse checkout, A12-005 reconciliation Stripe, A12-006 ordre/journalisation Wedof, A12-008 garde-fou e-mail par environnement, A12-012 tests d'integration",
    "A12-007: durcir la transmission PDP (pdpReference + garde anti-re-depot) AVANT toute activation d'une PDP"
  ],
  "risques_residuels": [
    "Injection de panne dynamique contre les vrais tiers non realisee (analyse statique du chemin d'echec effectuee a la place)",
    "Presence/coherence des secrets en prod (cles live vs test, *_WEBHOOK_SECRET, SENTRY_DSN, UPSTASH_*) non verifiable en lecture de code",
    "Idempotence cote PDP dependante du prestataire retenu (non branche)",
    "Taux reel de webhooks perdus et volumes Wedof par OF non observables sans acces prod",
    "Config Stripe (methodes de paiement differees) conditionne l'exploitabilite de A12-019"
  ]
}
```
