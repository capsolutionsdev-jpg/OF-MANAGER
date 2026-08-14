/**
 * Phase 4.2 — Core Web Vitals Monitoring
 * Track LCP, FID, CLS metrics
 */

export interface WebVital {
  name: string;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
}

export interface WebVitalsReport {
  lcp: WebVital; // Largest Contentful Paint
  fid: WebVital; // First Input Delay
  cls: WebVital; // Cumulative Layout Shift
  timestamp: string;
}

/**
 * LCP (Largest Contentful Paint)
 * Target: < 2.5s
 */
export function getLCPThresholds() {
  return {
    good: 2500,
    "needs-improvement": 4000,
  };
}

/**
 * FID (First Input Delay)
 * Target: < 100ms
 */
export function getFIDThresholds() {
  return {
    good: 100,
    "needs-improvement": 300,
  };
}

/**
 * CLS (Cumulative Layout Shift)
 * Target: < 0.1
 */
export function getCLSThresholds() {
  return {
    good: 0.1,
    "needs-improvement": 0.25,
  };
}

/**
 * Get rating for metric
 */
function getRating(
  value: number,
  thresholds: { good: number; "needs-improvement": number }
): "good" | "needs-improvement" | "poor" {
  if (value <= thresholds.good) return "good";
  if (value <= thresholds["needs-improvement"]) return "needs-improvement";
  return "poor";
}

/**
 * Monitor Web Vitals using Web Vitals library
 * (Requires @web-vitals package)
 */
export function initWebVitalsMonitoring(
  callback?: (report: WebVitalsReport) => void
) {
  if (typeof window === "undefined") return;

  let lcp: WebVital | null = null;
  let fid: WebVital | null = null;
  let cls: WebVital | null = null;

  // Mock implementation - in real env, use web-vitals library
  const report: WebVitalsReport = {
    lcp: {
      name: "LCP",
      value: 0,
      rating: "good",
    },
    fid: {
      name: "FID",
      value: 0,
      rating: "good",
    },
    cls: {
      name: "CLS",
      value: 0,
      rating: "good",
    },
    timestamp: new Date().toISOString(),
  };

  callback?.(report);

  return report;
}

/**
 * Image optimization checklist
 */
export const IMAGE_OPTIMIZATION_CHECKLIST = [
  {
    id: "next-image",
    title: "Use next/image for all images",
    description: "Automatic optimization, responsive srcset, lazy loading",
  },
  {
    id: "webp",
    title: "Serve WebP + AVIF formats",
    description: "next/image handles this automatically",
  },
  {
    id: "responsive",
    title: "Set width/height or aspectRatio",
    description: "Prevent layout shift (CLS)",
  },
  {
    id: "priority",
    title: "Mark LCP image as priority",
    description: "Loads earlier, improves LCP score",
  },
  {
    id: "sizes",
    title: "Use sizes attribute for responsive",
    description: "Helps browser pick right resolution",
  },
];

/**
 * Font optimization checklist
 */
export const FONT_OPTIMIZATION_CHECKLIST = [
  {
    id: "next-font",
    title: "Use next/font for web fonts",
    description: "Self-hosted fonts, automatic subsetting",
  },
  {
    id: "swap",
    title: "Set font-display: swap",
    description: "Prevent FOUT (Flash of Unstyled Text)",
  },
  {
    id: "subset",
    title: "Subset fonts (latin only)",
    description: "Reduce font file size",
  },
  {
    id: "preload",
    title: "Preload critical fonts",
    description: "Improve font load performance",
  },
];

/**
 * Code splitting checklist
 */
export const CODE_SPLITTING_CHECKLIST = [
  {
    id: "dynamic-import",
    title: "Use dynamic() for heavy components",
    description: "Route-based code splitting with next/dynamic",
  },
  {
    id: "lazy-routes",
    title: "Lazy-load routes outside viewport",
    description: "Reduce initial JS bundle",
  },
  {
    id: "bundle-analyze",
    title: "Analyze bundle with @next/bundle-analyzer",
    description: "Identify large dependencies",
  },
  {
    id: "tree-shake",
    title: "Remove unused code",
    description: "Unused imports, CSS, dependencies",
  },
];

/**
 * Generate performance report
 */
export function generatePerformanceReport(vitals: WebVitalsReport): string {
  const lines = [
    "# Core Web Vitals Report",
    `Date: ${vitals.timestamp}`,
    "",
    "## Metrics",
    `- LCP: ${vitals.lcp.value}ms (${vitals.lcp.rating})`,
    `- FID: ${vitals.fid.value}ms (${vitals.fid.rating})`,
    `- CLS: ${vitals.cls.value} (${vitals.cls.rating})`,
    "",
    "## Targets",
    "- LCP < 2.5s (Good)",
    "- FID < 100ms (Good)",
    "- CLS < 0.1 (Good)",
  ];

  return lines.join("\n");
}
