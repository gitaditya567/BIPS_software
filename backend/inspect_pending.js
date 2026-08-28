const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const pending = await prisma.feePayment.findMany({
        where: { status: 'PENDING' },
        include: {
            student: {
                include: {
                    user: true,
                    class: true
                }
            }
        }
    });
    console.log('Pending count:', pending.length);
    console.log(JSON.stringify(pending.map(p => ({
        id: p.id,
        studentName: p.student?.user?.name,
        className: p.student?.class?.name
    })), null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}
main();
