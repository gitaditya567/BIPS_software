
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const romanClassNames = [
        "Class I", "Class II", "Class III", "Class IV", "Class V", 
        "Class VI", "Class VII", "Class VIII", "Class IX", "Class X", 
        "Class XI (Biology)", "Class XI (Maths)", "Class XI (Commerce)", 
        "Class XII (Biology)", "Class XII (Maths)", "Class XII (Commerce)"
    ];
    
    console.log('--- Deleting Roman Classes (only if no students) ---');
    
    for (const name of romanClassNames) {
        const cls = await prisma.class.findFirst({
            where: { name },
            include: { students: true }
        });

        if (cls) {
            if (cls.students.length === 0) {
                console.log(`Deleting: ${cls.name} (ID: ${cls.id})`);
                await prisma.class.delete({ where: { id: cls.id } });
            } else {
                console.log(`Skipping: ${cls.name} (has ${cls.students.length} students)`);
            }
        } else {
            console.log(`Not found: ${name}`);
        }
    }
    console.log('--- Deletion process completed ---');
    await prisma.$disconnect();
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
