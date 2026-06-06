import bcrypt from "bcryptjs";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

// Usage : tsx prisma/set-admin.ts <email> <motDePasse>
async function main() {
  const email = (process.argv[2] ?? process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const password = process.argv[3] ?? process.env.ADMIN_PASSWORD ?? "";
  if (!email || !password) {
    throw new Error("Usage : tsx prisma/set-admin.ts <email> <motDePasse>");
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: Role.ADMIN, isActive: true },
    create: {
      email,
      name: "Administrateur",
      role: Role.ADMIN,
      isActive: true,
      passwordHash,
    },
  });
  console.log(`✅ Compte admin prêt : ${user.email} (role=${user.role}, actif=${user.isActive})`);
}

main()
  .catch((e) => {
    console.error("❌", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
