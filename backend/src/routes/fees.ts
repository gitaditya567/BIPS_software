import express from 'express';
import prisma from '../lib/prisma';

const router = express.Router();

// Get Next Receipt Number
router.get('/next-receipt', async (req, res) => {
    try {
        const lastPayment = await prisma.feePayment.findFirst({
            orderBy: { paymentDate: 'desc' }
        });
        
        let nextNumber = 1;
        if (lastPayment && lastPayment.receiptNo) {
            const lastNoStr = lastPayment.receiptNo.replace('RCP', '');
            nextNumber = parseInt(lastNoStr) + 1;
        }

        const nextReceiptNo = 'RCP' + String(nextNumber).padStart(3, '0');
        res.json({ receiptNo: nextReceiptNo });
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate receipt number' });
    }
});

// Collect Fee (Submission)
router.post('/collect', async (req, res) => {
    try {
        const {
            studentId, admissionNo, amountPaid, totalFee, discount, discountReason,
            feeHead, paymentMode, month, year, submittedBy, remark
        } = req.body;

        const isPending = Number(discount) > 0;

        const lastPayment = await prisma.feePayment.findFirst({
            orderBy: { paymentDate: 'desc' }
        });
        
        let nextNumber = 1;
        if (lastPayment && lastPayment.receiptNo) {
            const lastNoStr = lastPayment.receiptNo.replace('RCP', '');
            nextNumber = parseInt(lastNoStr) + 1;
        }
        const generatedReceiptNo = 'RCP' + String(nextNumber).padStart(3, '0');

        const feePayment = await prisma.feePayment.create({
            data: {
                studentId,
                amountPaid: Number(amountPaid),
                totalFee: Number(totalFee),
                discount: Number(discount),
                discountReason,
                feeHead,
                paymentMode,
                month,
                year,
                submittedBy,
                remark,
                status: isPending ? 'PENDING' : 'APPROVED',
                receiptNo: generatedReceiptNo,
                paymentDate: new Date()
            }
        });

        res.json({
            success: true,
            data: feePayment,
            message: isPending ? 'Sent for approval' : 'Fee collected'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to collect fee' });
    }
});

// Get Pending Approvals (for Principal)
router.get('/pending', async (req, res) => {
    try {
        const pending = await prisma.feePayment.findMany({
            where: { status: 'PENDING' },
            include: {
                student: {
                    include: {
                        user: true,
                        class: true
                    }
                }
            }
        });
        res.json(pending.map(p => ({
            ...p,
            studentName: p.student?.user?.name || 'Unknown',
            className: p.student?.class?.name || 'Unknown',
            admissionNo: p.student?.admissionNo || 'N/A'
        })));
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch pending approvals' });
    }
});

// Approve Fee
router.post('/:id/approve', async (req, res) => {
    try {
        const { id } = req.params;
        const { approvedBy } = req.body;

        const updated = await prisma.feePayment.update({
            where: { id },
            data: {
                status: 'APPROVED',
                approvedBy,
                approvalDate: new Date()
            }
        });

        res.json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ error: 'Failed to approve fee' });
    }
});

// Reject Fee
router.post('/:id/reject', async (req, res) => {
    try {
        const { id } = req.params;
        const { approvedBy } = req.body; 

        const updated = await prisma.feePayment.update({
            where: { id },
            data: {
                status: 'REJECTED',
                approvedBy,
                approvalDate: new Date()
            }
        });

        res.json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ error: 'Failed to reject fee' });
    }
});

// Pay Full (Finalize rejected draft by removing discount)
router.post('/:id/pay-full', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Find existing record to set amountPaid back to totalFee
        const existing = await prisma.feePayment.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ error: 'Record not found' });

        const updated = await prisma.feePayment.update({
            where: { id },
            data: {
                status: 'APPROVED',
                discount: 0,
                amountPaid: existing.totalFee || 0, // Reset to full amount
                discountReason: 'Discount Rejected - Full Paid'
            }
        });

        res.json({ success: true, data: updated });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to finalize full payment' });
    }
});

// Get Fee History for Student
router.get('/history/:studentId', async (req, res) => {
    try {
        const { studentId } = req.params;
        const history = await prisma.feePayment.findMany({
            where: { studentId },
            orderBy: { paymentDate: 'desc' }
        });
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

// Get all fee history (Optional: Filter by student or role)
router.get('/', async (req, res) => {
    try {
        const history = await prisma.feePayment.findMany({
            orderBy: { paymentDate: 'desc' },
            include: {
                student: {
                    include: {
                        user: true,
                        class: true
                    }
                }
            },
            take: 100 // Limit for performance
        });

        // Explicitly map student name at the top level
        const formatted = history.map(p => ({
            ...p,
            studentName: p.student?.user?.name || 'N/A',
            className: p.student?.class?.name || 'N/A',
            admissionNo: p.student?.admissionNo || 'N/A'
        }));

        res.json(formatted);
    } catch (error) {
        console.error('Error fetching fee history:', error);
        res.status(500).json({ error: 'Failed' });
    }
});

// Fee Heads

router.get('/heads', async (req, res) => {
    try {
        const heads = await prisma.feeHead.findMany();
        res.json(heads);
    } catch (error) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/heads', async (req, res) => {
    try {
        const { name, type } = req.body;
        const head = await prisma.feeHead.create({ data: { name, type } });
        res.json(head);
    } catch (error: any) { 
        // Handle unique constraint error
        if (error.code === 'P2002') return res.status(400).json({ error: 'Fee Head name already exists' });
        res.status(500).json({ error: 'Failed to create fee head' }); 
    }
});

router.delete('/heads/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.feeHead.delete({ where: { id } });
        res.json({ success: true, message: 'Fee Head deleted permanently' });
    } catch (error) { 
        res.status(500).json({ error: 'Failed to delete Fee Head. It might be tied to existing payments.' }); 
    }
});

// Fee Structure
router.get('/structure', async (req, res) => {
    try {
        const structures = await prisma.class.findMany({
            select: {
                id: true,
                name: true,
                feeStructure: true,
            }
        });
        // Map to format UI expects: { className, fees: {...} }
        // Only return classes that have a defined fee structure
        res.json(structures
            .filter(s => s.feeStructure && typeof s.feeStructure === 'object' && Object.keys(s.feeStructure).length > 0)
            .map(s => ({
                id: s.id,
                className: s.name,
                fees: s.feeStructure
            })));
    } catch (error) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/structure', async (req, res) => {
    try {
        const { classId, fees } = req.body;
        const updated = await prisma.class.update({
            where: { id: classId },
            data: { feeStructure: fees }
        });
        res.json(updated);
    } catch (error) { res.status(500).json({ error: 'Failed' }); }
});

router.delete('/structure/:classId', async (req, res) => {
    try {
        const { classId } = req.params;
        await prisma.class.update({
            where: { id: classId },
            data: { feeStructure: {} }
        });
        res.json({ success: true, message: 'Fee structure deleted permanently' });
    } catch (error) { res.status(500).json({ error: 'Failed to delete fee structure' }); }
});

// Concessions
router.get('/concessions', async (req, res) => {
    try {
        const concessions = await prisma.concession.findMany({
            include: { student: { include: { user: true } } }
        });
        res.json(concessions.map(c => ({
            ...c,
            studentName: c.student?.user?.name || 'Unknown'
        })));
    } catch (error) { res.status(500).json({ error: 'Failed' }); }
});


// Real-time Reports
router.get('/reports', async (req, res) => {
    try {
        // console.log('Fetching fee reports...');
        const allPayments = await prisma.feePayment.findMany({
            where: { status: 'APPROVED' },
            include: { 
                student: { 
                    include: { 
                        class: true, 
                        user: true 
                    } 
                } 
            },
            orderBy: { paymentDate: 'desc' }
        });

        // console.log(`Found ${allPayments.length} approved payments for reports.`);

        // 1. Detailed Daily Report (Individual transactions)
        const daily = allPayments.map(p => ({
            ...p,
            date: new Date(p.paymentDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
            paidAmount: p.amountPaid, 
            studentName: p.student?.user?.name || 'Unknown',
            fatherName: p.student?.fatherName || 'N/A',
            className: p.student?.class?.name || 'Unknown',
            admissionNo: p.student?.admissionNo || 'N/A'
        }));

        // 2. Monthly Report (Based on actual payment date)
        const monthlyMap: any = {};
        allPayments.forEach(p => {
            const pDate = new Date(p.paymentDate);
            const m = pDate.toLocaleString('en-GB', { month: 'long' });
            const y = pDate.getFullYear().toString();
            const key = `${m} ${y}`;
            if(!monthlyMap[key]) monthlyMap[key] = { month: m, year: y, total: 0 };
            monthlyMap[key].total += p.amountPaid || 0;
        });
        const monthly = Object.values(monthlyMap);

        // 3. Class-wise Report
        const classMap: any = {};
        allPayments.forEach(p => {
            const className = p.student?.class?.name || 'Unknown';
            if(!classMap[className]) classMap[className] = { className: className, students: new Set(), total: 0 };
            classMap[className].students.add(p.studentId);
            classMap[className].total += p.amountPaid || 0;
        });
        const classWise = Object.values(classMap).map((c: any) => ({
            className: c.className,
            students: c.students.size,
            total: c.total
        }));

        res.json({ daily, monthly, classWise });
    } catch (error: any) {
        console.error('Report Generation Error:', error.message);
        res.status(500).json({ error: 'Failed to fetch reports', details: error.message });
    }
});

// Get single student outstanding balance
router.get('/student/:id/balance', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Fetch student profile to get previous session due
        const student = await prisma.studentProfile.findUnique({
            where: { id }
        });
        const previousDue = student?.previousSessionDue || 0;

        const payments = await prisma.feePayment.findMany({
            where: { studentId: id, status: 'APPROVED' }
        });

        let totalBilled = 0;
        let totalPaid = 0;
        let totalDiscount = 0;

        payments.forEach(p => {
            totalBilled += p.totalFee || 0;
            totalPaid += p.amountPaid || 0;
            totalDiscount += p.discount || 0;
        });

        const outstandingBalance = (totalBilled - totalPaid - totalDiscount) + previousDue;

        res.json({ 
            outstandingBalance: Math.max(0, outstandingBalance),
            previousSessionDue: previousDue,
            currentSessionBalance: outstandingBalance - previousDue
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to calculate balance' });
    }
});

// Get global list of pending fees
router.get('/due-list', async (req, res) => {
    try {
        // 1. Get all base data
        const students = await prisma.studentProfile.findMany({
            include: { user: true, class: true }
        });
        const classes = await prisma.class.findMany();
        const feeHeads = await prisma.feeHead.findMany();
        const allPayments = await prisma.feePayment.findMany({
            where: { status: 'APPROVED' }
        });

        // 2. Determine elapsed months (Session starts in April)
        const sessionStartMonth = 3; // April (0-indexed is 3)
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth();
        
        const elapsedMonths = 12;

        // 3. Process each student
        const dueList = students.map(student => {
            if (!student.user || !student.class) return null;

            const structure: any = student.class.feeStructure || {};
            
            // Calculate Expected Fees for this student
            let expectedMonthly = 0;
            let expectedOneTime = 0;

            feeHeads.forEach(head => {
                const amount = Number(structure[head.name] || 0);
                if (amount > 0) {
                    if (head.type === 'Monthly') {
                        expectedMonthly += (amount * elapsedMonths);
                    } else {
                        expectedOneTime += amount;
                    }
                }
            });

            // Calculate Paid Fees
            const studentPayments = allPayments.filter(p => p.studentId === student.id);
            const totalPaid = studentPayments.reduce((sum, p) => sum + (p.amountPaid || 0) + (p.discount || 0), 0);
            
            // Actual months that have an APPROVED payment
            const paidMonths: string[] = [...new Set(
                studentPayments.map(p => p.month).filter((m): m is string => !!m)
            )];

            // Detailed Pending
            const totalExpected = expectedMonthly + expectedOneTime;
            const netPending = (totalExpected - totalPaid) + (student.previousSessionDue || 0);

            // Calculate Monthly Fee Amount
            let monthlyFeeAmountValue = 0;
            feeHeads.forEach(head => {
                if (head.type === 'Monthly') {
                    monthlyFeeAmountValue += Number(structure[head.name] || 0);
                }
            });

            // Current Month Breakdown
            const currentMonthExpected = monthlyFeeAmountValue;
            const previousMonthsExpected = (monthlyFeeAmountValue * (elapsedMonths - 1)) + expectedOneTime;
            const paidTowardsCurrentMonth = Math.max(0, totalPaid - previousMonthsExpected);
            const currentMonthPaid = Math.min(currentMonthExpected, paidTowardsCurrentMonth);
            const currentMonthPending = currentMonthExpected - currentMonthPaid;

            // Pending Months List
            const allMonths = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];
            const pendingMonths: string[] = [];
            for (let i = 0; i < elapsedMonths; i++) {
                const cumulativeExpected = expectedOneTime + (monthlyFeeAmountValue * (i + 1));
                if (totalPaid < cumulativeExpected) {
                    pendingMonths.push(allMonths[i]);
                }
            }

            // Determine if One-time is pending
            const isOneTimePending = totalPaid < expectedOneTime;
            const isMonthlyPending = totalPaid < (expectedOneTime + expectedMonthly);
            
            // DEBUG LOGGING - REMOVED TO PREVENT TERMINAL FLOODING

            // Month-wise Paid Breakdown
            const monthWisePaid: { [key: string]: number } = {};
            studentPayments.forEach(p => {
                if (p.month && allMonths.includes(p.month)) {
                    monthWisePaid[p.month] = (monthWisePaid[p.month] || 0) + (p.amountPaid || 0) + (p.discount || 0);
                }
            });

            if (netPending <= 0) return null;

            return {
                id: student.id,
                studentName: student.user.name,
                fatherName: student.fatherName || 'N/A',
                className: student.class?.name || 'Unassigned',
                admissionNo: student.admissionNo,
                isRT: student.isRT || false,
                totalExpected,
                totalPaid,
                pending: netPending,
                currentMonthExpected,
                currentMonthPaid,
                currentMonthPending,
                pendingMonths,
                monthlyPending: (expectedMonthly + expectedOneTime > totalPaid) ? (totalExpected - totalPaid) : 0,
                oneTimePending: (totalPaid < expectedOneTime) ? (expectedOneTime - totalPaid) : 0,
                expectedOneTime,
                monthWisePaid,
                previousSessionDue: student.previousSessionDue || 0,
                monthlyFeeAmount: monthlyFeeAmountValue,
                paidMonths,
            };
        }).filter(Boolean);

        res.json(dueList);
    } catch (error) {
        console.error('Due List Error:', error);
        res.status(500).json({ error: 'Failed to fetch generative due list' });
    }
});

// Update Fee Head
router.put('/heads/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, type } = req.body;
        const updated = await prisma.feeHead.update({
            where: { id },
            data: { name, type }
        });
        res.json(updated);
    } catch (error: any) {
        if (error.code === 'P2002') return res.status(400).json({ error: 'Fee Head name already exists' });
        res.status(500).json({ error: 'Failed to update fee head' });
    }
});

// Import Previous Session Dues (Temporary Tool)
router.post('/import-previous-due', async (req, res) => {
    try {
        const { data } = req.body; // Array of { studentName, fatherName, amount }
        
        if (!Array.isArray(data)) {
            return res.status(400).json({ error: 'Invalid data format. Expected an array.' });
        }

        const report = {
            total: data.length,
            matched: 0,
            unmatched: 0,
            details: [] as any[]
        };

        for (const item of data) {
            const { studentName, fatherName, amount } = item;
            
            if (!studentName || !fatherName) {
                report.unmatched++;
                report.details.push({ studentName, fatherName, status: 'Invalid Data', amount });
                continue;
            }

            // Search for student
            const students = await prisma.studentProfile.findMany({
                where: {
                    fatherName: { equals: fatherName.trim(), mode: 'insensitive' },
                    user: {
                        name: { equals: studentName.trim(), mode: 'insensitive' }
                    }
                }
            });

            if (students.length === 1) {
                // Exact match
                await prisma.studentProfile.update({
                    where: { id: students[0].id },
                    data: { previousSessionDue: parseFloat(amount) }
                });
                report.matched++;
                report.details.push({ studentName, fatherName, status: 'Matched', amount });
            } else if (students.length > 1) {
                // Multiple matches (ambiguous)
                report.unmatched++;
                report.details.push({ studentName, fatherName, status: 'Ambiguous', amount });
            } else {
                // No match
                report.unmatched++;
                report.details.push({ studentName, fatherName, status: 'Not Found', amount });
            }
        }

        res.json({ success: true, report });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to import data' });
    }
});

// Delete All Fee Payments (Reset History)
router.delete('/all', async (req, res) => {
    try {
        await prisma.feePayment.deleteMany();
        res.json({ success: true, message: 'All fee records deleted. System reset to RCP001.' });
    } catch (error) {
        console.error('Reset Error:', error);
        res.status(500).json({ error: 'Failed to reset fee records' });
    }
});

// Delete Fee Payment
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.feePayment.delete({ where: { id } });
        res.json({ success: true, message: 'Fee record deleted successfully' });
    } catch (error) {
        console.error('Delete Error:', error);
        res.status(500).json({ error: 'Failed to delete fee record. It might not exist.' });
    }
});

// Get Transport Due List
router.get('/transport-due-list', async (req, res) => {
    try {
        const allPayments = await prisma.feePayment.findMany({
            where: { 
                status: 'APPROVED', 
                OR: [
                    { feeHead: { contains: 'Transport', mode: 'insensitive' } },
                    { feeHead: { contains: 'Bus', mode: 'insensitive' } }
                ]
            }
        });

        const transportStudentIdsFromPayments = [...new Set(allPayments.map(p => p.studentId))];

        const students = await prisma.studentProfile.findMany({
            where: { 
                OR: [
                    { transportStopId: { not: null } },
                    { id: { in: transportStudentIdsFromPayments } }
                ]
            },
            include: { user: true, class: true, transportStop: true }
        });

        const sessionStartMonth = 3; // April
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        
        const elapsedMonths = 12;

        const dueList = students.map(student => {
            const studentPayments = allPayments.filter(p => p.studentId === student.id);
            
            let monthlyFare = student.transportStop?.busFare || 0;
            let stopName = student.transportStop?.name || 'N/A';
            let totalPaid = 0;

            const paidMonths: string[] = [];

            studentPayments.forEach(p => {
                let paymentTransportAmount = 0;
                let isYearly = false;
                
                if (p.feeHead) {
                    const parts = p.feeHead.split('==>');
                    
                    // Extract months from the left side of ==>
                    if (parts.length > 1) {
                        const mths = parts[0].split(',').map((m: string) => m.trim());
                        paidMonths.push(...mths);
                        
                        const heads = parts[1].split('||');
                        const transportHead = heads.find((h: string) => h.toLowerCase().includes('transport') || h.toLowerCase().includes('bus'));
                        if (transportHead) {
                            if (transportHead.toLowerCase().includes('yearly')) {
                                isYearly = true;
                            }
                            const match = transportHead.match(/(?:Transport|Bus)\s*(?:\((.*?)\))?(?:\s*\(Yearly\))?:\s*(\d+)/i);
                            if (match) {
                                paymentTransportAmount = Number(match[2]);
                                if (!student.transportStopId) {
                                    stopName = match[1] ? match[1].trim() : 'Custom Transport';
                                    monthlyFare = isYearly ? paymentTransportAmount / 12 : (paymentTransportAmount / mths.length);
                                }
                            } else {
                                const fallbackMatch = transportHead.split(':');
                                if (fallbackMatch.length > 1) {
                                    paymentTransportAmount = Number(fallbackMatch[1].trim());
                                    if (!student.transportStopId) monthlyFare = paymentTransportAmount / mths.length;
                                }
                            }
                        }
                    } else if (p.feeHead.toLowerCase().includes('transport') || p.feeHead.toLowerCase().includes('bus')) {
                         paymentTransportAmount = p.amountPaid || 0;
                         if (p.month) paidMonths.push(...p.month.split(',').map((m: string) => m.trim()));
                    }
                }
                
                totalPaid += paymentTransportAmount;
            });

            const uniquePaidMonths = [...new Set(paidMonths)];
            const expectedTotal = monthlyFare * elapsedMonths;
            const pending = expectedTotal - totalPaid;

            if (monthlyFare === 0 && totalPaid === 0) return null;

            return {
                id: student.id,
                studentName: student.user?.name || 'Unknown',
                fatherName: student.fatherName || 'N/A',
                className: student.class?.name || 'N/A',
                stopName,
                monthlyFare: Math.round(monthlyFare),
                isRT: student.isRT || false,
                expectedTotal: Math.round(expectedTotal),
                totalPaid: Math.round(totalPaid),
                pending: Math.max(0, Math.round(pending)),
                paidMonths: uniquePaidMonths
            };
        }).filter(Boolean);

        res.json(dueList);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch transport dues' });
    }
});

export default router;


