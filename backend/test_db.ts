import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ where: { role: 'TEACHER' }});
  console.log("Teachers in DB:", users);
  
  for (const u of users) {
    const profile = await prisma.teacherProfile.findUnique({ where: { userId: u.id }});
    console.log("Profile for", u.name, profile);
    if(profile) {
      const subjects = await prisma.subject.findMany({ where: { teacherId: profile.id }});
      console.log("Subjects for", u.name, subjects);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
