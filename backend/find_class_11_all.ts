import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const cls = await prisma.class.findMany({
    where: { name: { contains: '11', mode: 'insensitive' } }
  });
  console.log(JSON.stringify(cls, null, 2));
  await prisma.$disconnect();
}
main();
