import { PrismaClient } from '@prisma/client';
import axios from 'axios';

async function checkRevenueAPI() {
    try {
        const loginRes = await axios.post('http://localhost:5000/api/login', {
            email: 'admin@schoolerp.com',
            password: 'admin123',
            role: 'ADMIN'
        });
        const token = loginRes.data.token;

        const res = await axios.get('http://localhost:5000/api/admin/dashboard/revenue', {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('Response keys:', Object.keys(res.data));
        const matrix = res.data.classMatrix || res.data.classWiseMatrix || [];
        console.log('Matrix count:', matrix.length);
        matrix.forEach((c: any) => {
            console.log(`Class: ${c.className.padEnd(12)} | Students: ${c.totalStudents.toString().padEnd(3)} | Projected: ₹${c.yearlyProjected.toLocaleString('en-IN').padEnd(10)} | Collected: ₹${c.collected.toLocaleString('en-IN').padEnd(10)} | Discount: ₹${c.discountGiven.toLocaleString('en-IN').padEnd(8)} | TillMonthDue: ₹${(c.dueTillNow || 0).toLocaleString('en-IN').padEnd(10)} | Outstanding: ₹${c.outstanding.toLocaleString('en-IN')}`);
        });

        console.log('\nSummary:');
        console.log(res.data.summary);
    } catch (e: any) {
        console.error(e.response?.data || e.message);
    }
}

checkRevenueAPI();
