"use server";

import { revalidatePath } from "next/cache";
import { CircuitAncre, CircuitAudience, CircuitActionType } from "@prisma/client";
import { requireStaffTenant } from "@/lib/tenant";

// Actions CRUD des circuits d'automatisation (studio visuel). Réservées au
// personnel de l'organisme (requireStaffTenant) et cloisonnées par tenant
// (scopedPrisma injecte organismeId en écriture, filtre en lecture).

const ANCRES = new Set(Object.values(CircuitAncre) as string[]);
const AUDIENCES = new Set(Object.values(CircuitAudience) as string[]);
const ACTIONS = new Set(Object.values(CircuitActionType) as string[]);

function revalidate(circuitId?: string) {
  revalidatePath("/automatisations/circuits");
  if (circuitId) revalidatePath(`/automatisations/circuits/${circuitId}`);
}

export async function createCircuit(nom: string): Promise<{ id: string }> {
  const { db } = await requireStaffTenant();
  const c = await db.circuit.create({
    data: { nom: nom.trim().slice(0, 120) || "Nouveau circuit" },
    select: { id: true },
  });
  revalidate();
  return { id: c.id };
}

export async function renameCircuit(id: string, nom: string, description?: string): Promise<void> {
  const { db } = await requireStaffTenant();
  await db.circuit.updateMany({
    where: { id },
    data: { nom: nom.trim().slice(0, 120) || "Circuit", description: description?.trim().slice(0, 500) || null },
  });
  revalidate(id);
}

export async function toggleCircuitActif(id: string): Promise<void> {
  const { db } = await requireStaffTenant();
  const c = await db.circuit.findUnique({ where: { id }, select: { actif: true } });
  if (!c) return;
  await db.circuit.updateMany({ where: { id }, data: { actif: !c.actif } });
  revalidate(id);
}

export async function deleteCircuit(id: string): Promise<void> {
  const { db } = await requireStaffTenant();
  await db.circuit.deleteMany({ where: { id } }); // cascade → étapes + runs
  revalidate(id);
}

export type StepInput = {
  ancre?: string;
  offsetJours?: number;
  audience?: string;
  typeAction?: string;
  titre?: string;
  emailSujet?: string;
  emailCorps?: string;
  documentType?: string;
};

function cleanStep(input: StepInput) {
  const ancre = ANCRES.has(input.ancre ?? "") ? (input.ancre as CircuitAncre) : CircuitAncre.DEBUT;
  const audience = AUDIENCES.has(input.audience ?? "") ? (input.audience as CircuitAudience) : CircuitAudience.APPRENANT;
  const typeAction = ACTIONS.has(input.typeAction ?? "") ? (input.typeAction as CircuitActionType) : CircuitActionType.EMAIL;
  const offsetRaw = Number(input.offsetJours);
  const offsetJours = Number.isFinite(offsetRaw) ? Math.max(-365, Math.min(365, Math.trunc(offsetRaw))) : 0;
  return {
    ancre,
    audience,
    typeAction,
    offsetJours,
    titre: input.titre?.trim().slice(0, 120) || null,
    emailSujet: input.emailSujet?.trim().slice(0, 200) || null,
    emailCorps: input.emailCorps?.trim().slice(0, 5000) || null,
    documentType: input.documentType?.trim().slice(0, 80) || null,
  };
}

export async function addStep(circuitId: string, input: StepInput): Promise<{ ok: boolean; error?: string }> {
  const { db } = await requireStaffTenant();
  // Le circuit doit appartenir au tenant (scopedPrisma → null sinon).
  const circuit = await db.circuit.findUnique({ where: { id: circuitId }, select: { id: true } });
  if (!circuit) return { ok: false, error: "Circuit introuvable." };
  const count = await db.circuitStep.count({ where: { circuitId } });
  await db.circuitStep.create({ data: { circuitId, ordre: count, ...cleanStep(input) } });
  revalidate(circuitId);
  return { ok: true };
}

export async function updateStep(stepId: string, input: StepInput): Promise<void> {
  const { db } = await requireStaffTenant();
  const step = await db.circuitStep.findUnique({ where: { id: stepId }, select: { circuitId: true } });
  if (!step) return;
  await db.circuitStep.updateMany({ where: { id: stepId }, data: cleanStep(input) });
  revalidate(step.circuitId);
}

export async function deleteStep(stepId: string): Promise<void> {
  const { db } = await requireStaffTenant();
  const step = await db.circuitStep.findUnique({ where: { id: stepId }, select: { circuitId: true } });
  if (!step) return;
  await db.circuitStep.deleteMany({ where: { id: stepId } });
  revalidate(step.circuitId);
}
