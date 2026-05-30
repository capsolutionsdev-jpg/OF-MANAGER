import type { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "./login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Connexion — CAP Compétence Manager",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="relative mb-3 h-14 w-56">
            <Image
              src="/cap-competences-logo.png"
              alt="CAP Compétences"
              fill
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-lg font-bold">Compétence Manager</h1>
          <p className="text-sm text-muted-foreground">
            Plateforme de gestion de l&apos;organisme de formation
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Connexion</CardTitle>
            <CardDescription>
              Accédez à votre espace avec vos identifiants.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
