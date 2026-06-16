// Documents « réglementaires statiques » qu'un OF peut remplacer par son propre
// fichier (au lieu de notre modèle). Les documents générés à partir des données
// (convention, attestation, certificat…) ne sont PAS remplaçables : ils doivent
// rester dynamiques (variables candidat/session) — seule leur marque change.

export const OVERRIDABLE_DOCS = [
  { key: "REGLEMENT_INTERIEUR", label: "Règlement intérieur" },
  { key: "CONDITIONS_GENERALES", label: "Conditions générales (CGV)" },
] as const;

export const OVERRIDABLE_KEYS = OVERRIDABLE_DOCS.map((d) => d.key) as string[];

export type DocOverride = {
  mode: "modele" | "client";
  fileUrl?: string; // data URL du fichier client (mode "client")
  fileName?: string;
};

export type DocumentsConfig = Record<string, DocOverride>;

/** Renvoie l'override actif pour un document (repli « notre modèle »). */
export function getDocOverride(documentsConfig: unknown, key: string): DocOverride {
  const cfg = (documentsConfig ?? {}) as DocumentsConfig;
  const o = cfg[key];
  if (o && o.mode === "client" && o.fileUrl) return o;
  return { mode: "modele" };
}
