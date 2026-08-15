import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

// 404 globale (pages publiques + fallback). Les pages de l'espace connecté ont
// leur propre not-found (cf. (app)/not-found.tsx) qui conserve le chrome.
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <Compass className="h-12 w-12 text-muted-foreground" />
      <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground">Page introuvable</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        La page que vous cherchez n&apos;existe pas ou a été déplacée.
      </p>
      <Button className="mt-6" render={<Link href="/" />}>
        Retour à l&apos;accueil
      </Button>
    </div>
  );
}
