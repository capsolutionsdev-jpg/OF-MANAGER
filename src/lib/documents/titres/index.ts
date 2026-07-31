/**
 * Moteur de titres CAP Compétences (diplômes SSIAP, attestations recyclage /
 * remise à niveau, habilitations électriques, formations continues VTC/Taxi).
 * Point d'entrée : catalogue + numérotation + rendu.
 */
export * from "./catalog";
export * from "./numero";
export { renderTitreHtml } from "./render";
export type { TitreOrg, TitreAssets } from "./render";
