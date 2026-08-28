import prisma from '../lib/prisma';
import { getStudentFeeLedger } from '../routes/fees';

async function main() {
    const student = await prisma.studentProfile.findFirst({
        where: { admissionNo: { contains: '1447' } },
        include: { user: true, class: true }
    });
    if (!student) {
        console.log('Student not found');
        return;
    }
    console.log('Student:', student.admissionNo, student.user?.name, 'previousSessionDue:', student.previousSessionDue);
    const payments = await prisma.feePayment.findMany({
        where: { studentId: student.id },
        orderBy: { paymentDate: 'asc' }
    });
    console.log('--- ALL PAYMENTS ---');
    payments.forEach(p => {
        console.log(p.receiptNo, '| Date:', p.paymentDate?.toISOString().slice(0, 10), '| Month:', p.month, '| Head:', p.feeHead, '| AmountPaid:', p.amountPaid, '| Discount:', p.discount, '| Status:', p.status);
    });

    const ledger = await getStudentFeeLedger(student.id);
    console.log('--- MONTHLY DUES IN LEDGER ---');
    ledger.monthlyStatus.forEach(m => {
        console.log(m.month, 'Expected:', m.expected, 'Paid:', m.paid, 'Pending:', m.pending, 'Heads:', JSON.stringify(m.heads));
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
