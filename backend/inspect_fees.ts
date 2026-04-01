import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
    const fees = await prisma.feePayment.findMany({ take: 5, orderBy: { paymentDate: 'desc' } });
    console.log(fees);
    process.exit(0);
}
run();
