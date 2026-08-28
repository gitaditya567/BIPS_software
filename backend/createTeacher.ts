import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('Adding a teacher login...');
    const pwd = await bcrypt.hash('teacher123', 10);

    const user = await prisma.user.upsert({
        where: { email: 'teacher@schoolerp.com' },
        update: {},
        create: {
            email: 'teacher@schoolerp.com',
            password: pwd,
            role: 'TEACHER',
            name: 'John Doe',
            phone: '9876543210',
            teacherProfile: {
                create: {
                    employeeId: 'EMP-001'
                }
            }
        }
    });

    console.log('Teacher created:', user.email);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
