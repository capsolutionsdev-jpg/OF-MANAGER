"use client";

import { useActionState, useState } from "react";
import type { CSSProperties } from "react";
import {
  AlertCircle, CheckCircle2, Save, Upload, X,
  Building2, Palette, CreditCard, Mail, FileText, Settings2,
  Zap, Server, ChevronLeft, ChevronRight, Download, KeyRound,
} from "lucide-react";
import { updateOrganisme, type ConsoleState } from "@/lib/actions/organisme-actions";
import { OVERRIDABLE_DOCS, type DocumentsConfig } from "@/lib/documents/overrides";
import { THEMES, DESIGNS, designVars } from "@/lib/themes";
import { FormuleSelector } from "@/components/console/formule-selector";
import { AutomationMatrix } from "@/components/console/automation-matrix";
import { parseAutomationsConfig } from "@/lib/automations";
import type { FormuleKey, Plan } from "@/lib/plans";
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
  // Secrets : on n'expose JAMAIS la valeur au navigateur — seulement l'état.
  brevoApiKeySet: boolean;
  anthropicApiKeySet: boolean;
  yousignApiKeySet: boolean;
  automationsConfig: unknown;
  maxSmsMois: number | null;
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

/**
 * Champ « secret » en écriture seule : la valeur n'est jamais envoyée au
 * navigateur. On affiche uniquement si une clé est déjà définie ; laisser vide
 * conserve la clé existante (cf. updateOrganisme côté serveur).
 */
function SecretField({
  name, label, isSet, placeholder, hint,
}: { name: string; label: string; isSet: boolean; placeholder?: string; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type="password"
        autoComplete="new-password"
        defaultValue=""
        placeholder={isSet ? "•••••••••• (définie — laisser vide pour conserver)" : placeholder ?? "Non définie"}
      />
      <p className="text-[11px] text-muted-foreground">
        {isSet ? "Une clé est enregistrée. " : "Aucune clé enregistrée. "}
        {hint}
      </p>
    </div>
  );
}

/** Convertit un data-URL en Blob (pour l'envoi multipart). */
async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return (await fetch(dataUrl)).blob();
}

/**
 * Redimensionne l'image côté client puis l'envoie à /api/upload.
 * En prod → URL Vercel Blob ; en local (sans token) → data-URL renvoyé par la route.
 * Si l'upload échoue, on retombe sur le data-URL local pour ne pas bloquer.
 */
async function uploadImage(file: File, maxW: number, folder: string): Promise<string> {
  const dataUrl = await fileToPngDataUrl(file, maxW);
  try {
    const blob = await dataUrlToBlob(dataUrl);
    const fd = new FormData();
    fd.append("file", blob, `${folder}.png`);
    fd.append("folder", folder);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    if (!res.ok) throw new Error("upload");
    const json = (await res.json()) as { url?: string };
    if (!json.url) throw new Error("upload");
    return json.url;
  } catch {
    return dataUrl; // repli : embarque l'image en data-URL
  }
}

function ImageField({
  name, label, value, onChange, hint, maxW = 600, folder = "branding",
}: { name: string; label: string; value: string; onChange: (v: string) => void; hint?: string; maxW?: number; folder?: string }) {
  const [busy, setBusy] = useState(false);
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
          <label className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs hover:bg-muted ${busy ? "pointer-events-none opacity-60" : ""}`}>
            <Upload className="h-3.5 w-3.5" /> {busy ? "Envoi…" : "Choisir un fichier"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={busy}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setBusy(true);
                try { onChange(await uploadImage(f, maxW, folder)); }
                catch { /* image illisible */ }
                finally { setBusy(false); }
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
      <Input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="h-8 w-28" placeholder="#2C53C0" />
      <input
        type="color"
        value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#2C53C0"}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-10 cursor-pointer rounded border bg-transparent"
        aria-label="Choisir une couleur"
      />
    </div>
  );
}

const SECTIONS = [
  { id: "identite", label: "Identité & légal", icon: Building2 },
  { id: "marque", label: "Design & marque", icon: Palette },
  { id: "abonnement", label: "Modules & formule", icon: CreditCard },
  { id: "automatisations", label: "Automatisations", icon: Zap },
  { id: "communication", label: "Communication & clés API", icon: Mail },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "hebergement", label: "Hébergement", icon: Server },
  { id: "avance", label: "Avancé & limites", icon: Settings2 },
] as const;

export function EditOrganismeForm({ org, plans }: { org: OrgFormData; plans?: Plan[] }) {
  const action = updateOrganisme.bind(null, org.id);
  const [state, formAction, isPending] = useActionState<ConsoleState | undefined, FormData>(action, undefined);

  const [tab, setTab] = useState<(typeof SECTIONS)[number]["id"]>("identite");
  const [logoUrl, setLogoUrl] = useState(org.logoUrl ?? "");
  const [cachetUrl, setCachetUrl] = useState(org.cachetUrl ?? "");
  const [signatureUrl, setSignatureUrl] = useState(org.signatureUrl ?? "");
  const [faviconUrl, setFaviconUrl] = useState(org.faviconUrl ?? "");
  const [design, setDesign] = useState(org.design ?? "defaut");
  const [couleur, setCouleur] = useState(org.couleurPrimaire ?? "#2C53C0");
  const [couleur2, setCouleur2] = useState(org.couleurSecondaire ?? "");
  const [docCfg, setDocCfg] = useState<DocumentsConfig>((org.documentsConfig as DocumentsConfig | null) ?? {});
  const setDoc = (key: string, patch: Partial<DocumentsConfig[string]>) =>
    setDocCfg((c) => ({ ...c, [key]: { ...(c[key] ?? { mode: "modele" as const }), ...patch } }));

  const panel = (id: string) => cn("space-y-6", tab !== id && "hidden");

  const stepIndex = SECTIONS.findIndex((s) => s.id === tab);
  const total = SECTIONS.length;
  const goTo = (i: number) => setTab(SECTIONS[Math.max(0, Math.min(total - 1, i))].id);

  return (
    <form action={formAction} className="grid gap-6 lg:grid-cols-[240px_1fr]">
      {/* Assistant — étapes */}
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <div className="mb-3 px-1">
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>Étape {stepIndex + 1} / {total}</span>
            <span>{Math.round(((stepIndex + 1) / total) * 100)}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${((stepIndex + 1) / total) * 100}%` }} />
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto lg:flex-col">
          {SECTIONS.map((s, i) => {
            const done = i < stepIndex;
            const active = i === stepIndex;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setTab(s.id)}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
                  active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <span className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                  active ? "bg-primary text-primary-foreground" : done ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground",
                )}>
                  {done ? "✓" : i + 1}
                </span>
                <span className="hidden items-center gap-1.5 lg:flex"><s.icon className="h-3.5 w-3.5" /> {s.label}</span>
                <span className="lg:hidden">{s.label}</span>
              </button>
            );
          })}
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
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {DESIGNS.map((d) => (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => setDesign(d.key)}
                    className={cn(
                      "rounded-xl border p-2 text-left text-xs transition",
                      design === d.key ? "ring-2 ring-primary" : "hover:bg-muted",
                    )}
                  >
                    <div className="mb-2 overflow-hidden rounded-lg">
                      <MiniDashboard design={d.key} couleur={couleur} compact />
                    </div>
                    <span className="flex items-center gap-1.5 font-medium">
                      {d.name}
                      {design === d.key && <span className="rounded bg-primary px-1.5 py-0.5 text-[9px] text-primary-foreground">choisi</span>}
                    </span>
                    <span className="block leading-tight text-muted-foreground">{d.desc}</span>
                  </button>
                ))}
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
              <ImageField name="logoUrl" label="Logo" value={logoUrl} onChange={setLogoUrl} hint="PNG transparent conseillé. App + documents." folder={`org/${org.id}/logo`} />
              <ImageField name="faviconUrl" label="Favicon (onglet navigateur)" value={faviconUrl} onChange={setFaviconUrl} hint="Petite icône carrée." maxW={128} folder={`org/${org.id}/favicon`} />
              <ImageField name="cachetUrl" label="Cachet / tampon" value={cachetUrl} onChange={setCachetUrl} hint="Conventions & émargements." folder={`org/${org.id}/cachet`} />
              <ImageField name="signatureUrl" label="Signature du gérant" value={signatureUrl} onChange={setSignatureUrl} hint="Signature scannée." folder={`org/${org.id}/signature`} />
            </CardContent>
          </Card>
        </div>

        {/* ABONNEMENT */}
        <div className={panel("abonnement")}>
          <Card>
            <CardHeader className="py-3"><CardTitle className="text-sm text-muted-foreground">Abonnement & fonctionnalités</CardTitle></CardHeader>
            <CardContent>
              <FormuleSelector defaultFormule={(org.formule as FormuleKey | null) ?? null} defaultFeatures={org.fonctionnalites} plans={plans} />
            </CardContent>
          </Card>

        </div>

        {/* AUTOMATISATIONS */}
        <div className={panel("automatisations")}>
          <Card>
            <CardHeader className="py-3"><CardTitle className="text-sm text-muted-foreground">Automatisations — quoi / quand / canal</CardTitle></CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">
                Activez les envois automatiques du parcours, choisissez le <strong>canal</strong> (e-mail / SMS)
                et personnalisez les <strong>modèles</strong>. Le SMS nécessite une clé Brevo SMS (étape Communication).
              </p>
              <AutomationMatrix defaultConfig={parseAutomationsConfig(org.automationsConfig)} />
            </CardContent>
          </Card>
        </div>

        {/* COMMUNICATION & CLÉS API */}
        <div className={panel("communication")}>
          <Card>
            <CardHeader className="py-3"><CardTitle className="text-sm text-muted-foreground">Communication & e-mails</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field name="sousDomaine" label="Sous-domaine" value={org.sousDomaine} placeholder="mon-of" hint="mon-of.ofmanager.fr" />
              <Field name="emailExpediteurNom" label="Nom expéditeur e-mail" value={org.emailExpediteurNom} />
              <Field name="emailExpediteur" label="E-mail d'envoi" value={org.emailExpediteur} placeholder="contact@mon-of.fr" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="py-3"><CardTitle className="flex items-center gap-1.5 text-sm text-muted-foreground"><KeyRound className="h-4 w-4" /> Clés d&apos;intégration (par organisme)</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <SecretField name="brevoApiKey" label="Clé API Brevo (e-mail + SMS)" isSet={org.brevoApiKeySet} placeholder="xkeysib-…" hint="Envoi des e-mails & SMS au nom de l'OF." />
              <SecretField name="anthropicApiKey" label="Clé API Claude (Assistant IA)" isSet={org.anthropicApiKeySet} placeholder="sk-ant-…" hint="Active la génération IA pour cet OF." />
              <SecretField name="yousignApiKey" label="Clé API Yousign (signature)" isSet={org.yousignApiKeySet} placeholder="…" hint="Signature électronique prestataire." />
              <p className="text-[11px] text-muted-foreground sm:col-span-2">
                Laisser vide = repli sur la configuration globale (ou mode démo). Chaque clé est propre à l&apos;organisme.
              </p>
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

        {/* HÉBERGEMENT */}
        <div className={panel("hebergement")}>
          <Card>
            <CardHeader className="py-3"><CardTitle className="text-sm text-muted-foreground">Hébergement & déploiement</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border p-3">
                  <div className="flex items-center gap-2 text-sm font-medium"><Server className="h-4 w-4 text-primary" /> Hébergé par OFManager (SaaS)</div>
                  <p className="mt-1 text-xs text-muted-foreground">L&apos;OF utilise son sous-domaine <code>{org.sousDomaine || "mon-of"}.ofmanager.fr</code>. Tout est piloté ici, mises à jour incluses.</p>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="flex items-center gap-2 text-sm font-medium"><Download className="h-4 w-4 text-primary" /> Auto-hébergé (chez le client)</div>
                  <p className="mt-1 text-xs text-muted-foreground">Téléchargez le package prêt à déployer (config + Dockerfile + docker-compose + .env.example + README + script d&apos;init) pour une instance dédiée (base & domaine propres). Secrets non inclus.</p>
                  <a
                    href={`/console/${org.id}/export`}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-muted"
                  >
                    <Download className="h-3.5 w-3.5" /> Télécharger le package self-host (.zip)
                  </a>
                </div>
              </div>
              <div className="grid gap-4 border-t pt-4 sm:grid-cols-2">
                <Field name="appUrl" label="Lien du déploiement" value={org.appUrl} placeholder="https://mon-of.vercel.app" />
                <Field name="version" label="Version / mise à jour" value={org.version} placeholder="ex. v1" />
              </div>
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
              <Field name="maxSmsMois" label="Quota SMS / mois" value={org.maxSmsMois} type="number" placeholder="Illimité si vide" />
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
        <div className="sticky bottom-0 z-10 mt-6 flex items-center justify-between gap-2 border-t bg-background/80 py-3 backdrop-blur">
          <Button type="button" variant="outline" disabled={stepIndex === 0} onClick={() => goTo(stepIndex - 1)}>
            <ChevronLeft className="mr-1 h-4 w-4" /> Précédent
          </Button>
          <div className="flex items-center gap-2">
            <Button type="submit" variant={stepIndex === total - 1 ? "default" : "outline"} disabled={isPending}>
              <Save className="mr-2 h-4 w-4" />
              {isPending ? "Enregistrement…" : "Enregistrer"}
            </Button>
            {stepIndex < total - 1 && (
              <Button type="button" onClick={() => goTo(stepIndex + 1)}>
                Suivant <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}

/**
 * Aperçu réaliste du tableau de bord dans un design donné (barre + KPI +
 * graphe + liste). Réutilisé pour l'aperçu en direct et la galerie de designs.
 */
function MiniDashboard({
  design,
  couleur,
  nom,
  logoUrl,
  compact = false,
}: {
  design: string;
  couleur: string;
  nom?: string;
  logoUrl?: string;
  compact?: boolean;
}) {
  const style = { ...designVars(design, couleur), background: "var(--background)", color: "var(--foreground)" } as CSSProperties;
  const bars = [42, 66, 52, 84, 70, 96];
  return (
    <div
      data-design={design === "defaut" ? undefined : design}
      style={style}
      className="overflow-hidden rounded-xl border"
    >
      {/* Barre */}
      <div className="flex items-center gap-2 border-b px-3 py-2" style={{ borderColor: "var(--border)" }}>
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" className="h-5 w-auto" />
        ) : (
          <span className={compact ? "text-[11px] font-bold" : "text-sm font-bold"}>{nom || "OFManager"}</span>
        )}
        {!compact && (
          <span className="ml-2 hidden gap-1 sm:flex">
            {["Bord", "CRM", "Sessions"].map((t, i) => (
              <span
                key={t}
                className="rounded-full px-2 py-0.5 text-[9px] font-medium"
                style={
                  i === 0
                    ? { background: "var(--accent)", color: "var(--accent-foreground)" }
                    : { color: "var(--muted-foreground)" }
                }
              >
                {t}
              </span>
            ))}
          </span>
        )}
        <span
          className="ml-auto rounded-md px-2 py-1 text-[10px] font-semibold"
          style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
        >
          + Nouveau
        </span>
      </div>
      {/* KPI */}
      <div className="grid grid-cols-4 gap-2 p-3 pb-2">
        {[
          ["Candidats", "128"],
          ["Sessions", "12"],
          ["Apprenants", "64"],
          ["Réussite", "94%"],
        ].map(([l, v], i) => (
          <div key={l} data-slot="card" className="rounded-lg p-2" style={{ background: "var(--card)", color: "var(--card-foreground)" }}>
            <div className="text-[8px]" style={{ color: "var(--muted-foreground)" }}>{l}</div>
            <div className="text-sm font-bold" style={i === 1 ? { color: "var(--primary)" } : undefined}>{v}</div>
          </div>
        ))}
      </div>
      {/* Graphe + liste */}
      <div className="grid grid-cols-[1.4fr_1fr] gap-2 px-3 pb-3">
        <div data-slot="card" className="rounded-lg p-2" style={{ background: "var(--card)", color: "var(--card-foreground)" }}>
          <div className="mb-1.5 text-[8px] font-semibold" style={{ color: "var(--muted-foreground)" }}>Inscriptions / mois</div>
          <div className="flex h-12 items-end gap-1">
            {bars.map((h, i) => (
              <span key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: "var(--primary)" }} />
            ))}
          </div>
        </div>
        <div data-slot="card" className="rounded-lg p-2" style={{ background: "var(--card)", color: "var(--card-foreground)" }}>
          <div className="mb-1.5 text-[8px] font-semibold" style={{ color: "var(--muted-foreground)" }}>À traiter</div>
          {[["En attente", "4"], ["À relancer", "2"], ["Signatures", "3"]].map(([l, n]) => (
            <div key={l} className="mb-1 flex items-center justify-between text-[8px]">
              <span>{l}</span>
              <span className="rounded px-1 font-semibold" style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}>{n}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BrandPreview({ design, couleur, nom, logoUrl }: { design: string; couleur: string; nom: string; logoUrl: string }) {
  return <MiniDashboard design={design} couleur={couleur} nom={nom} logoUrl={logoUrl} />;
}
