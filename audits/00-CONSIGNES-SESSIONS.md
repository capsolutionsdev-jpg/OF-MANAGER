# ⚠️ Consignes des sessions d'audit — pièges vécus & règles

> À lire **avant** toute session d'audit/remédiation sur ce dépôt (`OFMANAGER`, fork `capsolutionsdev-jpg/OF-MANAGER`).
> Ces règles viennent d'incidents **réellement survenus** — les respecter évite de perdre du temps et de mélanger le travail.

## 🔴 Règle n°1 — UNE seule session Claude par working tree git

Le programme lance **plusieurs audits en parallèle** (audit 11 accessibilité, audit 12 API/intégrations, etc.). **Ne jamais faire tourner deux sessions Claude dans le même dossier** `~/Desktop/ofmanager-commercial`.

**Pourquoi :** un dossier git n'a qu'**un seul `HEAD`**. Quand une session fait `git checkout <autre-branche>` juste avant que l'autre `git commit`, **le commit atterrit sur la mauvaise branche**.

**Incident 2026-09-12 :** les sessions audit 11 (a11y) et audit 12 (API) partageaient ce dossier → un commit a11y (`/solutions`) s'est posé sur `fix/audit-12-p0`, deux commits audit-12 (Stripe) sur `fix/a11y-signature-p0`, et du travail non committé a été effacé par les bascules de branche. Démêlage : ~1 h.

**Pour paralléliser proprement → un `git worktree` par chantier :**
```bash
git worktree add ../ofm-audit12 <branche-audit12>   # dossier séparé, HEAD séparé
```
Chaque session ouvre SON worktree. Jamais deux sessions dans le même dossier.

## 🔴 Règle n°2 — `main` LOCAL n'est PAS `origin/main`

Une session peut accumuler des commits **non poussés** sur le `main` **local**, qui diverge alors de `origin/main`. Committer/rebaser dessus mélange les chantiers.

**Toujours** vérifier avant de toucher `main` :
```bash
git fetch origin
git log --oneline origin/main..main      # s'il y a des commits ici = main local pollué, NE PAS committer dessus
```
Travailler sur une branche **basée sur le remote** : `git checkout -b <chantier> origin/main`.

## 🟠 Règle n°3 — Committer souvent

Les changements **non committés** sont effacés par les `checkout`/« discard » d'une autre session ou de GitHub Desktop. **Committé = à l'abri.** Committer après chaque petit lot vérifié (`tsc`/`eslint`).

## 🟠 Règle n°4 — Push GitHub (bon compte)

Le remote est **`capsolutionsdev-jpg/OF-MANAGER`**, ≠ le compte `infocapcomp-dotcom` en cache dans le Gestionnaire d'identification Windows → un push naïf renvoie **403**.

- GitHub Desktop : **File → Options → Accounts** → se connecter en `capsolutionsdev-jpg`, puis **« Publish branch »** (bouton pour une branche neuve ; « Push origin » n'apparaît qu'après). Une branche à la fois.
- OU en CLI : `cmdkey /delete:git:https://github.com` puis `git push -u origin <branche>` (s'authentifier `capsolutionsdev-jpg` dans le navigateur).

## Format de livrable (rappel)

Chaque audit : rapport `audits/AUDIT-XX-*.md` avec le **bloc JSON de consolidation** en fin (le prompt 25 les agrège). Audit en **lecture seule** du produit ; la remédiation se fait ensuite, **1 branche par chantier basée sur `origin/main`**.

---

## État post-incident 2026-09-12 (pour la session audit 12)

Le démêlage a préservé **tous** les commits. Repères :
- **Audit 11 (a11y)** : signature 🔴 + Lots 1-3 + doc **déjà sur `origin/main`** ; Lot 2c `/solutions` sur la branche `chore/audit11-finalize` (à merger).
- **Audit 12 (API)** — travail intact mais réparti, à recoller par la session audit 12 :
  - `fix/audit-12-p0` = `121e762` (ligne principale : A12-001/002/003/006/008/010/016 + docs) ;
  - `audit12-stripe-rescue` = `49e4b5d` (commits Stripe **A12-004 / A12-005**) ;
  - le `main` **local** portait aussi une copie de la ligne audit-12 (`7c252e5`, divergent de `origin/main`) — à réconcilier proprement sur `origin/main`, pas à pousser tel quel.
