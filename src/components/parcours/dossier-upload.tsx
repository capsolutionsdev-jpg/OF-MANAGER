"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Camera, CheckCircle2, Circle, FileText, FolderOpen, ImagePlus,
  Loader2, Paperclip, Trash2, Upload, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  uploadPieceParcours, attachPieceFromProfil, deletePieceParcours, type PieceDTO,
} from "@/lib/actions/dossier-actions";

/** Lit un fichier en data-URL ; compresse les images > maxW en JPEG. */
function fileToDataUrl(file: File, maxW = 1600): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("lecture"));
    reader.onload = () => {
      const result = reader.result as string;
      if (!file.type.startsWith("image/")) return resolve(result); // PDF : tel quel
      const img = new Image();
      img.onerror = () => resolve(result);
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        if (scale === 1) return resolve(result);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  });
}

function isImg(mime: string | null) { return !!mime && mime.startsWith("image/"); }

export function DossierUpload({
  token, piecesAttendues, initialPieces, initialRecues,
}: {
  token: string;
  piecesAttendues: string[];
  initialPieces: PieceDTO[];
  initialRecues: string[];
}) {
  const [pieces, setPieces] = useState<PieceDTO[]>(initialPieces);
  const [recues, setRecues] = useState<Set<string>>(new Set(initialRecues));
  const [busy, setBusy] = useState<string | null>(null); // label en cours
  const [camFor, setCamFor] = useState<string | null>(null); // pièce ciblée par la caméra
  const [profilFor, setProfilFor] = useState<string | null>(null); // menu "depuis le profil"

  async function doUpload(file: File, piece?: string) {
    const key = piece ?? "__autre__";
    setBusy(key);
    try {
      const dataUrl = await fileToDataUrl(file);
      const res = await uploadPieceParcours(token, { dataUrl, filename: file.name, piece });
      if (!res.ok || !res.piece) { toast.error(res.error ?? "Échec de l'envoi."); return; }
      setPieces((p) => [res.piece!, ...p]);
      if (piece) setRecues((s) => new Set(s).add(piece));
      toast.success("Document ajouté.");
    } catch { toast.error("Échec de l'envoi."); }
    finally { setBusy(null); }
  }

  async function remove(pieceId: string, label: string) {
    setBusy(label);
    try {
      const res = await deletePieceParcours(token, pieceId);
      if (!res.ok) { toast.error(res.error ?? "Suppression impossible."); return; }
      setPieces((p) => p.filter((x) => x.id !== pieceId));
      // Si plus aucune pièce de ce label, on retire la coche
      setPieces((cur) => {
        if (!cur.some((x) => x.label === label)) setRecues((s) => { const n = new Set(s); n.delete(label); return n; });
        return cur;
      });
    } finally { setBusy(null); }
  }

  async function fromProfil(pieceId: string, piece: string) {
    setBusy(piece);
    try {
      const res = await attachPieceFromProfil(token, pieceId, piece);
      if (!res.ok) { toast.error(res.error ?? "Impossible."); return; }
      setRecues((s) => new Set(s).add(piece));
      setProfilFor(null);
      toast.success("Pièce rattachée depuis votre profil.");
    } finally { setBusy(null); }
  }

  const piecesFor = (label: string) => pieces.filter((p) => p.label === label);
  const autres = pieces.filter((p) => !piecesAttendues.includes(p.label));

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Joignez votre dossier administratif. Formats acceptés : <strong>PDF, JPEG, PNG</strong> (8 Mo max).
        Vous pouvez choisir un fichier, prendre une photo, ou réutiliser une pièce déjà déposée.
      </p>

      {piecesAttendues.length === 0 ? (
        <FreeRow label="Document" busy={busy === "__autre__"} onFile={(f) => doUpload(f)} onCam={() => setCamFor("__autre__")} />
      ) : (
        <ul className="space-y-2">
          {piecesAttendues.map((label) => {
            const fourni = recues.has(label) || piecesFor(label).length > 0;
            const reusable = pieces.filter((p) => p.label !== label); // pièces réutilisables du profil
            return (
              <li key={label} className="rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  {fourni
                    ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    : <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />}
                  <span className={`text-sm font-medium ${fourni ? "" : "text-muted-foreground"}`}>{label}</span>
                  {fourni && <span className="text-xs font-medium text-emerald-700">Fourni</span>}
                </div>

                {/* fichiers déjà déposés pour cette pièce */}
                {piecesFor(label).map((p) => (
                  <div key={p.id} className="mt-2 flex items-center gap-2 rounded-md bg-muted/40 px-2 py-1 text-xs">
                    {isImg(p.mimeType) ? <ImagePlus className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
                    <a href={p.url} target="_blank" rel="noopener noreferrer" className="flex-1 truncate underline">
                      {p.mimeType?.includes("pdf") ? "Voir le PDF" : "Voir l'image"}
                    </a>
                    <button type="button" onClick={() => remove(p.id, label)} className="text-muted-foreground hover:text-destructive" aria-label="Supprimer">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}

                {/* actions */}
                <div className="mt-2 flex flex-wrap gap-2">
                  <FileBtn id={`f-${label}`} busy={busy === label} accept="application/pdf,image/*"
                    onFile={(f) => doUpload(f, label)} icon={<Upload className="mr-1 h-3.5 w-3.5" />} text="Fichier" />
                  <Button type="button" size="sm" variant="outline" disabled={busy === label} onClick={() => setCamFor(label)}>
                    <Camera className="mr-1 h-3.5 w-3.5" /> Photo
                  </Button>
                  {reusable.length > 0 && (
                    <Button type="button" size="sm" variant="ghost" disabled={busy === label}
                      onClick={() => setProfilFor(profilFor === label ? null : label)}>
                      <FolderOpen className="mr-1 h-3.5 w-3.5" /> Depuis mon profil
                    </Button>
                  )}
                  {busy === label && <Loader2 className="h-4 w-4 animate-spin self-center text-muted-foreground" />}
                </div>

                {/* menu "depuis le profil" */}
                {profilFor === label && reusable.length > 0 && (
                  <div className="mt-2 space-y-1 rounded-md border bg-card p-2">
                    <p className="text-[11px] font-medium text-muted-foreground">Réutiliser une pièce déjà déposée :</p>
                    {reusable.map((p) => (
                      <button key={p.id} type="button" onClick={() => fromProfil(p.id, label)}
                        className="flex w-full items-center gap-2 rounded px-1.5 py-1 text-left text-xs hover:bg-muted">
                        <Paperclip className="h-3.5 w-3.5" /> {p.label}
                      </button>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* documents libres supplémentaires */}
      {piecesAttendues.length > 0 && (
        <div className="rounded-lg border border-dashed p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Autres documents (facultatif)</p>
          {autres.map((p) => (
            <div key={p.id} className="mb-1 flex items-center gap-2 rounded-md bg-muted/40 px-2 py-1 text-xs">
              {isImg(p.mimeType) ? <ImagePlus className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
              <a href={p.url} target="_blank" rel="noopener noreferrer" className="flex-1 truncate underline">{p.label}</a>
              <button type="button" onClick={() => remove(p.id, p.label)} className="text-muted-foreground hover:text-destructive" aria-label="Supprimer">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <div className="mt-1 flex gap-2">
            <FileBtn id="f-autre" busy={busy === "__autre__"} accept="application/pdf,image/*"
              onFile={(f) => doUpload(f)} icon={<Upload className="mr-1 h-3.5 w-3.5" />} text="Ajouter un fichier" />
            <Button type="button" size="sm" variant="outline" onClick={() => setCamFor("__autre__")}>
              <Camera className="mr-1 h-3.5 w-3.5" /> Photo
            </Button>
          </div>
        </div>
      )}

      {camFor !== null && (
        <DocCamera
          onCancel={() => setCamFor(null)}
          onCapture={async (file) => {
            const target = camFor;
            setCamFor(null);
            await doUpload(file, target === "__autre__" ? undefined : target);
          }}
        />
      )}
    </div>
  );
}

/** Bouton "fichier" déguisé en <label> (déclenche un input file caché). */
function FileBtn({ id, accept, busy, onFile, icon, text }: {
  id: string; accept: string; busy: boolean; onFile: (f: File) => void; icon: React.ReactNode; text: string;
}) {
  return (
    <label htmlFor={id}
      className={`inline-flex h-8 cursor-pointer items-center rounded-md border px-2.5 text-xs font-medium hover:bg-muted ${busy ? "pointer-events-none opacity-60" : ""}`}>
      {icon}{text}
      <input id={id} type="file" accept={accept} className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
    </label>
  );
}

/** Caméra plein écran pour photographier un document (cadre rectangulaire, JPEG). */
function DocCamera({ onCapture, onCancel }: { onCapture: (file: File) => void; onCancel: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false })
      .then((s) => { if (active) setStream(s); else s.getTracks().forEach((t) => t.stop()); })
      .catch(() => { toast.error("Caméra indisponible. Autorisez l'accès ou choisissez un fichier."); onCancel(); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !stream) return;
    v.srcObject = stream;
    const onReady = () => { v.play().catch(() => {}); setReady(true); };
    v.addEventListener("loadedmetadata", onReady);
    if (v.readyState >= 1) onReady();
    return () => v.removeEventListener("loadedmetadata", onReady);
  }, [stream]);

  useEffect(() => () => stream?.getTracks().forEach((t) => t.stop()), [stream]);

  function shoot() {
    const v = videoRef.current;
    if (!v || v.videoWidth === 0) { toast.error("La caméra démarre… réessayez."); return; }
    const maxW = 1600;
    const scale = Math.min(1, maxW / v.videoWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(v.videoWidth * scale);
    canvas.height = Math.round(v.videoHeight * scale);
    canvas.getContext("2d")!.drawImage(v, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      onCapture(new File([blob], `document-${Date.now()}.jpg`, { type: "image/jpeg" }));
    }, "image/jpeg", 0.85);
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black">
      <button type="button" onClick={onCancel} aria-label="Fermer"
        className="absolute right-4 top-4 z-10 rounded-full bg-white/15 p-3 text-white backdrop-blur hover:bg-white/30">
        <X className="h-6 w-6" />
      </button>
      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRef} playsInline autoPlay muted className="absolute inset-0 h-full w-full object-contain" />
        {!ready && <div className="absolute inset-0 flex items-center justify-center text-sm text-white/80">Démarrage de la caméra…</div>}
        <p className="absolute inset-x-0 top-6 text-center text-sm font-medium text-white drop-shadow">Cadrez le document, puis prenez la photo</p>
      </div>
      <div className="flex items-center justify-center gap-8 bg-black/90 py-6">
        <button type="button" onClick={onCancel} className="text-sm font-medium text-white/70 hover:text-white">Annuler</button>
        <button type="button" onClick={shoot} aria-label="Prendre la photo"
          className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-white/20 active:scale-90">
          <span className="h-14 w-14 rounded-full bg-white" />
        </button>
        <span className="w-14 text-sm text-transparent">.</span>
      </div>
    </div>
  );
}

/** Cas formation sans pièce définie : un simple bouton d'ajout libre. */
function FreeRow({ label, busy, onFile, onCam }: { label: string; busy: boolean; onFile: (f: File) => void; onCam: () => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      <FileBtn id="f-free" busy={busy} accept="application/pdf,image/*" onFile={onFile}
        icon={<Upload className="mr-1 h-3.5 w-3.5" />} text="Ajouter un document" />
      <Button type="button" size="sm" variant="outline" onClick={onCam}>
        <Camera className="mr-1 h-3.5 w-3.5" /> Prendre en photo
      </Button>
      <span className="sr-only">{label}</span>
    </div>
  );
}
