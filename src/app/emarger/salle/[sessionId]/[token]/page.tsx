import { notFound } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, PenLine, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { orgConfigFor } from "@/lib/org-identity";
import { verifySalleToken, jourKey } from "@/lib/emargement-salle";

export const dynamic = "force-dynamic";

const demiLabel = (d: string) => (d === "MATIN" ? "Matin" : "Après-midi");

type SalleSigRow = {
  id: string;
  token: string;
  nom: string;
  role: string;
  signedAt: Date | null;
};

// Déclaré au niveau module (pas dans le render) : sinon react-hooks/static-components
// (un composant créé pendant le render réinitialise son état à chaque rendu).
function Section({
  titre,
  rows,
  sessionId,
}: {
  titre: string;
  rows: SalleSigRow[];
  sessionId: string;
}) {
  if (rows.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{titre}</p>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id}>
            {r.signedAt ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border bg-emerald-50 px-4 py-3">
                <span className="font-medium text-emerald-800">{r.nom}</span>
                <span className="inline-flex items-center gap-1 text-sm text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" /> signé
                </span>
              </div>
            ) : (
              <Link
                href={`/emarger/${r.token}?s=${sessionId}`}
                className="flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm transition hover:border-primary hover:bg-primary/5 active:scale-[0.99]"
              >
                <span className="font-medium">
                  {r.nom}
                  {r.role === "FORMATEUR" ? <span className="ml-1 text-xs text-muted-foreground">(formateur)</span> : null}
                </span>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                  <PenLine className="h-4 w-4" /> Signer
                </span>
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function EmargementSallePage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string; token: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { sessionId, token } = await params;
  const { date: dateParam } = await searchParams;

  if (!verifySalleToken(sessionId, token)) notFound();

  const sess = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { id: true, organismeId: true, formation: { select: { titre: true } } },
  });
  if (!sess) notFound();

  const sigs = await prisma.emargementSignature.findMany({
    where: { sessionId },
    select: { id: true, token: true, nom: true, role: true, date: true, demi: true, signedAt: true },
    orderBy: [{ date: "asc" }, { demi: "asc" }, { nom: "asc" }],
  });
  const org = await orgConfigFor(sess.organismeId);

  const days = [...new Set(sigs.map((s) => jourKey(s.date)))].sort();
  const todayKey = jourKey(new Date());
  const targetKey =
    dateParam && days.includes(dateParam) ? dateParam
    : days.includes(todayKey) ? todayKey
    : (days.find((d) => d >= todayKey) ?? days[days.length - 1] ?? todayKey);

  const dayRows = sigs.filter((s) => jourKey(s.date) === targetKey);
  const matin = dayRows.filter((r) => r.demi === "MATIN");
  const aprem = dayRows.filter((r) => r.demi === "APRES_MIDI");
  const signedCount = dayRows.filter((r) => r.signedAt).length;

  const [y, m, d] = targetKey.split("-").map(Number);
  const dayLabel = new Date(y, m - 1, d).toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <main className="min-h-screen bg-muted/40 px-4 py-8">
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={org.logoUrl ?? "/ofmanager-logo.png"} alt={org.name} className="mb-3 h-12 w-auto object-contain" />
          <h1 className="text-xl font-bold">Émargement de la journée</h1>
          <p className="text-sm text-muted-foreground">{sess.formation.titre}</p>
          <p className="mt-1 text-sm font-medium capitalize">{dayLabel}</p>
        </div>

        {days.length > 1 && (
          <div className="flex flex-wrap justify-center gap-2">
            {days.map((dk) => {
              const [yy, mm, dd] = dk.split("-").map(Number);
              const lbl = new Date(yy, mm - 1, dd).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
              const active = dk === targetKey;
              return (
                <Link
                  key={dk}
                  href={`/emarger/salle/${sessionId}/${token}?date=${dk}`}
                  className={`rounded-full border px-3 py-1 text-xs ${active ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}
                >
                  {lbl}
                </Link>
              );
            })}
          </div>
        )}

        {dayRows.length === 0 ? (
          <div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
            Aucune signature préparée pour ce jour. Préparez les émargements depuis la session.
          </div>
        ) : (
          <>
            <div className="flex items-center justify-center gap-2 rounded-lg bg-card px-3 py-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" /> {signedCount}/{dayRows.length} signé(s) aujourd&apos;hui
            </div>
            <Section titre="Matin" rows={matin} sessionId={sessionId} />
            <Section titre="Après-midi" rows={aprem} sessionId={sessionId} />
          </>
        )}

        <p className="text-center text-xs text-muted-foreground">
          {org.name} — Sélectionnez votre nom pour signer votre présence.
        </p>
      </div>
    </main>
  );
}
