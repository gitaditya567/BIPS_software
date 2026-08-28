const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const classNames = [
    'Play', 'Nursery', 'LKG', 'UKG',
    'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5',
    'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10',
    'Class 11', 'Class 12'
  ];

  console.log('Starting to seed classes...');

  for (const name of classNames) {
    const existing = await prisma.class.findFirst({ where: { name } });
    if (!existing) {
      await prisma.class.create({ data: { name } });
      console.log(`Created class: ${name}`);
    } else {
      console.log(`Class already exists: ${name}`);
    }
  }

  console.log('Seeding completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
