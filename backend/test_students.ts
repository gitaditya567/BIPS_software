import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const students = await prisma.studentProfile.findMany({
        where: {}
    });
    console.log("Total students in DB:", students.length);
}

main().catch(console.error).finally(() => prisma.$disconnect());
