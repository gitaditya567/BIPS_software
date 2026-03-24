import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database...');

    const adminPassword = await bcrypt.hash('admin123', 10);

    // Create an Admin user
    const admin = await prisma.user.upsert({
        where: { email: 'admin@schoolerp.com' },
        update: {},
        create: {
            email: 'admin@schoolerp.com',
            password: adminPassword,
            role: 'ADMIN',
            name: 'System Administrator',
            phone: '1234567890',
        },
    });

    const accountsPassword = await bcrypt.hash('accounts123', 10);
    const accounts = await prisma.user.upsert({
        where: { email: 'accounts@schoolerp.com' },
        update: {},
        create: {
            email: 'accounts@schoolerp.com',
            password: accountsPassword,
            role: 'ACCOUNTS',
            name: 'Accounts Manager',
            phone: '0987654321',
        },
    });

    const principalPassword = await bcrypt.hash('principal123', 10);
    const principal = await prisma.user.upsert({
        where: { email: 'principal@schoolerp.com' },
        update: {},
        create: {
            email: 'principal@schoolerp.com',
            password: principalPassword,
            role: 'PRINCIPAL',
            name: 'School Principal',
            phone: '1122334455',
        },
    });

    const transportPassword = await bcrypt.hash('transport123', 10);
    const transport = await prisma.user.upsert({
        where: { email: 'transport@schoolerp.com' },
        update: {},
        create: {
            email: 'transport@schoolerp.com',
            password: transportPassword,
            role: 'TRANSPORT',
            name: 'Transport Manager',
            phone: '5566778899',
        },
    });

    console.log('✅ Admin, Accounts, Principal and Transport seed complete!');

    // Add all classes
    const classNames = [
        'Nursery', 'LKG', 'UKG',
        '1st', '2nd', '3rd', '4th', '5th',
        '6th', '7th', '8th', '9th', '10th',
        '11th', '12th'
    ];

    console.log('Adding classes and sections...');
    
    for (const name of classNames) {
        // Find or create class
        let schoolClass = await prisma.class.findFirst({ where: { name } });
        
        if (!schoolClass) {
            schoolClass = await prisma.class.create({
                data: { name }
            });
        }

        // Add sections A and B for each class
        const sections = ['A', 'B'];
        for (const secName of sections) {
            const existingSection = await prisma.section.findFirst({
                where: { name: secName, classId: schoolClass.id }
            });

            if (!existingSection) {
                await prisma.section.create({
                    data: {
                        name: secName,
                        classId: schoolClass.id
                    }
                });
            }
        }
    }

    console.log('✅ All Classes and Sections added successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
