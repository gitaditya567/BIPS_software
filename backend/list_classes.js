
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listClasses() {
    const classes = await prisma.class.findMany({ select: { id: true, name: true } });
    console.log(JSON.stringify(classes, null, 2));
    await prisma.$disconnect();
}

listClasses();
