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
    // ── Login ──
    await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
    await page.type("#email", EMAIL);
    await page.type("#password", PASS);
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {}),
      page.click('button[type="submit"]'),
    ]);
    log("LOGIN ->", page.url());

    // ── 1) TÂCHES ──
    await page.goto(BASE + "/taches", { waitUntil: "networkidle0" });
    log("TACHES status text present:", (await txt()).includes("Tâches & rappels"));
    // ouvrir le formulaire
    await page.evaluate(() => {
      const b = [...document.querySelectorAll("button")].find((x) =>
        /Nouvelle tâche/.test(x.textContent || ""),
      );
      b && b.click();
    });
    await new Promise((r) => setTimeout(r, 400));
    const titre = "Relancer devis client démo " + Date.now();
    await page.type("#titre", titre);
    await page.evaluate(() => {
      const b = [...document.querySelectorAll("button")].find((x) =>
        /Ajouter la tâche/.test(x.textContent || ""),
      );
      b && b.click();
    });
    await new Promise((r) => setTimeout(r, 1500));
    await page.reload({ waitUntil: "networkidle0" });
    log("TACHE créée visible:", (await txt()).includes(titre));

    // ── 2) KANBAN ──
    await page.goto(BASE + "/kanban", { waitUntil: "networkidle0" });
    const kt = await txt();
    log("KANBAN titre:", kt.includes("Pipeline Kanban"), "| colonnes:", /Gagné|Nouveau|Qualifié|Perdu|Déposez/.test(kt));

    // ── 3) SIGNATURE DEVIS ──
    await page.goto(BASE + "/devis", { waitUntil: "networkidle0" });
    const devisHref = await page.evaluate(() => {
      const a = [...document.querySelectorAll('a[href^="/devis/"]')].find((x) =>
        /\/devis\/[a-z0-9]{10,}$/.test(x.getAttribute("href") || ""),
      );
      return a ? a.getAttribute("href") : null;
    });
    if (!devisHref) {
      log("DEVIS: aucun devis existant — flux signature non testé");
    } else {
      await page.goto(BASE + devisHref, { waitUntil: "networkidle0" });
      // Générer le lien (ou lien déjà présent)
      const hasGenButton = await page.evaluate(() => {
        const b = [...document.querySelectorAll("button")].find((x) =>
          /Générer le lien de signature/.test(x.textContent || ""),
        );
        if (b) {
          b.click();
          return true;
        }
        return false;
      });
      if (hasGenButton) {
        await new Promise((r) => setTimeout(r, 1800));
        await page.reload({ waitUntil: "networkidle0" }).catch(() => {});
      }
      // Lire le lien d'acceptation depuis l'input readonly
      const acceptUrl = await page.evaluate(() => {
        const inp = [...document.querySelectorAll("input[readonly]")].find((x) =>
          /\/devis-accept\//.test(x.value || ""),
        );
        return inp ? inp.value : null;
      });
      log("DEVIS lien acceptation:", acceptUrl ? "généré" : "ABSENT");
      if (acceptUrl) {
        const path = acceptUrl.replace(/^https?:\/\/[^/]+/, "");
        await page.goto(BASE + path, { waitUntil: "networkidle0" });
        log("ACCEPT page devis visible:", (await txt()).includes("DEVIS"));
        await page.type("#sign-name", "Jean Client — Gérant");
        // dessiner sur le canvas (events souris → pointer events Chromium)
        const box = await page.evaluate(() => {
          const c = document.querySelector("canvas");
          if (!c) return null;
          const r = c.getBoundingClientRect();
          return { x: r.x, y: r.y, w: r.width, h: r.height };
        });
        if (box) {
          await page.mouse.move(box.x + 40, box.y + 40);
          await page.mouse.down();
          await page.mouse.move(box.x + 120, box.y + 90, { steps: 8 });
          await page.mouse.move(box.x + 200, box.y + 50, { steps: 8 });
          await page.mouse.up();
        }
        // cocher la case d'acceptation
        await page.evaluate(() => {
          const cb = document.querySelector('input[type="checkbox"]');
          if (cb && !cb.checked) cb.click();
        });
        await new Promise((r) => setTimeout(r, 300));
        await page.evaluate(() => {
          const b = [...document.querySelectorAll("button")].find((x) =>
            /Accepter et signer/.test(x.textContent || ""),
          );
          b && b.click();
        });
        await new Promise((r) => setTimeout(r, 2000));
        await page.reload({ waitUntil: "networkidle0" });
        log("DEVIS accepté (page publique):", (await txt()).includes("déjà accepté") || (await txt()).includes("Bon pour accord"));
        // Vérifier côté back-office
        await page.goto(BASE + devisHref, { waitUntil: "networkidle0" });
        log("DEVIS accepté (back-office):", (await txt()).includes("accepté en ligne"));
      }
    }

    log("ERREURS console:", errors.length ? errors.slice(0, 5) : "aucune");
  } catch (e) {
    log("FATAL", e.message);
  } finally {
    await browser.close();
  }
})();
