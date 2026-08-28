import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const cls = await prisma.class.findFirst({
    where: { name: { contains: '10', mode: 'insensitive' } },
    include: { sections: true }
  });
  console.log(JSON.stringify(cls, null, 2));
  await prisma.$disconnect();
}
main();
