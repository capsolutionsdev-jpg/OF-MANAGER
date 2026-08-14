/**
 * Validateurs pour les formations SSIAP recyclage / remise à niveau.
 * Vérifie que le diplôme SSIAP détenu est valide (< 3 ans).
 */

export function validateSsiapDiplomeValidity(diplomaDate: string | null | undefined): {
  valid: boolean;
  message?: string;
  expiresAt?: Date;
} {
  if (!diplomaDate) {
    return { valid: false, message: "La date du diplôme est requise" };
  }

  const date = new Date(diplomaDate);
  if (isNaN(date.getTime())) {
    return { valid: false, message: "Date invalide" };
  }

  const expiresAt = new Date(date);
  expiresAt.setFullYear(expiresAt.getFullYear() + 3);

  const now = new Date();
  const isValid = expiresAt > now;

  return {
    valid: isValid,
    message: isValid
      ? `Diplôme valide jusqu'au ${expiresAt.toLocaleDateString("fr-FR")}`
      : `Diplôme expiré depuis le ${expiresAt.toLocaleDateString("fr-FR")}`,
    expiresAt,
  };
}

/**
 * Vérifie si une formation est un recyclage ou remise à niveau SSIAP.
 */
export function isSsiapRecyclageOrRan(titre: string | null | undefined): boolean {
  if (!titre) return false;
  const lower = titre.toLowerCase();
  return (lower.includes("ssiap") && (lower.includes("recyclage") || lower.includes("remise à niveau"))) ||
    lower.includes("mac");
}
