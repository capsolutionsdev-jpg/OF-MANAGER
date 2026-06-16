import puppeteer from "puppeteer";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(".");
const env = fs.readFileSync(path.join(root, ".env"), "utf8");
const BASE = "http://localhost:3100";
const EMAIL = process.env.E2E_EMAIL;
const PASS = process.env.E2E_PASS;
const outDir = path.join(root, "scripts", "shots");

const browser = await puppeteer.launch({
  headless: true,
  args: ["--no-sandbox"],
  defaultViewport: { width: 1440, height: 900 },
});
const page = await browser.newPage();
const shot = (n) => page.screenshot({ path: path.join(outDir, n + ".png"), fullPage: true });

try {
  await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
  await page.type("#email", EMAIL);
  await page.type("#password", PASS);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {}),
    page.click('button[type="submit"]'),
  ]);
  await page.goto(BASE + "/comptabilite", { waitUntil: "networkidle0" });

  // Ouvre le 1er dialogue « Régler »
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) =>
      x.textContent.includes("Régler"),
    );
    b?.click();
  });
  await new Promise((r) => setTimeout(r, 800));

  // Renseigne le mode puis soumet (montant pré-rempli au restant)
  await page.select('select[name="mode"]', "Virement").catch(() => {});
  await new Promise((r) => setTimeout(r, 200));
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) =>
      x.textContent.includes("Enregistrer le règlement"),
    );
    b?.click();
  });
  await new Promise((r) => setTimeout(r, 3000));

  await page.goto(BASE + "/comptabilite", { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 800));
  await shot("07-comptabilite-apres-reglement");
  console.log("SAVED 07-comptabilite-apres-reglement");
} catch (e) {
  console.error("FATAL", e.message);
} finally {
  await browser.close();
}
