import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const student = await prisma.studentProfile.findFirst({
        where: { admissionNo: { contains: '1447' } }
    });

    if (!student) {
        console.log('Dummy2 student not found');
        return;
    }

    const deleted = await prisma.feePayment.deleteMany({
        where: { studentId: student.id }
    });

    console.log(`Successfully deleted ${deleted.count} fee receipts for Dummy2 (${student.admissionNo})`);
}

main()
    .catch(err => console.error(err))
    .finally(async () => {
        await prisma.$disconnect();
    });
