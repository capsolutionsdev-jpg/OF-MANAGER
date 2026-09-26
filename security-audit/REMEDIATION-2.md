# OFManager — Remédiation lot #2 (fast-follow)

> Branche : `security/audit-fast-follow-2` (base `origin/main` @ `63fa7cd`, qui inclut déjà le lot #1 mergé PR #54).
> Analyse préalable : workflow `wf38zkgfk` (8 items étudiés en read-only → plan de patch + risque).
> Vérif : `tsc --noEmit` OK, `eslint` OK, `vitest` 800 passed / 0 échec.

## ✅ Appliqué (sûr, additif) — commit `c036df4`

| Finding | Correctif |
|---|---|
| **OFM-18** (devis cross-tenant) | `createDevis` vérifie que `entrepriseId` appartient au tenant (`findFirst` scopé) avant insert — sinon un devis pouvait référencer puis exposer (via `include: { entreprise }`) la PII d'une entreprise d'un autre OF. |
| **OFM-26** (oracle Wedof) | Webhook Wedof : réponse identique (401) pour organisme inconnu et signature invalide → supprime l'énumération d'organismes. |
| **OFM-25** (anti-rejeu Wedof) | Documenté : Wedof n'émet ni horodatage ni nonce → pas de fenêtre Svix possible ; le contrôle réel = upsert idempotent + garde d'ordre `wedofOrderedWhere` (déjà en place). |
| **OFM-40** (cache PDF) | `Cache-Control: private, no-store` sur le dossier PDF candidat (PII) + normalisation des 3 helpers d'export (PDF/CSV/XLSX → couvre toutes les routes d'export). |

## ⏸️ Différé — décision requise (NON appliqué, à raison)

Ces 5 items sont **plus risqués ou non additifs** — je ne les précipite pas dans une branche auto-mergée.

| Finding | Risque | Pourquoi différé | Ce qu'il faut |
|---|---|---|---|
| **OFM-19** jeton d'invitation entreprise en clair | Medium | **Exige une migration Prisma** (`inviteToken` → `inviteTokenHash`) + **`db push`** coordonné avec le déploiement ; les invitations déjà envoyées (token clair dans l'e-mail) doivent être gérées. Non additif. | Ton feu vert + un `db push` (comme le socle B2B). Les liens d'invitation en attente devront être renvoyés. |
| **OFM-24** anti-double-paiement heuristique (10 s) | **High** | TOCTOU (deux soumissions concurrentes passent) **et** faux positif destructeur (2ᵉ règlement légitime identique < 10 s avalé → paiement perdu). Exige une **migration** (clé d'idempotence unique sur `Paiement`) + modif UI. Chemin **paiement**. | Décision produit + migration + revue humaine. |
| **OFM-39** provisioning civique non idempotent | Medium | `civicMentions: { push }` rejoué à chaque livraison Stripe. N'empêche pas l'accès (dédup via `Set` en aval) mais gonfle les données. Chemin fulfillment payé. | Petit correctif (dédup avant push) — faisable, mais sur un chemin payé → à valider. |
| **OFM-21** PII sur Vercel Blob public | High | Bascule `access:'private'` **cassante** : casse tout `fetch(urlBrute)` serveur (téléchargements staff/candidat/B2B, visionneuse, ZIP Qualiopi) si les 4 lecteurs ne migrent pas dans le même commit. + les blobs **déjà écrits restent publics** (migration de données). **Chantier.** Mitigé aujourd'hui : aucune URL brute n'est rendue en `href/src` (proxies authentifiés par ID), le leak résiduel = l'URL sérialisée dans les payloads RSC. | Un vrai chantier dédié (URL signées + migration). |
| **OFM-20** SSRF via rendu PDF Chromium | Medium | Interception réseau sur le chemin de rendu **partagé par TOUS les PDF** : un filtre trop strict casse polices/logos ; `org.logoUrl` **peut légitimement** être une URL externe. Une erreur fait pendre la génération jusqu'au timeout. | Revue + tests de rendu ; allow-list construite avec soin (self + fonts Google + data: + domaines logos légitimes) + blocage IP privées/metadata. |

> Détail complet des plans (patchs exacts, ancrages, impact) : sortie du workflow `wf38zkgfk` (journal des agents).

## Recommandation
Publier `security/audit-fast-follow-2` (lot sûr) dès maintenant. Traiter ensuite, **une par une et avec revue** : d'abord **OFM-39** (petit, dédup) et **OFM-20** (SSRF, avec tests de rendu), puis les 2 qui demandent un `db push` (**OFM-19**, **OFM-24**) en fenêtre de déploiement maîtrisée, et enfin **OFM-21** (chantier Blob privé).
