# Registre des incidents & violations de données — OFMANAGER

> Registre opérationnel des incidents de sécurité, de disponibilité et des **violations de données personnelles** (RGPD art. 33-5 : *toute* violation doit être documentée, qu'elle soit notifiée ou non à la CNIL).
> Tenu par l'éditeur (CAP SOLUTIONS). À compléter à **chaque** incident, sans délai.
> Cf. procédure : `legal/procedure-violation-donnees.md` · playbook technique : `docs/SECURITE-OPS.md §3`.

## Mode d'emploi

- **Un incident = une ligne** dans le tableau ci-dessous + une **fiche détaillée** en bas si violation de données personnelles.
- Renseigner **dès la détection**, compléter au fil de la résolution.
- Gravité : **Critique** (service indisponible / fuite de données) · **Majeur** (fonction essentielle dégradée) · **Mineur** (contournement possible).
- Violation de données personnelles → évaluer la notification **CNIL sous 72 h** (art. 33) + information des personnes si risque élevé (art. 34).

## Journal des incidents

| Date | Réf. | Type | Gravité | Données perso ? | Résumé | Cause racine | Mesures prises | Notif CNIL (date) | Statut |
|---|---|---|---|---|---|---|---|---|---|
| 2026-0x-xx | INC-2026-001 | Disponibilité / coûts | Mineur | Non | Dépassement du quota de transfert de données Neon | À documenter (volumétrie / requêtes) | À documenter | N/A (pas de violation de données) | À clôturer rétroactivement |
| _(nouvelle ligne à chaque incident)_ | | | | | | | | | |

## Fiches détaillées (violations de données personnelles uniquement)

> Pour chaque violation de données personnelles, dupliquer le bloc ci-dessous.

### INC-AAAA-NNN — <titre>
- **Date de détection / de survenance :**
- **Nature de la violation :** (confidentialité / intégrité / disponibilité)
- **Catégories et volume de données :** (candidats, pièces d'identité, factures… + nombre de personnes)
- **Origine :** (bug, erreur humaine, compromission, sous-traitant…)
- **Conséquences probables pour les personnes :**
- **Mesures prises / envisagées :** (containment, éradication, restauration, rotation de secrets…)
- **Notification CNIL :** oui/non — date — référence ; **information des personnes :** oui/non — date
- **Retour d'expérience / actions correctives :**

---
**Créé le 2026-08-30 (audit 09, A09-013).** Registre distinct du registre des traitements (art. 30, `legal/registre-traitements.md`).
