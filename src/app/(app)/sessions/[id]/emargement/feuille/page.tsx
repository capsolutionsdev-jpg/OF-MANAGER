import { Fragment } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import { orgConfigFor } from "@/lib/org-identity";
import { MODALITE_LABELS } from "@/lib/validators/formation";
import { PrintButton } from "@/components/documents/print-button";
import { joursSession, dayKey } from "@/lib/emargement";
import { parseAnimation } from "@/lib/formateurs/animation";

export const dynamic = "force-dynamic";

export default async function FeuilleEmargementSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const db = await getTenantDb();
  const { id } = await params;
  const s = await db.session.findUnique({
    where: { id },
    include: {
      formation: true,
      formateurs: true,
      seances: { orderBy: { date: "asc" } },
      emargementSignatures: true,
      inscriptions: {
        where: { statut: { not: "ANNULEE" } },
        include: { candidat: true },
        orderBy: { candidat: { nom: "asc" } },
      },
    },
  });
  if (!s) notFound();
  const org = await orgConfigFor(s.organismeId);

  const jours = joursSession(s.seances, s.dateDebut, s.dateFin);

  // Découpage en semaines de 5 jours maximum : une page par semaine, pour que
  // les cases de date/signature restent lisibles sur les formations longues
  // (ex. SSIAP 2 sur 10 jours → 2 pages de 5 jours au lieu de 20 colonnes).
  const JOURS_PAR_PAGE = 5;
  const semaines: Date[][] = [];
  for (let i = 0; i < jours.length; i += JOURS_PAR_PAGE) {
    semaines.push(jours.slice(i, i + JOURS_PAR_PAGE));
  }
  if (semaines.length === 0) semaines.push([]); // feuille vide (aucune date)

  // Report des signatures électroniques recueillies
  // clé : `${who}|${dayKey}|${demi}` → { heure, image }
  const sigMap = new Map<string, { at: Date; url: string | null }>();
  for (const e of s.emargementSignatures) {
    if (!e.signedAt) continue;
    const who = e.role === "FORMATEUR" ? "FORM" : (e.candidatId ?? e.email);
    sigMap.set(`${who}|${dayKey(e.date)}|${e.demi}`, {
      at: e.signedAt,
      url: e.signatureDataUrl,
    });
  }
  const heure = (d: Date) =>
    d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const cellFor = (who: string, jour: Date, demi: "MATIN" | "APRES_MIDI") => {
    const sig = sigMap.get(`${who}|${dayKey(jour)}|${demi}`);
    if (!sig) return null;
    return (
      <div className="sigcell">
        {sig.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={sig.url} alt="Signature" className="sigimg" />
        ) : (
          <span>✓</span>
        )}
        <span className="sigtime">{heure(sig.at)}</span>
      </div>
    );
  };
  const fmtJour = (d: Date) =>
    d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
  const fmt = (d: Date) => d.toLocaleDateString("fr-FR");
  const formateurs = s.formateurs
    .map((f) => `${f.prenom} ${f.nom}`)
    .join(", ");

  // Émargement CONFORME : un formateur par jour. On retrouve, pour chaque
  // journée, le formateur qui l'anime (répartition `formateursAnimation`) → son
  // nom figure sous la date, pour la signature. Repli : formateur unique, sinon
  // « à préciser » (config absente).
  const anim = parseAnimation(s.formateursAnimation);
  const nomFormateur = (fid: string) => {
    const f = s.formateurs.find((x) => x.id === fid);
    return f ? `${f.prenom} ${f.nom}` : "";
  };
  const jourIso = (d: Date) => {
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  };
  // Formateur explicitement affecté à la séance d'un jour (UI d'émargement).
  const seanceFormateur = new Map<string, string | null>();
  for (const se of s.seances) seanceFormateur.set(jourIso(se.date), se.formateurId ?? null);

  const formateurDuJour = (jour: Date): string => {
    const iso = jourIso(jour);
    // 1) formateur affecté à la SÉANCE de ce jour (le plus explicite) ;
    const seanceFid = seanceFormateur.get(iso);
    if (seanceFid) {
      const n = nomFormateur(seanceFid);
      if (n) return n;
    }
    // 2) répartition « animation » (jours cochés / toute la session) ;
    const partiel = anim.find((a) => !a.complet && a.jours.includes(iso));
    if (partiel) {
      const n = nomFormateur(partiel.formateurId);
      if (n) return n;
    }
    const complet = anim.find((a) => a.complet);
    if (complet) {
      const n = nomFormateur(complet.formateurId);
      if (n) return n;
    }
    // 3) repli : formateur unique de la session, sinon à préciser.
    if (s.formateurs.length === 1) return `${s.formateurs[0].prenom} ${s.formateurs[0].nom}`;
    return "à préciser";
  };

  return (
    <div className="space-y-4">
      {/* Barre d'action (masquée à l'impression) */}
      <div className="flex items-center justify-between print:hidden">
        <Link
          href={`/sessions/${s.id}/emargement`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Retour à l&apos;émargement
        </Link>
        <PrintButton />
      </div>

      {/* Feuille imprimable — une PAGE par semaine (5 jours max) */}
      {semaines.map((joursSemaine, page) => (
        <div key={page} className="emarge-sheet emarge-page mx-auto bg-white p-6 text-black shadow-sm">
          <div className="mb-4 flex items-center gap-4 border-b pb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={org.logoUrl ?? "/cap-competences-logo.png"} alt={org.name} className="h-14 w-auto" />
            <div className="text-[11px] leading-snug">
              <strong className="text-sm">{org.name}</strong> — {org.qualiopi}
              <br />
              {org.adresse}
              <br />
              SIRET {org.siret} · NDA {org.nda}
            </div>
          </div>

          <h1 className="mb-1 text-center text-lg font-bold">
            Feuille d&apos;émargement
            {semaines.length > 1 && (
              <span className="ml-2 text-sm font-normal">
                — Semaine {page + 1} / {semaines.length}
                {joursSemaine.length > 0 &&
                  ` (du ${fmt(joursSemaine[0])} au ${fmt(joursSemaine[joursSemaine.length - 1])})`}
              </span>
            )}
          </h1>

          <table className="info-table mb-3 w-full text-[11px]">
            <tbody>
              <tr>
                <td className="font-semibold">Formation</td>
                <td>
                  {s.formation.titre} ({s.formation.reference})
                </td>
                <td className="font-semibold">Modalité</td>
                <td>{MODALITE_LABELS[s.modalite]}</td>
              </tr>
              <tr>
                <td className="font-semibold">Dates</td>
                <td>
                  du {fmt(s.dateDebut)} au {fmt(s.dateFin)}
                </td>
                <td className="font-semibold">Lieu</td>
                <td>{s.lieu ?? "—"}</td>
              </tr>
              <tr>
                <td className="font-semibold">Formateur(s)</td>
                <td>{formateurs || "—"}</td>
                <td className="font-semibold">Horaires</td>
                <td>{s.horaires ?? "—"}</td>
              </tr>
            </tbody>
          </table>

          {/* Tableau principal : candidats × jours de la semaine (Matin / Après-midi) */}
          <table className="emarge w-full text-[10px]">
            <thead>
              <tr>
                <th rowSpan={2} className="name-col">
                  Nom et prénom du stagiaire
                </th>
                {joursSemaine.map((j, i) => (
                  <th key={i} colSpan={2}>
                    {fmtJour(j)}
                  </th>
                ))}
              </tr>
              <tr>
                {joursSemaine.map((_, i) => (
                  <Fragment key={i}>
                    <th>Matin</th>
                    <th>A.-m.</th>
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {s.inscriptions.length === 0 ? (
                <tr>
                  <td colSpan={1 + joursSemaine.length * 2}>Aucun stagiaire inscrit.</td>
                </tr>
              ) : (
                s.inscriptions.map((insc) => (
                  <tr key={insc.id}>
                    <td className="name-col">
                      {insc.candidat.prenom} {insc.candidat.nom}
                    </td>
                    {joursSemaine.map((jour, i) => (
                      <Fragment key={i}>
                        <td className="sig">{cellFor(insc.candidatId, jour, "MATIN")}</td>
                        <td className="sig">
                          {cellFor(insc.candidatId, jour, "APRES_MIDI")}
                        </td>
                      </Fragment>
                    ))}
                  </tr>
                ))
              )}
              {/* Formateur assigné à CHAQUE jour (émargement conforme : un formateur par jour) */}
              <tr className="formateur-row">
                <td className="name-col">Formateur du jour</td>
                {joursSemaine.map((jour, i) => (
                  <td key={i} colSpan={2} className="fjour">
                    {formateurDuJour(jour)}
                  </td>
                ))}
              </tr>
              {/* Signature du formateur, par demi-journée */}
              <tr className="formateur-row">
                <td className="name-col">Signature formateur</td>
                {joursSemaine.map((jour, i) => (
                  <Fragment key={i}>
                    <td className="sig">{cellFor("FORM", jour, "MATIN")}</td>
                    <td className="sig">{cellFor("FORM", jour, "APRES_MIDI")}</td>
                  </Fragment>
                ))}
              </tr>
            </tbody>
          </table>

          <div className="mt-6 flex justify-between text-[11px]">
            <div>
              <p className="mb-8">Cachet de l&apos;organisme :</p>
            </div>
            <div>
              <p className="mb-8">Signature du formateur :</p>
            </div>
          </div>
        </div>
      ))}

      <style>{`
        .emarge-sheet { max-width: 1100px; }
        .emarge-page + .emarge-page { margin-top: 24px; }
        .info-table td { border: 1px solid #999; padding: 3px 6px; }
        table.emarge { border-collapse: collapse; }
        table.emarge th, table.emarge td { border: 1px solid #555; padding: 4px; text-align: center; }
        table.emarge th { background: #f1f1f1; font-weight: 600; }
        table.emarge td.name-col, table.emarge th.name-col { text-align: left; min-width: 180px; white-space: nowrap; }
        table.emarge tbody td:not(.name-col) { height: 40px; }
        table.emarge td.sig { font-size: 9px; padding: 1px; }
        .sigcell { display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .sigimg { max-height: 34px; max-width: 100%; }
        .sigtime { font-size: 7px; color: #777; }
        .formateur-row td { background: #fafafa; font-style: italic; }
        .formateur-row td.fjour { font-style: normal; font-weight: 600; }
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          body { background: white; }
          /* Une semaine par page : saut de page entre les feuilles, jamais coupé au milieu. */
          .emarge-page { break-after: page; page-break-after: always; }
          .emarge-page:last-child { break-after: auto; page-break-after: auto; }
          .emarge-page + .emarge-page { margin-top: 0; }
          table.emarge { page-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}
