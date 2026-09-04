// Squelette de chargement du portail entreprise (A10-019) — évite l'impression
// d'interface figée pendant la navigation entre les rubriques du portail B2B.
function Sk({ className }: { className: string }) {
  return <div className={`skeleton-shimmer rounded-lg ${className}`} />;
}

export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Chargement en cours">
      <div className="space-y-2">
        <Sk className="h-7 w-64 max-w-full" />
        <Sk className="h-4 w-96 max-w-full" />
      </div>

      <div className="space-y-3 rounded-xl border bg-card p-5">
        <Sk className="h-5 w-40" />
        <div className="space-y-2 pt-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Sk key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
