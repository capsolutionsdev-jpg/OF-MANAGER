import { Clock } from "lucide-react";
import { Card } from "@/components/ui/card";

/** Détecte l'erreur Prisma « table inexistante » (P2021) : la migration
 * `SocialContentAsset` n'a pas encore été appliquée sur cette base. */
export function isMissingTable(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "P2021";
}

/** État affiché tant que la table n'est pas créée : évite un 500 si le code est
 * déployé avant le `prisma db push` (le reste de l'app n'est pas impacté). */
export function ModulePending() {
  return (
    <Card className="flex flex-col items-center gap-3 p-10 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Clock className="size-6" />
      </span>
      <p className="font-semibold">Module en cours d&apos;activation</p>
      <p className="max-w-md text-sm text-muted-foreground">
        La base de données n&apos;a pas encore été initialisée pour ce module. Il sera disponible dès que
        la mise à jour technique aura été appliquée — réessayez dans quelques minutes.
      </p>
    </Card>
  );
}
