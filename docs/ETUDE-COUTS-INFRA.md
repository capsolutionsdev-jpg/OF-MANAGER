# Étude de coûts d'infrastructure — OFManager

> Modèle de coûts d'exploitation pour dimensionner la marge par palier tarifaire et
> poser des alertes de dépense (audit A08-024). À affiner avec les **factures réelles**.
> Grille de vente actuelle : 49 / 99 / 179 €/mois (cf. `docs/TARIFS-et-offres.md`).

## 1. Coûts FIXES (indépendants du nombre d'OF)

| Poste | Plan cible | Coût mensuel indicatif |
|---|---|---|
| **Vercel** | **Pro** (requis : usage commercial + 8 crons + wildcard éventuel) | ~20 $/membre |
| **Neon** | Launch/Scale (rétention PITR ≥ 7 j — cf. audit 09) | ~19–69 $ selon compute + rétention |
| **Resend** | Free (3 k mails/mois) → Pro (50 k) | 0 → ~20 $ |
| **Upstash Redis** | Pay-as-you-go (rate-limit) | ~0–10 $ |
| **Domaine OVH** | `ofmanager.info` | ~1 €/mois amorti |
| **Sentry** | Team (si activé) | 0 (dev) → ~26 $ |

**Socle ≈ 40–120 $/mois** selon les paliers Neon / Resend / Sentry retenus.

## 2. Coûts VARIABLES (par OF / par usage)

| Ressource | Facteur de coût | Ordre de grandeur |
|---|---|---|
| **Neon — transfert & compute** | requêtes + volume lu (`dossierPdf` base64 exclu par `PRISMA_OMIT`) | **principal** poste variable ; un dépassement de quota transfert est déjà survenu |
| **Vercel — invocations & bande passante** | trafic + génération PDF (Chromium, fonctions 1769 Mo) | modéré ; les PDF sont les fonctions les plus lourdes |
| **Vercel Blob** | Go stockés + bande passante (documents, pièces) | croît avec le nombre de candidats / documents |
| **Resend** | e-mails transactionnels envoyés | ~linéaire au nombre d'inscriptions |
| **IA (Anthropic)** | tokens générés | **maîtrisé** : modèle Haiku par défaut (`AI_MODEL`), ~5× moins cher qu'Opus ; refacturable par OF (clé propre) |
| **SMS (Brevo)** | quota `maxSmsMois` par OF | refacturable / plafonné par OF |

## 3. Points de vigilance
- **Neon transfert** = le poste le plus susceptible d'exploser à l'échelle (garde-fou
  `PRISMA_OMIT` en place ; surveiller les listes non paginées — cf. audit 07).
- **IA / SMS** = portés par l'OF (clés par organisme) → coût variable refacturé.
- **Vercel Blob** = stockage cumulatif ; la purge RGPD supprime les blobs à
  l'anonymisation candidat (`src/lib/rgpd/anonymise.ts`).

## 4. Alertes de dépense (à poser)
- **Vercel** → *Settings → Billing → Spend Management* : plafond + alerte e-mail.
- **Neon** → *Billing / Usage* : alerte sur compute-hours et data transfer.
- **Anthropic / Resend / Upstash** : alertes de quota dans chaque console.

## 5. Marge par palier (à valider avec les factures réelles)
Après 1–2 mois de facturation réelle, renseigner le coût moyen par OF actif et le
comparer aux paliers pour figer le seuil de rentabilité et les limites d'inclusion
(e-mails, SMS, stockage) au-delà desquelles facturer le dépassement.

| Palier | Prix | Coût/OF estimé | Marge |
|---|---|---|---|
| Essentiel | 49 € | _à mesurer_ | _à calculer_ |
| Pro | 99 € | _à mesurer_ | _à calculer_ |
| Avancé | 179 € | _à mesurer_ | _à calculer_ |
