// Fournit un mot de passe de seed SANS jamais le stocker en dur dans le dépôt.
//
//  - required:true  → comptes réels (SUPERADMIN, ADMIN vitrine…) : REFUSE de
//    tourner si la variable d'environnement n'est pas fournie (pas de repli).
//  - required:false → seeds démo/dev : génère un mot de passe aléatoire fort et
//    l'affiche UNE fois (l'opérateur peut aussi fixer la variable d'env pour un
//    mot de passe stable, ex. relancer un tenant démo documenté).
//
// Correctif audit sécurité P1-1 : plus aucun identifiant en clair dans le code.
const crypto = require("crypto");

function seedPassword(envVar, { required = false, label = envVar } = {}) {
  const raw = process.env[envVar];
  if (raw && raw.trim().length >= 8) return raw.trim();
  if (raw && raw.trim().length > 0) {
    console.error(`✗ ${envVar} trop court (minimum 8 caractères).`);
    process.exit(1);
  }
  if (required) {
    console.error(`✗ ${envVar} non défini. Fournis un mot de passe fort au lancement :`);
    console.error(`   ${envVar}="…" node scripts/<script>   (ne jamais l'écrire dans le code)`);
    process.exit(1);
  }
  const gen = crypto.randomBytes(12).toString("base64url");
  console.warn(`⚠️  ${envVar} non défini → mot de passe « ${label} » généré (à noter maintenant) : ${gen}`);
  return gen;
}

module.exports = { seedPassword };
