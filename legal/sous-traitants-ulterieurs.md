# Sous-traitants ultérieurs (RGPD art. 28-2 et 28-4)

> **À faire valider par un juriste.** L'éditeur (OFManager, sous-traitant) recourt aux fournisseurs ci-dessous pour héberger et traiter les données pour le compte des OF clients (responsables de traitement). Cette liste doit figurer au **DPA** ; toute modification doit être **notifiée aux clients** (droit d'objection).

Chaque fournisseur doit : (a) présenter des **garanties suffisantes** (art. 28), (b) avoir un **DPA/CCT** signé, (c) héberger dans l'**UE** (ou garanties de transfert adéquates).

| Sous-traitant ultérieur | Service | Localisation des données | DPA / garanties | Vérifications à faire |
|---|---|---|---|---|
| **Neon** | Base de données PostgreSQL | Région **UE** — `eu-central-1` (Francfort) *(confirmé sur l'endpoint)* | DPA disponible (section Legal du fournisseur) | ☐ Signer/archiver le DPA · ☐ Confirmer la région UE du projet |
| **Vercel** | Hébergement application, fonctions serverless, CDN | Fonctions à **épingler en région UE** (ex. Francfort `fra1`) ; CDN mondial (contenu non personnel) | Data Processing Addendum disponible | ☐ Épingler la région UE des fonctions · ☐ Signer/archiver le DPA |
| **Upstash** | Redis (rate-limit anti-brute-force) | Région **UE** à sélectionner | DPA disponible | ☐ Créer la base en région UE · ☐ Signer/archiver le DPA |
| **Resend** | Envoi des e-mails transactionnels | **États-Unis** (transfert hors UE) | DPA + **clauses contractuelles types (CCT)** à signer/archiver | ☐ Signer/archiver le DPA + CCT · ☐ Vérifier SPF/DKIM/DMARC de `ofmanager.info` · ☐ Limiter les données dans les e-mails (pas de données sensibles) |
| **Anthropic** (module IA, si activé) | Assistant IA (rédaction/résumé) | Traitement via API | Conditions entreprise / DPA | ☐ N'activer que si nécessaire · ☐ Ne pas envoyer de données sensibles · ☐ DPA |
| **Stripe** (si abonnement en ligne) | Paiement de l'abonnement SaaS | UE/международный, PCI-DSS | DPA disponible | ☐ Signer/archiver le DPA |

## Règles
- **Minimisation** : n'envoyer à chaque sous-traitant que les données strictement nécessaires (ex. e-mails : pas de données sensibles inutiles).
- **Chaîne de sous-traitance** : chaque sous-traitant ultérieur est soumis aux **mêmes obligations** que celles du DPA éditeur↔client (art. 28-4).
- **Transferts hors UE** : à proscrire par défaut ; si inévitable, encadrer par **CCT** (clauses contractuelles types) + mesures supplémentaires.
- **Journal** : conserver, pour chaque fournisseur, le **DPA signé** + la **preuve de localisation UE**.

## Action
Récupérer et **archiver le DPA de chaque fournisseur** (téléchargeable dans la section « Legal / Trust / DPA » de leur site), **confirmer la configuration de région UE**, et **annexer la liste au DPA** que vous signez avec vos clients (`DPA-sous-traitance.md`).
