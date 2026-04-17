import express from 'express';
import prisma from '../lib/prisma';

const router = express.Router();

// Attendance
router.post('/attendance', async (req, res) => {
    try {
        const { records, date } = req.body;
        const attendanceDate = new Date(date);
        const startOfDay = new Date(attendanceDate.setHours(0, 0, 0, 0));
        const endOfDay = new Date(attendanceDate.setHours(23, 59, 59, 999));

        if (!records || records.length === 0) {
            return res.status(400).json({ error: 'No records provided' });
        }

        const studentIds = records.map((r: any) => r.studentId);

        // Check if attendance is already marked for these students on this date
        const existingRecords = await prisma.attendance.findMany({
            where: {
                studentId: { in: studentIds },
                date: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            }
        });

        if (existingRecords.length > 0) {
            return res.status(400).json({ error: 'Attendance has already been marked for this date and cannot be modified.' });
        }

        // Proceed to mark attendance
        const created = await Promise.all(records.map((rec: any) => 
            prisma.attendance.create({
                data: {
                    studentId: rec.studentId,
                    status: rec.status,
                    date: new Date(date)
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
        const { authorId } = req.query;
        const where: any = {};
        if (authorId) where.authorId = String(authorId);

        const notices = await prisma.notice.findMany({ 
            where,
            orderBy: { date: 'desc' } 
        });
        
        // Fetch classes to map Class IDs to Names
        const classes = await prisma.class.findMany();
        const classMap = new Map();
        classes.forEach(c => classMap.set(c.id, c.name));

        const mappedNotices = notices.map(notice => {
            let className = notice.class;
            if (notice.class && notice.class.length === 24) {
                className = classMap.get(notice.class) || notice.class;
            }
            return {
                ...notice,
                className
            };
        });

        res.json(mappedNotices);
    } catch (error) { res.status(500).json({ error: 'Failed to fetch notices' }); }
});

router.post('/notices', async (req, res) => {
    try {
        const { title, message, targetClass, section, postedBy, authorId } = req.body;
        const notice = await prisma.notice.create({
            data: { 
                title, 
                message, 
                class: targetClass, 
                section, 
                postedBy,
                authorId,
                date: new Date()
            }
        });

        // Add className dynamically for the immediate response
        let className = targetClass;
        if (targetClass && targetClass.length === 24) {
            const classObj = await prisma.class.findUnique({ where: { id: targetClass }});
            if (classObj) className = classObj.name;
        }

        res.json({ ...notice, className });
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
                },
                teacherProfile: true
            }
        });
        if (!fullUser) return res.status(404).json({ error: 'User not found' });
        
        res.json({
            id: fullUser.id,
            email: fullUser.email,
            name: fullUser.name,
            role: fullUser.role, 
            studentInfo: fullUser.studentProfile,
            teacherInfo: fullUser.teacherProfile
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
