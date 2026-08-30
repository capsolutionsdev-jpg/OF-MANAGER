# Analyse d'impact relative à la protection des données (AIPD / DPIA) — modèle

> **À compléter et à faire valider par un DPO / avocat.** Ce canevas répond à l'article 35 du RGPD.
> Il couvre les traitements d'OFManager susceptibles d'engendrer un risque élevé (données de
> **santé** — situation de handicap, art. 9 ; **pièces d'identité** ; volumétrie **multi-tenant**).
> Chaque organisme de formation client (responsable de traitement) peut réutiliser ce modèle ;
> l'éditeur (sous-traitant) fournit les éléments techniques.

Champs entre crochets `[…]` = à renseigner.

---

## 1. Contexte et nécessité de l'AIPD
- **Responsable de traitement :** [OF client — raison sociale, SIREN]
- **Sous-traitant :** CAP SOLUTIONS (éditeur d'OFManager) — cf. `DPA-sous-traitance.md`
- **Traitements concernés :** gestion des stagiaires/candidats, suivi pédagogique, émargement, facturation.
- **Critères CNIL déclenchant l'AIPD (au moins 2 → AIPD requise) :** ☑ données sensibles (santé/handicap) · ☑ données à caractère hautement personnel (pièces d'identité) · ☐ vulnérabilité des personnes · ☑ traitement à grande échelle (multi-tenant) · ☐ autres : [ ]
- **Conclusion sur la nécessité :** [AIPD requise / non requise — justifier]

## 2. Description systématique du traitement
- **Finalités :** [inscription, suivi Qualiopi, obligations OF, facturation…]
- **Catégories de données :** identité, coordonnées, **date/lieu de naissance**, **photo d'identité**, **situation de handicap (santé, art. 9)**, signatures manuscrites, données de formation, données de financement.
- **Catégories de personnes :** stagiaires/candidats, formateurs, contacts entreprises.
- **Destinataires / sous-traitants ultérieurs :** cf. `sous-traitants-ulterieurs.md`.
- **Durées de conservation :** cf. `matrice-conservation.md`.
- **Flux et transferts hors UE :** [cf. A02-001 — e-mail (Resend, US), IA (OpenAI/Anthropic, US), Sentry (US) : mécanisme = [CCT / DPF] ]

## 3. Base légale et proportionnalité
- **Base légale par finalité :** [exécution du contrat / obligation légale OF / consentement].
- **Base légale de la donnée de santé (art. 9-2) :** [obligation légale d'accessibilité / consentement explicite] — **à trancher (cf. A02-005)**.
- **Minimisation :** données strictement nécessaires ; photo d'identité collectée [au bon stade — cf. A02-020].
- **Information des personnes :** mentions à la collecte + politique de confidentialité (cf. A02-019).
- **Exercice des droits :** accès/rectification/effacement/portabilité — outillé (`rgpd-actions.ts`, export, anonymisation).

## 4. Mesures de sécurité (art. 32) — renvoi
Cloisonnement multi-tenant applicatif (audité), chiffrement des secrets, HTTPS, 2FA disponible,
rate-limiting, révocation de session, anonymisation à l'effacement + purge par rétention.
Détails et limites : `dossier-conformite-rgpd.md` + rapports `audits/AUDIT-05` et `audits/AUDIT-02`.

## 5. Évaluation des risques (pour chaque risque : gravité × vraisemblance → mesures)
| Risque | Gravité | Vraisemblance | Mesures de réduction | Risque résiduel |
|---|---|---|---|---|
| Accès illégitime (fuite inter-tenant) | [ ] | [ ] | Cloisonnement applicatif + garde-fou CI (+ RLS activable) | [ ] |
| Divulgation de pièces sensibles (photos/signatures) | [ ] | [ ] | Accès privé + URL signées (cf. A02-009) | [ ] |
| Transfert hors UE non couvert | [ ] | [ ] | CCT/DPF ou bascule UE (cf. A02-001) | [ ] |
| Conservation excessive | [ ] | [ ] | Matrice + crons de purge (candidats + logs) | [ ] |

## 6. Avis du DPO et validation
- **Avis du DPO / référent :** [ ]
- **Décision du responsable de traitement :** [ ]
- **Date de revue :** [ ] · **Prochaine revue :** [ ]
