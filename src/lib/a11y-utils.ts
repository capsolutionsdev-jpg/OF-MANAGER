/**
 * Phase 2.4 — Accessibility Utilities
 *
 * Helpers pour assurer la conformité WCAG 2.1 AA
 */

/**
 * Vérifier que tous les inputs ont des labels associés
 * WCAG 1.3.1 (Info and Relationships)
 */
export function validateInputLabels(root: Document | HTMLElement = document) {
  const inputs = root.querySelectorAll("input, textarea, select");
  const unlabeled: HTMLElement[] = [];

  inputs.forEach((input) => {
    if (input instanceof HTMLElement) {
      const hasLabel =
        input.hasAttribute("aria-label") ||
        input.hasAttribute("aria-labelledby") ||
        root.querySelector(`label[for="${input.id}"]`);

      if (!hasLabel) {
        unlabeled.push(input);
      }
    }
  });

  return {
    isValid: unlabeled.length === 0,
    violations: unlabeled,
    message: `${unlabeled.length} input(s) sans label associé`,
  };
}

/**
 * Vérifier que tous les images ont un alt text
 * WCAG 1.1.1 (Text Alternatives)
 */
export function validateImageAlts(root: Document | HTMLElement = document) {
  const images = root.querySelectorAll("img");
  const missingAlts: HTMLImageElement[] = [];

  images.forEach((img) => {
    if (!img.hasAttribute("alt") && !img.hasAttribute("aria-hidden")) {
      missingAlts.push(img);
    }
  });

  return {
    isValid: missingAlts.length === 0,
    violations: missingAlts,
    message: `${missingAlts.length} image(s) sans alt text`,
  };
}

/**
 * Vérifier que les boutons ont un nom accessible
 * WCAG 4.1.2 (Name, Role, Value)
 */
export function validateButtonNames(root: Document | HTMLElement = document) {
  const buttons = root.querySelectorAll("button, [role='button']");
  const noNames: HTMLElement[] = [];

  buttons.forEach((button) => {
    if (button instanceof HTMLElement) {
      const hasName =
        button.textContent?.trim().length ||
        button.hasAttribute("aria-label") ||
        button.hasAttribute("aria-labelledby") ||
        button.querySelector("img[alt]");

      if (!hasName) {
        noNames.push(button);
      }
    }
  });

  return {
    isValid: noNames.length === 0,
    violations: noNames,
    message: `${noNames.length} button(s) sans nom accessible`,
  };
}

/**
 * Vérifier la structure des headings
 * WCAG 1.3.1 (Info and Relationships)
 */
export function validateHeadingStructure(root: Document | HTMLElement = document) {
  const headings = root.querySelectorAll("h1, h2, h3, h4, h5, h6");
  const violations: HTMLElement[] = [];
  let lastLevel = 0;

  headings.forEach((heading) => {
    if (heading instanceof HTMLElement) {
      const level = parseInt(heading.tagName[1]);

      // Vérifier pas de sauts (h1 → h3 est mauvais)
      if (lastLevel > 0 && level > lastLevel + 1) {
        violations.push(heading);
      }

      lastLevel = level;
    }
  });

  return {
    isValid: violations.length === 0,
    violations,
    message: `${violations.length} heading(s) avec structure incorrecte`,
  };
}

/**
 * Vérifier le contraste de couleur
 * WCAG 1.4.3 (Contrast Minimum)
 * Target: 4.5:1 pour texte normal, 3:1 pour texte > 18pt
 */
export function getContrastRatio(foreground: string, background: string): number {
  const fg = getRelativeLuminance(foreground);
  const bg = getRelativeLuminance(background);

  const lighter = Math.max(fg, bg);
  const darker = Math.min(fg, bg);

  return (lighter + 0.05) / (darker + 0.05);
}

function getRelativeLuminance(color: string): number {
  // Parse hex color
  const hex = color.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16) / 255;
  const g = parseInt(hex.substr(2, 2), 16) / 255;
  const b = parseInt(hex.substr(4, 2), 16) / 255;

  // Apply gamma correction
  const luminance =
    0.2126 * adjustLuminance(r) +
    0.7152 * adjustLuminance(g) +
    0.0722 * adjustLuminance(b);

  return luminance;
}

function adjustLuminance(value: number): number {
  return value <= 0.03928
    ? value / 12.92
    : Math.pow((value + 0.055) / 1.055, 2.4);
}

/**
 * Vérifier que toutes les modales ont aria-modal
 * WCAG 4.1.2 (Name, Role, Value)
 */
export function validateModals(root: Document | HTMLElement = document) {
  const dialogs = root.querySelectorAll("[role='dialog'], dialog");
  const missingAria: HTMLElement[] = [];

  dialogs.forEach((dialog) => {
    if (
      dialog instanceof HTMLElement &&
      !dialog.hasAttribute("aria-modal") &&
      dialog.tagName !== "DIALOG"
    ) {
      missingAria.push(dialog);
    }
  });

  return {
    isValid: missingAria.length === 0,
    violations: missingAria,
    message: `${missingAria.length} modal(s) sans aria-modal`,
  };
}

/**
 * Audit complet WCAG 2.1 AA
 */
export function runA11yAudit(root: Document | HTMLElement = document) {
  const results = {
    inputLabels: validateInputLabels(root),
    imageAlts: validateImageAlts(root),
    buttonNames: validateButtonNames(root),
    headingStructure: validateHeadingStructure(root),
    modals: validateModals(root),
  };

  const allValid = Object.values(results).every((r) => r.isValid);

  return {
    isValid: allValid,
    results,
    summary: `Audit WCAG: ${allValid ? "✅ Conforme" : "❌ Violations détectées"}`,
  };
}

export type A11yAuditResult = ReturnType<typeof runA11yAudit>;
