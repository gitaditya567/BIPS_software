import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const class1 = await prisma.class.findFirst({
    where: { name: 'Class 1' },
    include: { sections: true },
  });
  console.log(JSON.stringify(class1, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
