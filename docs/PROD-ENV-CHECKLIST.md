# Checklist des variables d'environnement de PRODUCTION (SEC-2)

> À compléter dans **Vercel → Project → Settings → Environment Variables** (scope *Production*), puis **redéployer**. Ne jamais committer ces valeurs.

## Bloquantes avant vente externe

| Variable | Rôle | Comment l'obtenir |
|---|---|---|
| `SECRETS_ENCRYPTION_KEY` | Chiffre les secrets stockés (clés API tenant, TOTP). **Sans elle, `decryptSecret` échoue.** | Générer : `openssl rand -base64 32`. **Après l'avoir posée, re-saisir les clés API** dans l'app (les anciennes valeurs chiffrées avec une autre clé deviennent illisibles). |
| `RLS_ENABLED` | Active le filtrage RLS PostgreSQL (SEC-1). | Poser `true` **uniquement après** avoir basculé `DATABASE_URL` sur le rôle non-owner (cf. `docs/RLS-ACTIVATION.md`). |
| `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | Rate-limit **partagé** (anti-brute-force login) robuste en serverless. Sans elles, limiteur en mémoire par instance (protection dégradée). | Console Upstash (base Redis, région **UE**). |
| `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` (+ `NEXT_PUBLIC_STRIPE_*`) | Paiements/abonnements. | Dashboard Stripe (mode live). Vérifier l'endpoint webhook prod. |

## Déjà nécessaires au fonctionnement (vérifier la présence)

| Variable | Rôle |
|---|---|
| `DATABASE_URL` / `DIRECT_URL` | Postgres Neon (pooled / direct). Région **UE** (`eu-central-1`). |
| `AUTH_SECRET` (NextAuth) | Signature des sessions JWT. |
| `APP_URL` / `AUTH_URL` | Domaine public `https://ofmanager.info` (jamais `*.vercel.app`). |
| Fournisseur e-mail (`RESEND_*` ou équivalent) | Envoi des e-mails transactionnels. |

## Procédure de re-saisie des clés API (après pose de `SECRETS_ENCRYPTION_KEY`)

1. Poser `SECRETS_ENCRYPTION_KEY` en prod, redéployer.
2. Dans l'app (réglages organisme), re-saisir chaque secret tenant (clés API, TOTP le cas échéant) : ils seront re-chiffrés avec la nouvelle clé.
3. Vérifier un flux consommant un secret (ex. envoi e-mail / paiement).

## Contrôle final

- [ ] Toutes les variables bloquantes présentes en *Production*.
- [ ] Redéploiement effectué.
- [ ] Login + rate-limit OK ; e-mail transactionnel OK ; paiement test OK.
- [ ] `RLS_ENABLED=true` **seulement** après le runbook RLS.
