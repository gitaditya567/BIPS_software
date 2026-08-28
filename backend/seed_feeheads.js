const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Seeding Fee Heads...');
    const heads = [
        { name: 'Admission Fee', type: 'One-time' },
        { name: 'Admission Form Fee', type: 'One-time' },
        { name: 'Identity Card', type: 'One-time' },
        { name: 'Fee Card', type: 'One-time' },
        { name: 'Diary', type: 'Annual' },
        { name: 'Annual Fee', type: 'Annual' },
        { name: 'Exam Fee', type: 'Annual' },
        { name: 'Play Activity', type: 'Annual' },
        { name: 'Physical Education Fee', type: 'Annual' },
        { name: 'Lab Fee', type: 'Annual' },
        { name: 'Library Fee / House Activity', type: 'Annual' },
        { name: 'Computer Class Fee', type: 'Monthly' },
        { name: 'Monthly Tuition Fee', type: 'Monthly' }
    ];

    for (const h of heads) {
        await prisma.feeHead.upsert({
            where: { name: h.name }, // This might fail if name is not unique in Prisma model, let's check.
            update: h,
            create: h
        });
    }
    console.log('Fee Heads seeded successfully.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
