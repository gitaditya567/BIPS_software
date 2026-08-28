const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const transportPayments = await prisma.feePayment.findMany({
        where: { OR: [{ feeHead: { contains: 'Transport', mode: 'insensitive' } }, { feeHead: { contains: 'Bus', mode: 'insensitive' } }] }
    });
    console.log(transportPayments.length + ' transport payments found');
    console.log(transportPayments[0]);
}
main().catch(console.error).finally(() => prisma.$disconnect());
