import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('Checking/Creating Admin...');
    const adminPassword = await bcrypt.hash('admin123', 10);

    try {
        const admin = await prisma.user.upsert({
            where: { email: 'admin@schoolerp.com' },
            update: {
                password: adminPassword,
                role: 'ADMIN'
            },
            create: {
                email: 'admin@schoolerp.com',
                password: adminPassword,
                role: 'ADMIN',
                name: 'System Administrator',
                phone: '1234567890',
            },
        });
        console.log('✅ Admin user ready:', admin.email);
    } catch (error) {
        console.error('❌ Error creating admin:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
