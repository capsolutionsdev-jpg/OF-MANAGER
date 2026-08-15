import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

// 404 de l'espace connecté : rendue DANS le shell (rail + barre du haut) grâce au
// layout (app), donc l'utilisateur garde sa navigation. Couvre les 57 appels
// notFound() du back-office (ressource d'un autre tenant, id inexistant…).
export default function AppNotFound() {
  return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <Compass className="mx-auto h-10 w-10 text-muted-foreground" />
      <h2 className="mt-4 text-lg font-semibold">Ressource introuvable</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Cet élément n&apos;existe pas, a été supprimé, ou ne fait pas partie de votre organisme.
      </p>
      <div className="mt-4 flex justify-center">
        <Button variant="outline" render={<Link href="/dashboard" />}>
          Retour au tableau de bord
        </Button>
      </div>
    </div>
  );
}
