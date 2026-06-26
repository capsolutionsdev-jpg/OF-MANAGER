"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  UserPlus,
  Search,
  MoreHorizontal,
  Copy,
  Eye,
  PauseCircle,
  PlayCircle,
  XCircle,
  CalendarPlus,
  RefreshCw,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExportMenu } from "@/components/export-menu";
import {
  createCivicStudent,
  setCivicAccessStatut,
  extendCivicAccess,
  regenerateCivicCode,
} from "@/lib/actions/civique-actions";

export type CivicStudentRow = {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string | null;
  code: string | null;
  createdAt: string;
  statut: "ACTIF" | "SUSPENDU" | "DESACTIVE";
  accessUntil: string | null;
  expired: boolean;
  mentions: string[];
  progression: number;
  modulesFaits: number;
  bestMock: number | null;
  proba: number | null;
  lastActivity: string | null;
  assessment: {
    mention: string;
    languageScore: number;
    civicsScore: number;
    recommendedPath: string;
    date: string;
  } | null;
  mocks: { score: number; proba: number; date: string }[];
  progressDetail: {
    moduleId: string;
    score: number;
    completionRate: number;
    status: string;
    timeSpent: number;
  }[];
};

const MENTIONS = [
  { value: "CSP", label: "Carte de séjour pluriannuelle (CSP)" },
  { value: "CR", label: "Carte de résident (CR)" },
  { value: "NATURALISATION", label: "Naturalisation" },
] as const;
const MENTION_SHORT: Record<string, string> = { CSP: "CSP", CR: "CR", NATURALISATION: "NAT" };
const THEME_LABEL: Record<string, string> = {
  T1: "Valeurs", T2: "Institutions", T3: "Droits & devoirs", T4: "Histoire", T5: "Vie quotidienne",
};

const inputCx =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function effectiveStatut(s: CivicStudentRow) {
  if (s.statut === "DESACTIVE") return { label: "Désactivé", cls: "bg-muted text-muted-foreground" };
  if (s.statut === "SUSPENDU") return { label: "Suspendu", cls: "bg-amber-100 text-amber-800" };
  if (s.expired) return { label: "Expiré", cls: "bg-muted text-muted-foreground" };
  return { label: "Actif", cls: "bg-emerald-100 text-emerald-800" };
}

export function CivicStudentsManager({ students }: { students: CivicStudentRow[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"TOUS" | "ACTIF" | "SUSPENDU" | "DESACTIVE" | "EXPIRE">("TOUS");
  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState<CivicStudentRow | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students.filter((s) => {
      if (q && !`${s.prenom} ${s.nom} ${s.email}`.toLowerCase().includes(q)) return false;
      if (filter === "TOUS") return true;
      if (filter === "EXPIRE") return s.statut === "ACTIF" && s.expired;
      if (filter === "ACTIF") return s.statut === "ACTIF" && !s.expired;
      return s.statut === filter;
    });
  }, [students, query, filter]);

  function runAction(p: Promise<{ ok: boolean; error?: string }>, okMsg: string) {
    startTransition(async () => {
      const r = await p;
      if (r.ok) toast.success(okMsg);
      else toast.error(r.error ?? "Action impossible.");
    });
  }

  function copyCode(code: string | null) {
    if (!code) return toast.error("Aucun code.");
    navigator.clipboard.writeText(code).then(
      () => toast.success("Code copié."),
      () => toast.error("Copie impossible."),
    );
  }

  const counts = useMemo(() => {
    const c = { actifs: 0, suspendus: 0, expires: 0 };
    for (const s of students) {
      if (s.statut === "SUSPENDU") c.suspendus++;
      else if (s.statut === "ACTIF" && s.expired) c.expires++;
      else if (s.statut === "ACTIF") c.actifs++;
    }
    return c;
  }, [students]);

  const expiringSoon = useMemo(() => {
    const limit = Date.now() + 7 * 24 * 60 * 60 * 1000;
    return students.filter(
      (s) => s.statut === "ACTIF" && !s.expired && s.accessUntil && new Date(s.accessUntil).getTime() < limit,
    );
  }, [students]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary">{students.length} compte(s)</Badge>
          <span className="text-emerald-700">{counts.actifs} actif(s)</span>
          <span className="text-amber-700">{counts.suspendus} suspendu(s)</span>
          <span>{counts.expires} expiré(s)</span>
        </div>
        <div className="flex items-center gap-2">
          <ExportMenu href="/examen-civique/export/pedagogique" label="Exporter" size="sm" />
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <UserPlus className="mr-1.5 h-4 w-4" /> Créer un compte
          </Button>
        </div>
      </div>

      {expiringSoon.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-900">
            <Clock className="h-4 w-4" /> {expiringSoon.length} accès expire(nt) dans les 7 jours
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {expiringSoon.slice(0, 8).map((s) => (
              <button
                key={s.id}
                onClick={() => runAction(extendCivicAccess(s.id, 30), `Accès de ${s.prenom} prolongé de 30 jours.`)}
                className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-white px-2.5 py-1 text-xs text-amber-900 hover:bg-amber-100"
                title="Prolonger de 30 jours"
              >
                <CalendarPlus className="h-3 w-3" /> {s.prenom} {s.nom} ({fmtDate(s.accessUntil)})
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher (nom, e-mail)…"
            className={inputCx + " pl-8"}
          />
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className={inputCx + " w-44"}>
          <option value="TOUS">Tous les statuts</option>
          <option value="ACTIF">Actifs</option>
          <option value="SUSPENDU">Suspendus</option>
          <option value="EXPIRE">Expirés</option>
          <option value="DESACTIVE">Désactivés</option>
        </select>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Élève</TableHead>
              <TableHead>Formation</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Progression</TableHead>
              <TableHead>Examen blanc</TableHead>
              <TableHead>Fin d'accès</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                  Aucun compte. Cliquez « Créer un compte » pour en ajouter un.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((s) => {
                const st = effectiveStatut(s);
                return (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="font-medium">{s.prenom} {s.nom}</div>
                      <div className="text-xs text-muted-foreground">{s.email}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {s.mentions.length === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          s.mentions.map((m) => (
                            <Badge key={m} variant="outline" className="text-[10px]">{MENTION_SHORT[m] ?? m}</Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${st.cls}`}>{st.label}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${s.progression}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground">{s.progression}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {s.bestMock === null ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <span className={s.bestMock >= 80 ? "font-medium text-emerald-700" : ""}>{s.bestMock}%</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{fmtDate(s.accessUntil)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={<Button variant="ghost" size="icon" className="h-8 w-8" />}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuItem onClick={() => setDetail(s)}>
                            <Eye className="mr-2 h-4 w-4" /> Voir la fiche
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => copyCode(s.code)}>
                            <Copy className="mr-2 h-4 w-4" /> Copier le code
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {s.statut !== "ACTIF" && (
                            <DropdownMenuItem onClick={() => runAction(setCivicAccessStatut(s.id, "ACTIF"), "Compte réactivé.")}>
                              <PlayCircle className="mr-2 h-4 w-4" /> Réactiver
                            </DropdownMenuItem>
                          )}
                          {s.statut === "ACTIF" && (
                            <DropdownMenuItem onClick={() => runAction(setCivicAccessStatut(s.id, "SUSPENDU"), "Compte suspendu.")}>
                              <PauseCircle className="mr-2 h-4 w-4" /> Suspendre
                            </DropdownMenuItem>
                          )}
                          {s.statut !== "DESACTIVE" && (
                            <DropdownMenuItem onClick={() => runAction(setCivicAccessStatut(s.id, "DESACTIVE"), "Compte désactivé.")}>
                              <XCircle className="mr-2 h-4 w-4" /> Désactiver
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => runAction(extendCivicAccess(s.id, 30), "Accès prolongé de 30 jours.")}>
                            <CalendarPlus className="mr-2 h-4 w-4" /> Prolonger +30 j
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => runAction(extendCivicAccess(s.id, 90), "Accès prolongé de 90 jours.")}>
                            <CalendarPlus className="mr-2 h-4 w-4" /> Prolonger +90 j
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              startTransition(async () => {
                                const r = await regenerateCivicCode(s.id);
                                if (r.ok) {
                                  toast.success("Nouveau code généré.");
                                  navigator.clipboard.writeText(r.code).catch(() => {});
                                } else toast.error(r.error ?? "Échec.");
                              })
                            }
                          >
                            <RefreshCw className="mr-2 h-4 w-4" /> Régénérer le code
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <CreateStudentDialog open={createOpen} onOpenChange={setCreateOpen} />
      <StudentDetailDialog student={detail} onClose={() => setDetail(null)} />

      {isPending && <p className="text-xs text-muted-foreground">Traitement…</p>}
    </div>
  );
}

function CreateStudentDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({ nom: "", prenom: "", email: "", telephone: "", mention: "CSP", dureeJours: 30, envoyerEmail: true });
  const [code, setCode] = useState<string | null>(null);

  function reset() {
    setForm({ nom: "", prenom: "", email: "", telephone: "", mention: "CSP", dureeJours: 30, envoyerEmail: true });
    setCode(null);
  }

  function submit() {
    startTransition(async () => {
      const r = await createCivicStudent({
        nom: form.nom,
        prenom: form.prenom,
        email: form.email,
        telephone: form.telephone,
        mention: form.mention as "CSP" | "CR" | "NATURALISATION",
        dureeJours: Number(form.dureeJours),
        envoyerEmail: form.envoyerEmail,
      });
      if (r.ok) {
        setCode(r.code);
        toast.success(form.envoyerEmail ? "Compte créé, code envoyé par e-mail." : "Compte créé.");
      } else toast.error(r.error);
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Créer un compte élève</DialogTitle>
          <DialogDescription>Génère un accès e-learning et son code de connexion.</DialogDescription>
        </DialogHeader>

        {code ? (
          <div className="space-y-3">
            <div className="rounded-lg border bg-emerald-50 p-4 text-sm">
              <p className="font-medium text-emerald-900">Compte créé ✓</p>
              <p className="mt-1 text-emerald-800">Code d'accès (e-mail : {form.email.toLowerCase()}) :</p>
              <code className="mt-1 block break-all rounded bg-white px-2 py-1 font-mono text-xs">{code}</code>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => navigator.clipboard.writeText(code).then(() => toast.success("Code copié."))}>
                <Copy className="mr-1.5 h-4 w-4" /> Copier le code
              </Button>
              <Button onClick={() => { reset(); onOpenChange(false); }}>Terminer</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="cs-prenom">Prénom</Label>
                <Input id="cs-prenom" value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="cs-nom">Nom</Label>
                <Input id="cs-nom" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
              </div>
            </div>
            <div>
              <Label htmlFor="cs-email">E-mail</Label>
              <Input id="cs-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="cs-tel">Téléphone</Label>
                <Input id="cs-tel" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="cs-duree">Durée d'accès (jours)</Label>
                <Input id="cs-duree" type="number" min={1} max={365} value={form.dureeJours} onChange={(e) => setForm({ ...form, dureeJours: Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <Label htmlFor="cs-mention">Formation</Label>
              <select id="cs-mention" value={form.mention} onChange={(e) => setForm({ ...form, mention: e.target.value })} className={inputCx}>
                {MENTIONS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.envoyerEmail} onChange={(e) => setForm({ ...form, envoyerEmail: e.target.checked })} />
              Envoyer le code d'accès par e-mail
            </label>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Annuler</Button>
              <Button onClick={submit} disabled={isPending}>{isPending ? "Création…" : "Créer le compte"}</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StudentDetailDialog({ student, onClose }: { student: CivicStudentRow | null; onClose: () => void }) {
  if (!student) return null;
  const s = student;
  const minutes = Math.round(s.progressDetail.reduce((a, p) => a + p.timeSpent, 0) / 60);
  return (
    <Dialog open={!!student} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{s.prenom} {s.nom}</DialogTitle>
          <DialogDescription>{s.email}{s.telephone ? ` · ${s.telephone}` : ""}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <Info label="Statut" value={effectiveStatut(s).label} />
            <Info label="Fin d'accès" value={fmtDate(s.accessUntil)} />
            <Info label="Créé le" value={fmtDate(s.createdAt)} />
            <Info label="Temps de travail" value={`${minutes} min`} />
          </div>

          {s.code && (
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Code d'accès</p>
              <code className="break-all font-mono text-xs">{s.code}</code>
            </div>
          )}

          {s.assessment ? (
            <div className="rounded-lg border p-3">
              <p className="mb-2 font-medium">Positionnement</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <Metric label="Français" value={`${s.assessment.languageScore}%`} />
                <Metric label="Civisme" value={`${s.assessment.civicsScore}%`} />
                <Metric label="Parcours" value={s.assessment.recommendedPath} />
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Positionnement non encore réalisé.</p>
          )}

          <div className="rounded-lg border p-3">
            <p className="mb-2 font-medium">Progression par module</p>
            {s.progressDetail.length === 0 ? (
              <p className="text-xs text-muted-foreground">Aucun module commencé.</p>
            ) : (
              <ul className="space-y-1.5">
                {s.progressDetail.map((p) => {
                  const [, theme] = p.moduleId.split(":");
                  return (
                    <li key={p.moduleId} className="flex items-center justify-between gap-2">
                      <span>{THEME_LABEL[theme] ?? theme}</span>
                      <span className="text-xs text-muted-foreground">
                        {p.completionRate}% · score {p.score}%
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="rounded-lg border p-3">
            <p className="mb-2 font-medium">Examens blancs</p>
            {s.mocks.length === 0 ? (
              <p className="text-xs text-muted-foreground">Aucun examen blanc passé.</p>
            ) : (
              <ul className="space-y-1.5">
                {s.mocks.slice(0, 6).map((m, i) => (
                  <li key={i} className="flex items-center justify-between gap-2">
                    <span>{fmtDate(m.date)}</span>
                    <span className={m.score >= 80 ? "font-medium text-emerald-700" : ""}>
                      {m.score}% · proba {m.proba}%
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/40 py-2">
      <p className="text-base font-bold">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
