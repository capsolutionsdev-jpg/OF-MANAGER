import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "./forgot-form";

export const metadata: Metadata = {
  title: "Mot de passe oublié — OFManager",
  robots: { index: false, follow: false },
};

export default function MotDePasseOubliePage() {
  return (
    <div className="grid min-h-screen place-items-center bg-muted/40 p-6">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-sm">
        <h1 className="mb-2 text-center text-xl font-bold">Mot de passe oublié</h1>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          Saisissez l&apos;adresse e-mail de votre compte. Si elle correspond à un compte
          existant, vous recevrez un lien pour définir un nouveau mot de passe.
        </p>
        <ForgotPasswordForm />
        <p className="mt-6 text-center text-sm">
          <Link href="/login" className="text-primary hover:underline">
            ← Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  );
}
