import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Connecting to database...');
        const deletedCount = await prisma.feePayment.deleteMany({});
        console.log(`Successfully deleted ${deletedCount.count} fee receipts/payments.`);
    } catch (error) {
        console.error('Error deleting receipts:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
