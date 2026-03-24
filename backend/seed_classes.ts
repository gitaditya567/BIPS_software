import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('Starting DB setup...');
    const newClasses = [
        'Nursery', 'Lower Kindergarten (LKG)', 'Upper Kindergarten (UKG)',
        'Class I', 'Class II', 'Class III', 'Class IV', 'Class V',
        'Class VI', 'Class VII', 'Class VIII',
        'Class IX', 'Class X',
        'Class XI (Biology)', 'Class XI (Maths)', 'Class XI (Commerce)',
        'Class XII (Biology)', 'Class XII (Maths)', 'Class XII (Commerce)'
    ];
    for (const name of newClasses) {
        console.log('Ensuring class:', name);
        let cls = await prisma.class.findFirst({ where: { name } });
        if (!cls) {
            cls = await prisma.class.create({ data: { name } });
            console.log('Created class:', name);
        } else {
            console.log('Class already existed:', name);
        }
        const sections = ['A', 'B'];
        for (const sec of sections) {
            const existingSec = await prisma.section.findFirst({ where: { name: sec, classId: cls.id } });
            if (!existingSec) {
                await prisma.section.create({ data: { name: sec, classId: cls.id } });
                console.log('Created section', sec, 'for class', name);
            }
        }
    }

    // Now let's carefully clean up old redundant classes like '1', '2', 'Class 1' etc if they are not in the exact new list
    const allExistingClasses = await prisma.class.findMany();
    for (const ec of allExistingClasses) {
        if (!newClasses.includes(ec.name)) {
            // Check if it has any students
            const studentCount = await prisma.studentProfile.count({ where: { classId: ec.id } });
            if (studentCount === 0) {
                await prisma.class.delete({ where: { id: ec.id } });
                console.log('Deleted old unused class:', ec.name);
            } else {
                console.log('Skipping old class deletion due to existing students:', ec.name);
            }
        }
    }
    
    console.log('Done!');
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
        process.exit(0);
    });
