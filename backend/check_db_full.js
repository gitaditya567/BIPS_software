
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
    console.log('--- ALL CLASSES IN DB ---');
    const allClasses = await prisma.class.findMany({
        select: { id: true, name: true, feeStructure: true }
    });
    allClasses.forEach(c => {
        console.log(`[${c.id}] Name: "${c.name}", FeeStructure: ${JSON.stringify(c.feeStructure)}`);
    });

    try {
        const students = await prisma.student.findMany({
            include: { class: true, user: true },
            take: 10
        });
        console.log('\n--- RECENT STUDENTS ---');
        students.forEach(s => {
            console.log(`Student: "${s.user.name}", Admission: "${s.admissionNo}", Class: "${s.class?.name || 'N/A'}"`);
        });
    } catch (e) {
        console.log('Error fetching students: ', e.message);
    }

    await prisma.$disconnect();
}

checkData();
