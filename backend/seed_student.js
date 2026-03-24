const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');

async function main() {
  const cls = await prisma.class.upsert({
    where: { id: '64f1e0000000000000000001' }, // Dummy ID
    update: {},
    create: {
      id: '64f1e0000000000000000001',
      name: 'Class 1'
    }
  });

  const sec = await prisma.section.upsert({
    where: { id: '64f1e0000000000000000002' },
    update: {},
    create: {
      id: '64f1e0000000000000000002',
      name: 'A',
      classId: cls.id
    }
  });

  const hashedPassword = await bcrypt.hash('student123', 10);
  
  await prisma.user.upsert({
    where: { email: 'student@schoolerp.com' },
    update: {},
    create: {
      email: 'student@schoolerp.com',
      password: hashedPassword,
      name: 'Aditya Student',
      role: 'PARENT', // In your schema it says STUDENT use this if studentProfile is linked
      studentProfile: {
        create: {
          admissionNo: 'ADM001',
          classId: cls.id,
          sectionId: sec.id,
          studentId: 'STU-2026-0001'
        }
      }
    }
  });
  console.log('Student seeded');
}
main().finally(() => prisma.$disconnect());
