import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Search all students with sahu or anchal in name
  const students = await prisma.studentProfile.findMany({
    where: {
      OR: [
        { user: { name: { contains: 'Sahu', mode: 'insensitive' } } },
        { user: { name: { contains: 'anchal', mode: 'insensitive' } } },
        { user: { name: { contains: 'aanchal', mode: 'insensitive' } } },
      ]
    },
    include: { user: true, class: true }
  });

  console.log('Found students:');
  students.forEach(s => {
    console.log(`  AdmNo: ${s.admissionNo} | Name: ${s.user?.name} | Class: ${s.class?.name} | PrevDue: ${s.previousSessionDue}`);
  });

  // Also list all classes
  const classes = await prisma.class.findMany({ orderBy: { name: 'asc' } });
  console.log('\nAll classes:', classes.map(c => c.name).join(', '));
}

main().catch(console.error).finally(() => prisma.$disconnect());
