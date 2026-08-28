import prisma from '../lib/prisma';

async function main() {
    console.log("================================================================================");
    console.log("COMPREHENSIVE AUDIT OF ALL FEE RECEIPTS IN DATABASE");
    console.log("================================================================================\n");

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
    const feeHeadMap = new Map(feeHeads.map(h => [h.name.toLowerCase(), h]));

    console.log(`Total Receipts in DB: ${payments.length}`);

    // Categories of potential anomalies:
    const anomalies: {
        category: string;
        receiptNo: string;
        date: string;
        studentName: string;
        admissionNo: string;
        className: string;
        amountPaid: number;
        discount: number;
        month: string | null;
        feeHead: string | null;
        reason: string;
    }[] = [];

    // Let's inspect each payment
    payments.forEach(p => {
        const fh = p.feeHead || '';
        const fhLower = fh.toLowerCase();
        const m = p.month || '';
        const mLower = m.toLowerCase();
        const student = p.student;
        const cls = student?.class;
        const structure: any = cls?.feeStructure || {};
        const busFare = student?.transportStop?.busFare || 0;
        const tuitionFee = structure['Tuition Fee'] ? Number(structure['Tuition Fee']) : 0;
        const compFee = structure['Computer Class Fee'] ? Number(structure['Computer Class Fee']) : 0;
        const totalMonthlyRate = tuitionFee + compFee + busFare;

        const totalReceiptAmt = Math.round((p.amountPaid || 0) + (p.discount || 0));

        // 1. Check for keywords like "year", "quarter", "half", "month", "advance", "due", "yearly" in feeHead
        if (fhLower.includes('year') || fhLower.includes('annual') && fhLower.includes('fee:') && totalReceiptAmt > 10000) {
            // Check if it's not resolved
            if (fhLower.includes('one year') || fhLower.includes('(yearly)')) {
                anomalies.push({
                    category: "UNRESOLVED_YEARLY_KEYWORD",
                    receiptNo: p.receiptNo || 'N/A',
                    date: p.paymentDate?.toISOString().split('T')[0] || '',
                    studentName: student?.user?.name || 'N/A',
                    admissionNo: student?.admissionNo || 'N/A',
                    className: cls?.name || 'N/A',
                    amountPaid: p.amountPaid,
                    discount: p.discount || 0,
                    month: p.month,
                    feeHead: p.feeHead,
                    reason: `Contains yearly keyword in feeHead: "${p.feeHead}"`
                });
            }
        }

        // 2. Check for multi-month payment mismatch:
        // E.g. month field has 1 month (e.g. "August"), but feeHead has Tuition Fee = 3x monthly tuition (e.g. 6000 for 2000/mo) or multiple months
        if (fh.includes('==>')) {
            const prefixMonthsStr = fh.split('==>')[0].trim();
            const prefixMonths = prefixMonthsStr ? prefixMonthsStr.split(',').map(x => x.trim()).filter(Boolean) : [];
            const dbMonths = m ? m.split(',').map(x => x.trim()).filter(Boolean) : [];

            // Check if prefixMonths != dbMonths
            if (prefixMonths.length !== dbMonths.length && prefixMonths.length > 0 && dbMonths.length > 0) {
                anomalies.push({
                    category: "MONTH_PREFIX_DB_MISMATCH",
                    receiptNo: p.receiptNo || 'N/A',
                    date: p.paymentDate?.toISOString().split('T')[0] || '',
                    studentName: student?.user?.name || 'N/A',
                    admissionNo: student?.admissionNo || 'N/A',
                    className: cls?.name || 'N/A',
                    amountPaid: p.amountPaid,
                    discount: p.discount || 0,
                    month: p.month,
                    feeHead: p.feeHead,
                    reason: `DB month has ${dbMonths.length} months ("${p.month}") but feeHead prefix has ${prefixMonths.length} months ("${prefixMonthsStr}")`
                });
            }

            // Check if items have large Tuition Fee or Transport compared to number of months
            const afterArrow = fh.split('==>')[1] || '';
            const items = afterArrow.split('||').map(x => x.trim()).filter(Boolean);

            items.forEach(item => {
                const parts = item.split(':');
                const hName = parts[0].trim();
                const hAmt = parts.length > 1 ? parseFloat(parts[1].trim()) || 0 : 0;
                const hNameLower = hName.toLowerCase();

                // Check Tuition Fee
                if (hNameLower === 'tuition fee' && tuitionFee > 0) {
                    const expectedMonths = Math.round(hAmt / tuitionFee);
                    if (expectedMonths > 1 && prefixMonths.length === 1) {
                        anomalies.push({
                            category: "MULTI_MONTH_TUITION_IN_SINGLE_MONTH",
                            receiptNo: p.receiptNo || 'N/A',
                            date: p.paymentDate?.toISOString().split('T')[0] || '',
                            studentName: student?.user?.name || 'N/A',
                            admissionNo: student?.admissionNo || 'N/A',
                            className: cls?.name || 'N/A',
                            amountPaid: p.amountPaid,
                            discount: p.discount || 0,
                            month: p.month,
                            feeHead: p.feeHead,
                            reason: `Tuition Fee is ₹${hAmt} (Rate: ₹${tuitionFee}/mo = ~${expectedMonths} months), but receipt only lists ${prefixMonths.length} month: "${prefixMonthsStr}"`
                        });
                    }
                }

                // Check Transport
                if ((hNameLower.includes('transport') || hNameLower.includes('bus')) && busFare > 0) {
                    const expectedMonths = Math.round(hAmt / busFare);
                    if (expectedMonths > 1 && prefixMonths.length === 1 && expectedMonths >= 2) {
                        anomalies.push({
                            category: "MULTI_MONTH_TRANSPORT_IN_SINGLE_MONTH",
                            receiptNo: p.receiptNo || 'N/A',
                            date: p.paymentDate?.toISOString().split('T')[0] || '',
                            studentName: student?.user?.name || 'N/A',
                            admissionNo: student?.admissionNo || 'N/A',
                            className: cls?.name || 'N/A',
                            amountPaid: p.amountPaid,
                            discount: p.discount || 0,
                            month: p.month,
                            feeHead: p.feeHead,
                            reason: `Transport is ₹${hAmt} (Rate: ₹${busFare}/mo = ~${expectedMonths} months), but receipt only lists ${prefixMonths.length} month: "${prefixMonthsStr}"`
                        });
                    }
                }
            });
        }

        // 3. Check for receipts where month is empty or null, but feeHead contains monthly heads
        if (!m || m.trim() === '') {
            if (fhLower.includes('tuition') || fhLower.includes('transport') || fhLower.includes('computer')) {
                anomalies.push({
                    category: "MISSING_MONTH_FIELD",
                    receiptNo: p.receiptNo || 'N/A',
                    date: p.paymentDate?.toISOString().split('T')[0] || '',
                    studentName: student?.user?.name || 'N/A',
                    admissionNo: student?.admissionNo || 'N/A',
                    className: cls?.name || 'N/A',
                    amountPaid: p.amountPaid,
                    discount: p.discount || 0,
                    month: p.month,
                    feeHead: p.feeHead,
                    reason: `Month is empty in DB, but feeHead contains monthly heads: "${p.feeHead}"`
                });
            }
        }
    });

    console.log(`\n================================================================================`);
    console.log(`TOTAL POTENTIAL ANOMALIES FOUND: ${anomalies.length}`);
    console.log(`================================================================================\n`);

    // Group by Category
    const byCategory: { [cat: string]: typeof anomalies } = {};
    anomalies.forEach(a => {
        if (!byCategory[a.category]) byCategory[a.category] = [];
        byCategory[a.category].push(a);
    });

    for (const [cat, list] of Object.entries(byCategory)) {
        console.log(`\n--------------------------------------------------------------------------------`);
        console.log(`CATEGORY: ${cat} (${list.length} Receipts)`);
        console.log(`--------------------------------------------------------------------------------`);
        list.forEach((item, idx) => {
            console.log(`[${idx + 1}] Receipt #${item.receiptNo} | Date: ${item.date} | Class: ${item.className} | Student: ${item.studentName} (${item.admissionNo})`);
            console.log(`    Month in DB: "${item.month}" | Amount Paid: ₹${item.amountPaid} (Disc: ₹${item.discount})`);
            console.log(`    feeHead: ${item.feeHead}`);
            console.log(`    Reason: ${item.reason}`);
            console.log(``);
        });
    }

    // Also let's check month distribution of all payments in the DB
    const monthCounts: { [m: string]: number } = {};
    payments.forEach(p => {
        const m = p.month || 'EMPTY/NULL';
        monthCounts[m] = (monthCounts[m] || 0) + 1;
    });

    console.log("\n================================================================================");
    console.log("MONTH DISTRIBUTION OF ALL RECEIPTS IN DB:");
    console.log("================================================================================");
    Object.entries(monthCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 25)
        .forEach(([m, count]) => {
            console.log(`- ${m.padEnd(50)}: ${count} receipts`);
        });

    await prisma.$disconnect();
}

main().catch(console.error);
