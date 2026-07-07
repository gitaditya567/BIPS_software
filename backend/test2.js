const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const stops = await prisma.transportStop.findMany();
    console.log(stops);
}
main().catch(console.error).finally(() => prisma.$disconnect());
