import Link from "next/link";
import {
  Wallet,
  Banknote,
  Hourglass,
  AlertCircle,
  Receipt,
  Download,
} from "lucide-react";
import { requireSection } from "@/lib/section-guard";
import { getTenantDb } from "@/lib/tenant";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { RecordPaymentDialog } from "@/components/comptabilite/record-payment-dialog";
import { FINANCEMENT_LABELS } from "@/lib/validators/candidat";

export const dynamic = "force-dynamic";

// Format monétaire FR (sépare les milliers, 0–2 décimales).
const euro = (n: number) =>
  n.toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }) + " €";

const MOIS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

type Etat = "PAYE" | "PARTIEL" | "IMPAYE" | "A_CHIFFRER";

const ETATS: Record<Etat, { label: string; cls: string }> = {
  PAYE: { label: "Payé", cls: "bg-emerald-500/10 text-emerald-700" },
  PARTIEL: { label: "Partiel", cls: "bg-amber-500/10 text-amber-700" },
  IMPAYE: { label: "Impayé", cls: "bg-rose-500/10 text-rose-700" },
  A_CHIFFRER: { label: "À chiffrer", cls: "bg-muted text-muted-foreground" },
};

export default async function ComptabilitePage({
  searchParams,
}: {
  searchParams: Promise<{ annee?: string }>;
}) {
  // Garde d'autorisation : réservée au gérant et au responsable formation.
  // (Redondante avec le layout de section et le middleware — conservée en
  // défense en profondeur sur ces données financières sensibles.)
  await requireSection("comptabilite");
  const db = await getTenantDb();

  const sp = await searchParams;
  const nowYear = new Date().getFullYear();
  const annee = sp.annee ? parseInt(sp.annee, 10) : nowYear;

  // Toutes les inscriptions actives (hors annulées) = base comptable.
  // On enrichit avec la couche facturation (Facture → Paiement) si présente.
  const inscriptions = await db.inscription.findMany({
    where: { statut: { not: "ANNULEE" } },
    include: {
      candidat: { select: { id: true, nom: true, prenom: true, email: true, telephone: true } },
      session: {
        select: {
          dateDebut: true,
          dateFin: true,
          formation: { select: { titre: true } },
        },
      },
      factures: {
        select: {
          montantTTC: true,
          datePaiement: true,
          paiements: { select: { montant: true, date: true } },
        },
      },
      // Règlements saisis directement sur l'inscription (avec le collaborateur).
      paiements: {
        select: {
          id: true,
          montant: true,
          date: true,
          mode: true,
          enregistrePar: { select: { name: true } },
        },
        orderBy: { date: "desc" },
      },
    },
  });

  // ── Calcul comptable par inscription ──
  type Ligne = {
    id: string;
    candidatId: string;
    nom: string;
    email: string;
    telephone: string | null;
    formation: string;
    dateDebut: Date;
    mode: string;
    du: number;
    paye: number;
    restant: number;
    etat: Etat;
    ancienneteJours: number;
    events: { date: Date; montant: number }[];
  };

  const now = new Date();
  const lignes: Ligne[] = inscriptions.map((i) => {
    const facturesTtc = i.factures.reduce((s, f) => s + Number(f.montantTTC), 0);
    const du = i.montant != null ? Number(i.montant) : facturesTtc;

    // Encaissements réels (relevé Paiement)
    const events: { date: Date; montant: number }[] = [];
    for (const f of i.factures) {
      for (const p of f.paiements) {
        events.push({ date: p.date, montant: Number(p.montant) });
      }
    }
    for (const p of i.paiements) {
      events.push({ date: p.date, montant: Number(p.montant) });
    }
    let paye = events.reduce((s, e) => s + e.montant, 0);

    // Aucun relevé mais l'inscription est marquée PAYÉE → soldée au montant dû.
    if (events.length === 0 && i.paiementStatut === "PAYE" && du > 0) {
      paye = du;
      events.push({ date: i.updatedAt, montant: du });
    }

    const restant = Math.max(0, du - paye);

    let etat: Etat;
    if (du <= 0) etat = "A_CHIFFRER";
    else if (restant <= 0.005) etat = "PAYE";
    else if (paye > 0) etat = "PARTIEL";
    else etat = "IMPAYE";

    const mode =
      i.modePaiement ||
      (i.financementType ? FINANCEMENT_LABELS[i.financementType] : "—");

    return {
      id: i.id,
      candidatId: i.candidat.id,
      nom: `${i.candidat.prenom} ${i.candidat.nom}`,
      email: i.candidat.email,
      telephone: i.candidat.telephone,
      formation: i.session.formation.titre,
      dateDebut: i.session.dateDebut,
      mode,
      du,
      paye,
      restant,
      etat,
      ancienneteJours: Math.floor(
        (now.getTime() - i.createdAt.getTime()) / 86_400_000,
      ),
      events,
    };
  });

  // ── Totaux globaux ──
  const totalDu = lignes.reduce((s, l) => s + l.du, 0);
  const totalPaye = lignes.reduce((s, l) => s + l.paye, 0);
  const totalRestant = lignes.reduce((s, l) => s + l.restant, 0);
  const nonSoldes = lignes
    .filter((l) => l.etat === "IMPAYE" || l.etat === "PARTIEL")
    .sort((a, b) => b.restant - a.restant);

  // ── Encaissements : tous les événements + années disponibles ──
  const allEvents = lignes.flatMap((l) => l.events);
  const years = Array.from(
    new Set([nowYear, ...allEvents.map((e) => e.date.getFullYear())]),
  ).sort((a, b) => b - a);

  // Récap par mois (année sélectionnée)
  const parMois = MOIS.map((label, m) => {
    const evs = allEvents.filter(
      (e) => e.date.getFullYear() === annee && e.date.getMonth() === m,
    );
    return {
      label,
      nb: evs.length,
      montant: evs.reduce((s, e) => s + e.montant, 0),
    };
  });
  const totalAnnee = parMois.reduce((s, m) => s + m.montant, 0);
  const nbAnnee = parMois.reduce((s, m) => s + m.nb, 0);

  // Récap par année (toutes années confondues)
  const parAnnee = years
    .map((y) => ({
      annee: y,
      montant: allEvents
        .filter((e) => e.date.getFullYear() === y)
        .reduce((s, e) => s + e.montant, 0),
    }))
    .filter((a) => a.montant > 0 || a.annee === nowYear);

  const tauxRecouvrement =
    totalDu > 0 ? Math.round((totalPaye / totalDu) * 100) : 0;

  // Répartition par mode de paiement (sur le montant dû)
  const parMode = new Map<string, { du: number; paye: number; nb: number }>();
  for (const l of lignes) {
    const cur = parMode.get(l.mode) ?? { du: 0, paye: 0, nb: 0 };
    cur.du += l.du;
    cur.paye += l.paye;
    cur.nb += 1;
    parMode.set(l.mode, cur);
  }
  const modes = [...parMode.entries()].sort((a, b) => b[1].du - a[1].du);

  // Détail trié : non soldés d'abord (restant décroissant), puis le reste.
  const detail = [...lignes].sort(
    (a, b) => b.restant - a.restant || a.nom.localeCompare(b.nom),
  );

  // Derniers règlements saisis (avec le collaborateur qui les a enregistrés).
  const reglements = inscriptions
    .flatMap((i) =>
      i.paiements.map((p) => ({
        id: p.id,
        date: p.date,
        montant: Number(p.montant),
        mode: p.mode,
        candidat: `${i.candidat.prenom} ${i.candidat.nom}`,
        par: p.enregistrePar?.name ?? "—",
      })),
    )
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 12);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Suivi comptable"
        subtitle="Encaissements, états de paiement et créances par candidat"
      >
        <div className="flex flex-wrap gap-1.5">
          {years.map((y) => (
            <Link
              key={y}
              href={`/comptabilite?annee=${y}`}
              className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
                y === annee
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input hover:bg-muted"
              }`}
            >
              {y}
            </Link>
          ))}
        </div>
        <a
          href="/comptabilite/export"
          className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"
        >
          <Download className="h-4 w-4" /> Exporter (CSV)
        </a>
      </PageHeader>

      {/* Indicateurs clés */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total facturé"
          value={euro(totalDu)}
          icon={Wallet}
          tint="blue"
          trend={`${lignes.length} inscription${lignes.length > 1 ? "s" : ""}`}
        />
        <StatCard
          label="Encaissé"
          value={euro(totalPaye)}
          icon={Banknote}
          tint="emerald"
          trend={`${tauxRecouvrement}% recouvré`}
          trendUp={tauxRecouvrement >= 50}
        />
        <StatCard
          label="Reste à encaisser"
          value={euro(totalRestant)}
          icon={Hourglass}
          tint="amber"
        />
        <StatCard
          label="Clients non soldés"
          value={nonSoldes.length}
          icon={AlertCircle}
          tint="rose"
          trend={nonSoldes.length > 0 ? `${euro(totalRestant)} en attente` : "Tout est réglé"}
          trendUp={nonSoldes.length === 0}
        />
      </div>

      {/* Récap encaissements : par mois + par année */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="py-3">
            <CardTitle className="text-sm text-muted-foreground">
              Encaissements {annee} — par mois
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mois</TableHead>
                  <TableHead className="text-right">Règlements</TableHead>
                  <TableHead className="text-right">Montant encaissé</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parMois.map((m) => (
                  <TableRow key={m.label} className={m.montant === 0 ? "text-muted-foreground" : ""}>
                    <TableCell>{m.label}</TableCell>
                    <TableCell className="text-right">{m.nb || "—"}</TableCell>
                    <TableCell className="text-right font-medium">
                      {m.montant > 0 ? euro(m.montant) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-t-2 font-semibold">
                  <TableCell>Total {annee}</TableCell>
                  <TableCell className="text-right">{nbAnnee}</TableCell>
                  <TableCell className="text-right">{euro(totalAnnee)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm text-muted-foreground">
              Par année
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Année</TableHead>
                  <TableHead className="text-right">Encaissé</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parAnnee.map((a) => (
                  <TableRow
                    key={a.annee}
                    className={a.annee === annee ? "bg-muted/40 font-medium" : ""}
                  >
                    <TableCell>
                      <Link href={`/comptabilite?annee=${a.annee}`} className="hover:underline">
                        {a.annee}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">{euro(a.montant)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Clients non soldés (impayés + partiels) */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <AlertCircle className="h-5 w-5 text-rose-600" />
          Clients non soldés
          <Badge className="bg-rose-500/10 text-rose-700">{nonSoldes.length}</Badge>
        </h2>
        <Card>
          <CardContent className="p-0">
            {nonSoldes.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">
                Aucune créance : tous les dossiers sont réglés. 🎉
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidat</TableHead>
                    <TableHead className="hidden md:table-cell">Formation</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead className="text-right">Dû</TableHead>
                    <TableHead className="text-right">Payé</TableHead>
                    <TableHead className="text-right">Restant</TableHead>
                    <TableHead className="hidden lg:table-cell text-right">Ancienneté</TableHead>
                    <TableHead>État</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {nonSoldes.map((l) => (
                    <TableRow key={l.id} className="hover:bg-muted/40">
                      <TableCell className="font-medium">
                        <Link href={`/candidats/${l.candidatId}`} className="hover:underline">
                          {l.nom}
                        </Link>
                        <div className="text-xs text-muted-foreground">{l.email}</div>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">
                        {l.formation}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{l.mode}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{euro(l.du)}</TableCell>
                      <TableCell className="text-right text-emerald-700">{euro(l.paye)}</TableCell>
                      <TableCell className="text-right font-semibold text-rose-700">
                        {euro(l.restant)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-right text-muted-foreground">
                        {l.ancienneteJours} j
                      </TableCell>
                      <TableCell>
                        <Badge className={ETATS[l.etat].cls}>{ETATS[l.etat].label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <RecordPaymentDialog
                          inscriptionId={l.id}
                          candidatNom={l.nom}
                          formation={l.formation}
                          restant={l.restant}
                          defaultMode={l.mode}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Détail comptable par candidat */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Receipt className="h-5 w-5" />
          Détail par candidat
          <Badge variant="secondary">{detail.length}</Badge>
        </h2>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidat</TableHead>
                  <TableHead className="hidden md:table-cell">Formation</TableHead>
                  <TableHead className="hidden lg:table-cell">Démarrage</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead className="text-right">Dû</TableHead>
                  <TableHead className="text-right">Payé</TableHead>
                  <TableHead className="text-right">Restant</TableHead>
                  <TableHead>État</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.map((l) => (
                  <TableRow key={l.id} className="hover:bg-muted/40">
                    <TableCell className="font-medium">
                      <Link href={`/candidats/${l.candidatId}`} className="hover:underline">
                        {l.nom}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {l.formation}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground lg:table-cell">
                      {l.dateDebut.toLocaleDateString("fr-FR")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{l.mode}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {l.du > 0 ? euro(l.du) : "—"}
                    </TableCell>
                    <TableCell className="text-right text-emerald-700">
                      {l.paye > 0 ? euro(l.paye) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {l.restant > 0 ? euro(l.restant) : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge className={ETATS[l.etat].cls}>{ETATS[l.etat].label}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <RecordPaymentDialog
                        inscriptionId={l.id}
                        candidatNom={l.nom}
                        formation={l.formation}
                        restant={l.restant}
                        defaultMode={l.mode}
                        triggerVariant="ghost"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      {/* Derniers règlements enregistrés (traçabilité collaborateur) */}
      {reglements.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Banknote className="h-5 w-5 text-emerald-600" />
            Derniers règlements
          </h2>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Candidat</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead>Enregistré par</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reglements.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-muted-foreground">
                        {r.date.toLocaleDateString("fr-FR")}
                      </TableCell>
                      <TableCell className="font-medium">{r.candidat}</TableCell>
                      <TableCell>
                        {r.mode ? <Badge variant="secondary">{r.mode}</Badge> : "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium text-emerald-700">
                        {euro(r.montant)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{r.par}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Répartition par mode de financement */}
      {modes.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Par mode de financement</h2>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mode</TableHead>
                    <TableHead className="text-right">Dossiers</TableHead>
                    <TableHead className="text-right">Dû</TableHead>
                    <TableHead className="text-right">Encaissé</TableHead>
                    <TableHead className="text-right">Reste</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modes.map(([mode, v]) => (
                    <TableRow key={mode}>
                      <TableCell className="font-medium">{mode}</TableCell>
                      <TableCell className="text-right">{v.nb}</TableCell>
                      <TableCell className="text-right">{euro(v.du)}</TableCell>
                      <TableCell className="text-right text-emerald-700">{euro(v.paye)}</TableCell>
                      <TableCell className="text-right">{euro(Math.max(0, v.du - v.paye))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
