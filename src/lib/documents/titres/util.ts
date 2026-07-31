/**
 * Helpers partagés pour les modèles de titres (diplômes SSIAP, attestations
 * recyclage / remise à niveau, habilitations électriques, formations continues).
 */

/** Échappe le HTML des données titulaire (anti-injection dans le PDF). */
export function esc(s: string | null | undefined): string {
  return (s ?? "").replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!),
  );
}

/** Date au format long français : « 5 mai 1990 ». Repli sur des pointillés. */
export function fdateLong(d: Date | string | null | undefined): string {
  if (!d) return "……………………";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(dt.getTime())) return "……………………";
  return dt.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

/** Date courte française : « 12/06/2019 ». */
export function fdateShort(d: Date | string | null | undefined): string {
  if (!d) return "……/……/………";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(dt.getTime())) return "……/……/………";
  return dt.toLocaleDateString("fr-FR");
}
