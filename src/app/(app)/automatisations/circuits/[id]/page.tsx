import { notFound } from "next/navigation";
import { requireTenant } from "@/lib/tenant";
import { CircuitEditor, type EditorStep } from "@/components/automatisations/circuit-editor";

export const dynamic = "force-dynamic";

export default async function CircuitEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db } = await requireTenant();
  const circuit = await db.circuit.findUnique({
    where: { id },
    include: { steps: { orderBy: [{ ancre: "asc" }, { offsetJours: "asc" }, { ordre: "asc" }] } },
  });
  if (!circuit) notFound();

  const steps: EditorStep[] = circuit.steps.map((s) => ({
    id: s.id,
    ancre: s.ancre,
    offsetJours: s.offsetJours,
    audience: s.audience,
    typeAction: s.typeAction,
    titre: s.titre,
    emailSujet: s.emailSujet,
    emailCorps: s.emailCorps,
    documentType: s.documentType,
  }));

  return (
    <CircuitEditor
      id={circuit.id}
      nom={circuit.nom}
      description={circuit.description}
      actif={circuit.actif}
      steps={steps}
    />
  );
}
