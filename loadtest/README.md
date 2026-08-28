# Kit de test de charge — Audit 07 (performance)

But : mesurer **pour de vrai** comment OFMANAGER se comporte avec beaucoup de données, **sans jamais toucher à la production**. On travaille sur une **base de test isolée** (séparée, gratuite), on la remplit de fausses données, et on chronomètre les écrans lourds.

---

## Ce que vous avez à faire (2 clics) — le reste, je m'en occupe

### 1. Créer une base de test gratuite (Neon)
1. Aller sur **https://neon.tech** → se connecter → **New Project** (nom au choix, ex. « ofmanager-test »).
2. Choisir la région **Europe (Frankfurt)** (comme la prod).
3. Copier la **chaîne de connexion** (« Connection string », commence par `postgresql://…` et finit par `…sslmode=require`).

> ⚠️ Ne me donnez **jamais** la chaîne de la production. Uniquement celle de cette nouvelle base de test.

### 2. Me coller la chaîne
Collez-la ici dans le chat, ou mettez-la vous-même dans un fichier `.env.loadtest` à la racine du projet :
```
LOADTEST_DATABASE_URL="postgresql://…votre base de test…sslmode=require"
```

C'est tout. Je fais le reste : préparer la base, la remplir, lancer les mesures, et ajouter les chiffres au rapport.

---

## Ce que je lance ensuite (pour information)

> Rappel machine : Node n'est pas dans le PATH → préfixer par `C:\Program Files\nodejs`.

1. **Préparer la base** (créer les tables une fois) :
   ```bash
   "C:\Program Files\nodejs\npx" prisma db push
   ```
   (en pointant `DATABASE_URL` sur la base de test)

2. **Remplir avec du volume** (échelle `petit` / `moyen` / `grand`) :
   ```bash
   LOADTEST_CONFIRM=1 LOADTEST_SCALE=moyen "C:\Program Files\nodejs\node" loadtest/seed-loadtest.mjs
   ```
   → crée 1 organisme de test « OF Loadtest » avec des milliers de candidats, sessions, inscriptions, émargements, factures.

3. **Mesurer** les requêtes des écrans lourds :
   ```bash
   "C:\Program Files\nodejs\node" loadtest/bench-db.mjs
   ```
   → affiche p50 / p95 / max (ms) par écran + un `EXPLAIN` sur la comptabilité (détecte les scans sans index).

---

## Sécurité (garde-fous du script)

- Le générateur **n'écrit que** sur `LOADTEST_DATABASE_URL` (jamais `DATABASE_URL`/`DIRECT_URL` de prod).
- Il **refuse** de tourner si la base contient déjà d'autres organismes (signe que ce serait la prod) — sauf `LOADTEST_FORCE=1`.
- Il exige `LOADTEST_CONFIRM=1` pour écrire.
- Le chronomètre (`bench-db.mjs`) ne fait que **lire** (aucune écriture).

Quand la base de test ne sert plus, il suffit de supprimer le projet Neon (aucune trace ailleurs).
