import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const targetAdmNos = [
    'BIPS/26/332',      // 1. Tarun
    'BIPS/26/195',      // 2. Tamanna
    'BIPS/26/1265',     // 3. NihaLika
    'BIPS/26/077',      // 4. Anushka (Class 1)
    'BIPS/26/1456',     // 5. ARADHYA YADAV (Class 1)
    'BIPS/26/231',      // 6. ANCHAL SAHU (Class 5)
    'BIPS/26/182',      // 7. Priyanka (1)
    'BIPS/26/183',      // 7. Priyanka (2)
    'BIPS/26/253',      // 8. Anshi
    'BIPS/26/251',      // 8. Anshika Sharma
    'BIPS/26/252',      // 8. Anshika Verma
    'BIPS/26/316',      // 9. MD. Arshlan
    'BIPS/26/PRE_4165'  // 10. Md. Furkan
  ];

  console.log("================ 1. DIRECT FEE PAYMENTS FOR TARGET STUDENTS ================");
  for (const admNo of targetAdmNos) {
    const student = await prisma.studentProfile.findUnique({
      where: { admissionNo: admNo },
      include: { user: true, class: true, fees: true }
    });

    if (!student) {
      console.log(`Student ${admNo} not found.`);
      continue;
    }

    console.log(`\n---------------------------------------------------------`);
    console.log(`Student: ${student.user?.name} | AdmNo: ${student.admissionNo} | Class: ${student.class?.name}`);
    console.log(`Father: ${student.fatherName} | Previous Session Due: ₹${student.previousSessionDue}`);
    console.log(`Total Receipts Found: ${student.fees.length}`);

    if (student.fees.length === 0) {
      console.log(`-> NO FEE RECEIPTS FOUND in DB.`);
    } else {
      student.fees.forEach(f => {
        console.log(`-> Receipt: ${f.receiptNo} | Amount: ₹${f.amountPaid} | Month: ${f.month}`);
        console.log(`   FeeHead: ${f.feeHead}`);
        console.log(`   Remark: ${f.remark || 'N/A'} | Status: ${f.status} | Mode: ${f.paymentMode}`);
        console.log(`   Date: ${f.paymentDate}`);
      });
    }
  }

  console.log("\n================ 2. SEARCH ALL RECEIPTS IN DB WITH 'PREVIOUS DUES' OR NAMES ================");
  const nameKeywords = ['tarun', 'tamanna', 'nihalika', 'anushka', 'aradhya', 'anchal', 'priyanka', 'anshi', 'arshlan', 'furkan'];
  
  const allReceipts = await prisma.feePayment.findMany({
    include: {
      student: {
        include: { user: true, class: true }
      }
    }
  });

  console.log(`Total receipts in system: ${allReceipts.length}`);

  // Find any receipt where feeHead or remark contains previous dues or target names
  for (const r of allReceipts) {
    const head = (r.feeHead || '').toLowerCase();
    const remark = (r.remark || '').toLowerCase();
    const stName = (r.student?.user?.name || '').toLowerCase();

    const matchesName = nameKeywords.some(kw => stName.includes(kw) || head.includes(kw) || remark.includes(kw));

    if (matchesName) {
      if (head.includes('previous') || remark.includes('previous') || targetAdmNos.includes(r.student?.admissionNo || '')) {
        console.log(`\n[MATCHED RECEIPT] ReceiptNo: ${r.receiptNo} | AdmNo: ${r.student?.admissionNo} | Name: ${r.student?.user?.name}`);
        console.log(`  Class: ${r.student?.class?.name} | Father: ${r.student?.fatherName}`);
        console.log(`  Amount Paid: ₹${r.amountPaid} | Month: ${r.month}`);
        console.log(`  FeeHead: ${r.feeHead}`);
        console.log(`  Remark: ${r.remark || 'N/A'}`);
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
