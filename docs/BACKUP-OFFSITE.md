# Sauvegarde offsite & test de restauration (A09-001 / A09-002 / A09-007)

Objectif : disposer d'une copie **chiffrée, hors du fournisseur de production (Neon/Vercel) et immuable** de la base **et** des fichiers, plus une procédure de restauration **réellement testée**. Répond aux 🔴 de l'audit 09.

## Architecture (déjà codée — inerte tant que non activée)

- **Workflow** `.github/workflows/backup-offsite.yml` (GitHub Actions, quotidien 02:00 UTC — avant les purges de 3 h). Tourne **hors** Vercel/Neon (infra GitHub) → indépendance fournisseur.
  - **Base** : `pg_dump -Fc` de Neon → chiffrement `age` → `s3://<bucket>/db/db-<horodatage>.dump.age`.
  - **Fichiers** : `scripts/backup-blobs.mjs` télécharge les blobs Vercel → `tar` → `age` → `s3://<bucket>/blobs/blobs-<horodatage>.tgz.age`.
- **Stockage tiers** : un fournisseur **différent** de Neon/Vercel (Backblaze B2, Cloudflare R2, AWS S3, Scaleway…), **région UE**, avec **object-lock/versioning** (immuabilité anti-rançongiciel) + règle de **rétention** (≥ 4 semaines recommandé).
- **Inerte par défaut** : le job ne s'exécute que si la variable de dépôt `BACKUP_ENABLED = true`.

## Mise en place — actions manuelles (ce que TOI seul peux faire)

1. **Créer un bucket** chez un fournisseur ≠ Neon/Vercel, région UE, **object-lock activé** + rétention.
2. *(OPTIONNEL — chiffrement de bout en bout)* **Générer une paire de clés `age`** : `age-keygen -o backup-age-key.txt`.
   - Conserver `backup-age-key.txt` (clé **PRIVÉE**) **hors ligne / dans un coffre** — c'est elle qui déchiffre les sauvegardes.
   - Noter la **clé publique** affichée (`age1...`) → secret `BACKUP_AGE_PUBLIC_KEY`.
   - **Sans cette étape**, les sauvegardes s'appuient sur le chiffrement au repos du bucket (+ TLS en transit) — plus simple, suffisant pour démarrer.
3. **GitHub → Settings → Secrets and variables → Actions** :
   - Variable : `BACKUP_ENABLED = true`.
   - Secrets : `BACKUP_DATABASE_URL` (= `DIRECT_URL` Neon), `BACKUP_S3_BUCKET`, `BACKUP_S3_ENDPOINT` (vide pour AWS), `BACKUP_S3_ACCESS_KEY_ID`, `BACKUP_S3_SECRET_ACCESS_KEY`, `BLOB_READ_WRITE_TOKEN` (même valeur que Vercel), et **si chiffrement** `BACKUP_AGE_PUBLIC_KEY` (`age1...`).
4. **Lancer une fois à la main** (Actions → *backup-offsite* → *Run workflow*) et vérifier les objets déposés dans le bucket.

## Test de restauration — A09-007 (critère absolu de l'audit ; ≥ 1×/an)

> C'est l'action la plus importante de tout l'audit : une sauvegarde non restaurée n'est pas une sauvegarde.

1. Télécharger le dernier `db-*.dump.age` du bucket.
2. Déchiffrer **si chiffré** : `age -d -i backup-age-key.txt db-XXXX.dump.age > db.dump` (sinon le fichier est déjà `db-XXXX.dump`).
3. Créer une **branche Neon de test** (Console Neon → Branches) et récupérer sa chaîne de connexion.
4. Restaurer : `pg_restore --no-owner --no-privileges -d "<URL_branche_test>" db.dump`.
5. Comparer **3-5 compteurs** (organismes, candidats, sessions, factures) branche vs prod.
6. **Chronométrer** le tout (RTO effectif) et noter l'écart de données (RPO effectif).
7. **Fichiers** : `age -d -i backup-age-key.txt blobs-XXXX.tgz.age | tar -xzf -` et vérifier qu'un échantillon s'ouvre.
8. **Consigner** date + RTO/RPO mesurés dans `docs/PRA-SAUVEGARDE.md` (§ Test de restauration) et `legal/registre-incidents.md`.

## Bon à savoir

- **Sauvegarde ≠ conservation légale.** Ces dumps + le PITR Neon couvrent la **reprise** (jours/semaines). La conservation **légale** (factures 10 ans, preuves Qualiopi) relève d'un archivage applicatif distinct (cf. `legal/matrice-conservation.md`, A09-021).
- **Restauration par tenant** : un dump global se restaure en entier. Pour rejouer un seul OF, restaurer vers une branche de test puis extraire par `organismeId` (A09-014).
- **Clé `age` perdue = sauvegardes illisibles** : traiter `backup-age-key.txt` comme `SECRETS_ENCRYPTION_KEY` (coffre + dépôt scellé, A09-006/A09-011).
