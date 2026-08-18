import type { ReactNode } from "react";
import { requireSection } from "@/lib/section-guard";

// Garde serveur : rôle (ADMIN / RESPONSABLE_FORMATION), permission de section et
// fonctionnalité « communication » activée pour l'organisme (cf. section-guard).
export default async function CommunicationLayout({ children }: { children: ReactNode }) {
  await requireSection("communication");
  return <>{children}</>;
}
