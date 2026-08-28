import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const sessions = await prisma.session.findMany();
  console.log("=== SESSIONS IN DB ===");
  console.log(sessions);

  console.log("\n=== TESTING REPORTS LOGIC FOR SESSIONS ===");
  
  // Let's check receipts count grouped by session or dates
  const feePayments = await prisma.feePayment.findMany({
    take: 10,
    orderBy: { paymentDate: 'desc' },
    include: { student: { include: { user: true, class: true } } }
  });

  console.log("Recent 10 FeePayments:");
  feePayments.forEach(f => {
    console.log(`Receipt: ${f.receiptNo} | Date: ${f.paymentDate} | Student: ${f.student?.user?.name} | Amount: ${f.amountPaid}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
