"use client";

import { FormContainer } from "@/components/forms/form-container";

export default function FormulaireCandidatPage() {
  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">
          Inscription candidat
        </h1>
        <p className="text-muted-foreground mt-2">
          Complétez votre inscription en 5 étapes
        </p>
      </header>

      <FormContainer />
    </div>
  );
}
