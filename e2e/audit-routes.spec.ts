import { test, expect } from "@playwright/test";

// AUDIT QA — balaie toutes les pages authentifiées avec un vrai compte et relève :
// statut HTTP, erreurs serveur (500), erreurs de console, et écrans d'erreur Next.
// Lecture seule : aucune donnée n'est modifiée.

const EMAIL = process.env.QA_EMAIL ?? "infocap.comp@gmail.com";
const PASSWORD = process.env.QA_PASSWORD ?? "CapCap2026@";

const ROUTES = [
  "/dashboard",
  "/candidats", "/crm", "/crm/pipeline", "/kanban", "/leads-multicanal", "/scoring",
  "/clients-pro", "/prospects",
  "/formations", "/sessions", "/planning", "/salles", "/formateurs",
  "/documents", "/signatures", "/validations",
  "/elearning", "/suivi-pedagogique",
  "/comptabilite", "/devis", "/facturation", "/tresorerie", "/ma-facturation",
  "/qualiopi", "/qualiopi/reclamations", "/qualiopi/partenaires", "/bpf", "/rgpd",
  "/automatisations", "/notifications", "/taches", "/support",
  "/jurys", "/diplomes",
  "/rapports", "/sms", "/ia", "/portail-client",
  "/site-vitrine", "/blog",
  "/administration", "/mon-compte", "/mentions-legales",
];

type Anomalie = { route: string; type: string; detail: string };
const anomalies: Anomalie[] = [];

test("audit complet des pages authentifiées", async ({ page }) => {
  test.setTimeout(300_000);

  // ── Connexion ──
  await page.goto("/login");
  await page.fill("#email", EMAIL);
  await page.fill("#password", PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|mon-espace|console)/, { timeout: 30_000 });
  console.log(`\n[AUDIT] connecté : ${EMAIL} → ${page.url()}\n`);

  for (const route of ROUTES) {
    const erreursConsole: string[] = [];
    const onConsole = (m: { type(): string; text(): string }) => {
      if (m.type() === "error") erreursConsole.push(m.text().slice(0, 160));
    };
    page.on("console", onConsole);

    let statut = 0;
    try {
      const res = await page.goto(route, { waitUntil: "domcontentloaded", timeout: 30_000 });
      statut = res?.status() ?? 0;
    } catch (e) {
      anomalies.push({ route, type: "NAVIGATION", detail: String(e).slice(0, 160) });
      page.off("console", onConsole);
      continue;
    }

    const corps = (await page.locator("body").innerText().catch(() => "")) ?? "";
    const redirige = !page.url().includes(route);

    if (statut >= 500) {
      anomalies.push({ route, type: "HTTP_" + statut, detail: "erreur serveur" });
    } else if (/Application error|something went wrong|Internal Server Error|Une erreur/i.test(corps)) {
      anomalies.push({ route, type: "ECRAN_ERREUR", detail: corps.slice(0, 140).replace(/\s+/g, " ") });
    }
    for (const err of erreursConsole) {
      anomalies.push({ route, type: "CONSOLE", detail: err });
    }

    const drapeau = statut >= 500 ? "ERREUR" : redirige ? "redirigé" : "ok";
    console.log(`[AUDIT] ${String(statut).padEnd(3)} ${drapeau.padEnd(9)} ${route}${redirige ? " → " + new URL(page.url()).pathname : ""}${erreursConsole.length ? "  (console: " + erreursConsole.length + ")" : ""}`);
    page.off("console", onConsole);
  }

  console.log(`\n${"=".repeat(72)}\n[AUDIT] ${anomalies.length} anomalie(s) relevée(s) sur ${ROUTES.length} pages\n`);
  const parType: Record<string, Anomalie[]> = {};
  for (const a of anomalies) (parType[a.type] ??= []).push(a);
  for (const [type, liste] of Object.entries(parType)) {
    console.log(`\n### ${type} (${liste.length})`);
    for (const a of liste) console.log(`  - ${a.route} : ${a.detail}`);
  }

  // L'audit ne doit pas échouer sur des erreurs de console ; seules les 500 bloquent.
  const bloquantes = anomalies.filter((a) => a.type.startsWith("HTTP_5") || a.type === "ECRAN_ERREUR");
  expect(bloquantes, bloquantes.map((b) => `${b.route} (${b.type})`).join(", ")).toHaveLength(0);
});
