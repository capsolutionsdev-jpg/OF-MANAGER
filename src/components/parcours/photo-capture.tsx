"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, ImagePlus, RefreshCcw, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Capture / import d'une photo d'identité.
 * - « Choisir une photo » : fichier existant (téléphone, ordinateur, tablette)
 * - « Prendre une photo » : caméra de l'appareil (getUserMedia, aperçu en direct)
 * L'image est recadrée au carré et compressée (~400px JPEG) côté client.
 */
export function PhotoCapture({
  value,
  onChange,
}: {
  value?: string;
  onChange: (dataUrl: string | undefined) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(false);

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
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOn(true);
      // Attache le flux une fois la vidéo montée
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      });
    } catch {
      toast.error(
        "Caméra indisponible. Autorisez l'accès à la caméra ou choisissez une photo existante.",
      );
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  }

  function capture() {
    const v = videoRef.current;
    if (!v || v.videoWidth === 0) return;
    onChange(squareCompress(v));
    stopCamera();
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
            <div className="flex h-28 w-28 items-center justify-center rounded-full border-2 border-dashed bg-card text-muted-foreground">
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
          {cameraOn ? (
            <div className="space-y-2">
              <video
                ref={videoRef}
                playsInline
                muted
                className="aspect-video w-full max-w-sm rounded-lg border bg-black object-cover"
              />
              <div className="flex gap-2">
                <Button type="button" size="sm" onClick={capture}>
                  <Check className="mr-1 h-4 w-4" /> Capturer
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={stopCamera}>
                  Annuler
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm font-medium">Photo d&apos;identité</p>
              <p className="text-xs text-muted-foreground">
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
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFile}
          />
        </div>
      </div>
    </div>
  );
}
