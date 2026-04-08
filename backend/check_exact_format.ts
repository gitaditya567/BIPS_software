import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const students = await prisma.studentProfile.findMany({
        take: 5,
        orderBy: { admissionNo: 'desc' },
        select: { admissionNo: true }
    });
    console.log('Last 5 Admission Numbers:');
    students.forEach(s => console.log(s.admissionNo));
    await prisma.$disconnect();
}
main();
