# Plan de test — OFMANAGER

> Livrable QA n°2 (Phase 0 cadrage + Phase 1 stratégie). À faire valider par le
> Product Owner avant toute écriture/exécution de tests (Phases 2→6).

## Phase 0 — Cadrage

### Objectif de la campagne
Passer **au peigne fin** l'ensemble des fonctionnalités d'OFMANAGER, détecter et
documenter chaque anomalie sous forme de fiches `BUG-OFM-###` priorisées, et livrer
un rapport actionnable. Cible : **fiabilité avant mise en avant commerciale** (1er
client externe AGUYSE + démos en cours).

### Périmètre
- **Inclus** : les 34 modules fonctionnels sous flag, les flux publics tokenisés
  (inscription, parcours, signature, satisfaction, français), la génération
  documentaire, le cloisonnement multi-tenant, les automatisations, les exports.
- **Exclu (this run)** : charge/performance à grande échelle, pentest offensif,
  compatibilité navigateurs exotiques, app mobile Capacitor (pas encore packagée),
  intégrations tierces réelles (YouSign prod, Stripe prod, Brevo/Resend envoi réel —
  **neutralisés** en test).

### Environnements
| Env | Usage | Détails |
|---|---|---|
| `C:\qa-of` (local) | Exécution QA | Build prod, `next start -p 3100`, e-mails vidés (pas d'envoi réel) |
| Neon dev | Données | ⚠️ partagée — voir risque R1 |
| app.capacademy.fr (prod) | Vérif ciblée | lecture seule, uniquement pour confirmer un comportement (ex. photos vitrine) |

### Risques & mitigations
| # | Risque | Impact | Mitigation |
|---|---|---|---|
| R1 | Pas de base de test isolée (Neon dev partagée) | Tests d'écriture polluent/altèrent des données | Créer une **branche Neon de test** OU tenant QA dédié `qa-test`; préfixer toutes les données de test `[QA]`; jamais de suppression réelle |
| R2 | E-mails/SMS/e-sign neutralisés | Certains bouts de flux non observables end-to-end | Tester la couche action (génération + statut en base) plutôt que la réception |
| R3 | Faux positifs (déjà rencontrés) | Bruit dans le rapport | **Toute anomalie = repro concret** (étapes + preuve) avant fiche ; sinon « à investiguer » |
| R4 | Session concurrente (civique) modifie `main` | Conflits | Worktree isolé `C:\qa-of` ; pas de push depuis la QA sauf correctif validé |

### Comptes & rôles de test
| Rôle | Compte | Note |
|---|---|---|
| SUPERADMIN (console/dev) | `demo+dev@cap.fr` | config marque, flags, cachet |
| ADMIN (tenant CAP) | `infocap.comp@gmail.com` | source de vérité métier |
| ADMIN (tenant démo) | `demo-secu@cap.fr` | tenant B — sert aux tests de cloisonnement |
| FORMATEUR | à provisionner `[QA]` | espace formateur, émargement, facturation |
| APPRENANT | à provisionner `[QA]` | e-learning, mes-documents, certificats |

## Phase 1 — Stratégie de test

### Types de tests & répartition
| Type | Cible | Outil | Poids |
|---|---|---|---|
| **Unitaire** | logique pure : éligibilité docs, calcul durées/jours ouvrés, séquences réf, scoring, substitution variables templates | Vitest | 30 % |
| **Intégration** | server actions ↔ Prisma (scoping tenant, création convention groupée, statuts inscription, jalons automatisation) | Vitest + DB test | 35 % |
| **E2E** | parcours critiques bout-en-bout (login→dashboard, inscription→signature, doc→PDF, feuille émargement) | Playwright | 25 % |
| **Non-régression** | rejouer la suite après chaque correctif ; garder les cas déjà « vert » | Vitest + Playwright CI | 10 % |
| **Accessibilité** | pages clés | @axe-core/playwright | transverse |

### Priorisation (par le risque × usage)
1. **P1 🔴 — Sécurité & intégrité** : cloisonnement multi-tenant, marque blanche
   (fuite cachet/signature), éligibilité documentaire, signature/valeur probante,
   authentification & rôles.
2. **P1 🔴 — Cœur métier** : formations/sessions, inscription (particulier & pro),
   convention groupée, émargement, certification→attestation, automatisations.
3. **P2 🟠 — Support métier** : finance (devis/factures/tréso), CRM/leads/scoring,
   qualiopi/BPF/RGPD, portails, e-learning apprenant.
4. **P3 🟡 — Confort** : exports, rapports, notifications, UI/cosmétique, a11y.

### Définition de « fini » (DoD) d'un cas de test
- Repro déterministe documentée ; assertion claire attendu vs observé ;
- Vert = passe 2× de suite ; Rouge = fiche `BUG-OFM-###` créée avec preuve ;
- Rattaché à une ligne de la matrice de traçabilité.

### Format de fiche d'anomalie (rappel section 7 du brief)
```
BUG-OFM-###  | Titre court
Module / Fonction :
Environnement    : (local qa-of / prod / navigateur, rôle, tenant)
Sévérité         : Bloquant | Majeur | Mineur | Cosmétique
Priorité         : P1 | P2 | P3
Préconditions    :
Étapes de repro  : 1. … 2. … 3. …
Résultat attendu :
Résultat observé :
Preuve           : (capture / log / id enregistrement)
Fréquence        : systématique | intermittent
Cause probable   : (si identifiée, fichier:ligne)
Cas de test lié  : CT-…
Statut           : Ouvert | En cours | Corrigé | Fermé | Rejeté
```

### RACI
| Activité | Responsable | Approuve | Consulté | Informé |
|---|---|---|---|---|
| Cartographie & plan | QA (Claude) | **PO (vous)** | — | — |
| Écriture cas de test | QA | PO | — | — |
| Exécution & fiches bug | QA | — | — | PO |
| Correctifs | Dev (Claude) | PO | QA | — |
| Validation / clôture | PO | PO | QA | — |

### Séquencement (phases 2→6)
- **Phase 2** — Compléter la matrice de traçabilité (toutes les fonctions du §2 carto).
- **Phase 3** — Écrire les tests unitaires + intégration P1, puis P2.
- **Phase 4** — Écrire/rejouer les E2E parcours critiques.
- **Phase 5** — Exécution complète, création des fiches `BUG-OFM-###`.
- **Phase 6** — Rapport priorisé + non-régression après correctifs.

## Ce que je demande de valider (Go/No-Go)
1. **Périmètre & priorisation** ci-dessus vous conviennent-ils ? (Un module à
   remonter/descendre en priorité ?)
2. **Base de test (R1)** : je crée un **tenant QA dédié `[QA]`** sur la base dev
   (données préfixées, jamais de suppression réelle) — OK ? Ou vous préférez une
   branche Neon séparée ?
3. **Provisionnement** comptes FORMATEUR + APPRENANT `[QA]` — OK pour que je les crée ?
4. **Profondeur** : campagne exhaustive (34 modules) ou d'abord un **premier lot P1**
   (sécurité + cœur métier) livré vite, puis on enchaîne ?
