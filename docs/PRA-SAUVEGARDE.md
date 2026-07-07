# Plan de reprise & sauvegardes (OPS-2)

> Objectif : documenter et **tester** la restauration, et fixer des cibles RTO/RPO au SLA.

## Sauvegardes en place (Neon)

- **PITR (Point-in-Time Recovery)** Neon : restauration à un instant T dans la fenêtre de rétention du plan.
- **Branches Neon** : possibilité de créer une branche à un instant T (utile pour restaurer/inspecter sans toucher la prod).

## Cibles proposées (à inscrire au SLA)

| Indicateur | Cible proposée | Commentaire |
|---|---|---|
| **RPO** (perte de données max) | ≤ 5 min | Couvert par le PITR Neon (WAL continu). |
| **RTO** (temps de rétablissement) | ≤ 4 h ouvrées | Restauration branche + bascule `DATABASE_URL`. |
| Rétention sauvegarde | ≥ 7 j (selon plan Neon) | À relever au plan souscrit. |

## Procédure de restauration (à TESTER en conditions réelles)

1. Créer une **branche Neon** à l'instant T souhaité (console Neon → Branches → *Create from timestamp*).
2. Récupérer la chaîne de connexion de la branche.
3. **Validation hors prod** : pointer un déploiement de *staging* sur la branche, vérifier l'intégrité (comptages clés : organismes, candidats, sessions, factures).
4. Bascule prod si nécessaire : mettre `DATABASE_URL`/`DIRECT_URL` (Vercel) sur la branche restaurée, redéployer.
5. Journaliser l'incident et la restauration.

## Test de restauration (à planifier — preuve OPS-2)

- [ ] Réaliser une restauration **réelle** vers une branche de test.
- [ ] Mesurer le **temps** (RTO effectif) et l'**écart de données** (RPO effectif).
- [ ] Comparer 3–5 compteurs de contrôle (SQL) branche vs prod.
- [ ] Consigner les résultats ici (date, RTO/RPO mesurés).

## À compléter (verrouillage hébergement UE — OPS-1)

- [ ] Confirmer région **UE** pour Neon (`eu-central-1`), Vercel, Upstash, fournisseur e-mail.
- [ ] Inscrire ces localisations au **DPA** (`legal/DPA-sous-traitance.md`).
