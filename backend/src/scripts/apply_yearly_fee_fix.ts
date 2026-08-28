import prisma from '../lib/prisma';

const ALL_12_MONTHS = "April, May, June, July, August, September, October, November, December, January, February, March";
const MAY_TO_MARCH = "May, June, July, August, September, October, November, December, January, February, March";

async function applyFix() {
    console.log("Starting DB update for 29 receipts...\n");

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

    const feeHeads = await prisma.feeHead.findMany();

    const issueReceipts = payments.filter(p => {
        const fh = (p.feeHead || '').toLowerCase();
        return fh.includes('one year') || fh.includes('(yearly)') || (fh.includes('transport') && fh.includes('yearly'));
    });

    console.log(`Found ${issueReceipts.length} receipts to process.`);

    let updatedCount = 0;

    for (const p of issueReceipts) {
        const oldMonth = p.month;
        const oldFeeHead = p.feeHead || '';
        const student = p.student;
        const cls = student?.class;
        const structure: any = cls?.feeStructure || {};

        let newMonth = ALL_12_MONTHS;
        let numMonths = 12;
        if (oldMonth === 'May' && !oldFeeHead.includes('April')) {
            if (oldFeeHead.includes('Tuition Fee: 22000')) {
                newMonth = MAY_TO_MARCH;
                numMonths = 11;
            } else {
                newMonth = ALL_12_MONTHS;
                numMonths = 12;
            }
        }

        let rawItemsStr = oldFeeHead;
        if (oldFeeHead.includes('==>')) {
            rawItemsStr = oldFeeHead.split('==>')[1].trim();
        }

        const parts = rawItemsStr.split('||').map(s => s.trim()).filter(Boolean);
        const newItems: string[] = [];

        for (const part of parts) {
            const splitColon = part.split(':');
            const headName = splitColon[0].trim();
            const amt = splitColon.length > 1 ? parseFloat(splitColon[1].trim()) || 0 : 0;
            const headLower = headName.toLowerCase();

            if (headLower === 'one year fees' || headLower.includes('one year')) {
                const monthlyHeads: { name: string; monthlyAmt: number; yearlyAmt: number }[] = [];
                let totalMonthlyRate = 0;

                feeHeads.forEach(fh => {
                    if (fh.type === 'Monthly') {
                        const rate = Number(structure[fh.name] || 0);
                        if (rate > 0) {
                            monthlyHeads.push({ name: fh.name, monthlyAmt: rate, yearlyAmt: rate * numMonths });
                            totalMonthlyRate += rate;
                        }
                    }
                });

                if (monthlyHeads.length > 0 && Math.abs(totalMonthlyRate * numMonths - amt) <= 100) {
                    monthlyHeads.forEach(mh => {
                        newItems.push(`${mh.name}: ${mh.yearlyAmt}`);
                    });
                } else {
                    newItems.push(`Tuition Fee: ${amt}`);
                }
            } else if (headLower.includes('(yearly)')) {
                const cleanHeadName = headName.replace(/\(Yearly\)/gi, '').replace(/\(yearly\)/gi, '').trim();
                newItems.push(`${cleanHeadName}: ${amt}`);
            } else {
                newItems.push(part);
            }
        }

        const newFeeHead = `${newMonth} ==> ${newItems.join(' || ')}`;

        await prisma.feePayment.update({
            where: { id: p.id },
            data: {
                month: newMonth,
                feeHead: newFeeHead
            }
        });

        updatedCount++;
        console.log(`[${updatedCount}/${issueReceipts.length}] Updated Receipt ${p.receiptNo} for ${p.student?.user?.name} (${p.student?.admissionNo})`);
    }

    console.log(`\n Successfully updated ${updatedCount} receipts in the database!`);

    await prisma.$disconnect();
}

applyFix().catch(e => {
    console.error("Error applying fix:", e);
    process.exit(1);
});
