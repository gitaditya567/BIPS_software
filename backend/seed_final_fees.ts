import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('Seeding Final Fee Structure...');

    // 1. Define Fee Heads
    const feeHeads = [
        { name: 'Admission Fee', type: 'One-time' },
        { name: 'Admission Form Fee', type: 'One-time' },
        { name: 'Identity Card', type: 'One-time' },
        { name: 'Fee Card', type: 'One-time' },
        { name: 'Diary', type: 'Annual' },
        { name: 'Annual Fee', type: 'Annual' },
        { name: 'Exam Fee', type: 'Annual' },
        { name: 'Play Activity', type: 'Annual' },
        { name: 'Physical Education Fee', type: 'Annual' },
        { name: 'Lab Fee', type: 'Annual' },
        { name: 'Library Fee / House Activity', type: 'Annual' },
        { name: 'Computer Class Fee', type: 'Monthly' },
        { name: 'Monthly Tuition Fee', type: 'Monthly' }
    ];

    for (const head of feeHeads) {
        await prisma.feeHead.upsert({
            where: { name: head.name },
            update: head,
            create: head
        });
    }
    console.log('Fee Heads seeded.');

    // 2. Define Classes and their Fee Structures
    const classStructures = [
        {
            name: 'Nursery',
            fees: {
                'Admission Fee': 2000,
                'Admission Form Fee': 300,
                'Fee Card': 400,
                'Annual Fee': 900,
                'Exam Fee': 900,
                'Computer Class Fee': 150,
                'Monthly Tuition Fee': 950
            }
        },
        {
            name: 'Lower Kindergarten (LKG)',
            fees: {
                'Admission Fee': 2500,
                'Admission Form Fee': 300,
                'Fee Card': 400,
                'Annual Fee': 900,
                'Exam Fee': 1100,
                'Computer Class Fee': 300,
                'Monthly Tuition Fee': 1100
            }
        },
        {
            name: 'Upper Kindergarten (UKG)',
            fees: {
                'Admission Fee': 2500,
                'Admission Form Fee': 300,
                'Fee Card': 400,
                'Annual Fee': 900,
                'Exam Fee': 1100,
                'Computer Class Fee': 300,
                'Monthly Tuition Fee': 1300
            }
        },
        {
            name: 'Class 1',
            fees: {
                'Admission Fee': 2500,
                'Admission Form': 300,
                'Fee Card': 400,
                'Annual Fee': 900,
                'Exam Fee': 1100,
                'Computer Class Fee': 350,
                'Monthly Tuition Fee': 1450
            }
        },
        {
            name: 'Class 2',
            fees: {
                'Admission Fee': 2500,
                'Admission Form Fee': 300,
                'Fee Card': 400,
                'Annual Fee': 900,
                'Exam Fee': 1100,
                'Computer Class Fee': 300,
                'Monthly Tuition Fee': 1300
            }
        },
        {
            name: 'Class 3',
            fees: {
                'Admission Fee': 3000,
                'Admission Form Fee': 300,
                'Fee Card': 400,
                'Annual Fee': 900,
                'Exam Fee': 1100,
                'Computer Class Fee': 350,
                'Monthly Tuition Fee': 1450
            }
        },
        {
            name: 'Class 4',
            fees: {
                'Admission Fee': 3000,
                'Admission Form Fee': 300,
                'Fee Card': 400,
                'Annual Fee': 900,
                'Exam Fee': 1100,
                'Computer Class Fee': 350,
                'Monthly Tuition Fee': 1450
            }
        },
        {
            name: 'Class 5',
            fees: {
                'Admission Fee': 3000,
                'Admission Form Fee': 300,
                'Fee Card': 400,
                'Annual Fee': 900,
                'Exam Fee': 1100,
                'Computer Class Fee': 350,
                'Monthly Tuition Fee': 1450
            }
        },
        {
            name: 'Class 6',
            fees: {
                'Admission Fee': 3000,
                'Admission Form Fee': 300,
                'Fee Card': 400,
                'Annual Fee': 900,
                'Exam Fee': 1100,
                'Computer Class Fee': 350,
                'Monthly Tuition Fee': 1450
            }
        },
        {
            name: 'Class 7',
            fees: {
                'Admission Fee': 3000,
                'Admission Form Fee': 300,
                'Fee Card': 400,
                'Annual Fee': 900,
                'Exam Fee': 1100,
                'Computer Class Fee': 350,
                'Monthly Tuition Fee': 1450
            }
        },
        {
            name: 'Class 8',
            fees: {
                'Admission Fee': 3000,
                'Admission Form Fee': 300,
                'Fee Card': 400,
                'Annual Fee': 900,
                'Exam Fee': 1100,
                'Computer Class Fee': 350,
                'Monthly Tuition Fee': 1450
            }
        },
        {
            name: 'Class 9',
            fees: {
                'Admission Fee': 3500,
                'Admission Form Fee': 300,
                'Fee Card': 400,
                'Annual Fee': 1100,
                'Exam Fee': 1300,
                'Monthly Tuition Fee': 1900
            }
        },
        {
            name: 'Class 10',
            fees: {
                'Admission Fee': 3500,
                'Admission Form Fee': 300,
                'Fee Card': 400,
                'Annual Fee': 1100,
                'Exam Fee': 1300,
                'Monthly Tuition Fee': 2000
            }
        },
        {
            name: 'Class 11 (Bio)',
            fees: {
                'Admission Fee': 4000,
                'Admission Form Fee': 300,
                'Fee Card': 400,
                'Annual Fee': 1300,
                'Exam Fee': 1400,
                'Physical Education Fee': 200,
                'Lab Fee': 400,
                'Monthly Tuition Fee': 1600
            }
        },
        {
            name: 'Class 11 (Maths)',
            fees: {
                'Admission Fee': 4000,
                'Admission Form Fee': 300,
                'Fee Card': 400,
                'Annual Fee': 1300,
                'Exam Fee': 1400,
                'Physical Education Fee': 200,
                'Lab Fee': 300,
                'Monthly Tuition Fee': 1600
            }
        },
        {
            name: 'Class 11 (Commerce)',
            fees: {
                'Admission Fee': 4000,
                'Admission Form Fee': 300,
                'Fee Card': 400,
                'Annual Fee': 1300,
                'Exam Fee': 1400,
                'Physical Education Fee': 200,
                'Monthly Tuition Fee': 1800
            }
        },
        {
            name: 'Class 12 (Bio)',
            fees: {
                'Admission Fee': 4000,
                'Admission Form Fee': 300,
                'Fee Card': 400,
                'Annual Fee': 1300,
                'Exam Fee': 1400,
                'Physical Education Fee': 200,
                'Lab Fee': 400,
                'Monthly Tuition Fee': 1700
            }
        },
        {
            name: 'Class 12 (Maths)',
            fees: {
                'Admission Fee': 4000,
                'Admission Form Fee': 300,
                'Fee Card': 400,
                'Annual Fee': 1300,
                'Exam Fee': 1400,
                'Physical Education Fee': 200,
                'Lab Fee': 300,
                'Monthly Tuition Fee': 1700
            }
        },
        {
            name: 'Class 12 (Commerce)',
            fees: {
                'Admission Fee': 4000,
                'Admission Form Fee': 300,
                'Fee Card': 400,
                'Annual Fee': 1300,
                'Exam Fee': 1400,
                'Physical Education Fee': 200,
                'Monthly Tuition Fee': 1850
            }
        }
    ];

    for (const cs of classStructures) {
        console.log(`Setting up class: ${cs.name}`);
        
        // Find existing class OR create it
        let cls = await prisma.class.findFirst({
            where: { name: cs.name }
        });

        if (cls) {
            await prisma.class.update({
                where: { id: cls.id },
                data: { feeStructure: cs.fees }
            });
            console.log(`Updated fee structure for: ${cs.name}`);
        } else {
            cls = await prisma.class.create({
                data: {
                    name: cs.name,
                    feeStructure: cs.fees
                }
            });
            console.log(`Created class and set fee structure for: ${cs.name}`);
            
            // Also create default sections A and B if it's a new class
            await prisma.section.createMany({
                data: [
                    { name: 'A', classId: cls.id },
                    { name: 'B', classId: cls.id }
                ]
            });
        }
    }

    console.log('All classes and fee structures seeded successfully!');
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
        process.exit(0);
    });
