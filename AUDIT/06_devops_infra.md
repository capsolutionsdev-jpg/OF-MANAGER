# 06 — DevOps / SRE

> Fiche d'audit (Livrable 2). Constats sourcés. **Aucune correction appliquée.**

## DevOps / SRE

### 1. Périmètre analysé
- CI : [.github/workflows/ci.yml](../.github/workflows/ci.yml).
- Déploiement : [vercel.json](../vercel.json), [next.config.ts](../next.config.ts), [docs/DEPLOIEMENT.md](../docs/DEPLOIEMENT.md).
- Secrets/chiffrement : [src/lib/crypto.ts](../src/lib/crypto.ts), variables d'env.
- Crons : `api/cron/parcours`, `api/cron/rgpd-purge`, `api/cron/suspend-trials`.
- Hébergement réel constaté (audit en cours) : VPS **OVH** (`144.217.82.164`, nginx/Ubuntu) vs cible **Vercel** + base **Neon**.

### 2. Constats — CI/CD, hébergement, secrets, supervision

| ID | Description | Fichier:ligne | Sévérité | Impact |
|----|-------------|---------------|----------|--------|
| OPS-01 | **Crons non authentifiés si `CRON_SECRET` absent.** La protection est conditionnelle (`if (secret) {…}`) : variable non définie ⇒ endpoints ouverts. Or `/api/cron/rgpd-purge` **anonymise des données** et `parcours` envoie des e-mails. | [api/cron/parcours/route.ts:9-17](../src/app/api/cron/parcours/route.ts) | **Critique** | Déclenchement public d'anonymisation/d'envois (perte de données, spam) si l'env n'est pas réglé. |
| OPS-02 | **Secret de cron accepté en query string** (`?secret=`) → journalisé dans les logs/accès, fuite possible. | [api/cron/parcours/route.ts:13-14](../src/app/api/cron/parcours/route.ts) | Majeure | Exfiltration du secret via logs/Referer. |
| OPS-03 | **Écart prod réelle ↔ cible.** La prod servie (`app.ofmanager.fr`) tourne sur un **VPS OVH** avec une **ancienne version** (pas de CSP), alors que le repo cible Vercel. Déploiement non reproductible, source de vérité floue. | `DEPLOIEMENT.md` vs DNS observé | Majeure | Mises à jour non déployées ; divergence code/prod ; responsabilité hébergeur à clarifier. |
| OPS-04 | **`SECRETS_ENCRYPTION_KEY` optionnelle = clés API tenant en clair.** Sans la variable, `crypto.ts` est un no-op : les clés Brevo/Anthropic/Yousign sont **stockées en clair** en base. | [crypto.ts:13-17,20-24](../src/lib/crypto.ts) | Majeure | Fuite de secrets tenant si la base est exposée et la clé non configurée (renvoi `07`). |
| OPS-05 | **Migrations via `db push` → pas de reproductibilité.** Impossible de reconstruire la base à l'identique ; pas de procédure de rollback de schéma. | `prisma/migrations/` (gelé) | Majeure | Restauration/clonage d'environnement risqués (renvoi DB-04). |
| OPS-06 | **Sauvegardes & supervision non documentées/vérifiées.** Pas de runbook de backup/restore (Neon PITR présumé mais non attesté), pas d'outil de supervision/alerting (erreurs, uptime), pas de traçage corrélé tenant. | repo (absence) | Majeure | RTO/RPO inconnus ; incidents non détectés (enjeu RGPD : disponibilité/intégrité). |

### 3. Corrections proposées
- **OPS-01/02** : rendre `CRON_SECRET` **obligatoire** (refus 401 si absent) et n'accepter que l'en-tête `Authorization: Bearer` (supprimer le `?secret=`). Vérifier que `rgpd-purge` et `suspend-trials` appliquent la même garde.
- **OPS-03** : statuer sur l'hébergement (bascule Vercel + DNS, ou mise à jour maîtrisée du VPS) ; documenter une **procédure de déploiement unique** et reproductible.
- **OPS-04** : définir `SECRETS_ENCRYPTION_KEY` en prod (obligatoire si des clés tenant existent) + re-chiffrer l'existant ; idéalement échouer au démarrage si des secrets chiffrés sont présents sans clé.
- **OPS-05** : baseline de migrations propre + politique « migrations versionnées en prod ».
- **OPS-06** : documenter backups (PITR Neon, fréquence, test de restauration) ; brancher une supervision (Sentry + uptime) et des logs corrélés `organismeId`.

### 4. AVIS DU SPÉCIALISTE
**Outillage de déploiement correct, mais des trous d'exploitation à fort impact.** Le repo est « cloud-ready » (CI présente, `output: standalone` pour Docker, Chromium serverless configuré, crons déclarés, en-têtes de sécurité). Les vrais risques sont **opérationnels** : crons potentiellement ouverts (OPS-01) — le plus grave car lié à l'anonymisation —, secret de cron en query string (OPS-02), **écart entre la prod réelle (OVH, ancienne) et la cible (Vercel)** (OPS-03), chiffrement des secrets optionnel (OPS-04), et **absence de runbook backups/supervision** (OPS-06). Côté **hébergement UE** : OVH (France) et Neon (région UE à confirmer) sont compatibles RGPD, à attester formellement. Ce sont des correctifs de configuration/process, peu de code, mais indispensables avant exploitation sérieuse.

### 5. AMÉLIORATIONS À AJOUTER
1. **IaC léger** (variables d'env documentées + checklist de provisioning reproductible).
2. **Supervision** : Sentry (erreurs), uptime/healthcheck, alertes cron (échec d'exécution).
3. **Environnement de staging** branché sur une branche Neon dédiée.
4. **Secrets gérés** (Vercel env + rotation documentée), `SECRETS_ENCRYPTION_KEY` obligatoire.
