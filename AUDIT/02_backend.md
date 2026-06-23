# 02 — Développeur backend

> Fiche d'audit (Livrable 2). Constats sourcés. **Aucune correction appliquée.**

## Développeur backend

### 1. Périmètre analysé
- Server Actions (~40 fichiers) : [src/lib/actions/](../src/lib/actions/), focus facturation/financement [devis-actions.ts](../src/lib/actions/devis-actions.ts), `billing-actions.ts`, `paiement-actions.ts`, `facture`/`convention`.
- Routes API : `api/cron/parcours`, `api/cron/suspend-trials`, `api/cron/rgpd-purge`, `api/public/*`, `api/lead`, `api/stripe`, `api/auth`.
- Validation : [src/lib/validators/](../src/lib/validators/) (Zod) ; cloisonnement via `getTenantDb()`.

### 2. Constats — bugs & règles de gestion

| ID | Description | Fichier:ligne | Sévérité | Impact |
|----|-------------|---------------|----------|--------|
| BCK-01 | **Numérotation par `count()` → race condition + trous.** Les références (`DEV-AAAA-NNNN`, factures, conventions) sont générées par comptage. Deux créations concurrentes produisent le **même numéro** ; une suppression crée un **trou**. Pour les **factures**, la numérotation continue sans trou est une **obligation légale** (art. 242 nonies A CGI). | [devis-actions.ts:35-36](../src/lib/actions/devis-actions.ts) | Majeure | Collisions/échecs sous charge ; non-conformité de la numérotation des factures (renvoi `08`). |
| BCK-02 | **Sémantique de statut erronée** : accepter un devis le passe à `FactureStatut.PAYEE`. Un devis accepté n'est **pas** payé ; mélanger devis et facture sur la même enum prête à confusion comptable. | [devis-actions.ts:100](../src/lib/actions/devis-actions.ts) | Majeure | Indicateurs financiers faussés (un devis « accepté » compté comme encaissé). |
| BCK-03 | **Gestion d'erreurs hétérogène.** Certaines actions renvoient `{ ok, error }` (ex. `createDevis`), d'autres des `formData`-actions **retournent silencieusement** sans feedback (`if (!d) return;`), et `scopedPrisma` **jette** des `Error` brutes (« Accès refusé… ») non typées. Pas de stratégie unifiée ni de journalisation. | [devis-actions.ts:63-72,107-116](../src/lib/actions/devis-actions.ts), [tenant.ts:70,96](../src/lib/tenant.ts) | Majeure | Échecs muets côté UI ; erreurs non tracées ; DX/maintenance. |
| BCK-04 | **TVA mono-taux par document**, appliquée au HT global ; pas de TVA par ligne. L'exonération OF (art. 261-4-4° CGI, `Organisme.assujettiTva`) n'est pas forcée dans le calcul (défaut 20 %). | [devis-actions.ts:30-31](../src/lib/actions/devis-actions.ts), [schema.prisma:77](../prisma/schema.prisma) | Majeure | Devis/factures potentiellement faux pour un OF exonéré ou multi-taux (renvoi `08`). |
| BCK-05 | **Idempotence du webhook Stripe à confirmer.** L'abonnement self-serve dépend du webhook (`stripeSubscriptionId`, `abonnementJusquau`). Sans déduplication d'événement (clé d'idempotence / vérif `event.id`), un rejeu peut dupliquer des effets. *(à vérifier dans `billing-actions.ts` / `api/stripe`)* | `api/stripe`, `src/lib/actions/billing-actions.ts` | Majeure (à confirmer) | États d'abonnement incohérents. |
| BCK-06 | **`force-dynamic` + génération PDF synchrone** dans des routes (parcours, documents) : opérations lourdes (Chromium) exécutées dans la requête, sans file d'attente ni timeout explicite. | [api/cron/parcours/route.ts:4](../src/app/api/cron/parcours/route.ts), `next.config.ts` (tracing Chromium) | Mineure | Latence/timeouts serverless sous charge ; coût. |

### 3. Corrections proposées (esquisses)
- **BCK-01** : numérotation **atomique** — séquence dédiée (table compteur par OF/année en transaction `upsert` + `increment`, ou séquence Postgres), jamais `count()`. Pour les factures, interdire la suppression (annulation par avoir uniquement).
- **BCK-02** : enum/état dédié au devis (`BROUILLON/ENVOYE/ACCEPTE/REFUSE`) distinct du cycle facture ; un devis accepté **génère** une facture/inscription, il ne devient pas « payé ».
- **BCK-03** : type de retour standard `ActionResult<T>` + helper `try/catch` qui mappe les erreurs `scopedPrisma` en messages utilisateur + journalisation (`AuditLog`/logger).
- **BCK-04** : calcul TVA piloté par `assujettiTva` (0 % + mention légale si exonéré) et TVA par ligne si besoin.
- **BCK-05** : vérifier/added la déduplication d'événements Stripe (stocker `event.id` traités) et la vérification de signature du webhook.

### 4. AVIS DU SPÉCIALISTE
**Backend solide et lisible, mais la logique financière a des angles morts à corriger avant facturation réelle.** Les Server Actions sont bien structurées (validation Zod systématique, cloisonnement via `getTenantDb`, calculs côté serveur — pas de confiance au client). Les points sérieux sont **comptables/transactionnels** : numérotation non atomique et non conforme (BCK-01), confusion devis↔facture (BCK-02), TVA non pilotée par l'exonération (BCK-04). Ce sont des **non-conformités/bugs métier** plus que des défauts techniques. La gestion d'erreurs mérite d'être unifiée (BCK-03). À traiter avant d'émettre de vraies factures à des clients.

### 5. AMÉLIORATIONS À AJOUTER
1. **Couche transactionnelle** pour les opérations multi-écritures (inscription → convention → facture) avec `prisma.$transaction`.
2. **File d'attente** (ou route séparée + Vercel Queues/cron) pour la génération PDF lourde, hors chemin requête.
3. **Journalisation structurée** des actions sensibles (déjà `AuditLog` en base — l'étendre systématiquement aux écritures financières).
4. **Tests d'intégration** des règles de gestion (totaux, TVA, numérotation) — cf. `05`.
