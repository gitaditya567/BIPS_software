const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const cs = await prisma.class.findMany();
    cs.forEach(c => console.log(c.name));
}
main().catch(console.error).finally(() => prisma.$disconnect());
