/**
 * Export des écritures comptables au format CSV importable par les principaux
 * logiciels (tableur, Pennylane, Sage, EBP, Cegid).
 *
 * On réutilise les écritures déjà construites pour le FEC (mêmes journaux,
 * mêmes comptes, débit = crédit) — seul le FORMAT change (séparateur, format de
 * date, séparateur décimal, colonnes). À l'import, le logiciel peut demander
 * d'associer les colonnes (étape standard) ; le FEC reste l'import universel.
 *
 * Fonctions pures → testables sans base.
 */

import type { FecRow } from "./fec";

export type ComptaPreset = "tableur" | "pennylane" | "sage" | "ebp" | "cegid";

export const PRESET_LABELS: Record<ComptaPreset, string> = {
  tableur: "Tableur (Excel / LibreOffice)",
  pennylane: "Pennylane",
  sage: "Sage",
  ebp: "EBP",
  cegid: "Cegid",
};

type DateFmt = "fr" | "iso" | "compact";
type Dec = "," | ".";

/** Reformate une date AAAAMMJJ vers le format voulu. */
function reDate(aaaammjj: string, fmt: DateFmt): string {
  if (!/^\d{8}$/.test(aaaammjj)) return aaaammjj;
  const y = aaaammjj.slice(0, 4), m = aaaammjj.slice(4, 6), d = aaaammjj.slice(6, 8);
  if (fmt === "iso") return `${y}-${m}-${d}`;
  if (fmt === "compact") return `${y}${m}${d}`;
  return `${d}/${m}/${y}`; // fr
}

/** Reconvertit un montant "1234,56" vers le séparateur décimal voulu. */
function reAmount(montant: string, dec: Dec): string {
  return dec === "." ? montant.replace(",", ".") : montant;
}

type Col = { header: string; value: (f: ReturnType<typeof fields>) => string };

function fields(r: FecRow, date: DateFmt, dec: Dec) {
  return {
    journal: r.JournalCode,
    journalLib: r.JournalLib,
    num: r.EcritureNum,
    date: reDate(r.EcritureDate, date),
    compte: r.CompteNum,
    compteLib: r.CompteLib,
    auxNum: r.CompAuxNum,
    auxLib: r.CompAuxLib,
    piece: r.PieceRef,
    pieceDate: reDate(r.PieceDate, date),
    libelle: r.EcritureLib,
    debit: reAmount(r.Debit, dec),
    credit: reAmount(r.Credit, dec),
  };
}

type PresetCfg = { sep: string; bom: boolean; date: DateFmt; decimal: Dec; columns: Col[] };

const PRESETS: Record<ComptaPreset, PresetCfg> = {
  // Tableur : lisible, séparateur `;`, dates FR, virgule décimale, BOM (Excel).
  tableur: {
    sep: ";", bom: true, date: "fr", decimal: ",",
    columns: [
      { header: "Journal", value: (f) => f.journal },
      { header: "Date", value: (f) => f.date },
      { header: "Compte", value: (f) => f.compte },
      { header: "Libellé compte", value: (f) => f.compteLib },
      { header: "Compte auxiliaire", value: (f) => f.auxNum },
      { header: "N° pièce", value: (f) => f.piece },
      { header: "Libellé écriture", value: (f) => f.libelle },
      { header: "Débit", value: (f) => f.debit },
      { header: "Crédit", value: (f) => f.credit },
    ],
  },
  // Pennylane : international → dates ISO, point décimal, séparateur `,`.
  pennylane: {
    sep: ",", bom: false, date: "iso", decimal: ".",
    columns: [
      { header: "journal", value: (f) => f.journal },
      { header: "date", value: (f) => f.date },
      { header: "account_number", value: (f) => f.compte },
      { header: "account_name", value: (f) => f.compteLib },
      { header: "auxiliary_account", value: (f) => f.auxNum },
      { header: "piece_reference", value: (f) => f.piece },
      { header: "label", value: (f) => f.libelle },
      { header: "debit", value: (f) => f.debit },
      { header: "credit", value: (f) => f.credit },
    ],
  },
  // Sage : `;`, dates FR, virgule décimale.
  sage: {
    sep: ";", bom: true, date: "fr", decimal: ",",
    columns: [
      { header: "Journal", value: (f) => f.journal },
      { header: "Date", value: (f) => f.date },
      { header: "Compte", value: (f) => f.compte },
      { header: "Compte tiers", value: (f) => f.auxNum },
      { header: "Pièce", value: (f) => f.piece },
      { header: "Libellé", value: (f) => f.libelle },
      { header: "Débit", value: (f) => f.debit },
      { header: "Crédit", value: (f) => f.credit },
    ],
  },
  // EBP : `;`, dates FR, virgule décimale.
  ebp: {
    sep: ";", bom: true, date: "fr", decimal: ",",
    columns: [
      { header: "Journal", value: (f) => f.journal },
      { header: "Date", value: (f) => f.date },
      { header: "Compte", value: (f) => f.compte },
      { header: "Libellé", value: (f) => f.libelle },
      { header: "Débit", value: (f) => f.debit },
      { header: "Crédit", value: (f) => f.credit },
      { header: "Pièce", value: (f) => f.piece },
    ],
  },
  // Cegid : `;`, dates compactes AAAAMMJJ, virgule décimale.
  cegid: {
    sep: ";", bom: true, date: "compact", decimal: ",",
    columns: [
      { header: "Journal", value: (f) => f.journal },
      { header: "Date", value: (f) => f.date },
      { header: "Compte", value: (f) => f.compte },
      { header: "Libellé", value: (f) => f.libelle },
      { header: "Débit", value: (f) => f.debit },
      { header: "Crédit", value: (f) => f.credit },
    ],
  },
};

/** Échappe une valeur CSV si elle contient le séparateur, un guillemet ou un saut de ligne. */
function csvCell(value: string, sep: string): string {
  if (value.includes(sep) || value.includes('"') || /[\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Sérialise les écritures (issues du FEC) en CSV pour le logiciel choisi. */
export function ecrituresToCsv(rows: FecRow[], preset: ComptaPreset): string {
  const cfg = PRESETS[preset];
  const line = (cells: string[]) => cells.map((c) => csvCell(c, cfg.sep)).join(cfg.sep);
  const header = line(cfg.columns.map((c) => c.header));
  const body = rows.map((r) => {
    const f = fields(r, cfg.date, cfg.decimal);
    return line(cfg.columns.map((c) => c.value(f)));
  });
  return (cfg.bom ? "﻿" : "") + [header, ...body].join("\r\n") + "\r\n";
}

/** Nom de fichier d'export écritures. */
export function ecrituresFilename(preset: ComptaPreset, year: number): string {
  return `ecritures-${preset}-${year}.csv`;
}
