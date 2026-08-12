// Génère les images source pour @capacitor/assets (icône + splash de l'app mobile).
// Source : public/ofmanager-logo.png (emblème + mot « OFManager »).
// Sortie  : assets/ (icon-only, icon-foreground, icon-background, splash, splash-dark).
// Lancer  : node scripts/gen-mobile-assets.mjs   (depuis la racine du repo)
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const repo = process.cwd()
const logoPath = path.join(repo, 'public', 'ofmanager-logo.png')
const outDir = path.join(repo, 'assets')
await mkdir(outDir, { recursive: true })

const WHITE = { r: 255, g: 255, b: 255, alpha: 1 }
const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 }

// Emblème = partie HAUTE du logo (au-dessus du mot « OFManager »), puis rognée au plus juste.
const meta = await sharp(logoPath).metadata()
const cropH = Math.min(Math.round(meta.height * 0.72), meta.height)
console.log(`Logo source : ${meta.width}x${meta.height} — crop haut = ${meta.width}x${cropH}`)
// NB : extract puis trim doivent être 2 pipelines séparés (sharp applique trim AVANT extract sinon).
const topBuf = await sharp(logoPath)
  .extract({ left: 0, top: 0, width: meta.width, height: cropH })
  .png()
  .toBuffer()
const emblem = await sharp(topBuf).trim().png().toBuffer()

// Place un buffer centré, à taille "box", sur un carré "canvas" au fond "bg".
async function centered(buf, box, canvas, bg) {
  const fitted = await sharp(buf)
    .resize(box, box, { fit: 'contain', background: bg })
    .toBuffer()
  return sharp({ create: { width: canvas, height: canvas, channels: 4, background: bg } })
    .composite([{ input: fitted, gravity: 'center' }])
    .png()
    .toBuffer()
}

// Icône adaptative Android : premier plan (emblème ~62 %, marge de sécurité contre le rognage)
await sharp(await centered(emblem, 640, 1024, CLEAR)).toFile(path.join(outDir, 'icon-foreground.png'))
// … fond plein blanc
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: WHITE } })
  .png()
  .toFile(path.join(outDir, 'icon-background.png'))
// Icône "classique" (non rognée) : emblème ~72 % sur blanc
await sharp(await centered(emblem, 740, 1024, WHITE)).toFile(path.join(outDir, 'icon-only.png'))

// Splash = logo COMPLET (emblème + mot), centré sur un carré blanc 2732.
const fullLogo = await sharp(logoPath).trim().png().toBuffer()
const splash = await centered(fullLogo, 1150, 2732, WHITE)
await sharp(splash).toFile(path.join(outDir, 'splash.png'))
await sharp(splash).toFile(path.join(outDir, 'splash-dark.png'))

console.log('OK — images source écrites dans', outDir)
