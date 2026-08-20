"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setPasswordFromInvite } from "@/lib/actions/entreprise-account-actions";

export function SetPasswordForm({ token }: { token: string }) {
  const [pw, setPw] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await setPasswordFromInvite(token, pw);
          if (r.ok) { toast.success("Mot de passe défini. Vous pouvez vous connecter."); router.push("/login"); }
          else toast.error(r.error ?? "Erreur");
        });
      }}
    >
      <Input type="password" minLength={8} required placeholder="Nouveau mot de passe (8+ caractères)" value={pw} onChange={(e) => setPw(e.target.value)} />
      <Button type="submit" disabled={pending} className="w-full">Valider</Button>
    </form>
  );
}
