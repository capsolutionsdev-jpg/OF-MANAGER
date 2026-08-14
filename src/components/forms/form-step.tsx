/**
 * Phase 3.1 — FormStep Component
 * Enveloppe réutilisable pour chaque étape du formulaire
 */

import { cn } from "@/lib/utils";

export interface FormStepProps {
  step: number;
  totalSteps: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onNext: () => void;
  onPrev: () => void;
  nextDisabled?: boolean;
  prevDisabled?: boolean;
}

export function FormStep({
  step,
  totalSteps,
  title,
  subtitle,
  children,
  onNext,
  onPrev,
  nextDisabled = false,
  prevDisabled = false,
}: FormStepProps) {
  const progress = (step / totalSteps) * 100;

  return (
    <div className="space-y-6">
      {/* Header avec titre et sous-titre */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">{title}</h2>
        {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            Étape {step}/{totalSteps}
          </span>
          <span className="font-medium">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-blue-500 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Progression: ${Math.round(progress)}%`}
          />
        </div>
      </div>

      {/* Contenu */}
      <div className="py-6">{children}</div>

      {/* Boutons de navigation */}
      <div className="flex gap-3 justify-between pt-6 border-t">
        <button
          onClick={onPrev}
          disabled={prevDisabled}
          className={cn(
            "px-6 py-2 rounded-lg font-medium transition-colors",
            "border border-input bg-background hover:bg-muted",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
          aria-label="Étape précédente"
        >
          ← Retour
        </button>

        <button
          onClick={onNext}
          disabled={nextDisabled}
          className={cn(
            "px-6 py-2 rounded-lg font-medium transition-colors",
            "bg-primary text-primary-foreground hover:bg-primary/90",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
          aria-label={step === totalSteps ? "Soumettre le formulaire" : "Étape suivante"}
        >
          {step === totalSteps ? "Soumettre →" : "Suivant →"}
        </button>
      </div>

      {/* Step indicators (mini dots) */}
      <div className="flex gap-1 justify-center pt-4">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-2 w-2 rounded-full transition-all",
              i < step ? "bg-primary w-3" : "bg-muted"
            )}
            aria-label={`Étape ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
