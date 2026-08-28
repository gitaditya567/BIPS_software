import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const queryNames = [
    'Tarun',
    'Tamanna',
    'Nihalika',
    'Anushka',
    'Aaradhya',
    'Awdhesh',
    'Anchal',
    'Priyanka',
    'Anshi',
    'Arshlan',
    'Furkan'
  ];

  console.log("--- SEARCHING STUDENTS ---");
  const allStudents = await prisma.studentProfile.findMany({
    include: {
      user: true,
      class: true,
      fees: true
    }
  });

  for (const s of allStudents) {
    const match = queryNames.some(q => 
      (s.user?.name && s.user.name.toLowerCase().includes(q.toLowerCase())) ||
      (s.fatherName && s.fatherName.toLowerCase().includes(q.toLowerCase()))
    );

    if (match) {
      console.log(`\nID: ${s.id} | AdmNo: ${s.admissionNo}`);
      console.log(`Name: ${s.user?.name} | Father: ${s.fatherName} | Class: ${s.class?.name}`);
      console.log(`Previous Session Due (in DB): ${s.previousSessionDue}`);
      console.log(`Total Fee Receipts: ${s.fees.length}`);
      s.fees.forEach(f => {
        console.log(`  - Receipt: ${f.receiptNo}, Month: ${f.month}, Head: ${f.feeHead}, Amount: ${f.amountPaid}`);
      });
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
