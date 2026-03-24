import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Get Next Receipt Number
router.get('/next-receipt', async (req, res) => {
    try {
        const count = await prisma.feePayment.count();
        const nextReceiptNo = 'RCP' + String(count + 1).padStart(3, '0');
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

        const count = await prisma.feePayment.count();
        const generatedReceiptNo = 'RCP' + String(count + 1).padStart(3, '0');

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
            studentName: p.student.user.name,
            className: p.student.class.name
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
                approvedBy
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
        const { approvedBy } = req.body; // Actually rejectedBy but we use the same field for simplicity or add one

        const updated = await prisma.feePayment.update({
            where: { id },
            data: {
                status: 'REJECTED',
                approvedBy
            }
        });

        res.json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ error: 'Failed to reject fee' });
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
            take: 100 // Limit for performance
        });
        res.json(history);
    } catch (error) {
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

export default router;


