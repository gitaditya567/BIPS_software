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
            feeHead, paymentMode, month, year, submittedBy
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
        console.log('Fetching fee reports...');
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

        console.log(`Found ${allPayments.length} approved payments for reports.`);

        // 1. Detailed Daily Report (Individual transactions)
        const daily = allPayments.map(p => ({
            ...p,
            date: new Date(p.paymentDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
            paidAmount: p.amountPaid, 
            studentName: p.student?.user?.name || 'Unknown',
            className: p.student?.class?.name || 'Unknown',
            admissionNo: p.student?.admissionNo || 'N/A'
        }));

        // 2. Monthly Report
        const monthlyMap: any = {};
        allPayments.forEach(p => {
            const m = p.month || 'Other';
            const y = p.year || 'N/A';
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

        const outstandingBalance = totalBilled - totalPaid - totalDiscount;

        res.json({ outstandingBalance: Math.max(0, outstandingBalance) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to calculate balance' });
    }
});

// Get global list of pending fees
router.get('/due-list', async (req, res) => {
    try {
        const payments = await prisma.feePayment.findMany({
            where: { status: 'APPROVED' },
            include: { student: { include: { user: true, class: true } } }
        });

        const studentMap: any = {};

        payments.forEach(p => {
            if (!p.student || !p.student.user) return;
            const sid = p.studentId;
            if (!studentMap[sid]) {
                studentMap[sid] = {
                    id: sid,
                    studentName: p.student.user.name,
                    className: p.student.class?.name || 'Unknown',
                    admissionNo: p.student.admissionNo,
                    totalBilled: 0,
                    totalPaid: 0,
                    totalDiscount: 0
                };
            }
            studentMap[sid].totalBilled += p.totalFee || 0;
            studentMap[sid].totalPaid += p.amountPaid || 0;
            studentMap[sid].totalDiscount += p.discount || 0;
        });

        const dueList = Object.values(studentMap)
            .map((s: any) => ({
                id: s.id,
                studentName: s.studentName,
                className: s.className,
                admissionNo: s.admissionNo,
                total: s.totalBilled,
                paid: s.totalPaid + s.totalDiscount,
                pending: s.totalBilled - s.totalPaid - s.totalDiscount
            }))
            .filter((s: any) => s.pending > 0);

        res.json(dueList);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch due list' });
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

export default router;


