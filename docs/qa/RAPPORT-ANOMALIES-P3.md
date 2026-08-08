# Rapport d'anomalies — Lot P3 (modules support)

> Périmètre P3 : exports, rapports/dashboard, notifications & SMS, support/tickets,
> assistant IA, kanban/tâches, planning/salles, BPF. Audit multi-agents (revue de
> code, repro concret + fichier:ligne). **39 anomalies** ; les correctifs déjà
> appliqués cette passe sont marqués ✅.

## Corrigé cette passe ✅
- **[Exports] Injection de formule CSV** — `sessions/[id]/resultats/route.ts` utilisait un `cell()` maison sans neutraliser `=,+,-,@` (nom/prénom/email viennent du formulaire lead **public** → `=HYPERLINK(...)` exécuté à l'ouverture Excel). → réécrit avec `toCsvMatrix`/`csvResponse` (esc durci) **+ garde de rôle STAFF** (manquait). *(commit ffa173b)*
- **[SMS] Ré-envoi du SMS quand l'e-mail échoue** — régression de mon correctif BUG-002 : `maybeSms` tournait avant le jalon → rejoué à chaque cron si l'e-mail échouait. → `maybeSms` déplacé **dans** `if (sent)` (convocation, rappel, satisfaction, suivi 6 mois). *(ffa173b)*
- **[CRM] `requireSection` manquant** — `crm-actions` (7 actions) ne vérifiait que la connexion. → `requireSection("crm")` partout (rôle+section). *(ffa173b)*
- **[CRM] `assignCandidat` cross-tenant** — le `userId` affecté n'était pas validé. → vérifié via le client scopé (rejet si autre organisme). *(ffa173b)*
- **[Rapports] Devis / paiements partiels / remplissage** — acceptation devis basée sur `acceptedAt` ; encaissé = règlements réels (Paiement) et en attente = reste dû (TTC − règlements) ; remplissage sur sessions actives + inscriptions non annulées ; dashboard : candidats hors archivés, jauge non annulée, plafond 600 retiré. *(ee208a2)*
- **[Planning] Isolation salle/formateurs** — `salleId` et formateurs revalidés côté serveur (appartenance tenant, salle active) — fermait une référence cross-tenant. *(81bb213)*
- **[Planning] Conflit de salle + sur-capacité** — avertissement non bloquant (chevauchement de créneau même salle ; nbPlaces > capacité). *(0e983c9)*

> **Reste sur Planning** : la page `/planning` affiche une occupation continue sur tout l'intervalle au lieu des séances réelles (affichage, à raffiner).
- **[Automatisations] BUG-005 double-envoi** — verrou atomique (compare-and-set du jalon avant envoi) sur les 12 événements + PDF best-effort. *(5af09e5)*
- **[Tâches]** `toggleTache` : état recalculé serveur ; `createTache` : date validée + `candidatId` vérifié tenant. *(35427d9)*
- **[Exports]** montant négatif reste numérique (l'anti-injection ne préfixe plus le `-` d'un nombre). *(35427d9)*
- **[Support]** notification e-mail à l'éditeur quand un client répond à un ticket. *(af71f06)*
- **[BPF]** cf. RAPPORT dédié / commit 400679c (calculs + récap CERFA).

- **[IA] Maîtrise des coûts** — rate-limit (20/10min/utilisateur + 200/j/organisme ; 10/h/candidat civique), plafonds d'entrée (6000 / 2000 car.), sortie bornée, erreur fournisseur non exposée. *(589e9d6)*
- **[Support] Badges « lu »** — marqués lus à la consultation (client + console). *(5ea4c72)*
- **[Planning] Affichage** — séances réelles au lieu d'une occupation continue. *(e47e722)*

- **[SMS] Quota / journal / numéro invalide** — `sendSms` applique `maxSmsMois`, journalise chaque tentative (ENVOYE/DEMO/ECHEC/QUOTA/INVALIDE) y compris pour les automatismes, `normalizePhone` durci (E.164). *(42e2537)*
- **[SMS] Canal « SMS uniquement »** — l'e-mail candidat n'est plus envoyé quand le canal est `sms` (convocation/rappel/satisfaction/suivi). *(cf42b62)*
- **[Tokens] Expiration** — devis via `validUntil` ; liens de parcours (documents + page) expirés 12 mois après la session (`linkExpired`). *(0a008d7)*
- **[Nettoyage]** dead code `markTicketReadClient`/`markSupportRead` retiré.

- **OBS-1** — garde-fou « prisma direct » **étendu aux server actions** (test + allowlist des 28 usages légitimes). *(ae1d8f0)*

## Reste (non requis — assumé)
- **[Tokens]** expiration « complète » via un champ `expiresAt` par token (au lieu de la règle logique 12 mois post-session) — nécessiterait une migration ; non requis (la règle logique couvre le risque de fuite).
- **[Planning]** affichage `/planning` en occupation continue vs séances réelles — raffinement d'affichage (cosmétique).

> **Campagne QA close** : tous les constats P1/P2/P3 sont traités (correctif ou décision), déployés sur `main`. Reste seulement les 2 points ci-dessus, non-bloquants et documentés.

## Rapports & Dashboard (calculs) — à corriger
| Sév. | Anomalie | Fichier |
|---|---|---|
| Majeur | **Taux d'acceptation devis** calculé sur `statut=PAYEE` au lieu de `acceptedAt` → les devis **signés en ligne** comptent pour 0 | `rapports/page.tsx:97` |
| Majeur | **Paiements partiels** : une facture `PARTIELLE` est mise au TTC **plein** en « en attente » et 0 en « encaissé » (diverge de la page comptabilité) | `rapports/page.tsx:101` |
| Majeur | **Taux de remplissage** inclut TOUTES les sessions (annulées/passées/archivées) et compte les inscriptions **ANNULEE** | `rapports/page.tsx:61` |
| Mineur | Jauge remplissage dashboard : compte les annulées, peut dépasser 100 % | `dashboard/page.tsx:137` |
| Mineur | Compteur « pièces manquantes » plafonné en silence à 600 (`take: 600`) | `dashboard/page.tsx:126` |
| Mineur | « Total facturé » ne déduit pas les avoirs (`FactureStatut.AVOIR`) | `rapports/page.tsx:186` |
| Mineur | KPI « Candidats » du dashboard inclut les archivés (incohérent avec le rapport) | `dashboard/page.tsx:97` |

## Notifications & SMS — à corriger
| Sév. | Anomalie | Fichier |
|---|---|---|
| Majeur | **Quota SMS mensuel** (`maxSmsMois`) jamais appliqué à l'envoi | `sms.ts` / `sms-actions.ts` |
| Majeur | Numéro invalide traité comme « mode démo » → **faux succès** (échec silencieux) | `sms.ts:53` |
| Majeur | SMS des automatismes : **aucun journal** + échec silencieux | `automation-engine.ts` |
| Majeur | **Canal** (email/sms/both) non respecté : e-mail toujours envoyé | `automation-engine.ts` |
| Mineur | `normalizePhone` ne valide pas réellement (peut renvoyer du non-E.164) | `sms.ts:36-44` |

## IA — à corriger
| Sév. | Anomalie | Fichier |
|---|---|---|
| Majeur | **Coût non borné** : aucun rate-limit sur l'assistant, entrée non plafonnée, repli clé globale | `ai-actions.ts:60-88`, `ai.ts:24` |
| Majeur | Route civique `/api/civique/ai` : pas de rate-limit par candidat (coût non borné) | `api/civique/ai/route.ts:101` |
| Mineur | Injection de prompt via données candidat d'origine publique | `ai-actions.ts:44-54` |
| Mineur | Message d'erreur brut du fournisseur renvoyé au client | `ai.ts:56-57` |

## Planning & Salles — à corriger
| Sév. | Anomalie | Fichier |
|---|---|---|
| Majeur | **Aucune détection de conflit** de réservation de salle (double-booking) | `session-actions.ts` |
| Majeur | **Aucun contrôle de capacité** de salle (`salle.capacite` jamais comparé) | `session-actions.ts` |
| Majeur | `salleId` **non revalidé** côté serveur (appartenance tenant + salle active) | `validators/session.ts:16` + `session-actions.ts` |
| Majeur | Planning incohérent avec les séances réelles (occupation continue) | `planning/page.tsx:30-58` |

## BPF (déclaration réglementaire) — à corriger
| Sév. | Anomalie | Fichier |
|---|---|---|
| Majeur | Heures-stagiaires = durée × inscrits non-annulés (abandons/EN_ATTENTE comptés 100 %) | `bpf/page.tsx:132,147,184` |
| Majeur | `dureeHeures` null → 0 h en silence (incohérent si stagiaires > 0) | `bpf/page.tsx:98,131` |
| Majeur | Sessions à cheval sur 2 années → 100 % sur l'année de `dateDebut` (pas de prorata) | `bpf/page.tsx:64-70` |
| Mineur | Sessions futures/PLANIFIEE comptées | `bpf/page.tsx:68` |
| Mineur | Paramètre d'année non validé (`parseInt` → NaN possible) | `bpf/page.tsx:61` |

## Kanban / Tâches — à corriger (reste)
| Sév. | Anomalie | Fichier |
|---|---|---|
| Mineur | `createTache` accepte un `candidatId` arbitraire (pas de vérif d'appartenance) | `tache-actions.ts:16` |
| Mineur | `toggleTache` calcule l'état depuis la valeur **client**, pas la BD | `tache-actions.ts:35` |
| Mineur | Dates `dueDate`/`relanceDate` non validées (`new Date` → Invalid Date) | `tache-actions.ts:22` |
| Mineur | `/kanban` `/taches` sans garde de rendu (`requireSection`) — défense en profondeur | `kanban/page.tsx:28` |

## Support / tickets — à corriger
| Sév. | Anomalie | Fichier |
|---|---|---|
| Mineur | Actions « marquer comme lu » = code mort (badges non-lus jamais vidés) | `console-actions.ts:82`, `support-actions.ts:107` |
| Mineur | Réponse client à un ticket : aucun e-mail de notification à l'éditeur | `support-actions.ts:83` |
| Mineur | Accès console support (tous tenants) se fie au rôle JWT (revalidation base absente) | `superadmin-guard.ts:9` |

## Exports (reste)
| Sév. | Anomalie | Fichier |
|---|---|---|
| Mineur | Montant négatif préfixé `'` par l'anti-injection → texte non sommable (Excel) | `tresorerie/export/recap/route.ts:42` |
| Mineur | `logoUrl` inséré dans `src="…"` du PDF sans échappement d'attribut | `export-pdf.ts:56` |

---

## Priorisation recommandée pour la suite
1. **Rapports/Dashboard** (Majeur, très visible client) : devis `acceptedAt`, paiements partiels, filtres remplissage.
2. **BPF** (Majeur, conformité réglementaire) : heures-stagiaires, prorata année, null→0. ⚠️ à valider avec les règles officielles.
3. **Planning/Salles** (Majeur) : conflit de réservation + revalidation `salleId` (isolation).
4. **SMS** (Majeur) : quota, échec non silencieux, canal, journal.
5. **IA** (Majeur) : rate-limit + plafond d'entrée (maîtrise des coûts).
6. Reste (Mineur) : tâches, support, exports cosmétiques.
