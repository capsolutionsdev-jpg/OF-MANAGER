import puppeteer from "puppeteer";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(".");
const env = fs.readFileSync(path.join(root, ".env"), "utf8");
const get = (k) => {
  const m = env.match(new RegExp("^" + k + '=("?)(.*?)\\1\\s*$', "m"));
  return m ? m[2] : "";
};
const EMAIL = process.env.E2E_EMAIL || get("ADMIN_EMAIL");
const PASS = process.env.E2E_PASS || get("ADMIN_PASSWORD");
const BASE = "http://localhost:3100";
const outDir = path.join(root, "scripts", "shots");
fs.mkdirSync(outDir, { recursive: true });

const browser = await puppeteer.launch({
  headless: true,
  args: ["--no-sandbox"],
  defaultViewport: { width: 1440, height: 900 },
});
const page = await browser.newPage();
const shot = async (name) => {
  const p = path.join(outDir, name + ".png");
  await page.screenshot({ path: p, fullPage: true });
  console.log("SAVED", p);
};

try {
  await page.goto(BASE + "/login", { waitUntil: "networkidle0", timeout: 60000 });
  await shot("01-login");

  await page.type("#email", EMAIL, { delay: 10 });
  await page.type("#password", PASS, { delay: 10 });
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle0", timeout: 60000 }).catch(() => {}),
    page.click('button[type="submit"]'),
  ]);
  await new Promise((r) => setTimeout(r, 2500));
  console.log("AFTER LOGIN URL:", page.url());
  await shot("02-dashboard");

  const visit = async (route, name) => {
    try {
      await page.goto(BASE + route, { waitUntil: "networkidle0", timeout: 60000 });
      await new Promise((r) => setTimeout(r, 1200));
      await shot(name);
    } catch (e) {
      console.log("ERR", route, e.message);
    }
  };
  await visit("/comptabilite", "06-comptabilite");
} catch (e) {
  console.error("FATAL", e.message);
} finally {
  await browser.close();
}
