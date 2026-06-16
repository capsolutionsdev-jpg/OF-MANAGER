"use client";

import { useActionState, useState } from "react";
import type { CSSProperties } from "react";
import {
  AlertCircle, CheckCircle2, Save, Upload, X,
  Building2, Palette, CreditCard, Mail, FileText, Settings2,
} from "lucide-react";
import { updateOrganisme, type ConsoleState } from "@/lib/actions/organisme-actions";
import { OVERRIDABLE_DOCS, type DocumentsConfig } from "@/lib/documents/overrides";
import { THEMES, DESIGNS, designVars } from "@/lib/themes";
import { FormuleSelector } from "@/components/console/formule-selector";
import type { FormuleKey } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type OrgFormData = {
  id: string;
  nom: string;
  raisonSociale: string | null;
  representant: string | null;
  representantQualite: string | null;
  siret: string | null;
  nda: string | null;
  numeroTva: string | null;
  adresse: string | null;
  codePostal: string | null;
  ville: string | null;
  telephone: string | null;
  email: string | null;
  siteWeb: string | null;
  certificateur: string | null;
  qualiopiNumero: string | null;
  assujettiTva: boolean;
  couleurPrimaire: string | null;
  couleurSecondaire: string | null;
  theme: string | null;
  design: string | null;
  appUrl: string | null;
  version: string | null;
  formule: string | null;
  sousDomaine: string | null;
  emailExpediteurNom: string | null;
  emailExpediteur: string | null;
  brevoApiKey: string | null;
  logoUrl: string | null;
  cachetUrl: string | null;
  signatureUrl: string | null;
  faviconUrl: string | null;
  maxUtilisateurs: number | null;
  notes: string | null;
  documentsConfig: unknown;
  statut: string;
  fonctionnalites: string[];
};

/** Lit un fichier (PDF/image) en data-URL brut (sans redimension). */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Lecture impossible."));
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

/** Charge une image, la redimensionne et renvoie un PNG data-URL. */
function fileToPngDataUrl(file: File, maxW = 600): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Lecture du fichier impossible."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Image invalide."));
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/png"));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function Field({
  name, label, value, placeholder, hint, type = "text",
}: { name: string; label: string; value: string | number | null; placeholder?: string; hint?: string; type?: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} defaultValue={value ?? ""} placeholder={placeholder} />
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ImageField({
  name, label, value, onChange, hint, maxW = 600,
}: { name: string; label: string; value: string; onChange: (v: string) => void; hint?: string; maxW?: number }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <input type="hidden" name={name} value={value} />
      <div className="flex items-center gap-3">
        <div className="flex h-16 w-28 items-center justify-center overflow-hidden rounded-md border bg-muted/30">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt={label} className="max-h-14 max-w-full object-contain" />
          ) : (
            <span className="text-[11px] text-muted-foreground">Aucun</span>
          )}
        </div>
        <div className="flex flex-col items-start gap-1.5">
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs hover:bg-muted">
            <Upload className="h-3.5 w-3.5" /> Choisir un fichier
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try { onChange(await fileToPngDataUrl(f, maxW)); } catch { /* image illisible */ }
              }}
            />
          </label>
          {value && (
            <button type="button" onClick={() => onChange("")} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive">
              <X className="h-3.5 w-3.5" /> Retirer
            </button>
          )}
        </div>
      </div>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Sélecteur de couleur : pastilles de la charte + champ libre + roue native. */
function ColorPicker({ value, onChange, swatches = true }: { value: string; onChange: (v: string) => void; swatches?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {swatches && THEMES.map((t) => (
        <button
          key={t.key}
          type="button"
          title={t.name}
          onClick={() => onChange(t.primary)}
          className="h-8 w-8 rounded-full border-2 transition"
          style={{ background: t.primary, borderColor: value.toLowerCase() === t.primary.toLowerCase() ? "var(--foreground)" : "transparent" }}
        />
      ))}
      {swatches && <span className="mx-1 h-6 w-px bg-border" />}
      <Input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="h-8 w-28" placeholder="#1A5FD4" />
      <input
        type="color"
        value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#1A5FD4"}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-10 cursor-pointer rounded border bg-transparent"
        aria-label="Choisir une couleur"
      />
    </div>
  );
}

const SECTIONS = [
  { id: "identite", label: "Identité & légal", icon: Building2 },
  { id: "marque", label: "Marque & design", icon: Palette },
  { id: "abonnement", label: "Abonnement & modules", icon: CreditCard },
  { id: "communication", label: "Communication", icon: Mail },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "avance", label: "Avancé", icon: Settings2 },
] as const;

export function EditOrganismeForm({ org }: { org: OrgFormData }) {
  const action = updateOrganisme.bind(null, org.id);
  const [state, formAction, isPending] = useActionState<ConsoleState | undefined, FormData>(action, undefined);

  const [tab, setTab] = useState<(typeof SECTIONS)[number]["id"]>("identite");
  const [logoUrl, setLogoUrl] = useState(org.logoUrl ?? "");
  const [cachetUrl, setCachetUrl] = useState(org.cachetUrl ?? "");
  const [signatureUrl, setSignatureUrl] = useState(org.signatureUrl ?? "");
  const [faviconUrl, setFaviconUrl] = useState(org.faviconUrl ?? "");
  const [design, setDesign] = useState(org.design ?? "defaut");
  const [couleur, setCouleur] = useState(org.couleurPrimaire ?? "#1A5FD4");
  const [couleur2, setCouleur2] = useState(org.couleurSecondaire ?? "");
  const [docCfg, setDocCfg] = useState<DocumentsConfig>((org.documentsConfig as DocumentsConfig | null) ?? {});
  const setDoc = (key: string, patch: Partial<DocumentsConfig[string]>) =>
    setDocCfg((c) => ({ ...c, [key]: { ...(c[key] ?? { mode: "modele" as const }), ...patch } }));

  const panel = (id: string) => cn("space-y-6", tab !== id && "hidden");

  return (
    <form action={formAction} className="grid gap-6 lg:grid-cols-[220px_1fr]">
      {/* Navigation par sections */}
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <nav className="flex gap-1 overflow-x-auto lg:flex-col">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setTab(s.id)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
                tab === s.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <s.icon className="h-4 w-4" /> {s.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Panneaux (tous montés → tous les champs sont soumis) */}
      <div>
        {/* IDENTITÉ */}
        <div className={panel("identite")}>
          <Card>
            <CardHeader className="py-3"><CardTitle className="text-sm text-muted-foreground">Identité & légal</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field name="nom" label="Nom commercial *" value={org.nom} />
              <Field name="raisonSociale" label="Raison sociale" value={org.raisonSociale} />
              <Field name="representant" label="Représentant légal" value={org.representant} placeholder="Prénom NOM" />
              <Field name="representantQualite" label="Qualité (pour signature)" value={org.representantQualite} placeholder="Gérant" />
              <Field name="siret" label="SIRET" value={org.siret} />
              <Field name="nda" label="N° déclaration d'activité (NDA)" value={org.nda} />
              <Field name="numeroTva" label="N° TVA intracom." value={org.numeroTva} />
              <Field name="certificateur" label="Certificateur" value={org.certificateur} />
              <Field name="qualiopiNumero" label="N° / mention Qualiopi" value={org.qualiopiNumero} />
              <Field name="adresse" label="Adresse" value={org.adresse} />
              <Field name="codePostal" label="Code postal" value={org.codePostal} />
              <Field name="ville" label="Ville" value={org.ville} />
              <Field name="telephone" label="Téléphone" value={org.telephone} />
              <Field name="email" label="E-mail de contact" value={org.email} />
              <Field name="siteWeb" label="Site web" value={org.siteWeb} />
              <label className="flex items-center gap-2 self-end pb-2 text-sm">
                <input type="checkbox" name="assujettiTva" defaultChecked={org.assujettiTva} className="h-4 w-4 rounded border" />
                Assujetti à la TVA
              </label>
            </CardContent>
          </Card>
        </div>

        {/* MARQUE & DESIGN */}
        <div className={panel("marque")}>
          <input type="hidden" name="design" value={design} />
          <input type="hidden" name="theme" value={org.theme ?? ""} />
          <input type="hidden" name="couleurPrimaire" value={couleur} />
          <input type="hidden" name="couleurSecondaire" value={couleur2} />

          {/* Aperçu en direct */}
          <Card>
            <CardHeader className="py-3"><CardTitle className="text-sm text-muted-foreground">Aperçu en direct</CardTitle></CardHeader>
            <CardContent>
              <BrandPreview design={design} couleur={couleur} nom={org.nom} logoUrl={logoUrl} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3"><CardTitle className="text-sm text-muted-foreground">Style (peau)</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {DESIGNS.map((d) => {
                  const previewStyle = { ...designVars(d.key, couleur), background: "var(--background)", color: "var(--foreground)" } as CSSProperties;
                  return (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => setDesign(d.key)}
                      className={cn("rounded-lg border p-2 text-left text-xs transition", design === d.key ? "ring-2 ring-primary" : "hover:bg-muted")}
                    >
                      <div data-design={d.key === "defaut" ? undefined : d.key} style={previewStyle} className="mb-1.5 h-14 overflow-hidden rounded-md border p-1.5">
                        <div className="mb-1 flex items-center gap-1">
                          <span className="h-1.5 w-6 rounded-full" style={{ background: "var(--primary)" }} />
                          <span className="h-1.5 w-3 rounded-full" style={{ background: "var(--muted-foreground)" }} />
                        </div>
                        <div data-slot="card" className="rounded p-1 text-[8px] font-semibold" style={{ background: "var(--card)", color: "var(--card-foreground)" }}>Aa · 128</div>
                      </div>
                      <span className="font-medium">{d.name}</span>
                      <span className="block leading-tight text-muted-foreground">{d.desc}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3"><CardTitle className="text-sm text-muted-foreground">Couleurs</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-medium">Couleur principale</p>
                <ColorPicker value={couleur} onChange={setCouleur} />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium">Couleur secondaire <span className="text-muted-foreground">(optionnelle)</span></p>
                <div className="flex items-center gap-2">
                  <ColorPicker value={couleur2 || ""} onChange={setCouleur2} swatches={false} />
                  {couleur2 && (
                    <button type="button" onClick={() => setCouleur2("")} className="text-xs text-muted-foreground hover:text-destructive">Retirer</button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3"><CardTitle className="text-sm text-muted-foreground">Logos & visuels</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <ImageField name="logoUrl" label="Logo" value={logoUrl} onChange={setLogoUrl} hint="PNG transparent conseillé. App + documents." />
              <ImageField name="faviconUrl" label="Favicon (onglet navigateur)" value={faviconUrl} onChange={setFaviconUrl} hint="Petite icône carrée." maxW={128} />
              <ImageField name="cachetUrl" label="Cachet / tampon" value={cachetUrl} onChange={setCachetUrl} hint="Conventions & émargements." />
              <ImageField name="signatureUrl" label="Signature du gérant" value={signatureUrl} onChange={setSignatureUrl} hint="Signature scannée." />
            </CardContent>
          </Card>
        </div>

        {/* ABONNEMENT */}
        <div className={panel("abonnement")}>
          <Card>
            <CardHeader className="py-3"><CardTitle className="text-sm text-muted-foreground">Abonnement & fonctionnalités</CardTitle></CardHeader>
            <CardContent>
              <FormuleSelector defaultFormule={(org.formule as FormuleKey | null) ?? null} defaultFeatures={org.fonctionnalites} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3"><CardTitle className="text-sm text-muted-foreground">Catalogue & déploiement</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field
                name="appUrl"
                label="Lien du déploiement"
                value={org.appUrl}
                placeholder="https://mon-of.vercel.app"
              />
              <Field
                name="version"
                label="Version / mise à jour"
                value={org.version}
                placeholder="ex. v1 — autonome"
              />
              <p className="text-[11px] text-muted-foreground sm:col-span-2">
                Pour un client hébergé sur son propre déploiement (base de données dédiée).
                Renseignez l&apos;URL de son application et sa version pour le suivre depuis le catalogue.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* COMMUNICATION */}
        <div className={panel("communication")}>
          <Card>
            <CardHeader className="py-3"><CardTitle className="text-sm text-muted-foreground">Communication & e-mails</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field name="sousDomaine" label="Sous-domaine" value={org.sousDomaine} placeholder="mon-of" hint="mon-of.ofmanager.fr" />
              <Field name="emailExpediteurNom" label="Nom expéditeur e-mail" value={org.emailExpediteurNom} />
              <Field name="emailExpediteur" label="E-mail d'envoi" value={org.emailExpediteur} placeholder="contact@mon-of.fr" />
              <Field name="brevoApiKey" label="Clé API Brevo (envoi e-mails)" value={org.brevoApiKey} placeholder="xkeysib-…" hint="Laisser vide pour utiliser la config globale." />
            </CardContent>
          </Card>
        </div>

        {/* DOCUMENTS */}
        <div className={panel("documents")}>
          <Card>
            <CardHeader className="py-3"><CardTitle className="text-sm text-muted-foreground">Documents personnalisés</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <input type="hidden" name="documentsConfig" value={JSON.stringify(docCfg)} />
              {OVERRIDABLE_DOCS.map((d) => {
                const cur = docCfg[d.key] ?? { mode: "modele" as const };
                return (
                  <div key={d.key} className="rounded-md border p-3">
                    <p className="text-sm font-medium">{d.label}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                      <label className="flex items-center gap-1.5">
                        <input type="radio" name={`docmode_${d.key}`} checked={cur.mode !== "client"} onChange={() => setDoc(d.key, { mode: "modele" })} />
                        Notre modèle
                      </label>
                      <label className="flex items-center gap-1.5">
                        <input type="radio" name={`docmode_${d.key}`} checked={cur.mode === "client"} onChange={() => setDoc(d.key, { mode: "client" })} />
                        Document du client
                      </label>
                      {cur.mode === "client" && (
                        <span className="flex items-center gap-2">
                          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs hover:bg-muted">
                            <Upload className="h-3.5 w-3.5" />
                            {cur.fileUrl ? "Remplacer" : "Choisir (PDF)"}
                            <input
                              type="file"
                              accept="application/pdf,image/*"
                              className="hidden"
                              onChange={async (e) => {
                                const f = e.target.files?.[0];
                                if (!f) return;
                                try { setDoc(d.key, { fileUrl: await fileToDataUrl(f), fileName: f.name }); } catch { /* lecture impossible */ }
                              }}
                            />
                          </label>
                          {cur.fileUrl && <span className="text-xs text-emerald-700">✓ {cur.fileName ?? "fichier"}</span>}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* AVANCÉ */}
        <div className={panel("avance")}>
          <Card>
            <CardHeader className="py-3"><CardTitle className="text-sm text-muted-foreground">Abonnement & limites</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="statut">Statut de l&apos;abonnement</Label>
                <select id="statut" name="statut" defaultValue={org.statut} className="h-9 w-full rounded-md border bg-transparent px-3 text-sm">
                  <option value="ESSAI">Essai</option>
                  <option value="ACTIF">Actif</option>
                  <option value="SUSPENDU">Suspendu</option>
                </select>
              </div>
              <Field name="maxUtilisateurs" label="Nombre max d'utilisateurs" value={org.maxUtilisateurs} type="number" placeholder="Illimité si vide" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="py-3"><CardTitle className="text-sm text-muted-foreground">Notes internes (éditeur)</CardTitle></CardHeader>
            <CardContent>
              <Textarea name="notes" defaultValue={org.notes ?? ""} rows={4} placeholder="Notes visibles uniquement par l'éditeur (non affichées au client)…" />
            </CardContent>
          </Card>
        </div>

        {/* Feedback + enregistrer (sticky) */}
        {state?.error && (
          <div className="mt-6 flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" /> <span>{state.error}</span>
          </div>
        )}
        {state?.ok && (
          <div className="mt-6 flex items-center gap-2 rounded-md bg-emerald-500/10 p-3 text-sm text-emerald-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" /> Configuration enregistrée.
          </div>
        )}
        <div className="sticky bottom-0 z-10 mt-6 flex justify-end border-t bg-background/80 py-3 backdrop-blur">
          <Button type="submit" disabled={isPending}>
            <Save className="mr-2 h-4 w-4" />
            {isPending ? "Enregistrement…" : "Enregistrer la configuration"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function BrandPreview({ design, couleur, nom, logoUrl }: { design: string; couleur: string; nom: string; logoUrl: string }) {
  const style = { ...designVars(design, couleur), background: "var(--background)", color: "var(--foreground)" } as CSSProperties;
  return (
    <div data-design={design === "defaut" ? undefined : design} style={style} className="overflow-hidden rounded-xl border">
      <div className="flex items-center gap-2 border-b px-3 py-2" style={{ borderColor: "var(--border)" }}>
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" className="h-5 w-auto" />
        ) : (
          <span className="text-sm font-bold">{nom || "Votre organisme"}</span>
        )}
        <span className="ml-auto rounded-md px-2 py-1 text-[10px] font-semibold" style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>
          + Nouveau
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 p-3">
        {["Candidats", "Sessions", "Réussite"].map((l, i) => (
          <div key={l} data-slot="card" className="rounded-lg p-2" style={{ background: "var(--card)", color: "var(--card-foreground)" }}>
            <div className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>{l}</div>
            <div className="text-base font-bold" style={i === 1 ? { color: "var(--primary)" } : undefined}>{["128", "12", "94%"][i]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
