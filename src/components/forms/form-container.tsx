"use client";

import { useCandidatForm } from "@/lib/forms/use-candidat-form";
import { Step1Identite } from "./step-1-identite";

/**
 * Container qui instancie le hook useCandidatForm UNE SEULE FOIS
 * et distribue l'état + les actions aux composants d'étape via props.
 * Cela évite de créer plusieurs états séparés si le hook était appelé
 * à l'intérieur de chaque step.
 */
export function FormContainer() {
  const {
    data,
    errors,
    touched,
    currentStep,
    nextStep,
    prevStep,
    updateField,
  } = useCandidatForm();

  switch (currentStep) {
    case "identite":
      return (
        <Step1Identite
          data={data}
          errors={errors}
          touched={touched}
          currentStep={currentStep}
          nextStep={nextStep}
          prevStep={prevStep}
          updateField={updateField}
        />
      );
    case "adresse":
    case "formation":
    case "prerequis":
    case "confirmation":
      return (
        <div className="rounded-lg border border-dashed border-input bg-muted/30 p-8 text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Étape « {currentStep} » : À venir
          </h2>
          <p className="text-muted-foreground mb-6">
            Cette étape n&apos;est pas encore implémentée.
          </p>
          <button
            type="button"
            onClick={prevStep}
            className="px-6 py-2 rounded-lg font-medium border border-input bg-background hover:bg-muted transition-colors"
          >
            ← Retour
          </button>
        </div>
      );
    default:
      return null;
  }
}
