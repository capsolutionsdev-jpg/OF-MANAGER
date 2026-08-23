import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

// Neutralise uniquement la chaîne « use server » (next-auth). On garde le VRAI
// useConfirm : la liste des prospects en dépend, et son provider doit être
// présent dans l'arbre /console (cf. app/console/layout.tsx).
vi.mock("@/lib/actions/console-actions", () => ({
  setLeadStatut: async () => {},
  setLeadNotes: async () => {},
  deleteLead: async () => {},
  createLeadManuel: async () => ({}),
}));

import { LeadsViewSwitch } from "@/components/console/leads-view-switch";
import { LeadsTable, type LeadRow } from "@/components/console/leads-table";
import { LeadManualAdd } from "@/components/console/lead-manual-add";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import type { LeadKanbanRow } from "@/components/console/leads-kanban";

function base(over: Partial<LeadKanbanRow> = {}): LeadKanbanRow {
  return {
    id: over.id ?? "l1", nom: "SOLARIS", organisme: "SOLARIS", email: "",
    telephone: null, message: null, source: "prospection-securite", hebergement: null,
    formations: [], statut: "FICHIER", notes: null, lu: true, rappeleAt: null,
    createdAt: new Date("2026-08-23T10:00:00Z"), verticale: "securite", outilActuel: null,
    echeanceQualiopi: null, volumeStagiairesMois: null, malARemplir: null, decideur: null,
    region: "Île-de-France", departement: "Yvelines", codePostal: "78000", ville: "Versailles",
    adresse: "1 rue X", siteWeb: "https://x.fr", siret: "12345678900012", representantLegal: "M. X",
    priorite: null, typeFormation: null, agrement: null, agrementEchu: null, prochaineAction: null,
    dateRelance: null, dateDernierContact: null, sourceRemarques: null, score: 0, tasks: [],
    ...over,
  };
}
const sample: LeadKanbanRow[] = [
  base(),
  base({ id: "l2", statut: "SIGNE", priorite: "haute", email: "a@b.fr" }),
  base({ id: "l3", statut: "PERDU", region: null, departement: null, codePostal: null }),
  base({ id: "l4", source: "prospection-transport", verticale: "transport", typeFormation: "VTC", agrementEchu: true, priorite: "moyenne" }),
];
const withProvider = (node: React.ReactNode) => <ConfirmProvider>{node}</ConfirmProvider>;

describe("rendu SSR page Prospects", () => {
  it("LeadManualAdd (bouton + dialogue)", () => {
    expect(() => renderToStaticMarkup(withProvider(<LeadManualAdd />))).not.toThrow();
  });
  it("LeadsViewSwitch (Kanban par défaut) sous ConfirmProvider", () => {
    expect(() => renderToStaticMarkup(withProvider(<LeadsViewSwitch leads={sample} />))).not.toThrow();
  });
  it("LeadsTable (vue Liste) rend sous ConfirmProvider", () => {
    expect(() => renderToStaticMarkup(withProvider(<LeadsTable leads={sample as LeadRow[]} />))).not.toThrow();
  });
  it("LeadsTable SANS ConfirmProvider lève l'erreur useConfirm (régression du crash console)", () => {
    expect(() => renderToStaticMarkup(<LeadsTable leads={sample as LeadRow[]} />)).toThrow(/ConfirmProvider/);
  });
});
