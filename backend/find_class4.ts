import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const classObj = await prisma.class.findFirst({
    where: { name: 'Class 4' },
    include: { sections: true }
  });
  console.log(JSON.stringify(classObj, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
