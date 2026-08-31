# Corbeille (soft-delete) — audit A09-003

Répond au 🔴 A09-003 : une suppression accidentelle par le personnel d'un OF n'est plus définitive.

## Mécanisme

- 5 modèles ont un champ `deletedAt` : **Candidat, Session, Inscription, Entreprise, Facture**.
- Via le client cloisonné `scopedPrisma`/`getTenantDb` (personnel), un `delete`/`deleteMany` sur ces modèles **pose `deletedAt`** au lieu de supprimer, et **toutes les lectures de premier niveau** (findMany/findFirst/count/aggregate/groupBy/findUnique) **excluent** la corbeille (`deletedAt: null`).
- La corbeille (`requireTrashTenant` → `scopedPrisma(org, { includeDeleted: true })`) permet de **lister / restaurer / purger** — `src/lib/actions/corbeille-actions.ts`.
- Les **hard-deletes légitimes** (crons RGPD, scripts, console SUPERADMIN, flux publics par token) passent par `bypassPrisma` / le client brut → **NON convertis** (suppression réelle conservée).

## Limites connues (à garder en tête)

1. **Lectures imbriquées** : une extension Prisma n'intercepte pas les relations chargées via `include`/`select` imbriqué. Un élément en corbeille peut donc encore apparaître dans un sous-objet `include` (ex. `session.findFirst({ include: { inscriptions } })`). **Ce n'est PAS une fuite inter-tenant** (le `organismeId` reste appliqué) — juste un affichage résiduel jusqu'à restauration/purge. Les **listes principales** sont bien filtrées.
2. **Cascades** : convertir `delete`→`update` **ne déclenche pas** les cascades SQL. Les enfants sont préservés (souhaitable pour la restauration) mais peuvent subsister ; la **purge** définitive, elle, supprime réellement et cascade.

## Mise en production (à faire par l'éditeur)

- **`prisma db push`** (ou une migration) pour ajouter les colonnes `deletedAt` sur les 5 modèles — cf. base partagée (A08-002). **Sans cette étape, les requêtes échouent** (colonne absente).
- Index conseillé à terme : `@@index([organismeId, deletedAt])` sur les 5 modèles (listes filtrées).
- Régénérer le client : `prisma generate`.

## Vérification

`src/lib/__tests__/tenant-soft-delete.test.ts` couvre l'invariant de cloisonnement (`organismeId` non écrasable par le payload) + le filtre corbeille (fonction pure `softWhere`). `tsc --noEmit` OK ; suite complète **653 tests / 0 échec**.
