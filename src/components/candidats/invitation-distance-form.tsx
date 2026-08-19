"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { creerProspectEtInviter } from "@/lib/actions/prospect-actions";

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

/**
 * Inscription « à distance » : on saisit le strict minimum (nom, prénom, e-mail
 * + formation souhaitée facultative). Le candidat reçoit un e-mail l'invitant à
 * compléter son dossier et à signer en ligne ; il arrive dans les prospects.
 */
export function InvitationDistanceForm({
  formations,
}: {
  formations: { id: string; titre: string }[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [email, setEmail] = useState("");
  const [formationSouhaiteeId, setFormationSouhaiteeId] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!nom.trim() || !prenom.trim() || !email.trim()) {
      toast.error("Nom, prénom et e-mail sont requis.");
      return;
    }
    startTransition(async () => {
      const res = await creerProspectEtInviter({
        nom,
        prenom,
        email,
        formationSouhaiteeId: formationSouhaiteeId || undefined,
      });
      if (res.ok) {
        toast.success(res.error ?? "Invitation envoyée au candidat par e-mail.");
        if (res.candidatId) router.push(`/candidats/${res.candidatId}`);
        router.refresh();
      } else {
        toast.error(res.error ?? "Erreur.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Inscription à distance</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Renseignez le strict minimum. Le candidat recevra un e-mail pour
            <b> compléter son dossier et signer en ligne</b>, puis apparaîtra dans vos
            prospects (vous recevez une notification à la complétion).
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="d-nom">Nom *</Label>
              <Input id="d-nom" value={nom} onChange={(e) => setNom(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="d-prenom">Prénom *</Label>
              <Input id="d-prenom" value={prenom} onChange={(e) => setPrenom(e.target.value)} />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="d-email">Email *</Label>
              <Input
                id="d-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="prenom.nom@exemple.fr"
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="d-formation">Formation souhaitée (facultatif)</Label>
              <select
                id="d-formation"
                className={selectClass}
                value={formationSouhaiteeId}
                onChange={(e) => setFormationSouhaiteeId(e.target.value)}
              >
                <option value="">— À préciser par le candidat —</option>
                {formations.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.titre}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Button type="submit" disabled={isPending}>
            <Send className="mr-2 h-4 w-4" />
            {isPending ? "Envoi…" : "Envoyer l'e-mail d'inscription"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
