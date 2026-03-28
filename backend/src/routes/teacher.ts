import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Get classes assigned to a teacher
router.get('/:teacherId/classes', async (req, res) => {
    try {
        const { teacherId } = req.params;
        
        // Find teacher profile to get the internal ID
        const teacherProfile = await prisma.teacherProfile.findUnique({
            where: { userId: teacherId }
        });
        
        if (!teacherProfile) {
            return res.status(404).json({ error: 'Teacher not found' });
        }

        // Get classes where this teacher is assigned via subjects
        const subjects = await prisma.subject.findMany({
            where: { teacherId: teacherProfile.id },
            include: {
                class: {
                    include: {
                        sections: true,
                        students: {
                            where: { // Only active students or current year if needed
                            }
                        }
                    }
                }
            }
        });

        // Format the data for the frontend
        const classesMap = new Map();
        
        subjects.forEach(sub => {
            if (sub.class) {
                const classData = sub.class;
                
                if (sub.sectionId) {
                    const targetSections = classData.sections.filter(sec => sec.id === sub.sectionId);
                    targetSections.forEach(sec => {
                        const uniqueKey = `${classData.id}-${sec.id}`; // Key by Class+Section only to prevent subject duplicates
                        if (!classesMap.has(uniqueKey)) {
                            const studentCount = classData.students.filter(s => s.sectionId === sec.id).length;
                            classesMap.set(uniqueKey, {
                                id: uniqueKey,
                                grade: classData.name,
                                section: sec.name,
                                subject: sub.name, // Will just show the first subject encountered
                                studentsCount: studentCount,
                                classId: classData.id,
                                sectionId: sec.id,
                                subjectId: sub.id
                            });
                        } else {
                            // Optionally append other subjects to the display name
                            const existing = classesMap.get(uniqueKey);
                            if (!existing.subject.includes(sub.name)) {
                                existing.subject += `, ${sub.name}`;
                            }
                        }
                    });
                } else {
                    const uniqueKey = `${classData.id}-all`;
                    if (!classesMap.has(uniqueKey)) {
                        classesMap.set(uniqueKey, {
                            id: uniqueKey,
                            grade: classData.name,
                            section: 'All',
                            subject: sub.name,
                            studentsCount: classData.students.length,
                            classId: classData.id,
                            sectionId: 'all',
                            subjectId: sub.id
                        });
                    } else {
                        const existing = classesMap.get(uniqueKey);
                        if (!existing.subject.includes(sub.name)) {
                            existing.subject += `, ${sub.name}`;
                        }
                    }
                }
            }
        });

        res.json(Array.from(classesMap.values()));
    } catch (error) {
        console.error('Error fetching teacher classes:', error);
        res.status(500).json({ error: 'Failed to fetch assigned classes' });
    }
});

router.get('/students', async (req, res) => {
    try {
        const { classId, sectionId, date } = req.query;
        
        const whereClause: any = { classId: String(classId) };
        if (sectionId && sectionId !== 'null' && sectionId !== 'undefined' && sectionId !== 'all') {
            whereClause.sectionId = String(sectionId);
        }

        const students = await prisma.studentProfile.findMany({
            where: whereClause,
            include: { user: true },
            orderBy: { rollNumber: 'asc' }
        });

        // If a date is provided, we fetch existing attendances for that day
        let existingAttendances: any[] = [];
        if (date) {
            const queryDate = new Date(String(date));
            // Ensure we match the start and end of that specific day precisely
            const startOfDay = new Date(queryDate.setHours(0, 0, 0, 0));
            const endOfDay = new Date(queryDate.setHours(23, 59, 59, 999));

            existingAttendances = await prisma.attendance.findMany({
                where: {
                    studentId: { in: students.map(s => s.id) },
                    date: {
                        gte: startOfDay,
                        lte: endOfDay
                    }
                }
            });
        }

        const formattedStudents = students.map(s => {
            const attendanceRecord = existingAttendances.find(a => a.studentId === s.id);
            return {
                id: s.id,
                rollNo: s.rollNumber || 'N/A',
                name: s.user.name,
                status: 'Active',
                existingAttendance: attendanceRecord ? attendanceRecord.status : null
            };
        });

        res.json(formattedStudents);
    } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({ error: 'Failed to fetch students' });
    }
});

// Get pending fees for students in a specific class and section
router.get('/students/fees', async (req, res) => {
    try {
        const { classId, sectionId } = req.query;
        
        if (!classId || !sectionId) {
            return res.status(400).json({ error: 'classId and sectionId are required' });
        }

        // Fetch students in this class/section
        const students = await prisma.studentProfile.findMany({
            where: { 
                classId: String(classId),
                sectionId: String(sectionId)
            },
            include: {
                user: true,
                fees: true // Include all associated fees
            },
            orderBy: {
                rollNumber: 'asc'
            }
        });

        const feeData = students.map(student => {
            // Calculate total fees and paid fees for this student
            let totalFee = 0;
            let paid = 0;

            student.fees.forEach(fee => {
                totalFee += fee.totalFee || 0;
                if (fee.status === 'APPROVED') {
                    paid += fee.amountPaid || 0;
                }
            });

            // For now, to ensure dummy functionality transforms into real data seamlessly,
            // if no real fee structure exists, we provide a placeholder or actual calculated data.
            // If they have no fees recorded at all, we can fallback to 0 or a placeholder.
            return {
                rollNo: student.rollNumber || 'N/A',
                name: student.user.name,
                totalFee: totalFee > 0 ? totalFee : 0, 
                paid: paid,
                pending: (totalFee - paid) > 0 ? (totalFee - paid) : 0
            };
        });

        res.json(feeData);
    } catch (error) {
        console.error('Error fetching student fees:', error);
        res.status(500).json({ error: 'Failed to fetch student fees' });
    }
});

// Get personalized dashboard stats for the teacher
router.get('/:teacherId/dashboard-stats', async (req, res) => {
    try {
        const { teacherId } = req.params;

        // Fetch teacher internal profile
        const teacherProfile = await prisma.teacherProfile.findUnique({
            where: { userId: teacherId }
        });

        if (!teacherProfile) {
            return res.status(404).json({ error: 'Teacher not found' });
        }

        // 1. Classes Assigned & Subjects taught by Teacher
        const subjects = await prisma.subject.findMany({
            where: { teacherId: teacherProfile.id },
            include: {
                class: {
                    include: {
                        sections: true,
                        students: true
                    }
                }
            }
        });

        const uniqueClasses = new Set<string>();
        let myStudentsCount = 0;
        const processedClassSections = new Set<string>();

        subjects.forEach(sub => {
            if (sub.class) {
                sub.class.sections.forEach(sec => {
                    const uniqueSectionKey = `${sub.classId}-${sec.id}`;
                    if (!processedClassSections.has(uniqueSectionKey)) {
                        uniqueClasses.add(`${sub.classId}`);
                        processedClassSections.add(uniqueSectionKey);
                        // Count students for this precise class/section
                        const studentsCount = sub.class.students.filter(s => s.sectionId === sec.id).length;
                        myStudentsCount += studentsCount;
                    }
                });
            }
        });

        // 2. Attendance Marked Today
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        // All attendances recorded today for the students taught by this teacher
        // (For simplicity, just matching any attendances marked by this teacher or for their students)
        // Let's count how many students in their classes actually have an attendance record today
        let totalRecordsExpected = myStudentsCount; 
        
        // Find all student IDs that belong to the teacher's classes/sections
        const studentIds: string[] = [];
         subjects.forEach(sub => {
            if (sub.class) {
                sub.class.students.forEach(stu => {
                    const uniqueSectionKey = `${sub.classId}-${stu.sectionId}`;
                    if (processedClassSections.has(uniqueSectionKey)) {
                        studentIds.push(stu.id);
                    }
                });
            }
        });

        const attendancesMarkedToday = await prisma.attendance.count({
            where: {
                studentId: { in: studentIds },
                date: { gte: startOfDay }
            }
        });

        // 3. Notices for teacher
        const notices = await prisma.notice.findMany({
            orderBy: { date: 'desc' },
            take: 4
        });

        res.json({
            stats: {
                myStudents: myStudentsCount,
                classesAssigned: processedClassSections.size,
                pendingResults: '0', // Placeholder or specific logic
                attendanceMarked: `${attendancesMarkedToday}/${myStudentsCount}`
            },
            recentActivities: notices.map(n => ({
                id: n.id,
                type: 'Notice',
                user: n.postedBy || 'Admin',
                action: n.title,
                time: n.date.toISOString(),
                iconName: 'Bell',
                color: '#ed8936'
            }))
        });

    } catch (error) {
        console.error('Error fetching teacher stats:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
});

export default router;
