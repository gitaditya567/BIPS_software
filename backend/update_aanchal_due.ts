import { PrismaClient } from '@prisma/client';
import { invalidateCache } from './src/lib/cache';

const prisma = new PrismaClient();

async function main() {
  const admNo = 'BIPS/26/231';
  const name = 'ANCHAL SAHU';
  const due = 25050;

  const student = await prisma.studentProfile.findUnique({
    where: { admissionNo: admNo },
    include: { user: true, class: true }
  });

  if (!student) {
    console.log(`ERROR: Student ${admNo} (${name}) not found!`);
    return;
  }

  console.log(`Found: ${student.admissionNo} | ${student.user?.name} | Class: ${student.class?.name} | Current PrevDue: ₹${student.previousSessionDue}`);

  const updated = await prisma.studentProfile.update({
    where: { id: student.id },
    data: { previousSessionDue: due }
  });

  console.log(`SUCCESS: Updated ${updated.admissionNo} (${student.user?.name}) | Class: ${student.class?.name} | Old Due: ₹${student.previousSessionDue} -> New Previous Session Due: ₹${updated.previousSessionDue}`);

  // Invalidate fee cache so UI updates immediately
  invalidateCache('fees:');
  invalidateCache('dashboard');
  console.log('\nServer cache cleared successfully.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
