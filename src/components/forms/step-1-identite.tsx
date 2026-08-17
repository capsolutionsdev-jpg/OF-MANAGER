"use client";

import { FormStep } from "./form-step";
import type { CandidatFormData, FormStep as FormStepKey } from "@/lib/forms/candidat-form-schema";

export interface Step1IdentiteProps {
  data: Partial<CandidatFormData>;
  errors: Record<string, string[]>;
  touched: Record<string, boolean>;
  currentStep: FormStepKey;
  nextStep: () => boolean;
  prevStep: () => boolean;
  updateField: (field: string, value: unknown) => void;
}

export function Step1Identite({
  data,
  errors,
  touched,
  nextStep,
  prevStep,
  updateField,
}: Step1IdentiteProps) {
  const getError = (field: string): string | undefined =>
    touched[field] ? errors[field]?.[0] : undefined;

  return (
    <FormStep
      step={1}
      totalSteps={5}
      title="Identité"
      subtitle="Vos coordonnées personnelles"
      onNext={nextStep}
      onPrev={prevStep}
      prevDisabled={true} // Première étape
      nextDisabled={false}
    >
      <div className="space-y-4 max-w-lg">
        {/* Prénom */}
        <div>
          <label
            htmlFor="firstName"
            className="block text-sm font-medium text-foreground mb-1"
          >
            Prénom <span className="text-destructive">*</span>
          </label>
          <input
            id="firstName"
            type="text"
            placeholder="Jean"
            value={data.firstName || ""}
            onChange={(e) => updateField("firstName", e.target.value)}
            aria-invalid={!!getError("firstName")}
            aria-describedby={getError("firstName") ? "firstName-error" : undefined}
            className={`
              w-full px-3 py-2 rounded-lg border
              bg-background text-foreground
              placeholder-muted-foreground
              focus:outline-none focus:ring-2 focus:ring-primary
              ${getError("firstName") ? "border-destructive" : "border-input"}
            `}
          />
          {getError("firstName") && (
            <p id="firstName-error" className="text-sm text-destructive mt-1">
              {getError("firstName")}
            </p>
          )}
        </div>

        {/* Nom */}
        <div>
          <label
            htmlFor="lastName"
            className="block text-sm font-medium text-foreground mb-1"
          >
            Nom <span className="text-destructive">*</span>
          </label>
          <input
            id="lastName"
            type="text"
            placeholder="Dupont"
            value={data.lastName || ""}
            onChange={(e) => updateField("lastName", e.target.value)}
            aria-invalid={!!getError("lastName")}
            aria-describedby={getError("lastName") ? "lastName-error" : undefined}
            className={`
              w-full px-3 py-2 rounded-lg border
              bg-background text-foreground
              placeholder-muted-foreground
              focus:outline-none focus:ring-2 focus:ring-primary
              ${getError("lastName") ? "border-destructive" : "border-input"}
            `}
          />
          {getError("lastName") && (
            <p id="lastName-error" className="text-sm text-destructive mt-1">
              {getError("lastName")}
            </p>
          )}
        </div>

        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-foreground mb-1"
          >
            Email <span className="text-destructive">*</span>
          </label>
          <input
            id="email"
            type="email"
            placeholder="jean.dupont@example.com"
            value={data.email || ""}
            onChange={(e) => updateField("email", e.target.value)}
            aria-invalid={!!getError("email")}
            aria-describedby={getError("email") ? "email-error" : undefined}
            className={`
              w-full px-3 py-2 rounded-lg border
              bg-background text-foreground
              placeholder-muted-foreground
              focus:outline-none focus:ring-2 focus:ring-primary
              ${getError("email") ? "border-destructive" : "border-input"}
            `}
          />
          {getError("email") && (
            <p id="email-error" className="text-sm text-destructive mt-1">
              {getError("email")}
            </p>
          )}
        </div>

        {/* Téléphone */}
        <div>
          <label
            htmlFor="phone"
            className="block text-sm font-medium text-foreground mb-1"
          >
            Téléphone <span className="text-destructive">*</span>
          </label>
          <input
            id="phone"
            type="tel"
            placeholder="06 12 34 56 78"
            value={data.phone || ""}
            onChange={(e) => updateField("phone", e.target.value)}
            aria-invalid={!!getError("phone")}
            aria-describedby={getError("phone") ? "phone-error" : undefined}
            className={`
              w-full px-3 py-2 rounded-lg border
              bg-background text-foreground
              placeholder-muted-foreground
              focus:outline-none focus:ring-2 focus:ring-primary
              ${getError("phone") ? "border-destructive" : "border-input"}
            `}
          />
          {getError("phone") && (
            <p id="phone-error" className="text-sm text-destructive mt-1">
              {getError("phone")}
            </p>
          )}
        </div>

        {/* Date de naissance */}
        <div>
          <label
            htmlFor="dateOfBirth"
            className="block text-sm font-medium text-foreground mb-1"
          >
            Date de naissance <span className="text-destructive">*</span>
          </label>
          <input
            id="dateOfBirth"
            type="date"
            value={data.dateOfBirth || ""}
            onChange={(e) => updateField("dateOfBirth", e.target.value)}
            aria-invalid={!!getError("dateOfBirth")}
            aria-describedby={getError("dateOfBirth") ? "dob-error" : undefined}
            className={`
              w-full px-3 py-2 rounded-lg border
              bg-background text-foreground
              focus:outline-none focus:ring-2 focus:ring-primary
              ${getError("dateOfBirth") ? "border-destructive" : "border-input"}
            `}
          />
          {getError("dateOfBirth") && (
            <p id="dob-error" className="text-sm text-destructive mt-1">
              {getError("dateOfBirth")}
            </p>
          )}
        </div>
      </div>
    </FormStep>
  );
}
