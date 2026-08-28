import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const receipt = await prisma.feePayment.findUnique({
    where: { receiptNo: 'RCP497' }
  });
  
  if (!receipt) {
    console.log("Receipt RCP497 not found");
    return;
  }
  
  console.log("Current Receipt:");
  console.log(receipt);

  const updatedReceipt = await prisma.feePayment.update({
    where: { receiptNo: 'RCP497' },
    data: {
      month: 'May',
      feeHead: 'May ==> Transport (Bhadesuwa): 850'
    }
  });

  console.log("Updated Receipt:");
  console.log(updatedReceipt);
}

main().catch(console.error).finally(() => prisma.$disconnect());
