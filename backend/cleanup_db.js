const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Cleaning up database...');

    // Keep the admin@example.com user
    const adminUser = await prisma.user.findUnique({ where: { email: 'admin@example.com' } });
    if (!adminUser) {
        console.log('Admin user not found. Please ensure you have an admin user.');
    }

    // Delete in reverse order of dependencies
    await prisma.feePayment.deleteMany({});
    await prisma.feeHead.deleteMany({});
    await prisma.concession.deleteMany({});
    await prisma.attendance.deleteMany({});
    await prisma.studentProfile.deleteMany({});
    
    // Delete all users EXCEPT the admin
    await prisma.user.deleteMany({
        where: {
            email: { not: 'admin@example.com' }
        }
    });

    await prisma.section.deleteMany({});
    await prisma.class.deleteMany({});

    console.log('Database cleaned up successfully (except admin@example.com).');
}

main()
    .catch(e => {
        console.error(error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
