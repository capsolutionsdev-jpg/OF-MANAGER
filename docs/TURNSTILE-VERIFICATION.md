# Captcha Turnstile — service de vérification anti-fraude

Le service public de vérification d'un titre (`ofmanager.info/verification` →
`POST ofmanager.info/api/verification`) accepte un captcha **Cloudflare Turnstile**
(RGPD-friendly, hébergé en Europe, sans reCAPTCHA Google). Il protège l'endpoint
contre les robots, en complément du rate-limit (5 tentatives / IP / 10 minutes).

> **Le service fonctionne SANS Turnstile.** Sans clés, le widget n'est pas affiché et
> l'API n'exige aucun jeton — seul le rate-limit s'applique. Configurer les clés est
> donc optionnel mais recommandé en production.

## 1. Créer le widget chez Cloudflare
1. <https://dash.cloudflare.com> → **Turnstile** → *Add widget*.
2. **Nom** : `Vérification des titres — OFManager`.
3. **Domaines** : ajouter `ofmanager.info` (et `www.ofmanager.info` si utilisé).
   > Déclarer le domaine de la PAGE (l'app), pas une API externe.
4. **Type de widget** : *Managed* (recommandé).
5. Cloudflare fournit **Site Key** (publique) et **Secret Key** (privée).

## 2. Variables d'environnement (Vercel — projet OFManager, scope *Production*)
| Variable | Valeur | Visibilité |
|---|---|---|
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Site Key | publique (widget) |
| `TURNSTILE_SECRET_KEY` | Secret Key | privée (validation serveur) |

Les deux vivent sur le **même** projet (application unique `ofmanager.info`).
Ajouter en *Settings → Environment Variables → Production*, puis **redéployer**.

## 3. Vérifier
1. Ouvrir <https://ofmanager.info/verification> : le widget Turnstile doit apparaître
   au-dessus du bouton « Vérifier ».
2. Vérification avec un numéro + une date de naissance valides → résultat affiché.
3. Contrôle négatif : un appel direct à l'API sans jeton → `400`
   `{"match":false,"message":"Vérification anti-robot requise."}`.

## Comportement de l'API
- `TURNSTILE_SECRET_KEY` **absente** → aucun jeton exigé (mode dégradé, dev). En
  **production**, l'absence de clé est *fail-closed* (captcha refusé).
- `TURNSTILE_SECRET_KEY` **présente** → le champ `turnstileToken` du corps est validé
  auprès de `challenges.cloudflare.com/turnstile/v0/siteverify`. Jeton absent ou
  invalide → `400` + message générique. Jeton à usage unique (le widget se réinitialise).

## Rappel — autres variables du service de vérification
| Variable | Rôle |
|---|---|
| `VITRINE_ORGANISME_ID` | limite la vérification aux titres de l'organisme éditeur |
| `VITRINE_BASE_URL` | base des URLs encodées dans les QR codes (défaut `https://ofmanager.info`) |
| `UPSTASH_REDIS_REST_URL` / `..._TOKEN` | rate-limit partagé entre instances (sinon compteur mémoire) |
