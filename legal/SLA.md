> ⚠️ **BROUILLON — à faire valider par un juriste + l'équipe technique.** Les valeurs `[…]` sont des cibles à confirmer sur la base de mesures réelles avant tout engagement contractuel.

# Convention de niveau de service (SLA) — OFManager

Annexe aux CGV (`CGV-abonnement-SaaS.md`). Définit les engagements de disponibilité, de support, de sauvegarde et de continuité du service OFManager.

## 1. Disponibilité

- **Taux de disponibilité mensuel cible : [99,5] %** (hors maintenances planifiées).
- Mesure : temps où le service applicatif répond, sur le mois calendaire.
- **Maintenances planifiées** : notifiées `[48 h]` à l'avance, réalisées de préférence en heures creuses ; non décomptées de l'indisponibilité.
- `[Optionnel]` **Crédits de service** en cas de non-atteinte : `[ex. avoir de X % de la mensualité par tranche d'indisponibilité]`.

## 2. Support

| Canal | Cible |
|---|---|
| E-mail / ticket | `[support@…]` |
| Horaires | `[jours ouvrés, 9h–18h]` |
| Prise en compte incident critique (service inaccessible) | `[< 4 h ouvrées]` |
| Prise en compte incident majeur | `[< 1 jour ouvré]` |
| Incident mineur / demande | `[< 3 jours ouvrés]` |

Niveaux de gravité : **Critique** (service indisponible), **Majeur** (fonction essentielle dégradée), **Mineur** (contournement possible).

## 3. Sauvegardes

- Base de données : sauvegardes **automatiques** + restauration à un instant T (**PITR**) via l'hébergeur Neon.
- Rétention : `[ex. 7 jours PITR + sauvegardes quotidiennes 30 jours]` `[à confirmer selon offre Neon]`.
- Les documents (PDF) et pièces déposées sont `[stockés/inclus dans les sauvegardes — à préciser]`.

## 4. Plan de reprise d'activité (PRA)

- **RTO (délai de remise en service) cible : [4] h.**
- **RPO (perte de données maximale) cible : [1] h** (borné par la fréquence PITR).
- La procédure de restauration doit être **documentée et testée** au moins `[une fois par an]` (cf. audit OPS-2). *À ce stade : PITR disponible, procédure de restauration à formaliser et éprouver avant engagement ferme.*

## 5. Sécurité et hébergement

- Hébergement **UE** `[Vercel + Neon + Upstash — régions à confirmer]`.
- Mesures de sécurité détaillées au **DPA** (`DPA-sous-traitance.md`, § 7).
- Surveillance / alerting : `[à mettre en place — Sentry/observabilité, cf. OPS-4]`.

## 6. Exclusions

Ne sont pas couverts : indisponibilités dues à un cas de force majeure, au réseau/appareil du Client, à un usage non conforme, aux services tiers hors du contrôle de l'Éditeur, aux maintenances planifiées notifiées.

## 7. Réversibilité

Le Client peut exporter ses données à tout moment (cf. `clause-reversibilite.md`).

---

**Version [x.y] — [date].**
