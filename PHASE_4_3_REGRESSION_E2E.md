# Phase 4.3 — Regression Testing + E2E Coverage

**Status :** ⏳ NOT STARTED
**Effort :** 25-30h
**Depends On :** Lot 3.x (all features implemented)
**Target :** 0 regressions, 95%+ critical path coverage

---

## 📋 Overview

E2E testing for **critical user flows** (cross-browser, responsive).

---

## 🛠️ Test Strategy

### Playwright Setup
```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  webServer: {
    command: 'npm run dev',
    port: 3000,
  },
  use: {
    baseURL: 'http://localhost:3000',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 12'] } },
  ],
})
```

### Critical Flows
```typescript
// tests/forms.spec.ts
test('Candidate form submission (all 5 steps)', async ({ page }) => {
  await page.goto('/formations/candidat-form')
  
  // Step 1
  await page.fill('[name=firstName]', 'John')
  await page.fill('[name=lastName]', 'Doe')
  await page.fill('[name=email]', 'john@example.com')
  await page.click('text=Next')
  await expect(page).toHaveURL(/step=2/)
  
  // Step 2
  await page.fill('[name=street]', '123 Main St')
  await page.fill('[name=city]', 'Paris')
  await page.click('text=Next')
  
  // ... continue through all 5 steps
  
  // Submit
  await page.click('text=Submit')
  await expect(page).toHaveURL('/confirmation')
  await expect(page.locator('text=Submitted')).toBeVisible()
})

// tests/tables.spec.ts
test('Table sorting and bulk actions', async ({ page }) => {
  await page.goto('/sessions')
  
  // Sort by date
  await page.click('th:has-text("Date")')
  await expect(page.locator('th[aria-sort="ascending"]')).toBeVisible()
  
  // Multi-select rows
  await page.click('input[aria-label="Select all rows"]')
  const selectedCount = await page.locator('[aria-selected=true]').count()
  expect(selectedCount).toBeGreaterThan(0)
  
  // Bulk delete
  await page.click('text=Delete')
  await page.click('text=Confirm')
  await expect(page.locator('text=Deleted')).toBeVisible()
})

// tests/accessibility.spec.ts
test('Keyboard navigation (all pages)', async ({ page }) => {
  await page.goto('/')
  
  // Tab through all interactive elements
  let tabCount = 0
  while (tabCount < 20) {
    await page.keyboard.press('Tab')
    const focused = await page.evaluate(() => document.activeElement?.tagName)
    expect(['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA']).toContain(focused)
    tabCount++
  }
})
```

---

## ✅ Checklist

- [ ] Playwright configured for 5 browser/device combos
- [ ] Critical flows covered (forms, tables, navigation)
- [ ] Cross-browser testing (Chrome, Firefox, Safari)
- [ ] Responsive testing (desktop, mobile)
- [ ] Accessibility testing (keyboard nav, screen reader)
- [ ] Performance testing (LCP, FID, CLS)
- [ ] 0 test flakiness (retries, waits)
- [ ] CI/CD integration (GitHub Actions)

---

**Next:** Phase 4.4 (Staging & Deployment)
