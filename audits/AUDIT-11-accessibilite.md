# COMPTE RENDU D'AUDIT 11 — Audit accessibilité
## OFMANAGER — Programme d'audit de pré-commercialisation

**Date :** 2026-09-11
**Version auditée :** branche `feat/cpf-positionnement` — commit `0b3ea3f`
**Chef de projet audit :** Claude Code (chef de projet senior)
**Équipe mobilisée :** Expert normatif RGAA/WCAG · Développeur front a11y (clavier/focus) · Développeur front a11y (formulaires) · Expert perception (couleur/contraste/média) · Spécialiste contenus + analyste conformité — 5 sous-agents parallèles, pilotés et contre-vérifiés par le chef de projet.
**Périmètre couvert :** échantillon représentatif d'écrans (login, landing, catalogue/listes, formulaire complexe, détail de session, portail entreprise, console) + composants du kit UI + documents PDF générés + e-mails HTML. Conformité **normative** RGAA/WCAG 2.1 AA (l'ergonomie relève de l'audit 10).
**Durée / profondeur :** Phase 0 cadrage (inventaire complet du dépôt : 199 pages, 264 composants, 24 primitives UI) ; analyse code des chemins clés ; outil automatisé n°1 = `npm run lint` (`jsx-a11y`) ; outil automatisé n°2 + tests manuels = sondes DOM + axe tenté sur 4 pages publiques du site **live** (`ofmanager.info`) avec valeurs de contraste réellement rendues ; contre-vérification personnelle des constats 🔴/🟠.

---

### 1. SYNTHÈSE EXÉCUTIVE

OFMANAGER part avec de **vraies fondations d'accessibilité**, rares pour un produit solo : `html lang="fr"`, focus clavier visible et tokenisé, zoom non bloqué, `prefers-reduced-motion` largement respecté, primitives interactives solides (`@base-ui/react` gère piège de focus/Échap/rôles), texte courant très contrasté, PDF **balisés** par défaut, et une **prise en charge du handicap métier complète et différenciante** (référent Qualiopi ind. 26, `situationHandicap`, `besoinsAdaptation`). La note interne `docs/RGAA.md` est honnête et sans sur-promesse. **Mais** les défauts réels sont systémiques : un **bloquant** — la signature manuscrite (canvas *pointer-only*, tracé obligatoire) rend l'e-signature **impossible au clavier / lecteur d'écran** sur des parcours critiques ; puis, en majeur, une hiérarchie de titres aplatie (`CardTitle` = `<div>`), des titres d'onglet non uniques dans tout le back-office, des contrastes non conformes sur des éléments d'interface (bouton primaire en sombre 3,08:1, badges de statut, bannière d'essai), des erreurs de formulaire ni reliées ni annoncées, des régions live jamais alimentées, et un lien d'évitement cassé hors back-office. L'automatique (`jsx-a11y`) ne remonte **aucune** de ces anomalies : la démonstration que le manuel est indispensable.

| 🔴 Rouge | 🟠 Orange | 🟡 Jaune | 🟢 Vert |
|---|---|---|---|
| 1 | 10 | 11 | 14 |

**Taux de conformité (échantillon) : ≈ 33 %** — 6 critères AA conformes sur 18 évalués strictement (méthode en §8). Ce n'est **pas** le taux RGAA officiel (grille 106 critères + déclaration), qui exige l'audit externe déjà recommandé par `docs/RGAA.md`.

**VERDICT : GO CONDITIONNEL**
Le socle est sain et le produit est utilisable ; il n'y a pas de refonte à faire. Conditions : **(C1)** corriger le 🔴 signature **avant Go-Live** (mitigation déjà à portée : nom + case + IP + horodatage sont *déjà collectés*) ; **(C2)** traiter le lot 🟠 (contrastes, titres, erreurs de formulaire, régions live, skip link, modales) **avant les premiers clients payants (J+30)**.

---

### 2. TABLEAU DES ANOMALIES

| ID | Gravité | Titre | Composant | Preuve | Impact | Recommandation | Charge | Priorité |
|---|---|---|---|---|---|---|---|---|
| A11-001 | 🔴 | Signature manuscrite inaccessible au clavier (tracé obligatoire, aucune alternative) | Parcours signature | `parcours/sign-box.tsx:81,116-126` ; `ui/signature-pad.tsx:80-90` | Candidat/formateur au clavier ou lecteur d'écran ne peut PAS signer conventions/contrats/émargements | Autoriser signature saisie (nom+case+IP+horodatage déjà collectés) ou bascule YouSign | S/M | P0 |
| A11-002 | 🟠 | Lien d'évitement cassé (cible `#main-content` absente hors `(app)`/portail) | `components/skip-links.tsx` | `skip-links.tsx:13` ; ancre présente seulement `(app)/layout.tsx:279`, `(portail-entreprise)/…/layout.tsx:88` ; runtime `skipOk:false` sur /login,/,/inscription,/mentions-legales | Clavier : « Aller au contenu » ne mène nulle part sur vitrine + console + parcours token | Ajouter `id="main-content"` au `<main>` des layouts publics + console | S | P1 |
| A11-003 | 🟠 | Hiérarchie de titres aplatie — `CardTitle` rend un `<div>` | `components/ui/card.tsx:36` | `<div data-slot="card-title">` ; sections dashboard/session = titres non-sémantiques | Navigation par titres (touche H) inopérante sur 60+ pages | Rendre `CardTitle` en `<h2>/<h3>` (prop `as`) + hiérarchiser | M | P1 |
| A11-004 | 🟠 | Titre d'onglet non unique dans tout le back-office / console / portail | `(app)/layout.tsx`, `console/layout.tsx` | Titre global `layout.tsx:50` ; layout `(app)` ne renvoie que l'icône (`:48-51`) ; 8 fichiers seulement exportent `metadata` | Onglets/favoris/historique indistinguables ; désorientation AT | `metadata` par page ou `title.template` par layout | M | P1 |
| A11-005 | 🟠 | Modales « maison » sans gestion du focus (×5) — `useFocusLock` non branché | `command-palette.tsx`, `native/pdf-viewer-modal.tsx`, imports catalogue, scan | `command-palette.tsx:104-110` ; `pdf-viewer-modal.tsx:91` ; `import-catalogue-button.tsx:48` ; hook `lib/hooks/use-focus-lock.ts` sans importateur | Focus fuit derrière l'overlay, pas d'Échap, focus non restitué | Utiliser `Dialog`/`Sheet` du kit, ou brancher `useFocusLock` existant | M | P1 |
| A11-006 | 🟠 | Palette de commandes (Cmd+K) non restituée aux lecteurs d'écran | `components/command-palette.tsx` | `:110` conteneur sans `role=dialog/aria-modal` ; `:137-142` `<li>` sans `role=option`/`aria-selected`, liste sans `listbox` ; input `outline-none` | Combobox global inutilisable au lecteur d'écran ; focus non visible sur le champ | `role=dialog aria-modal` + pattern listbox + anneau focus | M | P1 |
| A11-007 | 🟠 | Erreurs de formulaire ni reliées au champ ni annoncées (`aria-invalid`/`aria-describedby`/`role=alert` absents) | 6+ formulaires + login | `public-inscription-form.tsx:22`, `candidats/candidat-form.tsx:35`, `session-form.tsx:38`, `login/login-form.tsx:65` ; kit prêt `ui/input.tsx:12` mais attribut jamais posé | Utilisateur AT ne perçoit ni l'état d'erreur ni le message (validation zod) | `FormField`/`FormMessage` central : `aria-invalid` + `aria-describedby` + `role=alert` | M | P1 |
| A11-008 | 🟠 | Groupes de champs (radios/cases) sans `fieldset`/`legend` | Formulaires candidat/inscription/session | `candidat-form.tsx:213` (Genre), `public-inscription-form.tsx:169`, `session-form.tsx:341,387` ; `<Label>` sans `htmlFor` | La question du groupe (« Genre », « Financement ») n'est pas restituée | Envelopper en `<fieldset><legend>` (motif déjà correct dans `demo-form.tsx:62`) | S/M | P1 |
| A11-009 | 🟠 | Régions live jamais alimentées — `announce()` jamais appelé | `components/aria-live-region.tsx` | `useAriaLive`/`announce(` = 6 occ., toutes dans la définition ; 0 appelant dans `src/` | Changements dynamiques (filtres, recherche, chargement, validations) non annoncés | Appeler `announce()` aux transitions clés (toasts déjà couverts par sonner) | M | P1 |
| A11-010 | 🟠 | Contrastes AA non atteints sur éléments d'interface sémantiques | tokens + badge/bannière | Bouton primaire sombre `#6f8bff`/blanc = **3,08:1** (`globals.css:189`, confirmé runtime login) ; badges warning 2,45 / success 3,02 / destructive 3,44 (`badge.tsx:17-20`) ; bannière essai `(app)/layout.tsx:257` = 2,30 ; 3/10 palettes tenant `themes.ts` (émeraude/turquoise/orange) 3,5-3,8 | Texte/CTA illisibles pour malvoyants et en forte luminosité | Assombrir jetons de statut ; dériver `--primary-foreground` selon luminance ; foncer primaire sombre | M | P1 |
| A11-011 | 🟠 | Documents PDF & e-mails cœur stagiaire sans attribut `lang` | `lib/documents/build-pdf.ts`, `lib/email-templates.ts` | `build-pdf.ts:185,298,394,456` (`<html>` sans lang) ; `email-templates.ts:107` ; générateurs récents (diplômes/factures) posent `lang` → incohérence | Synthèse vocale : mauvaise prononciation sur convocations/attestations/conventions | Ajouter `lang="fr"` (aligner sur les générateurs récents) | S | P1 |
| A11-012 | 🟡 | Repères `<nav>` non étiquetés / étiquettes + `id` dupliqués | `site-header.tsx`, `console-rail.tsx`, sidebar | `site-header.tsx:26,50` ; `console-rail.tsx:89` ; « Navigation principale » + `id="main-nav"` dupliqués (rail + tiroir mobile) | Navigation par landmarks ambiguë (2 nav de même nom en mobile) | `aria-label` distinct par `nav` + `id` unique | S | P2 |
| A11-013 | 🟡 | État de tri non exposé (`aria-sort` absent partout) | `crm/crm-table.tsx`, `sessions-table.tsx` | tri = vrai `<button>` (clavier OK) mais `aria-sort` = 0 occurrence dans `src` | Lecteur d'écran n'annonce pas la colonne/le sens de tri | `aria-sort` sur le `<th>` trié | S | P2 |
| A11-014 | 🟡 | Portail entreprise : pas de `h1` par sous-page | `(portail-entreprise)/espace-entreprise` | `layout.tsx:83` seul `h1` (= raison sociale) ; 0 `h1` dans les sous-pages | Factures/Inscriptions/Convention sans titre décrivant l'écran | `h1`/`h2` de rubrique par page | S | P2 |
| A11-015 | 🟡 | Double repère `<main>` imbriqué | `(app)/mes-cours/[coursId]/page.tsx:197` | `<main>` interne dans le `<main id="main-content">` du layout | Deux landmarks `main` + cible de skip ambiguë | Remplacer le `<main>` interne par `<section>` | S | P2 |
| A11-016 | 🟡 | Obligatoires/format : `*` non expliqué, pas d'`aria-required`, format seulement en placeholder | Formulaires candidat/inscription/login | `candidat-form.tsx:203` ; `login-form.tsx:20-41` (aucune marque textuelle) ; formats en placeholder `public-inscription-form.tsx:251` | Sens du `*` supposé ; aide au format perdue à la saisie | Légende « champs marqués * obligatoires » + `aria-required` + aide reliée | S/M | P2 |
| A11-017 | 🟡 | Certificat de signature (pdf-lib) non balisé + sans `/Lang` | `lib/documents/certificat-signature.ts:22-141` | génération `drawText` sans structure ni MarkInfo | Lecteur d'écran sur la pièce de preuve jointe à chaque dossier | Produire via pipeline HTML→PDF taggé, ou tagguer en pdf-lib | M | P2 |
| A11-018 | 🟡 | Tableaux de documents sans `th scope` + pied d'e-mail sous-contrasté | `lib/documents/templates.ts`, `email-templates.ts:119` | `templates.ts:69-81,501-514` (libellés en `<td>`) ; pied e-mail `#9aa7c2` sur `#f5f8fd` = 2,3:1 | Associations d'en-têtes faibles dans le PDF taggé ; mention RGPD peu lisible | `<th scope="row/col">` + assombrir le pied (~4,6:1) | S | P2 |
| A11-019 | 🟡 | Animations d'entrée hors couverture `prefers-reduced-motion` | `dialog.tsx`, `dropdown-menu.tsx`, `select.tsx` | classes `.animate-in` (tw-animate-css, 0 garde reduced-motion) ; `@media` de `globals.css` ne cible que les classes maison | Modales/menus s'animent en mode « mouvement réduit » | `.animate-in,.animate-out{animation:none!important}` sous le `@media` | S | P2 |
| A11-020 | 🟡 | Déclaration d'accessibilité absente | Site public | Aucune route `/accessibilite` ; `docs/RGAA.md:27-29` renvoie à un audit externe | Non due légalement (voir §3) mais attendue pour la vente au secteur public | Publier une déclaration (même partielle) après audit externe | S | P2 |
| A11-021 | 🟡 | Helper `wcag-audit.ts` trompeur (renvoie `score:100/passed:true` en dur) | `lib/testing/wcag-audit.ts:26-37` | `runWCAGAudit()` renvoie toujours `{violations:[],score:100,passed:true}` — 0 appelant (non branché) | Risque de fausse confiance si un jour branché à un tableau de conformité | Supprimer, ou brancher un vrai axe (`@axe-core/playwright` présent) | S | P3 |
| A11-022 | 🟡 | Graphique finance : couleurs figées, non tokenisées (mode sombre + 1.4.11) | `components/finance/finance-recap.tsx:50-83` | barres `#10b981`/`#f43f5e` codées en dur ; barre verte 2,54:1 < 3:1. Atténué : `role=img`+`aria-label`+légende+tableau (1.4.1 OK) | Objet graphique sous-contrasté ; ignore le thème sombre | Passer sur `--chart-*` (variante sombre existante) ; foncer les barres | S/M | P2 |

---

### 3. FICHES DÉTAILLÉES (🔴 et 🟠)

#### A11-001 — Signature manuscrite inaccessible au clavier — 🔴
- **Constat :** la signature électronique repose sur un `<canvas>` piloté uniquement par *pointer events*, et le tracé est **obligatoire** pour valider. Aucun mécanisme clavier ni alternative.
- **Preuve :** `src/components/parcours/sign-box.tsx:116-126` (`onPointerDown/Move/Up/Leave` seuls, aucun handler clavier) et `:81-84` `if (!hasDrawn) { toast.error("Merci de dessiner votre signature dans le cadre."); return; }`. Même schéma dans `src/components/ui/signature-pad.tsx:80-90` (utilisé par `inscriptions/signer-sur-place-dialog.tsx`). Parcours publics concernés : `src/app/signer/[token]`, `src/app/parcours/[token]`, `src/app/contrat-formateur/[token]`.
- **Scénario d'impact :** un candidat ou formateur naviguant au clavier seul, malvoyant (lecteur d'écran) ou à motricité réduite ne peut pas produire le tracé exigé → il ne peut **pas signer** sa convention / son contrat / son émargement. Le champ « nom complet » et la case d'acceptation sont accessibles, mais ne suffisent pas : le code exige `hasDrawn`. Ironie : le produit gère par ailleurs très bien le référent handicap (Qualiopi ind. 26) mais exclut ces mêmes publics de l'acte de signature.
- **Cause racine :** dessin canvas traité comme la preuve de signature, sans voie alternative eIDAS « simple ».
- **Recommandation :** autoriser une signature **saisie** (nom + case d'acceptation + horodatage + IP — **déjà collectés** dans `sign-box.tsx`) lorsque le tracé n'est pas possible (bouton « je ne peux pas dessiner »), ou basculer ces parcours vers YouSign (à condition de l'activer — actuellement `YOUSIGN_IMPLEMENTED=false`). Une signature simple typée + consentement + horodatage est juridiquement recevable au niveau eIDAS « simple ».
- **Charge :** S/M — **Priorité :** P0 — **Type :** Quick win
- **Vérification de la correction :** parcourir `/signer/[token]` au clavier seul (Tab uniquement), remplir nom + case, activer « Signer » sans souris → la signature aboutit ; contrôle axe/lecteur d'écran sur le formulaire.

#### A11-002 — Lien d'évitement cassé hors back-office — 🟠
- **Constat :** le `<SkipLinks>` est rendu globalement et pointe vers `#main-content`, ancre qui n'existe que dans deux layouts.
- **Preuve :** `src/components/skip-links.tsx:13` (`href="#main-content"`) rendu dans `src/app/layout.tsx:112`. Ancre présente seulement `src/app/(app)/layout.tsx:279` et `src/app/(portail-entreprise)/espace-entreprise/layout.tsx:88`. `src/app/console/layout.tsx:39` = `<main>` sans id ; ~37 pages publiques ont leur `<main>` sans id. **Confirmé au runtime** : `skipOk:false` sur `/login`, `/`, `/inscription`, `/mentions-legales`.
- **Scénario d'impact :** sur toute la vitrine (dont la landing qui a une vraie barre de navigation), la console et les parcours par token, l'utilisateur clavier voit « Aller au contenu principal » mais l'activation ne fait rien — pire qu'absent (dispositif trompeur).
- **Cause racine :** id de cible documenté « à ajouter » mais jamais posé sur les layouts publics/console.
- **Recommandation :** ajouter `id="main-content"` au `<main>` de chaque layout public + console (correctif trivial et centralisable).
- **Charge :** S — **Priorité :** P1 — **Type :** Quick win
- **Vérification :** Tab en haut de `/` → activer le lien → le focus atterrit sur le contenu principal ; `document.getElementById('main-content')` non nul.

#### A11-003 — Hiérarchie de titres aplatie (`CardTitle` = `<div>`) — 🟠
- **Constat :** le composant central `CardTitle` rend un `<div>`, pas un titre ; les intitulés de sections ne sont donc pas dans l'arbre des titres.
- **Preuve :** `src/components/ui/card.tsx:36-47` (`<div data-slot="card-title">`). Ex. tableau de bord `dashboard/page.tsx:275,320,355,461` ; fiche session `sessions/[id]/page.tsx:107,144`. Combiné au `h1` de `PageHeader` (60 fichiers), la plupart des pages n'ont **qu'un `h1`** sans `h2/h3`.
- **Scénario d'impact :** un utilisateur de lecteur d'écran qui navigue par titres (touche H) ne trouve aucune sous-structure sur la majorité du back-office ; repérage laborieux sur des écrans denses.
- **Cause racine :** primitive de carte non sémantique, répétée partout.
- **Recommandation :** rendre `CardTitle` configurable (`as="h2"|"h3"`) et hiérarchiser sous le `h1` de page.
- **Charge :** M — **Priorité :** P1 — **Type :** Chantier léger (1 composant, impact global)
- **Vérification :** arbre des titres d'un écran type (dashboard) = h1 → h2/h3 cohérents (axe « page-has-heading-order »).

#### A11-004 — Titre d'onglet non unique (back-office/console/portail) — 🟠
- **Constat :** toutes les pages authentifiées partagent le titre d'onglet global.
- **Preuve :** titre global `src/app/layout.tsx:50` ; `generateMetadata` de `(app)/layout.tsx:48-51` ne renvoie que l'icône ; seuls 8 fichiers de `(app)` exportent `metadata` ; layouts console/portail : aucun.
- **Scénario d'impact :** onglets multiples, favoris et historique indistinguables ; un lecteur d'écran annonce le même titre de page partout → perte de repère.
- **Cause racine :** absence de `title.template` par section.
- **Recommandation :** `metadata` par page clé, ou `title: { template: "%s — OFManager" }` dans les layouts `(app)`/console/portail.
- **Charge :** M — **Priorité :** P1 — **Type :** Standard
- **Vérification :** l'onglet change entre /candidats, /sessions, /devis (WCAG 2.4.2).

#### A11-005 — Modales « maison » sans gestion du focus (×5) — 🟠
- **Constat :** cinq modales contournent les primitives base-ui : pas de déplacement du focus à l'ouverture, pas de piège, pas de restitution, pas de fermeture par Échap.
- **Preuve :** `src/components/command-palette.tsx:104-110`, `src/components/native/pdf-viewer-modal.tsx:91`, `src/components/formations/import-catalogue-button.tsx:48-49`, `import-catalogue-officiel-button.tsx:47`, `src/components/scan/scan-docs-button.tsx:54-55`. Le hook prévu `src/lib/hooks/use-focus-lock.ts` **n'est importé nulle part** (grep confirmé).
- **Scénario d'impact :** utilisateur clavier/lecteur d'écran perdu derrière la modale, incapable de revenir ou de fermer au clavier (visionneuse PDF, imports, scan de documents).
- **Cause racine :** overlays `div` codés à la main au lieu du `Dialog`/`Sheet` du kit ; hook de focus lock écrit mais jamais branché.
- **Recommandation :** remplacer ces overlays par `Dialog`/`Sheet` (base-ui gère tout), ou brancher `useFocusLock` (déjà écrit → correctif rapide).
- **Charge :** M — **Priorité :** P1 — **Type :** Standard (quick win pour pdf-viewer via `useFocusLock`)
- **Vérification :** ouvrir chaque modale au clavier → focus entre, Tab tourne en boucle, Échap ferme, focus revient au déclencheur (WCAG 2.4.3).

#### A11-006 — Palette de commandes non restituée — 🟠
- **Constat :** Cmd+K ouvre un conteneur non annoncé comme dialogue, avec une liste non sémantique.
- **Preuve :** `src/components/command-palette.tsx:110` (pas de `role="dialog"`/`aria-modal`) ; `:137-142` (`<li onClick>` sans `role="option"`/`aria-selected`, liste sans `role="listbox"`/`aria-activedescendant`) ; `:125` input `outline-none` sans anneau de remplacement. La navigation flèches existe (`:66-87`) mais pour le voyant seulement.
- **Scénario d'impact :** un utilisateur de lecteur d'écran ne perçoit ni le rôle dialogue, ni l'option active, ni la sélection → raccourci global inutilisable. Atténuation : la navigation visible reste disponible (pas un blocage total).
- **Cause racine :** combobox custom sans le motif ARIA listbox.
- **Recommandation :** `role="dialog" aria-modal` + `aria-label` ; pattern listbox complet ; anneau `focus-visible` sur l'input.
- **Charge :** M — **Priorité :** P1 — **Type :** Standard
- **Vérification :** au lecteur d'écran, ouverture annoncée « dialogue », options annoncées avec l'état sélectionné.

#### A11-007 — Erreurs de formulaire ni reliées ni annoncées — 🟠
- **Constat :** les erreurs de validation sont rendues par un `ErrorText` local dupliqué, sans `role="alert"`, sans `aria-describedby`, et `aria-invalid` n'est jamais posé sur les champs.
- **Preuve :** motif identique dans `public-inscription-form.tsx:22`, `candidats/candidat-form.tsx:35`, `sessions/session-form.tsx:38`, `formations/formation-form.tsx:34`, `formateurs/formateur-form.tsx:28`, `blog/article-form.tsx:31` ; erreur de login non annoncée `login/login-form.tsx:65`. Le kit est prêt (`ui/input.tsx:12` porte les styles `aria-invalid:*`) mais l'attribut n'est jamais transmis (0 occurrence applicative).
- **Scénario d'impact :** un utilisateur de lecteur d'écran soumet un formulaire (inscription, candidat, connexion), la validation zod échoue → **ni l'état d'erreur du champ ni le texte** ne lui sont restitués ; en prime, la bordure rouge du kit ne s'active pas (elle attend `aria-invalid`).
- **Cause racine :** kit UI non centralisateur — pas de `FormField`/`FormMessage` ; chaque formulaire recâble à la main.
- **Recommandation :** introduire un `FormField` (façon shadcn) générant l'`id` du message, posant `aria-invalid` + `aria-describedby` sur le champ et `role="alert"` sur le message ; l'appliquer aux formulaires.
- **Charge :** M — **Priorité :** P1 — **Type :** Chantier léger (1 composant, forte couverture)
- **Vérification :** champ invalide → `aria-invalid="true"`, message relié par `aria-describedby`, annoncé au lecteur d'écran (WCAG 3.3.1/4.1.3).

#### A11-008 — Groupes de champs sans `fieldset`/`legend` — 🟠
- **Constat :** les groupes logiques (radios, cases liées) sont des `<div>` avec un `<Label>` sans `htmlFor`, donc sans intitulé de groupe programmatique.
- **Preuve :** `candidat-form.tsx:213` (« Genre * »), `public-inscription-form.tsx:169`, `session-form.tsx:341` et `:387` (formateurs / étendue d'animation). Le bon motif existe déjà : `demo-form.tsx:62` (`<fieldset><legend>`).
- **Scénario d'impact :** à la tabulation, le lecteur d'écran annonce « Homme / Femme » mais pas la question « Genre » ; le regroupement est perdu.
- **Cause racine :** absence d'un composant de groupe.
- **Recommandation :** `<fieldset><legend>` (ou `role="radiogroup"` + `aria-labelledby`) autour de chaque groupe.
- **Charge :** S/M — **Priorité :** P1 — **Type :** Standard
- **Vérification :** le lecteur d'écran annonce l'intitulé du groupe avant les options (WCAG 1.3.1/3.3.2).

#### A11-009 — Régions live jamais alimentées — 🟠
- **Constat :** `AriaLiveProvider` est monté globalement mais `announce()` n'est jamais appelé → infrastructure d'annonces morte.
- **Preuve :** `src/components/aria-live-region.tsx` (définition polite `role=status` + assertive `role=alert`) ; `useAriaLive`/`announce(` = 6 occurrences, toutes dans ce fichier, **0 appelant** dans `src/`.
- **Scénario d'impact :** les changements dynamiques (résultats de filtre/recherche sur les listes candidats/sessions/CRM, pagination, états de chargement, validations inline) ne sont pas annoncés aux lecteurs d'écran. Atténuation : les **toasts** passent par `sonner` (`Toaster`, aria-live intégré) → cette catégorie est couverte.
- **Cause racine :** provider ajouté mais non consommé.
- **Recommandation :** appeler `announce()` (ou câbler un `aria-live` sur les conteneurs de résultats) aux transitions clés.
- **Charge :** M — **Priorité :** P1 — **Type :** Standard
- **Vérification :** appliquer un filtre sur /candidats → le nombre de résultats est annoncé (WCAG 4.1.3).

#### A11-010 — Contrastes AA non atteints sur éléments d'interface — 🟠
- **Constat :** plusieurs éléments sémantiques passent sous les seuils AA (4,5:1 texte, 3:1 large/UI). Précision : le thème **clair par défaut** est conforme (primaire `#2c53c0` ≈ 5,8:1) ; les échecs sont ciblés.
- **Preuve (valeurs calculées / rendues) :**
  - Bouton primaire **mode sombre** `#6f8bff` + blanc = **3,08:1** (`globals.css:189`) — **confirmé au runtime** sur le bouton « Se connecter » du site live.
  - Badges de statut (texte de couleur sur tuile `/10`, `badge.tsx:17-20` + `status-badge.tsx`) : warning `#e08a00` 2,45:1 · success `#12a150` 3,02:1 · destructive `#e5484d` 3,44:1 (info 5,83 ✅).
  - Bannière d'essai `text-warning` sur `bg-warning/10` : **2,30:1** (`(app)/layout.tsx:257`), icône incluse (échoue aussi 1.4.11).
  - 3 palettes tenant sur 10 (`themes.ts`) avec `--primary-foreground` blanc figé : émeraude 3,77 · turquoise 3,74 · orange 3,56 — et ce sont des **défauts recommandés** de certains designs.
- **Scénario d'impact :** malvoyants et utilisateurs en forte luminosité ne lisent pas le CTA principal en sombre, les badges de statut, le décompte d'essai. Défaut systémique (le badge est source unique + ≈41 pastilles recensées à l'audit 10).
- **Cause racine :** jetons de statut trop clairs sur fond teinté ; `--primary-foreground` blanc imposé quelle que soit la luminance du primaire.
- **Recommandation :** assombrir les jetons texte de statut (ou foncer/opacifier le fond) jusqu'à 4,5:1 ; dériver `--primary-foreground` (blanc **ou** encre) selon la luminance du primaire ; foncer le primaire sombre (ex. `#4f6fe0`).
- **Charge :** M — **Priorité :** P1 — **Type :** Quick win partiel (les jetons sont centralisés)
- **Vérification :** vérificateur de contraste sur badges + bouton primaire (clair/sombre + 3 palettes) ≥ 4,5:1.

#### A11-011 — Documents PDF & e-mails cœur sans `lang` — 🟠
- **Constat :** les documents stagiaire (convocations, attestations, conventions, contrats, livret, certificat de réalisation) et tous les e-mails candidats omettent `lang="fr"`, alors que les générateurs récents le posent.
- **Preuve :** `lib/documents/build-pdf.ts:185,298,394,456`, `build-zip.ts:141`, `convention-pdf.ts:159`, `api/convention/route.ts:151`, `mes-cours/[coursId]/attestation/route.ts:57` ; e-mails `lib/email-templates.ts:107`. À l'inverse, `lang="fr"` présent dans `titres/render.ts:159`, `factures/editeur.ts:167`, `defraiement.ts:42`. Les PDF étant **balisés** (Puppeteer 25 `tagged:true` par défaut, `lib/pdf.ts:64`), l'absence de `/Lang` reste non conforme.
- **Scénario d'impact :** un stagiaire déficient visuel lit une attestation ou convocation en synthèse vocale avec une voix/prononciation erronées (documents à valeur légale).
- **Cause racine :** attribut oublié sur les gabarits historiques.
- **Recommandation :** ajouter `lang="fr"` sur le `<html>` de tous les gabarits documents + e-mails (aligner sur les récents).
- **Charge :** S — **Priorité :** P1 — **Type :** Quick win
- **Vérification :** inspecter un PDF généré (propriété /Lang) et le source e-mail ; PAC 2024 pour le taggage.

---

### 4. POINTS CONFORMES (🟢)

1. **Langue de la page** — `html lang="fr"` (`layout.tsx:95`) + `inLanguage:"fr-FR"` (JSON-LD) ; contenus 100 % FR sur l'échantillon (WCAG 3.1.1). *[MANUEL + runtime]*
2. **`h1` présent, unique, sans saut de niveau** sur tous les écrans échantillonnés (dashboard, catalogue, sessions, login, inscription, landing, solutions, mentions-légales) — aucun double-`h1`. *[MANUEL + runtime]*
3. **Chrome `(app)` exemplaire** — `header` + `nav` étiqueté + `main#main-content` + `footer` avec `nav aria-label="Liens légaux"` (`(app)/layout.tsx`). *[MANUEL]*
4. **Focus clavier visible et tokenisé** — `globals.css:900-908` (`outline:2px solid var(--primary)`) ; anneau ≈ 6,2-6,3:1 vs fond ; **le thème neumorphisme compense** l'`outline:none` par un `box-shadow` (WCAG 2.4.7). *[MANUEL + calcul]*
5. **Primitives interactives solides** — `@base-ui/react` (dialog, sheet, select, dropdown, tabs) : piège de focus, Échap, restitution, rôles/états gérés nativement, non contournés (WCAG 2.4.3/4.1.2). *[MANUEL]*
6. **Éléments sémantiques** — aucun `role="button"` sur `<div>` ; aucun `tabIndex` positif ; `onClick` sur non-natif quasi absent (backdrops `aria-hidden`). *[AUTO + MANUEL]*
7. **Usage de la couleur non exclusif** — badges toujours avec libellé texte ; erreurs textuelles ; graphique finance redondé par légende + tableau (WCAG 1.4.1). *[MANUEL]*
8. **Contraste du texte courant / muted** — corps 16,88-18,10:1 ; `--muted-foreground` 5,70-8,37:1 sur tous les thèmes testés (WCAG 1.4.3). *[calcul]*
9. **Zoom & reflow** — viewport non bloqué (`maximumScale:5`) ; `Table` en `overflow-x-auto` ; reflow mobile déjà corrigé (audit 10 : A10-013/014/015) (WCAG 1.4.4/1.4.10). *[MANUEL]*
10. **Mouvement réduit** — `prefers-reduced-motion` couvre les animations maison + `animated-number` + `scroll-reveal` (WCAG 2.3.3). *[AUTO]*
11. **Documents & e-mails** — PDF **balisés** par défaut, texte sélectionnable, `alt` sur logos/cachets/QR ; e-mails avec tables `role="presentation"` + `alt` du logo ; générateurs récents avec `lang` (WCAG 1.1.1/4.1.2). *[MANUEL]*
12. **Handicap métier (différenciant, Qualiopi ind. 26)** — référent handicap paramétrable (`schema.prisma:146`, console `edit-organisme-form.tsx:571`), mention PSH + contact sur convocations/livret/convention (`templates.ts:124,147,378`), champs candidat `situationHandicap`/`besoinsAdaptation`, contrôle ind. 26 (`qualiopi/audit.ts:184`), export CSV « Handicap déclaré ». *[MANUEL]*
13. **Honnêteté documentaire** — `docs/RGAA.md` reconnaît les manques et renvoie à un audit externe ; **aucune revendication RGAA/WCAG non étayée** sur le site marketing. *[AUTO + MANUEL]*
14. **CSP stricte** — l'injection de script (axe via CDN) est bloquée (`unsafe-eval` interdit) : gêne l'audit mais **bon point sécurité**. *[runtime]*

---

### 5. CONTRÔLES NON RÉALISÉS

| Contrôle | Raison | Ce qu'il faudrait pour le faire |
|---|---|---|
| axe-core automatisé sur les **écrans authentifiés** (`e2e/a11y.spec.ts` existe) | `.env` pointe la base Neon **prod** ; la config Playwright refuse (à raison) toute base non-locale ; ne pas tester contre la prod | Une base de test locale/branche Neon dédiée + seed (comme la campagne audit 10) puis `npx playwright test a11y.spec.ts` |
| axe-core **dans le navigateur** sur le site live | Bloqué par la CSP (`unsafe-eval` interdit) — bon point sécurité | Exécuter axe via l'extension navigateur ou via Playwright en local |
| Test **lecteur d'écran réel** (NVDA/JAWS/VoiceOver) | Pas de technologie d'assistance dans l'environnement d'audit | Session AT manuelle sur les parcours clés (login, inscription, signature, listes) |
| **Qualité du taggage PDF** (ordre de lecture, `/Lang` effectif, TH/scope, PDF/UA) | Vérifiable seulement sur un PDF réellement généré ; audit en lecture seule | Générer un PDF réel et l'analyser (PAC 2024 / Adobe Preflight) |
| Rendu réel **mode sombre + 10 designs tenant** | Pas d'environnement authentifié ; calculs faits sur les tokens | Environnement de démo par tenant + captures |
| Exhaustivité **199 pages / ~120 écrans `(app)`** | Timebox ; échantillon représentatif retenu | Passe outillée par page (axe) sur environnement de test |
| Assujettissement **European Accessibility Act** (dir. 2019/882 / ord. 2023-859) | Analyse juridique dédiée hors périmètre technique | Avis juridique sur la vente en ligne directe de service |

---

### 6. QUICK WINS (fort risque / faible charge — à traiter en premier)

1. **A11-001** — signature saisie alternative (nom + case + IP déjà collectés) → lève le 🔴. *(S/M, P0)*
2. **A11-002** — ajouter `id="main-content"` aux layouts publics + console. *(S, P1)*
3. **A11-011** — `lang="fr"` sur les gabarits documents + e-mails. *(S, P1)*
4. **A11-010** (partiel) — assombrir les jetons de statut + dériver `--primary-foreground`. *(S/M, P1)*
5. **A11-015** — `<main>` interne de mes-cours → `<section>`. *(S, P2)*
6. **A11-019** — garde `.animate-in{animation:none}` sous `prefers-reduced-motion`. *(S, P2)*
7. **A11-021** — supprimer/brancher le stub `wcag-audit.ts`. *(S, P3)*

---

### 7. PLAN DE REMÉDIATION

- **Vague 1 — avant Go-Live (P0) :** A11-001 (signature accessible). Charge cumulée ≈ 0,5-1 j. *Condition de commercialisation.*
- **Vague 2 — J+30 (P1), avant premiers clients payants :** quick wins d'abord (A11-002 skip link, A11-011 lang docs/e-mails, A11-010 contrastes) puis chantiers de composant à fort effet de levier (A11-003 `CardTitle`, A11-007 `FormField`, A11-005 modales via `useFocusLock`), puis A11-004 titres, A11-006 palette, A11-008 fieldset, A11-009 régions live. Charge cumulée ≈ 6-9 j.
- **Vague 3 — J+90 (P2/P3) :** A11-012 à A11-022 (nav labels, aria-sort, h1 portail, obligatoires/format, certificat/th scope, animations, déclaration d'accessibilité, stub, graphique finance) + **commander l'audit RGAA externe** (grille 106 critères + déclaration publiée) — prérequis à toute vente au secteur public. Charge cumulée ≈ 5-8 j + prestataire externe.

---

### 8. ANNEXES

**Méthode du taux de conformité :** échantillon de **18 critères WCAG 2.1 AA** évalués sur les écrans du périmètre, comptage **strict RGAA** (un critère est conforme seulement si aucune instance applicable n'échoue). Conformes (6) : 1.1.1, 1.4.1, 1.4.4, 1.4.10, 2.4.7, 3.1.1. Non conformes (12) : 1.3.1, 1.4.3, 1.4.11, 2.1.1, 2.4.1, 2.4.2, 2.4.3, 2.4.6, 3.3.1, 3.3.2, 4.1.2, 4.1.3. → **6/18 ≈ 33 %**. Ce taux porte sur un sous-ensemble et ne remplace pas la grille officielle (106 critères).

**Écrans testés au runtime (site live `ofmanager.info`) :** `/login`, `/` (landing), `/inscription`, `/mentions-legales` — sonde DOM (lang, landmarks, titres, `alt`, étiquettes, contrastes rendus) ; axe-core tenté (bloqué CSP).

**Commandes exécutées :** `git rev-parse` (version) ; `npm run lint` → **41 warnings, 0 erreur, 0 violation `jsx-a11y`** (les warnings sont des `eslint-disable` inutiles) ; sondes JS `getComputedStyle`/luminance relative WCAG dans le navigateur intégré.

**Outils :** ESLint 9 + `eslint-config-next/core-web-vitals` (règles `jsx-a11y` actives, aucune désactivée) ; `@axe-core/playwright ^4.11` **présent** dans le dépôt (`e2e/a11y.spec.ts`, non exécuté ici) ; axe-core 4.10.2 tenté en navigateur (CSP) ; sonde de contraste maison (alpha-blend + luminance relative).

**Limite des sondes :** le texte en dégradé (`background-clip:text`) et les couleurs `oklab` ne sont pas mesurables par la sonde → faux positifs des titres héros **écartés**.

**Fichiers clés analysés :** `src/app/layout.tsx`, `(app)/layout.tsx`, `console/layout.tsx`, `(portail-entreprise)/…/layout.tsx` ; `components/skip-links.tsx`, `aria-live-region.tsx`, `command-palette.tsx`, `ui/{card,badge,input,dialog,signature-pad}.tsx`, `parcours/sign-box.tsx`, `crm/crm-table.tsx`, `finance/finance-recap.tsx` ; `lib/documents/{build-pdf,templates,certificat-signature}.ts`, `lib/email-templates.ts`, `lib/themes.ts`, `app/globals.css` ; `docs/RGAA.md`, `prisma/schema.prisma`.

**Versions :** Next 16.3.1 · React 19.2.4 · Tailwind CSS v4 · `@base-ui/react` 1.5 · Puppeteer-core 25.1.0 · Node 24.16.0.

---

### 9. BLOC DE CONSOLIDATION (ne pas modifier le format)

```json
{
  "audit_id": 11,
  "audit_nom": "Audit accessibilité",
  "date": "2026-09-11",
  "commit": "0b3ea3f",
  "verdict": "GO_CONDITIONNEL",
  "compteurs": {"rouge": 1, "orange": 10, "jaune": 11, "vert": 14, "non_verifie": 7},
  "anomalies": [
    {"id": "A11-001", "gravite": "rouge", "titre": "Signature manuscrite inaccessible au clavier (tracé obligatoire, aucune alternative)", "composant": "parcours/sign-box.tsx, ui/signature-pad.tsx", "preuve": "sign-box.tsx:81,116-126 ; signature-pad.tsx:80-90 ; /signer,/parcours,/contrat-formateur", "impact": "Signature convention/contrat/émargement impossible au clavier/lecteur d'écran", "recommandation": "Signature saisie alternative (nom+case+IP+horodatage déjà collectés) ou YouSign", "charge": "M", "priorite": "P0", "type": "quick_win", "depend_de": []},
    {"id": "A11-002", "gravite": "orange", "titre": "Lien d'évitement cassé (cible #main-content absente hors (app)/portail)", "composant": "components/skip-links.tsx", "preuve": "skip-links.tsx:13 ; ancre seulement (app)/layout.tsx:279, portail:88 ; runtime skipOk:false x4 pages", "impact": "Bypass clavier inopérant sur vitrine+console+parcours token", "recommandation": "id=main-content sur les <main> des layouts publics+console", "charge": "S", "priorite": "P1", "type": "quick_win", "depend_de": []},
    {"id": "A11-003", "gravite": "orange", "titre": "Hiérarchie de titres aplatie — CardTitle rend un div", "composant": "components/ui/card.tsx", "preuve": "card.tsx:36 <div data-slot=card-title> ; dashboard/session sections", "impact": "Navigation par titres inopérante sur 60+ pages", "recommandation": "CardTitle en h2/h3 (prop as) + hiérarchiser", "charge": "M", "priorite": "P1", "type": "standard", "depend_de": []},
    {"id": "A11-004", "gravite": "orange", "titre": "Titre d'onglet non unique dans tout le back-office/console/portail", "composant": "(app)/layout.tsx, console/layout.tsx", "preuve": "titre global layout.tsx:50 ; (app) generateMetadata:48-51 icône seule ; 8 fichiers metadata", "impact": "Onglets/favoris/historique indistinguables (2.4.2)", "recommandation": "metadata par page ou title.template par layout", "charge": "M", "priorite": "P1", "type": "standard", "depend_de": []},
    {"id": "A11-005", "gravite": "orange", "titre": "Modales maison sans gestion du focus (x5), useFocusLock non branché", "composant": "command-palette, pdf-viewer-modal, imports, scan", "preuve": "command-palette.tsx:104 ; pdf-viewer-modal.tsx:91 ; import-catalogue-button.tsx:48 ; hooks/use-focus-lock.ts sans importateur", "impact": "Focus fuit, pas d'Échap, pas de restitution", "recommandation": "Dialog/Sheet du kit ou brancher useFocusLock existant", "charge": "M", "priorite": "P1", "type": "standard", "depend_de": []},
    {"id": "A11-006", "gravite": "orange", "titre": "Palette de commandes (Cmd+K) non restituée aux lecteurs d'écran", "composant": "components/command-palette.tsx", "preuve": "command-palette.tsx:110 (pas role=dialog), :137-142 (li sans role=option/listbox), :125 input outline-none", "impact": "Combobox global inutilisable au lecteur d'écran", "recommandation": "role=dialog aria-modal + pattern listbox + anneau focus", "charge": "M", "priorite": "P1", "type": "standard", "depend_de": []},
    {"id": "A11-007", "gravite": "orange", "titre": "Erreurs de formulaire ni reliées au champ ni annoncées", "composant": "6+ formulaires + login", "preuve": "public-inscription-form.tsx:22, candidat-form.tsx:35, session-form.tsx:38, login-form.tsx:65 ; input.tsx:12 aria-invalid jamais posé", "impact": "Utilisateur AT ne perçoit ni l'erreur ni le message", "recommandation": "FormField/FormMessage central (aria-invalid+aria-describedby+role=alert)", "charge": "M", "priorite": "P1", "type": "standard", "depend_de": []},
    {"id": "A11-008", "gravite": "orange", "titre": "Groupes de champs (radios/cases) sans fieldset/legend", "composant": "candidat/inscription/session forms", "preuve": "candidat-form.tsx:213, public-inscription-form.tsx:169, session-form.tsx:341,387 ; motif OK demo-form.tsx:62", "impact": "Intitulé du groupe (Genre, financement) non restitué", "recommandation": "fieldset/legend ou role=radiogroup+aria-labelledby", "charge": "S", "priorite": "P1", "type": "standard", "depend_de": []},
    {"id": "A11-009", "gravite": "orange", "titre": "Régions live jamais alimentées (announce() jamais appelé)", "composant": "components/aria-live-region.tsx", "preuve": "useAriaLive/announce = 6 occ. dans la définition, 0 appelant dans src/", "impact": "Filtres/recherche/chargement/validations non annoncés (toasts couverts par sonner)", "recommandation": "Appeler announce() aux transitions clés", "charge": "M", "priorite": "P1", "type": "standard", "depend_de": []},
    {"id": "A11-010", "gravite": "orange", "titre": "Contrastes AA non atteints sur éléments d'interface", "composant": "tokens, badge, bannière, themes", "preuve": "primary sombre #6f8bff/blanc 3,08 (globals.css:189, runtime login) ; badges 2,45/3,02/3,44 (badge.tsx:17-20) ; bannière 2,30 ((app)/layout.tsx:257) ; 3/10 palettes tenant 3,5-3,8", "impact": "CTA/badges/décompte illisibles pour malvoyants", "recommandation": "Assombrir jetons statut ; dériver primary-foreground ; foncer primaire sombre", "charge": "M", "priorite": "P1", "type": "quick_win", "depend_de": []},
    {"id": "A11-011", "gravite": "orange", "titre": "Documents PDF & e-mails cœur stagiaire sans attribut lang", "composant": "lib/documents/build-pdf.ts, lib/email-templates.ts", "preuve": "build-pdf.ts:185,298,394,456 ; email-templates.ts:107 ; générateurs récents posent lang (titres/render.ts:159)", "impact": "Synthèse vocale erronée sur convocations/attestations/conventions", "recommandation": "lang=fr sur tous les gabarits documents + e-mails", "charge": "S", "priorite": "P1", "type": "quick_win", "depend_de": []},
    {"id": "A11-012", "gravite": "jaune", "titre": "Repères nav non étiquetés / étiquettes + id dupliqués", "composant": "site-header, console-rail, sidebar", "preuve": "site-header.tsx:26,50 ; console-rail.tsx:89 ; Navigation principale + id=main-nav dupliqués", "impact": "Navigation par landmarks ambiguë en mobile", "recommandation": "aria-label distinct par nav + id unique", "charge": "S", "priorite": "P2", "type": "standard", "depend_de": []},
    {"id": "A11-013", "gravite": "jaune", "titre": "État de tri non exposé (aria-sort absent)", "composant": "crm-table, sessions-table", "preuve": "tri = <button> (clavier OK) ; aria-sort = 0 occurrence dans src", "impact": "Colonne/sens de tri non annoncés", "recommandation": "aria-sort sur le th trié", "charge": "S", "priorite": "P2", "type": "standard", "depend_de": []},
    {"id": "A11-014", "gravite": "jaune", "titre": "Portail entreprise : pas de h1 par sous-page", "composant": "(portail-entreprise)/espace-entreprise", "preuve": "layout.tsx:83 seul h1 (raison sociale) ; 0 h1 sous-pages", "impact": "Sous-pages sans titre décrivant l'écran", "recommandation": "h1/h2 de rubrique par page", "charge": "S", "priorite": "P2", "type": "standard", "depend_de": []},
    {"id": "A11-015", "gravite": "jaune", "titre": "Double repère main imbriqué", "composant": "(app)/mes-cours/[coursId]/page.tsx", "preuve": "page.tsx:197 <main> dans le <main id=main-content> du layout", "impact": "Deux landmarks main + cible skip ambiguë", "recommandation": "Remplacer le main interne par section", "charge": "S", "priorite": "P2", "type": "quick_win", "depend_de": []},
    {"id": "A11-016", "gravite": "jaune", "titre": "Obligatoires/format : * non expliqué, pas d'aria-required, format en placeholder", "composant": "candidat/inscription/login forms", "preuve": "candidat-form.tsx:203 ; login-form.tsx:20-41 ; formats placeholder public-inscription-form.tsx:251", "impact": "Sens du * supposé ; aide au format perdue", "recommandation": "Légende champs obligatoires + aria-required + aide reliée", "charge": "S", "priorite": "P2", "type": "standard", "depend_de": []},
    {"id": "A11-017", "gravite": "jaune", "titre": "Certificat de signature (pdf-lib) non balisé + sans /Lang", "composant": "lib/documents/certificat-signature.ts", "preuve": "certificat-signature.ts:22-141 drawText sans structure/MarkInfo", "impact": "Lecteur d'écran sur la pièce de preuve", "recommandation": "Pipeline HTML->PDF taggé ou tags pdf-lib", "charge": "M", "priorite": "P2", "type": "standard", "depend_de": []},
    {"id": "A11-018", "gravite": "jaune", "titre": "Tableaux de documents sans th scope + pied d'e-mail sous-contrasté", "composant": "lib/documents/templates.ts, email-templates.ts", "preuve": "templates.ts:69-81,501-514 (td) ; email-templates.ts:119 #9aa7c2/#f5f8fd = 2,3:1", "impact": "En-têtes faibles dans PDF taggé ; mention RGPD peu lisible", "recommandation": "th scope + assombrir le pied (~4,6:1)", "charge": "S", "priorite": "P2", "type": "standard", "depend_de": []},
    {"id": "A11-019", "gravite": "jaune", "titre": "Animations d'entrée hors couverture prefers-reduced-motion", "composant": "dialog/dropdown-menu/select (tw-animate-css)", "preuve": ".animate-in sans garde ; @media globals.css cible seulement les classes maison", "impact": "Modales/menus s'animent en mouvement réduit", "recommandation": ".animate-in{animation:none} sous @media reduced-motion", "charge": "S", "priorite": "P2", "type": "quick_win", "depend_de": []},
    {"id": "A11-020", "gravite": "jaune", "titre": "Déclaration d'accessibilité absente", "composant": "site public", "preuve": "aucune route /accessibilite ; docs/RGAA.md:27-29 renvoie audit externe", "impact": "Non due légalement (éditeur/PME) mais attendue pour marché public", "recommandation": "Publier une déclaration après audit externe", "charge": "S", "priorite": "P2", "type": "standard", "depend_de": []},
    {"id": "A11-021", "gravite": "jaune", "titre": "Helper wcag-audit.ts trompeur (score:100/passed:true en dur)", "composant": "lib/testing/wcag-audit.ts", "preuve": "wcag-audit.ts:26-37 renvoie toujours passed:true ; 0 appelant", "impact": "Fausse confiance si branché un jour", "recommandation": "Supprimer ou brancher un vrai axe", "charge": "S", "priorite": "P3", "type": "quick_win", "depend_de": []},
    {"id": "A11-022", "gravite": "jaune", "titre": "Graphique finance : couleurs figées, non tokenisées (dark + 1.4.11)", "composant": "components/finance/finance-recap.tsx", "preuve": "finance-recap.tsx:50-83 barres #10b981/#f43f5e ; verte 2,54:1 ; atténué role=img+légende+tableau (1.4.1 OK)", "impact": "Objet graphique sous-contrasté ; ignore le thème sombre", "recommandation": "Utiliser --chart-* + foncer les barres", "charge": "S", "priorite": "P2", "type": "standard", "depend_de": []}
  ],
  "conditions_go": [
    "C1 (P0) : rendre la signature électronique accessible au clavier/lecteur d'écran (A11-001) avant le Go-Live",
    "C2 (P1, J+30) : traiter le lot orange avant les premiers clients payants (contrastes, hiérarchie de titres, titres d'onglet, erreurs de formulaire, régions live, skip link, modales, lang des documents)"
  ],
  "risques_residuels": [
    "Sans audit RGAA externe + déclaration publiée, vente au secteur public (assujetti art. 47) exposée",
    "Écrans authentifiés non passés à axe (base prod) : violations serious/moderate possibles hors échantillon",
    "Qualité réelle du taggage PDF (PDF/UA) non vérifiée",
    "Assujettissement European Accessibility Act non tranché juridiquement"
  ]
}
```
