import prisma from '../lib/prisma';

async function main() {
    console.log("Analyzing Fee Payments in Database...");

    // Find all approved/all fee payments
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
        },
        orderBy: {
            paymentDate: 'desc'
        }
    });

    console.log(`Total payments found: ${payments.length}`);

    // Let's filter payments where feeHead has '==>' or contains 'one year' or 'yearly' or multiple months amount
    const yearlyOrMultiMonthPayments = payments.filter(p => {
        const fh = (p.feeHead || '').toLowerCase();
        const m = (p.month || '').toLowerCase();
        const rem = (p.remark || '').toLowerCase();
        return fh.includes('year') || fh.includes('annual') || fh.includes('12') || 
               fh.includes('one year') || fh.includes('yearly') || 
               m.includes('year') || m.includes('yearly') ||
               p.amountPaid > 10000;
    });

    console.log(`Payments matching yearly/large criteria: ${yearlyOrMultiMonthPayments.length}`);

    // Group by Class
    const classMap: { [key: string]: any[] } = {};

    payments.forEach(p => {
        const fh = p.feeHead || '';
        const m = p.month || '';
        const clsName = p.student?.class?.name || 'Unknown';
        
        // Check if receipt has single/few months (e.g. April) but has yearly fees or large amount (e.g. one year fees, Transport yearly)
        const isYearlyOrMultiInSingleMonth = 
            (fh.toLowerCase().includes('year') || fh.toLowerCase().includes('12') || p.amountPaid > 15000) &&
            (!m.includes(',') && !fh.startsWith('April,May,June,July,August,September,October,November,December,January,February,March'));

        if (isYearlyOrMultiInSingleMonth || fh.toLowerCase().includes('one year') || fh.toLowerCase().includes('yearly')) {
            if (!classMap[clsName]) classMap[clsName] = [];
            classMap[clsName].push({
                receiptNo: p.receiptNo,
                studentName: p.student?.user?.name,
                admissionNo: p.student?.admissionNo,
                className: clsName,
                month: p.month,
                feeHead: p.feeHead,
                amountPaid: p.amountPaid,
                paymentDate: p.paymentDate,
                status: p.status,
                transportStop: p.student?.transportStop?.name,
                busFare: p.student?.transportStop?.busFare
            });
        }
    });

    console.log("\n--- SUMMARY BY CLASS ---");
    let totalAffectedStudents = 0;
    const studentIds = new Set();

    for (const [cls, list] of Object.entries(classMap)) {
        list.forEach(item => studentIds.add(item.admissionNo));
        console.log(`Class: ${cls} | Receipts: ${list.length}`);
    }
    console.log(`\nTotal Unique Students Affected: ${studentIds.size}`);

    console.log("\n--- DETAILED RECEIPTS SAMPLES ---");
    for (const [cls, list] of Object.entries(classMap)) {
        console.log(`\n================= CLASS: ${cls} (${list.length} receipts) =================`);
        list.slice(0, 10).forEach(r => {
            console.log(`Receipt #${r.receiptNo} | Student: ${r.studentName} (${r.admissionNo}) | Month: ${r.month} | Amount: ${r.amountPaid}`);
            console.log(`   feeHead: ${r.feeHead}`);
            console.log(`   Transport Stop: ${r.transportStop} (BusFare: ${r.busFare})`);
        });
    }

    // Let's also search for all fee heads and patterns in the database across April, May, June, July receipts
    console.log("\n--- CHECKING ALL APRIL/MAY/JUNE/JULY RECEIPTS WITH COMPLEX HEADS ---");
    const aprilJulyPayments = payments.filter(p => {
        const fh = p.feeHead || '';
        const m = p.month || '';
        const isTargetMonth = m.toLowerCase().includes('april') || m.toLowerCase().includes('may') || m.toLowerCase().includes('june') || m.toLowerCase().includes('july') ||
                              fh.toLowerCase().startsWith('april') || fh.toLowerCase().startsWith('may') || fh.toLowerCase().startsWith('june') || fh.toLowerCase().startsWith('july');
        return isTargetMonth;
    });

    console.log(`Total April-July payments: ${aprilJulyPayments.length}`);

    // Check distinct feeHead formats in aprilJulyPayments
    const feeHeadFormats: { [key: string]: number } = {};
    aprilJulyPayments.forEach(p => {
        const fh = p.feeHead || 'EMPTY';
        // Simplify key
        if (fh.includes('==>')) {
            const afterArrow = fh.split('==>')[1] || '';
            const heads = afterArrow.split('||').map(h => h.split(':')[0].trim()).join(' + ');
            feeHeadFormats[heads] = (feeHeadFormats[heads] || 0) + 1;
        }
    });

    console.log("\nBreakdown of Head Combinations in Receipts with '==>':");
    console.log(JSON.stringify(feeHeadFormats, null, 2));

    await prisma.$disconnect();
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
