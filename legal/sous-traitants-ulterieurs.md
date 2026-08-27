# Sous-traitants ultérieurs (RGPD art. 28-2 et 28-4)

> **À faire valider par un juriste.** L'éditeur (OFManager, sous-traitant) recourt aux fournisseurs ci-dessous pour héberger et traiter les données pour le compte des OF clients (responsables de traitement). Cette liste doit figurer au **DPA** ; toute modification doit être **notifiée aux clients** (droit d'objection).

Chaque fournisseur doit : (a) présenter des **garanties suffisantes** (art. 28), (b) avoir un **DPA/CCT** signé, (c) héberger dans l'**UE** (ou garanties de transfert adéquates).

| Sous-traitant ultérieur | Service | Localisation des données | DPA / garanties | Vérifications à faire |
|---|---|---|---|---|
| **Neon** | Base de données PostgreSQL | Région **UE** — `eu-central-1` (Francfort) *(confirmé sur l'endpoint)* | DPA disponible (section Legal du fournisseur) | ☐ Signer/archiver le DPA · ☐ Confirmer la région UE du projet |
| **Vercel** | Hébergement application, fonctions serverless, CDN | Fonctions épinglées **UE** (`fra1`, cf. `vercel.json`) ; CDN mondial (contenu non personnel) | Data Processing Addendum disponible | ☐ Signer/archiver le DPA |
| **Vercel Blob** | Stockage de fichiers (**photos d'identité, signatures**, PDF) | Région du store à **confirmer/épingler UE** | DPA Vercel | ☐ Confirmer la région UE · ☐ Passer les pièces sensibles en accès privé (URL signées) — cf. audit A02-009 |
| **Upstash** | Redis (rate-limit anti-brute-force) | Région **UE** à sélectionner | DPA disponible | ☐ Créer la base en région UE · ☐ Signer/archiver le DPA |
| **Resend** ⚠️ | E-mail transactionnel — **fournisseur PRIORITAIRE** dès que `RESEND_API_KEY` est défini (cf. `lib/email.ts`) | **États-Unis** (`api.resend.com`) | **CCT / Data Privacy Framework requis** | ☐ Signer les CCT / vérifier l'adhésion DPF · **OU** ☐ basculer sur Brevo (UE) en retirant `RESEND_API_KEY` — cf. audit A02-001 |
| **Brevo** | E-mail transactionnel — **repli** si `RESEND_API_KEY` absent | Éditeur **UE** (France), serveurs UE | DPA disponible (RGPD natif) | ☐ Signer/archiver le DPA · ☐ Limiter les données dans les e-mails |
| **Anthropic** (IA texte, si activé) | Assistant IA (rédaction/résumé) | **États-Unis** (API) | Conditions entreprise / DPA + CCT/DPF | ☐ N'activer que si nécessaire · ☐ Ne pas envoyer de données sensibles · ☐ CCT/DPF |
| **OpenAI** (IA images, si activé) | Génération d'images (`lib/image-gen.ts`) | **États-Unis** (`api.openai.com`) | DPA + CCT/DPF | ☐ N'activer que si nécessaire · ☐ Ne pas envoyer de PII · ☐ CCT/DPF |
| **YouSign** (e-signature, si activé) | Signature électronique (**identité + documents** à signer) | **UE (France)** — à confirmer | DPA disponible | ☐ Confirmer la localisation UE · ☐ Signer/archiver le DPA |
| **Sentry** (supervision erreurs, si activé) | Monitoring des erreurs applicatives | **États-Unis** par défaut (option région UE) | DPA + CCT/DPF ou région UE | ☐ Activer la région UE **OU** signer les CCT · ☐ Scrubber les PII des events |
| **Cloudflare Turnstile** | Captcha anti-robot (route `verification`) | Mondial (Cloudflare) | DPA Cloudflare | ☐ Signer/archiver le DPA |
| **Stripe** (abonnement + prépa civique) | Paiement | UE/international, PCI-DSS | DPA disponible | ☐ Signer/archiver le DPA |

> ⚠️ **Transferts hors UE actuellement actifs** (audit A02-001) : **Resend**, **OpenAI**, **Anthropic** et **Sentry** traitent des données aux **États-Unis**. Tant qu'aucun mécanisme (CCT/DPF) n'est signé et documenté — ou qu'on n'a pas basculé sur des équivalents UE — ces transferts ne sont **pas** couverts. La politique de confidentialité et le DPA §6 doivent refléter cet état réel (ne pas affirmer « 100 % UE »).

## Règles
- **Minimisation** : n'envoyer à chaque sous-traitant que les données strictement nécessaires (ex. e-mails : pas de données sensibles inutiles).
- **Chaîne de sous-traitance** : chaque sous-traitant ultérieur est soumis aux **mêmes obligations** que celles du DPA éditeur↔client (art. 28-4).
- **Transferts hors UE** : à proscrire par défaut ; si inévitable, encadrer par **CCT** (clauses contractuelles types) + mesures supplémentaires.
- **Journal** : conserver, pour chaque fournisseur, le **DPA signé** + la **preuve de localisation UE**.

## Action
Récupérer et **archiver le DPA de chaque fournisseur** (téléchargeable dans la section « Legal / Trust / DPA » de leur site), **confirmer la configuration de région UE**, et **annexer la liste au DPA** que vous signez avec vos clients (`DPA-sous-traitance.md`).
