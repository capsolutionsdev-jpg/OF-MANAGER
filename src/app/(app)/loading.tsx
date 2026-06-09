// Squelette affiché pendant le chargement des pages de l'espace connecté.
// Améliore le ressenti de rapidité (perçu) sans bloquer sur un écran vide.
export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Chargement en cours">
      <div className="h-24 animate-pulse rounded-2xl bg-muted" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    </div>
  );
}
