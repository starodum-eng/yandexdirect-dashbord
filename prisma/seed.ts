import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Seeds a single dashboard user from environment variables.
// Set SEED_USER_EMAIL and SEED_USER_PASSWORD before running `npm run db:seed`.
async function main() {
  const email = process.env.SEED_USER_EMAIL;
  const password = process.env.SEED_USER_PASSWORD;
  const name = process.env.SEED_USER_NAME ?? "Admin";

  if (!email || !password) {
    throw new Error(
      "SEED_USER_EMAIL and SEED_USER_PASSWORD must be set to seed the user.",
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, name, role: Role.ADMIN },
    create: { email, passwordHash, name, role: Role.ADMIN },
  });

  console.log(`Seeded user: ${user.email} (${user.id})`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
