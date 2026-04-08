import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const student = await prisma.studentProfile.findFirst({
        where: { user: { name: { contains: 'Aman Patel', mode: 'insensitive' } } },
        include: { user: true }
    });
    console.log('Student Info:');
    console.log(JSON.stringify(student, null, 2));
    await prisma.$disconnect();
}
main();
