import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const receipts = await prisma.feePayment.findMany({
    where: {
      student: {
        user: {
          name: {
            in: ['Divyansh', 'Abhinav Sahu', 'Abhinav'],
            mode: 'insensitive'
          }
        }
      }
    },
    include: {
      student: {
        include: {
          user: true,
          class: true
        }
      }
    }
  });

  const allDivyansh = await prisma.feePayment.findMany({
    where: {
      student: {
        user: {
          name: {
            contains: 'Divyansh',
            mode: 'insensitive'
          }
        }
      }
    },
    include: {
      student: {
        include: {
          user: true,
          class: true
        }
      }
    }
  });

  const allAbhinav = await prisma.feePayment.findMany({
    where: {
      student: {
        user: {
          name: {
            contains: 'Abhinav',
            mode: 'insensitive'
          }
        }
      }
    },
    include: {
      student: {
        include: {
          user: true,
          class: true
        }
      }
    }
  });

  console.log("Found matches:");
  console.log(JSON.stringify([...allDivyansh, ...allAbhinav].map(r => ({
    id: r.id,
    receiptNo: r.receiptNo,
    amountPaid: r.amountPaid,
    paymentDate: r.paymentDate,
    studentName: r.student.user.name,
    className: r.student.class?.name
  })), null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
