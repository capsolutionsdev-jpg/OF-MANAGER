/**
 * Corps + code HTTP d'une sonde de disponibilité. La route /api/health teste la
 * base (SELECT 1) puis délègue le formatage ici (logique pure → testable sans I/O).
 * base joignable → 200 ok/up ; base injoignable → 503 degraded/down (le moniteur
 * externe déclenche alors une alerte).
 */
export function healthPayload(dbOk: boolean): {
  body: { status: string; db: "up" | "down" };
  status: number;
} {
  return dbOk
    ? { body: { status: "ok", db: "up" }, status: 200 }
    : { body: { status: "degraded", db: "down" }, status: 503 };
}
