# Sécurité — Exploitation (PRA, incidents, secrets)

> Procédures opérationnelles de sécurité pour OF Manager (`cap-competence-manager`).
> Couvre les points §66 (plan de reprise), §77 (révocation des secrets) et §89
> (gestion des incidents) de la checklist sécurité. À réviser à chaque évolution
> majeure d'infrastructure.

---

## 1. Plan de reprise d'activité (PRA) — §66

### Objectifs
> ⚠️ Cibles **provisoires** — à confirmer par un test de restauration réel (OPS-2, cf. A09-007).
> Source unique = le tableau de `docs/PRA-SAUVEGARDE.md` ; ce fichier et `legal/SLA.md` s'y alignent.
- **RPO** (perte de données max tolérée) : **≤ 5 min** (fenêtre du point-in-time Neon, **sous réserve de la rétention du plan souscrit**).
- **RTO** (délai de remise en service) : **≤ 4 h ouvrées** (restauration manuelle : branche Neon + bascule `DATABASE_URL` + redéploiement, par un exploitant unique).

### Sauvegardes
| Élément | Mécanisme | Rétention |
|---|---|---|
| Base PostgreSQL | **Neon** — restauration point-in-time (PITR) + branches | selon le plan Neon (à confirmer / relever) |
| Fichiers (PDF, pièces) | **Vercel Blob** | ⚠️ **copie unique — PAS de versioning ni PITR** ; sauvegarde tierce chiffrée à mettre en place (A09-001) |
| Code | **GitHub** (`main`) | illimité |
| Secrets | **Variables d'env Vercel** (+ ce dépôt = liste, jamais les valeurs) | — |

> ⚠️ **À finaliser** : (a) confirmer la fenêtre de rétention PITR du plan Neon ;
> (b) mettre en place un **export périodique hors fournisseur** (dump chiffré
> hebdomadaire vers un stockage tiers) pour se prémunir d'une compromission du
> compte Neon lui-même (§63) ; (c) **tester une restauration réelle** (§65).

### Procédure de restauration base (Neon)
1. Neon Console → projet → **Branches** → « Restore » / créer une branche à un
   instant T (juste avant l'incident).
2. Récupérer la nouvelle chaîne de connexion de la branche restaurée.
3. Mettre à jour `DATABASE_URL` / `DIRECT_URL` (Vercel) vers la branche restaurée,
   **ou** promouvoir la branche en primaire.
4. Redéployer (`main`) pour que les fonctions reprennent la bonne base.
5. Vérifier : login, dashboard, une session, une facture.

### Scénarios & réponses
| Scénario | Réponse |
|---|---|
| Suppression / corruption de données | Restaurer la base à T-avant via PITR (ci-dessus) |
| Indisponibilité Neon | Attendre le rétablissement (managé) ; si prolongé, restaurer sur un autre projet |
| Indisponibilité Vercel | Managé ; le cas échéant, redéployer sur un autre hébergeur (build `standalone` déjà prévu) |
| Compromission d'un secret | Voir §2 (rotation) |
| Compromission complète | Isoler (couper les accès), roter TOUS les secrets, restaurer sur infra propre, post-mortem |

---

## 2. Rotation & révocation des secrets — §77

### Inventaire des secrets (variables d'env Vercel)
`DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_SECRET`/`AUTH_SECRET`, `SECRETS_ENCRYPTION_KEY`,
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `UPSTASH_*`, `LEAD_API_SECRET`,
`TURNSTILE_SECRET_KEY`, `CRON_SECRET`, clés par OF chiffrées en base (Brevo,
Anthropic, YouSign, Wedof) via `SECRETS_ENCRYPTION_KEY`.

### Procédure de rotation (par secret)
1. Générer une nouvelle valeur côté fournisseur (Stripe/Neon/…).
2. La poser dans **Vercel → Settings → Environment Variables** (Production).
3. **Redéployer** (`main`) pour propager.
4. **Révoquer l'ancienne** valeur côté fournisseur.
5. Vérifier le service concerné (paiement, e-mail, base…).

### Cas « secret compromis / commité dans Git » (URGENT)
1. **Roter immédiatement** le(s) secret(s) concerné(s) (étapes ci-dessus).
2. Révoquer l'ancienne valeur côté fournisseur.
3. **Purger l'historique Git** (⚠️ réécriture d'historique) :
   ```bash
   # avec git filter-repo (recommandé)
   git filter-repo --path .env --invert-paths
   # ou BFG : bfg --delete-files .env
   ```
   puis `git push --force` (coordonner avec l'équipe : tout le monde re-clone).
4. Considérer que tout secret ayant été commité est **définitivement brûlé** →
   rotation obligatoire même après purge.

> ⚠️ **Action en attente** (finding P1) : des identifiants de production ont été
> commités → **roter + purger** selon cette procédure.

### `SECRETS_ENCRYPTION_KEY`
Chiffre les clés API par OF stockées en base. **Doit être définie en production.**
Sa rotation impose de **re-chiffrer** les secrets existants (déchiffrer avec
l'ancienne, re-chiffrer avec la nouvelle) — prévoir un script de migration avant
de changer cette clé.

---

## 3. Playbook de gestion d'incident — §89

### Contacts & rôles
- **Responsable incident** : le gérant / dev principal (CAP).
- **Notification** : Sentry (erreurs), e-mails d'alerte.
- **Obligation RGPD** : en cas de violation de données personnelles, notification
  **CNIL sous 72 h** + information des personnes si risque élevé.

### Étapes (NIST : Détecter → Contenir → Éradiquer → Rétablir → Tirer les leçons)
1. **Détecter / qualifier** — source (Sentry, log, signalement), périmètre (quels
   OF, quelles données), gravité.
2. **Contenir** — couper l'accès compromis : suspendre le(s) compte(s)
   (`/administration/comptes` ou console), roter les secrets exposés, au besoin
   passer le tenant en `SUSPENDU`.
3. **Éradiquer** — corriger la faille (patch + déploiement), invalider les sessions
   (changer `NEXTAUTH_SECRET` déconnecte tout le monde ; ou régénérer les
   `activeSessionId`).
4. **Rétablir** — restaurer les données si besoin (§1), vérifier l'intégrité,
   rouvrir les accès.
5. **Post-mortem** — chronologie, cause racine, impact, actions correctives, mise à
   jour de cette procédure. Journaliser dans `AuditLog` / un registre d'incidents.

### Registre des violations (RGPD)
Tenir un registre : date, nature, données concernées, nombre de personnes, mesures
prises, notification CNIL (oui/non + date).

---

## À faire (dépendances hors code)
- [ ] Confirmer la rétention PITR Neon + activer un export chiffré hors fournisseur (§63-64).
- [ ] Réaliser un **test de restauration** documenté (§65).
- [ ] Roter + purger les secrets commités (§1/§56).
- [ ] Poser `SECRETS_ENCRYPTION_KEY` en production (§67).
- [ ] Séparer **dev / staging / prod** (§58-59) — prérequis de plusieurs autres points.
