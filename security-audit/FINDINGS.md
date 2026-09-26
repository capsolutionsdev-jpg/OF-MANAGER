# OFManager — Tableau des findings (Phases 44/46)

> Cible : prod `7a198cd`. 47 findings retenus après vérification adversariale, 5 faux positifs écartés.
> Détail complet (description, exploit, repro, raisonnement de vérif) : `findings-raw.json`.

**Répartition** : HIGH 3 · MEDIUM 13 · LOW 13 · INFO 15

| ID | Sévérité | Vulnérabilité | Composant | Fichier | Verdict |
|---|---|---|---|---|---|
| OFM-01 | HIGH | BFLA : le rôle ENTREPRISE (client B2B externe) peut piloter la gestion des clients pro et exfiltrer la PII des | server-actions | `src/lib/actions/client-pro-actions.ts:16` | CONFIRMED/high |
| OFM-02 | HIGH _(init. INFO)_ | Vulnerabilites transitives npm audit hors chemin d'execution des requetes | supply-chain-nextjs | `package.json:80` | PARTIAL/high |
| OFM-03 | HIGH | XSS stockée via la photo du candidat (photoUrl) : du formulaire parcours public vers la session d'un ADMIN + l | xss | `src/lib/documents/resolve.ts:84` | CONFIRMED/high |
| OFM-04 | MEDIUM | Exports massifs de PII (base candidats complete, dump JSON du tenant) non tracés dans le journal d'audit | data-logs-audit | `src/app/(app)/candidats/export/route.ts:19` | CONFIRMED/high |
| OFM-05 | MEDIUM | Droit à l'effacement (RGPD art. 17) incomplet : EmailLog conserve e-mail + corps personnalisé après anonymisat | data-logs-audit | `src/lib/rgpd/anonymise.ts:184` | PARTIAL/high |
| OFM-06 | MEDIUM | Injection de formule CSV dans l'export comptable des écritures (csvCell sans neutralisation) | injection-csv-path | `src/lib/compta/exports-compta.ts:138` | CONFIRMED/high |
| OFM-07 | MEDIUM | BFLA : createFormateur/updateFormateur exécutables par des rôles non-staff (APPRENANT/FORMATEUR/ENTREPRISE) | multi-tenant-idor | `src/lib/actions/formateur-actions.ts:85` | CONFIRMED/high |
| OFM-08 | MEDIUM | BFLA : publication/modification de contenu PUBLIC (blog vitrine, galerie photos) sans garde personnel | multi-tenant-idor | `src/lib/actions/article-actions.ts:41` | CONFIRMED/high |
| OFM-09 | MEDIUM | BFLA : actions de gestion T3P / Qualiopi / Réclamations sans garde personnel | multi-tenant-idor | `src/lib/actions/qualiopi-actions.ts:29` | CONFIRMED/high |
| OFM-10 | MEDIUM | BFLA sur le workflow de validation : un utilisateur non-staff (APPRENANT/FORMATEUR/ENTREPRISE) peut creer, val | rbac-escalade | `src/lib/actions/validation-actions.ts:70` | CONFIRMED/high |
| OFM-11 | MEDIUM | Contournement de revocation de session et de suspension de tenant : une serie de Server Actions staff n'appell | rbac-escalade | `src/lib/actions/document-actions.ts:17` | CONFIRMED/high |
| OFM-12 | MEDIUM | Fuite de stack trace en production sur la route publique de téléchargement de documents (parcours/[token]/docu | secrets-config | `src/app/parcours/[token]/documents/route.ts:49` | CONFIRMED/high |
| OFM-13 | MEDIUM | Même cause racine : le rôle ENTREPRISE peut altérer la configuration des tests de positionnement des formation | server-actions | `src/lib/actions/positionnement-actions.ts:13` | CONFIRMED/high |
| OFM-14 | MEDIUM _(init. INFO)_ | Confiance dans l'entrepriseId client sans vérification d'appartenance tenant (défense en profondeur) | server-actions | `src/lib/actions/devis-actions.ts:49` | CONFIRMED/high |
| OFM-15 | MEDIUM _(init. INFO)_ | Rendu PDF Chromium sans restriction d'egress ni interception de requetes (puits SSRF latent, non exploitable e | ssrf-pdf | `src/lib/pdf.ts:63` | PARTIAL/high |
| OFM-16 | MEDIUM _(init. HIGH)_ | XSS stockée (côté serveur/PDF) via les signatures en data URL : validateur strict isValidSignatureDataUrl prés | xss | `src/lib/documents/build-pdf.ts:136` | CONFIRMED/high |
| OFM-17 | LOW | Jeton d'invitation entreprise stocké EN CLAIR en base (incohérent avec le jeton de reset, lui haché) | auth-session | `src/lib/actions/entreprise-account-actions.ts:73` | CONFIRMED/high |
| OFM-18 | LOW | Expiration des liens tokenisés de parcours/signature vérifiée uniquement dans la vue, pas dans les Server Acti | business-logic | `src/lib/actions/parcours-actions.ts:658` | CONFIRMED/medium |
| OFM-19 | LOW | submitParcoursForm n'a pas de garde d'idempotence : écrasement illimité de la PII candidat via le jeton de par | business-logic | `src/lib/actions/parcours-actions.ts:214` | CONFIRMED/high |
| OFM-20 | LOW | Quota de sièges back-office (maxComptes du plan) : contrôle TOCTOU non atomique, contournable par créations co | business-logic | `src/lib/actions/admin-actions.ts:70` | CONFIRMED/high |
| OFM-21 | LOW | SmsLog : aucune purge de rétention et corps du SMS non effacé à l'anonymisation (rétention illimitée de numéro | data-logs-audit | `src/lib/rgpd-retention.ts:69` | CONFIRMED/high |
| OFM-22 | LOW | Incoherence Cache-Control : routes PDF/ZIP authentifiees servant de la PII candidat sans 'private, no-store' | headers-cache-redirect-cors | `src/app/documents/[inscriptionId]/pdf/route.ts:51` | CONFIRMED/high |
| OFM-23 | LOW | civique/ai : rate-limit de cout NON fail-closed, avec repli sur la cle Anthropic GLOBALE de l'editeur | public-endpoints | `src/app/api/civique/ai/route.ts:109` | PARTIAL/high |
| OFM-24 | LOW | PUT civique/candidates/[id]/state : ecriture non bornee (createMany illimite) sans rate-limit | public-endpoints | `src/lib/civique-api.ts:419` | CONFIRMED/high |
| OFM-25 | LOW | Server Actions d'envoi déclenchables par tout compte authentifié (rôle staff non vérifié) | server-actions | `src/lib/actions/contrat-formateur-actions.ts:23` | CONFIRMED/high |
| OFM-26 | LOW | DoS via image-size (@turbodocx/html-to-docx) sur images base64 tenant/candidat | supply-chain-nextjs | `src/lib/documents/build-zip.ts:142` | CONFIRMED/high |
| OFM-27 | LOW | PII stockees sur Vercel Blob en acces PUBLIC permanent (protection = secret de l'URL seul), URL brute renvoyee | upload-download | `src/lib/blob.ts:21` | CONFIRMED/high |
| OFM-28 | LOW _(init. MEDIUM)_ | Secret du webhook Brevo transmis en QUERY STRING (fuite dans les journaux) | webhooks | `src/app/api/webhooks/brevo/route.ts:39` | CONFIRMED/high |
| OFM-29 | LOW | Provisioning civique non idempotent : civicMentions:{push} rejoue a chaque livraison Stripe | webhooks | `src/lib/civique-api.ts:510` | CONFIRMED/high |
| OFM-30 | INFO | Actions 2FA en self-service (enrôlement/confirmation/désactivation) sans revalidation de vivacité de session | auth-session | `src/lib/actions/totp-actions.ts:15` | CONFIRMED/high |
| OFM-31 | INFO | Anti-double-paiement fondé sur une fenêtre heuristique de 10 s, pas sur une idempotence atomique | business-logic | `src/lib/actions/paiement-actions.ts:60` | CONFIRMED/high |
| OFM-32 | INFO _(init. LOW)_ | Accès SUPERADMIN en lecture aux données d'un tenant (console) non tracé dans le journal d'audit | data-logs-audit | `src/app/console/[id]/page.tsx:129` | CONFIRMED/high |
| OFM-33 | INFO | Sur-lecture include:{ user: true } sur AuditLog charge des colonnes secrètes (passwordHash, resetTokenHash, to | data-logs-audit | `src/app/(app)/candidats/[id]/historique/page.tsx:29` | CONFIRMED/high |
| OFM-34 | INFO | CORS wildcard '*' sur les endpoints d'ecriture de l'API civique (GET/PUT/POST + Authorization) | headers-cache-redirect-cors | `src/lib/civique-api.ts:37` | CONFIRMED/high |
| OFM-35 | INFO _(init. LOW)_ | Injection de formule dans le fichier FEC (.txt) — serializeFec sans garde anti-formule | injection-csv-path | `src/lib/compta/fec.ts:209` | PARTIAL/medium |
| OFM-36 | INFO | Neutralisation anti-formule incomplète (TAB/CR en tête) dans deux sérialiseurs CSV secondaires | injection-csv-path | `src/lib/suivi6mois-csv.ts:44` | PARTIAL/high |
| OFM-37 | INFO | checkout/[id] : renvoie le civicToken (credential e-learning + PII) sur simple presentation d'un id de session | public-endpoints | `src/app/api/civique/checkout/[id]/route.ts:45` | CONFIRMED/high |
| OFM-38 | INFO | organisme/[id]/logo et photos/[id] : recuperation binaire par ID sans cloisonnement fort (donnees publiques) | public-endpoints | `src/app/api/public/organisme/[id]/logo/route.ts:18` | PARTIAL/high |
| OFM-39 | INFO _(init. LOW)_ | updateCollaborateur ne protege ni le compte courant ni un autre ADMIN : un gerant peut retrograder/neutraliser | rbac-escalade | `src/lib/actions/admin-actions.ts:103` | PARTIAL/high |
| OFM-40 | INFO | INFO - Un ADMIN de tenant traverse le middleware sur /api/console/* (seg="api"), mais tous les handlers se re- | rbac-escalade | `src/auth.config.ts:57` | CONFIRMED/high |
| OFM-41 | INFO _(init. HIGH)_ | next@16.3.1 en production : advisory critique RCE Image Optimization (AVIF) non patche, surface exposee | supply-chain-nextjs | `package.json:48` | PARTIAL/high |
| OFM-42 | INFO | next-auth 5.0.0-beta.32 (pre-release BETA) sur le chemin d'authentification en production | supply-chain-nextjs | `package.json:49` | PARTIAL/high |
| OFM-43 | INFO | Webhook Wedof sans anti-rejeu (aucun horodatage/nonce dans la signature) | webhooks | `src/app/api/webhooks/wedof/[orgId]/route.ts:34` | CONFIRMED/high |
| OFM-44 | INFO | Oracle d'enumeration d'organismes Wedof (404 vs 401) | webhooks | `src/app/api/webhooks/wedof/[orgId]/route.ts:31` | CONFIRMED/high |

## BLOCKER AVANT COMMERCIALISATION

- **OFM-03** [HIGH] XSS stockée via la photo du candidat (photoUrl) : du formulaire parcours public vers la session d'un ADMIN + le Chromium headless de générat — `src/lib/documents/resolve.ts:84`

## À CORRIGER RAPIDEMENT (High / Medium)

- **OFM-01** [HIGH] BFLA : le rôle ENTREPRISE (client B2B externe) peut piloter la gestion des clients pro et exfiltrer la PII des candidats — `src/lib/actions/client-pro-actions.ts:16`
- **OFM-02** [HIGH] Vulnerabilites transitives npm audit hors chemin d'execution des requetes — `package.json:80`
- **OFM-04** [MEDIUM] Exports massifs de PII (base candidats complete, dump JSON du tenant) non tracés dans le journal d'audit — `src/app/(app)/candidats/export/route.ts:19`
- **OFM-05** [MEDIUM] Droit à l'effacement (RGPD art. 17) incomplet : EmailLog conserve e-mail + corps personnalisé après anonymisation — `src/lib/rgpd/anonymise.ts:184`
- **OFM-06** [MEDIUM] Injection de formule CSV dans l'export comptable des écritures (csvCell sans neutralisation) — `src/lib/compta/exports-compta.ts:138`
- **OFM-07** [MEDIUM] BFLA : createFormateur/updateFormateur exécutables par des rôles non-staff (APPRENANT/FORMATEUR/ENTREPRISE) — `src/lib/actions/formateur-actions.ts:85`
- **OFM-08** [MEDIUM] BFLA : publication/modification de contenu PUBLIC (blog vitrine, galerie photos) sans garde personnel — `src/lib/actions/article-actions.ts:41`
- **OFM-09** [MEDIUM] BFLA : actions de gestion T3P / Qualiopi / Réclamations sans garde personnel — `src/lib/actions/qualiopi-actions.ts:29`
- **OFM-10** [MEDIUM] BFLA sur le workflow de validation : un utilisateur non-staff (APPRENANT/FORMATEUR/ENTREPRISE) peut creer, valider/refuser et supprimer des  — `src/lib/actions/validation-actions.ts:70`
- **OFM-11** [MEDIUM] Contournement de revocation de session et de suspension de tenant : une serie de Server Actions staff n'appellent jamais assertLiveSession() — `src/lib/actions/document-actions.ts:17`
- **OFM-12** [MEDIUM] Fuite de stack trace en production sur la route publique de téléchargement de documents (parcours/[token]/documents) — `src/app/parcours/[token]/documents/route.ts:49`
- **OFM-13** [MEDIUM] Même cause racine : le rôle ENTREPRISE peut altérer la configuration des tests de positionnement des formations — `src/lib/actions/positionnement-actions.ts:13`
- **OFM-14** [MEDIUM] Confiance dans l'entrepriseId client sans vérification d'appartenance tenant (défense en profondeur) — `src/lib/actions/devis-actions.ts:49`
- **OFM-15** [MEDIUM] Rendu PDF Chromium sans restriction d'egress ni interception de requetes (puits SSRF latent, non exploitable en l'etat) — `src/lib/pdf.ts:63`
- **OFM-16** [MEDIUM] XSS stockée (côté serveur/PDF) via les signatures en data URL : validateur strict isValidSignatureDataUrl présent mais branché sur 1 seul de — `src/lib/documents/build-pdf.ts:136`

## HARDENING (Low / Informational)

- **OFM-17** [LOW] Jeton d'invitation entreprise stocké EN CLAIR en base (incohérent avec le jeton de reset, lui haché) — `src/lib/actions/entreprise-account-actions.ts:73`
- **OFM-18** [LOW] Expiration des liens tokenisés de parcours/signature vérifiée uniquement dans la vue, pas dans les Server Actions qui écrivent — `src/lib/actions/parcours-actions.ts:658`
- **OFM-19** [LOW] submitParcoursForm n'a pas de garde d'idempotence : écrasement illimité de la PII candidat via le jeton de parcours, même après signature — `src/lib/actions/parcours-actions.ts:214`
- **OFM-20** [LOW] Quota de sièges back-office (maxComptes du plan) : contrôle TOCTOU non atomique, contournable par créations concurrentes — `src/lib/actions/admin-actions.ts:70`
- **OFM-21** [LOW] SmsLog : aucune purge de rétention et corps du SMS non effacé à l'anonymisation (rétention illimitée de numéros + contenu) — `src/lib/rgpd-retention.ts:69`
- **OFM-22** [LOW] Incoherence Cache-Control : routes PDF/ZIP authentifiees servant de la PII candidat sans 'private, no-store' — `src/app/documents/[inscriptionId]/pdf/route.ts:51`
- **OFM-23** [LOW] civique/ai : rate-limit de cout NON fail-closed, avec repli sur la cle Anthropic GLOBALE de l'editeur — `src/app/api/civique/ai/route.ts:109`
- **OFM-24** [LOW] PUT civique/candidates/[id]/state : ecriture non bornee (createMany illimite) sans rate-limit — `src/lib/civique-api.ts:419`
- **OFM-25** [LOW] Server Actions d'envoi déclenchables par tout compte authentifié (rôle staff non vérifié) — `src/lib/actions/contrat-formateur-actions.ts:23`
- **OFM-26** [LOW] DoS via image-size (@turbodocx/html-to-docx) sur images base64 tenant/candidat — `src/lib/documents/build-zip.ts:142`
- **OFM-27** [LOW] PII stockees sur Vercel Blob en acces PUBLIC permanent (protection = secret de l'URL seul), URL brute renvoyee au client via PieceDTO.url — `src/lib/blob.ts:21`
- **OFM-28** [LOW] Secret du webhook Brevo transmis en QUERY STRING (fuite dans les journaux) — `src/app/api/webhooks/brevo/route.ts:39`
- **OFM-29** [LOW] Provisioning civique non idempotent : civicMentions:{push} rejoue a chaque livraison Stripe — `src/lib/civique-api.ts:510`
- **OFM-30** [INFO] Actions 2FA en self-service (enrôlement/confirmation/désactivation) sans revalidation de vivacité de session — `src/lib/actions/totp-actions.ts:15`
- **OFM-31** [INFO] Anti-double-paiement fondé sur une fenêtre heuristique de 10 s, pas sur une idempotence atomique — `src/lib/actions/paiement-actions.ts:60`
- **OFM-32** [INFO] Accès SUPERADMIN en lecture aux données d'un tenant (console) non tracé dans le journal d'audit — `src/app/console/[id]/page.tsx:129`
- **OFM-33** [INFO] Sur-lecture include:{ user: true } sur AuditLog charge des colonnes secrètes (passwordHash, resetTokenHash, totp) côté serveur — `src/app/(app)/candidats/[id]/historique/page.tsx:29`
- **OFM-34** [INFO] CORS wildcard '*' sur les endpoints d'ecriture de l'API civique (GET/PUT/POST + Authorization) — `src/lib/civique-api.ts:37`
- **OFM-35** [INFO] Injection de formule dans le fichier FEC (.txt) — serializeFec sans garde anti-formule — `src/lib/compta/fec.ts:209`
- **OFM-36** [INFO] Neutralisation anti-formule incomplète (TAB/CR en tête) dans deux sérialiseurs CSV secondaires — `src/lib/suivi6mois-csv.ts:44`
- **OFM-37** [INFO] checkout/[id] : renvoie le civicToken (credential e-learning + PII) sur simple presentation d'un id de session Stripe, sans rate-limit — `src/app/api/civique/checkout/[id]/route.ts:45`
- **OFM-38** [INFO] organisme/[id]/logo et photos/[id] : recuperation binaire par ID sans cloisonnement fort (donnees publiques) — `src/app/api/public/organisme/[id]/logo/route.ts:18`
- **OFM-39** [INFO] updateCollaborateur ne protege ni le compte courant ni un autre ADMIN : un gerant peut retrograder/neutraliser un co-ADMIN ou se verrouiller — `src/lib/actions/admin-actions.ts:103`
- **OFM-40** [INFO] INFO - Un ADMIN de tenant traverse le middleware sur /api/console/* (seg="api"), mais tous les handlers se re-gardent (defense en profondeur — `src/auth.config.ts:57`
- **OFM-41** [INFO] next@16.3.1 en production : advisory critique RCE Image Optimization (AVIF) non patche, surface exposee — `package.json:48`
- **OFM-42** [INFO] next-auth 5.0.0-beta.32 (pre-release BETA) sur le chemin d'authentification en production — `package.json:49`
- **OFM-43** [INFO] Webhook Wedof sans anti-rejeu (aucun horodatage/nonce dans la signature) — `src/app/api/webhooks/wedof/[orgId]/route.ts:34`
- **OFM-44** [INFO] Oracle d'enumeration d'organismes Wedof (404 vs 401) — `src/app/api/webhooks/wedof/[orgId]/route.ts:31`
