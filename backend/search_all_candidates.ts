import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const students = await prisma.studentProfile.findMany({
    include: {
      user: true,
      class: true,
      fees: true
    }
  });

  const list = [
    { label: "1. Tarun (Class VII)", search: ["tarun"] },
    { label: "2. Tamanna (Class III)", search: ["tamanna"] },
    { label: "3. Nihalika (Class LKG)", search: ["nihalika", "nihal"] },
    { label: "4. Anushka (Class I)", search: ["anushka"] },
    { label: "5. Aaradhya Yadav (Class I, Father: Awdhesh)", search: ["aradhya", "aaradhya", "awdhesh"] },
    { label: "6. Anchal Sahu (Class V)", search: ["anchal", "anchel"] },
    { label: "7. Priyanka (Class II)", search: ["priyanka"] },
    { label: "8. Anshi (Class V)", search: ["anshi"] },
    { label: "9. Moh. Arshlan (Class VII)", search: ["arshlan", "arsh"] },
    { label: "10. Md. Furkan (Class XI)", search: ["furkan"] }
  ];

  for (const item of list) {
    console.log(`\n================ ${item.label} ================`);
    const matches = students.filter(s => 
      item.search.some(kw => 
        (s.user?.name && s.user.name.toLowerCase().includes(kw)) ||
        (s.fatherName && s.fatherName.toLowerCase().includes(kw))
      )
    );

    if (matches.length === 0) {
      console.log("NO MATCH FOUND IN DATABASE");
    } else {
      for (const m of matches) {
        console.log(`AdmNo: ${m.admissionNo} | ID: ${m.id}`);
        console.log(`Name: ${m.user?.name} | Father: ${m.fatherName} | Class: ${m.class?.name}`);
        console.log(`Current DB previousSessionDue: ₹${m.previousSessionDue}`);
        console.log(`Total Fees Paid: ${m.fees.reduce((acc, f) => acc + f.amountPaid, 0)}`);
        m.fees.forEach(f => {
          console.log(`  [Receipt ${f.receiptNo || 'N/A'}] Month: ${f.month || 'N/A'}, Head: ${f.feeHead}, Amount Paid: ₹${f.amountPaid}`);
        });
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
