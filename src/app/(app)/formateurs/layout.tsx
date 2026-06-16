import { requireSection } from "@/lib/section-guard";

// Garde d'autorisation de section (défense en profondeur) : protège toutes les
// routes /formateurs/** au rendu, en plus du contrôle middleware (auth.config.ts).
export default async function SectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSection("formateurs");
  return <>{children}</>;
}
