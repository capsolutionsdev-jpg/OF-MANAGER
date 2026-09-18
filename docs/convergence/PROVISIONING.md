# Provisioning d'un tenant — runbook (Lot 4)

Script : `scripts/provision-tenant.ts`. Crée un **Organisme** (tenant) + son **administrateur** sur la base cible. Utilisé pour la convergence (ASPR d'abord, puis, si besoin, tout nouvel OF). CAP **ne se provisionne pas** ici : on réutilise son organisme éditeur existant (cf. `AUDIT-PREPARATION.md` §8.1).

## Ce que fait le script
1. Valide les entrées (nom, sous-domaine, e-mail admin, formule) — logique pure, testée.
2. **Pré-vol** : refuse si l'e-mail admin (`User.email` **unique global**) ou le sous-domaine est déjà pris.
3. Crée l'`Organisme` (`statut ACTIF`, formule, toutes fonctionnalités activées, couleur par défaut) + un `User` **ADMIN** (mot de passe temporaire, changement imposé).

Il **ne migre pas** les données métier (candidats, sessions…) — c'est le Lot 5.

## 1) Dry-run (sans base, sans risque)
```bash
npx tsx scripts/provision-tenant.ts \
  --nom "ASPR Formation" --sous-domaine aspr \
  --admin-email admin@aspr.fr --admin-nom "Admin ASPR" \
  --formule RESEAU --dry-run
```
Affiche le plan de création. N'écrit rien, ne se connecte pas.

## 2) Exécution réelle
> ⚠️ `DATABASE_URL` doit pointer sur la base **cible** (staging d'abord ; la prod uniquement après validation). Le script écrit dans cette base.

```bash
DATABASE_URL="postgresql://…" npx tsx scripts/provision-tenant.ts \
  --nom "ASPR Formation" --sous-domaine aspr \
  --admin-email admin@aspr.fr --admin-nom "Admin ASPR" \
  --formule RESEAU
```
En sortie : l'`id` de l'organisme (à noter pour l'import du Lot 5) et le **mot de passe temporaire** de l'admin (à transmettre en sécurité).

## Arguments
| Arg | Obligatoire | Exemple | Notes |
|---|---|---|---|
| `--nom` | oui | `"ASPR Formation"` | nom de l'organisme |
| `--sous-domaine` | non | `aspr` | déduit du nom si absent ; doit être libre et non réservé |
| `--admin-email` | oui | `admin@aspr.fr` | **doit être libre globalement** (unicité cross-tenant) |
| `--admin-nom` | oui | `"Admin ASPR"` | nom affiché de l'admin |
| `--formule` | oui | `RESEAU` | `INDEPENDANT` \| `PRO` \| `CROISSANCE` \| `RESEAU` |
| `--dry-run` | non | — | valide + affiche, sans écrire |

## Après le provisioning
1. Noter l'`organismeId` créé.
2. (Optionnel) Ajuster branding/logo/couleurs/clés API dans la console éditeur (`/console/organismes`).
3. Passer à l'**import des données** du tenant (Lot 5), qui écrit sous cet `organismeId` et gère la **déduplication des e-mails** en collision.

## Rappel collision e-mails (blocage n°1)
`User.email` est unique **globalement**. Si un utilisateur ASPR a le même e-mail qu'un utilisateur déjà présent (CAP éditeur, ou un autre tenant), l'import échouera. Le pré-vol du Lot 5 listera ces collisions avant tout import ; prévoir un e-mail distinct par tenant (ou un compte SUPERADMIN) pour les personnes présentes des deux côtés.
