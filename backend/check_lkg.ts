import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const lkgClass = await prisma.class.findFirst({
        where: { name: { contains: 'LKG' } }
    });
    
    if (!lkgClass) {
        console.log('LKG class not found');
        return;
    }
    
    const students = await prisma.studentProfile.findMany({
        where: { classId: lkgClass.id },
        select: { admissionNo: true, studentId: true, user: { select: { name: true } } }
    });
    
    console.log(`LKG students count: ${students.length}`);
    students.forEach(s => {
        console.log(`${s.user.name} (Adm: ${s.admissionNo}, ID: ${s.studentId})`);
    });
    
    await prisma.$disconnect();
}
main();
