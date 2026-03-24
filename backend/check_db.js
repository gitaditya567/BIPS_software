
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
    const classes = await prisma.class.findMany({
        select: { id: true, name: true, feeStructure: true }
    });
    console.log('--- CLASSES ---');
    classes.forEach(c => console.log(`${c.name}: ${JSON.stringify(c.feeStructure)}`));

    const students = await prisma.student.findMany({
        include: { class: true, user: true },
        take: 5
    });
    console.log('\n--- STUDENTS ---');
    students.forEach(s => console.log(`${s.user.name}: Class=${s.class.name}`));

    await prisma.$disconnect();
}

checkData();
