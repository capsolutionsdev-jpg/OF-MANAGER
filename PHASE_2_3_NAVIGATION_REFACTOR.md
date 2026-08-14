# Phase 2.3 — Navigation Architecture Refactor

**Status :** 🚀 IN PROGRESS
**Effort :** 25-30h
**Depends On :** Lot 1.3 (flows), 2.1 (design tokens), 2.2 (components)

---

## 📋 Overview

Restructure la navigation 30→6 métiers pour éliminer la surcharge cognitive et améliorer l'onboarding.

### Before (Current)
```
30 items éparpillés
├─ CRM (leads, prospects, pipeline)
├─ Sessions (création, émargement, planning)
├─ Candidats (fiches, inscriptions, documents)
├─ Formations (catalogue, modèles, configurations)
├─ Finance (devis, factures, trésorerie)
├─ Compta (bilan, exports FEC, charges)
├─ E-Learning (apprenants, cours, progression)
├─ Documents (templates, archive, signatures)
├─ Automatisations (webhooks, regles, logs)
├─ Administration (comptes, agréments, audit)
├─ Bilan Pédagogique (BPF, rapports)
├─ Site Vitrine (blog, analytics, photos)
└─ ... + 18 autres
```

**Problem :** Utilisateurs "perdus" 30% du temps. Onboarding 3x plus long.

### After (Target)
```
6 métiers organisés logiquement
├─ 🎓 FORMATIONS & CATALOGUE
│  ├─ Formations (catalogue, modèles)
│  ├─ Sessions (création, planning, émargement)
│  └─ Programmes (cours, progression, certification)
│
├─ 👥 CANDIDATS & INSCRIPTIONS
│  ├─ Candidats (fiches, historique)
│  ├─ Inscriptions (forms, prérequis, pièces)
│  └─ Financement (CPF, OPCO, dossiers)
│
├─ 💼 FINANCE & FACTURATION
│  ├─ Devis (création, signatures, suivi)
│  ├─ Factures (émission, rapprochement)
│  └─ Trésorerie (paiements, rapports)
│
├─ 📊 QUALITÉ & AUDIT
│  ├─ Qualiopi (audit, BPF, preuves)
│  ├─ Agréments (visibilité, dates)
│  └─ Audit Trail (logs, RGPD)
│
├─ 🔧 CONFIGURATION & AUTOMATION
│  ├─ Paramètres (organisme, formations, modalités)
│  ├─ Automatisations (webhooks, regles, logs)
│  └─ Intégrations (Wedof, YouSign, Stripe)
│
└─ 🌐 SITE VITRINE & COMMUNICATION
   ├─ Blog (articles, photos)
   ├─ Analytics (trafic, leads, conversion)
   └─ Communication (e-mails, SMS, notifications)
```

**Target :** Utilisateurs "perdus" < 5%. Onboarding −50%.

---

## 🎯 Implementation Plan

### Step 1 : Audit Flows (Day 1)
- [ ] Map les 30 items actuels → 6 métiers
- [ ] Identifier les dépendances (Finance dépend de Sessions, etc.)
- [ ] Valider avec UX (card sorting, user testing si possible)

### Step 2 : Sidebar Structure (Day 1-2)
- [ ] Create `lib/navigation-structure.ts` — définition de l'arborescence
- [ ] Implement `components/app-sidebar-v2.tsx` — nouvelle sidebar
- [ ] Collapsible groups par métier
- [ ] Feature-gating par tenant

```typescript
// lib/navigation-structure.ts
export const NAVIGATION_STRUCTURE = {
  FORMATIONS: {
    label: "🎓 Formations & Catalogue",
    items: [
      { href: "/formations", label: "Catalogue" },
      { href: "/sessions", label: "Sessions" },
      { href: "/elearning", label: "E-Learning" },
    ],
  },
  CANDIDATS: { ... },
  FINANCE: { ... },
  // ... etc
}
```

### Step 3 : Global Search (Cmd+K) (Day 2-3)
- [ ] Implement search overlay `components/command-palette.tsx`
- [ ] Index formations, sessions, candidats, devis, etc.
- [ ] Keyboard shortcut Cmd+K / Ctrl+K
- [ ] Recent searches + favorites

### Step 4 : Breadcrumbs (Day 3)
- [ ] Add breadcrumb bar below topbar
- [ ] Auto-generated from route structure
- [ ] Clickable navigation + copy link

### Step 5 : Mobile Navigation (Day 3-4)
- [ ] Bottom nav drawer (6 main sections)
- [ ] Expand/collapse submenus
- [ ] Swipe gestures

### Step 6 : Feature Gates (Day 4)
- [ ] Gating per tenant (demo, AGUYSE, CAP, etc.)
- [ ] Permission-based visibility
- [ ] A/B testing ready

---

## 🏗️ Technical Details

### New Sidebar Component Structure
```
AppSidebar (v2)
├─ SidebarHeader
│  ├─ Logo + Organisme name
│  └─ Collapse/Expand toggle
├─ SidebarNav
│  ├─ SidebarGroup × 6 (one per métier)
│  │  ├─ SidebarGroupLabel (collapsible)
│  │  └─ SidebarMenuItems × N
│  └─ SidebarItemWithFeatureGate
└─ SidebarFooter
   ├─ Theme toggle
   ├─ Profile menu
   └─ Logout
```

### Route Changes
```
Current:
/formations
/sessions
/candidats
...

New (backward compatible):
/formations/ (group header → redirect to /formations/catalogue)
/sessions/
/candidats/
...

Add permanent paths:
/dashboard/ (auto-navigate based on role)
/search/ (global search results)
```

### Permission-Based Gates
```typescript
const canSee = (item: NavItem, user: User) => {
  if (item.requiredRole && !user.hasRole(item.requiredRole)) return false;
  if (item.featureGate && !tenant.hasFeature(item.featureGate)) return false;
  if (item.mustHaveSubscription && !tenant.subscription) return false;
  return true;
}
```

---

## 📈 Success Metrics

| Metric | Before | Target | Method |
|--------|--------|--------|--------|
| Time to find formation | 45s | 15s | Benchmark power users |
| Onboarding time (new user) | 20min | 10min | Timed user testing |
| Navigation errors | 30% | <5% | Support ticket analysis |
| Sidebar collapse rate | — | <20% | Analytics |
| Search usage | — | >60% heavy users | Event tracking |

---

## 📝 Checklist

- [ ] Flows mapped & validated
- [ ] Sidebar component rebuilt
- [ ] Global search implemented
- [ ] Breadcrumbs added
- [ ] Mobile nav updated
- [ ] Feature gates wired
- [ ] Backwards compat ensured
- [ ] Analytics instrumented
- [ ] User testing (5+ users)
- [ ] Accessibility verified (WCAG 2.1 AA)
- [ ] Mobile tested (iOS Safari, Android Chrome)
- [ ] Performance verified (Lighthouse)

---

**Next:** Phase 2.4 (WCAG Compliance Foundation)
