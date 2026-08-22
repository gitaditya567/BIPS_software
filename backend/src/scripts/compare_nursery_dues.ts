import axios from 'axios';

async function compareNursery() {
    try {
        const loginRes = await axios.post('http://localhost:5000/api/login', {
            email: 'admin@schoolerp.com',
            password: 'admin123',
            role: 'ADMIN'
        });
        const token = loginRes.data.token;
        const headers = { Authorization: `Bearer ${token}` };

        // 1. Snapshot Matrix
        const revRes = await axios.get('http://localhost:5000/api/admin/dashboard/revenue', { headers });
        const nurseryMatrix = revRes.data.classMatrix.find((c: any) => c.className.toLowerCase() === 'nursery');

        // 2. General Due List
        const generalDueRes = await axios.get('http://localhost:5000/api/fees/due-list', { headers });
        const nurseryGeneralStudents = generalDueRes.data.filter((s: any) => s.className?.toLowerCase() === 'nursery');

        let totalGeneralNetPending = 0;
        let totalGeneralMonthlyPending = 0;
        let totalGeneralOneTimePending = 0;
        let totalGeneralPrevPending = 0;

        nurseryGeneralStudents.forEach((s: any) => {
            totalGeneralNetPending += s.pending || 0;
            totalGeneralMonthlyPending += s.monthlyPending || 0;
            totalGeneralOneTimePending += s.oneTimePending || 0;
            totalGeneralPrevPending += s.prevDuePending || 0;
        });

        // 3. Transport Due List
        const transportDueRes = await axios.get('http://localhost:5000/api/fees/transport-due-list', { headers });
        const nurseryTransportStudents = transportDueRes.data.filter((s: any) => s.className?.toLowerCase() === 'nursery');

        let totalTransportDue = 0;
        nurseryTransportStudents.forEach((s: any) => {
            totalTransportDue += s.dueAmount || s.pendingAmount || 0;
        });

        console.log('======================================================');
        console.log('🔍 NURSERY CLASS: DUE COMPARISON REPORT');
        console.log('======================================================');
        console.log('1. Snapshot Matrix (Dashboard):');
        console.log(`   - Yearly Projected:      ₹${nurseryMatrix?.yearlyProjected?.toLocaleString('en-IN')}`);
        console.log(`   - Total Collected (Net):  ₹${nurseryMatrix?.collected?.toLocaleString('en-IN')}`);
        console.log(`   - Total Discounts Given:  ₹${nurseryMatrix?.discountGiven?.toLocaleString('en-IN')}`);
        console.log(`   - Till Month Due:         ₹${nurseryMatrix?.dueTillNow?.toLocaleString('en-IN')}`);
        console.log(`   - Yearly Outstanding:     ₹${nurseryMatrix?.outstanding?.toLocaleString('en-IN')}`);

        console.log('\n2. General Fee Due List (/api/fees/due-list):');
        console.log(`   - Total Students in Due List: ${nurseryGeneralStudents.length}`);
        console.log(`   - Total Net Pending (Dues):   ₹${totalGeneralNetPending.toLocaleString('en-IN')}`);
        console.log(`     * Monthly Pending:          ₹${totalGeneralMonthlyPending.toLocaleString('en-IN')}`);
        console.log(`     * One-Time Pending:         ₹${totalGeneralOneTimePending.toLocaleString('en-IN')}`);
        console.log(`     * Previous Dues Pending:    ₹${totalGeneralPrevPending.toLocaleString('en-IN')}`);

        console.log('\n3. Transport Fee Due List (/api/fees/transport-due-list):');
        console.log(`   - Total Transport Students:   ${nurseryTransportStudents.length}`);
        console.log(`   - Total Transport Due Amount: ₹${totalTransportDue.toLocaleString('en-IN')}`);

        console.log('\n======================================================');
        console.log(`General Due List Net Pending:            ₹${totalGeneralNetPending.toLocaleString('en-IN')}`);
        console.log(`Snapshot Matrix "Till Month Due":        ₹${nurseryMatrix?.dueTillNow?.toLocaleString('en-IN')}`);
        console.log('======================================================');

    } catch (e: any) {
        console.error(e.response?.data || e.message);
    }
}

compareNursery();
