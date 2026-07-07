const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const heads = await prisma.feeHead.findMany();
    console.log(JSON.stringify(heads, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
