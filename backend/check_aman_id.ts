import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const student = await prisma.studentProfile.findFirst({
        where: { user: { name: { contains: 'Aman Patel', mode: 'insensitive' } } }
    });
    console.log(`Student: ${student?.user?.name}`);
    console.log(`Admission No: ${student?.admissionNo}`);
    console.log(`Student ID: ${student?.studentId}`);
    console.log(`Has studentId key: ${student && 'studentId' in student}`);
    await prisma.$disconnect();
}
main();
