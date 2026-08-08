# Cartographie fonctionnelle — OFMANAGER

> Livrable QA n°1 (Phase 1). Reconstruite à partir du **code source réel**
> (routes `src/app`, 34 feature-flags `lib/features.ts`, 219 server actions).
> À faire valider par le Product Owner avant conception des tests.

## 0. Contexte plateforme (Phase 0 — cadrage)

| Paramètre | Valeur |
|---|---|
| Type | **SaaS multi-tenant** (marque blanche par organisme) |
| Stack | Next.js 16 (App Router, Turbopack), TypeScript strict, Prisma, PostgreSQL (Neon), next-auth v5, Tailwind 4 |
| Accès code source | **Oui** (repo `cap-competence-manager`) |
| Env. de test | `C:\qa-of` (worktree isolé, build prod, serveur `next start`, **e-mails neutralisés** BREVO/RESEND vidés → mode démo) |
| Base de données | Neon (dev partagée) — ⚠️ **pas de branche de test dédiée** pour l'instant (voir plan, risque) |
| Cloisonnement | `getTenantDb()` (scopedPrisma) : `where`/`data` auto par `organismeId` |
| Comptes de test | ADMIN CAP `infocap.comp@gmail.com` ; ADMIN démo `demo-secu@cap.fr` ; SUPERADMIN console `demo+dev@cap.fr` ; APPRENANT (à provisionner) |
| Rôles | SUPERADMIN (éditeur/console), ADMIN, RESPONSABLE_FORMATION, ASSISTANT, FORMATEUR, APPRENANT |

## 1. Inventaire des modules (haut niveau)

**A. Socle & accès** — Authentification (login/logout/session unique/rôles), Console éditeur (`/console`), Administration tenant (`/administration`), Mon compte (`/mon-compte`), Cycle d'essai/abonnement (trial, formules).

**B. Cœur métier — Formation** — Formations (catalogue), Sessions, Planning, Salles, Formateurs, Émargement, E-learning, Suivi pédagogique, Jurys d'examen, Diplômes, Titres/anti-fraude.

**C. Commercial / CRM** — CRM (pipeline/kanban), Candidats, Clients pro (entreprises) & Conventions, Prospects/Leads (multi-canal), Scoring, Devis, Simulateur de financement.

**D. Inscriptions & parcours** — Inscription (session), Parcours candidat public (formulaire + signature), Tests (positionnement, français), Satisfaction, Suivi 6 mois, Réclamations.

**E. Documents & conformité** — Génération documentaire (dossier PDF, ZIP Word, aperçu), Signatures, Qualiopi (indicateurs, réclamations, partenaires), BPF, RGPD.

**F. Finance** — Comptabilité, Facturation, Trésorerie, Ma facturation (formateur).

**G. Communication & automatisation** — Automatisations (moteur cron), Notifications, SMS, Tâches, Messagerie, Support (ticketing), Assistant IA.

**H. Espace apprenant** — Mon espace, Mes formations/cours/documents/émargements/certificats/notifications, Mon profil, Historique, Catalogue.

**I. Portails externes** — Portail client pro (`/portail/[token]`), Site vitrine piloté (`/site-vitrine`, blog, photos, trafic), API publiques (`/api/public/*`).

**J. Reporting & exports** — Rapports analytiques, Exports (CSV/Excel/PDF : candidats, sessions, comptable, pédagogique).

**K. Examen civique** — vertical e-learning (masqué pour CAP).

## 2. Décomposition en fonctions (extrait priorisé — à compléter)

> Chaque fonction = au moins un cas de test (cf. matrice §3). Criticité :
> 🔴 bloquant/critique · 🟠 majeur · 🟡 mineur.

### A. Authentification & accès 🔴
- Connexion (identifiants valides / invalides / compte désactivé)
- Session unique (un seul appareil actif — déconnexion de l'ancien)
- Déconnexion (`/deconnexion` GET)
- Routage par rôle (SUPERADMIN→/console, ADMIN→/dashboard, APPRENANT→/mon-espace)
- Gating par feature-flag (menu masqué + URL bloquée par `middleware`)
- **Cloisonnement multi-tenant** (aucune fuite inter-organisme) 🔴

### B. Formations 🔴
- CRUD formation (titre, référence unique **globale**, durée heures/jours, examen, jury, grille INRS, pièces attendues)
- Catalogue de référence sécurité (import SSIAP/SST/APS, non-destructif, idempotent)
- Programme (document à la marque OF)

### B. Sessions 🔴
- CRUD session (dates, horaires, lieu, **date/lieu examen**, places, salle)
- Affectation formateur(s) : multi-session + **par séance**
- Génération des séances + émargement (feuille par semaine, signatures)
- Résultats & certification (CERTIFIE→attestation réussite auto)
- Clôture/archivage (garde-fou validation Qualiopi)

### C. Candidats / Clients pro / Conventions 🔴
- CRUD candidat (coordonnées, CNAPS, diplôme SSIAP, handicap)
- Client pro (entreprise) + **convention de groupe** (inscription groupée : nouveaux + existants ; signée→confirmée)
- Inscription à une session (statuts, paiement, financement)

### D. Parcours candidat public 🔴
- Invitation (lien tokenisé) → formulaire → **signature électronique** → dossier signé
- Test de positionnement / **test de français** (lien + signature)
- Satisfaction / suivi 6 mois / réclamation (public)

### E. Documents & conformité 🔴
- **Éligibilité conditionnelle** (particulier↔contrat / pro↔convention ; examen ; OPCO ; PMR ; sans signature candidat sur attestations)
- **Marque blanche** : logo/cachet du tenant uniquement (jamais l'asset CAP)
- Génération PDF / ZIP Word / aperçu ; certificat de signature (preuve)
- Grilles INRS SST/MAC SST (pré-remplissage doc officiel)
- Qualiopi (indicateurs, réclamations, partenaires), BPF, RGPD (purge/rétention)

### F. Finance 🟠
- Devis (séquence réf, signature), Factures, Trésorerie, Facturation formateur, note de défraiement jury

### G. Communication & automatisation 🟠
- Moteur d'automatisations (convocation, rappel J-1, positionnement, français, émargement, satisfaction, docs fin, suivi 6 mois, compte rendu) — jalons datés idempotents
- Notifications in-app, SMS, Tâches, Support (tickets), IA

### H. Espace apprenant 🟠
- Accès e-learning (cours/leçons/quiz), documents, émargements, certificats

### I. Portails & API publiques 🟠
- Portail client pro (lecture seule tokenisée)
- API publiques (`/api/public/formations`, `/photos`, `/sessions`) — scopées `VITRINE_ORGANISME_ID`/`?organisme=`

### J. Exports & rapports 🟡
- Exports CSV/Excel/PDF (candidats, sessions, comptable, pédagogique)
- Rapports analytiques (KPIs, entonnoir, sources)

## 3. Matrice de traçabilité (gabarit)

| ID fonction | Module | Fonction | Criticité | CT unitaire | CT intégration | CT E2E | Statut | Résultat |
|---|---|---|---|---|---|---|---|---|
| F-AUTH-01 | Auth | Connexion valide | 🔴 | — | INT-AUTH-01 | E2E-AUTH-01 | à écrire | — |
| F-AUTH-05 | Auth | Cloisonnement tenant | 🔴 | UT-TENANT-01 | INT-TENANT-01 | — | à écrire | — |
| F-DOC-01 | Documents | Éligibilité doc/inscription | 🔴 | ✅ doc-eligibility.test | — | — | **vert** | 6/6 |
| F-DOC-02 | Documents | Marque blanche (cachet tenant) | 🔴 | — | — | ✅ audit-tampon | **vert** | — |
| F-SESS-03 | Sessions | Feuille émargement 5j/page | 🟠 | — | — | ✅ audit-feuille | **vert** | — |
| F-CONV-01 | Conventions | Inscription groupée pro | 🔴 | — | ✅ (DB) | à écrire | partiel | OK DB |
| … | … | (à compléter fonction par fonction) | | | | | | |

> La matrice complète (toutes les fonctions du §2) est le premier livrable de la
> Phase 3. Les lignes « vert » ci-dessus sont les cas déjà couverts pendant les
> correctifs récents.
