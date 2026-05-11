import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function cleanClasses() {
  const classes = await prisma.class.findMany();
  for (const c of classes) {
    if (/^\d+(st|nd|rd|th)$/i.test(c.name)) {
      console.log(`Deleting class: ${c.name} (${c.id})`);
      // Since it's a relational DB, we might need to delete related data or it might cascade.
      try {
        await prisma.class.delete({ where: { id: c.id } });
        console.log(`Successfully deleted ${c.name}`);
      } catch (e: any) {
        console.log(`Could not delete ${c.name} (might be in use): ${e.message}`);
      }
    }
  }
}
cleanClasses().finally(() => prisma.$disconnect());
