import prisma from '../lib/prisma';

const ALL_12_MONTHS = "April, May, June, July, August, September, October, November, December, January, February, March";
const MAY_TO_MARCH = "May, June, July, August, September, October, November, December, January, February, March";

async function dryRun() {
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
    const classes = await prisma.class.findMany();
    const classMap = new Map(classes.map(c => [c.id, c]));

    const issueReceipts = payments.filter(p => {
        const fh = (p.feeHead || '').toLowerCase();
        return fh.includes('one year') || fh.includes('(yearly)') || (fh.includes('transport') && fh.includes('yearly'));
    });

    console.log(`Found ${issueReceipts.length} receipts to update.\n`);

    const updatePlan: any[] = [];

    for (const p of issueReceipts) {
        const oldMonth = p.month;
        const oldFeeHead = p.feeHead || '';
        const student = p.student;
        const cls = student?.class;
        const structure: any = cls?.feeStructure || {};

        // Determine target months string
        // If receipt was originally only for May-March (like RCP162 or RCP848) vs 12 months
        let newMonth = ALL_12_MONTHS;
        let numMonths = 12;
        if (oldMonth === 'May' && !oldFeeHead.includes('April')) {
            // Check if it's 11 months or 12 months
            // RCP162 was 2026-05-01 for 24000 (which is 12 months of Class 10 @ 2000/mo) -> full 12 months
            // RCP848 was 22000 (Class 10 tuition 2000*11 = 22000) -> 11 months (May to March)
            if (oldFeeHead.includes('Tuition Fee: 22000')) {
                newMonth = MAY_TO_MARCH;
                numMonths = 11;
            } else {
                newMonth = ALL_12_MONTHS;
                numMonths = 12;
            }
        }

        // Parse existing feeHead items
        // Example: "April ==> Fee Card: 400 || Exam Fee: 1400 || one year fees: 26400 || Annual Fee: 1300 || Transport (Himmat Kheda) (Yearly): 10200"
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
                // Break down "one year fees" into standard monthly heads of this class
                // E.g., for Class 11 Bio: Tuition Fee (1600*12=19200), Lab Fee (400*12=4800), Physical Education Fee (200*12=2400) -> total 26400
                // For Class 3: Tuition Fee (1300*12=15600), Computer Class Fee (300*12=3600) -> total 19200
                // For Class 10: Tuition Fee (2000*12=24000) -> total 24000
                // For LKG/UKG: Tuition Fee (950*12=11400), Computer Class Fee (150*12=1800) -> total 13200
                
                // Let's check monthly heads in structure
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
                    // Fallback to Tuition Fee
                    newItems.push(`Tuition Fee: ${amt}`);
                }
            } else if (headLower.includes('(yearly)')) {
                // Remove "(Yearly)" tag so standard transport head is matched cleanly: e.g. "Transport (Himmat Kheda): 10200"
                const cleanHeadName = headName.replace(/\(Yearly\)/gi, '').replace(/\(yearly\)/gi, '').trim();
                newItems.push(`${cleanHeadName}: ${amt}`);
            } else {
                newItems.push(part);
            }
        }

        const newFeeHead = `${newMonth} ==> ${newItems.join(' || ')}`;

        updatePlan.push({
            id: p.id,
            receiptNo: p.receiptNo,
            studentName: p.student?.user?.name,
            admNo: p.student?.admissionNo,
            oldMonth,
            newMonth,
            oldFeeHead,
            newFeeHead
        });
    }

    console.log("------------------ PREVIEW OF TRANSFORMATIONS ------------------");
    updatePlan.forEach((u, i) => {
        console.log(`\n[${i + 1}] Receipt: ${u.receiptNo} | Student: ${u.studentName} (${u.admNo})`);
        console.log(`  OLD Month  : "${u.oldMonth}"`);
        console.log(`  NEW Month  : "${u.newMonth}"`);
        console.log(`  OLD feeHead: ${u.oldFeeHead}`);
        console.log(`  NEW feeHead: ${u.newFeeHead}`);
    });

    await prisma.$disconnect();
}

dryRun().catch(console.error);
