import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const c = await prisma.class.findFirst({ where: { name: 'Class 6' } });
  console.log("Class 6 fee structure:", c?.feeStructure);
}

main().catch(console.error).finally(() => prisma.$disconnect());
