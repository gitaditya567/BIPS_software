import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const receipt = await prisma.feePayment.findUnique({
    where: { receiptNo: 'RCP1223' },
    include: { student: { include: { user: true, class: true } }, session: true }
  });

  console.log("=== RCP1223 RECORD ===");
  console.log(JSON.stringify(receipt, null, 2));

  const allReceiptsCount = await prisma.feePayment.count();
  console.log("\nTotal feePayment records in DB:", allReceiptsCount);
  
  const sampleReceipts = await prisma.feePayment.findMany({
    take: 5,
    orderBy: { paymentDate: 'desc' }
  });
  console.log("\nSample recent receipts:", JSON.stringify(sampleReceipts, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
