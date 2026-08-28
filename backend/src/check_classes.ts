
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const classes = await prisma.class.findMany();
    console.log('--- Current Classes in Database ---');
    classes.forEach(c => {
        console.log(`ID: ${c.id}, Name: ${c.name}`);
    });
    console.log('---------------------------');
    await prisma.$disconnect();
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
