import prisma from '../lib/prisma';

async function main() {
    console.log("Starting synchronization of month fields for all receipts in DB...\n");

    const payments = await prisma.feePayment.findMany({
        include: {
            student: {
                include: {
                    user: true,
                    class: true
                }
            }
        },
        orderBy: {
            paymentDate: 'asc'
        }
    });

    console.log(`Total payments in DB: ${payments.length}`);

    let updatedCount = 0;
    const updateLogs: string[] = [];

    for (const p of payments) {
        const fh = p.feeHead || '';
        const m = p.month || '';

        if (fh.includes('==>')) {
            const prefix = fh.split('==>')[0].trim();
            if (prefix && prefix !== m) {
                await prisma.feePayment.update({
                    where: { id: p.id },
                    data: {
                        month: prefix
                    }
                });

                updatedCount++;
                updateLogs.push(`[${updatedCount}] Receipt #${p.receiptNo} (${p.student?.user?.name || 'N/A'}) - Updated DB month from "${m}" to "${prefix}"`);
            }
        }
    }

    console.log(`\nUpdated ${updatedCount} receipts in the database.`);
    console.log("\nSample updates applied:");
    updateLogs.slice(0, 15).forEach(log => console.log(log));
    if (updateLogs.length > 15) {
        console.log(`... and ${updateLogs.length - 15} more receipts.`);
    }

    // Verify if any discrepancies remain
    const remainingMismatches = await prisma.feePayment.findMany({
        where: {
            feeHead: {
                contains: '==>'
            }
        }
    });

    let stillMismatched = 0;
    remainingMismatches.forEach(p => {
        const prefix = (p.feeHead || '').split('==>')[0].trim();
        if (prefix && prefix !== (p.month || '')) {
            stillMismatched++;
        }
    });

    console.log(`\nVerification: Remaining mismatches = ${stillMismatched}`);

    await prisma.$disconnect();
}

main().catch(e => {
    console.error("Error during synchronization:", e);
    process.exit(1);
});
