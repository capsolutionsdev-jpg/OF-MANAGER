// Cycle de vie de l'essai gratuit d'un organisme (statut ESSAI).
// La période démarre à la création (Organisme.createdAt) et dure TRIAL_DAYS.

export const TRIAL_DAYS = 14;

export type TrialStatus = {
  isTrial: boolean;
  expired: boolean;
  daysLeft: number; // jours restants (négatif si dépassé)
  end: Date | null;
};

/** État de l'essai d'un organisme à partir de son statut + sa date de création. */
export function trialStatus(statut?: string | null, createdAt?: Date | string | null): TrialStatus {
  if (statut !== "ESSAI" || !createdAt) {
    return { isTrial: false, expired: false, daysLeft: 0, end: null };
  }
  const end = new Date(createdAt);
  end.setDate(end.getDate() + TRIAL_DAYS);
  const msLeft = end.getTime() - Date.now();
  return {
    isTrial: true,
    expired: msLeft <= 0,
    daysLeft: Math.ceil(msLeft / 86_400_000),
    end,
  };
}
