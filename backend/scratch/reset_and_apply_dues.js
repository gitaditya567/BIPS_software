const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function main() {
  console.log('Reading data...');
  const content1 = fs.readFileSync('scratch/insert_prev_dues.ts', 'utf8');
  const match1 = content1.match(/const studentsData = \[([\s\S]*?)\];/);
  let arr1 = [];
  if (match1) {
    const listStr = match1[1];
    arr1 = eval(`[${listStr}]`);
  }

  const content2 = fs.readFileSync('scratch/insert_remaining.ts', 'utf8');
  const match2 = content2.match(/const newStudentsData = \[([\s\S]*?)\];/);
  let arr2 = [];
  if (match2) {
    const listStr2 = match2[1];
    arr2 = eval(`[${listStr2}]`);
  }

  const allData = [...arr1, ...arr2];
  console.log('Total students to set dues for:', allData.length);

  console.log('Resetting all previousSessionDue to 0...');
  await prisma.studentProfile.updateMany({
    data: { previousSessionDue: 0 }
  });

  console.log('Applying dues from list...');
  let updatedCount = 0;
  let notFound = 0;

  for (const item of allData) {
    // find student
    const dbStudent = await prisma.studentProfile.findFirst({
      where: {
        user: { name: { equals: item.name, mode: 'insensitive' } },
        fatherName: { equals: item.father, mode: 'insensitive' }
      },
      orderBy: { admissionDate: 'desc' }
    });

    if (dbStudent) {
      await prisma.studentProfile.update({
        where: { id: dbStudent.id },
        data: { previousSessionDue: item.preBal }
      });
      updatedCount++;
    } else {
      console.log('Not found:', item.name);
      notFound++;
    }
  }

  console.log(`Updated ${updatedCount} students.`);
  if (notFound > 0) console.log(`Missing ${notFound} students.`);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
