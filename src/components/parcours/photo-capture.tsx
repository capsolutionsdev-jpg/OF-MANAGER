"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, ImagePlus, RefreshCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Capture / import d'une photo d'identité.
 * - « Choisir une photo » : fichier existant (téléphone, ordinateur, tablette)
 * - « Prendre une photo » : caméra en PLEIN ÉCRAN avec gros bouton de capture
 * L'image est recadrée au carré et compressée (~400px JPEG) côté client.
 */
export function PhotoCapture({
  value,
  onChange,
  required = false,
}: {
  value?: string;
  onChange: (dataUrl: string | undefined) => void;
  required?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [videoPret, setVideoPret] = useState(false);

  // Attache le flux à la vidéo dès que les deux existent (corrige l'écran noir).
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !stream) return;
    v.srcObject = stream;
    const onReady = () => {
      v.play().catch(() => {});
      setVideoPret(true);
    };
    v.addEventListener("loadedmetadata", onReady);
    // certains navigateurs ont déjà les métadonnées
    if (v.readyState >= 1) onReady();
    return () => v.removeEventListener("loadedmetadata", onReady);
  }, [stream]);

  // Coupe la caméra si le composant est démonté.
  useEffect(() => {
    return () => stream?.getTracks().forEach((t) => t.stop());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recadre au carré centré + compresse en JPEG 400px.
  function squareCompress(source: HTMLImageElement | HTMLVideoElement): string {
    const sw = source instanceof HTMLVideoElement ? source.videoWidth : source.naturalWidth;
    const sh = source instanceof HTMLVideoElement ? source.videoHeight : source.naturalHeight;
    const side = Math.min(sw, sh);
    const sx = (sw - side) / 2;
    const sy = (sh - side) / 2;
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 400;
    const g = canvas.getContext("2d")!;
    g.drawImage(source, sx, sy, side, side, 0, 0, 400, 400);
    return canvas.toDataURL("image/jpeg", 0.82);
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Merci de choisir une image (JPEG, PNG…).");
      return;
    }
    const img = new Image();
    img.onload = () => {
      onChange(squareCompress(img));
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => toast.error("Impossible de lire cette image.");
    img.src = URL.createObjectURL(file);
    e.target.value = "";
  }

  async function startCamera() {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setVideoPret(false);
      setStream(s);
    } catch {
      toast.error(
        "Caméra indisponible. Autorisez l'accès à la caméra dans votre navigateur, ou choisissez une photo existante.",
      );
    }
  }

  function stopCamera() {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    setVideoPret(false);
  }

  function capture() {
    const v = videoRef.current;
    if (!v || v.videoWidth === 0) {
      toast.error("La caméra démarre… réessayez dans une seconde.");
      return;
    }
    onChange(squareCompress(v));
    stopCamera();
    toast.success("Photo capturée !");
  }

  return (
    <div className="rounded-xl border bg-muted/30 p-4">
      <div className="flex flex-col items-center gap-4 sm:flex-row">
        {/* Aperçu */}
        <div className="relative shrink-0">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value}
              alt="Photo d'identité"
              className="h-28 w-28 rounded-full border-4 border-white object-cover shadow-md ring-1 ring-black/10"
            />
          ) : (
            <div
              className={`flex h-28 w-28 items-center justify-center rounded-full border-2 border-dashed bg-card text-muted-foreground ${
                required ? "border-red-300" : ""
              }`}
            >
              <Camera className="h-8 w-8" />
            </div>
          )}
          {value && (
            <button
              type="button"
              onClick={() => onChange(undefined)}
              className="absolute -right-1 -top-1 rounded-full bg-destructive p-1 text-white shadow"
              aria-label="Supprimer la photo"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Contrôles */}
        <div className="w-full flex-1 space-y-2">
          <p className="text-sm font-medium">
            Photo d&apos;identité{" "}
            {required && <span className="font-bold text-red-600">*</span>}
          </p>
          <p className="text-xs text-muted-foreground">
            {required ? "Obligatoire pour valider le formulaire. " : ""}
            Choisissez une photo existante ou prenez-en une avec votre appareil.
            Visage de face, fond clair de préférence.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
              <ImagePlus className="mr-1 h-4 w-4" /> Choisir une photo
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={startCamera}>
              <Camera className="mr-1 h-4 w-4" /> Prendre une photo
            </Button>
            {value && (
              <Button type="button" size="sm" variant="ghost" onClick={() => fileRef.current?.click()}>
                <RefreshCcw className="mr-1 h-4 w-4" /> Changer
              </Button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFile}
          />
        </div>
      </div>

      {/* ── Caméra PLEIN ÉCRAN ── */}
      {stream && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black">
          {/* Fermer */}
          <button
            type="button"
            onClick={stopCamera}
            aria-label="Fermer la caméra"
            className="absolute right-4 top-4 z-10 rounded-full bg-white/15 p-3 text-white backdrop-blur transition-colors hover:bg-white/30"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Vidéo plein écran */}
          <div className="relative flex-1 overflow-hidden">
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              className="absolute inset-0 h-full w-full object-cover"
            />
            {!videoPret && (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-white/80">
                Démarrage de la caméra…
              </div>
            )}
            {/* Guide visage */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-64 w-64 rounded-full border-4 border-dashed border-white/50 sm:h-80 sm:w-80" />
            </div>
            <p className="absolute inset-x-0 top-6 text-center text-sm font-medium text-white drop-shadow">
              Placez votre visage dans le cercle
            </p>
          </div>

          {/* Barre de capture */}
          <div className="flex items-center justify-center gap-8 bg-black/90 py-6">
            <button
              type="button"
              onClick={stopCamera}
              className="text-sm font-medium text-white/70 hover:text-white"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={capture}
              aria-label="Prendre la photo"
              className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-white/20 transition-transform active:scale-90"
            >
              <span className="h-14 w-14 rounded-full bg-white" />
            </button>
            <span className="w-14 text-sm text-transparent">.</span>
          </div>
        </div>
      )}
    </div>
  );
}
