import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const receiptNo = 'RCP053';
  
  const receipt = await prisma.feePayment.findUnique({
    where: { receiptNo }
  });
  
  if (!receipt) {
    console.log(`Receipt ${receiptNo} not found in the database.`);
    return;
  }
  
  console.log("Found receipt:");
  console.log(receipt);
  
  await prisma.feePayment.delete({
    where: { receiptNo }
  });
  
  console.log(`Successfully deleted receipt ${receiptNo}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
