/**
 * `fetch` avec délai d'attente (A12-002).
 *
 * Un `fetch` natif sans `signal` peut « pendre » indéfiniment si le tiers accepte
 * la connexion mais ne répond plus : un `try/catch` ne capte PAS ce hang (il n'y a
 * ni résolution ni rejet). On borne donc chaque appel sortant avec
 * `AbortSignal.timeout`, ce qui provoque un rejet capturable au-delà du délai.
 *
 * @param timeoutMs délai avant abandon (défaut 10 s).
 */
export function fetchWithTimeout(
  input: string | URL | Request,
  init: RequestInit = {},
  timeoutMs = 10_000,
): Promise<Response> {
  return fetch(input, { ...init, signal: AbortSignal.timeout(timeoutMs) });
}
