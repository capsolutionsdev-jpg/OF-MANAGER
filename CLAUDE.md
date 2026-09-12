@AGENTS.md

# ⚠️ Sessions d'audit — règles anti-pièges (détail : `audits/00-CONSIGNES-SESSIONS.md`)

Ce dépôt est audité en **plusieurs sessions Claude en parallèle**. Pièges VÉCUS le 2026-09-12 (commits mélangés entre branches, ~1 h perdue) — à ne pas revivre :

1. **UNE seule session Claude par working tree git.** Deux sessions dans ce dossier partagent un seul `HEAD` → quand l'une fait `git checkout` juste avant que l'autre committe, le commit part sur la **mauvaise branche**. Pour paralléliser : un `git worktree` distinct par chantier (`git worktree add ../ofm-<chantier> <branche>`), jamais deux sessions dans le même dossier.
2. **`main` LOCAL ≠ `origin/main`** (une session peut y empiler des commits non poussés, divergents). Avant de toucher `main` : `git fetch origin && git log --oneline origin/main..main`. Travailler sur une branche dédiée : `git checkout -b <chantier> origin/main`.
3. **Committer souvent** : le travail NON committé est effacé par les bascules de branche d'une autre session / de GitHub Desktop. Committé = à l'abri.
4. **Push** : remote = `capsolutionsdev-jpg/OF-MANAGER` (≠ compte `infocapcomp-dotcom` en cache Windows → 403). GitHub Desktop → Accounts → se connecter en `capsolutionsdev-jpg`, puis **« Publish branch »** (une branche à la fois).
