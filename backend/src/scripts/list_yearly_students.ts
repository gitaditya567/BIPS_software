import prisma from '../lib/prisma';

async function main() {
    // Fetch all fee payments
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

    // We want to find all receipts where:
    // 1) "one year fees" or "yearly" is in feeHead / remark / month
    // 2) Transport yearly (Yearly) is in feeHead
    // 3) Multi-month paid in April / May / June / July or single receipt marked as one month but containing yearly amount
    // 4) Or any full session payment
    
    interface MatchedReceipt {
        receiptNo: string;
        date: string;
        admissionNo: string;
        studentName: string;
        className: string;
        sectionName: string;
        month: string;
        amountPaid: number;
        discount: number;
        feeHead: string;
        hasOneYearTuition: boolean;
        hasYearlyTransport: boolean;
        details: string;
    }

    const matchedList: MatchedReceipt[] = [];

    payments.forEach(p => {
        const fh = (p.feeHead || '').toLowerCase();
        const m = (p.month || '').toLowerCase();
        const rem = (p.remark || '').toLowerCase();

        const hasOneYearTuition = fh.includes('one year') || fh.includes('1 year') || fh.includes('one year fees');
        const hasYearlyTransport = fh.includes('(yearly)') || fh.includes('transport') && (fh.includes('yearly') || p.amountPaid >= 8000 && fh.includes('transport'));
        const isYearlyGeneral = fh.includes('yearly') || rem.includes('full year') || rem.includes('one year') || rem.includes('12 month');

        if (hasOneYearTuition || hasYearlyTransport || isYearlyGeneral) {
            matchedList.push({
                receiptNo: p.receiptNo || 'N/A',
                date: p.paymentDate ? p.paymentDate.toISOString().split('T')[0] : 'N/A',
                admissionNo: p.student?.admissionNo || 'N/A',
                studentName: p.student?.user?.name || 'N/A',
                className: p.student?.class?.name || 'Unassigned',
                sectionName: p.student?.section?.name || '-',
                month: p.month || 'N/A',
                amountPaid: p.amountPaid,
                discount: p.discount || 0,
                feeHead: p.feeHead || '',
                hasOneYearTuition,
                hasYearlyTransport,
                details: p.feeHead || ''
            });
        }
    });

    console.log(`================================================================================`);
    console.log(`TOTAL MATCHED RECEIPTS WITH YEARLY / ONE YEAR / TRANSPORT (YEARLY): ${matchedList.length}`);
    console.log(`================================================================================\n`);

    // Group by Class
    const classGroups: { [key: string]: MatchedReceipt[] } = {};

    matchedList.forEach(item => {
        if (!classGroups[item.className]) {
            classGroups[item.className] = [];
        }
        classGroups[item.className].push(item);
    });

    // Sort class names
    const classOrder = Object.keys(classGroups).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    let totalStudentsSet = new Set<string>();

    for (const cls of classOrder) {
        const receipts = classGroups[cls];
        const studentSet = new Set(receipts.map(r => r.admissionNo));
        studentSet.forEach(s => totalStudentsSet.add(s));

        console.log(`--------------------------------------------------------------------------------`);
        console.log(`CLASS: ${cls} --> [ ${studentSet.size} Students | ${receipts.length} Receipts ]`);
        console.log(`--------------------------------------------------------------------------------`);

        receipts.forEach((r, idx) => {
            console.log(`${idx + 1}. Student: ${r.studentName} | AdmNo: ${r.admissionNo} | Sec: ${r.sectionName}`);
            console.log(`   Receipt No: ${r.receiptNo} | Date: ${r.date} | Month field: "${r.month}" | Amount: ₹${r.amountPaid}`);
            console.log(`   Fee Breakdown: ${r.feeHead}`);
            console.log(`   Flags: [OneYearTuition: ${r.hasOneYearTuition ? 'YES' : 'NO'}, YearlyTransport: ${r.hasYearlyTransport ? 'YES' : 'NO'}]`);
            console.log(``);
        });
    }

    console.log(`\n================================================================================`);
    console.log(`SUMMARY OF ALL CLASSES:`);
    console.log(`================================================================================`);
    for (const cls of classOrder) {
        const receipts = classGroups[cls];
        const studentSet = new Set(receipts.map(r => r.admissionNo));
        console.log(`- Class ${cls.padEnd(15)} : ${studentSet.size.toString().padStart(3)} students (${receipts.length} receipts)`);
    }
    console.log(`--------------------------------------------------------------------------------`);
    console.log(`GRAND TOTAL: ${totalStudentsSet.size} Unique Students across ${matchedList.length} Receipts`);
    console.log(`================================================================================`);

    await prisma.$disconnect();
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
