import prisma from '../lib/prisma';

async function main() {
    const payments = await prisma.feePayment.findMany({
        include: {
            student: {
                include: {
                    user: true,
                    class: true,
                    section: true
                }
            }
        },
        orderBy: {
            paymentDate: 'asc'
        }
    });

    console.log(`Total payments: ${payments.length}`);

    const syncNeeded: any[] = [];

    payments.forEach(p => {
        const fh = p.feeHead || '';
        const m = p.month || '';

        if (fh.includes('==>')) {
            const prefix = fh.split('==>')[0].trim();
            if (prefix && prefix !== m) {
                syncNeeded.push({
                    id: p.id,
                    receiptNo: p.receiptNo,
                    studentName: p.student?.user?.name,
                    admissionNo: p.student?.admissionNo,
                    className: p.student?.class?.name,
                    dbMonth: m,
                    prefixMonth: prefix,
                    amountPaid: p.amountPaid,
                    date: p.paymentDate?.toISOString().split('T')[0]
                });
            }
        }
    });

    console.log(`\n================================================================================`);
    console.log(`TOTAL RECEIPTS WHERE DB MONTH DOES NOT MATCH FEEHEAD PREFIX: ${syncNeeded.length}`);
    console.log(`================================================================================\n`);

    // Group by prefix pattern
    const patterns: { [key: string]: number } = {};
    syncNeeded.forEach(s => {
        const key = `DB: "${s.dbMonth}"  -->  Actual: "${s.prefixMonth}"`;
        patterns[key] = (patterns[key] || 0) + 1;
    });

    console.log("Common Mismatch Patterns:");
    Object.entries(patterns).sort((a, b) => b[1] - a[1]).forEach(([pat, count]) => {
        console.log(`  • ${pat.padEnd(70)} : ${count} receipts`);
    });

    console.log("\nSample receipts needing month synchronization:");
    syncNeeded.slice(0, 15).forEach((s, idx) => {
        console.log(`[${idx + 1}] #${s.receiptNo} | Adm: ${s.admissionNo} | ${s.studentName} (${s.className}) | Date: ${s.date} | Paid: ₹${s.amountPaid}`);
        console.log(`     DB Month: "${s.dbMonth}"  ==>  Should be: "${s.prefixMonth}"`);
    });

    await prisma.$disconnect();
}

main().catch(console.error);
