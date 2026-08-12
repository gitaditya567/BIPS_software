import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { getStudentFeeLedger } from './src/routes/fees';

dotenv.config();

async function run() {
    await mongoose.connect(process.env.MONGODB_URI || '');
    console.log("Connected DB");

    const ledger = await getStudentFeeLedger('6a5b09d8d5cce2fed53891eb'); // SR No 1447
    console.log("Ledger monthlyStatus:");
    ledger.monthlyStatus.forEach(m => {
        console.log(`Month: ${m.month}, expected: ${m.expected}, paid: ${m.paid}, pending: ${m.pending}, isPaid: ${m.isPaid}`);
        m.heads.forEach(h => {
            console.log(`  Head: ${h.name}, expected: ${h.expected}, paid: ${h.paid}, pending: ${h.pending}`);
        });
    });

    await mongoose.disconnect();
}

run().catch(console.error);
