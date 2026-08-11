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
