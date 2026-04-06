// Seed script for local development only
// Usage: DATABASE_URL="your_db_url" npx tsx seed.ts

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const password = await hash("password123", 12);

  const alice = await prisma.user.upsert({
    where: { email: "alice@example.com" },
    update: {},
    create: { name: "Alice Chen", email: "alice@example.com", password },
  });

  const bob = await prisma.user.upsert({
    where: { email: "bob@example.com" },
    update: {},
    create: { name: "Bob Martinez", email: "bob@example.com", password },
  });

  const carol = await prisma.user.upsert({
    where: { email: "carol@example.com" },
    update: {},
    create: { name: "Carol Johnson", email: "carol@example.com", password },
  });

  console.log(`Seeded 3 users: ${alice.name}, ${bob.name}, ${carol.name}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
