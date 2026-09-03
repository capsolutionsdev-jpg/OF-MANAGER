import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { hashResetToken, resetTokenExpired, RESET_TTL_MINUTES } from "@/lib/security/password-reset";
import { ResetPasswordForm } from "./reset-form";

export const metadata: Metadata = {
  title: "Réinitialisation du mot de passe — OFManager",
  robots: { index: false, follow: false },
};

// Le jeton est propre à chaque requête → jamais mis en cache.
export const dynamic = "force-dynamic";

export default async function ReinitialisationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  // On ne stocke que l'EMPREINTE du jeton : on re-hache celui de l'URL pour retrouver
  // le compte. Un jeton en clair fuité en base ne peut donc pas exister.
  const user = await prisma.user.findUnique({
    where: { resetTokenHash: hashResetToken(token) },
    select: { resetTokenExpiry: true },
  });
  const valide = !!user && !resetTokenExpired(user.resetTokenExpiry);

  return (
    <div className="grid min-h-screen place-items-center bg-muted/40 p-6">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-sm">
        <h1 className="mb-4 text-center text-xl font-bold">Nouveau mot de passe</h1>
        {valide ? (
          <ResetPasswordForm token={token} />
        ) : (
          <div className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              Ce lien est invalide ou a expiré. Les liens de réinitialisation sont valables{" "}
              {RESET_TTL_MINUTES} minutes et à usage unique.
            </p>
            <Link
              href="/mot-de-passe-oublie"
              className="inline-block text-sm text-primary hover:underline"
            >
              Demander un nouveau lien
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
