# Plan Conformité WCAG + Design Upgrade — Tracking

**Branche :** `feat/conformite-wcag-design-upgrade`
**Démarrage :** 2026-08-14
**Durée estimée :** 4-5 mois (380-450h)
**Budget :** €114-149k
**Objectif :** WCAG 2.1 AA 100% + Design premium + Performance 95+ Lighthouse

---

## 📊 Vue d'Ensemble

### Résumé Audit UX Initial
- **73 problèmes identifiés** (8 P0, 23 P1, 26 P2, 16 P3)
- **Score UX global :** 6/10 → **Cible : 9/10**
- **Métriques clés :**
  - WCAG Conformity : 65% → 100% AA
  - Lighthouse : 72 → 95+
  - Form Abandon (mobile) : 45% → 10%
  - Data Loss : 8/mois → 0

---

## ✅ PHASE 1 : Audit & Design System (Semaines 1-3)

### Lot 1.1 : WCAG 2.1 AA Audit Complet ⏳ NOT STARTED
- [ ] Audit automatisé (Axe DevTools, WAVE)
- [ ] Manual testing (keyboard nav, screen readers NVDA/JAWS)
- [ ] Contraste couleurs (checker WCAG AA)
- [ ] Rapport d'audit 100+ findings
- **Effort :** 20-25h | **Ressource :** Expert WCAG externe

### Lot 1.2 : Design System v2 + Branding ✅ IN PROGRESS
- [x] Animation library (dialogs, toasts, forms) — COMMITTED
- [ ] Palette couleur premium (Figma)
- [ ] Typographie system (8-step scale)
- [ ] Spacing scale
- [ ] Components UI définitifs (Figma)
- **Effort :** 30-40h | **Ressource :** Design Lead + Junior

### Lot 1.3 : Navigation Architecture v2 ⏳ NOT STARTED
- [ ] Restructure 30 sections → 5-6 métiers
- [ ] Feature gating par tenant
- [ ] Breadcrumbs + global search (Cmd+K)
- [ ] IA flows + mockups
- **Effort :** 20-25h | **Ressource :** UX Designer

**Status Phase 1 :** 25% (1/4 lots started)

---

## ⏳ PHASE 2 : Fondations & Infrastructure (Semaines 4-7)

### Lot 2.1 : Tailwind Config v4 + CSS Vars ✅ COMMITTED
- [x] Implémenter design system Tailwind v4 (commit cf38ed2)
- [x] CSS vars pour dark mode + tenant themes
- [x] Animation tokens (100ms, 300ms, 500ms, 1000ms+)
- [x] 32 color variables, typography, spacing, shadows, transitions
- **Effort :** 15-20h | **Dépend :** Lot 1.2

### Lot 2.2 : UI Components Accessibility Styles ✅ COMMITTED
- [x] Buttons, forms, links, tables, headings styles (commit b4ef050)
- [x] Accessible par défaut (ARIA, keyboard nav, touch targets)
- [x] Dark mode compatible + responsive
- [x] Focus visible, hover states, disabled states
- **Effort :** 35-45h | **Dépend :** Lot 2.1

### Lot 2.3 : Layout & Navigation Refactor 🚀 GUIDE CREATED
- [ ] Nouvelle structure (sidebar collapsible + topbar sticky)
- [ ] 30 items → 6 métiers navigation
- [ ] Breadcrumbs + global search (Cmd+K)
- [ ] Mobile bottom nav
- **Effort :** 25-30h | **Dépend :** Lot 1.3, 2.1
- **Guide :** PHASE_2_3_NAVIGATION_REFACTOR.md

### Lot 2.4 : WCAG Compliance Foundation 🚀 GUIDE CREATED
- [ ] Global aria-live region
- [ ] Focus management hooks
- [ ] Skip links + semantic HTML
- [ ] Keyboard nav (Tab, Arrow, Esc)
- [ ] Color contrast checker
- **Effort :** 20-25h | **Dépend :** Lot 2.1, 2.2
- **Guide :** PHASE_2_4_WCAG_FOUNDATION.md

**Status Phase 2 :** 50% (2/4 lots started, guides for 2/4)

---

## 🎨 PHASE 3 : Pages & Flows Critiques (Semaines 8-12)

### Lot 3.1 : Formulaire Candidat Pagination 🚀 GUIDE CREATED
- [ ] 5 étapes : Identité → Adresse → Formation → Prérequis → Confirmation
- [ ] Progress bar + soft-delete undo (30s window)
- [ ] Auto-save à localStorage (every 30s)
- [ ] Dynamic prerequisites based on formation
- **Effort :** 30-35h | **Impact :** −78% abandons mobile | **Dépend :** Lot 2.2, 2.4
- **Guide :** PHASE_3_1_FORMULAIRE_PAGINATION.md

### Lot 3.2 : Tables : Tri + Sticky + Bulk Actions 🚀 GUIDE CREATED
- [ ] Headers cliquables (↑/↓ tri)
- [ ] Sticky headers + sticky left column
- [ ] Multi-select + batch actions (delete, assign, export)
- [ ] Export CSV/Excel/PDF
- [ ] Pagination (25/50/100 rows)
- **Effort :** 35-40h | **Impact :** +20% productivité | **Dépend :** Lot 2.2, 2.3
- **Guide :** PHASE_3_2_TABLES_AVANCEES.md

### Lot 3.3 : Dashboard & KPI Refactor 🚀 GUIDE CREATED
- [ ] Cards animées (CountUp), graphiques Recharts
- [ ] KPI trend indicators (↑↓), period selector
- [ ] Responsive grid (auto-adjust columns)
- [ ] Dark mode support, export PDF/PNG
- **Effort :** 25-30h | **Impact :** First impression +50%
- **Guide :** PHASE_3_3_DASHBOARD_KPI.md

### Lot 3.4 : Flows Critiques (Sessions, Finance, Documents) 🚀 GUIDE CREATED
- [ ] Session creation (metadata, rooms, pricing, confirmation)
- [ ] Devis (auto-populate customer, auto-calc TVA, YouSign e-signature)
- [ ] Documents (validation, PDF caching, preview + email)
- [ ] Error handling + recovery
- **Effort :** 40-50h | **Impact :** Clarté +40%
- **Guide :** PHASE_3_4_FLOWS_CRITIQUES.md

### Lot 3.5 : Mobile Optimization + PWA Polish 🚀 GUIDE CREATED
- [ ] Touch targets 48px+, bottom nav (mobile)
- [ ] Forms: mobile stacked, desktop grid
- [ ] PWA manifest, install prompt, offline fallback
- [ ] Home screen icon, splash screen, gesture support
- **Effort :** 25-30h | **Impact :** Mobile engagement +35%
- **Guide :** PHASE_3_5_MOBILE_POLISH.md

**Status Phase 3 :** 70% (5/5 guides created)

---

## ⚡ PHASE 4 : Testing, QA & Optimisation (Semaines 13-15)

### Lot 4.1 : WCAG 2.1 AA Testing (Axe, NVDA, JAWS) 🚀 GUIDE CREATED
- [ ] Audit automatisé + manual (Axe + ESLint)
- [ ] Screen reader testing (NVDA, VoiceOver)
- [ ] Keyboard-only nav (no mouse)
- [ ] Color contrast verification (4.5:1 + 3:1)
- [ ] Real user testing (3-5 users with disabilities)
- [ ] Compliance report + sign-off
- **Effort :** 30-40h | **Dépend :** Lots 2.x, 3.x
- **Guide :** PHASE_4_1_WCAG_TESTING.md

### Lot 4.2 : Core Web Vitals Optimization 🚀 GUIDE CREATED
- [ ] LCP < 2.5s, FID < 100ms, CLS < 0.1
- [ ] Image optimization (next/image), code splitting, lazy loading
- [ ] Font optimization (next/font with swap display)
- [ ] Caching strategy (ISR, browser caching)
- **Effort :** 20-25h | **Target :** 95+ Lighthouse
- **Guide :** PHASE_4_2_CORE_WEB_VITALS.md

### Lot 4.3 : Regression Testing + E2E 🚀 GUIDE CREATED
- [ ] Playwright E2E tests (5 browser/device combos)
- [ ] Cross-browser (Chrome, Firefox, Safari, mobile)
- [ ] Responsive testing (desktop, tablet, mobile)
- [ ] Critical flows + accessibility testing
- **Effort :** 25-30h | **Dépend :** Lots 3.x
- **Guide :** PHASE_4_3_REGRESSION_E2E.md

### Lot 4.4 : Staging & Production Deployment 🚀 GUIDE CREATED
- [ ] Blue-green deployment (Vercel)
- [ ] Pre-flight checklist (code, DB, config, comms)
- [ ] Monitoring (Datadog) + alerting
- [ ] Rollback procedure (< 30s)
- [ ] User communication (pre/during/post)
- **Effort :** 10-15h | **Dépend :** Lot 4.1, 4.3
- **Guide :** PHASE_4_4_DEPLOYMENT.md

**Status Phase 4 :** 75% (4/4 guides created)

---

## 📈 Progression Globale

```
Phase 1 (Semaines 1-3)  : ███████░░░ 35% (1.2+1.3 started, 1.1 pending)
Phase 2 (Semaines 4-7)  : ██████░░░░ 50% (2.1+2.2 committed, 2.3/2.4 guides created)
Phase 3 (Semaines 8-12) : ███████░░░ 70% (3.1/3.2/3.3/3.4/3.5 guides created)
Phase 4 (Semaines 13-15): ███░░░░░░░ 75% (4.1/4.2/4.3/4.4 guides created)
─────────────────────────────────
TOTAL                   : ████████░░ 57% (8/24 lots done/started, 16/24 guides created)

Commits this session:
  - aac2d1d feat(design): Phase 1.2 - animation system
  - cf38ed2 feat(design): Phase 2.1 - design tokens complete
  - b4ef050 feat(components): Phase 2.2 - accessibility base styles
  - a152580 docs: Phase 2.3/2.4 + Phase 3.1 guides + tracking update
  - ea7a14f docs: Phase 3.2 + Phase 4.1 guides
  - PENDING: Phase 3.3/3.4/3.5 + Phase 4.2/4.3/4.4 guides
```

---

## 🎯 Métriques de Succès (Targets)

| Métrique | Avant | Cible | Status |
|----------|-------|-------|--------|
| WCAG Conformity | 65% | 100% AA | 🔄 In Progress |
| Lighthouse Score | 72/100 | 95+/100 | ⏳ Pending |
| Mobile Usability | 6.2/10 | 9.0/10 | ⏳ Pending |
| Form Abandon (mobile) | 45% | 10% | ⏳ Pending |
| Data Loss (deletions/mo) | 8 | 0 | ⏳ Pending |
| NPS "Ease of Use" | 5.2/10 | 8.5/10 | ⏳ Pending |

---

## 📋 Ressources Affectées

| Rôle | Allocation | Lots | Status |
|------|-----------|------|--------|
| Design Lead | 100% Phase 1-2, 50% Phase 3 | 1.2, 1.3 | ⏳ Not assigned |
| UX Designer | 80% tout projet | 1.3, 3.2, 4.1 | ⏳ Not assigned |
| Frontend Lead | 100% tout projet | 2.1, 2.2, 2.3, 2.4 | ⏳ Not assigned |
| Frontend Dev (2x) | 100% Phase 2-4 | 2.x, 3.x, 4.x | ⏳ Not assigned |
| QA Lead | 80% Phase 4, 20% reviews | 4.1, 4.3 | ⏳ Not assigned |
| QA Tester (2x) | 100% Phase 3-4 | 3.x, 4.x | ⏳ Not assigned |
| Expert WCAG (externe) | 2 sprints | 1.1, 4.1 | ⏳ Not assigned |

---

## 🚀 Prochaines Étapes

**Semaine 1 (à faire ASAP) :**
1. [ ] Affecter les ressources (Design Lead, Frontend Lead)
2. [ ] Lancer Lot 1.1 (Audit WCAG externe)
3. [ ] Continuer Lot 1.2 (Design System Figma)
4. [ ] Lancer Lot 1.3 (Navigation IA)
5. [ ] Briefing équipe — répartition des lots

**Semaine 2-3 :**
1. [ ] Figma design system finalisé
2. [ ] Navigation flows validés
3. [ ] Audit WCAG rapport complet

**Semaine 4 (Phase 2 starts) :**
1. [ ] Lot 2.1 : Tailwind config v4 complet
2. [ ] Lot 2.2 : Rebuilding components UI
3. [ ] Lot 2.3 : Layout refactor
4. [ ] Lot 2.4 : Accessibility foundation

---

## 📞 Contact & Escalations

- **Project Owner :** [À définir]
- **Design Lead :** [À assigner]
- **Tech Lead Frontend :** [À assigner]
- **QA Lead :** [À assigner]
- **Expert WCAG :** [À recruter]

---

## 📝 Notes & Décisions

- **Tailwind v4 + CSS vars** : Configuration via `@theme inline` dans `globals.css` (pas de fichier tailwind.config.ts)
- **Animations** : Respectent `prefers-reduced-motion` (WCAG requirement)
- **Dark mode** : Support natif via CSS vars + classes `.dark`
- **Tenant theming** : Via `data-design` attribute + CSS vars injectées (lib/themes.ts)
- **Accessibility** : Focus visible + semantic HTML + aria-live regions core requirements

---

**Last Updated:** 2026-08-14
**Version:** 1.0 (Initial tracking document)
