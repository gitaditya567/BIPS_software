import { PrismaClient } from '@prisma/client';
import { invalidateCache } from './src/lib/cache';

const prisma = new PrismaClient();

async function main() {
  const updates = [
    { admNo: 'BIPS/26/332', name: 'Tarun', due: 1800 },
    { admNo: 'BIPS/26/195', name: 'Tamanna', due: 5300 },
    { admNo: 'BIPS/26/1265', name: 'NihaLika', due: 2400 },
    { admNo: 'BIPS/26/077', name: 'Anushka', due: 750 },
    { admNo: 'BIPS/26/1456', name: 'ARADHYA YADAV', due: 2600 }
  ];

  console.log("================ UPDATING PREVIOUS SESSION DUES ================");

  for (const item of updates) {
    const student = await prisma.studentProfile.findUnique({
      where: { admissionNo: item.admNo },
      include: { user: true, class: true }
    });

    if (!student) {
      console.log(`ERROR: Student ${item.admNo} (${item.name}) not found!`);
      continue;
    }

    const updated = await prisma.studentProfile.update({
      where: { id: student.id },
      data: { previousSessionDue: item.due }
    });

    console.log(`SUCCESS: Updated ${updated.admissionNo} (${student.user?.name}) | Class: ${student.class?.name} | Old Due: ${student.previousSessionDue} -> New Previous Session Due: ₹${updated.previousSessionDue}`);
  }

  // Invalidate fee cache so UI updates immediately
  invalidateCache('fees:');
  invalidateCache('dashboard');
  console.log("\nServer cache cleared successfully.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
