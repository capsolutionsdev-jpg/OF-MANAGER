# E-mails candidats — OFManager (inventaire complet)

> Objectif : recenser **tous** les e-mails envoyés aux candidats/stagiaires, pour les retravailler.
> Chaque bloc `Corps` est le texte **actuel, verbatim**. Les `${...}` sont des variables remplacées à l'envoi.

## Comment lire / modifier
- **Automatisations (section A)** : le texte par défaut est dans `src/lib/automation-engine.ts`. Chaque OF peut aussi **surcharger objet + corps depuis la console** (réglages Automatisations) en utilisant des variables en accolades : `{prenom} {nom} {formation} {date_debut} {date_fin} {horaires} {lieu} {organisme} {representant} {lien}`.
- **Transactionnels (sections B à F)** : textes **codés en dur** dans `src/lib/actions/*` — pour les changer, il faut modifier le code (dis-moi les nouvelles versions et je les applique).
- **Signature standard** : `Cordialement,\n{representant} — {organisme}` (exceptions signalées ⚠️).
- **Envoi** : via Resend. En mode démo, aucun e-mail réel n'est envoyé.
- Segments entre `${x ? ... : ""}` = **conditionnels** (affichés seulement si la donnée existe).

## Index
| # | E-mail | Quand | Canal |
|---|--------|-------|-------|
| A1 | Convocation à la session | Auto, J-n avant le début | E-mail / SMS |
| A2 | Rappel J-1 | Auto, 24 h avant | E-mail / SMS |
| A3 | Convocation à l'examen | Auto, avant l'examen (formations à examen) | E-mail + PJ |
| A4 | Attestation d'entrée | Auto, 1er jour | E-mail + PJ |
| A5 | Test de positionnement | Auto, 1er jour | E-mail |
| A6 | Test de français | Auto, 1er jour | E-mail |
| A7 | Enquête de satisfaction | Auto, fin de formation | E-mail / SMS |
| A8 | Documents de fin (attestation) | Auto, fin de formation | E-mail + PJ |
| A9 | Suivi à 6 mois (Qualiopi) | Auto, +6 mois | E-mail / SMS |
| A10 | Émargement du jour | Auto, chaque demi-journée | E-mail |
| B1 | Invitation au parcours (dossier + signature) | À l'inscription | E-mail + PJ |
| B2 | Confirmation de signature | Quand le candidat signe | E-mail + PJ |
| B3 | Bienvenue & confirmation d'inscription | Après signature | E-mail + PJ |
| B4 | Bienvenue dans l'espace candidat | Après signature | E-mail |
| B5 | Pièces manquantes (relance dossier) | Manuel | E-mail |
| C1–C7 | Envois manuels (convocation, attestations, tests, avis) | Manuel (fiche session) | E-mail (± PJ) |
| D1 | Envoi d'un document | Manuel | E-mail + PJ |
| D2 | Envoi de plusieurs documents | Manuel | E-mail + PJ |
| D3 | Félicitations + attestation de réussite | Auto (certification obtenue) | E-mail + PJ |
| E1 | Lien de la fiche d'inscription (prospect) | Manuel | E-mail |
| E2 | Demande de signature d'émargement | Manuel | E-mail |
| F1 | Accès prépa civique (paiement Stripe) | Auto (paiement) | E-mail |
| F2 | Accès prépa civique (back-office/guichet) | Manuel | E-mail |

---

# A. Automatisations programmées
*Envoyées automatiquement par le planificateur (`automation-engine.ts`). Activables/désactivables et surchargeables par organisme depuis la console.*

## A1 — Convocation à la session
- **Quand** : quelques jours avant le début (J-n configurable), une fois le dossier signé.
- **Canal** : e-mail ou SMS. *SMS par défaut :* `Convocation ${f.titre} le ${fmt(s.dateDebut)}${s.lieu ? ` à ${s.lieu}` : ""}. ${org.name}`
- **Objet** : `Convocation — ${f.titre}`
```
Bonjour ${prenom},

Vous êtes convoqué(e) à la formation « ${f.titre} », du ${fmt(s.dateDebut)} au ${fmt(s.dateFin)}${s.horaires ? ` (${s.horaires})` : ""}${s.lieu ? `, à ${s.lieu}` : ""}.

Merci de vous présenter muni(e) d'une pièce d'identité.

Cordialement,
${org.representant} — ${org.name}
```
*(`src/lib/automation-engine.ts:175`)*

## A2 — Rappel J-1
- **Quand** : 24 h avant le début.
- **Canal** : e-mail ou SMS. *SMS par défaut :* `Rappel : « ${f.titre} » débute demain ${fmt(s.dateDebut)}${s.horaires ? ` (${s.horaires})` : ""}${s.lieu ? ` à ${s.lieu}` : ""}. ${org.name}`
- **Objet** : `Rappel — votre formation « ${f.titre} » commence demain`
```
Bonjour ${prenom},

Petit rappel : votre formation « ${f.titre} » débute le ${fmt(s.dateDebut)}${s.horaires ? ` (${s.horaires})` : ""}${s.lieu ? `, à ${s.lieu}` : ""}.

Merci de vous présenter à l'heure, muni(e) d'une pièce d'identité.

À demain,
${org.representant} — ${org.name}
```
*(`src/lib/automation-engine.ts:225`)*

## A3 — Convocation à l'examen
- **Quand** : avant l'examen, **uniquement pour les formations à examen** (ex. TFP APS ; jamais SST/MAC).
- **Canal** : e-mail + PJ (`Convocation-examen.pdf`, best-effort).
- **Objet** : `Convocation à l'examen — ${f.titre}`
```
Bonjour ${prenom},

Vous êtes convoqué(e) à l'épreuve de certification de la formation « ${f.titre} », prévue le ${fmt(s.dateExamen ?? s.dateFin)}${s.horaires ? ` (${s.horaires})` : ""}${(s.lieuExamen ?? s.lieu) ? `, à ${s.lieuExamen ?? s.lieu}` : ""}.

Vous trouverez votre convocation à l'examen en pièce jointe (PDF). Merci de vous présenter muni(e) d'une pièce d'identité en cours de validité.

Cordialement,
${org.representant} — ${org.name}
```
*(`src/lib/automation-engine.ts:264`)*

## A4 — Attestation d'entrée en formation
- **Quand** : au 1er jour de la session.
- **Canal** : e-mail + PJ (`Attestation-entree.pdf`).
- **Objet** : `Attestation d'entrée en formation — ${f.titre}`
```
Bonjour ${prenom},

Nous confirmons votre entrée en formation « ${f.titre} » le ${fmt(s.dateDebut)}.

Vous trouverez ci-joint votre attestation d'entrée signée, au format PDF.

Bonne formation,
${org.representant} — ${org.name}
```
*(`src/lib/automation-engine.ts:299`)*

## A5 — Test de positionnement (1er jour)
- **Quand** : le jour du démarrage.
- **Canal** : e-mail.
- **Objet** : `Test de positionnement — ${f.titre}`
```
Bonjour ${prenom},

Bienvenue dans votre formation « ${f.titre} » !

Avant de commencer, merci de répondre à ce court test de positionnement
(une dizaine de questions, 5 minutes). Il nous permet d'adapter le contenu
et le rythme à votre profil :

${base}/positionnement/${posToken}

Vos réponses, signées, seront conservées dans votre dossier de formation.

Bonne formation,
${org.representant} — ${org.name}
```
*(`src/lib/automation-engine.ts:352`)*

## A6 — Test de français (1er jour)
- **Quand** : pendant la session (1er jour).
- **Canal** : e-mail.
- **Objet** : `Test de français — ${f.titre}`
```
Bonjour ${prenom},

Dans le cadre de votre entrée en formation « ${f.titre} », merci de répondre à ce court test de français (une quinzaine de questions, environ 10 minutes) :

${base}/francais/${frToken}

Vos réponses, signées, seront conservées dans votre dossier de formation.

Bonne formation,
${org.representant} — ${org.name}
```
*(`src/lib/automation-engine.ts:386`)*

## A7 — Enquête de satisfaction (fin de formation)
- **Quand** : à la fin de la formation.
- **Canal** : e-mail ou SMS. *SMS par défaut :* `${prenom}, merci d'évaluer la formation « ${f.titre} » : ${base}/satisfaction/${satToken}`
- **Objet** : `Votre avis sur la formation — ${f.titre}`
```
Bonjour ${prenom},

Vous venez de terminer la formation « ${f.titre} ». Votre retour est précieux !

Merci de compléter ce court questionnaire de satisfaction :
${base}/satisfaction/${satToken}

Une remarque ou une difficulté à nous signaler ? Vous pouvez déposer une
réclamation via ce formulaire (traitée sous 15 jours ouvrés) :
${base}/reclamer/${satToken}

Cordialement,
${org.representant} — ${org.name}
```
*(`src/lib/automation-engine.ts:417`)*

## A8 — Documents de fin de formation (attestation)
- **Quand** : à la fin de la formation.
- **Canal** : e-mail + PJ (`Attestation-fin.pdf`).
- **Objet** : `Attestation de fin de formation — ${f.titre}`
```
Bonjour ${prenom},

Félicitations pour avoir suivi la formation « ${f.titre} » (du ${fmt(s.dateDebut)} au ${fmt(s.dateFin)}).

Vous trouverez ci-joint votre attestation de fin de formation (PDF). L'ensemble de vos documents reste disponible ici :
${base}/parcours/${i.accessToken}/documents

Cordialement,
${org.representant} — ${org.name}
```
*(`src/lib/automation-engine.ts:489`)*

## A9 — Suivi à 6 mois (Qualiopi ind. 11)
- **Quand** : 6 mois après la fin de la formation.
- **Canal** : e-mail ou SMS. *SMS par défaut :* `${prenom}, 2 min pour nous dire où vous en êtes 6 mois après « ${f.titre} » : ${base}/suivi/${suiviToken}`
- **Objet** : `Et 6 mois après ? Votre suivi — ${f.titre}`
```
Bonjour ${prenom},

Il y a environ 6 mois, vous terminiez la formation « ${f.titre} ». Dans le cadre de notre démarche qualité (Qualiopi), nous aimerions savoir où vous en êtes aujourd'hui (situation professionnelle, lien avec la formation…).

Merci de répondre à ce court questionnaire (2 minutes) et de le signer :
${base}/suivi/${suiviToken}

Vos réponses nous aident à améliorer nos formations.

Cordialement,
${org.representant} — ${org.name}
```
*(`src/lib/automation-engine.ts:555`)*

## A10 — Émargement du jour (matin / après-midi)
- **Quand** : chaque demi-journée (matin avant 13 h, sinon après-midi).
- **Canal** : e-mail.
- **Objet** : `Émargement ${demiLabel} — ${e.session.formation.titre}`  *(demiLabel = « matin » ou « après-midi »)*
```
Bonjour ${e.nom},

Merci de signer votre présence (${demiLabel}) à la formation « ${e.session.formation.titre} » en cliquant sur ce lien :
${link}

Cordialement,
${org.representant} — ${org.name}
```
*(`src/lib/automation-engine.ts:655`)*

---

# B. Inscription & parcours e-signature
*Envoyés automatiquement au fil du parcours d'inscription (textes codés en dur).*

## B1 — Invitation au parcours (dossier + signature)
- **Quand** : à l'inscription (`startParcours`) ; renvoyable manuellement. Lien personnel tokenisé.
- **Canal** : e-mail + PJ (`Programme-formation.pdf`, best-effort).
- **Objet** : `Votre inscription — ${insc.session.formation.titre}`
```
Bonjour ${insc.candidat.prenom},

Votre inscription à la formation « ${insc.session.formation.titre} » a bien été enregistrée.

Pour finaliser votre dossier, merci de compléter vos informations et de signer vos documents en cliquant sur le lien sécurisé ci-dessous :

${link}

Vous trouverez ci-joint le programme de la formation. Ce lien vous est personnel ; à l'issue, vous recevrez une copie de vos documents signés.

Cordialement,
${org.representant} — ${org.name}
```
*(`src/lib/actions/parcours-actions.ts:72`)*

## B2 — Confirmation de signature (documents signés)
- **Quand** : quand le candidat signe ses documents.
- **Canal** : e-mail + PJ (dossier signé + certificat de signature).
- **Objet** : `Vos documents signés — ${insc.session.formation.titre}`
```
Bonjour ${insc.candidat.prenom},

Nous vous confirmons la signature de vos documents d'inscription le ${now}.

Vous trouverez ci-joint, au format PDF, l'ensemble de vos documents signés (fiche d'inscription, contrat, convention, règlement intérieur) ainsi que votre certificat de signature électronique.

Vous recevez par ailleurs votre convocation à la formation.

Cordialement,
${org.representant} — ${org.name}
```
*(`src/lib/actions/parcours-actions.ts:517` — `${now}` = date/heure de signature)*

## B3 — Bienvenue & confirmation d'inscription (convocation)
- **Quand** : juste après la signature, si la convocation n'a pas déjà été envoyée.
- **Canal** : e-mail + PJ (`Convocation.pdf` + `Programme-formation.pdf`).
- **Objet** : `Bienvenue & confirmation de votre inscription — ${s.formation.titre}`
```
Bonjour ${insc.candidat.prenom},

Bienvenue chez ${org.name} ! Nous avons le plaisir de vous confirmer votre inscription à la formation « ${s.formation.titre} », du ${f(s.dateDebut)} au ${f(s.dateFin)}${s.horaires ? ` (${s.horaires})` : ""}${s.lieu ? `, à ${s.lieu}` : ""}.

Vous trouverez ci-joint votre convocation et le programme de la formation (PDF). Merci de vous présenter muni(e) d'une pièce d'identité.

Toute l'équipe vous souhaite une excellente formation.

Cordialement,
${org.representant} — ${org.name}
```
*(`src/lib/actions/parcours-actions.ts:559`)*

## B4 — Bienvenue dans votre espace candidat (accès e-learning)
- **Quand** : après signature (création du compte apprenant).
- **Canal** : e-mail.
- **Objet** : `Bienvenue dans votre espace candidat — ${org.name}`
```
Bonjour ${insc.candidat.prenom},

Bienvenue ! Votre espace candidat est prêt. Vous pourrez y suivre vos formations, consulter et signer vos documents, déposer vos pièces justificatives et échanger avec nous.

Connectez-vous ici :
${loginUrl}

${ident}
${listeCours}
À votre première connexion, vous choisirez votre propre mot de passe.

À bientôt,
${org.representant} — ${org.name}
```
- `${ident}` : **nouveau compte** → `Identifiant : ${email}` + `Mot de passe provisoire : ${motDePasse}` ; **compte existant** → `Connectez-vous avec votre adresse e-mail (${email}) et votre mot de passe habituel.`
- `${listeCours}` : liste à puces des cours en ligne, ou vide.
*(`src/lib/actions/parcours-actions.ts:702`)*

## B5 — Pièces manquantes (relance dossier)
- **Quand** : relance manuelle, avec la liste des pièces non reçues.
- **Canal** : e-mail.
- **Objet** : `Pièces manquantes — ${insc.session.formation.titre}`
```
Bonjour ${insc.candidat.prenom},

Pour finaliser votre dossier d'inscription à « ${insc.session.formation.titre} », il nous manque encore les pièces suivantes :

${liste}

Merci de nous les transmettre dès que possible.

Cordialement,
${cfg.name}
```
> ⚠️ Signature **`${cfg.name}` seule** (sans représentant) — à harmoniser avec les autres. `${liste}` = pièces à puces `• …`.
*(`src/lib/actions/inscription-actions.ts:459`)*

---

# C. Envois manuels (fiche session / inscription)
*Déclenchés à la main. ⚠️ Ce sont, pour la plupart, des **variantes légèrement différentes** des automatisations A — voir « Harmonisation » en fin de document.*

## C1 — Convocation (manuel) — variante de A1
- **Objet** : `Convocation — ${f.titre}`
```
Bonjour ${prenom},

Vous êtes convoqué(e) à la formation « ${f.titre} », du ${fmt(s.dateDebut)} au ${fmt(s.dateFin)}${s.horaires ? ` (${s.horaires})` : ""}${s.lieu ? `, à ${s.lieu}` : ""}.

Merci de vous présenter muni(e) d'une pièce d'identité.

Cordialement,
${org.representant} — ${org.name}
```
*(`src/lib/actions/manual-send-actions.ts:76`)*

## C2 — Attestation d'entrée (manuel) — variante de A4
- **Objet** : `Attestation d'entrée — ${f.titre}` · e-mail + PJ
```
Bonjour ${prenom},

Nous confirmons votre entrée en formation « ${f.titre} » le ${fmt(s.dateDebut)}. Vous trouverez ci-joint votre attestation d'entrée (PDF).

Cordialement,
${org.representant} — ${org.name}
```
*(`src/lib/actions/manual-send-actions.ts:87`)*

## C3 — Attestation de fin (manuel) — variante de A8
- **Objet** : `Attestation de fin — ${f.titre}` · e-mail + PJ
```
Bonjour ${prenom},

Félicitations pour avoir suivi la formation « ${f.titre} ». Vous trouverez ci-joint votre attestation de fin de formation (PDF).${lien}

Cordialement,
${org.representant} — ${org.name}
```
> `${lien}` (si accès en ligne) = `\n\nVos documents restent disponibles ici : ${base}/parcours/${accessToken}/documents`
*(`src/lib/actions/manual-send-actions.ts:100`)*

## C4 — Test de positionnement (manuel) — variante de A5
- **Objet** : `Test de positionnement — ${f.titre}`
```
Bonjour ${prenom},

Avant de commencer la formation « ${f.titre} », merci de répondre à ce court test de positionnement (5 min) :
${base}/positionnement/${token}

Cordialement,
${org.representant} — ${org.name}
```
*(`src/lib/actions/manual-send-actions.ts:114`)*

## C5 — « Votre avis » (manuel) — variante de A7
- **Objet** : `Votre avis — ${f.titre}`
```
Bonjour ${prenom},

Vous avez suivi la formation « ${f.titre} ». Votre retour est précieux — merci de compléter ce court questionnaire de satisfaction :
${base}/satisfaction/${token}

Cordialement,
${org.representant} — ${org.name}
```
*(`src/lib/actions/manual-send-actions.ts:128`)*

## C6 — Convocation (envoi groupé d'une session) — variante de A1
- **Objet** : `Convocation — ${s.formation.titre}`
```
Bonjour ${insc.candidat.prenom},

Vous êtes convoqué(e) à la formation « ${s.formation.titre} » qui se déroulera du ${fmt(s.dateDebut)} au ${fmt(s.dateFin)}${s.horaires ? ` (${s.horaires})` : ""}${s.lieu ? `, à ${s.lieu}` : ""}.

Merci de vous présenter muni(e) d'une pièce d'identité.

Cordialement,
${org.representant} — ${org.name}
```
> Deux fonctions identiques (`email-actions.ts:39` et `:81`). Diffère de A1/C1 par « qui se déroulera ».

## C7 — Enquête de satisfaction (signable) — variante de A7
- **Objet** : `Votre avis sur la formation « ${insc.session.formation.titre} »`
```
Bonjour ${insc.candidat.prenom} ${insc.candidat.nom},

Vous venez de suivre la formation « ${insc.session.formation.titre} ».
Merci de prendre quelques minutes pour compléter et signer ce court questionnaire de satisfaction :
${link}

Votre retour nous aide à améliorer la qualité de nos formations.

Cordialement,
${org.representant} — ${org.name}
```
*(`src/lib/actions/inscription-actions.ts:247`)*

---

# D. Documents & attestations

## D1 — Envoi d'un document
- **Objet** : `${doc.label} — ${titre}` · e-mail + PJ (1 PDF)
```
Bonjour ${insc.candidat.prenom},

Vous trouverez ci-joint le document suivant : ${doc.label}.

Cordialement,
${org.representant} — ${org.name}
```
> Si un message personnalisé est saisi, il s'insère avant « Cordialement ».
*(`src/lib/actions/document-actions.ts:64`)*

## D2 — Envoi de plusieurs documents
- **Objet** : `Vos documents — ${titre}` (ou `${labels[0]} — ${titre}` si un seul) · e-mail + PJ (N PDF)
```
Bonjour ${insc.candidat.prenom},

Vous trouverez ci-joint les documents suivants :
${liste}

Cordialement,
${org.representant} — ${org.name}
```
> `${liste}` = puces `• …`. « le document suivant » au singulier si un seul. Message perso optionnel.
*(`src/lib/actions/document-actions.ts:139`)*

## D3 — Félicitations + attestation de réussite
- **Quand** : automatique quand une certification est obtenue (`CERTIFIE`). Envoi unique.
- **Canal** : e-mail + PJ (`Attestation-reussite.pdf`).
- **Objet** : `Félicitations — vous avez obtenu « ${titre} »`
```
Bonjour ${insc.candidat.prenom},

Toutes nos félicitations ! Vous avez satisfait aux épreuves d'évaluation et obtenu la certification « ${titre} ».

Vous trouverez ci-joint votre attestation de réussite (PDF).

Votre diplôme officiel vous sera transmis dès sa réception par nos services : nous vous enverrons un e-mail à ce moment-là pour organiser sa remise.

Encore bravo, et à bientôt,
${org.representant} — ${org.name}
```
*(`src/app/api/inscriptions/[id]/attestation-reussite/route.ts:62`)*

---

# E. Prospection & émargement

## E1 — Lien de la fiche d'inscription (prospect)
- **Quand** : manuel, depuis la fiche prospect du CRM.
- **Objet** : `Votre fiche d'inscription — ${org.name}`
```
Bonjour ${c.prenom} ${c.nom},

Suite à votre demande, merci de compléter et signer votre fiche d'inscription en ligne :
${link}

Vous y renseignez vos informations, la formation souhaitée, puis vous signez directement avec votre doigt (mobile) ou votre souris (ordinateur).

Cordialement,
${org.representant} — ${org.name}
```
*(`src/lib/actions/prospect-actions.ts:62`)*

## E2 — Demande de signature d'émargement (manuel) — variante de A10
- **Objet** : `Signature d'émargement (${demiLabel}) — ${e.session.formation.titre}`
```
Bonjour ${e.nom},

Merci de signer votre présence du ${jour} (${demiLabel}) à la formation « ${e.session.formation.titre} » en cliquant sur ce lien :
${link}

Vous signerez directement avec votre doigt (sur mobile) ou votre souris (sur ordinateur).

Cordialement,
${org.representant} — ${org.name}
```
*(`src/lib/actions/emargement-signature-actions.ts:135`)*

---

# F. Examen civique (produit e-learning)
> ⚠️ Signatures spécifiques (« L'équipe CAP Compétences » / « L'équipe CAP Language Academy ») — non génériques.

## F1 — Accès prépa civique (paiement en ligne Stripe)
- **Objet** : `Votre accès à la préparation à l'examen civique`
```
Bonjour ${candidat.prenom || ""},

Merci pour votre inscription à la préparation à l'examen civique — ${MENTION_NOM_LISIBLE[mention]}.
Votre paiement de ${euros} € est confirmé (reçu également disponible sur votre tableau de bord Stripe).

VOTRE CODE D'ACCÈS : ${token}

Pour démarrer votre parcours, connectez-vous avec votre e-mail (${candidat.email}) et ce code, onglet « Code d'accès » :
${VITRINE_BASE}/cap-language-academy/examen-civique/connexion

Conservez ce code précieusement : il vous permet de retrouver votre progression sur tous vos appareils.

À bientôt,
L'équipe CAP Compétences
```
*(`src/lib/civique-api.ts:497`)*

## F2 — Accès prépa civique (back-office / guichet)
- **Objet** : `Votre accès à la préparation à l'examen civique`
```
Bonjour ${args.prenom || ""},

Votre accès à la préparation à l'examen civique est activé.
Formation : ${MENTION_LABEL[args.mention]}

Pour vous connecter :
1. Rendez-vous sur ${CONNEXION_URL}
2. Onglet « Code d'accès »
3. E-mail : ${args.email}
4. Code d'accès : ${args.code}

Avancez à votre rythme : leçons, quiz et examens blancs illimités.

Bonne préparation,
L'équipe CAP Language Academy
```
*(`src/lib/actions/civique-actions.ts:76`)*

---

# 🔧 Harmonisation (à décider avant réécriture)
Plusieurs e-mails existent en **doublons** (même objet, texte légèrement différent selon qu'il part en auto ou manuellement). À unifier :

| Sujet | Versions | Différence à trancher |
|---|---|---|
| **Convocation session** | A1 (auto), C1 (manuel), C6 (groupé), + B3 | « du … au … » vs « qui se déroulera du … » |
| **Satisfaction** | A7 (auto, + réclamation), C5 (manuel court), C7 (signable) | 3 objets différents, longueurs différentes |
| **Attestation d'entrée** | A4 (auto), C2 (manuel) | « Bonne formation » vs « Cordialement » |
| **Attestation de fin** | A8 (auto), C3 (manuel) | présence du lien documents |
| **Test de positionnement** | A5 (auto, long), C4 (manuel, court) | ton et longueur |
| **Émargement** | A10 (auto, court), E2 (manuel, long) | mention « doigt/souris » |
| **Signature** | Standard `representant — organisme` partout | sauf **B5** (`cfg.name` seul) et **F1/F2** (civique) |

**Points de style récurrents à revoir globalement** : la formule « muni(e) d'une pièce d'identité », l'absence d'objet accrocheur, pas de personnalisation au-delà du prénom, aucun HTML (texte brut). Dis-moi la direction voulue (ton, mise en forme, signature unique, HTML ou non) et je réécris + réapplique dans le code.

> **Hors périmètre candidat** (existent mais pas listés ici) : convocations/attestations « de votre salarié » envoyées à l'**entreprise**, e-mails aux **formateurs** (contrat, compte-rendu, émargement), aux **jurys**, et les notifications **éditeur/support**. Dis-moi si tu veux aussi les récupérer.
