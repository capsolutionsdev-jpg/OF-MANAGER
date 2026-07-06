// Squelette affiché pendant le chargement des pages de l'espace connecté.
// Effet « shimmer » (vague de lumière) + silhouette réaliste de page :
// en-tête, cartes KPI, tableau — améliore fortement la vitesse perçue.
function Sk({ className }: { className: string }) {
  return <div className={`skeleton-shimmer rounded-lg ${className}`} />;
}

export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Chargement en cours">
      {/* En-tête de page */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <Sk className="h-7 w-56" />
          <Sk className="h-4 w-80 max-w-full" />
        </div>
        <Sk className="h-8 w-36" />
      </div>

      {/* Cartes KPI */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-xl bg-card p-5 ring-1 ring-foreground/[0.06]">
            <div className="flex items-start justify-between">
              <Sk className="h-4 w-24" />
              <Sk className="h-9 w-9 rounded-lg" />
            </div>
            <Sk className="h-8 w-16" />
          </div>
        ))}
      </div>

      {/* Tableau */}
      <div className="space-y-3 rounded-xl bg-card p-5 ring-1 ring-foreground/[0.06]">
        <Sk className="h-5 w-44" />
        <div className="space-y-2 pt-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Sk key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
