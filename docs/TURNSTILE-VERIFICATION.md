# Captcha Turnstile — service de vérification anti-fraude

Le service public de vérification d'un titre (`capacademy.fr/verification` →
`POST app.capacademy.fr/api/verification`) accepte un captcha
**Cloudflare Turnstile** (RGPD-friendly, hébergé en Europe, pas de reCAPTCHA
Google). Il protège l'endpoint contre les robots, en complément du rate-limit
(5 tentatives / IP / 10 minutes).

> **Le service fonctionne SANS Turnstile.** Si les clés ne sont pas définies, le
> widget n'est pas affiché et l'API n'exige aucun jeton — seul le rate-limit
> s'applique. Configurer les clés est donc optionnel mais recommandé en
> production.

## 1. Créer le widget chez Cloudflare

1. Se connecter à <https://dash.cloudflare.com> → **Turnstile** → *Add widget*.
2. **Nom** : `Vérification des titres — CAP Compétences`.
3. **Domaines** : ajouter `capacademy.fr` (et `www.capacademy.fr` si utilisé).
   > Le domaine à déclarer est celui de la PAGE (le site vitrine), pas celui de
   > l'API.
4. **Type de widget** : *Managed* (recommandé).
5. Cloudflare fournit deux clés :
   - **Site Key** (publique, s'affiche dans la page) ;
   - **Secret Key** (privée, ne doit jamais être exposée).

## 2. Définir les variables d'environnement (Vercel)

| Projet | Variable | Valeur | Visibilité |
|---|---|---|---|
| **Vitrine** (capacademy.fr) | `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Site Key | publique |
| **Manager** (app.capacademy.fr) | `TURNSTILE_SECRET_KEY` | Secret Key | privée |

Dans Vercel : *Project → Settings → Environment Variables* → ajouter la variable
pour **Production** (et Preview si souhaité), puis **redéployer** le projet
concerné (les variables ne sont prises en compte qu'au build/déploiement).

## 3. Vérifier

1. Ouvrir <https://capacademy.fr/verification> : le widget Turnstile doit
   apparaître au-dessus du bouton « Vérifier ».
2. Lancer une vérification avec un numéro + une date de naissance valides : le
   résultat doit s'afficher normalement.
3. Contrôle négatif : un appel direct à l'API sans jeton doit renvoyer
   `400` avec `{"match":false,"message":"Vérification anti-robot requise."}`.

## Comportement de l'API

- `TURNSTILE_SECRET_KEY` **absente** → aucun jeton exigé (mode dégradé, dev).
- `TURNSTILE_SECRET_KEY` **présente** → le champ `turnstileToken` du corps de la
  requête est validé auprès de `challenges.cloudflare.com/turnstile/v0/siteverify`.
  Jeton absent ou invalide → `400` + message générique anti-robot.
- Le jeton est à usage unique : la page réinitialise le widget après chaque envoi.

## Rappel — autres variables du service de vérification

| Variable | Projet | Rôle |
|---|---|---|
| `VITRINE_ORGANISME_ID` | Manager | limite la vérification aux titres de l'organisme |
| `VITRINE_BASE_URL` | Manager | base des URLs encodées dans les QR codes (défaut `https://capacademy.fr`) |
| `UPSTASH_REDIS_REST_URL` / `..._TOKEN` | Manager | rate-limit partagé entre instances (sinon compteur mémoire) |
