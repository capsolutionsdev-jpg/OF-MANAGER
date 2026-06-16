const puppeteer = require("puppeteer");
const path = require("node:path");
const BASE = "http://localhost:3100";
const outDir = path.join(__dirname, "shots");
(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox"],
    defaultViewport: { width: 1440, height: 900 },
  });
  const page = await browser.newPage();
  const hide = () =>
    page.addStyleTag({ content: "nextjs-portal{display:none !important}" }).catch(() => {});
  try {
    await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
    await page.type("#email", process.env.E2E_EMAIL);
    await page.type("#password", process.env.E2E_PASS);
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {}),
      page.click('button[type="submit"]'),
    ]);
    await new Promise((r) => setTimeout(r, 1500));
    console.log("URL apres login:", page.url());
    await hide();
    await page.screenshot({ path: path.join(outDir, "console-01-liste.png"), fullPage: true });
    const href = await page.evaluate(() => {
      const a = [...document.querySelectorAll('a[href^="/console/"]')].find((x) =>
        /\/console\/[a-z0-9]{10,}$/.test(x.getAttribute("href") || ""),
      );
      return a ? a.getAttribute("href") : null;
    });
    if (href) {
      await page.goto(BASE + href, { waitUntil: "networkidle0" });
      await new Promise((r) => setTimeout(r, 1000));
      await hide();
      await page.screenshot({ path: path.join(outDir, "console-02-config.png"), fullPage: true });
      console.log("config:", href);
    } else {
      console.log("aucun lien organisme trouvé");
    }
  } catch (e) {
    console.error("FATAL", e.message);
  } finally {
    await browser.close();
  }
})();
