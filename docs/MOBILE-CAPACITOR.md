# App mobile OFManager — Capacitor (iOS + Android)

L'app native est un **conteneur Capacitor** qui charge directement `https://app.capacademy.fr`
(cf. `capacitor.config.ts`). Avantage : chaque mise à jour du site web est **immédiate** dans
l'app, sans re-soumettre au store. Le PWA (manifest + service worker) reste utilisé côté web.

## Ce qui est déjà en place (cette branche `feat/mobile-capacitor`)
- Dépendances : `@capacitor/core` `cli` `ios` `android` `app` `status-bar` `splash-screen`.
- `capacitor.config.ts` : appId `fr.capacademy.ofmanager`, mode serveur → prod, splash/status bar à la charte.
- `capacitor-www/index.html` : écran de chargement / hors-ligne (repli, à la charte navy).

## Prérequis (sur TA machine — je ne peux pas les exécuter)
- **Node 18+** (déjà là).
- **Android** : [Android Studio](https://developer.android.com/studio) (SDK + Gradle) + un JDK 17.
- **iOS** : **macOS** + **Xcode** + CocoaPods (`sudo gem install cocoapods`). *iOS est impossible à builder sous Windows.*

## 1) Ajouter les plateformes natives (une seule fois)
```bash
npx cap add android
npx cap add ios        # macOS uniquement
```
Cela crée les dossiers `android/` et `ios/` (projets natifs).

## 2) Générer les icônes & splash (depuis un logo)
Place un logo carré ≥ 1024×1024 en `resources/icon.png` et un fond en `resources/splash.png`, puis :
```bash
npm i -D @capacitor/assets
npx capacitor-assets generate --iconBackgroundColor "#0D1B3E" --splashBackgroundColor "#0D1B3E"
```

## 3) Synchroniser après chaque changement de config / plugin
```bash
npx cap sync
```

## 4) Lancer / builder
```bash
npx cap open android     # ouvre Android Studio → Run (émulateur ou tél USB)
npx cap open ios         # ouvre Xcode → Run (macOS)
```

## 5) Publier
- **Android** : dans Android Studio, *Build → Generate Signed App Bundle* (`.aab`) → [Play Console](https://play.google.com/console) (compte dev **25 $ une fois**).
- **iOS** : dans Xcode, *Product → Archive* → App Store Connect ([compte Apple Developer **99 $/an**](https://developer.apple.com/programs/)).

## Points d'attention
- **Apple – Guideline 4.2 (minimum functionality)** : Apple peut refuser une app qui n'est
  « qu'un site web ». On a des atouts natifs à activer pour y répondre : **scan de documents**
  (déjà en PWA), **notifications push**, accès **caméra**. Si besoin, on ajoute
  `@capacitor/push-notifications` + `@capacitor/camera` (lot suivant).
- **Domaine** : l'app pointe sur `app.capacademy.fr`. Si le domaine change, éditer `server.url`
  ET `allowNavigation` dans `capacitor.config.ts`, puis `npx cap sync`.
- **Login** : la connexion se fait dans la webview (cookies de session gérés par le WKWebView /
  Android WebView). RAS à prévoir.
- **`android/` et `ios/`** ne sont pas committés par défaut (générés) ; on peut les versionner
  plus tard si on ajoute du code natif custom.

## Prochains lots possibles
- Notifications push (rappels de session, dossiers à compléter) via `@capacitor/push-notifications` + FCM/APNs.
- Ouverture de la caméra native pour le scan (meilleure qualité que l'input web).
- Deep links (`app.capacademy.fr/...` → écran de l'app).

---

## 📋 État & checklist de publication (audit multi-agents du 2026-08-11)

**Verdict build : l'app Android compile et se lance EN L'ÉTAT, sans changer une ligne de code.**
`applicationId` = `fr.capacademy.ofmanager` cohérent partout · `targetSdk 36` (≥ plancher Play API 35) ·
permission `INTERNET` présente · `cleartext:false` aligné avec un `server.url` HTTPS · toolchain cohérente
(Gradle 8.14.3 / AGP 8.13 / JDK 21 du JBR d'Android Studio, SDK 36 téléchargé au 1er build).
➡️ Ouvrir `android/` dans Android Studio → **Run** → l'app charge `app.capacademy.fr` et on se connecte.
Un **Run debug ne nécessite AUCUNE signature** (contrairement à l'AAB de publication).

### ✅ Fait le 2026-08-11
- **Branding natif** : icônes (toutes densités + adaptive + round) et splash générés à la marque OFManager
  depuis `public/ofmanager-logo.png`. Images sources versionnées dans `assets/`, outil `@capacitor/assets`
  en devDependency, **régénérables via `npm run gen:mobile-assets`**. → clôt le blocueur n°1 de l'audit
  (icône Capacitor générique = rejet Play quasi-certain).
- `capacitor.config.ts` : splash `backgroundColor` en **blanc** (logo bleu foncé sur clair → lisible sur
  toutes les versions Android) ; `server.errorPath: "index.html"` pour afficher l'écran de repli hors-ligne.

> ⚠️ **Correction importante** : le **scan de documents par la caméra n'est PAS fonctionnel** en l'état —
> l'en-tête `Permissions-Policy: camera=()` (`next.config.ts`) + l'absence de permission `CAMERA` au
> manifeste le bloquent. **Ne pas le présenter comme fonction native** aux stores tant que ce n'est pas corrigé.

### Avant publication — tâches CODE (repo `cap-competence-manager`, à valider avant de les appliquer)
| P | Tâche | Où |
|---|---|---|
| P0 | **Page de confidentialité PUBLIQUE** (accessible sans login) décrivant les données traitées par l'app (identité, e-mails, pièces/photos). Aujourd'hui `/rgpd` et `/mentions-legales` sont sous le groupe `(app)` → redirigés vers `/login`. Exigé par Play (Data Safety) ET Apple (5.1.1). | nouvelle route hors `(app)` ou exclusion du matcher `src/middleware.ts` |
| P1 | **Stripe dans la webview** : `Souscrire` / `Gérer l'abonnement` pointent vers `checkout.stripe.com` / `billing.stripe.com` (hors `allowNavigation`) → s'ouvrent dans le navigateur système et le retour retombe sur le login. + risque Apple IAP 3.1.1. | `@capacitor/browser`, ou masquer le checkout si `isNativePlatform` |
| P1 | **Caméra** (si on veut le scan natif) : relâcher `Permissions-Policy` (`camera=(self)`) + ajouter la permission `CAMERA`, ou passer au plugin `@capacitor/camera`. | `next.config.ts` + manifeste |
| P2 | **Vidéos e-learning** YouTube/Vimeo bloquées par la CSP `frame-src` (déjà cassé sur le site prod). | `next.config.ts` (+ `src/middleware.ts` si `CSP_NONCE`) |
| P2 | **PDF** (titres/diplômes/factures) ouverts en `window.open(_blank)` → hors app / page blanche en webview. | composants `*-actions-menu`, via `@capacitor/browser` |
| P2 | **`allowBackup=false`** (données de session sensibles). ⚠️ `android/` étant régénérable, à réappliquer après tout `cap add`. | `android/app/src/main/AndroidManifest.xml` |

### Avant publication — tâches À TOI (comptes / machine / décisions métier)
| P | Tâche |
|---|---|
| P1 | **Signature** : créer un keystore d'upload + activer **Play App Signing**, générer l'AAB signé (Android Studio → Build → Generate Signed App Bundle). Keystore hors du dépôt. |
| P1 | **Play Console** : compte dev (**25 $** une fois), formulaire **Data Safety**, classification de contenu, fiche (catégorie « Entreprise / Métier »). |
| P1 | **Apple** (plus tard, nécessite un Mac) : `npx cap add ios`, compte Apple Developer (**99 $/an**), et surtout le **compte démo dans les notes de revue** (`demo@academie-demo.fr` / `Demo2026!`) — sinon rejet immédiat (tout est derrière login). |
| P1 | **Décision « Minimum Functionality »** (Apple 4.2 / Play) : l'app est un wrapper web derrière login → risque de refus. Atténuer via branding (fait), positionnement « console de gestion pro », et/ou une vraie fonction native (push = Lot 4). Repli : distribution interne/fermée (Apple Business Manager / test interne Play). |
| P2 | **`versionCode`** : l'incrémenter strictement à chaque upload store. |
| P2 | **Assets de fiche** : captures d'écran *device* réelles + feature graphic 1024×500. |

### Lot 4 — Notifications push (APRÈS la 1re mise en ligne Android)
Pas nécessaire pour builder/publier, mais c'est la meilleure « vraie fonction native » pour atténuer le
risque Apple 4.2 + apporter des rappels (session J-1, pièce manquante, signature en attente).
- `npm i @capacitor/push-notifications` + `npx cap sync` (le `build.gradle` applique déjà `google-services`
  si `google-services.json` est présent).
- **À toi** : projet **Firebase/FCM** (`google-services.json` → `android/app/`) ; clé **APNs** `.p8` (Apple) pour iOS.
- **Code** : enregistrement du token (gaté `isNativePlatform`) → endpoint + table `DeviceToken` (Prisma + `db push`) ;
  envoi via FCM HTTP v1 sur événements métier.

### Textes de fiche store (brouillon à ajuster)
- **Nom** : OFManager
- **Sous-titre** : Gestion d'organisme de formation
- **Description courte (≤ 80)** : Pilotez votre centre de formation : candidats, sessions, documents, émargement.
- **Description longue** : OFManager est la console de gestion des organismes de formation : inscriptions et
  dossiers candidats, sessions et planning, convocations / attestations / contrats, émargement, signature
  électronique, conformité Qualiopi et suivi commercial — depuis votre mobile, synchronisé avec votre espace web.
- **Mots-clés** : organisme de formation, OF, Qualiopi, émargement, formation, CRM, gestion

---

## Notifications push — code prêt (branche `feat/mobile-push`)

Le code est en place ; il ne s'**active** qu'une fois tes comptes + la base configurés (sinon no-op sûr).

**Ce qui est codé :**
- Plugin `@capacitor/push-notifications` + config (`capacitor.config.ts` → `PushNotifications`).
- `src/components/push/push-registrar.tsx` : demande la permission et envoie le jeton d'appareil au serveur — **app native uniquement**, sans effet sur le web. Monté dans `(app)/layout.tsx`.
- `POST /api/push/register` : stocke le jeton dans la table **`DeviceToken`** (Prisma).
- `src/lib/push.ts` → `sendPushToUser(userId, { title, body, data })` : envoi via Firebase (purge les jetons morts).

**⚠️ Avant de merger cette branche : `npx prisma db push` sur la prod** (crée la table `DeviceToken`, sinon la prod casse).

**À toi (comptes / fichiers) :**
1. Créer un **projet Firebase**, y ajouter l'app Android `fr.capacademy.ofmanager` → télécharger **`google-services.json`** → le placer dans `android/app/`, et brancher le plugin Gradle `google-services` (voir la doc officielle `@capacitor/push-notifications`, section Android).
2. iOS (plus tard, sur Mac) : clé **APNs `.p8`** (Apple Developer) importée dans Firebase.
3. Firebase → Paramètres → Comptes de service → **Générer une clé privée** (JSON).

**Variables d'environnement (Vercel + local) :**
- `PUSH_ENABLED=true`
- `FIREBASE_SERVICE_ACCOUNT` = le JSON du compte de service (brut, ou encodé en base64).

**Envoyer une notification** (exemple à brancher sur un événement métier) :
```ts
import { sendPushToUser } from "@/lib/push";
await sendPushToUser(userId, {
  title: "Rappel de session",
  body: "Votre session commence demain à 9 h.",
});
```
