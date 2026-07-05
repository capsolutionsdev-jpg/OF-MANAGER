"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { orgConfigFor } from "@/lib/org-identity";

const STAFF = ["SUPERADMIN", "ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"];
type Result = { ok: true } | { ok: false; error: string };

async function staffOrg(): Promise<string> {
  const session = await auth();
  const role = session?.user?.role as string | undefined;
  const organismeId = session?.user?.organismeId;
  if (!session?.user || !role || !STAFF.includes(role) || !organismeId) throw new Error("Non autorisé.");
  return organismeId;
}

/** Tâches en attente d'une session (dossiers, signatures, convocations, positionnements). */
async function pendingForSession(sessionId: string, organismeId: string) {
  const s = await prisma.session.findFirst({
    where: { id: sessionId, organismeId },
    select: {
      id: true,
      formation: { select: { titre: true, piecesAttendues: true } },
      inscriptions: {
        where: { statut: { not: "ANNULEE" } },
        select: {
          piecesRecues: true,
          signedAt: true,
          convocationSentAt: true,
          positionnementCompletedAt: true,
          candidat: { select: { nom: true, prenom: true } },
        },
      },
    },
  });
  if (!s) return null;
  const pa = s.formation.piecesAttendues;
  const dossier: string[] = [];
  const nonSigne: string[] = [];
  const convocation: string[] = [];
  const positionnement: string[] = [];
  for (const i of s.inscriptions) {
    const nom = `${i.candidat.prenom} ${i.candidat.nom}`.trim();
    if (pa.length > 0 && pa.some((p) => !i.piecesRecues.includes(p))) dossier.push(nom);
    if (!i.signedAt) nonSigne.push(nom);
    if (!i.convocationSentAt) convocation.push(nom);
    if (!i.positionnementCompletedAt) positionnement.push(nom);
  }
  const groups = [
    { label: "Dossiers incomplets", noms: dossier },
    { label: "Documents non signés", noms: nonSigne },
    { label: "Convocations à envoyer", noms: convocation },
    { label: "Positionnements non faits", noms: positionnement },
  ];
  const bloquants = dossier.length + nonSigne.length; // conformité : dossier complet + signé
  return { titre: s.formation.titre, groups, bloquants };
}

/** Archive (clôture) la session — REFUSÉ si dossiers incomplets ou non signés (garde-fou Qualiopi). */
export async function archiverSession(sessionId: string): Promise<Result> {
  const organismeId = await staffOrg();
  const data = await pendingForSession(sessionId, organismeId);
  if (!data) return { ok: false, error: "Session introuvable." };
  if (data.bloquants > 0) {
    const details = data.groups
      .filter((g) => g.label.startsWith("Dossiers") || g.label.startsWith("Documents"))
      .filter((g) => g.noms.length > 0)
      .map((g) => `${g.label} (${g.noms.length})`)
      .join(" · ");
    return {
      ok: false,
      error: `Archivage impossible : session non complète/validée. À traiter : ${details}.`,
    };
  }
  await prisma.session.update({ where: { id: sessionId }, data: { statut: "TERMINEE" } });
  revalidatePath(`/sessions/${sessionId}`);
  revalidatePath("/sessions");
  return { ok: true };
}

/** Envoie un e-mail de rappel à tous les collaborateurs (staff) avec les tâches en attente. */
export async function notifierCollaborateurs(sessionId: string): Promise<Result> {
  const organismeId = await staffOrg();
  const data = await pendingForSession(sessionId, organismeId);
  if (!data) return { ok: false, error: "Session introuvable." };

  const users = await prisma.user.findMany({
    where: { organismeId, isActive: true, role: { in: ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"] } },
    select: { email: true },
  });
  const dest = users.filter((u) => u.email && u.email.includes("@"));
  if (dest.length === 0) return { ok: false, error: "Aucun collaborateur avec e-mail." };

  const org = await orgConfigFor(organismeId);
  const actifs = data.groups.filter((g) => g.noms.length > 0);
  const liste = actifs.length
    ? actifs.map((g) => `• ${g.label} : ${g.noms.join(", ")}`).join("\n")
    : "Tout est à jour — rien à compléter.";
  const subject = `Rappel — tâches à compléter : ${data.titre}`;
  const body =
    `Bonjour,\n\n` +
    `Pour la session « ${data.titre} », voici les points à compléter :\n\n${liste}\n\n` +
    `Merci de finaliser au plus vite (obligatoire pour la conformité Qualiopi et l'archivage de la session).\n\n` +
    `${org.representant} — ${org.name}`;

  let sent = 0;
  for (const u of dest) {
    const r = await sendEmail({ to: u.email as string, subject, body, organismeId });
    if (r.sent) sent++;
  }
  if (sent === 0) return { ok: false, error: "Aucun e-mail envoyé (vérifiez la configuration e-mail)." };
  return { ok: true };
}
