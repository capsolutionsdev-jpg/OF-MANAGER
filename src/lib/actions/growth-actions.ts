"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/superadmin-guard";
import { logLeadEvent } from "@/lib/growth/events";
import { detectSeparator, splitCsvLine, normalizeHeader } from "@/lib/growth/csv";

/**
 * Actions de la console growth (SUPERADMIN uniquement) : tâches de relance
 * et notes horodatées sur la timeline d'un lead.
 */

function revalidateLead(leadId: string) {
  revalidatePath("/console/prospects");
  revalidatePath(`/console/prospects/${leadId}`);
  revalidatePath("/console");
}

/** Ajoute une tâche de relance sur un lead (titre requis, échéance optionnelle). */
export async function addLeadTask(
  leadId: string,
  titre: string,
  dueAt?: string | null,
): Promise<{ ok: boolean; error?: string }> {
  await requireSuperAdmin();
  const t = titre.trim();
  if (!t) return { ok: false, error: "Titre requis." };
  const due = dueAt ? new Date(dueAt) : null;
  await prisma.leadTask.create({
    data: { leadId, titre: t.slice(0, 200), dueAt: due && !Number.isNaN(due.getTime()) ? due : null },
  });
  revalidateLead(leadId);
  return { ok: true };
}

/** Coche / décoche une tâche de relance. */
export async function toggleLeadTask(taskId: string): Promise<void> {
  await requireSuperAdmin();
  const task = await prisma.leadTask.findUnique({
    where: { id: taskId },
    select: { leadId: true, done: true },
  });
  if (!task) return;
  await prisma.leadTask.update({
    where: { id: taskId },
    data: { done: !task.done, doneAt: task.done ? null : new Date() },
  });
  revalidateLead(task.leadId);
}

/** Supprime une tâche de relance. */
export async function deleteLeadTask(taskId: string): Promise<void> {
  await requireSuperAdmin();
  const task = await prisma.leadTask.findUnique({ where: { id: taskId }, select: { leadId: true } });
  if (!task) return;
  await prisma.leadTask.delete({ where: { id: taskId } });
  revalidateLead(task.leadId);
}

/** Ajoute une note horodatée à la timeline du lead. */
export async function addLeadNote(
  leadId: string,
  contenu: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireSuperAdmin();
  const c = contenu.trim();
  if (!c) return { ok: false, error: "Note vide." };
  await logLeadEvent(leadId, "note", { titre: c.slice(0, 500) });
  revalidateLead(leadId);
  return { ok: true };
}

// ── Import CSV de leads ──────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_ROWS = 500;

export type ImportResult = {
  ok: boolean;
  error?: string;
  crees?: number;
  ignores?: number; // doublons (e-mail déjà présent) ou lignes invalides
};

/** Normalise une verticale libre → securite | transport | autre (null si vide). */
function parseVerticale(v?: string): string | null {
  const s = (v ?? "").toLowerCase();
  if (!s.trim()) return null;
  if (/s[ée]cu/.test(s)) return "securite";
  if (/transp|vtc|taxi|t3p|fimo|fco/.test(s)) return "transport";
  return "autre";
}
/** Normalise l'outil actuel → aucun | excel | concurrent | inconnu (null si vide). */
function parseOutil(v?: string): string | null {
  const s = (v ?? "").toLowerCase().trim();
  if (!s) return null;
  if (/aucun|rien|^non$/.test(s)) return "aucun";
  if (/excel|papier|tableur|word/.test(s)) return "excel";
  if (/digiforma|dendreo|smartof|hector|qualiobee|concurrent|^oui$/.test(s)) return "concurrent";
  return "inconnu";
}
/** Volume mensuel de stagiaires depuis un champ libre (null si non chiffrable). */
function parseVolume(v?: string): number | null {
  const n = parseInt((v ?? "").replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}
/** Échéance Qualiopi → moins_6_mois | plus_6_mois | non_concerne | inconnu. */
function parseQualiopi(v?: string): string | null {
  const s = (v ?? "").toLowerCase();
  if (!s.trim()) return null;
  if (/6\s*mois|urgent|<\s*6|bient|imminent/.test(s)) return "moins_6_mois";
  if (/non|pas conc|aucun/.test(s)) return "non_concerne";
  if (/mois|an|202\d/.test(s)) return "plus_6_mois";
  return "inconnu";
}

/**
 * Importe des leads depuis un fichier CSV (en-tête obligatoire ; colonnes
 * reconnues, dans n'importe quel ordre : nom, email, organisme, telephone,
 * message/notes, verticale, volume (stagiaires/mois), outil (actuel),
 * qualiopi (échéance)). Dédoublonne par e-mail (les leads existants sont ignorés).
 */
export async function importLeadsCsv(formData: FormData): Promise<ImportResult> {
  await requireSuperAdmin();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Aucun fichier fourni." };
  if (file.size > 2 * 1024 * 1024) return { ok: false, error: "Fichier trop volumineux (max 2 Mo)." };

  const text = (await file.text()).replace(/^﻿/, ""); // BOM Excel
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { ok: false, error: "CSV vide (en-tête + au moins une ligne attendus)." };

  const sep = detectSeparator(lines[0]);
  const header = splitCsvLine(lines[0], sep).map(normalizeHeader);
  const col = (names: string[]) => header.findIndex((h) => names.includes(h));
  const iNom = col(["nom", "name", "contact"]);
  const iEmail = col(["email", "e-mail", "mail", "courriel"]);
  const iOrg = col(["organisme", "organisation", "societe", "entreprise", "company"]);
  const iTel = col(["telephone", "tel", "phone", "portable", "mobile"]);
  const iMsg = col(["message", "notes", "note", "commentaire"]);
  const iVerticale = col(["verticale", "metier", "secteur", "domaine"]);
  const iVolume = col(["volume", "stagiaires", "stagiaires/mois", "volume stagiaires", "stagiaires par mois"]);
  const iOutil = col(["outil", "outil actuel", "logiciel"]);
  const iQualiopi = col(["qualiopi", "echeance qualiopi", "audit qualiopi", "audit"]);
  if (iEmail < 0) return { ok: false, error: "Colonne « email » introuvable dans l'en-tête." };

  const rows = lines.slice(1, 1 + MAX_ROWS);
  let crees = 0;
  let ignores = 0;
  for (const line of rows) {
    const cells = splitCsvLine(line, sep);
    const email = (cells[iEmail] ?? "").toLowerCase();
    if (!EMAIL_RE.test(email)) { ignores++; continue; }
    const exists = await prisma.lead.findFirst({ where: { email }, select: { id: true } });
    if (exists) { ignores++; continue; }
    const lead = await prisma.lead.create({
      data: {
        nom: (iNom >= 0 && cells[iNom]) || email,
        email,
        organisme: (iOrg >= 0 && cells[iOrg]) || null,
        telephone: (iTel >= 0 && cells[iTel]) || null,
        message: (iMsg >= 0 && cells[iMsg]) || null,
        verticale: iVerticale >= 0 ? parseVerticale(cells[iVerticale]) : null,
        volumeStagiairesMois: iVolume >= 0 ? parseVolume(cells[iVolume]) : null,
        outilActuel: iOutil >= 0 ? parseOutil(cells[iOutil]) : null,
        echeanceQualiopi: iQualiopi >= 0 ? parseQualiopi(cells[iQualiopi]) : null,
        source: "import",
        lu: true, // import en masse ≠ nouveaux à signaler un par un
      },
      select: { id: true },
    });
    await logLeadEvent(lead.id, "import", { meta: { fichier: file.name } });
    crees++;
  }
  if (lines.length - 1 > MAX_ROWS) ignores += lines.length - 1 - MAX_ROWS;

  revalidatePath("/console/prospects");
  revalidatePath("/console");
  return { ok: true, crees, ignores };
}
