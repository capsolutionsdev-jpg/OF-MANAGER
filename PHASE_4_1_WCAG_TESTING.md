# Phase 4.1 — WCAG 2.1 AA Testing & Compliance Audit

**Status :** ⏳ NOT STARTED
**Effort :** 30-40h
**Depends On :** Lot 3.x (all pages + flows)
**Target :** 100% WCAG 2.1 AA conformity (0 violations)

---

## 📋 Overview

Comprehensive testing suite pour atteindre **WCAG 2.1 Level AA 100%** conformité.

### Testing Layers
```
LAYER 1 — Automated Scans (Axe, WAVE)
├─ 5-10 min/page
├─ Catches 80% of violations
└─ 0 critical, < 5 serious violations target

LAYER 2 — Manual Testing (Keyboard, Screen Reader)
├─ 10-15 min/page
├─ Catches context-dependent issues
└─ NVDA (Windows), VoiceOver (Mac), Jaws (optional)

LAYER 3 — User Testing (Real users with disabilities)
├─ 30-45 min session
├─ Finds real-world pain points
└─ 3-5 users minimum per user type

LAYER 4 — Compliance Report
├─ Document all findings
├─ Remediation plan
└─ Sign-off by WCAG expert
```

---

## 🛠️ Testing Checklist — Per Page

### Automated Testing
```bash
# 1. Install Axe DevTools (Chrome extension)
# 2. Run on page: F12 → Axe → Scan
# 3. Export results: JSON format

# 4. ESLint + accessibility rules
npm run lint -- --format json > lint-results.json

# 5. Document results
# - 0 violations = PASS ✅
# - 1-3 violations = REVIEW 🔍
# - 4+ violations = FAIL ❌
```

### Manual Testing — Keyboard Navigation
```
Test on EACH page:

PART 1: TAB NAVIGATION
□ Can reach ALL interactive elements with Tab
□ Tab order is logical (left-to-right, top-to-bottom)
□ Focus is always visible (outline/highlight)
□ Focus doesn't get trapped
□ Can use Shift+Tab to go backwards
□ No elements hidden behind modal (Tab doesn't escape)

PART 2: ENTER / SPACE
□ Links work with Enter
□ Buttons work with Space + Enter
□ Checkboxes toggle with Space
□ Radio buttons select with Space
□ Form submits with Enter in input (or on button)

PART 3: ARROW KEYS
□ Menu items navigate with Arrow keys (→ ↓ ← ↑)
□ Table cells navigate with Arrow keys
□ Tab panel switching works with Arrow keys
□ Slider moves with Arrow keys

PART 4: ESCAPE
□ Modal/dialog closes with Esc
□ Dropdown closes with Esc
□ Search/filter closes with Esc
□ Focus returns to trigger element

PART 5: SPECIAL KEYS
□ Form error announced (aria-live)
□ Loading spinner visible
□ Skip link works (Cmd+Shift+1 or custom)
```

### Manual Testing — Screen Reader (NVDA on Windows)
```
Installation:
1. Download NVDA (free): https://www.nvaccess.org/
2. Install + restart
3. Start NVDA (Ctrl+Alt+N)
4. Open Firefox or Chrome

TEST PROCEDURE (15 min per page):

PART 1: PAGE STRUCTURE
□ Page title announced on load
□ Main landmarks present (<main>, <nav>, <aside>)
□ Headings form logical hierarchy (h1 → h2 → h3)
□ No skipped heading levels (h1 → h3 is bad)
□ Content regions marked with <article>, <section>

PART 2: FORM ACCESSIBILITY
□ Form label announced for each input
□ Required fields marked (aria-required)
□ Error messages announced
□ Error messages linked to inputs (aria-describedby)
□ Submit button purpose clear

PART 3: BUTTONS & LINKS
□ Button name announced (label text or aria-label)
□ Link name announced (link text or aria-label)
□ Icon-only buttons have aria-label
□ "Click here" links have context

PART 4: IMAGES & ALT TEXT
□ All images have alt text
□ Alt text describes image (not "image of")
□ Decorative images have empty alt + aria-hidden

PART 5: LISTS
□ Unordered lists announced as "list with X items"
□ Ordered lists show numbering
□ List items are proper <li> elements

PART 6: TABLES
□ Table structure announced
□ Headers (<th>) identified
□ Row/column associations clear
□ No nested tables for layout

PART 7: DYNAMIC CONTENT
□ Modals announced as "dialog"
□ Toast messages announced (aria-live="polite")
□ Alerts announced as alerts (role="alert")
□ Loading state announced

Command keys:
- H: Navigate by headings
- T: Navigate to tables
- L: Navigate to lists
- B: Navigate to buttons
- F: Navigate to form fields
- Down arrow: Read next line
- Ctrl+Home: Go to page start
```

### Manual Testing — VoiceOver (macOS / iOS)
```
Start VoiceOver:
- macOS: Cmd+F5
- iOS: Settings → Accessibility → VoiceOver

Basic gestures:
- VO+U: Open rotor (navigate elements)
- VO+Right arrow: Next element
- VO+Left arrow: Previous element
- VO+Space: Interact with element
- VO+Space twice: Open context menu

TEST (10 min per page):
1. Start VoiceOver
2. Reload page
3. Navigate all interactive elements
4. Verify names, roles, states announced
5. Test form submission
6. Test modal open/close
7. Check focus management
```

### Color Contrast Testing
```
WCAG AA Contrast Ratios:
- Normal text: 4.5:1 minimum
- Large text (18pt+): 3:1 minimum
- Graphics/icons: 3:1 minimum
- Focus indicators: 3:1 minimum

Tools:
1. WebAIM Contrast Checker
   https://webaim.org/resources/contrastchecker/
   
2. Chrome DevTools
   - Inspect element
   - Styles panel
   - Color shows contrast ratio
   
3. Axe DevTools
   - Auto-checks all contrast ratios
   
4. WAVE Browser Extension
   - Highlights low contrast areas

Test:
□ All text > 4.5:1 (against background)
□ Disabled text > 3:1 (if visible)
□ Focus ring > 3:1 (against any background)
□ Icons > 3:1 (meaningful icons)
□ Buttons > 3:1 (button + text)
```

---

## 📋 Page Audit Checklist

### Sample: Formation Fiche Page
```markdown
## Formation Fiche — WCAG 2.1 AA Audit

### Automated Scan (Axe)
- [ ] 0 critical violations
- [ ] 0 serious violations
- [ ] Export: audit-formation-fiche.json

### Keyboard Testing
- [ ] Tab reaches all buttons/links
- [ ] Focus visible on all elements
- [ ] No focus traps
- [ ] Form submits with Enter
- [ ] Modal closes with Escape
- Score: ___/10

### Screen Reader (NVDA)
- [ ] Page title announced
- [ ] Headings logical (h1 > h2 > h3)
- [ ] Image alt text descriptive
- [ ] Form labels associated
- [ ] Buttons named
- [ ] Links contextualized
- Score: ___/10

### Color Contrast
- [ ] Body text 4.5:1
- [ ] Small text 4.5:1
- [ ] Focus ring 3:1
- [ ] Icons 3:1
- [ ] Buttons 3:1
- Score: ___/10

### Mobile (iOS VoiceOver + Android TalkBack)
- [ ] All elements reachable
- [ ] Names/roles/states clear
- [ ] No unexpected focus jumps
- [ ] Gesture alt text (buttons)
- Score: ___/10

### Overall Score
- Automated: __/10
- Manual: __/10
- Contrast: __/10
- Mobile: __/10
- **Average: __/10**

### Issues Found
1. [P0] ...
2. [P1] ...
3. [P2] ...

### Remediation
1. ...
2. ...

### Retesting Date
```

---

## 🚀 Testing Strategy

### Phase 1: Core Pages (Week 1)
```
Priority 1 (WCAG critical):
- Formation Fiche (public + detail)
- Formulaire Candidat (all 5 steps)
- Dashboard (summary view)
- Navigation (sidebar, topbar, modals)

Time: 10 pages × 1.5h = 15h
Target: 95%+ pass rate
```

### Phase 2: User Flows (Week 2)
```
Priority 2 (User journeys):
- Session creation flow (start → end)
- Candidate inscription flow
- Finance devis flow
- Automation setup
- Qualiopi audit process

Time: 5 flows × 2h = 10h
Target: 100% pass rate
```

### Phase 3: Edge Cases (Week 2-3)
```
Priority 3 (Accessibility edge cases):
- Empty states (no data)
- Error states (form validation)
- Loading states (spinners)
- Success states (toasts)
- Multi-tenant switching
- Dark mode

Time: 8 pages × 1.5h = 12h
Target: 100% pass rate
```

### Phase 4: Real User Testing (Week 3)
```
Recruit 3-5 users:
- User 1: Keyboard only (motor impairment)
- User 2: Screen reader (visual impairment)
- User 3: Cognitive disability
- User 4: Aging (low vision, motor)
- User 5: Mixed (deaf-blind)

Sessions: 45 min each
Tasks: 3-5 per session
Findings: Document + prioritize
```

---

## 📊 Compliance Report Template

```markdown
# WCAG 2.1 AA Compliance Report

**Date:** 2026-09-15
**Auditor:** John Doe (WCAG Expert)
**Project:** OF Manager
**Version:** 1.0

## Executive Summary
- **Overall Compliance:** 95% → 100% AA after fixes
- **Critical Violations:** 3 (all fixable)
- **Serious Violations:** 8 (all fixable)
- **Minor Violations:** 12

## Audit Results by WCAG Principle

### 1. Perceivable
- **1.1 Text Alternatives:** ✅ PASS
- **1.3 Adaptable:** ⚠️ 2 issues (sticky headers)
- **1.4 Distinguishable:** ❌ 3 issues (contrast)

### 2. Operable
- **2.1 Keyboard Accessible:** ⚠️ 1 issue (focus trap modal)
- **2.2 Enough Time:** ✅ PASS
- **2.3 Seizures:** ✅ PASS (no animations > 3/sec)
- **2.4 Navigable:** ⚠️ 2 issues (skip link missing)

### 3. Understandable
- **3.1 Readable:** ✅ PASS
- **3.2 Predictable:** ✅ PASS
- **3.3 Input Assistance:** ⚠️ 2 issues (error messages)

### 4. Robust
- **4.1 Compatible:** ⚠️ 2 issues (ARIA labels)

## Critical Issues (Fix ASAP)
1. [C-001] Formation Fiche: Contrast < 3:1 on focus ring
2. [C-002] Formulaire: Modal doesn't trap focus
3. [C-003] Tables: No column headers marked

## Serious Issues (Fix Soon)
1. [S-001] ...
2. [S-002] ...

## Minor Issues (Fix Eventually)
1. [M-001] ...

## Recommendations
1. Hire WCAG expert for ongoing compliance
2. Add accessibility into CI/CD (ESLint + Axe)
3. Train team on WCAG (4h workshop)

## Sign-Off
Auditor: John Doe
Date: 2026-09-15
Status: **PENDING FIXES → FULL COMPLIANCE**
```

---

## 🎯 Success Criteria

| Criteria | Requirement |
|----------|-------------|
| **WCAG Level** | 2.1 Level AA (minimum) |
| **Violations** | 0 critical, 0 serious |
| **Contrast** | All > 4.5:1 (normal) + 3:1 (large) |
| **Keyboard** | 100% navigable, no traps |
| **Screen Reader** | 95%+ readable (NVDA + VoiceOver) |
| **Lighthouse** | 95+ Accessibility score |
| **User Test** | 4/5 users complete tasks independently |

---

**Reference:** https://www.w3.org/WAI/test-evaluate/
