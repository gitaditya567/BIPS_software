import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const latestStudent = await prisma.studentProfile.findFirst({
    orderBy: { admissionNo: 'desc' },
  });
  console.log('Latest Admission No:', latestStudent?.admissionNo);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
