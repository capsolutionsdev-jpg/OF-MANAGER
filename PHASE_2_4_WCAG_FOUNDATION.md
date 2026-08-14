# Phase 2.4 — WCAG 2.1 AA Compliance Foundation

**Status :** 🚀 IN PROGRESS
**Effort :** 20-25h
**Depends On :** Lot 2.1 (design tokens), 2.2 (components), 2.3 (navigation)

---

## 📋 Overview

Établir la base d'accessibilité WCAG 2.1 AA (conformité 100%) pour tout le projet.

### WCAG 2.1 Level AA — Les 4 Piliers

| Pilier | Critique | État Actuel | Target |
|--------|----------|-------------|--------|
| **Perceptible** | Contenu doit être perçu | ~70% | 100% |
| **Utilisable** | Interface doit être utilisable au clavier | ~60% | 100% |
| **Compréhensible** | Contenu doit être clair | ~75% | 100% |
| **Robuste** | Compatible assistive tech | ~50% | 100% |

---

## 🎯 Implementation Checklist

### 1️⃣ PERCEPTIBLE — Content Must Be Perceived

#### 1.1 Text Alternatives (WCAG 1.1.1)
```typescript
// ❌ Bad
<img src="/icon.png" />

// ✅ Good
<img src="/icon.png" alt="Profile photo of John Doe" />

// For decorative images:
<img src="/divider.svg" alt="" aria-hidden="true" />

// Icon-only buttons:
<button aria-label="Close dialog">✕</button>
```

**Checklist :**
- [ ] Tous les `<img>` ont un `alt` text descriptif
- [ ] Icônes seules ont `aria-label`
- [ ] Images décoratives ont `alt=""` + `aria-hidden="true"`
- [ ] SVG complexes ont `<title>` ou `aria-label`

#### 1.4 Color & Contrast (WCAG 1.4.3 / 1.4.11)
```css
/* Color contrast minimum: 4.5:1 pour texte normal, 3:1 pour texte large (18pt+) */
.text-normal {
  color: #333;        /* contre #fff = 12.6:1 ✅ */
  background: #fff;
}

.text-large {
  font-size: 18px;
  color: #666;        /* contre #fff = 3.5:1 ✅ */
  background: #fff;
}

/* Icons/graphics: 3:1 minimum */
.icon {
  color: #0D1B3E;     /* Brand navy, high contrast ✅ */
}
```

**Checklist :**
- [ ] Tous textes > 4.5:1 contraste (WebAIM checker)
- [ ] Texte > 18pt > 3:1 contraste
- [ ] Icons/graphics > 3:1 contraste
- [ ] Border/outline color > 3:1
- [ ] Focus indicator > 3:1 (ring color)

---

### 2️⃣ UTILISABLE — Interface Must Be Usable

#### 2.1 Keyboard Navigation (WCAG 2.1.1)
```typescript
// 1. All interactive elements accessible by keyboard
<button tabIndex={0} onKeyDown={handleKeyDown}>
  Click me
</button>

// 2. Tab order logical (source order follows visual order)
<form>
  {/* Left column first */}
  <label>
    Email
    <input type="email" />
  </label>
  
  {/* Then right column */}
  <label>
    Name
    <input type="text" />
  </label>
  
  {/* Then submit */}
  <button type="submit">Send</button>
</form>

// 3. Focus trap for modals (prevent tab out)
function FocusLockDialog({ onClose }) {
  const firstRef = useRef(null)
  const lastRef = useRef(null)
  
  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      if (e.shiftKey && document.activeElement === firstRef.current) {
        e.preventDefault()
        lastRef.current?.focus()
      } else if (!e.shiftKey && document.activeElement === lastRef.current) {
        e.preventDefault()
        firstRef.current?.focus()
      }
    }
  }
  
  return (
    <div role="dialog" aria-modal="true" onKeyDown={handleKeyDown}>
      <button ref={firstRef} onClick={onClose}>Close</button>
      <content>Dialog content</content>
      <button ref={lastRef} onClick={onClose}>Submit</button>
    </div>
  )
}
```

**Checklist :**
- [ ] Tous les boutons/inputs focusables (`tabIndex >= 0`)
- [ ] Ordre tab logique (suit la structure DOM/visuelle)
- [ ] Focus visible toujours (jamais `outline: none` sans alternative)
- [ ] Modals ont focus trap (Tab ne peut pas sortir)
- [ ] Menubar (Esc, Arrow keys) implémenté
- [ ] Aucun element "trapped" au clavier

#### 2.4 Focus Visible (WCAG 2.4.7)
```css
/* Default focus style (MUST be visible) */
:focus-visible {
  outline: 2px solid #1A5FD4;
  outline-offset: 2px;
  border-radius: 4px;
}

/* Remove only if replace with alternative */
button:focus {
  outline: none;
  box-shadow: 0 0 0 2px #fff, 0 0 0 4px #1A5FD4;  /* Alt focus */
}

/* NOT allowed - invisible focus */
:focus {
  outline: none;  /* ❌ WCAG violation */
}
```

**Checklist :**
- [ ] `:focus-visible` défini globalement
- [ ] Focus indicator > 3:1 contraste
- [ ] Focus indicator 2px minimum
- [ ] Aucune suppression sans alternative

---

### 3️⃣ COMPRÉHENSIBLE — Content Must Be Clear

#### 3.1 Language (WCAG 3.1.1)
```html
<!-- Page principal language -->
<html lang="fr">
...
</html>

<!-- Changementsde langue -->
<p>
  Welcome to our <span lang="en">English-only feature</span>.
</p>
```

**Checklist :**
- [ ] `<html lang="fr">` déclaré
- [ ] Changementes de langue marqués (`lang` attribute)
- [ ] Pas de contenu "mal" orthographié volontairement

#### 3.2 Predictable (WCAG 3.2.1-4)
```typescript
// ❌ Bad: Surprising context changes
<select onChange={(e) => navigate(e.target.value)}>
  <option>Choose action</option>
  <option value="/delete">Delete</option>
</select>

// ✅ Good: Button for action + confirmation dialog
<button onClick={() => setShowDeleteDialog(true)}>
  Delete Item
</button>
{showDeleteDialog && (
  <AlertDialog>
    <p>Are you sure?</p>
    <button onClick={handleDelete}>Confirm Delete</button>
  </AlertDialog>
)}
```

**Checklist :**
- [ ] Pas de changement de contexte au focus
- [ ] Pas de submission automatique au change
- [ ] Navigation cohérente (menu placement, order)
- [ ] Labels explicites (pas de "Click here")

#### 3.3 Error Handling (WCAG 3.3.1-4)
```typescript
// 1. Error identification
<div role="alert" aria-live="polite">
  {errors.email && <span>Email is required</span>}
</div>

// 2. Error suggestion
<input
  type="email"
  aria-invalid={!!errors.email}
  aria-describedby="email-error"
/>
<div id="email-error">
  {errors.email && (
    <>
      {errors.email}
      <a href="#">Check email format example</a>
    </>
  )}
</div>

// 3. Form confirmation (reversible)
{!submitted ? (
  <button type="submit">Send</button>
) : (
  <div role="status">
    <p>Form submitted!</p>
    <button onClick={() => setSubmitted(false)}>Undo</button>
  </div>
)}
```

**Checklist :**
- [ ] Erreurs identifiées & décrites (aria-invalid)
- [ ] Messages d'erreur associés (aria-describedby)
- [ ] Suggestions de correction fournies
- [ ] Actions critiques reversibles (undo)

---

### 4️⃣ ROBUSTE — Compatible Assistive Technology

#### 4.1 Name, Role, State (WCAG 4.1.2 / 4.1.3)
```typescript
// Bad - Missing semantics
<div onClick={toggleMenu}>Menu</div>

// Good - Semantic HTML
<button aria-expanded={isOpen} aria-controls="menu-items">
  Menu
</button>
<ul id="menu-items">
  <li><a href="/home">Home</a></li>
  <li><a href="/about">About</a></li>
</ul>

// Custom component - Must include ARIA
<CustomSelect
  role="listbox"
  aria-label="Formation category"
  aria-expanded={isOpen}
  aria-controls="listbox-items"
>
  {items.map((item) => (
    <CustomOption
      key={item.id}
      role="option"
      aria-selected={item.id === selectedId}
    >
      {item.label}
    </CustomOption>
  ))}
</CustomSelect>
```

**Checklist :**
- [ ] Utiliser semantic HTML (`<button>`, `<nav>`, `<main>`, `<article>`)
- [ ] Custom components = ARIA roles (button, option, menuitem, etc.)
- [ ] States communiqués (aria-expanded, aria-checked, aria-selected)
- [ ] Relationships clairs (aria-labelledby, aria-describedby)
- [ ] ARIA patterns suivis (https://www.w3.org/WAI/ARIA/apg/)

#### 4.1.3 Status Messages (WCAG 4.1.3)
```typescript
// Live regions for dynamic content
<div aria-live="polite" aria-atomic="true">
  {loadingMessage}
</div>

<div role="status" aria-live="polite">
  Form submitted successfully. Redirecting...
</div>

<div role="alert" aria-live="assertive">
  Critical error: {errorMessage}
</div>
```

**Live Region Types :**
| Type | Usage | Auto-announce |
|------|-------|---------------|
| `role="status"` | Success, info | ✅ Yes (polite) |
| `role="alert"` | Errors, warnings | ✅ Yes (assertive) |
| `aria-live="polite"` | Updates users should know | ✅ Yes |
| `aria-live="assertive"` | Urgent alerts | ✅ Yes (interrupts) |

---

## 📊 Testing Strategy

### Automated Testing
```bash
# ESLint + accessibility plugin
npm install --save-dev eslint-plugin-jsx-a11y

# In .eslintrc.json:
{
  "plugins": ["jsx-a11y"],
  "extends": ["plugin:jsx-a11y/recommended"]
}

# Run linting
npm run lint
```

### Browser Testing
```bash
# Axe DevTools (Chrome extension)
# 1. Install Axe DevTools
# 2. Run audit on each page
# 3. Fix violations (target 0 violations)

# WAVE (WebAIM)
# 1. Install WAVE extension
# 2. Check for errors/warnings

# Screen Reader Testing
# Windows: NVDA (free) + Chrome
# macOS: VoiceOver (built-in) + Safari
# Linux: Orca + Firefox
```

### Manual Testing
```typescript
// Keyboard only (no mouse)
1. Open dev tools (F12)
2. Disable mouse (physical or software)
3. Test TAB navigation
4. Test Arrow keys (menus, tables, sliders)
5. Test Enter/Space (buttons, checkboxes)
6. Test Escape (modals, menus)

// Screen reader test (5 min per page)
1. Start NVDA / VoiceOver
2. Navigate page with reader
3. Verify all content is announced
4. Verify buttons/links have proper labels
5. Verify form fields have labels
6. Verify errors are announced
```

### Checklist Finale
```markdown
## Phase 2.4 — Checklist de Livraison

### Global
- [ ] HTML lang attribute (lang="fr")
- [ ] All images have alt text
- [ ] Color contrast > 4.5:1 (all text)
- [ ] Focus visible (2px outline, no outline: none)
- [ ] No keyboard traps
- [ ] No automatic context changes

### Forms
- [ ] All inputs have labels (or aria-label)
- [ ] Error messages in aria-live region
- [ ] Error messages linked (aria-describedby)
- [ ] Form can be submitted with keyboard

### Navigation
- [ ] Logical tab order (source order = visual order)
- [ ] Skip link to main content
- [ ] Menu keyboard navigation (Arrow keys)
- [ ] Breadcrumbs present

### Modals & Dialogs
- [ ] Focus moves to modal on open
- [ ] Focus trap (Tab doesn't escape)
- [ ] Escape key closes modal
- [ ] Focus returns to trigger on close
- [ ] aria-modal="true" + role="dialog"

### Tables
- [ ] `<thead>` / `<tbody>` / `<tfoot>` present
- [ ] `<th>` with scope="col" / "row"
- [ ] No semantic markup for layout (no `<table>` for layout)

### Lists
- [ ] `<ul>` / `<ol>` for lists (not `<div>`)
- [ ] Proper nesting (no gaps in hierarchy)

### Screening Reader Compatibility
- [ ] Tested with NVDA (Windows) + VoiceOver (Mac)
- [ ] All buttons/links have names
- [ ] All form fields have labels
- [ ] All icons have aria-label or alt
- [ ] Dynamic content in aria-live regions

### Lighthouse Audit
- [ ] Accessibility score > 95/100
- [ ] No "Elements with missing 'alt' attribute"
- [ ] No "Buttons do not have an accessible name"
- [ ] No "Form elements do not have associated labels"

### Axe DevTools
- [ ] 0 critical violations
- [ ] < 5 serious violations (prioritized for fixes)
```

---

## 🚀 Next Steps

1. **Implement Phase 2.4** — Add ARIA basics + semantic HTML
2. **Run automated testing** — ESLint + Axe DevTools
3. **Manual testing** — Keyboard nav + screen reader (NVDA/VoiceOver)
4. **Fix violations** — P0 → P3 priority
5. **Retest** — Verify all fixes
6. **Move to Phase 3.1** — Form pagination

---

**WCAG 2.1 AA = 100% Conformity Target**

Reference: https://www.w3.org/WAI/WCAG21/quickref/
