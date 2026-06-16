const puppeteer = require("puppeteer");
const path = require("node:path");

const BASE = "http://localhost:3100";
const EMAIL = process.env.E2E_EMAIL;
const PASS = process.env.E2E_PASS;
const outDir = path.join(__dirname, "presentation-shots");

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox"],
    defaultViewport: { width: 1440, height: 900 },
  });
  const page = await browser.newPage();
  const hide = () =>
    page
      .addStyleTag({
        content:
          "nextjs-portal,[data-nextjs-toast],[data-nextjs-dev-tools-button]{display:none !important}",
      })
      .catch(() => {});
  try {
    await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
    await page.type("#email", EMAIL);
    await page.type("#password", PASS);
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {}),
      page.click('button[type="submit"]'),
    ]);
    await hide();
    // Ouvrir le dropdown de la cloche
    await page.evaluate(() => {
      const b = [...document.querySelectorAll("button")].find((x) =>
        /Notifications/.test(x.getAttribute("aria-label") || ""),
      );
      b && b.click();
    });
    await new Promise((r) => setTimeout(r, 700));
    await page.screenshot({ path: path.join(outDir, "17-notifications-cloche.png") });
    // Page complète
    await page.goto(BASE + "/notifications", { waitUntil: "networkidle0" });
    await hide();
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({ path: path.join(outDir, "17-notifications-page.png"), fullPage: true });
    console.log("Captures OK");
  } catch (e) {
    console.log("ERR", e.message);
  } finally {
    await browser.close();
  }
})();
