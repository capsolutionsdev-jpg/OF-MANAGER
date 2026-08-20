const RUBRIQUES = [
  { key: "formation", label: "Formations (planning)" },
  { key: "inscriptions", label: "Inscriptions" },
  { key: "suivi", label: "Suivi pédagogique" },
  { key: "documents", label: "Documents" },
  { key: "factures", label: "Factures" },
];

export default function EspaceEntrepriseHome() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Votre espace est en cours de déploiement. Les rubriques ci-dessous seront
        activées très prochainement.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {RUBRIQUES.map((r) => (
          <div
            key={r.key}
            aria-disabled="true"
            className="flex items-center justify-between rounded-xl border bg-card p-4 opacity-60"
          >
            <span>{r.label}</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              Bientôt disponible
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
