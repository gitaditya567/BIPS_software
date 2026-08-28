import prisma from '../lib/prisma';
import { getStudentFeeLedger } from '../routes/fees';

async function verify() {
    console.log("Verifying Ledgers for updated students...\n");

    const admNos = [
        'BIPS/26/486', // SHAGUN (Class 11 Bio)
        'BIPS/26/470', // MANSI (Class 10)
        'BIPS/26/441', // ANSHIKA (Class 10)
        'BIPS/26/574', // VAIBHAV (LKG)
        'BIPS/26/537', // Chahat Anand (Class 12 Maths)
        'BIPS/26/193', // Siddharth (Class 3)
        'BIPS/26/674'  // JANVI (Class 4)
    ];

    for (const adm of admNos) {
        const student = await prisma.studentProfile.findUnique({
            where: { admissionNo: adm },
            include: { user: true, class: true }
        });
        if (!student) continue;

        const ledger = await getStudentFeeLedger(student.id);
        console.log(`================================================================================`);
        console.log(`Student: ${student.user.name} | AdmNo: ${adm} | Class: ${student.class?.name}`);
        console.log(`Total Expected (Whole Year): ₹${ledger.summary.totalExpectedWholeYear}`);
        console.log(`Total Paid (All Time): ₹${ledger.summary.totalPaidAllTime}`);
        console.log(`Net Outstanding / Due: ₹${ledger.summary.netOutstanding}`);
        console.log(`Pending Months (Elapsed): [${ledger.pendingMonthsList.join(', ')}]`);
        console.log(`Monthly Status (April to August):`);
        ledger.monthlyStatus.slice(0, 5).forEach((m: any) => {
            console.log(`  - ${m.month.padEnd(10)}: Expected: ₹${m.expected}, Paid: ₹${m.paid}, Pending: ₹${m.pending}, IsPaid: ${m.isPaid}`);
        });
    }

    await prisma.$disconnect();
}

verify().catch(console.error);
