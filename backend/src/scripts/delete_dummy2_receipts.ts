import prisma from '../lib/prisma';

async function main() {
    const student = await prisma.studentProfile.findFirst({
        where: { admissionNo: { contains: '1447' } },
        include: { user: true }
    });

    if (!student) {
        console.log('Student Dummy2 with SR No containing 1447 not found.');
        return;
    }

    console.log(`Found student: ${student.user?.name} (${student.admissionNo}), ID: ${student.id}`);

    const deleted = await prisma.feePayment.deleteMany({
        where: { studentId: student.id }
    });

    console.log(`Successfully deleted ${deleted.count} receipt(s) for ${student.user?.name} (${student.admissionNo}).`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
