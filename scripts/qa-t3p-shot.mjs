// QA visuelle T3P via Playwright (Chromium headless, indépendant du volet).
// Se connecte, capture l'onglet Parcours T3P du candidat démo + la page de pilotage.
import { chromium } from "playwright";

const BASE = process.env.QA_BASE || "http://localhost:3400";
const EMAIL = "vitrine@capacademy.fr";
const PASS = "CapVitrine2026!";
const CAND = "cmsmb7itg0000uvq4olaw8v3w";
const OUT = process.env.QA_OUT || "C:/Users/GPSP/AppData/Local/Temp/claude";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
await page.fill("#email", EMAIL);
await page.fill("#password", PASS);
await page.click('button[type="submit"]');
await page.waitForURL(/\/dashboard/, { timeout: 30000 });
console.log("Connecté →", page.url());

// 1) Onglet Parcours T3P du candidat démo
await page.goto(`${BASE}/candidats/${CAND}/parcours-t3p`, { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/t3p-fiche-candidat.png`, fullPage: true });
const h = await page.locator("text=Parcours d'accès").first().textContent().catch(() => null);
console.log("Fiche candidat — titre parcours:", h);

// 2) Page de pilotage
await page.goto(`${BASE}/parcours-t3p`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/t3p-pilotage.png`, fullPage: true });
const rows = await page.locator("table tbody tr").count().catch(() => 0);
console.log("Pilotage — lignes de parcours:", rows);

await browser.close();
console.log("Captures écrites dans", OUT);
