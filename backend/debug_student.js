const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const students = await prisma.studentProfile.findMany({ 
        include: { user: true, class: true } 
    });
    const class1 = students.filter(s => s.class && s.class.name === 'Class 1');
    for (const s of class1) {
        console.log(`Student: ${s.user.name} | ID: ${s.id} | AdmNo: ${s.admissionNo}`);
        const payments = await prisma.feePayment.findMany({ where: { studentId: s.id, status: 'APPROVED' } });
        console.log(`  Payments: ${payments.length}`);
        payments.forEach(p => console.log(`    Amt: ${p.amountPaid} | Head: ${p.feeHead} | Month: ${p.month}`));
        console.log(`  Class Structure: ${JSON.stringify(s.class.feeStructure)}`);
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
