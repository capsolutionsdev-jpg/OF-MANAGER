import { GraduationCap, Users, Target, Timer, TrendingUp, AlertTriangle, Wallet } from "lucide-react";
import { CivicMention } from "@prisma/client";
import { getTenantDb } from "@/lib/tenant";
import { setCivicTarif } from "@/lib/actions/civique-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  CivicStudentsManager,
  type CivicStudentRow,
} from "@/components/civique/civic-students-manager";
import {
  CivicPaymentsManager,
  type CivicPaymentRow,
  type PayStudent,
} from "@/components/civique/civic-payments-manager";

const TARIF_DEFAUT: Record<string, number> = { CSP: 14900, CR: 17900, NATURALISATION: 19900 };

export const dynamic = "force-dynamic";

const SEUIL = 80; // % de réussite officiel

const MENTION_LABEL: Record<string, string> = {
  CSP: "Carte de séjour (CSP)",
  CR: "Carte de résident (CR)",
  NATURALISATION: "Naturalisation",
};
const PATH_LABEL: Record<string, string> = {
  EXPERT: "Expert",
  STANDARD: "Standard",
  RENFORCE: "Renforcé",
  ACCOMPAGNEMENT: "Accompagnement",
};
const THEME_LABEL: Record<string, string> = {
  T1: "Valeurs de la République",
  T2: "Institutions",
  T3: "Droits & devoirs",
  T4: "Histoire & culture",
  T5: "Vie quotidienne",
};

function pct(n: number, d: number) {
  return d ? Math.round((n / d) * 100) : 0;
}
function moduleLabel(moduleId: string) {
  const [mention, theme] = moduleId.split(":");
  return `${MENTION_LABEL[mention?.toUpperCase()] ?? mention} · ${THEME_LABEL[theme] ?? theme}`;
}

export default async function ExamenCiviqueBIPage() {
  const db = await getTenantDb();
  const [assessments, progress, weaknesses, mocks] = await Promise.all([
    db.civicAssessment.findMany({
      select: { candidatId: true, mention: true, recommendedPath: true },
    }),
    db.civicProgress.findMany({
      select: { candidatId: true, moduleId: true, score: true, timeSpent: true, completionRate: true },
    }),
    db.civicWeakness.findMany({
      select: { theme: true, sousTheme: true, errorCount: true, masteryLevel: true },
    }),
    db.civicMockExam.findMany({
      select: { candidatId: true, score: true, successProbability: true, date: true },
      orderBy: { date: "desc" },
    }),
  ]);

  const tarifs = await db.civicTarif.findMany({
    select: { mention: true, prixCents: true, remisePct: true, actif: true },
  });
  const tarifMap = new Map(tarifs.map((t) => [t.mention, t]));
  const mentionsTarif: CivicMention[] = [CivicMention.CSP, CivicMention.CR, CivicMention.NATURALISATION];

  // ── Comptes élèves (CRUD + suivi) ──
  // Composant serveur rendu à chaque requête : heure courante volontaire.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const studentRows = await db.candidat.findMany({
    where: { OR: [{ civicToken: { not: null } }, { civicMentions: { isEmpty: false } }] },
    select: {
      id: true,
      nom: true,
      prenom: true,
      email: true,
      telephone: true,
      createdAt: true,
      civicToken: true,
      civicAccessStatut: true,
      civicAccessUntil: true,
      civicMentions: true,
      civicAssessments: {
        select: { mention: true, languageScore: true, civicsScore: true, recommendedPath: true, date: true },
        orderBy: { date: "desc" },
        take: 1,
      },
      civicMockExams: {
        select: { score: true, successProbability: true, date: true },
        orderBy: { date: "desc" },
      },
      civicProgress: {
        select: { moduleId: true, score: true, completionRate: true, statut: true, timeSpent: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const students: CivicStudentRow[] = studentRows.map((c) => {
    const prog = c.civicProgress;
    const progression = prog.length
      ? Math.round(prog.reduce((a, p) => a + p.completionRate, 0) / prog.length)
      : 0;
    const modulesFaits = prog.filter((p) => p.statut === "COMPLETED").length;
    const bestMock = c.civicMockExams.length ? Math.max(...c.civicMockExams.map((m) => m.score)) : null;
    const proba = c.civicMockExams.length ? c.civicMockExams[0].successProbability : null;
    const a = c.civicAssessments[0] ?? null;
    return {
      id: c.id,
      nom: c.nom,
      prenom: c.prenom,
      email: c.email,
      telephone: c.telephone ?? null,
      code: c.civicToken,
      createdAt: c.createdAt.toISOString(),
      statut: c.civicAccessStatut,
      accessUntil: c.civicAccessUntil ? c.civicAccessUntil.toISOString() : null,
      expired: !!(c.civicAccessUntil && c.civicAccessUntil.getTime() < now),
      mentions: c.civicMentions,
      progression,
      modulesFaits,
      bestMock,
      proba,
      lastActivity: c.civicMockExams[0]?.date ? c.civicMockExams[0].date.toISOString() : null,
      assessment: a
        ? {
            mention: a.mention,
            languageScore: a.languageScore,
            civicsScore: a.civicsScore,
            recommendedPath: a.recommendedPath,
            date: a.date.toISOString(),
          }
        : null,
      mocks: c.civicMockExams.map((m) => ({
        score: m.score,
        proba: m.successProbability,
        date: m.date.toISOString(),
      })),
      progressDetail: prog.map((p) => ({
        moduleId: p.moduleId,
        score: p.score,
        completionRate: p.completionRate,
        status: p.statut,
        timeSpent: p.timeSpent,
      })),
    };
  });

  // ── Paiements & facturation ──
  const paymentRows = await db.civicPaiement.findMany({
    select: {
      id: true,
      date: true,
      mention: true,
      montantCents: true,
      methode: true,
      statut: true,
      candidat: { select: { nom: true, prenom: true, email: true } },
      facture: { select: { id: true, numero: true } },
    },
    orderBy: { date: "desc" },
  });
  const avoirs = await db.civicFacture.findMany({
    where: { type: "AVOIR" },
    select: { id: true, numero: true, factureOrigineId: true },
  });
  const avoirByOrigine = new Map(
    avoirs.filter((a) => a.factureOrigineId).map((a) => [a.factureOrigineId as string, a]),
  );
  const payments: CivicPaymentRow[] = paymentRows.map((p) => {
    const avoir = p.facture ? avoirByOrigine.get(p.facture.id) : undefined;
    return {
      id: p.id,
      date: p.date.toISOString(),
      eleve: `${p.candidat.prenom} ${p.candidat.nom}`.trim() || p.candidat.email,
      email: p.candidat.email,
      mention: p.mention,
      montantCents: p.montantCents,
      methode: p.methode,
      statut: p.statut,
      factureId: p.facture?.id ?? null,
      factureNumero: p.facture?.numero ?? null,
      avoirId: avoir?.id ?? null,
      avoirNumero: avoir?.numero ?? null,
    };
  });
  const payStudents: PayStudent[] = students.map((s) => ({
    id: s.id,
    label: `${s.prenom} ${s.nom} — ${s.email}`,
    mention: s.mentions[0] ?? null,
  }));
  const tarifsEuros: Record<string, number> = {
    CSP: (tarifMap.get("CSP")?.prixCents ?? TARIF_DEFAUT.CSP) / 100,
    CR: (tarifMap.get("CR")?.prixCents ?? TARIF_DEFAUT.CR) / 100,
    NATURALISATION: (tarifMap.get("NATURALISATION")?.prixCents ?? TARIF_DEFAUT.NATURALISATION) / 100,
  };

  // ── Candidats distincts (BI) ──
  const candidatIds = new Set<string>();
  for (const a of assessments) candidatIds.add(a.candidatId);
  for (const p of progress) candidatIds.add(p.candidatId);
  for (const m of mocks) candidatIds.add(m.candidatId);
  const nbCandidats = candidatIds.size;

  // ── Répartitions mention / parcours ──
  const parMention = new Map<string, number>();
  const parParcours = new Map<string, number>();
  for (const a of assessments) {
    parMention.set(a.mention, (parMention.get(a.mention) ?? 0) + 1);
    parParcours.set(a.recommendedPath, (parParcours.get(a.recommendedPath) ?? 0) + 1);
  }

  // ── Examens blancs : meilleur score + dernière proba par candidat ──
  const bestMock = new Map<string, number>();
  const lastProba = new Map<string, number>();
  for (const m of mocks) {
    bestMock.set(m.candidatId, Math.max(bestMock.get(m.candidatId) ?? 0, m.score));
    if (!lastProba.has(m.candidatId)) lastProba.set(m.candidatId, m.successProbability); // mocks triés desc
  }
  const nbReussis = [...bestMock.values()].filter((s) => s >= SEUIL).length;
  const tauxReussite = pct(nbReussis, bestMock.size);
  const probaMoyenne = lastProba.size
    ? Math.round([...lastProba.values()].reduce((a, b) => a + b, 0) / lastProba.size)
    : 0;

  // ── Temps & complétion ──
  const tempsParCandidat = new Map<string, number>();
  for (const p of progress) {
    tempsParCandidat.set(p.candidatId, (tempsParCandidat.get(p.candidatId) ?? 0) + p.timeSpent);
  }
  const tempsMoyenMin = tempsParCandidat.size
    ? Math.round(
        [...tempsParCandidat.values()].reduce((a, b) => a + b, 0) / tempsParCandidat.size / 60,
      )
    : 0;

  // ── Modules les moins performants ──
  const moduleAgg = new Map<string, { sum: number; n: number }>();
  for (const p of progress) {
    const e = moduleAgg.get(p.moduleId) ?? { sum: 0, n: 0 };
    e.sum += p.score;
    e.n += 1;
    moduleAgg.set(p.moduleId, e);
  }
  const modulesFaibles = [...moduleAgg.entries()]
    .map(([moduleId, e]) => ({ moduleId, moyenne: Math.round(e.sum / e.n), n: e.n }))
    .sort((a, b) => a.moyenne - b.moyenne)
    .slice(0, 6);

  // ── Thématiques problématiques ──
  const themeAgg = new Map<string, { theme: string; sousTheme: string; errors: number; mastSum: number; n: number }>();
  for (const w of weaknesses) {
    const key = `${w.theme}::${w.sousTheme}`;
    const e = themeAgg.get(key) ?? { theme: w.theme, sousTheme: w.sousTheme, errors: 0, mastSum: 0, n: 0 };
    e.errors += w.errorCount;
    e.mastSum += w.masteryLevel;
    e.n += 1;
    themeAgg.set(key, e);
  }
  const thematiquesDures = [...themeAgg.values()]
    .map((e) => ({ ...e, maitrise: Math.round(e.mastSum / e.n) }))
    .sort((a, b) => a.maitrise - b.maitrise || b.errors - a.errors)
    .slice(0, 8);

  // ── KPIs : pédagogiques + comptes ──
  const comptesActifs = students.filter((s) => s.statut === "ACTIF" && !s.expired).length;
  const kpis = [
    { icon: Users, label: "Comptes élèves", value: students.length },
    { icon: GraduationCap, label: "Comptes actifs", value: comptesActifs },
    { icon: Target, label: "Taux de réussite (blanc ≥ 80 %)", value: `${tauxReussite} %` },
    { icon: TrendingUp, label: "Probabilité moyenne", value: `${probaMoyenne} %` },
    { icon: Timer, label: "Temps moyen de travail", value: `${tempsMoyenMin} min` },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <GraduationCap className="h-6 w-6" /> Examen civique — Plateforme e-learning
        </h1>
        <p className="text-sm text-muted-foreground">
          Gestion des comptes élèves, suivi des résultats et pilotage de la préparation en ligne.
        </p>
      </div>

      <Tabs defaultValue="eleves" className="space-y-6">
        <TabsList>
          <TabsTrigger value="eleves">Élèves &amp; comptes</TabsTrigger>
          <TabsTrigger value="paiements">Paiements &amp; facturation</TabsTrigger>
          <TabsTrigger value="apercu">Vue d&apos;ensemble</TabsTrigger>
          <TabsTrigger value="tarifs">Tarifs</TabsTrigger>
        </TabsList>

        {/* ─────────── Élèves & comptes ─────────── */}
        <TabsContent value="eleves">
          <CivicStudentsManager students={students} />
        </TabsContent>

        {/* ─────────── Paiements & facturation ─────────── */}
        <TabsContent value="paiements">
          <CivicPaymentsManager payments={payments} students={payStudents} tarifs={tarifsEuros} />
        </TabsContent>

        {/* ─────────── Vue d'ensemble (BI) ─────────── */}
        <TabsContent value="apercu" className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            {kpis.map((k) => (
              <Card key={k.label} className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                <CardContent className="pt-5">
                  <k.icon className="h-5 w-5 text-muted-foreground" />
                  <p className="mt-2 text-2xl font-bold">{k.value}</p>
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {nbCandidats === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Aucune donnée pédagogique pour le moment. Les statistiques apparaîtront dès que des
                élèves auront commencé leur préparation.
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Répartition par mention</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[...parMention.entries()].length === 0 ? (
                  <p className="text-sm text-muted-foreground">—</p>
                ) : (
                  [...parMention.entries()].map(([m, n]) => (
                    <div key={m} className="flex items-center gap-3">
                      <span className="w-44 shrink-0 text-sm">{MENTION_LABEL[m] ?? m}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${pct(n, assessments.length)}%` }} />
                      </div>
                      <span className="w-8 shrink-0 text-right text-xs font-medium">{n}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Parcours recommandés</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {[...parParcours.entries()].length === 0 ? (
                  <p className="text-sm text-muted-foreground">—</p>
                ) : (
                  [...parParcours.entries()].map(([p, n]) => (
                    <Badge key={p} variant="secondary" className="text-sm">
                      {PATH_LABEL[p] ?? p} : {n}
                    </Badge>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-4 w-4" /> Thématiques problématiques
                </CardTitle>
              </CardHeader>
              <CardContent>
                {thematiquesDures.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune faiblesse enregistrée.</p>
                ) : (
                  <ul className="space-y-2">
                    {thematiquesDures.map((t) => (
                      <li key={`${t.theme}-${t.sousTheme}`} className="flex items-center justify-between gap-2 text-sm">
                        <span>
                          <Badge variant="outline" className="mr-2 text-[10px]">{t.theme}</Badge>
                          {t.sousTheme}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          maîtrise {t.maitrise}% · {t.errors} err.
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Modules les moins performants</CardTitle>
              </CardHeader>
              <CardContent>
                {modulesFaibles.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun module suivi.</p>
                ) : (
                  <ul className="space-y-2">
                    {modulesFaibles.map((m) => (
                      <li key={m.moduleId} className="flex items-center justify-between gap-2 text-sm">
                        <span>{moduleLabel(m.moduleId)}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          moy. {m.moyenne}% · {m.n} candidat(s)
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─────────── Tarifs ─────────── */}
        <TabsContent value="tarifs">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Wallet className="h-4 w-4" /> Tarifs de la préparation en ligne
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {mentionsTarif.map((m) => {
                const t = tarifMap.get(m);
                const prix = t ? t.prixCents / 100 : TARIF_DEFAUT[m] / 100;
                return (
                  <form
                    key={m}
                    action={setCivicTarif}
                    className="flex flex-wrap items-end gap-3 rounded-lg border bg-muted/20 p-3"
                  >
                    <input type="hidden" name="mention" value={m} />
                    <span className="min-w-44 text-sm font-medium">{MENTION_LABEL[m] ?? m}</span>
                    <label className="text-xs text-muted-foreground">
                      Prix (€)
                      <input
                        name="prix"
                        type="number"
                        step="1"
                        min="0"
                        defaultValue={prix}
                        className="mt-1 block w-24 rounded-md border bg-background px-2 py-1 text-sm"
                      />
                    </label>
                    <label className="text-xs text-muted-foreground">
                      Remise (%)
                      <input
                        name="remise"
                        type="number"
                        min="0"
                        max="100"
                        defaultValue={t?.remisePct ?? 0}
                        className="mt-1 block w-20 rounded-md border bg-background px-2 py-1 text-sm"
                      />
                    </label>
                    <label className="flex items-center gap-1.5 text-xs">
                      <input name="actif" type="checkbox" defaultChecked={t?.actif ?? true} /> Actif
                    </label>
                    <Button type="submit" size="sm" variant="outline">
                      Enregistrer
                    </Button>
                    {!t && <span className="text-[11px] text-muted-foreground">(prix par défaut)</span>}
                  </form>
                );
              })}
              <p className="text-xs text-muted-foreground">
                La remise s&apos;applique au prix affiché. Les codes promo Stripe restent activables en
                plus (dans le tableau de bord Stripe).
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
