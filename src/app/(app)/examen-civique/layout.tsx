import { redirect } from "next/navigation";
import { hasExamenCivique } from "@/lib/civique-guard";

/**
 * Le module « Examen civique » est spécifique à CAP Compétences. Les autres
 * organismes qui tenteraient d'y accéder par URL sont renvoyés au tableau de
 * bord (le menu est déjà masqué côté navigation).
 */
export default async function ExamenCiviqueLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await hasExamenCivique())) redirect("/dashboard");
  return <>{children}</>;
}
