const puppeteer = require("puppeteer");

const BASE = "http://localhost:3100";
const EMAIL = process.env.E2E_EMAIL;
const PASS = process.env.E2E_PASS;
const log = (...a) => console.log(...a);

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox"],
    defaultViewport: { width: 1440, height: 900 },
  });
  const page = await browser.newPage();
  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const txt = () => page.evaluate(() => document.body.innerText);

  try {
    await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
    await page.type("#email", EMAIL);
    await page.type("#password", PASS);
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {}),
      page.click('button[type="submit"]'),
    ]);
    log("LOGIN ->", page.url());

    // Cloche présente + badge non lus
    const bell = await page.evaluate(() => {
      const b = [...document.querySelectorAll("button")].find((x) =>
        /Notifications/.test(x.getAttribute("aria-label") || ""),
      );
      return b ? { label: b.getAttribute("aria-label") } : null;
    });
    log("CLOCHE topnav:", bell ? bell.label : "ABSENTE");

    // Ouvrir le dropdown de la cloche
    await page.evaluate(() => {
      const b = [...document.querySelectorAll("button")].find((x) =>
        /Notifications/.test(x.getAttribute("aria-label") || ""),
      );
      b && b.click();
    });
    await new Promise((r) => setTimeout(r, 600));
    const dropTxt = await txt();
    log("DROPDOWN contient la tâche smoke:", dropTxt.includes("SMOKE NOTIF"));
    log("DROPDOWN 'tout marquer comme lu':", dropTxt.includes("Tout marquer comme lu"));

    // Page /notifications
    await page.goto(BASE + "/notifications", { waitUntil: "networkidle0" });
    const pageTxt = await txt();
    log("PAGE /notifications titre:", pageTxt.includes("Notifications & alertes"));
    log("PAGE liste la tâche smoke:", pageTxt.includes("SMOKE NOTIF"));

    // Tout marquer comme lu
    await page.evaluate(() => {
      const b = [...document.querySelectorAll("button")].find((x) =>
        /Tout marquer comme lu/.test(x.textContent || ""),
      );
      b && b.click();
    });
    await new Promise((r) => setTimeout(r, 1500));
    await page.goto(BASE + "/dashboard", { waitUntil: "networkidle0" });
    const labelAfter = await page.evaluate(() => {
      const b = [...document.querySelectorAll("button")].find((x) =>
        /Notifications/.test(x.getAttribute("aria-label") || ""),
      );
      return b ? b.getAttribute("aria-label") : null;
    });
    log("CLOCHE après 'marquer lu' (doit être sans compteur):", labelAfter);

    log("ERREURS console:", errors.length ? errors.slice(0, 5) : "aucune");
  } catch (e) {
    log("FATAL", e.message);
  } finally {
    await browser.close();
  }
})();
