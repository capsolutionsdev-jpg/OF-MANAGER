// Stub vide : aliasé à la place de "server-only" dans les tests Vitest
// (le paquet "server-only" lève une erreur hors contexte RSC). Permet d'importer
// et de tester la LOGIQUE des modules marqués server-only (pricing, seats, crypto…).
export {};
