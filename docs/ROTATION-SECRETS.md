# Rotation des secrets — OF Manager

> Procédure opérationnelle de rotation des secrets de production (constat **SEC-08**).
> Aucun secret n'est versionné dans le dépôt (vérifié : `git ls-files | grep -i env` = ∅ ;
> `.env*` est ignoré). Les secrets vivent **uniquement** dans les variables d'environnement
> Vercel (scope *Production*) et chez les fournisseurs.

## Quand faire tourner un secret

- **Sur incident** (fuite suspectée, départ d'un prestataire ayant eu accès, copie `.env` égarée) : **immédiatement**.
- **Préventif** : au moins une fois par an, et à chaque changement d'équipe.
- **Jamais** committer un secret ; si un secret atterrit dans un commit, le considérer **compromis** → rotation + purge de l'historique.

## Inventaire des secrets (par famille)

| Secret(s) | Rôle | Rotation côté fournisseur |
|---|---|---|
| `DATABASE_URL` (+ `DIRECT_URL`) | Postgres Neon | Régénérer le mot de passe du rôle Neon, ou nouvelle branche/endpoint |
| `AUTH_SECRET` (NextAuth) | Signature des sessions | Générer `openssl rand -base64 32` — **déconnecte tous les utilisateurs** |
| `SECRETS_ENCRYPTION_KEY` | Chiffre les clés API par OF (AES-256-GCM) | ⚠️ cas spécial — voir plus bas |
| `CRON_SECRET` | Authentifie les appels Vercel Cron | Valeur aléatoire ; mettre à jour Vercel (les crons la relisent) |
| `LEAD_API_SECRET` | Protège l'endpoint public de leads | Valeur aléatoire |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | Rate-limit partagé | Régénérer le token Upstash |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Facturation abonnement | Rouler la clé restreinte + le secret de signature du webhook |
| `RESEND_API_KEY` / `RESEND_WEBHOOK_SECRET` | E-mail transactionnel | Révoquer/recréer la clé Resend |
| `BREVO_*` | E-mail/SMS (repli UE) | Régénérer la clé Brevo |
| `ANTHROPIC_API_KEY` (clé éditeur) / clés IA par OF | Génération IA | Révoquer côté console Anthropic |
| `YOUSIGN_*`, `WEDOF_*`, `PDP_*` | E-sign / CPF / dépôt de factures | Régénérer chez le fournisseur |

> La liste exhaustive des variables attendues en prod est maintenue dans
> `docs/PROD-ENV-CHECKLIST.md`.

## Procédure standard (secret sans état chiffré)

1. **Générer** la nouvelle valeur chez le fournisseur (ou `openssl rand -base64 32`).
2. **Mettre à jour** la variable dans Vercel → *Settings → Environment Variables* (scope **Production**).
3. **Redéployer** (les variables ne sont relues qu'au déploiement / cold start) :
   `vercel --prod` ou un nouveau commit sur `main`.
4. **Révoquer l'ancienne valeur** chez le fournisseur (ne pas seulement la remplacer).
5. **Vérifier** le service concerné (paiement test, e-mail test, appel cron manuel avec le nouveau `CRON_SECRET`, génération IA).

## Cas spécial — `SECRETS_ENCRYPTION_KEY`

Cette clé **déchiffre les clés API stockées par OF** (table des secrets tenant). La faire tourner
naïvement rendrait **toutes les clés OF illisibles**. Procédure :

1. Déployer un script de **re-chiffrement** : déchiffrer chaque secret avec l'ancienne clé,
   re-chiffrer avec la nouvelle, en transaction.
2. Fenêtre de maintenance courte (ou double-clé : accepter l'ancienne en lecture le temps de la migration).
3. Une fois toutes les valeurs re-chiffrées, retirer l'ancienne clé.
4. À défaut de script, **re-saisir** les clés API de chaque OF depuis la console après rotation.

## Cas spécial — `AUTH_SECRET`

La rotation **invalide toutes les sessions** → prévenir les utilisateurs, faire tourner en heures creuses.

## Après une fuite de copie `.env`

1. Rotation **de tous** les secrets ci-dessus (ordre : base → auth → chiffrement → intégrations).
2. Vérifier les logs d'accès fournisseurs (Neon, Stripe, Resend) pour un usage anormal.
3. Détruire la copie fautive ; confirmer qu'aucun `.env` n'est tracké (`git ls-files | grep -i env`).
