import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const students = await prisma.studentProfile.findMany({
        select: { admissionNo: true, studentId: true, user: { select: { name: true } } }
    });
    
    const count = students.filter(s => !s.studentId).length;
    console.log(`Students with missing/falsy studentId: ${count}`);
    
    students.filter(s => !s.studentId).slice(0, 10).forEach(s => {
        console.log(`${s.user.name} (Adm: ${s.admissionNo}, ID: ${s.studentId})`);
    });
    
    await prisma.$disconnect();
}
main();
