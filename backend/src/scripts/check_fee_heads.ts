import prisma from '../lib/prisma';

async function main() {
    const feeHeads = await prisma.feeHead.findMany();
    console.log("FEE HEADS IN DATABASE:");
    console.log(feeHeads);

    const classes = await prisma.class.findMany();
    console.log("\nCLASSES & FEE STRUCTURES:");
    classes.forEach(c => {
        console.log(`Class: ${c.name}, FeeStructure:`, c.feeStructure);
    });

    await prisma.$disconnect();
}

main().catch(console.error);
