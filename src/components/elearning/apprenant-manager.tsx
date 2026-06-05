"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { KeyRound, UserCheck, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  createApprenantAccount,
  assignCours,
  unassignCours,
} from "@/lib/actions/apprenant-actions";

export type CoursOption = { id: string; titre: string; academy: string };

export function ApprenantManager({
  candidatId,
  apprenantId,
  hasAccount,
  login,
  cours,
  assignedIds,
}: {
  candidatId: string;
  apprenantId: string | null;
  hasAccount: boolean;
  login: string | null;
  cours: CoursOption[];
  assignedIds: string[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [password, setPassword] = useState("");
  const [assigned, setAssigned] = useState<Set<string>>(new Set(assignedIds));

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) {
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) toast.error(res.error ?? "Erreur.");
      else {
        toast.success(ok);
        router.refresh();
      }
    });
  }

  function createAccount() {
    if (password.length < 6) {
      toast.error("Mot de passe : 6 caractères minimum.");
      return;
    }
    run(
      () => createApprenantAccount(candidatId, password),
      hasAccount ? "Mot de passe réinitialisé." : "Compte élève créé.",
    );
    setPassword("");
  }

  function toggle(coursId: string) {
    if (!apprenantId && !hasAccount) {
      toast.error("Créez d'abord le compte de l'élève.");
      return;
    }
    const id = apprenantId as string;
    const isOn = assigned.has(coursId);
    const next = new Set(assigned);
    if (isOn) next.delete(coursId);
    else next.add(coursId);
    setAssigned(next);
    run(
      () => (isOn ? unassignCours(id, coursId) : assignCours(id, coursId)),
      isOn ? "Cours retiré." : "Cours attribué.",
    );
  }

  return (
    <div className="space-y-3">
      {/* Compte */}
      <div className="flex flex-wrap items-center gap-2">
        {hasAccount ? (
          <Badge className="bg-emerald-500/10 text-emerald-700">
            <UserCheck className="mr-1 h-3 w-3" /> Compte actif{login ? ` · ${login}` : ""}
          </Badge>
        ) : (
          <Badge variant="secondary">Pas de compte</Badge>
        )}
        <Input
          type="text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={hasAccount ? "Nouveau mot de passe" : "Mot de passe (6+ car.)"}
          className="h-8 w-48"
        />
        <Button size="sm" variant="outline" onClick={createAccount} disabled={isPending}>
          <KeyRound className="mr-1.5 h-3.5 w-3.5" />
          {hasAccount ? "Réinitialiser" : "Créer le compte"}
        </Button>
      </div>

      {/* Attribution des cours */}
      <div>
        <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <BookOpen className="h-3.5 w-3.5" /> Cours attribués
        </p>
        {cours.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Aucun cours publié. Créez et publiez des cours d&apos;abord.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {cours.map((c) => {
              const on = assigned.has(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggle(c.id)}
                  disabled={isPending}
                  className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                    on
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-transparent hover:bg-muted"
                  }`}
                >
                  {on ? "✓ " : "+ "}
                  {c.titre}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
