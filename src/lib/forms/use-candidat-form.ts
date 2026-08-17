"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  CandidatFormData,
  FormStep,
  STEPS,
  validateStep,
} from "./candidat-form-schema";

const STORAGE_KEY = "ofm.candidat-form-draft";
const AUTO_SAVE_INTERVAL = 30000; // 30 secondes

export function useCandidatForm() {
  // État principal
  const [data, setData] = useState<Partial<CandidatFormData>>({
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const [currentStep, setCurrentStep] = useState<FormStep>("identite");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Sauvegarde automatique
  const [lastSaved, setLastSaved] = useState<Partial<CandidatFormData> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Soft-delete undo
  const [deletedAt, setDeletedAt] = useState<Date | null>(null);
  const [deletedData, setDeletedData] = useState<Partial<CandidatFormData> | null>(null);

  // Refs pour éviter les timer resets à chaque frappe + cleanup au démontage
  const dataRef = useRef(data);
  const lastSavedRef = useRef(lastSaved);
  const deleteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);
  useEffect(() => {
    lastSavedRef.current = lastSaved;
  }, [lastSaved]);

  // Cleanup au démontage
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (deleteTimeoutRef.current) {
        clearTimeout(deleteTimeoutRef.current);
        deleteTimeoutRef.current = null;
      }
    };
  }, []);

  // Charger depuis localStorage au montage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setData(parsed);
        setLastSaved(parsed);
      }
    } catch {
      console.warn("Erreur chargement brouillon");
    }
  }, []);

  const saveToStorage = useCallback((formData: Partial<CandidatFormData>) => {
    try {
      setIsSaving(true);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
      setLastSaved(formData);
      setSaveError(null);
    } catch {
      setSaveError("Erreur sauvegarde du brouillon");
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Auto-save toutes les 30s (interval PERSISTANT, pas de reset à chaque frappe)
  // Utilise les refs pour lire les dernières valeurs sans re-créer l'interval.
  // saveToStorage est déclaré AVANT (useCallback stable) → deps propres.
  useEffect(() => {
    const interval = setInterval(() => {
      if (
        JSON.stringify(dataRef.current) !== JSON.stringify(lastSavedRef.current)
      ) {
        saveToStorage(dataRef.current);
      }
    }, AUTO_SAVE_INTERVAL);
    return () => clearInterval(interval);
  }, [saveToStorage]);

  const updateField = useCallback(
    (field: string, value: unknown) => {
      setData((prev) => ({
        ...prev,
        [field]: value,
        updatedAt: new Date().toISOString(),
      }));
      setTouched((prev) => ({ ...prev, [field]: true }));
    },
    []
  );

  const validateCurrentStep = useCallback((): boolean => {
    const validation = validateStep(currentStep, data);
    if (!validation.success) {
      const newErrors: Record<string, string[]> = {};
      const err = "error" in validation ? validation.error : null;
      if (err && "issues" in err) {
        (err as { issues: Array<{ path: (string | number)[]; message: string }> }).issues.forEach((issue) => {
          const path = issue.path.join(".");
          newErrors[path] = [issue.message];
        });
      } else if (err && "errors" in err) {
        (err as { errors: Array<{ path: (string | number)[]; message: string }> }).errors.forEach((issue) => {
          const path = issue.path.join(".");
          newErrors[path] = [issue.message];
        });
      }
      setErrors(newErrors);
      return false;
    }
    setErrors({});
    return true;
  }, [currentStep, data]);

  const nextStep = useCallback((): boolean => {
    if (!validateCurrentStep()) {
      return false;
    }

    const currentIndex = STEPS.indexOf(currentStep);
    if (currentIndex < STEPS.length - 1) {
      const nextStepKey = STEPS[currentIndex + 1];
      setCurrentStep(nextStepKey);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return true;
    }
    return false;
  }, [currentStep, validateCurrentStep]);

  const prevStep = useCallback((): boolean => {
    const currentIndex = STEPS.indexOf(currentStep);
    if (currentIndex > 0) {
      const prevStepKey = STEPS[currentIndex - 1];
      setCurrentStep(prevStepKey);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return true;
    }
    return false;
  }, [currentStep]);

  const goToStep = useCallback((step: FormStep): boolean => {
    // Valider tous les steps jusqu'à celui-ci
    const stepIndex = STEPS.indexOf(step);
    for (let i = 0; i < stepIndex; i++) {
      const validation = validateStep(STEPS[i], data);
      if (!validation.success) {
        return false;
      }
    }

    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: "smooth" });
    return true;
  }, [data]);

  const submitForm = useCallback(async (): Promise<boolean> => {
    if (!validateCurrentStep()) {
      return false;
    }

    try {
      setIsSaving(true);

      // POST to API
      const response = await fetch("/api/candidat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        setSaveError(error.message || "Erreur soumission");
        return false;
      }

      // Succès : nettoyer localStorage
      localStorage.removeItem(STORAGE_KEY);
      return true;
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Erreur soumission");
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [data, validateCurrentStep]);

  // Soft-delete avec undo 30s
  // - Capture `data` en snapshot LOCAL pour éviter stale closure
  //   (deletedData vaudrait null au moment de la capture)
  // - Timeout stocké dans une ref pour cleanup au démontage
  // - PLUS de window.addEventListener('undo') : undoDelete() est déjà exposé
  const deleteForm = useCallback((): void => {
    const snapshot = data;
    setDeletedData(snapshot);
    setDeletedAt(new Date());
    setData({});

    // Nettoyer un timeout précédent (double delete = un seul timer actif)
    if (deleteTimeoutRef.current) {
      clearTimeout(deleteTimeoutRef.current);
    }

    deleteTimeoutRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
      setDeletedData(null);
      setDeletedAt(null);
      deleteTimeoutRef.current = null;
    }, 30000);
  }, [data]);

  const undoDelete = useCallback((): void => {
    if (deleteTimeoutRef.current) {
      clearTimeout(deleteTimeoutRef.current);
      deleteTimeoutRef.current = null;
    }
    if (deletedData) {
      setData(deletedData);
      setDeletedData(null);
      setDeletedAt(null);
    }
  }, [deletedData]);

  const getUndoCountdown = useCallback((): number => {
    if (!deletedAt) return 0;
    const elapsed = Date.now() - deletedAt.getTime();
    const remaining = Math.max(0, 30000 - elapsed);
    return Math.ceil(remaining / 1000);
  }, [deletedAt]);

  const isDirty = JSON.stringify(data) !== JSON.stringify(lastSaved);
  const progress = Math.round((
    (STEPS.indexOf(currentStep) + 1) / STEPS.length
  ) * 100);

  return {
    // État
    data,
    currentStep,
    errors,
    touched,
    isDirty,
    isSaving,
    saveError,
    progress,

    // Soft-delete
    deletedData,
    deletedAt,
    undoCountdown: getUndoCountdown(),

    // Actions
    updateField,
    validateCurrentStep,
    nextStep,
    prevStep,
    goToStep,
    submitForm,
    deleteForm,
    undoDelete,
  };
}
