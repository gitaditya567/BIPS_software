import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const students = await prisma.studentProfile.findMany({
        where: { studentId: null },
        select: { admissionNo: true, user: { select: { name: true } } }
    });
    console.log(`Found ${students.length} students with null studentId.`);
    students.slice(0, 10).forEach(s => {
        console.log(`${s.user.name} (${s.admissionNo})`);
    });
    await prisma.$disconnect();
}
main();
