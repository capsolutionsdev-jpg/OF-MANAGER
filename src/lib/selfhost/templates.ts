// Fichiers du package « auto-hébergé » téléchargé depuis la console.
// Source unique : ces gabarits sont assemblés en archive ZIP par
// /console/[id]/export. Aucun secret n'y figure (le client renseigne les siens).

export type SelfHostMeta = {
  nom: string;
  sousDomaine: string | null;
  appUrl: string | null;
};

export function dockerfile(): string {
  return `# OFManager — image de production (Next.js standalone)
# Build : docker build -t ofmanager .
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
# Décommenter si la génération de PDF (puppeteer) est utilisée en self-host :
# RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont
# ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
EXPOSE 3000
CMD ["node", "server.js"]
`;
}

export function dockerCompose(meta: SelfHostMeta): string {
  return `# OFManager — déploiement auto-hébergé
# 1) Copier .env.example en .env et le renseigner
# 2) docker compose up -d --build
# 3) docker compose exec app node prisma/import-config.mjs   (1re mise en route)
services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: ofmanager
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD:-changeme}
      POSTGRES_DB: ofmanager
    volumes:
      - db-data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  app:
    build: .
    restart: unless-stopped
    env_file: .env
    depends_on:
      - db
    ports:
      - "3000:3000"
    # Instance : ${meta.nom}${meta.sousDomaine ? ` (${meta.sousDomaine})` : ""}

volumes:
  db-data:
`;
}

export function envExample(meta: SelfHostMeta): string {
  const appUrl = meta.appUrl || "https://votre-domaine.fr";
  return `# =============================================================
#  OFManager auto-hébergé — variables d'environnement
#  Copier ce fichier en .env (NE PAS versionner les secrets)
# =============================================================

# Base de données PostgreSQL (le service "db" du docker-compose, ou votre instance)
DATABASE_URL="postgresql://ofmanager:changeme@db:5432/ofmanager?schema=public"
DIRECT_URL="postgresql://ofmanager:changeme@db:5432/ofmanager?schema=public"
POSTGRES_PASSWORD="changeme"

# Auth.js — générer un secret : openssl rand -base64 32
AUTH_SECRET=""
AUTH_TRUST_HOST="true"

# URL publique de l'instance (liens dans les e-mails)
APP_URL="${appUrl}"

# Compte administrateur initial (utilisé par prisma/import-config.mjs)
ADMIN_EMAIL="admin@${meta.sousDomaine || "votre-of"}.fr"
ADMIN_PASSWORD="changez-moi"

# --- Intégrations optionnelles (laisser vide = mode démo) ---
BREVO_API_KEY=""
BREVO_SENDER="contact@${meta.sousDomaine || "votre-of"}.fr"
BREVO_SMS_SENDER="OF"
ANTHROPIC_API_KEY=""
YOUSIGN_API_KEY=""
CRON_SECRET=""
`;
}

export function importScript(): string {
  return `// Initialisation d'une instance auto-hébergée OFManager.
// 1) crée/maj l'organisme à partir de config.json
// 2) crée le compte administrateur depuis ADMIN_EMAIL / ADMIN_PASSWORD
// Usage : node prisma/import-config.mjs
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const cfg = JSON.parse(readFileSync(new URL("../config.json", import.meta.url)));
  const id = cfg.identite ?? {};
  const design = cfg.design ?? {};

  const org = await prisma.organisme.upsert({
    where: { nom: id.nom ?? "Organisme" },
    update: {},
    create: {
      nom: id.nom ?? "Organisme",
      raisonSociale: id.raisonSociale ?? null,
      siret: id.siret ?? null,
      nda: id.nda ?? null,
      adresse: id.adresse ?? null,
      codePostal: id.codePostal ?? null,
      ville: id.ville ?? null,
      telephone: id.telephone ?? null,
      email: id.email ?? null,
      design: design.design ?? "defaut",
      couleurPrimaire: design.couleurPrimaire ?? "#2C53C0",
      theme: design.theme ?? null,
      logoUrl: design.logoUrl ?? null,
      fonctionnalites: cfg.abonnement?.fonctionnalites ?? [],
      automationsConfig: cfg.automationsConfig ?? undefined,
      documentsConfig: cfg.documentsConfig ?? undefined,
    },
  }).catch(async () => {
    // Repli si "nom" n'est pas unique sur votre schéma : crée sans upsert.
    return prisma.organisme.create({ data: { nom: id.nom ?? "Organisme" } });
  });

  const email = (process.env.ADMIN_EMAIL || "admin@local").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "changez-moi";
  await prisma.user.upsert({
    where: { email },
    update: { organismeId: org.id, isActive: true },
    create: {
      name: "Administrateur",
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role: "ADMIN",
      isActive: true,
      organismeId: org.id,
    },
  });

  console.log("✓ Instance initialisée :", org.nom, "— admin :", email);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
`;
}

export function readme(meta: SelfHostMeta): string {
  return `# OFManager — Instance auto-hébergée « ${meta.nom} »

Ce paquet contient tout le nécessaire pour héberger **votre** instance OFManager
sur votre propre serveur. Les secrets (clés API) ne sont **pas** inclus.

## Contenu
- \`config.json\` — votre configuration (identité, design, automatisations…)
- \`Dockerfile\` + \`docker-compose.yml\` — déploiement conteneurisé
- \`.env.example\` — variables d'environnement à renseigner
- \`prisma/import-config.mjs\` — script d'initialisation (organisme + admin)

## Pré-requis
- Le **code source** OFManager (dépôt Git fourni par l'éditeur).
- Docker + Docker Compose, **ou** Node 20 + PostgreSQL 16.

## Démarrage rapide (Docker)
1. Placez ces fichiers à la racine du code source (et \`import-config.mjs\` dans \`prisma/\`).
2. \`cp .env.example .env\` puis renseignez \`AUTH_SECRET\`, \`APP_URL\`, mot de passe BDD…
3. \`docker compose up -d --build\`
4. Appliquez le schéma : \`docker compose exec app npx prisma db push\`
5. Initialisez : \`docker compose exec app node prisma/import-config.mjs\`
6. Ouvrez \`${meta.appUrl || "http://localhost:3000"}\` et connectez-vous avec \`ADMIN_EMAIL\`.

## Sans Docker
\`\`\`bash
npm ci
npx prisma generate && npx prisma db push
npm run build && npm start          # sert sur le port 3000
node prisma/import-config.mjs        # 1re mise en route
\`\`\`

## Notes
- **PDF** : la génération de documents PDF nécessite Chromium. En Docker, décommentez
  le bloc \`apk add chromium\` du \`Dockerfile\` et la variable \`PUPPETEER_EXECUTABLE_PATH\`.
- **Mises à jour** : \`git pull\` puis \`docker compose up -d --build\`.
- **Support** : conservez ce paquet ; l'éditeur peut régénérer une config à jour
  depuis sa console à tout moment.
`;
}
