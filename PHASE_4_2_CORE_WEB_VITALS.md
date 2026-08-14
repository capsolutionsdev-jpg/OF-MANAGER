# Phase 4.2 — Core Web Vitals Optimization (95+ Lighthouse)

**Status :** ⏳ NOT STARTED
**Effort :** 20-25h
**Depends On :** Lot 3.x (all pages optimized)
**Target :** 95+ Lighthouse (all metrics)

---

## 📋 Overview

Optimiser pour **Core Web Vitals** → 95+ Lighthouse score.

### Targets
```
LCP (Largest Contentful Paint) < 2.5s
FID (First Input Delay) < 100ms
CLS (Cumulative Layout Shift) < 0.1
```

---

## 🚀 Optimizations

### 1. Image Optimization
```typescript
// Use next/image for automatic optimization
import Image from 'next/image'

<Image
  src="/formation.jpg"
  alt="Formation"
  width={800}
  height={600}
  priority // LCP image
  sizes="(max-width: 768px) 100vw, 50vw"
/>

// WebP + AVIF formats (automatic)
// Responsive srcset (automatic)
```

### 2. Code Splitting
```typescript
// Lazy-load heavy components
import dynamic from 'next/dynamic'

const DataTable = dynamic(
  () => import('@/components/DataTable'),
  { loading: () => <Skeleton /> }
)

// Route-based code splitting (automatic with App Router)
```

### 3. Font Optimization
```typescript
// Use next/font (preload, subset)
import { Poppins, Inter } from 'next/font/google'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  display: 'swap', // Avoid FOUT
})

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
})
```

### 4. CLS (Cumulative Layout Shift) Prevention
```css
/* Reserve space for images (aspect-ratio) */
img {
  aspect-ratio: auto;
}

/* Fixed heights for modals, toasts */
.modal {
  height: 600px; /* or min-height */
}

/* No render-blocking resources */
</css>
```

### 5. Caching Strategy
```typescript
// Next.js caching
export const revalidate = 60 // ISR, revalidate every 60s

// Browser caching headers
// (set via next.config.mjs)
```

---

## ✅ Checklist

- [ ] Images: next/image for all (LCP images marked priority)
- [ ] Fonts: next/font with swap display
- [ ] Code splitting: lazy-load below-fold components
- [ ] CLS prevention: aspect-ratio, fixed heights
- [ ] Caching: ISR (Incremental Static Regeneration)
- [ ] Minification: CSS, JS, HTML (automatic)
- [ ] Compression: gzip/brotli (automatic)
- [ ] Lighthouse: 95+ score (all pages)

---

**Next:** Phase 4.3 (Regression Testing)
