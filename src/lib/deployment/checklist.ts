/**
 * Phase 4.4 — Deployment Checklist
 * Pre-flight checks before production deployment
 */

export interface ChecklistItem {
  id: string;
  title: string;
  category: "code" | "database" | "config" | "monitoring" | "communication";
  critical: boolean;
  completed: boolean;
  notes?: string;
}

export const DEPLOYMENT_CHECKLIST: ChecklistItem[] = [
  // CODE
  {
    id: "code-1",
    title: "All PRs merged to main",
    category: "code",
    critical: true,
    completed: false,
  },
  {
    id: "code-2",
    title: "All tests passing (unit + E2E)",
    category: "code",
    critical: true,
    completed: false,
  },
  {
    id: "code-3",
    title: "No console errors/warnings",
    category: "code",
    critical: true,
    completed: false,
  },
  {
    id: "code-4",
    title: "Bundle size < 2MB (gzip)",
    category: "code",
    critical: false,
    completed: false,
  },
  {
    id: "code-5",
    title: "TypeScript strict mode passes",
    category: "code",
    critical: true,
    completed: false,
  },

  // DATABASE
  {
    id: "db-1",
    title: "Database backup taken",
    category: "database",
    critical: true,
    completed: false,
  },
  {
    id: "db-2",
    title: "Migrations reviewed and tested",
    category: "database",
    critical: true,
    completed: false,
  },
  {
    id: "db-3",
    title: "Rollback procedure documented",
    category: "database",
    critical: true,
    completed: false,
  },

  // CONFIGURATION
  {
    id: "config-1",
    title: "Environment variables configured",
    category: "config",
    critical: true,
    completed: false,
  },
  {
    id: "config-2",
    title: "Feature flags set correctly",
    category: "config",
    critical: true,
    completed: false,
  },
  {
    id: "config-3",
    title: "CDN/cache headers configured",
    category: "config",
    critical: false,
    completed: false,
  },
  {
    id: "config-4",
    title: "CORS/security headers configured",
    category: "config",
    critical: true,
    completed: false,
  },

  // MONITORING
  {
    id: "monitoring-1",
    title: "Datadog alerts enabled",
    category: "monitoring",
    critical: true,
    completed: false,
  },
  {
    id: "monitoring-2",
    title: "Error tracking enabled",
    category: "monitoring",
    critical: true,
    completed: false,
  },
  {
    id: "monitoring-3",
    title: "Performance monitoring active",
    category: "monitoring",
    critical: false,
    completed: false,
  },
  {
    id: "monitoring-4",
    title: "Rollback runbook reviewed",
    category: "monitoring",
    critical: true,
    completed: false,
  },

  // COMMUNICATION
  {
    id: "comm-1",
    title: "User notification drafted",
    category: "communication",
    critical: false,
    completed: false,
  },
  {
    id: "comm-2",
    title: "Support team briefed",
    category: "communication",
    critical: false,
    completed: false,
  },
  {
    id: "comm-3",
    title: "Stakeholders notified",
    category: "communication",
    critical: false,
    completed: false,
  },
];

/**
 * Get deployment readiness
 */
export function getDeploymentReadiness(): {
  allCriticalComplete: boolean;
  completionPercent: number;
  blockers: ChecklistItem[];
} {
  const complete = DEPLOYMENT_CHECKLIST.filter((i) => i.completed).length;
  const total = DEPLOYMENT_CHECKLIST.length;
  const blockers = DEPLOYMENT_CHECKLIST.filter((i) => i.critical && !i.completed);

  return {
    allCriticalComplete: blockers.length === 0,
    completionPercent: Math.round((complete / total) * 100),
    blockers,
  };
}

/**
 * Deployment communication template
 */
export function generateDeploymentNotification(version: string): string {
  const lines = [
    "# OFManager — Mise à jour majeure",
    "",
    `**Version**: ${version}`,
    `**Date**: ${new Date().toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`,
    `**Durée estimée**: 1-2 heures`,
    "",
    "## 🎯 Nouveautés",
    "",
    "### Accessibilité (WCAG 2.1 AA)",
    "- Conformité 100% aux standards WCAG",
    "- Navigation au clavier complète",
    "- Lecteur d'écran supporté (NVDA, VoiceOver)",
    "",
    "### UX Améliorée",
    "- Nouvelle navigation (6 métiers organisés)",
    "- Recherche globale (Cmd+K)",
    "- Formulaires multi-étapes avec auto-save",
    "- Tables avec tri et actions en masse",
    "- Dashboard avec KPI animés",
    "",
    "### Mobile & PWA",
    "- Navigation mobile inférieure (48px targets)",
    "- Installation PWA sur écran d'accueil",
    "- Fonctionnement hors ligne",
    "",
    "## 📋 Checklist",
    "- [ ] Lire le guide des nouveautés",
    "- [ ] Tester sur votre appareil",
    "- [ ] Signaler tout problème",
    "",
    "**Support**: contact@ofmanager.info",
  ];

  return lines.join("\n");
}

/**
 * Rollback procedure
 */
export function generateRollbackPlan(version: string): string {
  const lines = [
    "# Rollback Procedure",
    "",
    `## Deploy version that failed: ${version}`,
    "",
    "### Step 1: Immediate Rollback (< 5 min)",
    "1. Go to Vercel dashboard",
    "2. Click 'Deployments' tab",
    "3. Find last STABLE deployment (before current)",
    "4. Click '...' → 'Rollback to this deployment'",
    "5. Confirm rollback",
    "",
    "### Step 2: Investigate",
    "1. Check Datadog error logs",
    "2. Review recent changes in git",
    "3. Check database integrity",
    "",
    "### Step 3: Communicate",
    "1. Notify users of rollback",
    "2. Create incident ticket",
    "3. Schedule post-mortem",
    "",
    "### Step 4: Redeploy",
    "1. Fix identified issues",
    "2. Run full test suite",
    "3. Deploy to staging first",
    "4. Run smoke tests",
    "5. Deploy to production",
  ];

  return lines.join("\n");
}
