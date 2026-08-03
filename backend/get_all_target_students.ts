import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const targets = [
    { num: 1, name: "Tarun", classStr: "7", slipDue: 1800 },
    { num: 2, name: "Tamanna", classStr: "3", slipDue: 5300 },
    { num: 3, name: "Nihalika", classStr: "LKG", slipDue: 2400 },
    { num: 4, name: "Anushka", classStr: "1", slipDue: 750 },
    { num: 5, name: "Aaradhya Yadav", father: "Awdhesh", classStr: "1", slipDue: 2600 },
    { num: 6, name: "Anchal Sahu", classStr: "5", slipDue: null },
    { num: 7, name: "Priyanka", classStr: "2", slipDue: null },
    { num: 8, name: "Anshi", classStr: "5", slipDue: null },
    { num: 9, name: "Arshlan", classStr: "7", slipDue: null },
    { num: 10, name: "Furkan", classStr: "11", slipDue: null },
  ];

  console.log("================ TARGET STUDENTS IN DB ================");
  
  for (const t of targets) {
    const students = await prisma.studentProfile.findMany({
      where: {
        AND: [
          t.name ? { user: { name: { contains: t.name, mode: 'insensitive' } } } : {},
          t.father ? { fatherName: { contains: t.father, mode: 'insensitive' } } : {}
        ]
      },
      include: {
        user: true,
        class: true,
        fees: true
      }
    });

    console.log(`\n--- Item #${t.num}: ${t.name} (Class target: ${t.classStr}, Slip Due: ${t.slipDue}) ---`);
    if (students.length === 0) {
      console.log("No student found with query.");
    }
    for (const s of students) {
      console.log(`  ID: ${s.id} | AdmNo: ${s.admissionNo} | Name: ${s.user?.name} | Father: ${s.fatherName} | Class: ${s.class?.name}`);
      console.log(`  DB previousSessionDue: ${s.previousSessionDue}`);
      console.log(`  Fee Receipts Count: ${s.fees.length}`);
      s.fees.forEach(f => {
        console.log(`    Receipt ${f.receiptNo} | Month: ${f.month} | Amount: ${f.amountPaid} | Head: ${f.feeHead}`);
      });
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
