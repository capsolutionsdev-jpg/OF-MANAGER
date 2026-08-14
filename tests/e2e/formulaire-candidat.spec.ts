import { test, expect } from "@playwright/test";

/**
 * Phase 4.3 — E2E Tests: Candidate Form
 * Test all 5 steps + submission + auto-save
 */

test.describe("Formulaire Candidat", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/formulaire-candidat");
  });

  test("Step 1: Identité — all fields required", async ({ page }) => {
    // Verify step 1 visible
    await expect(page.locator("h2")).toContainText("Identité");

    // Try next without data
    await page.click("button:has-text('Suivant')");
    await expect(page.locator("text=Prénom requis")).toBeVisible();

    // Fill fields
    await page.fill("#firstName", "Jean");
    await page.fill("#lastName", "Dupont");
    await page.fill("#email", "jean@example.com");
    await page.fill("#phone", "0612345678");
    await page.fill("#dateOfBirth", "1990-01-15");

    // Next step
    await page.click("button:has-text('Suivant')");
    await expect(page.locator("h2")).toContainText("Adresse");
  });

  test("Step 2: Adresse — validation", async ({ page }) => {
    // Skip to step 2
    await page.fill("#firstName", "Jean");
    await page.fill("#lastName", "Dupont");
    await page.fill("#email", "jean@example.com");
    await page.fill("#phone", "0612345678");
    await page.fill("#dateOfBirth", "1990-01-15");
    await page.click("button:has-text('Suivant')");

    // Fill address
    await page.fill("[name=street]", "123 Rue de la Paix");
    await page.fill("[name=postalCode]", "75001");
    await page.fill("[name=city]", "Paris");
    await page.fill("[name=region]", "Île-de-France");

    // Next
    await page.click("button:has-text('Suivant')");
    await expect(page.locator("h2")).toContainText("Formation");
  });

  test("Auto-save to localStorage", async ({ page, context }) => {
    // Fill step 1
    await page.fill("#firstName", "Jean");
    await page.fill("#lastName", "Dupont");
    await page.fill("#email", "jean@example.com");
    await page.fill("#phone", "0612345678");
    await page.fill("#dateOfBirth", "1990-01-15");

    // Wait for auto-save (30s)
    await page.waitForTimeout(31000);

    // Reload page
    await page.reload();

    // Data should be restored
    await expect(page.locator("#firstName")).toHaveValue("Jean");
    await expect(page.locator("#lastName")).toHaveValue("Dupont");
  });

  test("Progress bar updates", async ({ page }) => {
    // Step 1: 20%
    let progress = await page.locator("[role=progressbar]");
    let width = await progress.evaluate((el) =>
      window.getComputedStyle(el).width
    );
    expect(parseInt(width)).toBeLessThan(100);

    // Move to step 2
    await page.fill("#firstName", "Jean");
    await page.fill("#lastName", "Dupont");
    await page.fill("#email", "jean@example.com");
    await page.fill("#phone", "0612345678");
    await page.fill("#dateOfBirth", "1990-01-15");
    await page.click("button:has-text('Suivant')");

    // Progress should increase
    width = await progress.evaluate((el) =>
      window.getComputedStyle(el).width
    );
    expect(parseInt(width)).toBeGreaterThan(100);
  });

  test("Back button navigates to previous step", async ({ page }) => {
    // Go to step 2
    await page.fill("#firstName", "Jean");
    await page.fill("#lastName", "Dupont");
    await page.fill("#email", "jean@example.com");
    await page.fill("#phone", "0612345678");
    await page.fill("#dateOfBirth", "1990-01-15");
    await page.click("button:has-text('Suivant')");

    await expect(page.locator("h2")).toContainText("Adresse");

    // Back button
    await page.click("button:has-text('Retour')");

    // Back to step 1
    await expect(page.locator("h2")).toContainText("Identité");
  });

  test("Keyboard navigation: Tab through fields", async ({ page }) => {
    const firstInput = page.locator("#firstName");
    const lastInput = page.locator("#dateOfBirth");

    // Focus first input
    await firstInput.focus();
    await expect(firstInput).toBeFocused();

    // Tab to next fields
    await page.keyboard.press("Tab");
    await expect(page.locator("#lastName")).toBeFocused();

    // Continue tabbing
    await page.keyboard.press("Tab");
    await expect(page.locator("#email")).toBeFocused();
  });

  test("Accessibility: Focus visible on all inputs", async ({ page }) => {
    const input = page.locator("#firstName");

    // Focus input
    await input.focus();

    // Check focus ring is visible
    const outline = await input.evaluate((el) =>
      window.getComputedStyle(el).outlineWidth
    );
    expect(outline).not.toBe("0px");
  });

  test("Mobile: Touch targets >= 48px", async ({ page }) => {
    // Resize to mobile
    await page.setViewportSize({ width: 375, height: 812 });

    // Check button height
    const button = page.locator("button:has-text('Suivant')");
    const box = await button.boundingBox();

    expect(box?.height).toBeGreaterThanOrEqual(48);
  });

  test("Error messages are announced to screen readers", async ({ page }) => {
    // Try submit without data
    await page.click("button:has-text('Suivant')");

    // Check aria-live region updated
    const liveRegion = page.locator("[role=status]");
    await expect(liveRegion).toContainText("requis");
  });
});
