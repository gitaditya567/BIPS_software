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
        },
        orderBy: {
            paymentDate: 'asc'
        }
    });

    // Specifically find receipts that have "one year" / "yearly" / "(Yearly)" in feeHead, or paid 12 months but month field only has "April" (or single month)
    const issueList: any[] = [];

    payments.forEach(p => {
        const fh = p.feeHead || '';
        const m = p.month || '';
        const fhLower = fh.toLowerCase();

        // Check if feeHead contains "one year" OR "(yearly)" OR "yearly"
        const hasOneYear = fhLower.includes('one year');
        const hasYearlyTransport = fhLower.includes('(yearly)') || (fhLower.includes('transport') && fhLower.includes('yearly'));

        if (hasOneYear || hasYearlyTransport) {
            issueList.push({
                id: p.id,
                receiptNo: p.receiptNo,
                admissionNo: p.student?.admissionNo,
                studentName: p.student?.user?.name,
                className: p.student?.class?.name || 'Unknown',
                section: p.student?.section?.name || '',
                month: p.month,
                paymentDate: p.paymentDate.toISOString().split('T')[0],
                amountPaid: p.amountPaid,
                discount: p.discount,
                feeHead: p.feeHead,
                hasOneYear,
                hasYearlyTransport
            });
        }
    });

    // Group by Class
    const classMap: { [key: string]: any[] } = {};
    issueList.forEach(item => {
        if (!classMap[item.className]) classMap[item.className] = [];
        classMap[item.className].push(item);
    });

    console.log(`\n================================================================================`);
    console.log(`TOTAL STUDENTS WITH "one year fees" OR "Transport (Yearly)" ISSUES: ${issueList.length}`);
    console.log(`================================================================================\n`);

    const sortedClasses = Object.keys(classMap).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    sortedClasses.forEach(cls => {
        const list = classMap[cls];
        console.log(`\n--------------------------------------------------------------------------------`);
        console.log(`CLASS: ${cls} (${list.length} Students)`);
        console.log(`--------------------------------------------------------------------------------`);
        list.forEach((s, idx) => {
            console.log(`${idx + 1}. [${s.admissionNo}] ${s.studentName} (Sec: ${s.section})`);
            console.log(`   Receipt: ${s.receiptNo} | Date: ${s.paymentDate} | Month in DB: "${s.month}" | Amount Paid: ₹${s.amountPaid}`);
            console.log(`   Receipt feeHead string:`);
            console.log(`   --> ${s.feeHead}`);
            console.log(``);
        });
    });

    console.log(`\n================================================================================`);
    console.log(`SUMMARY COUNT BY CLASS:`);
    console.log(`================================================================================`);
    sortedClasses.forEach(cls => {
        console.log(`• ${cls.padEnd(25)} : ${classMap[cls].length} student(s)`);
    });
    console.log(`--------------------------------------------------------------------------------`);
    console.log(`TOTAL: ${issueList.length} Students across ${sortedClasses.length} Classes`);
    console.log(`================================================================================\n`);

    await prisma.$disconnect();
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
