import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const idsToDelete = [
    '69f4419b49420a41e4b8f7fa', // RCP167
    '69f443c649420a41e4b8f7fb', // RCP168
    '69f447c249420a41e4b8f7fc', // RCP169
  ];

  const deleteResult = await prisma.feePayment.deleteMany({
    where: {
      id: {
        in: idsToDelete
      }
    }
  });

  console.log(`Deleted ${deleteResult.count} receipts successfully.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
