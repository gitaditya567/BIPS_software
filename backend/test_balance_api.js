const { getStudentFeeLedger } = require('./src/routes/fees');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    const student = await prisma.studentProfile.findFirst({
        where: { admissionNo: 'BIPS/26/009' }
    });
    console.log('Found student:', student?.admissionNo, 'ID:', student?.id, 'prevDue:', student?.previousSessionDue);
    if (student) {
        const ledger = await getStudentFeeLedger(student.id);
        console.log('Ledger summary:', ledger.summary);
    }
}

test().catch(console.error).finally(() => prisma.$disconnect());
