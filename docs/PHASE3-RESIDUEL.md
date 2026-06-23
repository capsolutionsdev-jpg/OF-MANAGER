# Phase 3 — Résiduel : playbook d'exécution des lots lourds

> Ces 4 lots ne sont **pas** des « one-shot » : ils touchent la base partagée ou
> le rendu en prod et exigent un environnement de test / une vérif navigateur.
> Ce document les rend **prêts à exécuter** une fois le prérequis levé.
>
> **2 prérequis à fournir :**
> - **(P1) Une branche Neon de test** (console Neon → Branches → « Create branch »
>   depuis `main`) → `DATABASE_URL_TEST`. Débloque RLS + extraction `Inscription`.
> - **(P2) Un déploiement de préversion Vercel** (ou un accès navigateur au projet)
>   → vérif runtime. Débloque CSP à nonces + blobs privés.

---

## Lot A — RLS PostgreSQL (ARC-01) · prérequis P1
**Objectif** : cloisonnement tenant garanti **au niveau base** (défense en profondeur,
en plus de `scopedPrisma`).

**Approche** :
1. Activer RLS + politique sur chaque table tenant (variable de session `app.org`) :
   ```sql
   ALTER TABLE "Candidat" ENABLE ROW LEVEL SECURITY;
   CREATE POLICY tenant_isolation ON "Candidat"
     USING ("organismeId" = current_setting('app.org', true));
   -- … idem pour toutes les tables portant organismeId
   ```
2. Poser la variable **par requête** dans `scopedPrisma` (sinon RLS renvoie vide) :
   envelopper chaque opération dans une transaction qui exécute d'abord
   `SELECT set_config('app.org', $org, true)`. Adapter `lib/tenant.ts`.
3. Prévoir un rôle « bypass » (migrations, console SUPERADMIN) hors RLS.

**Risque** : si l'étape 2 n'est pas parfaite, **l'app ne voit plus aucune donnée**.
→ **tester sur la branche Neon (P1)**, valider le test d'isolation, puis appliquer.

**Garde-fou existant** : `organismeId` doit d'abord passer **NOT NULL** (backfill).

### ⚠️ Prérequis bloquant découvert (test du 2026-06-23 sur `test-rls`)
Le rôle de connexion par défaut de Neon (`neondb_owner`) possède l'attribut
**`BYPASSRLS`** → la RLS (même `FORCE`) est **totalement ignorée**. Preuve mesurée :
`SELECT count(*) FROM "Candidat"` renvoie **toutes** les lignes sans variable de
session. La RLS exige donc, AVANT tout :
1. **Créer un rôle applicatif dédié SANS BYPASSRLS** :
   `CREATE ROLE app_rls LOGIN PASSWORD '…' NOBYPASSRLS;`
   `GRANT USAGE ON SCHEMA public TO app_rls;`
   `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_rls;`
   `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT … TO app_rls;`
2. **L'app se connecte avec ce rôle** (nouvelle `DATABASE_URL`), pas le owner.
3. Le owner reste pour les migrations / la console (chemin BYPASS).

→ RLS = vrai **chantier infra + archi** (rôle dédié + 2 connexions + plombage
`scopedPrisma`), à planifier ; ce n'est pas un patch applicatif. La protection
actuelle (scopedPrisma + test d'isolation en CI) reste la garantie de premier niveau.

### ✅ Conception VALIDÉE sur la branche de test (2026-06-23)
Avec un rôle **`app_rls` NOBYPASSRLS** + politique + `set_config('app.org', …, true)`
par transaction, mesuré sur `test-rls` (table `Candidat`, 41 lignes / 1 org = 29) :
| Contexte | Résultat | Attendu |
|---|---|---|
| sans variable de session | **0** | 0 (bloqué) ✅ |
| `app.org = <orgId>` | **29** | tenant seul ✅ |
| `app.org = 'BYPASS'` | **41** | tout (console/flux publics) ✅ |

**Implémentation prod (rollout COORDONNÉ — tout doit basculer ensemble) :**
1. **Neon (console)** : `CREATE ROLE app_rls LOGIN PASSWORD '…' NOBYPASSRLS;` +
   `GRANT USAGE ON SCHEMA public` + `GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES`
   + `ALTER DEFAULT PRIVILEGES … GRANT … TO app_rls;`
2. **Policies** : sur les ~48 tables portant `organismeId`, `ENABLE`+`FORCE ROW
   LEVEL SECURITY` + policy `USING (organismeId = current_setting('app.org',true)
   OR current_setting('app.org',true) = 'BYPASS')`.
3. **`scopedPrisma`** : envelopper chaque opération dans une transaction qui pose
   d'abord `set_config('app.org', organismeId, true)`.
4. **Chemins `prisma` brut** (login = table User, hors RLS, OK ; **flux publics par
   token** parcours/dossier ; **console cross-tenant** ; **crons**) : poser
   `set_config('app.org','BYPASS', true)` → helper `bypassPrisma`.
5. **Bascule** : `DATABASE_URL` (app) → rôle `app_rls` ; le owner reste pour
   migrations/console. **Les étapes 1→5 doivent être livrées d'un bloc** (sinon
   l'app ne voit plus rien). Tester sur `test-rls` avant la prod.

---

## Lot B — Extraction du god-model `Inscription` (ARC-03) · prérequis P1
**Objectif** : sortir les ~25 champs « parcours » (tokens + dates + JSON :
positionnement, convocation, satisfaction, satisfaction entreprise, suivi 6 mois,
contrats…) vers une table dédiée `ParcoursInscription` (1-1).

**Approche** :
1. Créer le modèle `ParcoursInscription { inscriptionId @unique, … }`.
2. Migration de données : copier les colonnes existantes → nouvelle table.
3. Mettre à jour les lectures/écritures (`parcours-actions`, génération de docs,
   `suivi6mois`, crons…) — **nombreuses références**.
4. Supprimer les colonnes de `Inscription` (dernière étape, après bascule).

**Risque** : migration de données + large surface de code. **Test sur P1 obligatoire**,
bascule en plusieurs migrations (ajout → copie → bascule code → suppression).

---

## Lot C — Blobs privés (SEC-01 résiduel) · prérequis P2
**État** : `@vercel/blob@2.4.0` supporte `access: 'private'`. SEC-01 est **déjà
mitigé** par le proxy authentifié `/api/public/piece/[id]` (l'URL brute n'est jamais
exposée) — ce lot est un **durcissement** supplémentaire.

**Approche** :
1. `storeUpload` : ajouter un paramètre `access` ; passer les **pièces sensibles**
   (dossier candidat, factures formateur) en `access: 'private'`.
2. Le proxy doit récupérer le contenu **authentifié** (SDK `@vercel/blob`, pas un
   `fetch` d'URL publique).

**Risque** : ne fonctionne qu'avec le **runtime Vercel Blob** (token) → **vérifier
sur préversion (P2)** que les pièces restent accessibles via le proxy.

---

## Lot D — CSP à nonces (SEC-05) · prérequis P2
**Objectif** : supprimer `'unsafe-inline'` des `script-src` (réduit la surface XSS).

**Approche** :
1. Générer un nonce dans le middleware, le passer en en-tête `x-nonce` + l'inclure
   dans l'en-tête CSP de la réponse (`script-src 'nonce-…' 'strict-dynamic'`).
2. Déplacer la CSP de `next.config.ts` (statique) vers le **middleware** (dynamique).
3. Propager le nonce aux scripts tiers/inline (ex. `next-themes` prop `nonce`).
4. `style-src` peut conserver `'unsafe-inline'` (styles de thème tenant).

**Risque** : un nonce mal propagé **bloque les scripts → page blanche**. Rayon
d'impact maximal. **Vérifier sur préversion (P2)** (login, dashboard, thème).

---

## Récapitulatif
| Lot | Prérequis | Risque | Effort |
|---|---|---|---|
| A — RLS | P1 (branche Neon test) | Élevé (app aveugle si raté) | L |
| B — Extraction `Inscription` | P1 | Élevé (migration données) | L |
| C — Blobs privés | P2 (préversion) | Moyen (accès docs) | M |
| D — CSP nonces | P2 | Élevé (page blanche) | M |

> Dès que tu fournis **P1** et/ou **P2**, j'exécute le(s) lot(s) correspondant(s)
> avec vérification (test d'isolation pour A/B, préversion pour C/D) puis commit.
