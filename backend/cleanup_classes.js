
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanup() {
    const duplicates = [
        'LKG', 'UKG', 
        'Class 11 Bio', 'Class 11 Maths', 'Class 11 Commerce',
        'Class 12 Bio', 'Class 12 Maths', 'Class 12 Commerce'
    ];
    
    for (const name of duplicates) {
        // Only delete if there are NO students assigned and it matches EXACTLY
        const cls = await prisma.class.findFirst({
            where: { name },
            include: { _count: { select: { students: true } } }
        });
        
        if (cls && cls._count.students === 0) {
            console.log(`Deleting duplicate class: ${name}`);
            await prisma.class.delete({ where: { id: cls.id } });
        } else if (cls) {
            console.log(`Skipping class ${name} because it has ${cls._count.students} students.`);
        }
    }
    
    await prisma.$disconnect();
}

cleanup();
