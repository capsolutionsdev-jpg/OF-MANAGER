# 10 — Synthèse chef de projet

> Consolidation des Livrables 2 (fiches 01→09). **Aucune correction appliquée :**
> ce document propose et priorise ; le passage en Phase 2 se fait sur ta décision,
> item par item.

---

## 1. Registre consolidé des constats

Légende — **Type** : F=faille · B=bug · NC=non-conformité · A=amélioration. **Sév.** : 🔴 Critique · 🟠 Majeure · 🟡 Mineure. **Effort** : XS<½j · S≈1j · M≈2-3j · L≈1sem.

| ID | Module | Type | Sév. | Spéc. | Effort | Constat (résumé — détail en fiche) |
|----|--------|------|------|-------|--------|------------------------------------|
| ARC-01 | Transverse | F | 🔴 | ARC | L | Isolation tenant 100 % applicative (`organismeId` nullable, pas de RLS). |
| ARC-02 | Transverse | NC | 🟠 | ARC | S | Matrice rôles↔sections dupliquée (auth.config / permissions). |
| ARC-03 | Pédago | A | 🟠 | ARC | M | `Inscription` = god model (~80 champs). |
| ARC-04 | Transverse | F | 🟠 | ARC | M | Authz figée dans le JWT (changements effectifs à la reconnexion). |
| ARC-05 | Transverse | NC | 🟡 | ARC | S | Protection middleware par denylist regex fragile. |
| ARC-06 | Transverse | B | 🟡 | ARC | S | TOCTOU + double requête sur écritures cloisonnées. |
| ARC-07 | Transverse | F | 🟠 | ARC | M | `next-auth@5 beta` en prod (dépendance critique en pré-version). |
| ARC-08 | Transverse | A | 🟡 | ARC | L | Logique métier couplée à Prisma (pas de couche cas d'usage). |
| ARC-09 | Transverse | F | 🟡 | ARC | S | `SupportMessage` non filtré (sécurisé seulement via ticket parent). |
| BCK-01 | Compta | B/NC | 🔴 | BCK | M | Numérotation par `count()` → race + trous (illégal pour factures). |
| BCK-02 | Compta | B | 🟠 | BCK | S | Devis accepté → statut `PAYEE` (sémantique fausse). |
| BCK-03 | Transverse | B | 🟠 | BCK | M | Gestion d'erreurs hétérogène (échecs muets). |
| BCK-04 | Compta | NC | 🟠 | BCK | S | TVA non pilotée par l'exonération OF (20 % par défaut). |
| BCK-05 | Compta | F/B | 🟠 | BCK | M | Idempotence/signature webhook Stripe à confirmer. |
| BCK-06 | Pédago | A | 🟡 | BCK | M | PDF lourd (Chromium) généré dans la requête. |
| FRT-01 | Transverse | B | 🟠 | FRT | S | Feedback d'erreur absent sur les `formData`-actions. |
| FRT-02 | Transverse | A | 🟡 | FRT | M | Rafraîchissement global (pas d'optimiste). |
| FRT-03 | Transverse | NC | 🟡 | FRT | XS | Cohérence de marque OFManager vs libellés legacy (à confirmer). |
| FRT-04 | Transverse | NC | 🟠 | FRT | M | Couverture a11y partielle (1 écran testé). |
| FRT-05 | Pédago | B | 🟡 | FRT | S | Robustesse formulaires publics signés (mobile/double soumission). |
| DB-01 | Transverse | B | 🔴 | DB | M | Références `@unique` GLOBAL générées par tenant → collisions inter-OF. |
| DB-02 | Qualiopi | B | 🔴 | DB | S | `QualiopiIndicateur.numero` unique global (bloque le 2ᵉ OF). |
| DB-03 | Transverse | F | 🟠 | DB | L | `organismeId` nullable, pas de FK/RLS. |
| DB-04 | Infra | NC | 🟠 | DB | M | Dérive migrations / `db push` (base non reproductible). |
| DB-05 | Transverse | B | 🟡 | DB | S | `onDelete` hétérogène (cycle de suppression flou). |
| DB-06 | Transverse | A | 🟡 | DB | S | Tokens à unicité incohérente. |
| QA-01 | Transverse | NC | 🟠 | QA | M | Test d'isolation tenant non exécuté en CI. |
| QA-02 | Transverse | NC | 🟠 | QA | S | CI sans `build` ni e2e. |
| QA-03 | Compta/Pédago | NC | 🟠 | QA | M | Cœurs métier (facturation, parcours, BPF) non testés. |
| QA-04 | Transverse | A | 🟡 | QA | S | Pas de seuil de couverture. |
| QA-05 | Transverse | A | 🟡 | QA | M | Peu de parcours métier e2e bout-en-bout. |
| OPS-01 | Infra | F | 🔴 | OPS | S | Crons non authentifiés si `CRON_SECRET` absent. |
| OPS-02 | Infra | F | 🟠 | OPS | XS | Secret de cron accepté en query string (logué). |
| OPS-03 | Infra | NC | 🟠 | OPS | M | Prod réelle (OVH, ancienne) ≠ cible (Vercel). |
| OPS-04 | Sécurité | F | 🟠 | OPS | S | `SECRETS_ENCRYPTION_KEY` optionnelle → clés en clair. |
| OPS-05 | Infra | NC | 🟠 | OPS | M | Migrations non reproductibles (`db push`). |
| OPS-06 | Infra | NC | 🟠 | OPS | M | Backups/supervision non documentés/vérifiés. |
| SEC-01 | Sécurité/RGPD | F | 🔴 | SEC | M | Pièces sensibles (CNI…) sur URLs Blob publiques. |
| SEC-02 | Sécurité | F | 🔴 | SEC | S | Crons d'anonymisation/e-mails non authentifiables (=OPS-01/02). |
| SEC-03 | Sécurité/RGPD | F | 🔴 | SEC | L | Isolation tenant applicative à vérifier exhaustivement (=ARC-01). |
| SEC-04 | Sécurité | F | 🟠 | SEC | S | Chiffrement des secrets optionnel (=OPS-04). |
| SEC-05 | Sécurité | F | 🟠 | SEC | L | CSP `'unsafe-inline'` (surface XSS résiduelle). |
| SEC-06 | Sécurité | F | 🟠 | SEC | S | Rate-limit mémoire par instance sans Redis. |
| SEC-07 | RGPD | NC | 🟠 | SEC | M | Registre des traitements/DPA + export portabilité manquants. |
| MOA-01 | Compta | NC | 🔴 | MOA | M | Numérotation de factures non conforme (=BCK-01). |
| MOA-02 | Compta | NC | 🟠 | MOA | S | TVA/exonération OF non gérée (=BCK-04). |
| MOA-03 | Compta | B | 🟠 | MOA | S | Confusion devis « accepté » / facture « payée » (=BCK-02). |
| MOA-04 | Compta | NC | 🟠 | MOA | S | Immuabilité des factures émises non verrouillée. |
| MOA-05 | Qualiopi | NC | 🟡 | MOA | M | Agrégation/diffusion des indicateurs de résultats à confirmer. |
| QLP-01 | Qualiopi | B | 🔴 | QLP | S | Indicateurs Qualiopi non multi-tenant (=DB-02). |
| QLP-02 | Qualiopi | NC | 🟠 | QLP | S | Décalage de numérotation des indicateurs vs RNQ. |
| QLP-03 | Qualiopi | NC | 🟠 | QLP | M | Indicateurs de résultats (ind. 2-3) : calcul/diffusion à confirmer. |
| QLP-04 | Qualiopi | NC | 🟡 | QLP | S | Diffusion publique de l'information (ind. 1) dépend de la vitrine. |

**Décompte** : 🔴 9 critiques (dont recoupements) · 🟠 ~24 majeures · 🟡 ~13 mineures. Plusieurs critiques sont **le même problème vu sous 2 angles** (DB-02=QLP-01 ; OPS-01=SEC-02 ; ARC-01=DB-03=SEC-03).

---

## 2. Top 10 des actions critiques (priorité = sévérité × exposition ÷ effort)

| # | Action | Items couverts | Sév. | Effort | Pourquoi en priorité |
|---|--------|----------------|------|--------|----------------------|
| 1 | **Authentifier les crons** : `CRON_SECRET` obligatoire, en-tête Bearer seul, supprimer `?secret=`. Vérifier `rgpd-purge`/`suspend-trials`. | OPS-01, OPS-02, SEC-02 | 🔴 | XS-S | Quick-win : referme une porte sur l'anonymisation/les envois. |
| 2 | **Corriger l'unicité multi-tenant des indicateurs Qualiopi** (`@@unique([organismeId,numero])`). | DB-02, QLP-01 | 🔴 | S | Débloque le module Qualiopi pour tout 2ᵉ client. |
| 3 | **Corriger l'unicité des références** (facture/session/convention/contrat/formation/cours) → par tenant + génération atomique. | DB-01, BCK-01, MOA-01 | 🔴 | M | Débloque le multi-client + conformité légale des factures. |
| 4 | **Protéger les pièces sensibles** : Blob privé + accès via proxy authentifié uniquement. | SEC-01 | 🔴 | M | Stoppe une fuite RGPD de documents (CNI, diplômes). |
| 5 | **Auditer/sceller l'isolation tenant** : revue exhaustive des accès `prisma` brut + test d'isolation en CI + cap RLS. | ARC-01, DB-03, SEC-03, QA-01 | 🔴 | M-L | Garantit qu'aucun OF ne voit les données d'un autre. |
| 6 | **Rendre `SECRETS_ENCRYPTION_KEY` obligatoire** en prod + re-chiffrer l'existant. | SEC-04, OPS-04 | 🟠 | S | Plus de secrets tiers en clair. |
| 7 | **Fiabiliser la facturation** : séquence atomique, exonération TVA, immuabilité, devis≠facture. | BCK-02/04, MOA-02/03/04 | 🟠 | M | Documents comptables justes et conformes. |
| 8 | **Durcir la CI** : `build` + e2e + test d'isolation sur base de test. | QA-01, QA-02, QA-03 | 🟠 | M | La CI cesse de donner une fausse assurance. |
| 9 | **Statuer sur l'hébergement** (Vercel + DNS, ou VPS maîtrisé) + migrations versionnées + backups/supervision documentés. | OPS-03, OPS-05, OPS-06, DB-04 | 🟠 | M-L | Exploitation reproductible et supervisée. |
| 10 | **Conformité RGPD documentaire** : registre des traitements, suivi DPA, export de portabilité. | SEC-07 | 🟠 | M | Complète les droits des personnes (art. 15/17/20, 30). |

---

## 3. Feuille de route en 3 phases

### Phase 2A — Corrections urgentes (avant 2ᵉ client & vraies données apprenants)
Top 10 #1 à #6 : crons, unicité multi-tenant (indicateurs + références), pièces privées, isolation+test CI, clé de chiffrement obligatoire. **Effort global : ~1,5–2,5 semaines.** C'est le **prérequis de commercialisation multi-client**.

### Phase 2B — Conformité & robustesse
Top 10 #7 à #10 : facturation légale, durcissement CI, hébergement/migrations/backups, RGPD documentaire. Plus : ARC-02 (dé-dup rôles), ARC-04 (authz JWT), QLP-02 (numérotation indicateurs), FRT-01/04 (feedback + a11y). **Effort : ~3–4 semaines.**

### Phase 3 — Améliorations (qualité produit & nouvelles fonctionnalités)
RLS complet, CSP à nonces, 2FA, observabilité, UI optimiste, extraction du parcours (ARC-03), couche cas d'usage (ARC-08), + fonctionnalités §5.

---

## 4. AVIS GLOBAL — le « bien avancé » est-il sain ?

**Oui, les fondations sont saines — il n'y a rien à jeter — mais 5-6 correctifs ciblés sont indispensables avant un lancement commercial multi-client.**

Ce projet n'est pas un prototype : c'est une application **mature, cohérente et remarquablement complète** (16 modules, ~40 modèles, chaîne métier OF fidèle, preuves Qualiopi générées et datées, sécurité au-dessus de la moyenne, tests et docs présents). L'architecture est propre (séparation edge/runtime, défense en profondeur des autorisations, cloisonnement centralisé).

Le constat clé : **les défauts critiques sont presque tous des effets de bord du mono-tenant de fait.** Tant qu'un seul organisme est réellement actif, les bugs d'unicité globale (DB-01, DB-02/QLP-01) et l'isolation purement applicative (ARC-01) restent **latents** — ils n'ont pas explosé parce que la situation ne les déclenche pas encore. Ils deviennent **bloquants dès le 2ᵉ client**. À cela s'ajoutent 3 points de sécurité/exploitation à fermer (crons OPS-01, pièces publiques SEC-01, secrets optionnels SEC-04) et la fiabilisation de la **facturation légale** (MOA-01/02/04).

**Verdict :** socle solide, **pas de refonte** ; un **chantier de consolidation ciblé (Phase 2A, ~2 semaines)** transforme un produit « démo mono-client » en **SaaS multi-tenant commercialisable**. La Phase 2B le met en pleine conformité (RGPD/facturation/Qualiopi), la Phase 3 le hisse au niveau « produit premium ».

---

## 5. Nouvelles fonctionnalités proposées (tu es ouvert)

Au-delà des correctifs, pistes à fort retour :
1. **Tableau de bord Qualiopi + export du dossier d'audit** (zip PDF par critère/indicateur, preuves rattachées, échéances réclamations/veille) — argument de vente n°1 pour un OF.
2. **Génération assistée du BPF** (pré-remplissage Cerfa 10443) à partir des données.
3. **Portail financeur / subrogation OPCO** (suivi des prises en charge, facturation directe au financeur, échéanciers + relances).
4. **Module conformité RGPD** : registre des traitements, suivi DPA sous-traitants, export de portabilité, journal de consentements consolidé.
5. **Indicateurs de résultats publiables** (réussite, satisfaction, insertion 6 mois) + page publique pour l'indicateur 1-3.
6. **2FA (TOTP)** pour ADMIN/SUPERADMIN + **journal d'activité** consultable par l'OF.
7. **Recherche globale / palette de commandes** et tableaux filtrables persistants pour les gestionnaires.
8. **Signature & émargement mobiles** optimisés terrain (mode hors-ligne léger).

---

## 6. Prochaine étape
Audit terminé (Livrables 1→3). **En attente de ta décision** : quels items du Top 10 lancer en Phase 2A, dans quel ordre. Je ne corrige rien sans ton feu vert, item par item.
