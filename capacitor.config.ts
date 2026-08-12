import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Configuration Capacitor — app mobile OFManager (iOS + Android).
 *
 * Stratégie « webview vers la prod » : l'app native charge directement
 * https://app.capacademy.fr. Avantage = mise à jour instantanée (pas de
 * re-soumission au store à chaque changement de l'app web). Le dossier `webDir`
 * (capacitor-www) sert uniquement d'écran de repli (chargement / hors-ligne).
 *
 * Pour figer une version embarquée à la place (offline), retirer le bloc `server`
 * et pointer `webDir` vers un export statique du site.
 */
const config: CapacitorConfig = {
  appId: "fr.capacademy.ofmanager",
  appName: "OFManager",
  webDir: "capacitor-www",
  // Identifie l'app native dans le User-Agent → le serveur active le « mode
  // application » (masque l'habillage vitrine) via src/lib/native-app.ts.
  appendUserAgent: "OFManagerApp",
  server: {
    // Ouvre directement l'APPLICATION (tableau de bord → page de connexion si non connecté),
    // et NON la page d'accueil vitrine, pour un ressenti « application » et pas « site web ».
    url: "https://app.capacademy.fr/dashboard",
    // HTTPS uniquement (pas de trafic en clair).
    cleartext: false,
    // Domaines autorisés à s'ouvrir DANS la webview (le reste part au navigateur).
    allowNavigation: ["app.capacademy.fr"],
    // Si app.capacademy.fr est injoignable au lancement, afficher l'écran de repli
    // local (capacitor-www/index.html) plutôt que l'erreur réseau brute de la WebView.
    errorPath: "index.html",
  },
  ios: {
    // Évite que le contenu passe sous la barre d'état / l'encoche.
    contentInset: "always",
  },
  android: {
    backgroundColor: "#0D1B3E",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 900,
      // Fond blanc = le logo (bleu foncé sur clair) reste lisible sur toutes les
      // versions d'Android. Assets générés via `npm run gen:mobile-assets` + @capacitor/assets.
      backgroundColor: "#FFFFFF",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#0D1B3E",
    },
    // Notifications push (app mobile) — présentation en avant-plan.
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
