import prisma from '../lib/prisma';
import fs from 'fs';

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

    const issueList: any[] = [];

    payments.forEach(p => {
        const fh = p.feeHead || '';
        const m = p.month || '';
        const fhLower = fh.toLowerCase();

        const hasOneYear = fhLower.includes('one year');
        const hasYearlyTransport = fhLower.includes('(yearly)') || (fhLower.includes('transport') && fhLower.includes('yearly'));

        if (hasOneYear || hasYearlyTransport) {
            issueList.push({
                receiptNo: p.receiptNo,
                admissionNo: p.student?.admissionNo,
                studentName: p.student?.user?.name,
                className: p.student?.class?.name || 'Unknown',
                section: p.student?.section?.name || 'A',
                month: p.month,
                date: p.paymentDate.toISOString().split('T')[0],
                amountPaid: p.amountPaid,
                discount: p.discount || 0,
                feeHead: p.feeHead,
                hasOneYear,
                hasYearlyTransport
            });
        }
    });

    fs.writeFileSync('yearly_issues.json', JSON.stringify(issueList, null, 2));
    console.log(`Saved ${issueList.length} records to yearly_issues.json`);
    await prisma.$disconnect();
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
