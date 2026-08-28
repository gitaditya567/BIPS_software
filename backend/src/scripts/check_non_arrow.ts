import prisma from '../lib/prisma';

async function main() {
    const payments = await prisma.feePayment.findMany({
        include: {
            student: {
                include: {
                    user: true,
                    class: true,
                    section: true,
                    transportStop: true
                }
            }
        }
    });

    // Check payments WITHOUT "==>" in feeHead
    const noArrowMultiMonth: any[] = [];
    payments.forEach(p => {
        const fh = p.feeHead || '';
        const m = p.month || '';
        if (!fh.includes('==>')) {
            const student = p.student;
            const cls = student?.class;
            const structure: any = cls?.feeStructure || {};
            const tuitionRate = structure['Tuition Fee'] ? Number(structure['Tuition Fee']) : 0;
            const busFare = student?.transportStop?.busFare || 0;

            if (p.amountPaid > 5000 && (fh.toLowerCase().includes('tuition') || fh.toLowerCase().includes('transport') || fh.toLowerCase().includes('fee'))) {
                noArrowMultiMonth.push({
                    receiptNo: p.receiptNo,
                    studentName: student?.user?.name,
                    admissionNo: student?.admissionNo,
                    className: cls?.name,
                    month: m,
                    amountPaid: p.amountPaid,
                    feeHead: fh,
                    tuitionRate,
                    busFare
                });
            }
        }
    });

    console.log(`Receipts without '==>' having large amounts (>₹5000): ${noArrowMultiMonth.length}`);
    noArrowMultiMonth.forEach(r => {
        console.log(`Receipt #${r.receiptNo} | Adm: ${r.admissionNo} | ${r.studentName} (${r.className}) | Month: "${r.month}" | Amount: ₹${r.amountPaid} | Head: ${r.feeHead}`);
    });

    await prisma.$disconnect();
}

main().catch(console.error);
