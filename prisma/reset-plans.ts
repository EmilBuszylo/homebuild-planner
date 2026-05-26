import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const { count } = await prisma.plan.deleteMany();
  console.log(`Usunięto ${count} plan(ów) wraz z wersjami i odpowiedziami.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
