# AUDIT 11 — Plan de remédiation accessibilité (exécution autonome)
## OFMANAGER — suite de `audits/AUDIT-11-accessibilite.md`

**Base de travail :** `origin/main` = `5efd6b8` (contient déjà `feat/cpf-positionnement`).
**Mode :** exécution autonome par le chef de projet. L'utilisateur travaille en parallèle (audit EDOF) → **on ne le sollicite que pour l'incontournable** (voir §« Interventions requises »).

---

## Méthode

- **2 branches** (au lieu d'une par lot) pour minimiser les merges :
  1. `fix/a11y-signature-p0` — le seul 🔴 (touche à la signature = sensible juridiquement, revue à part).
  2. `fix/a11y-remediation` — tout le reste, en **commits séparés par lot** (revue commit par commit possible ; les 2 commits « à valider » = contrastes et déclaration = placés en fin, retirables).
- **Base** : les 2 branches partent de `origin/main`. Fichiers `globals.css` / layouts touchés uniquement dans `fix/a11y-remediation` (commits séquentiels) → **pas de conflit inter-branches**.
- **Vérification par commit** : `tsc --noEmit` + `npm run lint` (le score `jsx-a11y` doit rester à 0 violation) + `npm run test` (vitest) pour la logique pure. Le `next build` réel = Vercel au merge (pas lancé en local).
- **Principe** : correctifs **tenant-agnostiques** (multi-tenant) et **additifs** (jamais retirer une capacité existante). Lecture seule des données ; aucune migration de schéma requise (tout est du code).
- **Livraison** : `git push` étant bloqué en mode auto → **l'utilisateur pousse + merge** ; je fournis les commandes + liens `compare` en fin.

---

## Lots (mappés aux anomalies du rapport)

### Branche `fix/a11y-signature-p0`
| Lot | Anomalie | Contenu | Vérif | Drapeau |
|---|---|---|---|---|
| **0** | 🔴 A11-001 | Alternative **signature saisie** (clavier) additive dans `sign-box.tsx` + `ui/signature-pad.tsx` : bouton « Je ne peux pas dessiner → signer par saisie », rend le nom en signature sur le canvas (dataUrl inchangé côté serveur). Helper de validation pur + test. | tsc + vitest (helper) + revue clavier code | ⚑ **valider le libellé juridique** (eIDAS simple : nom + consentement + horodatage + IP — déjà collectés) |

### Branche `fix/a11y-remediation` (commits séquentiels)
| Lot | Anomalies | Contenu | Vérif | Drapeau |
|---|---|---|---|---|
| **docs** | — | Commit du rapport `AUDIT-11-accessibilite.md` + ce plan | — | — |
| **1 — Quick wins structure** | 🟠 A11-002, 🟠 A11-011, 🟡 A11-015, 🟡 A11-019, 🟡 A11-021, + /solutions header-in-main | `id="main-content"` sur layouts publics + console ; `lang="fr"` sur tous les gabarits PDF + e-mails ; `<main>` interne mes-cours → `<section>` ; garde `.animate-in` sous `prefers-reduced-motion` ; retirer/neutraliser le stub `wcag-audit.ts` ; sortir `SiteHeader/SiteFooter` du `<main>` sur les 5 pages `/solutions/*` | tsc + lint | — |
| **2 — Titres & repères** | 🟠 A11-003, 🟠 A11-004, 🟡 A11-012, 🟡 A11-014 | `CardTitle` → prop `as` (titre sémantique) + hiérarchie ; `title.template` par layout (app/console/portail) + `metadata` pages clés ; `aria-label` distincts + `id` uniques sur les `<nav>` ; `h1`/`h2` par sous-page portail | tsc + lint + ordre des titres | — |
| **3 — Formulaires** | 🟠 A11-007, 🟠 A11-008, 🟡 A11-016 | Composant central `FormField`/`FormMessage` (`aria-invalid` + `aria-describedby` + `role="alert"`) appliqué à login/inscription/candidat/session/contact ; `fieldset`/`legend` sur groupes radios/cases ; légende « champs * obligatoires » + `aria-required` + aide format reliée | tsc + lint | — |
| **4 — Restitution dynamique & clavier** | 🟠 A11-005, 🟠 A11-006, 🟡 A11-009, 🟡 A11-013 | Brancher `useFocusLock` (déjà écrit) sur les 5 modales maison, ou bascule `Dialog` ; palette Cmd+K → `role="dialog"` + pattern listbox + anneau focus ; alimenter `announce()` (filtres/chargement) ; `aria-sort` sur `<th>` triés | tsc + lint | — |
| **5 — Contrastes** | 🟠 A11-010, 🟡 A11-018, 🟡 A11-022 | Assombrir jetons `--warning/--success/--destructive` (≥4,5:1 sur tuiles `/10`) ; dériver `--primary-foreground` selon luminance (ou foncer primaire sombre) ; bannière essai ; pied d'e-mail ; graphique finance → `--chart-*` + barres foncées | tsc + lint + recalcul ratios | ⚑ **valider le léger changement visuel** (avant/après fourni) |
| **6 — Docs & déclaration** | 🟡 A11-017, 🟡 A11-018(th scope), 🟡 A11-020 | `th scope` sur tableaux de documents ; `lang`/tags sur certificat de signature ; page **/accessibilite** (déclaration partielle honnête) | tsc + lint | ⚑ **valider le contenu de la déclaration** (juridique) |

---

## Interventions requises (le strict minimum)

1. **Merge** — en fin de chantier, pousser + merger **2 branches** (commandes + liens fournis). C'est la seule action récurrente (push bloqué de mon côté).
2. **⚑ Signature (Lot 0)** — valider le libellé juridique de la signature saisie (je l'implémente d'abord, tu OK au merge).
3. **⚑ Contrastes (Lot 5)** — confirmer le changement visuel (avant/après fourni ; commit isolé, retirable).
4. **⚑ Déclaration (Lot 6)** — valider le contenu de la page `/accessibilite`.

Tout le reste (lots 1 à 4) = **zéro décision**, je livre directement.

## Hors code (rappel, non bloquant pour ce chantier)
- Audit RGAA **externe** (grille 106 critères + déclaration officielle) = prérequis vente secteur public.
- Passe **axe sur écrans authentifiés** (`e2e/a11y.spec.ts`) = nécessite une base de test locale (comme la campagne audit 10).

---

## Ordre d'exécution
Lot 0 (signature) → docs → Lot 1 → Lot 2 → Lot 3 → Lot 4 → Lot 5 → Lot 6. Chaque lot fini (commit vert) avant le suivant.
