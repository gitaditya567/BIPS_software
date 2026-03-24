import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Attendance
router.post('/attendance', async (req, res) => {
    try {
        const { records, date } = req.body;
        // In this implementation, we simply create individual attendance records
        const attendanceDate = new Date(date);
        
        const created = await Promise.all(records.map((rec: any) => 
            prisma.attendance.create({
                data: {
                    studentId: rec.studentId,
                    status: rec.status,
                    date: attendanceDate
                }
            })
        ));
        
        res.json({ success: true, count: created.length });
    } catch (error) {
        res.status(500).json({ error: 'Failed to mark attendance' });
    }
});

router.get('/attendance/:studentId', async (req, res) => {
    try {
        const { studentId } = req.params;
        const records = await prisma.attendance.findMany({
            where: { studentId },
            orderBy: { date: 'desc' },
            take: 365 // Last year's records
        });
        res.json(records);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch attendance' });
    }
});

// Notices
router.get('/notices', async (req, res) => {
    try {
        const notices = await prisma.notice.findMany({ orderBy: { date: 'desc' } });
        res.json(notices);
    } catch (error) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/notices', async (req, res) => {
    try {
        const { title, message, targetClass, section, postedBy } = req.body;
        const notice = await prisma.notice.create({
            data: { 
                title, 
                message, 
                class: targetClass, 
                section, 
                postedBy,
                date: new Date()
            }
        });
        res.json(notice);
    } catch (error) { res.status(500).json({ error: 'Failed' }); }
});

router.delete('/notices/:id', async (req, res) => {
    try {
        await prisma.notice.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/user/:id', async (req, res) => {
    try {
        const fullUser = await prisma.user.findUnique({
            where: { id: req.params.id },
            include: {
                studentProfile: {
                    include: { user: true, class: true, section: true }
                }
            }
        });
        if (!fullUser) return res.status(404).json({ error: 'User not found' });
        
        res.json({
            id: fullUser.id,
            email: fullUser.email,
            name: fullUser.name,
            role: fullUser.role, 
            studentInfo: fullUser.studentProfile
        });
    } catch (error) { res.status(500).json({ error: 'Failed to fetch user' }); }
});

router.get('/dashboard-stats/student/:studentId', async (req, res) => {
    try {
        const { studentId } = req.params;
        const student = await prisma.studentProfile.findUnique({ where: { id: studentId } });
        if (!student) return res.status(404).json({ error: 'Student not found' });

        // 1. Attendance Percentage
        const totalAttendance = await prisma.attendance.count({ where: { studentId } });
        const presentAttendance = await prisma.attendance.count({ where: { studentId, status: 'Present' } });
        const attendancePercentage = totalAttendance > 0 ? Math.round((presentAttendance / totalAttendance) * 100) : 0;

        // 2. Fee Dues (Pending Fees amount sum)
        const pendingFees = await prisma.feePayment.findMany({ where: { studentId, status: 'PENDING' } });
        const totalPendingFee = pendingFees.reduce((sum, fee) => sum + (fee.totalFee || 0), 0);

        // 3. Recent Activity (Notices for this class)
        const notices = await prisma.notice.findMany({
            where: {
                OR: [
                    { class: String(student.classId) },
                    { class: 'ALL' },
                    { class: 'All' },
                    { class: '' } 
                ]
            },
            orderBy: { date: 'desc' },
            take: 5
        });

        res.json({
            stats: {
                attendance: attendancePercentage + '%',
                feeDues: '₹' + totalPendingFee,
                assignments: '0', // Placeholder
                exams: '0' // Placeholder
            },
            recentActivities: notices.map(n => ({
                id: n.id,
                type: 'Notice',
                title: n.title,
                date: new Date(n.date).toLocaleString(),
                location: n.message.substring(0, 50) + '...'
            }))
        });

    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch student dashboard stats' });
    }
});

export default router;
