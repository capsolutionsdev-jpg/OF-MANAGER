> ⚠️ **BROUILLON — à faire valider par un juriste.** Mentions `[…]` à compléter.

# Clause de réversibilité — OFManager

Annexe aux CGV (`CGV-abonnement-SaaS.md`). Garantit au Client la maîtrise et la récupération de ses données.

## 1. Principe

Les **données saisies par le Client** (candidats, sessions, inscriptions, documents, facturation, etc.) demeurent sa **propriété**. Le Client peut les récupérer à tout moment, sans surcoût, pendant toute la durée du contrat et durant la période de réversibilité post-résiliation.

## 2. Export en autonomie (à tout moment)

Depuis **Administration → « Export de mes données »**, l'ADMIN de l'organisme télécharge l'intégralité de ses données au **format ouvert JSON** (candidats, entreprises, formateurs, formations, sessions, inscriptions, devis, factures, paiements…). Les **documents PDF** (conventions, attestations, factures, émargements) restent téléchargeables individuellement depuis l'application.

> Mise en œuvre technique : route `GET /administration/export` (réservée ADMIN, scopée à l'organisme). Voir aussi les exports CSV/Excel/PDF existants par module.

## 3. Réversibilité à la résiliation

- Pendant une période de **[30] jours** après la fin du contrat, le service reste accessible en **lecture/export** `[ou : l'Éditeur fournit un export complet sur demande]`, afin que le Client récupère l'ensemble de ses données.
- Sur demande, l'Éditeur fournit un **export consolidé** (JSON/CSV + archive des PDF) dans un délai de **[15] jours** `[à confirmer]`.
- Formats : ouverts et documentés (JSON, CSV, PDF).

## 4. Suppression après réversibilité

À l'issue de la période de réversibilité, l'Éditeur **supprime** les données du Client de ses systèmes actifs et sauvegardes (dans les cycles de rotation), **sauf** obligation légale de conservation :

| Donnée | Conservation minimale |
|---|---|
| Factures / pièces comptables | **10 ans** (obligations fiscales/commerciales) |
| Preuves Qualiopi (émargements, attestations, évaluations) | Durée requise par le certificateur / cycle d'audit |
| Autres données personnelles sans obligation légale | Supprimées / anonymisées |

Cf. **matrice de conservation** (RGPD ⇄ Qualiopi ⇄ Comptabilité) et le **DPA** (`DPA-sous-traitance.md`, § 9).

## 5. Assistance

L'Éditeur assiste le Client, dans des conditions raisonnables, pour la reprise de ses données vers une autre solution (documentation du format d'export, réponses techniques). Toute prestation spécifique de migration fait l'objet d'un devis distinct.

---

**Version [x.y] — [date].**
