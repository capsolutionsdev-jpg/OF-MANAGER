import Link from "next/link";
import { Search, Users, CalendarClock, Building2 } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";

// Résultats live (session + base) : jamais pré-généré.
export const dynamic = "force-dynamic";

function fmt(d: Date) {
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function RecherchePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q: qRaw } = await searchParams;
  const q = (qRaw ?? "").trim();

  const SearchField = (
    <form action="/recherche" className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 focus-within:ring-1 focus-within:ring-primary">
      <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
      <input
        name="q"
        type="search"
        defaultValue={q}
        autoFocus
        placeholder="Nom, e-mail, téléphone, formation, entreprise…"
        className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        aria-label="Rechercher"
      />
    </form>
  );

  if (q.length < 2) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Recherche</h1>
        {SearchField}
        <p className="text-sm text-muted-foreground">
          Saisissez au moins 2 caractères pour rechercher un candidat, une session ou un client
          professionnel.
        </p>
      </div>
    );
  }

  const db = await getTenantDb();
  const like = { contains: q, mode: "insensitive" as const };

  const [candidats, sessions, entreprises] = await Promise.all([
    db.candidat.findMany({
      where: {
        OR: [
          { nom: like },
          { prenom: like },
          { email: like },
          { telephone: { contains: q } },
        ],
      },
      select: { id: true, prenom: true, nom: true, email: true, telephone: true, statut: true },
      orderBy: { updatedAt: "desc" },
      take: 25,
    }),
    db.session.findMany({
      where: { formation: { titre: like } },
      select: {
        id: true,
        dateDebut: true,
        formation: { select: { titre: true } },
      },
      orderBy: { dateDebut: "desc" },
      take: 25,
    }),
    db.entreprise.findMany({
      where: { OR: [{ raisonSociale: like }, { siret: { contains: q } }] },
      select: { id: true, raisonSociale: true, ville: true },
      orderBy: { raisonSociale: "asc" },
      take: 25,
    }),
  ]);

  const total = candidats.length + sessions.length + entreprises.length;

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <h1 className="text-2xl font-bold tracking-tight">Recherche</h1>
        {SearchField}
        <p className="text-sm text-muted-foreground">
          {total === 0
            ? `Aucun résultat pour « ${q} ».`
            : `${total} résultat${total > 1 ? "s" : ""} pour « ${q} ».`}
        </p>
      </div>

      {candidats.length > 0 && (
        <section className="rounded-xl border">
          <h2 className="flex items-center gap-2 border-b px-4 py-2.5 text-sm font-semibold">
            <Users className="h-4 w-4 text-muted-foreground" /> Candidats
            <span className="text-xs font-normal text-muted-foreground">({candidats.length})</span>
          </h2>
          <ul className="divide-y">
            {candidats.map((c) => (
              <li key={c.id}>
                <Link href={`/candidats/${c.id}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm hover:bg-muted">
                  <span className="font-medium">{c.prenom} {c.nom}</span>
                  <span className="text-xs text-muted-foreground">
                    {[c.email, c.telephone].filter(Boolean).join(" · ")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {sessions.length > 0 && (
        <section className="rounded-xl border">
          <h2 className="flex items-center gap-2 border-b px-4 py-2.5 text-sm font-semibold">
            <CalendarClock className="h-4 w-4 text-muted-foreground" /> Sessions
            <span className="text-xs font-normal text-muted-foreground">({sessions.length})</span>
          </h2>
          <ul className="divide-y">
            {sessions.map((s) => (
              <li key={s.id}>
                <Link href={`/sessions/${s.id}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm hover:bg-muted">
                  <span className="font-medium">{s.formation.titre}</span>
                  <span className="text-xs text-muted-foreground">{fmt(s.dateDebut)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {entreprises.length > 0 && (
        <section className="rounded-xl border">
          <h2 className="flex items-center gap-2 border-b px-4 py-2.5 text-sm font-semibold">
            <Building2 className="h-4 w-4 text-muted-foreground" /> Clients professionnels
            <span className="text-xs font-normal text-muted-foreground">({entreprises.length})</span>
          </h2>
          <ul className="divide-y">
            {entreprises.map((e) => (
              <li key={e.id}>
                <Link href={`/clients-pro/${e.id}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm hover:bg-muted">
                  <span className="font-medium">{e.raisonSociale}</span>
                  {e.ville && <span className="text-xs text-muted-foreground">{e.ville}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
