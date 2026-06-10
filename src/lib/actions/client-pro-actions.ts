"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error("Non autorisé.");
  return session.user;
}

function champs(formData: FormData) {
  const v = (k: string) => String(formData.get(k) ?? "").trim() || null;
  return {
    raisonSociale: String(formData.get("raisonSociale") ?? "").trim(),
    siret: v("siret"),
    numeroTva: v("numeroTva"),
    adresse: v("adresse"),
    codePostal: v("codePostal"),
    ville: v("ville"),
    representant: v("representant"),
    fonction: v("fonction"),
    contactNom: v("contactNom"),
    contactEmail: v("contactEmail"),
    contactTel: v("contactTel"),
    opco: v("opco"),
    notes: v("notes"),
  };
}

export async function creerClientPro(formData: FormData) {
  await requireUser();
  const data = champs(formData);
  if (!data.raisonSociale) throw new Error("Raison sociale requise.");
  const client = await prisma.entreprise.create({ data });
  revalidatePath("/clients-pro");
  redirect(`/clients-pro/${client.id}`);
}

export async function majClientPro(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.entreprise.update({ where: { id }, data: champs(formData) });
  revalidatePath(`/clients-pro/${id}`);
  revalidatePath("/clients-pro");
}

export async function rattacherCandidat(formData: FormData) {
  await requireUser();
  const entrepriseId = String(formData.get("entrepriseId") ?? "");
  const candidatId = String(formData.get("candidatId") ?? "");
  if (!entrepriseId || !candidatId) return;
  await prisma.candidat.update({
    where: { id: candidatId },
    data: { entrepriseId },
  });
  revalidatePath(`/clients-pro/${entrepriseId}`);
}

export async function detacherCandidat(formData: FormData) {
  await requireUser();
  const entrepriseId = String(formData.get("entrepriseId") ?? "");
  const candidatId = String(formData.get("candidatId") ?? "");
  if (!candidatId) return;
  await prisma.candidat.update({
    where: { id: candidatId },
    data: { entrepriseId: null },
  });
  revalidatePath(`/clients-pro/${entrepriseId}`);
}
