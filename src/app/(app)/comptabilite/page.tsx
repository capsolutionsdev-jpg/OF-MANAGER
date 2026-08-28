import Link from "next/link";
import {
  Wallet,
  Banknote,
  Hourglass,
  AlertCircle,
} from "lucide-react";
import { requireSection } from "@/lib/section-guard";
import { montantDu } from "@/lib/comptabilite/montant-du";
import { ExportMenu } from "@/components/export-menu";
import { getTenantDb } from "@/lib/tenant";
import { Badge } from "@/components/ui/badge";
import { TONE_CLASSES } from "@/components/ui/status-badge";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { RecordPaymentDialog } from "@/components/comptabilite/record-payment-dialog";
import { DossiersTable, type DossierRow } from "@/components/comptabilite/dossiers-table";
import { FINANCEMENT_LABELS } from "@/lib/validators/candidat";
import { euro, MOIS, ETATS, type Etat } from "@/lib/comptabilite/format";

export const dynamic = "force-dynamic";

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
    const du = montantDu(i.montant != null ? Number(i.montant) : null, facturesTtc);

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
  const parMoisActifs = parMois.filter((m) => m.nb > 0);
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

  // Détail : dossiers aplatis (sérialisables) pour la table filtrable cliente.
  // Le tri/filtre/pagination se font côté client sur ces données déjà chargées.
  const dossierRows: DossierRow[] = lignes.map((l) => ({
    id: l.id,
    candidatId: l.candidatId,
    nom: l.nom,
    email: l.email,
    formation: l.formation,
    dateDebut: l.dateDebut.toISOString(),
    mode: l.mode,
    du: l.du,
    paye: l.paye,
    restant: l.restant,
    etat: l.etat,
  }));

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
    <div className="space-y-6">
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
        <ExportMenu href="/comptabilite/export" />
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

      {/* Récap encaissements compact : mois actifs + mini-bloc par année */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="py-3">
            <CardTitle className="text-sm text-muted-foreground">
              Encaissements {annee} — par mois
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {parMoisActifs.length === 0 ? (
              <p className="px-4 pb-4 text-sm text-muted-foreground">
                Aucun encaissement enregistré en {annee}.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mois</TableHead>
                    <TableHead className="text-right">Règlements</TableHead>
                    <TableHead className="text-right">Montant encaissé</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parMoisActifs.map((m) => (
                    <TableRow key={m.label}>
                      <TableCell>{m.label}</TableCell>
                      <TableCell className="text-right">{m.nb}</TableCell>
                      <TableCell className="text-right font-medium">{euro(m.montant)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2 font-semibold">
                    <TableCell>Total {annee}</TableCell>
                    <TableCell className="text-right">{nbAnnee}</TableCell>
                    <TableCell className="text-right">{euro(totalAnnee)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm text-muted-foreground">Par année</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 p-4 pt-0">
            {parAnnee.map((a) => (
              <Link
                key={a.annee}
                href={`/comptabilite?annee=${a.annee}`}
                className={`rounded-lg border px-3 py-2 text-sm transition ${
                  a.annee === annee
                    ? "border-primary bg-primary/5"
                    : "border-input hover:bg-muted"
                }`}
              >
                <div className="font-medium">{a.annee}</div>
                <div className="text-muted-foreground">{euro(a.montant)}</div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Onglets in-page */}
      <Tabs defaultValue="creances" className="space-y-4">
        <TabsList>
          <TabsTrigger value="creances">
            Créances
            <Count n={nonSoldes.length} tone="rose" />
          </TabsTrigger>
          <TabsTrigger value="dossiers">
            Tous les dossiers
            <Count n={dossierRows.length} />
          </TabsTrigger>
          <TabsTrigger value="reglements">
            Règlements
            <Count n={reglements.length} />
          </TabsTrigger>
          <TabsTrigger value="modes">Par mode</TabsTrigger>
        </TabsList>

        {/* Créances : clients non soldés, actionnables */}
        <TabsContent value="creances" className="space-y-3">
          <Card>
            <CardContent className="p-0">
              {nonSoldes.length === 0 ? (
                <div className="p-10 text-center text-sm text-muted-foreground">
                  Aucune créance : tous les dossiers sont réglés.
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
                        <TableCell className="text-right text-success">{euro(l.paye)}</TableCell>
                        <TableCell className="text-right font-semibold text-destructive">
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
        </TabsContent>

        {/* Tous les dossiers : une seule table filtrable (recherche + filtres + tri + pagination) */}
        <TabsContent value="dossiers">
          <DossiersTable rows={dossierRows} />
        </TabsContent>

        {/* Derniers règlements enregistrés (traçabilité collaborateur) */}
        <TabsContent value="reglements">
          <Card>
            <CardContent className="p-0">
              {reglements.length === 0 ? (
                <div className="p-10 text-center text-sm text-muted-foreground">
                  Aucun règlement enregistré pour le moment.
                </div>
              ) : (
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
                        <TableCell className="text-right font-medium text-success">
                          {euro(r.montant)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{r.par}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Répartition par mode de financement */}
        <TabsContent value="modes">
          <Card>
            <CardContent className="p-0">
              {modes.length === 0 ? (
                <div className="p-10 text-center text-sm text-muted-foreground">
                  Aucun dossier à répartir pour le moment.
                </div>
              ) : (
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
                        <TableCell className="text-right text-success">{euro(v.paye)}</TableCell>
                        <TableCell className="text-right">{euro(Math.max(0, v.du - v.paye))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** Petit compteur affiché dans un onglet. */
function Count({ n, tone }: { n: number; tone?: "rose" }) {
  return (
    <span
      className={`ml-1 rounded-full px-1.5 py-0.5 text-[0.7rem] font-semibold tabular-nums ${
        tone === "rose"
          ? TONE_CLASSES.danger
          : "bg-muted text-muted-foreground"
      }`}
    >
      {n}
    </span>
  );
}
