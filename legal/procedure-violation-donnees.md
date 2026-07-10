# Procédure de violation de données personnelles (RGPD art. 33-34)

> **À faire valider par un juriste / DPO.** En tant que **sous-traitant** (éditeur OFManager), votre obligation principale : **notifier sans délai** le responsable de traitement (l'OF client) concerné (art. 33-2). C'est ensuite lui qui notifie la CNIL (72 h) et, si nécessaire, les personnes concernées.

## Qu'est-ce qu'une violation ?
Toute destruction, perte, altération, divulgation ou accès non autorisé à des données personnelles — accidentel ou illicite. Exemples : fuite de données entre tenants, accès non autorisé à un compte, perte de base, e-mail envoyé au mauvais destinataire, ransomware.

## Chaîne d'alerte
1. **Détection** → toute personne (staff éditeur, alerte technique, signalement client) informe **immédiatement** le **référent sécurité/DPO**.
2. **Qualification** (référent) : est-ce une violation de données personnelles ? Quelle gravité (nombre de personnes, nature des données, risque) ?
3. **Confinement** : couper l'accès, révoquer les sessions/clés, isoler, corriger.

## Notification (délais)
| Étape | Délai | Qui → Qui |
|---|---|---|
| Notification au **client concerné** (responsable de traitement) | **Sans délai** après connaissance | Éditeur (sous-traitant) → OF client |
| Notification **CNIL** | **72 h** après en avoir eu connaissance | OF client (responsable) → CNIL |
| Information des **personnes concernées** | Sans délai si **risque élevé** | OF client → personnes |

**L'éditeur assiste le client** (art. 28-3-f) : fournit les éléments techniques (nature, périmètre, données et personnes concernées, mesures prises).

## Contenu de la notification (à préparer)
- Nature de la violation ; catégories et **nombre approximatif** de personnes et d'enregistrements concernés.
- Coordonnées du **point de contact** (DPO/référent).
- **Conséquences probables**.
- **Mesures prises ou proposées** (confinement, correction, atténuation).

## Registre des violations
Toute violation (même non notifiée) est **consignée** : date, faits, effets, mesures. Tenue par l'éditeur, à disposition du client et de la CNIL.

## À COMPLÉTER pour opérationnaliser
- [ ] Désigner le **référent sécurité / DPO** (nom + contact) et l'inscrire au DPA.
- [ ] Créer le **registre des violations** (fichier/outil).
- [ ] Modèle d'e-mail de notification client (pré-rédigé).
- [ ] Brancher un **monitoring/alerte** (erreurs, accès anormaux) — cf. audit OPS-4 (Sentry) — pour détecter vite.
- [ ] Tester la chaîne d'alerte une fois (exercice).
