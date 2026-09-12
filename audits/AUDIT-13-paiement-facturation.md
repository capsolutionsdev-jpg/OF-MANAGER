# COMPTE RENDU D'AUDIT 13 — Audit paiement / facturation
## OFMANAGER — Programme d'audit de pré-commercialisation

**Date :** 2026-09-12
**Version auditée :** branche `audit-13-paiement-facturation` (base `origin/main` @ `0a4b4cc`)
**Chef de projet audit :** Claude Code (chef de projet senior)
**Équipe mobilisée :** Expert-comptable/facturation FR · Ingénieur systèmes de paiement (Stripe) · Spécialiste abonnements SaaS · Testeur financier (preuve chiffrée) · Analyste risques financiers — 5 sous-agents parallèles, pilotés + contre-vérifiés par le chef de projet.
**Périmètre couvert :** les deux flux — éditeur→OF (abonnement Stripe/SEPA, `FactureEditeur`, Factur-X/PDP) et OF→client final (`Devis`, `Facture`, `Paiement`, proforma, pré-facture, FEC) + produit civique. Calculs, TVA, numérotation, remboursements, impayés, export comptable.
**Durée / profondeur :** cartographie complète du domaine facturation ; 5 analyses parallèles ; contre-vérification personnelle par lecture directe des 4 🔴 + exécution de la suite de tests financiers (84 tests, 0 échec).

---

### 1. SYNTHÈSE EXÉCUTIVE

Le **moteur de calcul est sain** (montants en `Decimal(10,2)`, arrondis ligne-puis-somme corrects, FEC algébriquement équilibré, 84 tests financiers verts) et le circuit **éditeur→OF est robuste** (numérotation atomique anti-doublon, garde d'émetteur immatriculé, tunnel Stripe PCI SAQ-A avec signature webhook vérifiée + fulfillment idempotent). En revanche, la **facturation OF→client repose sur un simple dépôt de PDF** (`depositFacture` ne stocke que le TTC, jamais le HT, sans cycle de vie ni journal d'audit) — et cette faiblesse cascade en anomalies graves : **le FEC/exports comptables sont faux** (100 % du TTC porté en TVA, 0 € de CA), la **proforma/pré-facture surfacture de 20 %** un montant déjà TTC, la **purge détruit factures et règlements en cascade** sans trace, et le **checkout SEPA console ne collecte pas la TVA**. Ce sont exactement les erreurs qui se propagent à la comptabilité du client OF — le domaine où l'éditeur perd sa crédibilité le plus vite.

| 🔴 Rouge | 🟠 Orange | 🟡 Jaune | 🟢 Vert |
|---|---|---|---|
| 4 | 14 | 15 | 12 |

**VERDICT : GO CONDITIONNEL** *(proche NO-GO sur le volet OF→client)*
Le socle (calcul, éditeur→OF, tunnel Stripe) est commercialisable ; mais **les 4 🔴 doivent être corrigés avant tout premier client payant utilisant la facturation** : tant que le FEC est faux et la proforma surfacturée, la comptabilité OF→client est inexploitable. Correctifs bien cernés et de charge S/M (le moteur est sain), d'où GO CONDITIONNEL et non NO-GO.

---

### 2. TABLEAU DES ANOMALIES

| ID | Gravité | Titre | Composant | Preuve | Impact | Recommandation | Charge | Priorité |
|---|---|---|---|---|---|---|---|---|
| A13-001 | 🔴 | FEC/exports comptables faux (CA=0, TVA=100 % TTC) | compta/FEC | `facture-actions.ts:68` + `compta/collect.ts:50` + `compta/fec.ts:125` | Compta du client OF fausse, fichier rejetable | Capter `montantHT` (ou dériver HT=TTC/(1+taux)) | M | P0 |
| A13-002 | 🔴 | Purge corbeille détruit factures/inscriptions + règlements (cascade, sans garde ni audit) | corbeille-actions | `corbeille-actions.ts:139-146` + `schema:1749,1751` (onDelete Cascade) | Perte définitive de trace comptable des encaissements | Refuser la purge si règlements ; `onDelete:Restrict` + audit | M | P0 |
| A13-003 | 🔴 | Proforma/pré-facture surfacturée +20 % (montantDu TTC réinjecté en HT) | factures/proforma | `montant-du.ts:5` → `proforma.ts:89,93` / `pre-facture.ts:38-43` | Document client 20 % trop cher (assujettis) | Dériver HT=montant/(1+taux) ; figer l'unité TTC | M | P0 |
| A13-004 | 🔴 | Checkout SEPA console sans ligne de TVA → TVA non collectée | console-billing | `console-billing-actions.ts:64-83` (pas de `tax_rates`) vs `billing-actions.ts:90,97` | TVA non collectée (éditeur assujetti) ; totaux incohérents | Ajouter `tax_rates:[frTvaTaxRateId]` | S | P0 |
| A13-005 | 🟠 | Facture éditeur ÉMISE mutable en « avoir » par changement de statut | facture-editeur-actions | `facture-editeur-actions.ts:236-247` + `statut-transitions.ts:13-14` | Document légal muté après émission (pas un vrai avoir) | Figer toute facture émise ; avoir = doc séparé négatif | M | P1 |
| A13-006 | 🟠 | Double-souscription possible (aucune garde statut/subscription) | billing-actions | `billing-actions.ts:51-91` (pas de check `stripeSubscriptionId`/ACTIF) | Double prélèvement mensuel possible | Refuser si souscription active ; rediriger portail | S | P1 |
| A13-007 | 🟠 | Facture mensuelle éditeur + marge au prix CODÉ (ignore prix édité console) | facture-editeur-actions | `facture-editeur-actions.ts:48-50` + `console-couts.ts:58` vs `getResolvedPlans` | Facture ≠ tarif configuré ; CA ≠ MRR | Router vers `getResolvedPlans`/`getPlanPrices` | S | P1 |
| A13-008 | 🟠 | Remise de lancement −40 % appliquée à vie (ignore `dureeMois`) | offre-lancement | `contrat-prestation-actions.ts:62-67` + `offre-lancement.ts:28-34` | Manque à gagner récurrent | Coupon Stripe `duration:repeating,6` ou schedule | M | P1 |
| A13-009 | 🟠 | Aucun changement de plan ni prorata in-app | billing | grep `subscriptions.update\|proration` = 0 ; `price_data` inline | Montée/descente de gamme ingérable | Catalogue Prices + portail `proration_behavior` | L | P1 |
| A13-010 | 🟠 | Traçabilité financière : pas de journal d'audit (ops OF→client) ni d'historique des événements de facturation | actions + webhook | 0 `auditLog.create` dans facture/paiement/devis/corbeille-actions ; webhook ne persiste rien | Litige non instruisible ; historique non reconstituable | Journaliser + table `BillingEvent` | M | P1 |
| A13-011 | 🟠 | RBAC financier incohérent (dépôt facture + purge = tout staff) | tenant/actions | `facture-actions.ts:25` + `corbeille-actions.ts:130` = `requireStaffTenant` vs `paiement-actions.ts:25` = `requireSection` | Escalade fonctionnelle : créer/détruire des pièces financières sans droit compta | Gater derrière `requireSection("comptabilite"/"facturation")` | S | P1 |
| A13-012 | 🟠 | `supprimerPaiement` = suppression physique sans corbeille ni audit | paiement-actions | `paiement-actions.ts:133` `deleteMany` ; `Paiement` sans `deletedAt` | Encaissement effaçable sans trace | Soft-delete + audit + acteur | S | P1 |
| A13-013 | 🟠 | Cycle de vie facture client inexistant (pas d'avoir/annulation ; `avoirParentId` jamais posé) | factures OF→client | `facture.update` = uniquement `deletedAt` ; `avoirParentId` 0 usage applicatif | Correction hors outil ; seule « annulation » = purge destructrice | Workflow de statut + émission d'avoir | M | P1 |
| A13-014 | 🟠 | Remboursement civique DB-only + accès e-learning conservé après remboursement | civique-actions | `civique-actions.ts:338-348` (aucun `stripe.refunds` ; ne révoque pas `civicMentions`) | Argent non rendu / dashboard non réconcilié ; accès maintenu | Appeler `refunds.create` + webhook `charge.refunded` + révoquer l'accès | M | P1 |
| A13-015 | 🟠 | Réconciliation Stripe ↔ FactureEditeur impossible (2 systèmes déconnectés) | webhook/schema | `FactureEditeur` sans champ Stripe ; `invoice.paid` ne pose que `statut ACTIF` | Rapprochement impossible ; risque double-facturation | `stripeInvoiceId`/`paidAt` depuis `invoice.paid` + ledger | M | P1 |
| A13-016 | 🟠 | Exonération TVA civique codée en dur (ignore `assujettiTva`) | civique-api | `civique-api.ts:257-260` (`tvaPct:0, exonereTva:true`) ; devis respecte `assujettiTva` | TVA mal facturée / mention inexacte selon l'OF | Dériver taux/exo/motif de la config OF | S | P1 |
| A13-017 | 🟠 | Résiliation : ni export des données ni suppression ; rgpd-purge sur tenant résilié | webhook/cron | `webhook:105-110` (→SUSPENDU seul) + `cron/rgpd-purge` anonymise sans accès client | Client sans export possible ; données mutées | Parcours d'export à la résiliation + rétention | M | P1 |
| A13-018 | 🟠 | Couverture de test FEC trompeuse (le cas réel `montantHT:0` jamais testé) | compta/tests | `compta/__tests__/fec.test.ts:11,31` (HT toujours ≠ 0) | Tests verts masquant le 🔴 A13-001 | Test `montantHT:0` (doit échouer) + intégration collect→buildFec | S | P1 |
| A13-019 | 🟡 | `euros()` (0 déc.) dans le constructeur de devis (affiché ≠ PDF ≠ prélevé) | console/devis-builder | `plans.ts:162` + `devis-builder.tsx:306-318` (161 € vs 160,65 €) | Superadmin voit des montants arrondis à l'euro | Utiliser `eurosDoc()` | S | P2 |
| A13-020 | 🟡 | `priceYear` non recalculé sur prix mensuel surchargé | pricing | `pricing.ts:43-56` surcharge `price` pas `priceYear` ; `billing-actions.ts:64` | Annuel prélevé déconnecté du mensuel édité (chemin latent) | Dériver `priceYear` du prix résolu | S | P2 |
| A13-021 | 🟡 | Numérotation facture éditeur : risque de trou (nextRef hors transaction) | facture-editeur | `facture-editeur-actions.ts:129-157` (increment puis update, hors tx) | Trou de séquence possible sur échec concurrent (rare) | Allouer le n° DANS la transaction (comme le civique) | S | P2 |
| A13-022 | 🟡 | XML Factur-X : échéance (BT-9) + conditions/moyens de paiement absents | factures/editeur | `editeur.ts:290-307` (pas de `SpecifiedTradePaymentTerms`) | Rejet possible PDP / validateur EN 16931 (2026) | Ajouter les termes de paiement au XML | S | P2 |
| A13-023 | 🟡 | Démo auto-prolongeable sans limite | demo-lifecycle | `demo-lifecycle-actions.ts:27-33` (`demoHardExpiresAt=now+7j` à chaque fois) | Usage gratuit illimité | Figer le hard cap sur `createdAt` | S | P2 |
| A13-024 | 🟡 | MRR = prix catalogue (surévalue le récurrent réel) | mrr-snapshot | `mrr-snapshot.ts:46` (prix de liste) vs contrat remisé | Indicateur de pilotage biaisé | Baser sur le montant net du contrat signé | S | P2 |
| A13-025 | 🟡 | CA affiché TTC + bases CA↔impayés non rapprochables | trésorerie/compta | `tresorerie/page.tsx:51` (somme TTC) ; impayés base inscriptions | Pilotage incohérent, CA surévalué (assujettis) | Unifier la base + afficher le CA HT | M | P2 |
| A13-026 | 🟡 | Factures des formateurs sous-traitants absentes de l'export compta | compta/collect | `collect.ts:21-42` (ne lit pas `FactureFormateur`) | Charges de sous-traitance sous-estimées | Intégrer `FactureFormateur` payées au journal AC | S | P2 |
| A13-027 | 🟡 | Code d'accès civique renvoyé via le `session_id` en URL | civique checkout | `civique/checkout/[id]/route.ts:23-49` (endpoint public) | Fuite d'URL → accès e-learning récupérable | Ne renvoyer que `{paid:true}` + livraison par e-mail | S | P2 |
| A13-028 | 🟡 | Webhook Stripe sans déduplication `event.id` (idempotence par construction) | stripe/webhook | `webhook/route.ts:64-68` (pas de table events) | Dette latente (futur handler incrémental) | Garde `event.id` unique avant tout handler non idempotent | S | P3 |
| A13-029 | 🟡 | `stripeCustomerId` sans contrainte unique | schema/webhook | `schema:135` + `webhook:26-29` (`updateMany`) | Risque de MAJ cross-tenant si customer dupliqué | Contrainte unique partielle + alerte si ≠1 ligne | S | P3 |
| A13-030 | 🟡 | `console-billing-actions` sans parité durcissement A12-004 | console-billing | `console-billing-actions.ts:52-83` (pas de try/catch ni idempotencyKey) | Plantage server action / customer dupliqué (outil interne) | Aligner sur `createCheckout` | S | P2 |
| A13-031 | 🟡 | Mention d'exonération TVA absente du PDF lisible éditeur | factures/editeur | `editeur.ts:210-220` (motif seulement dans le XML) | Mention légale absente du doc lisible si taux 0 (latent) | Afficher le motif si `!tauxTva` | S | P2 |
| A13-032 | 🟡 | e-reporting d'encaissement construit mais jamais transmis | factures/pdp | `pdp.ts:106-118` appelé seulement en tests | Obligation e-reporting 2026 non couverte | Émettre l'e-reporting à l'encaissement | M | P3 |
| A13-033 | 🟡 | Facture civique sans quantité/PU explicites | civique facture | `examen-civique/facture/[id]/route.ts:117-122` | Mentions perfectibles (B2C, faible) | Ajouter qté/PU | S | P3 |

---

### 3. FICHES DÉTAILLÉES (🔴 et 🟠)

#### A13-001 — FEC & exports comptables faux : 100 % du TTC porté en TVA, 0 € de CA — 🔴
- **Constat :** toute facture OF→client créée par l'app n'a pas de `montantHT` ; le FEC en déduit `TVA = TTC − 0 = TTC`.
- **Preuve :** `facture-actions.ts:68-76` (`db.facture.create` avec `montantTTC` seul, unique créateur — grep `facture.create` = 1) ; `schema:1722` `montantHT Decimal @default(0)` ; `compta/collect.ts:50` `montantHT: Number(f.montantHT)` → 0 ; `compta/fec.ts:125` `const tva = Math.round((ttc-ht)*100)/100` → `ttc` ; `fec.ts:141-151` : 706 (Ventes) crédité de `ht`=**0**, 44571 (TVA) crédité de `tva`=**TTC**. Cas : facture 1 200 € TTC → Ventes 0 €, TVA 1 200 €. Aggravé pour OF exonéré : ligne de TVA fantôme (garde `if(tva>0)` défaite car tva=ttc).
- **Scénario d'impact :** un OF exporte son FEC pour son expert-comptable / l'administration → CA nul, TVA collectée = 100 % du CA. Fichier inexploitable / rejetable. L'équilibre débit=crédit est respecté (d'où les tests verts) mais la ventilation est fausse.
- **Cause racine :** `depositFacture` est un simple dépôt de PDF « fait sur un autre logiciel » : il ne capte pas la base HT ni le taux.
- **Recommandation :** capter `montantHT` (+ taux/assujetti) à la saisie, OU dériver `HT = TTC/(1+taux/100)` dans `collect.ts` ; ajouter le test manquant (A13-018).
- **Charge :** M — **Priorité :** P0 — **Type :** Quick win
- **Vérification :** générer un FEC sur une facture réelle (montantHT non saisi) → ligne 706 = HT réel, 44571 = TVA réelle ; test `buildFec` avec `montantHT:0` passe au vert après correctif.

#### A13-002 — La purge corbeille détruit factures/inscriptions + règlements en cascade, sans garde ni audit — 🔴
- **Constat :** `purgerCorbeille` supprime physiquement une facture ou une inscription ; la cascade Prisma détruit les `Paiement` liés. Aucune garde de statut, aucun journal.
- **Preuve :** `corbeille-actions.ts:139-146` (`db.inscription.delete` / `db.facture.delete`) ; `schema:1749,1751` `Paiement … onDelete: Cascade` (factureId ET inscriptionId) ; aucun `auditLog.create` dans le fichier. `restaurerCorbeille` ne peut pas restaurer un paiement déjà cascadé.
- **Scénario d'impact :** un membre du staff vide la corbeille → les encaissements (preuve comptable) disparaissent définitivement, sans trace de qui/quand. Atténuations réelles : workflow 2 temps (soft-delete puis purge) et purge réservée au staff — mais le barème classe « suppression détruisant la trace » en 🔴.
- **Cause racine :** cascade `onDelete: Cascade` sur `Paiement` + purge sans contrôle métier.
- **Recommandation :** refuser la purge d'une facture/inscription porteuse de règlements (ou `Paiement.onDelete: Restrict`) ; journaliser toute purge ; interdire soft-delete/purge d'une facture hors `BROUILLON`.
- **Charge :** M — **Priorité :** P0 — **Type :** Standard
- **Vérification :** tenter de purger une inscription avec règlement → refus + entrée d'audit ; les `Paiement` subsistent.

#### A13-003 — Proforma & pré-facture surfacturées de 20 % (montant déjà TTC réinjecté en HT) — 🔴
- **Constat :** `montantDu()` renvoie un montant **TTC** (comparé aux encaissements en compta) mais les proformas/pré-factures l'injectent comme **HT**, puis ajoutent 20 %.
- **Preuve (chiffrée) :** `comptabilite/montant-du.ts:5` `inscriptionMontant ?? facturesTtc` ; consommé TTC en `comptabilite/page.tsx:110-131` (`restant = du − paye`, paye = encaissements TTC) ; injecté HT en `factures/proforma.ts:89,93` + `pre-facture.ts:38-43` → `calcMontants` ajoute 20 %. Cas : `montant=null, facturesTtc=300` (TTC) → proforma `montantHT=300, TVA=60, montantTTC=360` (**+60 €**), rendu client `session-proforma-panel.tsx:57 {eur(montantTTC)} TTC`. Le test `proforma.test.ts:86-93` construit ce cas mais n'assère **que** `montantHT===300`, jamais le TTC → bug masqué.
- **Scénario d'impact :** pour tout OF assujetti, la proforma/pré-facture remise au client est 20 % au-dessus du reste dû réel (double taxation d'un TTC dans la branche fallback).
- **Cause racine :** unité de `montantDu` non figée (TTC) + réutilisation en HT.
- **Recommandation :** figer l'unité TTC ; côté proforma/pré-facture, dériver `HT = montant/(1+taux/100)` ; ajouter l'assertion `montantTTC` au test.
- **Charge :** M — **Priorité :** P0 — **Type :** Quick win
- **Vérification :** proforma sur reste dû 300 € (assujetti) → 300 € TTC (et non 360).

#### A13-004 — Checkout SEPA console sans ligne de TVA → TVA non collectée — 🔴
- **Constat :** l'abonnement SEPA créé depuis la console (superadmin) n'attache aucun `tax_rates`, contrairement au checkout self-service.
- **Preuve (chiffrée) :** `console-billing-actions.ts:64-83` (`checkout.sessions.create` sans `tax_rates`/`automatic_tax`) vs `billing-actions.ts:90,97` (`tax_rates:[tvaRateId]`). Contrat libellé HT (`prestation.ts:236-246`). Cas PRO 189 € HT : self-service = **226,80 € TTC** ; console SEPA = **189,00 € débité, sans TVA**. Non rattrapé (`webhook:82-88` ne réconcilie pas `amount_total` pour l'abonnement).
- **Scénario d'impact :** les clients onboardés en SEPA sont prélevés du HT sans TVA (éditeur assujetti → TVA non collectée = non-conformité fiscale) et deux clients de la même formule paient des totaux différents.
- **Cause racine :** ligne de taxe oubliée sur le chemin console (le montant, lui, est exact).
- **Recommandation :** ajouter `tax_rates:[await frTvaTaxRateId(stripe)]` (miroir du self-service) ; test assérant que **les deux** chemins attachent la TVA.
- **Charge :** S — **Priorité :** P0 — **Type :** Quick win
- **Vérification :** facture Stripe d'un abonnement SEPA console → ligne TVA 20 % présente, TTC = HT×1,2.

#### A13-005 — Facture éditeur émise mutable en « avoir » par changement de statut — 🟠
- **Constat :** `setFactureEditeurStatut` autorise `EMISE → AVOIR` ; la garde n'interdit que le retour en `BROUILLON`. Le statut est modifié sur le **même** enregistrement (même n°, montants positifs), le XML basculant TypeCode 380→381.
- **Preuve :** `statut-transitions.ts:13-14` (`if(to==="BROUILLON") return from==="BROUILLON"; return true`) ; `facture-editeur-actions.ts:240-247` (`update` du statut sur la même facture) ; `editeur.ts:239` (XML 381 si AVOIR).
- **Scénario d'impact :** une facture émise devient un « avoir » malformé (n° d'origine, montants positifs) au lieu d'un avoir séparé négatif → immuabilité rompue, e-invoicing incohérent. Atténué : action réservée au SUPERADMIN, sur les factures de l'éditeur.
- **Cause racine :** garde de transition trop permissive + AVOIR modélisé comme statut de la même facture.
- **Recommandation :** figer toute facture émise ; l'avoir = document distinct (n° propre, montants négatifs, `avoirParentId`).
- **Charge :** M — **Priorité :** P1 — **Type :** Standard
- **Vérification :** tenter `EMISE→AVOIR` → refus ; « créer un avoir » génère un nouveau document négatif.

#### A13-006 — Double-souscription possible (aucune garde) — 🟠
- **Constat :** `createCheckout` ne vérifie ni `org.statut === ACTIF` ni un `stripeSubscriptionId` existant.
- **Preuve :** `billing-actions.ts:51-91` (checks : admin, formule, CGV, stripe, isDemo — mais aucun check de souscription active). Stripe n'impose pas l'unicité de souscription par client.
- **Scénario d'impact :** un gérant déjà abonné qui repasse par le tunnel obtient une 2ᵉ souscription → double prélèvement mensuel. Conditionnel (il faut compléter un 2ᵉ checkout ; un simple double-clic ne produit qu'une URL) → arbitré 🟠 (le repère « double débit » pousserait 🔴, mais l'action délibérée + remboursement possible le ramènent à 🟠).
- **Cause racine :** pas de garde d'idempotence métier avant création de souscription.
- **Recommandation :** refuser si souscription active (`stripeSubscriptionId` ou `subscriptions.list`) ; rediriger vers le portail pour tout changement.
- **Charge :** S — **Priorité :** P1 — **Type :** Quick win
- **Vérification :** un org ACTIF qui relance `createCheckout` → refus + lien portail.

#### A13-007 — Facture mensuelle éditeur & vue marge au prix codé (ignore le prix édité en console) — 🟠
- **Constat :** `genererFactureMensuelle` et la vue coûts facturent `PLANS[key].price` (défaut) au lieu de `getResolvedPlans` (prix saisi en console).
- **Preuve :** `facture-editeur-actions.ts:48-50` (`planForOrg(...).price`) + `console-couts.ts:58` vs `mrr-snapshot.ts:46`/`/tarifs`/checkout (prix résolu).
- **Scénario d'impact :** pour un client sans contrat signé, la facture applique le tarif codé, contredisant toute remise/hausse saisie ; la vue marge affiche un CA ≠ MRR.
- **Recommandation :** router `genererFactureMensuelle` et `console-couts` vers `getResolvedPlans`/`getPlanPrices`.
- **Charge :** S — **Priorité :** P1 — **Type :** Quick win
- **Vérification :** éditer un prix en console → la facture mensuelle générée reflète le nouveau prix.

#### A13-008 — Remise de lancement −40 % appliquée à vie — 🟠
- **Constat :** l'offre « −40 % pendant 6 mois » est posée en remise permanente ; `dureeMois` n'est jamais stocké ni appliqué.
- **Preuve :** `offre-lancement.ts:28-34` (`{remisePct:40,dureeMois:6}`) ; `contrat-prestation-actions.ts:62-67` (`remisePct` permanent, ignore `dureeMois`) ; `console-billing-actions.ts:47,64-83` (montant flat récurrent, sans coupon à durée).
- **Scénario d'impact :** la remise ne s'arrête jamais au 7ᵉ mois → manque à gagner récurrent.
- **Recommandation :** coupon Stripe `duration:repeating, duration_in_months:6` ou subscription schedule 2 phases.
- **Charge :** M — **Priorité :** P1 — **Type :** Standard
- **Vérification :** abonnement « Pionniers » → 7ᵉ prélèvement au prix plein.

#### A13-009 — Aucun changement de plan ni prorata in-app — 🟠
- **Constat :** aucune logique de montée/descente de gamme ni de prorata ; les abonnements sont en `price_data` inline (pas de catalogue Prices) → le portail Stripe ne peut pas proposer de switch.
- **Preuve :** grep `subscriptions.update|proration_behavior|upgrade|downgrade` = 0 ; `billing-actions.ts:98-104` (price_data inline) ; `openBillingPortal:145-163` (délègue au portail).
- **Scénario d'impact :** un client ne peut pas changer de formule proprement (ni prorata). Corollaire : `customer.subscription.updated` lit `formule` d'une metadata que Stripe ne met pas à jour au changement de prix (`webhook:96-102`).
- **Recommandation :** catalogue Produits/Prices + portail avec `proration_behavior`, ou action in-app `subscriptions.update`.
- **Charge :** L — **Priorité :** P1 — **Type :** Chantier
- **Vérification :** changement de formule → prorata correct + formule à jour sur le tenant.

#### A13-010 — Traçabilité financière insuffisante (pas de journal d'audit ni d'historique d'événements) — 🟠
- **Constat :** aucune opération financière OF→client n'est journalisée, et le webhook Stripe ne persiste aucun événement de facturation.
- **Preuve :** 0 `auditLog.create` dans `facture-actions.ts`/`paiement-actions.ts`/`devis-actions.ts`/`corbeille-actions.ts` (vs ~60 ailleurs) ; `webhook/route.ts` = `console.error` + `updateMany` seulement ; aucun modèle `BillingEvent` (schema).
- **Scénario d'impact :** impossible de répondre « qui a déposé/supprimé cette facture, saisi/supprimé ce règlement, et quand » ; l'historique de facturation d'un client (échecs, relances, transitions) n'est pas reconstituable dans l'app → litige non instruisible.
- **Recommandation :** journaliser création/suppression facture & règlement, changements de statut devis, purges ; table `BillingEvent` alimentée par le webhook.
- **Charge :** M — **Priorité :** P1 — **Type :** Standard
- **Vérification :** chaque opération financière laisse une entrée d'audit horodatée + nominative.

#### A13-011 — RBAC financier incohérent (l'action la plus destructrice a la garde la plus faible) — 🟠
- **Constat :** le dépôt de facture et la purge (avec cascade règlements) sont ouverts à tout staff, alors que saisir un règlement exige le rôle comptable.
- **Preuve :** `facture-actions.ts:25` + `corbeille-actions.ts:130` = `requireStaffTenant()` (`tenant.ts:224-233`, n'exclut que APPRENANT/FORMATEUR/ENTREPRISE) ; vs `paiement-actions.ts:25,123` + `devis-actions.ts:23` = `requireSection("comptabilite"/"facturation")`.
- **Scénario d'impact :** un staff sans droit comptable peut créer/détruire des pièces financières → escalade fonctionnelle.
- **Recommandation :** gater `depositFacture` et la purge d'objets financiers derrière `requireSection` (voire rôle gérant).
- **Charge :** S — **Priorité :** P1 — **Type :** Quick win
- **Vérification :** un staff non-comptable ne peut ni déposer une facture ni purger une pièce financière.

#### A13-012 — `supprimerPaiement` = suppression physique sans corbeille ni audit — 🟠
- **Constat :** un règlement peut être effacé définitivement, sans soft-delete, sans acteur, sans audit.
- **Preuve :** `paiement-actions.ts:133` `db.paiement.deleteMany({where:{id}})` ; `Paiement` (schema:1743-1766) sans `deletedAt`/`supprimeParId` ; aucun `auditLog`.
- **Scénario d'impact :** encaissement effacé non rapprochable a posteriori, sans trace.
- **Recommandation :** soft-delete + journal + acteur sur la suppression de règlement.
- **Charge :** S — **Priorité :** P1 — **Type :** Standard
- **Vérification :** supprimer un règlement → soft-delete + entrée d'audit.

#### A13-013 — Cycle de vie facture client inexistant (pas d'avoir/annulation) — 🟠
- **Constat :** aucune action ne fait évoluer `Facture.statut` (figé à `ENVOYEE`) ; `avoirParentId`/`datePaiement` jamais renseignés ; les branches `AVOIR`/`ANNULEE`/`PAYEE` du FEC sont inatteignables pour les factures clients.
- **Preuve :** `facture.update` = uniquement `corbeille-actions.ts:115` (`deletedAt`) ; `avoirParentId` 0 usage applicatif (`schema:1730-1732`) ; `facture-actions.ts:74` fige `ENVOYEE`.
- **Scénario d'impact :** impossible d'annuler/avoir dans les règles ; la seule « annulation » est la purge (destructrice, A13-002) → rupture de piste d'audit.
- **Recommandation :** workflow de statut facture + émission d'avoir (facture négative liée `avoirParentId`), ou documenter que la facturation client est déléguée au logiciel source (et retirer les demi-mesures).
- **Charge :** M — **Priorité :** P1 — **Type :** Standard
- **Vérification :** émettre un avoir sur une facture client → document négatif lié + FEC correct.

#### A13-014 — Remboursement civique DB-only + accès conservé après remboursement — 🟠
- **Constat :** « Rembourser » marque `rembourse` + émet un avoir mais n'appelle jamais Stripe ; aucun webhook `charge.refunded` ; l'accès e-learning n'est pas révoqué.
- **Preuve :** `civique-actions.ts:338-348` (`updateMany statut:"rembourse"` + `createCivicAvoir`, pas de `stripe.refunds`) ; grep `refunds.create` = 0 ; `webhook/route.ts:69-160` ne gère aucun `charge.refunded` ; `civique-api.ts:504-512` (`entitledMentions` unit `civicMentions` non révoquées).
- **Scénario d'impact :** (a) l'argent n'est pas rendu (opérateur doit le faire à la main) ; (b) un remboursement fait au dashboard Stripe n'est pas réconcilié (reste `paye`, pas d'avoir) ; (c) le candidat garde l'accès ~30 j.
- **Recommandation :** `stripe.refunds.create({payment_intent})` dans l'action + traiter `charge.refunded` (idempotent) + révoquer la mention/l'accès.
- **Charge :** M — **Priorité :** P1 — **Type :** Standard
- **Vérification :** remboursement → argent rendu (Stripe), avoir émis, accès révoqué, base à jour dans les deux sens.

#### A13-015 — Réconciliation Stripe ↔ FactureEditeur impossible (deux systèmes déconnectés) — 🟠
- **Constat :** l'abonnement Stripe et la `FactureEditeur` (console/PDP) sont deux pistes sans lien ; l'app ne stocke ni id de facture Stripe, ni montant, ni date de paiement.
- **Preuve :** `FactureEditeur` sans champ Stripe (schema) ; `webhook:153-158` `invoice.paid` pose seulement `statut ACTIF` ; `paidAt` manuel (`facture-editeur-actions.ts:244`).
- **Scénario d'impact :** aucun rapprochement automatique encaissements Stripe ↔ factures émises ; risque de double-facturation (Stripe + FactureEditeur manuelle) ; détection d'écarts seulement via le dashboard.
- **Recommandation :** `stripeInvoiceId`/`stripeSubscriptionId` sur `FactureEditeur`, `paidAt` depuis `invoice.paid`, ledger local des encaissements.
- **Charge :** M — **Priorité :** P1 — **Type :** Standard
- **Vérification :** un `invoice.paid` renseigne la facture correspondante ; rapport de rapprochement disponible.

#### A13-016 — Exonération TVA civique codée en dur (ignore `assujettiTva`) — 🟠
- **Constat :** le flux civique force `tvaPct:0 / exonereTva:true` avec un motif fixe, sans lire la config `assujettiTva` de l'OF (que le devis, lui, respecte).
- **Preuve :** `civique-api.ts:257-260` + `examen-civique/facture/[id]/route.ts:78` ; `assujettiTva` (`schema:79`) respecté par `devis-actions.ts:41`.
- **Scénario d'impact :** un OF assujetti (ou en franchise art. 293 B, autre mention) émettrait des factures civiques à 0 % avec un motif erroné.
- **Recommandation :** dériver taux/exonération/motif de la config OF, comme le devis. *(OPINION : vérifier aussi l'éligibilité de l'exonération 261-4-4°a pour une prépa non certifiante.)*
- **Charge :** S — **Priorité :** P1 — **Type :** Quick win
- **Vérification :** OF assujetti → facture civique avec TVA correcte ; OF exonéré → mention exacte.

#### A13-017 — Résiliation : ni export des données, ni suppression ; rgpd-purge sur tenant résilié — 🟠
- **Constat :** `subscription.deleted` ne fait que passer le tenant `SUSPENDU` ; aucun export, aucune purge maîtrisée ; le cron RGPD continue d'anonymiser les candidats d'un tenant devenu inaccessible.
- **Preuve :** `webhook:105-110` (→SUSPENDU) ; `cron/rgpd-purge/route.ts` anonymise selon `dureeConservationMois` (`schema:145`) ; accès bloqué au layout (audit 11/05).
- **Scénario d'impact :** un OF résilié ne peut plus exporter ses données (accès coupé) alors qu'elles continuent d'être mutées → risque juridique + perte de réversibilité (croise audits 02/09).
- **Recommandation :** parcours d'export à la résiliation + politique de rétention/suppression du tenant.
- **Charge :** M — **Priorité :** P1 — **Type :** Standard
- **Vérification :** à la résiliation, un bundle d'export est proposé avant toute anonymisation.

#### A13-018 — Couverture de test FEC trompeuse (le cas réel n'est jamais testé) — 🟠
- **Constat :** les tests FEC utilisent toujours `montantHT ≠ 0`, jamais la forme réelle produite par `depositFacture` (`montantHT:0`) → suite verte masquant A13-001.
- **Preuve :** `compta/__tests__/fec.test.ts:11` (`HT:1000,TTC:1200`), `:31` (exonéré `HT=TTC=500`) ; aucun cas `montantHT:0`.
- **Scénario d'impact :** faux sentiment de sécurité — 84 tests verts alors que le FEC réel est faux.
- **Recommandation :** test `montantHT:0/TTC>0` (doit échouer aujourd'hui) + test d'intégration `collect → buildFec`.
- **Charge :** S — **Priorité :** P1 — **Type :** Quick win
- **Vérification :** le nouveau test échoue avant correctif A13-001, passe après.

---

### 4. POINTS CONFORMES (🟢)

1. **Montants en `Decimal(10,2)`** partout (pas de flottant) ; charges en `Int` centimes. *[AUTO]*
2. **Calculs documents exacts** (testés) : `calcDevisTotals` (arrondi ligne→somme→TVA : 3×33,33@20 %→99,99/20,00/119,99), `calcMontants` éditeur, `overageLignes`. *[chiffré]*
3. **FEC algébriquement équilibré** (débit=crédit, avoirs inversés, BROUILLON/ANNULEE exclus, 18 colonnes A47, nom `<SIREN>FEC<AAAA>1231.txt`) — le calcul est juste, c'est la donnée HT=0 qui casse (A13-001). *[AUTO]*
4. **`eurosDoc()` (2 décimales) sur les PDF légaux** (contrat, facture) — correctif A06-002 bien appliqué aux documents. *[chiffré]*
5. **Suite de tests financiers verte** : 12 fichiers, **84 tests passés, 0 échec** (`vitest run devis-calc plans montant-du facturx proforma numerotation facture-editeur-numero factures-editeur stripe-tax fec exports-compta`). *[AUTO/exécuté]*
6. **Numérotation éditeur atomique anti-doublon** : compteur `NumeroSequence` + incrément SQL, garde `numero:null`, retry P2002, reset par exercice, `maxSuffix` robuste. *[AUTO]*
7. **Numéro attribué seulement à l'émission** (null en brouillon → pas de trou de séquence par les brouillons) ; **suppression facture éditeur réservée au BROUILLON**. *[AUTO]*
8. **Avoir civique correct** : transactionnel (anti-trou), idempotent (un seul/facture), montants négatifs référençant l'origine. *[AUTO]*
9. **Tunnel Stripe PCI SAQ-A** : tout via Checkout hébergé, aucune donnée de carte dans l'app ; **signature webhook vérifiée** (corps brut) ; échec de traitement → 500 → rejeu Stripe ; **fulfillment civique idempotent** (`stripeSessionId @unique`). *[AUTO]*
10. **Dunning correct** : `past_due` reste ACTIF (période de grâce) + e-mail de relance ; suspension seulement à l'échec définitif ; coupure d'accès effective des SUSPENDU. *[AUTO]*
11. **TVA self-service correcte** : TaxRate 20 % exclusif idempotent (`stripe-tax.ts`) ; exonération 0 % civique ; devis force 0 % si OF non assujetti. *[AUTO]*
12. **Garde émetteur immatriculé** (SIRET + n° TVA obligatoires avant émission de facture éditeur) + garde d'identité (PC-JUR-02). *[AUTO]*

---

### 5. CONTRÔLES NON RÉALISÉS

| Contrôle | Raison | Ce qu'il faudrait |
|---|---|---|
| Rendu Stripe réel (facture TTC, Radar, litiges) | Conclusions tirées du code ; pas d'appel Stripe live ni accès dashboard | Environnement Stripe test + clés |
| Conformité PDF/A-3 stricte de Factur-X (veraPDF) | Non vérifiable en lecture statique (le code le signale lui-même) | Validateur PAC 2024 / veraPDF sur un PDF généré |
| Validité complète XML EN 16931 (BR-CO-*, BuyerReference BT-10, PaymentMeans BG-16) | Nécessite un validateur | Validateur Chorus Pro / PDP sandbox |
| Unité réelle de `Inscription.montant` (HT ou TTC) à la saisie | Non commentée au schéma ; conditionne la branche « montant saisi » de A13-003 | Décision produit + convention documentée |
| Prorata temporis | **Inexistant** dans le code (cf. A13-009) | Décision produit sur les changements de plan |
| Litiges/chargebacks & mandat SEPA échoué (`charge.dispute.*`, `setup_intent`) | Non gérés dans le webhook | Ajouter les handlers + tests |

---

### 6. QUICK WINS (fort risque / faible charge — en premier)

- **A13-004** ajouter `tax_rates` au checkout SEPA console (S, P0).
- **A13-001** capter/dériver le HT → FEC juste (M, P0).
- **A13-003** dériver le HT dans proforma/pré-facture (M, P0).
- **A13-018** test FEC `montantHT:0` (S, P1) — révèle A13-001.
- **A13-006** garde anti-double-souscription (S, P1).
- **A13-007** router la facture mensuelle vers le prix résolu (S, P1).
- **A13-011** gater dépôt facture + purge derrière `requireSection` (S, P1).
- **A13-016** exonération civique dérivée de `assujettiTva` (S, P1).
- **A13-019** `eurosDoc()` dans le devis-builder (S, P2).

---

### 7. PLAN DE REMÉDIATION

- **Vague 1 — avant Go-Live (P0) :** A13-004 (TVA SEPA) → A13-001 (HT/FEC) + A13-018 (test) → A13-003 (proforma) → A13-002 (garde purge + audit). Charge cumulée ≈ 3-4 j. *Conditions absolues du GO.*
- **Vague 2 — J+30 (P1) :** immuabilité (A13-005, A13-013), traçabilité/RBAC (A13-010, A13-011, A13-012), cohérence tarifaire (A13-007, A13-008), remboursements/réconciliation (A13-014, A13-015), exonération (A13-016), résiliation (A13-017), double-sub (A13-006). Charge ≈ 8-12 j (A13-009 = chantier, à cadrer).
- **Vague 3 — J+90 (P2/P3) :** affichage devis (A13-019), annuel (A13-020), numérotation tx (A13-021), XML/e-reporting (A13-022, A13-032), démo (A13-023), pilotage (A13-024, A13-025, A13-026), durcissements Stripe (A13-027→A13-031, A13-033).

---

### 8. ANNEXES

**Méthode :** 5 sous-agents parallèles (comptable FR, paiement Stripe, abonnements SaaS, testeur financier, risques financiers), preuve `fichier:ligne` imposée, preuve chiffrée sur les calculs. Contre-vérification personnelle par lecture directe : `facture-actions.ts:68`, `compta/collect.ts:50`, `compta/fec.ts:118-152` (A13-001) ; `corbeille-actions.ts:126-154` + `schema:1749-1751` (A13-002) ; `billing-actions.ts:34-99` (A13-006) ; `facture-editeur-actions.ts:227-260` + `statut-transitions.ts` (A13-005).
**Commande de test :** `npm run test -- devis-calc plans montant-du facturx proforma numerotation facture-editeur-numero factures-editeur stripe-tax fec exports-compta` → 12 fichiers, 84 tests passés, 1 skip, 0 échec.
**Fichiers clés :** `src/lib/{plans,pricing,stripe,usage,offre-lancement}.ts` ; `src/lib/factures/{devis-calc,editeur,facturx,pdp,proforma,pre-facture,a-facturer}.ts` ; `src/lib/comptabilite/montant-du.ts` ; `src/lib/compta/{collect,fec,exports-compta}.ts` ; `src/lib/actions/{billing,console-billing,facture,facture-editeur,paiement,devis,corbeille,demo-lifecycle,civique}-actions.ts` ; `src/app/api/stripe/webhook/route.ts` ; `src/app/api/civique/checkout/**` ; `prisma/schema.prisma`.
**Versions :** Next 16.3.1 · Prisma 6.19 / PostgreSQL · Stripe SDK · Node 24.16.

---

### 9. BLOC DE CONSOLIDATION (ne pas modifier le format)

```json
{
  "audit_id": 13,
  "audit_nom": "Audit paiement / facturation",
  "date": "2026-09-12",
  "commit": "0a4b4cc",
  "verdict": "GO_CONDITIONNEL",
  "compteurs": {"rouge": 4, "orange": 14, "jaune": 15, "vert": 12, "non_verifie": 6},
  "anomalies": [
    {"id": "A13-001", "gravite": "rouge", "titre": "FEC/exports comptables faux (CA=0, TVA=100% TTC)", "composant": "compta/fec.ts + facture-actions.ts", "preuve": "facture-actions.ts:68 (montantTTC seul) + collect.ts:50 (montantHT=0) + fec.ts:125 (tva=ttc-0)", "impact": "Comptabilité du client OF fausse, FEC rejetable", "recommandation": "Capter montantHT ou dériver HT=TTC/(1+taux)", "charge": "M", "priorite": "P0", "type": "quick_win", "depend_de": []},
    {"id": "A13-002", "gravite": "rouge", "titre": "Purge corbeille détruit factures/inscriptions + règlements en cascade sans garde ni audit", "composant": "corbeille-actions.ts", "preuve": "corbeille-actions.ts:139-146 + schema:1749,1751 onDelete:Cascade", "impact": "Perte définitive de trace comptable des encaissements", "recommandation": "Refuser purge si règlements + onDelete:Restrict + audit", "charge": "M", "priorite": "P0", "type": "standard", "depend_de": []},
    {"id": "A13-003", "gravite": "rouge", "titre": "Proforma/pré-facture surfacturée +20% (montantDu TTC réinjecté en HT)", "composant": "factures/proforma.ts + montant-du.ts", "preuve": "montant-du.ts:5 (TTC) consommé HT en proforma.ts:89,93 + pre-facture.ts:38-43 → +20%", "impact": "Document client 20% trop cher (OF assujettis)", "recommandation": "Dériver HT=montant/(1+taux) ; figer l'unité TTC", "charge": "M", "priorite": "P0", "type": "quick_win", "depend_de": []},
    {"id": "A13-004", "gravite": "rouge", "titre": "Checkout SEPA console sans ligne de TVA -> TVA non collectée", "composant": "console-billing-actions.ts", "preuve": "console-billing-actions.ts:64-83 (pas de tax_rates) vs billing-actions.ts:90,97 ; PRO 189 vs 226,80", "impact": "TVA non collectée (éditeur assujetti), totaux incohérents", "recommandation": "Ajouter tax_rates:[frTvaTaxRateId]", "charge": "S", "priorite": "P0", "type": "quick_win", "depend_de": []},
    {"id": "A13-005", "gravite": "orange", "titre": "Facture éditeur émise mutable en avoir par changement de statut", "composant": "facture-editeur-actions.ts + statut-transitions.ts", "preuve": "statut-transitions.ts:13-14 + facture-editeur-actions.ts:240-247 + editeur.ts:239", "impact": "Immuabilité rompue, avoir malformé", "recommandation": "Figer facture émise ; avoir = document séparé négatif", "charge": "M", "priorite": "P1", "type": "standard", "depend_de": []},
    {"id": "A13-006", "gravite": "orange", "titre": "Double-souscription possible (aucune garde)", "composant": "billing-actions.ts", "preuve": "billing-actions.ts:51-91 (pas de check stripeSubscriptionId/ACTIF)", "impact": "Double prélèvement mensuel possible", "recommandation": "Refuser si souscription active ; portail", "charge": "S", "priorite": "P1", "type": "quick_win", "depend_de": []},
    {"id": "A13-007", "gravite": "orange", "titre": "Facture mensuelle éditeur au prix codé (ignore prix édité console)", "composant": "facture-editeur-actions.ts + console-couts.ts", "preuve": "facture-editeur-actions.ts:48-50 (planForOrg.price) vs getResolvedPlans", "impact": "Facture != tarif configuré ; CA != MRR", "recommandation": "Router vers getResolvedPlans", "charge": "S", "priorite": "P1", "type": "quick_win", "depend_de": []},
    {"id": "A13-008", "gravite": "orange", "titre": "Remise de lancement -40% appliquée à vie", "composant": "offre-lancement.ts + contrat-prestation-actions.ts", "preuve": "contrat-prestation-actions.ts:62-67 ignore dureeMois ; console-billing flat récurrent", "impact": "Manque à gagner récurrent", "recommandation": "Coupon Stripe duration:repeating,6 ou schedule", "charge": "M", "priorite": "P1", "type": "standard", "depend_de": []},
    {"id": "A13-009", "gravite": "orange", "titre": "Aucun changement de plan ni prorata in-app", "composant": "billing", "preuve": "grep subscriptions.update|proration=0 ; price_data inline", "impact": "Montée/descente de gamme ingérable, pas de prorata", "recommandation": "Catalogue Prices + portail proration_behavior", "charge": "L", "priorite": "P1", "type": "chantier", "depend_de": []},
    {"id": "A13-010", "gravite": "orange", "titre": "Traçabilité financière insuffisante (pas de journal d'audit ni d'historique d'événements)", "composant": "actions financières + webhook", "preuve": "0 auditLog.create dans facture/paiement/devis/corbeille ; webhook ne persiste rien ; pas de BillingEvent", "impact": "Litige non instruisible, historique non reconstituable", "recommandation": "Journaliser + table BillingEvent", "charge": "M", "priorite": "P1", "type": "standard", "depend_de": []},
    {"id": "A13-011", "gravite": "orange", "titre": "RBAC financier incohérent (dépôt facture + purge = tout staff)", "composant": "tenant.ts + actions", "preuve": "facture-actions.ts:25 + corbeille-actions.ts:130 = requireStaffTenant vs paiement-actions.ts:25 requireSection", "impact": "Escalade fonctionnelle sur les pièces financières", "recommandation": "requireSection sur dépôt facture + purge", "charge": "S", "priorite": "P1", "type": "quick_win", "depend_de": []},
    {"id": "A13-012", "gravite": "orange", "titre": "supprimerPaiement = suppression physique sans corbeille ni audit", "composant": "paiement-actions.ts", "preuve": "paiement-actions.ts:133 deleteMany ; Paiement sans deletedAt", "impact": "Encaissement effaçable sans trace", "recommandation": "Soft-delete + audit + acteur", "charge": "S", "priorite": "P1", "type": "standard", "depend_de": []},
    {"id": "A13-013", "gravite": "orange", "titre": "Cycle de vie facture client inexistant (pas d'avoir/annulation)", "composant": "facture-actions.ts", "preuve": "facture.update = deletedAt seul ; avoirParentId 0 usage ; statut figé ENVOYEE", "impact": "Correction hors outil ; seule annulation = purge destructrice", "recommandation": "Workflow statut + émission d'avoir", "charge": "M", "priorite": "P1", "type": "standard", "depend_de": ["A13-002"]},
    {"id": "A13-014", "gravite": "orange", "titre": "Remboursement civique DB-only + accès conservé après remboursement", "composant": "civique-actions.ts + webhook", "preuve": "civique-actions.ts:338-348 (pas de stripe.refunds ; ne révoque pas civicMentions) ; pas de charge.refunded", "impact": "Argent non rendu / non réconcilié ; accès e-learning maintenu", "recommandation": "refunds.create + webhook charge.refunded + révoquer accès", "charge": "M", "priorite": "P1", "type": "standard", "depend_de": []},
    {"id": "A13-015", "gravite": "orange", "titre": "Réconciliation Stripe <-> FactureEditeur impossible", "composant": "webhook + schema", "preuve": "FactureEditeur sans champ Stripe ; invoice.paid pose seulement statut ACTIF", "impact": "Pas de rapprochement ; risque double-facturation", "recommandation": "stripeInvoiceId/paidAt depuis invoice.paid + ledger", "charge": "M", "priorite": "P1", "type": "standard", "depend_de": []},
    {"id": "A13-016", "gravite": "orange", "titre": "Exonération TVA civique codée en dur (ignore assujettiTva)", "composant": "civique-api.ts", "preuve": "civique-api.ts:257-260 (tvaPct:0,exonereTva:true) ; devis respecte assujettiTva (devis-actions.ts:41)", "impact": "TVA mal facturée / mention inexacte selon OF", "recommandation": "Dériver taux/exo/motif de la config OF", "charge": "S", "priorite": "P1", "type": "quick_win", "depend_de": []},
    {"id": "A13-017", "gravite": "orange", "titre": "Résiliation sans export des données ; rgpd-purge sur tenant résilié", "composant": "webhook + cron rgpd-purge", "preuve": "webhook:105-110 (SUSPENDU seul) + cron/rgpd-purge anonymise sans accès", "impact": "Pas d'export possible ; données mutées ; risque juridique", "recommandation": "Parcours d'export à la résiliation + rétention", "charge": "M", "priorite": "P1", "type": "standard", "depend_de": []},
    {"id": "A13-018", "gravite": "orange", "titre": "Couverture de test FEC trompeuse (cas montantHT:0 jamais testé)", "composant": "compta/__tests__/fec.test.ts", "preuve": "fec.test.ts:11,31 (HT toujours != 0)", "impact": "84 tests verts masquant le FEC faux (A13-001)", "recommandation": "Test montantHT:0 + intégration collect->buildFec", "charge": "S", "priorite": "P1", "type": "quick_win", "depend_de": ["A13-001"]},
    {"id": "A13-019", "gravite": "jaune", "titre": "euros() 0-décimale dans le constructeur de devis (affiché != PDF != prélevé)", "composant": "console/devis-builder.tsx", "preuve": "plans.ts:162 + devis-builder.tsx:306-318 (161 vs 160,65)", "impact": "Superadmin voit des montants arrondis à l'euro", "recommandation": "Utiliser eurosDoc()", "charge": "S", "priorite": "P2", "type": "quick_win", "depend_de": []},
    {"id": "A13-020", "gravite": "jaune", "titre": "priceYear non recalculé sur prix mensuel surchargé", "composant": "pricing.ts", "preuve": "pricing.ts:43-56 surcharge price pas priceYear ; billing-actions.ts:64", "impact": "Annuel déconnecté du mensuel édité (latent)", "recommandation": "Dériver priceYear du prix résolu", "charge": "S", "priorite": "P2", "type": "standard", "depend_de": []},
    {"id": "A13-021", "gravite": "jaune", "titre": "Numérotation facture éditeur : risque de trou (nextRef hors transaction)", "composant": "facture-editeur-actions.ts", "preuve": "facture-editeur-actions.ts:129-157 (increment puis update hors tx) vs numerotation.ts:22-26", "impact": "Trou de séquence possible sur échec concurrent (rare)", "recommandation": "Allouer le n° dans la transaction", "charge": "S", "priorite": "P2", "type": "standard", "depend_de": []},
    {"id": "A13-022", "gravite": "jaune", "titre": "XML Factur-X : échéance BT-9 + moyens de paiement absents", "composant": "factures/editeur.ts", "preuve": "editeur.ts:290-307 (pas de SpecifiedTradePaymentTerms)", "impact": "Rejet possible PDP/EN 16931 (2026)", "recommandation": "Ajouter les termes de paiement au XML", "charge": "S", "priorite": "P2", "type": "standard", "depend_de": []},
    {"id": "A13-023", "gravite": "jaune", "titre": "Démo auto-prolongeable sans limite", "composant": "demo-lifecycle-actions.ts", "preuve": "demo-lifecycle-actions.ts:27-33 (demoHardExpiresAt=now+7j à chaque fois)", "impact": "Usage gratuit illimité", "recommandation": "Figer le hard cap sur createdAt", "charge": "S", "priorite": "P2", "type": "standard", "depend_de": []},
    {"id": "A13-024", "gravite": "jaune", "titre": "MRR = prix catalogue (surévalue le récurrent réel)", "composant": "mrr-snapshot.ts", "preuve": "mrr-snapshot.ts:46 (prix de liste) vs contrat remisé", "impact": "Indicateur biaisé", "recommandation": "Baser sur le montant net du contrat signé", "charge": "S", "priorite": "P2", "type": "standard", "depend_de": []},
    {"id": "A13-025", "gravite": "jaune", "titre": "CA affiché TTC + bases CA/impayés non rapprochables", "composant": "tresorerie/comptabilite pages", "preuve": "tresorerie/page.tsx:51 (somme TTC) ; impayés base inscriptions", "impact": "Pilotage incohérent, CA surévalué (assujettis)", "recommandation": "Unifier la base + CA HT", "charge": "M", "priorite": "P2", "type": "standard", "depend_de": ["A13-001"]},
    {"id": "A13-026", "gravite": "jaune", "titre": "Factures formateurs sous-traitants absentes de l'export compta", "composant": "compta/collect.ts", "preuve": "collect.ts:21-42 ne lit pas FactureFormateur", "impact": "Charges de sous-traitance sous-estimées", "recommandation": "Intégrer FactureFormateur payées au journal AC", "charge": "S", "priorite": "P2", "type": "standard", "depend_de": []},
    {"id": "A13-027", "gravite": "jaune", "titre": "Code d'accès civique renvoyé via session_id en URL", "composant": "civique/checkout/[id]/route.ts", "preuve": "route.ts:23-49 (endpoint public renvoie civicToken)", "impact": "Fuite d'URL -> accès e-learning récupérable", "recommandation": "Renvoyer {paid:true} + livraison e-mail", "charge": "S", "priorite": "P2", "type": "standard", "depend_de": []},
    {"id": "A13-028", "gravite": "jaune", "titre": "Webhook Stripe sans déduplication event.id", "composant": "stripe/webhook/route.ts", "preuve": "webhook/route.ts:64-68 (pas de table events)", "impact": "Dette latente (futur handler incrémental)", "recommandation": "Garde event.id unique", "charge": "S", "priorite": "P3", "type": "standard", "depend_de": []},
    {"id": "A13-029", "gravite": "jaune", "titre": "stripeCustomerId sans contrainte unique", "composant": "schema + webhook", "preuve": "schema:135 + webhook:26-29 updateMany", "impact": "Risque MAJ cross-tenant si customer dupliqué", "recommandation": "Contrainte unique partielle + alerte", "charge": "S", "priorite": "P3", "type": "standard", "depend_de": []},
    {"id": "A13-030", "gravite": "jaune", "titre": "console-billing sans parité durcissement A12-004", "composant": "console-billing-actions.ts", "preuve": "console-billing-actions.ts:52-83 (pas de try/catch ni idempotencyKey)", "impact": "Plantage server action / customer dupliqué (outil interne)", "recommandation": "Aligner sur createCheckout", "charge": "S", "priorite": "P2", "type": "standard", "depend_de": []},
    {"id": "A13-031", "gravite": "jaune", "titre": "Mention exonération TVA absente du PDF lisible éditeur", "composant": "factures/editeur.ts", "preuve": "editeur.ts:210-220 (motif seulement dans le XML)", "impact": "Mention légale absente du doc lisible si taux 0 (latent)", "recommandation": "Afficher le motif si !tauxTva", "charge": "S", "priorite": "P2", "type": "standard", "depend_de": []},
    {"id": "A13-032", "gravite": "jaune", "titre": "e-reporting d'encaissement construit mais jamais transmis", "composant": "factures/pdp.ts", "preuve": "pdp.ts:106-118 appelé seulement en tests", "impact": "Obligation e-reporting 2026 non couverte", "recommandation": "Émettre l'e-reporting à l'encaissement", "charge": "M", "priorite": "P3", "type": "standard", "depend_de": []},
    {"id": "A13-033", "gravite": "jaune", "titre": "Facture civique sans quantité/PU explicites", "composant": "examen-civique/facture/[id]/route.ts", "preuve": "route.ts:117-122 (qté=1 implicite)", "impact": "Mentions perfectibles (B2C, faible)", "recommandation": "Ajouter qté/PU", "charge": "S", "priorite": "P3", "type": "standard", "depend_de": []}
  ],
  "conditions_go": [
    "A13-001 corrigé : FEC/exports ventilent HT/TVA réels (capter ou dériver le HT)",
    "A13-003 corrigé : proforma/pré-facture au bon montant (pas de +20%)",
    "A13-004 corrigé : TVA collectée sur le checkout SEPA console",
    "A13-002 corrigé : purge d'une facture/inscription avec règlements refusée + journalisée"
  ],
  "risques_residuels": [
    "Facturation OF->client = simple dépôt de PDF (pas de cycle de vie, d'avoir, ni de journal) tant que A13-013/010 non traités",
    "Réconciliation encaissements Stripe <-> factures éditeur absente (A13-015)",
    "Changement de plan / prorata inexistant (A13-009, chantier)",
    "Conformité e-invoicing 2026 incomplète (XML BT-9, e-reporting) : A13-022/032"
  ]
}
```
