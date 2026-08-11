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
  server: {
    url: "https://app.capacademy.fr",
    // HTTPS uniquement (pas de trafic en clair).
    cleartext: false,
    // Domaines autorisés à s'ouvrir DANS la webview (le reste part au navigateur).
    allowNavigation: ["app.capacademy.fr"],
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
      backgroundColor: "#0D1B3E",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#0D1B3E",
    },
  },
};

export default config;
