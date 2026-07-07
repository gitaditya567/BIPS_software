import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const student = await prisma.studentProfile.findUnique({
    where: { admissionNo: 'BIPS/26/622' },
    include: { class: true }
  });
  
  if (!student) {
    console.log("Student not found");
    return;
  }
  
  console.log("Class name:", student.class?.name);
  console.log("Class Fee Structure:", JSON.stringify(student.class?.feeStructure, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
