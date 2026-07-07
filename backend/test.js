const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const students = await prisma.studentProfile.findMany({ select: { id: true, transportStopId: true, user: { select: { name: true } } } });
    console.log(students.length + ' students total');
    const withTransport = students.filter(s => s.transportStopId !== null);
    console.log(withTransport.length + ' have transportStopId: ', withTransport);
}
main().catch(console.error).finally(() => prisma.$disconnect());
