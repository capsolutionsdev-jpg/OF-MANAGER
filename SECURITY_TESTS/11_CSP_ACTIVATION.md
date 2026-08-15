# 11 — Activation de la CSP à nonce (P1-2) — runbook

> Finding P1-2 : la CSP de production autorise `script-src 'unsafe-inline'` (neutralise l'anti-XSS).
> La CSP à nonce est **déjà codée** (`src/middleware.ts:16-52`, flag `CSP_NONCE`). L'activer n'est **pas** un changement de code : c'est une **variable d'environnement** + une **QA navigateur sur routes authentifiées**.

## Pourquoi ce n'est pas corrigé automatiquement ici
1. L'activation = poser `CSP_NONCE=true` (env Vercel), pas un commit.
2. La CSP à nonce ne s'applique qu'aux **routes authentifiées** (matcher middleware). Les routes **publiques** (login, inscription, tarifs, parcours, signer…) restent sur la CSP statique de `next.config.ts` (avec `unsafe-inline`) → l'activation ne durcit **que** l'espace connecté.
3. La vérifier exige de **se connecter** et d'inspecter les pages authentifiées (hydratation, violations CSP). Cette QA n'a pas pu être faite ici (connexion par mot de passe non réalisable). **Basculer un CSP non testé vers la prod risque de casser l'hydratation des pages authentifiées** → on ne le fait pas à l'aveugle.

## Procédure d'activation (côté toi)
1. **Préversion Vercel** (pas la prod) : ajouter `CSP_NONCE=true` sur un déploiement de préversion.
2. **QA navigateur connecté** — se connecter (ADMIN + APPRENANT + FORMATEUR) et, sur chaque grande page (dashboard, sessions, fiche candidat, facturation, e-learning) :
   - Ouvrir la console : **aucune erreur `Content-Security-Policy` / `Refused to execute inline script`**.
   - Vérifier que l'app **s'hydrate** (boutons/onglets réactifs), que les graphiques et Stripe s'affichent.
3. Si des scripts inline légitimes cassent : soit ils portent le nonce Next automatiquement (cas normal), soit isoler la source et la corriger (déplacer l'inline vers un module).
4. **Étendre au public (optionnel, plus tard)** : pour retirer `unsafe-inline` aussi des pages publiques, il faut élargir le nonce aux routes hors matcher (changement plus lourd, QA complète) — à planifier séparément.
5. Une fois la préversion validée : poser `CSP_NONCE=true` en **production**. Rollback = retirer la variable (retour immédiat à la CSP statique).

## Vérification rapide (sans connexion, ce qui est faisable)
- `CSP_NONCE=true npm run dev` : le serveur démarre sans erreur (le wrapper middleware est actif).
- `curl -sI http://localhost:3100/login` → en-tête `Content-Security-Policy` présent (CSP statique sur route publique — attendu).

## Durcissements CSP complémentaires (à tester en même temps)
- `connect-src 'self' https:` et `img-src 'self' data: blob: https:` sont **larges** (`next.config.ts:14,16`) : autorisent l'exfiltration vers tout hôte HTTPS. Les resserrer à la liste réelle (Stripe, Sentry, Vercel Blob, Anthropic, Upstash, Wedof, Brevo/Resend, Firebase) — **après** avoir dressé cette liste et testé chaque intégration, sinon risque de casse.
- `allowedOrigins: "*.vercel.app"` (`next.config.ts:103`) → restreindre au(x) domaine(s) de préversion réellement utilisés.

## État
🟡 **Code prêt, non activé.** Reste : `CSP_NONCE=true` (env) + QA connectée + (option) resserrage `connect-src`/`img-src`. Ce sont des actions **opérateur/QA**, pas un correctif de code.
