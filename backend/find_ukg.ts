import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const ukgClass = await prisma.class.findFirst({
    where: { name: 'Upper Kindergarten (UKG)' },
    include: { sections: true },
  });
  console.log(JSON.stringify(ukgClass, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
