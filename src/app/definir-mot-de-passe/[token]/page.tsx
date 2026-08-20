import { prisma } from "@/lib/prisma";
import { inviteTokenExpired } from "@/lib/entreprise-invite";
import { SetPasswordForm } from "./set-password-form";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const user = await prisma.user.findUnique({ where: { inviteToken: token }, select: { inviteTokenExpiry: true } });
  const valide = !!user && !inviteTokenExpired(user.inviteTokenExpiry);
  return (
    <div className="grid min-h-screen place-items-center bg-muted/40 p-6">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-sm">
        <h1 className="mb-4 text-center text-xl font-bold">Définir mon mot de passe</h1>
        {valide ? <SetPasswordForm token={token} /> : (
          <p className="text-center text-sm text-muted-foreground">Lien invalide ou expiré. Contactez votre organisme de formation pour un nouvel accès.</p>
        )}
      </div>
    </div>
  );
}
