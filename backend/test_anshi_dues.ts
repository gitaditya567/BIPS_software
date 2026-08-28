import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const student = await prisma.studentProfile.findUnique({
    where: { admissionNo: 'BIPS/26/253' },
    include: { class: true, fees: true }
  });
  
  if (!student) {
    console.log("Student not found");
    return;
  }
  
  console.log("Student Name:", student.fatherName, student.id);
  console.log("Previous Session Due:", student.previousSessionDue);
  console.log("Class name:", student.class?.name);
  console.log("Fees paid:");
  for (const fee of student.fees) {
    console.log(`Receipt: ${fee.receiptNo}, Month: ${fee.month}, Amount: ${fee.amountPaid}, Head: ${fee.feeHead}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
