# Rapport d'anomalies — Lot P2 (support métier)

> Périmètre P2 : finance (devis/factures/trésorerie), CRM/leads/scoring,
> Qualiopi/BPF/RGPD, portails externes, e-learning apprenant.
> Méthode : revue de code ciblée sur les zones à risque + suite Vitest.

## Synthèse

**La plateforme est robuste sur tout le périmètre P2.** Les primitives de sécurité
(`getTenantDb`/`scopedPrisma`, `requireSection`, `STAFF`, numérotation atomique) sont
correctement employées dans la grande majorité des cas. **Aucune fuite inter-tenant
ni erreur de calcul confirmée.** 2 observations de faible priorité (défense en
profondeur / intégrité), aucune P1/P2.

| Zone | Verdict |
|---|---|
| **Finance** (devis) | ✅ TVA exonération gérée, totaux HT/TTC corrects, numérotation atomique, `acceptDevis` anti-rejeu, un devis accepté n'est pas compté « payé », authz `requireSection("facturation")` |
| **Numérotation** | ✅ Atomique (UPDATE increment + seed + fallback P2002) — anti-doublon/anti-trou concurrent |
| **Portail client** | ✅ Accès token-scopé, n'expose que les données de l'entreprise, branding tenant (repli icône générique) |
| **Scoring** | ✅ Fonction pure, bornes testées (chaud/tiède/froid, plafond 100) |
| **RGPD** | ✅ Cloisonné (getTenantDb), export/anonymisation audit-loggés, anonymisation conforme (conserve les enregistrements, efface le PII) |
| **Middleware** | ✅ Gating par rôle **et** section par chemin (matrice `SECTION_ROLES`, APPRENANT restreint, `/administration` ADMIN-only, filtrage par permissions) |

---

## BUG-OFM-010 — Actions sensibles sans garde de rôle par action (défense en profondeur)
- **Module / Fonction** : RGPD (`rgpd-actions.ts`) et un sous-ensemble d'actions
- **Sévérité** : Mineur · **Priorité** : P3 · **Confiance** : CONFIRMÉ (défaut de défense en profondeur, **non exploitable en l'état**)
- **Constat** : `createDataRequest`, `processDataRequest`, `exportDonneesPersonne`,
  `anonymiseCandidat` ne vérifient que `session?.user` (aucun `requireSection`/rôle),
  alors que le pattern existe (`devis` = `requireSection("facturation")`).
- **Pourquoi non exploitable aujourd'hui** : le **middleware bloque déjà** l'accès à
  `/rgpd` pour les rôles non autorisés (FORMATEUR/APPRENANT). Le client ne reçoit
  donc pas la référence d'action.
- **Pourquoi le corriger quand même** : bonne pratique Next.js — **une server action
  ne doit jamais dépendre du middleware** ; la même action peut être déclenchée
  depuis un chemin autorisé. `scopedPrisma` empêche déjà toute fuite inter-tenant.
- **Preuve** : `src/lib/actions/rgpd-actions.ts:10-11,23-24,46,86`.
- **Correctif proposé** : ajouter `requireSection("rgpd")` (et section adéquate) en
  tête de chaque action sensible.
- **Statut** : Ouvert

## BUG-OFM-011 — Score de quiz e-learning calculé côté client et non revalidé
- **Module / Fonction** : E-learning / `submitQuizResultat`
- **Sévérité** : Mineur · **Priorité** : P3 · **Confiance** : CONFIRMÉ (par conception)
- **Constat** : `submitQuizResultat(leconId, score, total)` stocke le `score` **envoyé
  par le client** sans recalcul serveur (commentaire : « calculé côté client pour
  QCU/QCM »). Un apprenant peut POSTer un score arbitraire (ex. 100 %).
- **Impact actuel** : faible — le quiz marque surtout la leçon « vue » (pédagogique).
- **Risque** : **si un quiz venait à conditionner une certification/un diplôme**, la
  validité serait compromise (fraude possible).
- **Preuve** : `src/lib/actions/learning-actions.ts:59-76`.
- **Correctif proposé** : conserver les bonnes réponses côté serveur et recalculer le
  score à la soumission (au moins pour les quiz certifiants).
- **Statut** : Ouvert (à traiter avant tout usage certifiant)

---

## Recommandation transverse
Ajouter un **garde-fou d'autorisation par server action** (ne pas dépendre du seul
middleware), en généralisant `requireSection`/`STAFF` aux actions mutantes sensibles.
À coupler avec l'extension du garde-fou d'isolation aux actions (cf. OBS-1 du lot P1).
Ces deux points sont de la **défense en profondeur** : aucun n'est exploitable en
l'état grâce au middleware + `scopedPrisma`, mais ils fiabilisent la base contre les
régressions futures.
