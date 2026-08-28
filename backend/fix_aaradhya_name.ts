import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const student = await prisma.studentProfile.findUnique({
    where: { admissionNo: 'BIPS/26/1456' },
    include: { user: true, class: true, fees: true }
  });

  if (student && student.user) {
    console.log("Current name in User table:", JSON.stringify(student.user.name));
    
    // Normalize name space if it has double spaces
    const cleanName = student.user.name.replace(/\s+/g, ' ').trim();
    if (cleanName !== student.user.name) {
      await prisma.user.update({
        where: { id: student.userId },
        data: { name: cleanName }
      });
      console.log("Updated User name to:", JSON.stringify(cleanName));
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
