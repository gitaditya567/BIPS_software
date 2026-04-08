import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const students = await prisma.studentProfile.findMany({
        where: { admissionNo: { startsWith: 'BIPS/26/' } },
        orderBy: { admissionNo: 'desc' },
        take: 1
    });
    const latest = students[0]?.admissionNo || 'BIPS/26/000';
    console.log(`Latest: ${latest}`);
    const nextNum = parseInt(latest.split('/')[2]) + 1;
    const nextAdm = `BIPS/26/${String(nextNum).padStart(3, '0')}`;
    const nextStuId = `STU-2026-${String(nextNum).padStart(4, '0')}`;
    
    const aman = await prisma.studentProfile.findFirst({
        where: { user: { name: 'Aman Patel' } }
    });
    
    if (aman) {
        await prisma.studentProfile.update({
            where: { id: aman.id },
            data: { 
                admissionNo: nextAdm,
                studentId: nextStuId
            }
        });
        console.log(`Updated Aman Patel: Adm: ${nextAdm}, ID: ${nextStuId}`);
    } else {
        console.log('Aman Patel not found');
    }
    
    await prisma.$disconnect();
}
main();
