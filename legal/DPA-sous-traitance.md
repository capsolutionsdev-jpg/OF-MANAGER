> ⚠️ **BROUILLON — à faire valider par un juriste avant signature.** Les mentions entre crochets `[…]` sont à compléter. Ce document ne constitue pas un conseil juridique.

# Accord de traitement des données (DPA)
### Annexe « Sous-traitance RGPD » aux Conditions Générales du service OFManager

**Entre :**

- **Le Sous-traitant** : **CAP SOLUTIONS**, éditeur du logiciel **OFManager**, [forme juridique], au capital de [montant], SIREN [n°], siège social [adresse], représentée par [nom, qualité] (ci-après « l'Éditeur » ou « le Sous-traitant ») ;

- **Le Responsable de traitement** : l'organisme de formation client souscripteur du service (ci-après « le Client » ou « le Responsable de traitement »), tel qu'identifié dans les Conditions Particulières / le bon de commande.

Le présent Accord encadre les traitements de données à caractère personnel réalisés par l'Éditeur **pour le compte** du Client, conformément à l'**article 28 du Règlement (UE) 2016/679 (RGPD)**.

---

## 1. Objet et durée

L'Éditeur traite les données personnelles **uniquement pour fournir le service OFManager** (gestion d'un organisme de formation : CRM, suivi pédagogique, facturation, conformité Qualiopi). Le traitement dure pendant toute la durée de l'abonnement, augmentée des durées de conservation légales et de réversibilité (§ 9).

## 2. Nature et finalité des traitements

| Finalité | Description |
|---|---|
| Gestion des prospects/candidats | CRM, inscriptions, dossiers administratifs |
| Suivi pédagogique | Sessions, émargements, évaluations, positionnement, satisfaction |
| Conformité Qualiopi | Preuves, indicateurs, documents (conventions, attestations) |
| Facturation | Devis, factures, paiements, BPF |
| E-learning | Comptes apprenants, progression |
| Hébergement, sauvegarde, support technique | Exploitation du service |

## 3. Catégories de personnes concernées

Prospects, apprenants/stagiaires, formateurs, contacts d'entreprises clientes/financeurs, collaborateurs de l'organisme (utilisateurs).

## 4. Catégories de données traitées

- **Identité / coordonnées** : nom, prénom, e-mail, téléphone, adresse, date de naissance.
- **Vie professionnelle** : situation professionnelle, employeur, financement (CPF, OPCO, France Travail…).
- **Données pédagogiques** : positionnement, résultats, émargements, satisfaction, signatures manuscrites (image), pièces justificatives déposées.
- **Données de facturation** : montants, mode de paiement, références.
- **Données de connexion** : identifiants, journaux techniques, adresse IP (traçabilité des signatures).

> ⚠️ **Données sensibles / handicap (indicateur Qualiopi 26)** : toute donnée relative à une situation de handicap est une donnée sensible (art. 9 RGPD). Elle ne doit être collectée que si strictement nécessaire, avec base légale appropriée, et fait l'objet de mesures de sécurité renforcées. `[Préciser le périmètre exact traité par le Client.]`

## 5. Obligations de l'Éditeur (sous-traitant)

L'Éditeur s'engage à :

1. Ne traiter les données que sur **instruction documentée** du Client (le présent Accord et l'usage du service valant instructions), sauf obligation légale.
2. Garantir la **confidentialité** (personnel autorisé, engagement de confidentialité).
3. Mettre en œuvre les **mesures de sécurité** de l'annexe § 7.
4. Respecter les conditions de **sous-traitance ultérieure** (§ 6).
5. **Assister** le Client pour répondre aux demandes d'exercice des droits (§ 8) et pour ses analyses d'impact (AIPD) le cas échéant.
6. **Notifier** au Client toute violation de données **dans les meilleurs délais** et au plus tard **48 heures** après en avoir pris connaissance (§ 8).
7. À la fin du contrat, **restituer puis supprimer** les données (§ 9 – réversibilité).
8. Mettre à disposition les informations nécessaires pour démontrer la conformité et permettre des **audits**.

## 6. Sous-traitants ultérieurs autorisés

Le Client autorise l'Éditeur à recourir aux sous-traitants ultérieurs suivants, sous contrat comportant des garanties équivalentes au présent Accord :

| Sous-traitant ultérieur | Rôle | Localisation |
|---|---|---|
| **Vercel** | Hébergement applicatif / CDN | UE `[à confirmer : région déployée]` |
| **Neon** | Base de données PostgreSQL | UE — `eu-central-1` (Francfort) |
| **Upstash** | Limitation de débit / cache Redis | UE `[région à confirmer]` |
| **[Fournisseur e-mail — ex. Resend]** | Envoi d'e-mails transactionnels | `[à confirmer]` |
| **Stripe** | Paiement en ligne de l'abonnement | UE/`[à confirmer]` |

Tout changement de sous-traitant ultérieur est notifié au Client, qui peut s'y opposer pour un motif légitime.

## 7. Mesures techniques et organisationnelles de sécurité

- **Cloisonnement multi-tenant** : chaque organisme est isolé (scoping applicatif systématique par `organismeId` + politique de sécurité au niveau base `[RLS PostgreSQL — en cours d'activation]`).
- **Chiffrement** : en transit (TLS/HTTPS), au repos (`[chiffrement disque hébergeur]`), secrets applicatifs chiffrés.
- **Authentification** : mots de passe hachés (bcrypt), double authentification (TOTP) disponible, limitation anti-force brute, session unique par compte.
- **Contrôle d'accès** : rôles et permissions granulaires ; principe du moindre privilège.
- **Journalisation** : traçabilité des actions sensibles (AuditLog).
- **Sauvegardes** : `[fréquence, rétention, PITR Neon]` (cf. SLA).
- **Confidentialité des équipes** de l'Éditeur.

## 8. Assistance, droits des personnes, violations

- L'Éditeur fournit au Client les **fonctions nécessaires** à l'exercice des droits (accès, rectification, effacement, portabilité) et à l'export (§ 9).
- Toute demande d'une personne concernée reçue par l'Éditeur est **transmise au Client** sans y répondre directement.
- **Violation de données** : notification au Client sous 48 h avec nature, catégories/volumes approximatifs, conséquences probables et mesures prises.

## 9. Sort des données en fin de contrat (réversibilité)

- Le Client peut, **à tout moment et à la résiliation**, obtenir un **export complet** de ses données au format ouvert (JSON/CSV + PDF des documents) — cf. `legal/clause-reversibilite.md`.
- À l'issue d'une période de réversibilité de **[30] jours** après la fin du contrat, l'Éditeur **supprime** les données, sauf conservation imposée par la loi (ex. factures : 10 ans ; preuves Qualiopi : durée applicable).

## 10. Localisation et transferts hors UE

Les données sont hébergées **dans l'Union européenne** `[à verrouiller et confirmer pour chaque sous-traitant ultérieur]`. Aucun transfert hors UE n'est réalisé sans garanties appropriées (clauses contractuelles types) et information du Client.

## 11. Responsabilité

Chaque partie assume la responsabilité de ses manquements au RGPD. La responsabilité de l'Éditeur s'exerce dans les limites prévues aux Conditions Générales / au contrat d'abonnement.

---

**Fait à [lieu], le [date].**

Pour l'Éditeur (Sous-traitant) : [nom, qualité, signature]
Pour le Client (Responsable de traitement) : [nom, qualité, signature]
