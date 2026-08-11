import express from 'express';
import { Role } from '@prisma/client';
import prisma from '../lib/prisma';
import bcrypt from 'bcrypt';
import { getExpectedFeeAmount } from '../lib/feeUtils';

const router = express.Router();

import { getCache, setCache, invalidateCache } from '../lib/cache';

// Add Class
router.post('/classes', async (req, res) => {
    try {
        const { name } = req.body;
        const newClass = await prisma.class.create({ data: { name } });
        res.json(newClass);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create class' });
    }
});

// List Classes
router.get('/classes', async (req, res) => {
    try {
        const classes = await prisma.class.findMany({ include: { sections: true } });
        res.json(classes);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch classes' });
    }
});

// Add Section to Class
router.post('/classes/:id/sections', async (req, res) => {
    try {
        const { name } = req.body;
        const classId = req.params.id;
        const newSection = await prisma.section.create({ data: { name, classId } });
        res.json(newSection);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create section' });
    }
});

// Get Students
router.get('/students', async (req, res) => {
    try {
        let sessionQuery = req.query.session as string;
        if (!sessionQuery) {
            const defSession = await prisma.session.findFirst({ where: { isDefault: true } });
            sessionQuery = defSession?.name || '2024-2025';
        }

        const cacheKey = `students:${sessionQuery}`;
        const cached = getCache(cacheKey);
        if (cached) return res.json(cached);

        const getAlternativeSessionName = (session: string): string => {
            const parts = session.split('-');
            if (parts.length === 2) {
                const start = parts[0];
                const end = parts[1];
                if (end.length === 4) {
                    return `${start}-${end.slice(2)}`;
                } else if (end.length === 2) {
                    return `${start}-20${end}`;
                }
            }
            return session;
        };

        const altSession = getAlternativeSessionName(sessionQuery);

        const students: any[] = await prisma.studentProfile.findMany({
            where: {
                ...(sessionQuery && sessionQuery !== 'All' ? {
                    OR: [
                        { academicYear: sessionQuery },
                        { academicYear: altSession }
                    ]
                } : {})
            },
            select: {
                id: true,
                admissionNo: true,
                studentId: true,
                rollNumber: true,
                status: true,
                academicYear: true,
                dateOfBirth: true,
                gender: true,
                bloodGroup: true,
                category: true,
                religion: true,
                nationality: true,
                aadhaarNumber: true,
                photo: true,
                medium: true,
                house: true,
                admissionDate: true,
                classId: true,
                sectionId: true,
                parentId: true,
                isRT: true,
                isThirdChild: true,
                isOldStudent: true,
                transportStopId: true,
                previousSessionDue: true,
                fatherName: true,
                fatherMobile: true,
                fatherOccupation: true,
                fatherQualification: true,
                fatherEmail: true,
                motherName: true,
                motherMobile: true,
                motherOccupation: true,
                motherQualification: true,
                prevSchoolName: true,
                prevClass: true,
                prevSchoolAddress: true,
                prevMarks: true,
                leavingReason: true,
                siblingInfo: true,
                sessionId: true,
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        address: true
                    }
                },
                class: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                section: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });
        const result = students.map((s: any) => ({
            ...s,
            name: s.user.name,
            email: s.user.email,
            phone: s.user.phone,
            address: s.user.address,
            className: s.class?.name || 'N/A',
            sectionName: s.section?.name || 'N/A',
            status: s.status || 'Active'
        }));
        setCache(cacheKey, result, 60_000);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch students' });
    }
});

// Get Teachers
router.get('/teachers', async (req, res) => {
    try {
        const teachers = await prisma.teacherProfile.findMany({
            include: { user: true, subjects: true, classTeacherOf: true }
        });
        
        // Map to UI friendly format
        const formatted = teachers.map(t => ({
            id: t.id,
            teacherId: t.employeeId,
            name: t.user.name,
            email: t.user.email.endsWith('@bips.local') ? 'N/A' : t.user.email,
            mobile: t.user.phone,
            subject: t.mainSubject || ((t.subjects && t.subjects.length > 0) ? t.subjects[0].name : 'N/A'),
            employeeType: t.employeeType,
            status: 'Active', // or based on user status if any
            photo: t.photo,
            gender: t.gender,
            dob: t.dateOfBirth,
            aadhaar: t.aadhaarNumber,
            qualification: t.qualification,
            experience: t.experience,
            joiningDate: t.joiningDate || new Date(),
            salary: t.salary,
            address: t.user.address,
            assignClass: t.classTeacherOf && t.classTeacherOf.length > 0 ? t.classTeacherOf[0].id : '',
            assignSubject: t.mainSubject || ((t.subjects && t.subjects.length > 0) ? t.subjects[0].name : '')
        }));

        res.json(formatted);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch teachers' });
    }
});

// Add Teacher
router.post('/teachers', async (req, res) => {
    try {
        const {
            teacherName, gender, dob, photo, mobile, email, aadhaar,
            qualification, subject, experience, joiningDate, salary, employeeType,
            address, city, stateLocation, pincode, username, password,
            assignClass, assignSection, assignSubject
        } = req.body;

        // Generate TCH ID first to ensure uniqueness
        const year = new Date().getFullYear();
        const latestTeacher = await prisma.teacherProfile.findFirst({
            where: { employeeId: { startsWith: `TCH-${year}` } },
            orderBy: { employeeId: 'desc' }
        });
        
        let nextCount = 1;
        if (latestTeacher) {
            const lastIdParts = latestTeacher.employeeId.split('-');
            const lastCount = parseInt(lastIdParts[2]);
            if (!isNaN(lastCount)) nextCount = lastCount + 1;
        }
        
        const employeeId = `TCH-${year}-${String(nextCount).padStart(4, '0')}`;

        const loginEmail = username || email || `${employeeId}@bips.local`;

        // Base search or validation
        const existing = await prisma.user.findUnique({ where: { email : loginEmail } });
        if (existing) return res.status(400).json({ error: 'User with this email or username already exists' });

        const hashedPassword = await bcrypt.hash(password || '123456', 10);
        
        const fullAddress = `${address || ''}, ${city || ''}, ${stateLocation || ''} - ${pincode || ''}`.trim();

        const newTeacher = await prisma.user.create({
            data: {
                name: teacherName,
                email: loginEmail,
                password: hashedPassword,
                phone: mobile,
                role: Role.TEACHER,
                address: fullAddress,
                teacherProfile: {
                    create: {
                        employeeId,
                        gender,
                        dateOfBirth: dob,
                        photo,
                        aadhaarNumber: aadhaar,
                        qualification,
                        experience,
                        joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
                        salary,
                        employeeType,
                        mainSubject: assignSubject || subject
                    }
                }
            },
            include: { teacherProfile: true }
        });

        const profileId = newTeacher.teacherProfile?.id;

        // Process Assignment if provided
        if (profileId && assignClass) {
            try {
                let classRecord = null;
                // Safely handle both ObjectId and Class Name
                if (assignClass.length === 24) {
                    classRecord = await prisma.class.findUnique({ where: { id: assignClass } });
                }
                
                if (!classRecord && assignClass.trim() !== '') {
                    classRecord = await prisma.class.findFirst({
                        where: { name: assignClass }
                    });
                }

                if (classRecord) {
                    // Update Class Teacher
                    await prisma.class.update({
                        where: { id: classRecord.id },
                        data: { classTeacherId: profileId }
                    });

                    // Create/Assign Subject
                    if (assignSubject) {
                        let sectionRecord = null;
                        if (assignSection && assignSection.trim() !== '') {
                            sectionRecord = await prisma.section.findFirst({
                                where: { classId: classRecord.id, name: assignSection }
                            });
                        }

                        // Prevent duplicate assignment check
                        const existingSub = await prisma.subject.findFirst({
                            where: {
                                teacherId: profileId,
                                classId: classRecord.id,
                                sectionId: sectionRecord ? sectionRecord.id : null,
                                name: assignSubject
                            }
                        });

                        if (!existingSub) {
                            await prisma.subject.create({
                                data: {
                                    name: assignSubject,
                                    code: `SUB-${classRecord.name}-${assignSection || 'All'}-${assignSubject.substring(0,3).toUpperCase()}-${Date.now().toString().slice(-4)}`,
                                    classId: classRecord.id,
                                    sectionId: sectionRecord ? sectionRecord.id : null,
                                    teacherId: profileId
                                }
                            });
                        }
                    }
                }
            } catch (assignErr) {
                console.error('Failed to perform assignment during teacher registration:', assignErr);
            }
        }

        res.json(newTeacher);
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message || 'Failed to add teacher' });
    }
});

// Update Teacher
router.put('/teachers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            teacherName, gender, dob, photo, mobile, email, aadhaar,
            qualification, subject, experience, joiningDate, salary, employeeType,
            address, city, stateLocation, pincode, username, password,
            assignClass, assignSection, assignSubject
        } = req.body;

        const profile = await prisma.teacherProfile.findUnique({ where: { id } });
        if (!profile) return res.status(404).json({ error: 'Teacher not found' });

        const fullAddress = `${address || ''}, ${city || ''}, ${stateLocation || ''} - ${pincode || ''}`.trim();

        const updateData: any = {
            name: teacherName,
            phone: mobile,
            address: fullAddress
        };

        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }

        const updated = await prisma.user.update({
            where: { id: profile.userId },
            data: {
                ...updateData,
                teacherProfile: {
                    update: {
                        gender,
                        dateOfBirth: dob,
                        photo,
                        aadhaarNumber: aadhaar,
                        qualification,
                        experience,
                        joiningDate: joiningDate ? new Date(joiningDate) : undefined,
                        salary,
                        employeeType,
                        mainSubject: subject || assignSubject
                    }
                }
            },
            include: { teacherProfile: true }
        });

        // Assignment logic (Update class teacher & subject)
        if (assignClass) {
            try {
                let classRecord = null;
                if (assignClass.length === 24) {
                    classRecord = await prisma.class.findUnique({ where: { id: assignClass } });
                }
                if (!classRecord && assignClass.trim() !== '') {
                    classRecord = await prisma.class.findFirst({
                        where: { name: assignClass }
                    });
                }

                if (classRecord) {
                    await prisma.class.update({
                        where: { id: classRecord.id },
                        data: { classTeacherId: profile.id }
                    });

                    if (assignSubject) {
                        let sectionRecord = null;
                        if (assignSection && assignSection.trim() !== '') {
                            sectionRecord = await prisma.section.findFirst({
                                where: { classId: classRecord.id, name: assignSection }
                            });
                        }

                        const existingSubject = await prisma.subject.findFirst({
                            where: { 
                                teacherId: profile.id, 
                                classId: classRecord.id, 
                                name: assignSubject,
                                sectionId: sectionRecord ? sectionRecord.id : null
                            }
                        });
                        
                        if (!existingSubject) {
                            await prisma.subject.create({
                                data: {
                                    name: assignSubject,
                                    code: `SUB-${classRecord.name}-${assignSection || 'All'}-${assignSubject.substring(0,3).toUpperCase()}-${Date.now().toString().slice(-4)}`,
                                    classId: classRecord.id,
                                    sectionId: sectionRecord ? sectionRecord.id : null,
                                    teacherId: profile.id
                                }
                            });
                        }
                    }
                }
            } catch (assignErr) {
                console.error("Assignment update failed:", assignErr);
            }
        }

        res.json(updated);
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message || 'Failed to update teacher' });
    }
});

// Delete Teacher
router.delete('/teachers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const profile = await prisma.teacherProfile.findUnique({ where: { id } });
        if (profile) {
            await prisma.user.delete({ where: { id: profile.userId } });
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete' });
    }
});

// Add Student
router.post('/students', async (req, res) => {
    try {
        const {
            email, password, firstName, lastName, phone, admissionNo, classId, sectionId,
            gender, dob, bloodGroup, isRT, isThirdChild, isOldStudent, category, religion, nationality, aadhaar, address, photo,
            prevSchoolName, prevClass, prevSchoolAddress, prevMarks, transportStopId
        } = req.body;

        const name = `${firstName} ${lastName}`.trim();

        // Check if user exists
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return res.status(400).json({ error: 'Email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate Student ID (e.g., STU-YYYY-XXXX)
        const year = new Date().getFullYear();
        const latestStudent = await prisma.studentProfile.findFirst({
            where: { studentId: { startsWith: `STU-${year}` } },
            orderBy: { studentId: 'desc' }
        });

        let nextCount = 1;
        if (latestStudent && latestStudent.studentId) {
            const lastIdParts = latestStudent.studentId.split('-');
            const lastCount = parseInt(lastIdParts[2]);
            if (!isNaN(lastCount)) nextCount = lastCount + 1;
        }

        const studentId = `STU-${year}-${String(nextCount).padStart(4, '0')}`;

        // Auto-generate Admission Number if empty
        let finalAdmissionNo = admissionNo;
        if (!finalAdmissionNo || finalAdmissionNo.trim() === '') {
            const currentYearLastTwo = new Date().getFullYear().toString().slice(-2); // e.g. "26"
            const prefix = `BIPS/${currentYearLastTwo}/`;
            
            const allStudents = await prisma.studentProfile.findMany({
                where: { admissionNo: { startsWith: prefix } },
                select: { admissionNo: true }
            });
            
            let nextNum = 1;
            if (allStudents.length > 0) {
                const numbers = allStudents.map(s => {
                    const val = s.admissionNo || '';
                    const parts = val.split('/');
                    if (parts.length >= 3) {
                        const num = parseInt(parts[2]);
                        return isNaN(num) ? 0 : num;
                    }
                    return 0;
                });
                nextNum = Math.max(...numbers, 0) + 1;
            }
            finalAdmissionNo = `${prefix}${String(nextNum).padStart(3, '0')}`;
        }

        const newStudent = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                phone,
                role: Role.STUDENT,
                address,
                studentProfile: {
                    create: {
                        admissionNo: finalAdmissionNo,
                        studentId,
                        classId: classId || undefined,
                        sectionId: sectionId || undefined,
                        // @ts-ignore
                        status: req.body.status || "Active",
                        gender,
                        dateOfBirth: dob,
                        bloodGroup,
                        isRT: Boolean(isRT),
                        isThirdChild: Boolean(isThirdChild),
                        isOldStudent: Boolean(isOldStudent),
                        category,
                        religion,
                        nationality,
                        aadhaarNumber: aadhaar,
                        photo,
                        prevSchoolName,
                        prevClass,
                        prevSchoolAddress,
                        prevMarks,
                        leavingReason: req.body.leavingReason,
                        siblingInfo: req.body.siblingInfo,
                        
                        // New fields
                        academicYear: req.body.academicYear,
                        medium: req.body.medium,
                        house: req.body.house,
                        fatherName: req.body.fatherName,
                        fatherMobile: req.body.fatherMobile,
                        fatherOccupation: req.body.fatherOccupation,
                        fatherQualification: req.body.fatherQualification,
                        fatherEmail: req.body.fatherEmail,
                        motherName: req.body.motherName,
                        motherMobile: req.body.motherMobile,
                        motherOccupation: req.body.motherOccupation,
                        motherQualification: req.body.motherQualification,
                        transportStopId: transportStopId || undefined,
                    }
                }
            },
            include: { studentProfile: true }
        });

        invalidateCache('students');
        invalidateCache('dashboard');
        res.json(newStudent);
    } catch (error: any) {
        console.error('Student Creation Error Details:', {
            code: error.code,
            meta: error.meta,
            message: error.message
        });
        
        // Handle specific unique constraint errors for MongoDB
        if (error.code === 'P2002') {
            const target = JSON.stringify(error.meta?.target || '');
            let field = 'Field';
            
            if (target.includes('email')) field = 'Email';
            else if (target.includes('admissionNo')) field = 'Admission Number';
            else if (target.includes('studentId')) field = 'Student ID';
            
            return res.status(400).json({ error: `${field} already exists. Please use a unique value.` });
        }
        
        if (error.message && error.message.includes('valid ObjectId')) {
            return res.status(400).json({ error: 'Selected Class or Section is invalid. Please refresh the page.' });
        }

        res.status(500).json({ 
            error: 'Database Error: ' + (error.meta?.cause || 'Please ensure all required fields are correct and unique.')
        });
    }
});

// Update Student
router.put('/students/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            email, firstName, lastName, phone, admissionNo, classId, sectionId,
            gender, dob, bloodGroup, isRT, isThirdChild, isOldStudent, category, religion, nationality, aadhaar, address, photo,
            prevSchoolName, prevClass, prevSchoolAddress, prevMarks, password, transportStopId
        } = req.body;

        const profile = await prisma.studentProfile.findUnique({
            where: { id },
             include: { user: true }
        });

        if (!profile) return res.status(404).json({ error: 'Student not found' });

        const name = `${firstName} ${lastName}`.trim();

        // Check if email changed and is unique
        if (email && email !== profile.user.email) {
             const existing = await prisma.user.findUnique({ where: { email } });
             if (existing) {
                 return res.status(400).json({ error: 'Email already exists' });
             }
        }

        const updateData: any = {
             email,
             name,
             phone,
             address
        };

        if (password && password.trim() !== '') {
             updateData.password = await bcrypt.hash(password, 10);
        }

        await prisma.user.update({
             where: { id: profile.userId },
             data: updateData
        });

        const updatedStudent = await prisma.studentProfile.update({
            where: { id },
            data: {
                admissionNo,
                classId: (classId && classId.trim() !== '') ? classId : undefined,
                sectionId: (sectionId && sectionId.trim() !== '') ? sectionId : undefined,
                // @ts-ignore
                status: req.body.status || "Active",
                gender,
                dateOfBirth: dob,
                bloodGroup,
                isRT: Boolean(isRT),
                isThirdChild: Boolean(isThirdChild),
                isOldStudent: Boolean(isOldStudent),
                category,
                religion,
                nationality,
                aadhaarNumber: aadhaar,
                photo,
                prevSchoolName,
                prevClass,
                prevSchoolAddress,
                prevMarks,
                leavingReason: req.body.leavingReason,
                siblingInfo: req.body.siblingInfo,
                
                academicYear: req.body.academicYear,
                medium: req.body.medium,
                house: req.body.house,
                fatherName: req.body.fatherName,
                fatherMobile: req.body.fatherMobile,
                fatherOccupation: req.body.fatherOccupation,
                fatherQualification: req.body.fatherQualification,
                fatherEmail: req.body.fatherEmail,
                motherName: req.body.motherName,
                motherMobile: req.body.motherMobile,
                motherOccupation: req.body.motherOccupation,
                motherQualification: req.body.motherQualification,
                transportStopId: transportStopId || null,
            }
        });

        invalidateCache('students');
        invalidateCache('dashboard');
        res.json(updatedStudent);
    } catch (error: any) {
        console.error('Student Update Error Details:', {
            id: req.params.id,
            code: error.code,
            meta: error.meta,
            message: error.message
        });
        
        if (error.code === 'P2002') {
            const target = JSON.stringify(error.meta?.target || '');
            let field = 'Field';
            if (target.includes('admissionNo')) field = 'Admission Number';
            else if (target.includes('studentId')) field = 'Student ID';
            else if (target.includes('email')) field = 'Email';
            return res.status(400).json({ error: `${field} already exists. Please use a unique value.` });
        }
        
        if (error.message && error.message.includes('valid ObjectId')) {
            return res.status(400).json({ error: 'Selected Class or Section is invalid. Please refresh the page.' });
        }

        res.status(500).json({ 
            error: 'Database Update Error: ' + (error.meta?.cause || error.message || 'Please check all fields.')
        });
    }
});

// Promotion Route
router.post('/students/promote', async (req, res) => {
    try {
        const { studentId, newClassId, actionType } = req.body;
        // Find class to get default section (optional, or let user pick)
        const updated = await prisma.studentProfile.update({
            where: { id: studentId },
            data: { classId: newClassId }
        });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Failed to promote student' });
    }
});



// Delete Student
router.delete('/students/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // The id is likely the userId or we need to find the user first
        const profile = await prisma.studentProfile.findUnique({
            where: { id }
        });
        
        if (profile) {
            await prisma.user.delete({
                where: { id: profile.userId }
            });
        }
        invalidateCache('students');
        invalidateCache('dashboard');
        res.json({ success: true, message: 'Student deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed' });
    }
});

function isPaymentInAcademicYearLocal(p: any, academicYear: string | null): boolean {
    if (!academicYear) return true;
    const parts = academicYear.split('-');
    if (parts.length !== 2) return true;
    let startYear = parts[0].trim();
    let endYear = parts[1].trim();
    
    if (startYear.length === 2) startYear = `20${startYear}`;
    if (endYear.length === 2) endYear = `20${endYear}`;

    const month = (p.month || '').trim();
    const pYear = String(p.year || '').trim();

    if (pYear && (pYear === academicYear || pYear.startsWith(startYear) || pYear.includes(startYear) || pYear.includes(endYear))) {
        return true;
    }

    const pDate = new Date(p.paymentDate);
    const startSessionDate = new Date(parseInt(startYear), 3, 1); // April 1st
    const endSessionDate = new Date(parseInt(endYear), 2, 31, 23, 59, 59); // March 31st
    const isWithinDateRange = !isNaN(pDate.getTime()) && pDate >= startSessionDate && pDate <= endSessionDate;

    if (p.feeHead && p.feeHead.toLowerCase().includes('previous dues')) {
        return isWithinDateRange;
    }

    const springMonths = ['January', 'February', 'March'];
    const autumnMonths = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    if (springMonths.includes(month)) {
        return !pYear || pYear === endYear || pYear.includes(endYear) || isWithinDateRange;
    }
    if (autumnMonths.includes(month)) {
        return !pYear || pYear === startYear || pYear.includes(startYear) || isWithinDateRange;
    }

    return isWithinDateRange;
}

// Dashboard Stats
router.get('/dashboard/stats', async (req, res) => {
    try {
        const sessionQuery = req.query.session as string;
        const altSession = (() => {
            if (sessionQuery) {
                const parts = sessionQuery.split('-');
                if (parts.length === 2) {
                    const start = parts[0];
                    const end = parts[1];
                    if (end.length === 4) {
                        return `${start}-${end.slice(2)}`;
                    } else if (end.length === 2) {
                        return `${start}-20${end}`;
                    }
                }
            }
            return sessionQuery;
        })();

        const statsCacheKey = `dashboard:stats:${sessionQuery || 'all'}`;
        const cachedStats = getCache(statsCacheKey);
        if (cachedStats) return res.json(cachedStats);

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const [
            totalStudents,
            totalTeachers,
            allMonthFees,
            attendances,
            pendingPayments,
            newAdmissions,
            recentFees,
            recentAdmissions
        ] = await Promise.all([
            prisma.studentProfile.count({
                where: {
                    status: 'Active',
                    ...(sessionQuery && sessionQuery !== 'All' ? {
                        OR: [
                            { academicYear: sessionQuery },
                            { academicYear: altSession }
                        ]
                    } : {})
                }
            }),
            prisma.teacherProfile.count(),
            prisma.feePayment.findMany({
                where: {
                    paymentDate: { gte: startOfMonth },
                    status: 'APPROVED'
                },
                select: { amountPaid: true, paymentDate: true, month: true, year: true, feeHead: true }
            }),
            prisma.attendance.findMany({
                where: { 
                    date: { 
                        gte: startOfDay,
                        lt: new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)
                    }
                },
                select: { status: true }
            }),
            prisma.feePayment.aggregate({
                where: { status: 'PENDING' },
                _sum: { amountPaid: true },
                _count: { id: true }
            }),
            prisma.studentProfile.count({
                where: { 
                    admissionDate: { gte: startOfMonth },
                    ...(sessionQuery && sessionQuery !== 'All' ? {
                        OR: [
                            { academicYear: sessionQuery },
                            { academicYear: altSession }
                        ]
                    } : {})
                }
            }),
            prisma.feePayment.findMany({
                take: 4,
                orderBy: { paymentDate: 'desc' },
                select: {
                    id: true,
                    amountPaid: true,
                    paymentDate: true,
                    status: true,
                    student: {
                        select: {
                            id: true,
                            admissionNo: true,
                            user: { select: { name: true } }
                        }
                    }
                }
            }),
            prisma.studentProfile.findMany({
                take: 4,
                orderBy: { admissionDate: 'desc' },
                select: {
                    id: true,
                    admissionDate: true,
                    user: { select: { name: true } },
                    class: { select: { name: true } }
                }
            })
        ]);

        let monthlyFiltered = allMonthFees;
        if (sessionQuery && sessionQuery !== 'All') {
            monthlyFiltered = allMonthFees.filter(p => isPaymentInAcademicYearLocal(p, sessionQuery));
        }
        const monthlyCollection = monthlyFiltered.reduce((sum, p) => sum + (p.amountPaid || 0), 0);

        // Prepare daily collection array (1 to current day)
        const currentDay = now.getDate();
        const dailyCollections = Array.from({ length: currentDay }, (_, i) => {
            const date = new Date(now.getFullYear(), now.getMonth(), i + 1);
            return {
                date: date.toISOString().split('T')[0],
                day: i + 1,
                amount: 0
            };
        });

        monthlyFiltered.forEach(fee => {
            const dayIndex = new Date(fee.paymentDate).getDate() - 1;
            if (dailyCollections[dayIndex]) {
                dailyCollections[dayIndex].amount += fee.amountPaid || 0;
            }
        });
        
        const presentCount = attendances.filter(a => a.status === 'Present').length;
        const totalAttendanceCount = attendances.length;
        const attendancePercentage = totalAttendanceCount > 0 ? Math.round((presentCount / totalAttendanceCount) * 100) : 0;
        
        let pendingFiltered = pendingPayments;
        const pendingFees = (pendingPayments as any)._sum?.amount || 0;
        
        let allActivities: any[] = [];
        
        recentFees.forEach(fee => {
            allActivities.push({
                id: `fee-${fee.id}`,
                type: fee.status === 'APPROVED' ? 'fee' : 'pending_fee',
                user: fee.student?.user?.name || 'Unknown',
                action: fee.status === 'APPROVED' 
                    ? `Fee payment received: ₹${fee.amountPaid}` 
                    : `Fee pending approval: ₹${fee.amountPaid}`,
                time: fee.paymentDate,
                iconName: fee.status === 'APPROVED' ? 'IndianRupee' : 'Clock',
                color: fee.status === 'APPROVED' ? '#48bb78' : '#ed8936'
            });
        });
        
        recentAdmissions.forEach(student => {
            allActivities.push({
                id: `adm-${student.id}`,
                type: 'admission',
                user: student.user?.name || 'Unknown',
                action: `New admission in Class ${student.class?.name || ''}`,
                time: student.admissionDate,
                iconName: 'UserPlus',
                color: '#4a90e2'
            });
        });
        
        // Sort by time descending and take top 4
        allActivities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
        const recentActivities = allActivities.slice(0, 4).map(a => ({ ...a, time: a.time.toISOString() }));
        
        const statsResult = {
            stats: {
                totalStudents,
                totalTeachers,
                monthlyCollection,
                attendancePercentage,
                pendingFees,
                newAdmissions,
                dailyCollections
            },
            recentActivities
        };
        setCache(statsCacheKey, statsResult, 90_000);
        res.json(statsResult);
 
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
});

// Dashboard Revenue Stats
router.get('/dashboard/revenue', async (req, res) => {
    try {
        const sessionQuery = req.query.session as string;
        const altSession = (() => {
            if (sessionQuery) {
                const parts = sessionQuery.split('-');
                if (parts.length === 2) {
                    const start = parts[0];
                    const end = parts[1];
                    if (end.length === 4) {
                        return `${start}-${end.slice(2)}`;
                    } else if (end.length === 2) {
                        return `${start}-20${end}`;
                    }
                }
            }
            return sessionQuery;
        })();

        const revenueCacheKey = `dashboard:revenue:${sessionQuery || 'all'}`;
        const cachedRevenue = getCache(revenueCacheKey);
        if (cachedRevenue) return res.json(cachedRevenue);

        let dateFilter = {};
        if (sessionQuery && sessionQuery !== 'All') {
            const parts = sessionQuery.split('-');
            if (parts.length === 2) {
                let startYear = parts[0];
                let endYear = parts[1];
                if (startYear.length === 2) startYear = `20${startYear}`;
                if (endYear.length === 2) endYear = `20${endYear}`;
                const startDate = new Date(`${startYear}-04-01T00:00:00.000Z`);
                const endDate = new Date(`${endYear}-03-31T23:59:59.999Z`);
                dateFilter = {
                    paymentDate: {
                        gte: startDate,
                        lte: endDate
                    }
                };
            }
        }

        const [students, classes, feeHeads, allSessionPayments] = await Promise.all([
            prisma.studentProfile.findMany({
                where: { 
                    status: 'Active',
                    ...(sessionQuery && sessionQuery !== 'All' ? {
                        OR: [
                            { academicYear: sessionQuery },
                            { academicYear: altSession }
                        ]
                    } : {})
                },
                select: {
                    id: true,
                    admissionNo: true,
                    isRT: true,
                    isThirdChild: true,
                    classId: true,
                    transportStopId: true,
                    previousSessionDue: true,
                    class: {
                        select: {
                            id: true,
                            name: true,
                            feeStructure: true
                        }
                    },
                    transportStop: {
                        select: {
                            id: true,
                            busFare: true
                        }
                    }
                }
            }),
            prisma.class.findMany(),
            prisma.feeHead.findMany(),
            prisma.feePayment.findMany({
                where: { 
                    status: 'APPROVED',
                    ...dateFilter
                }
            })
        ]);

        let sessionPaymentsFiltered = allSessionPayments;
        if (sessionQuery && sessionQuery !== 'All') {
            sessionPaymentsFiltered = allSessionPayments.filter(p => isPaymentInAcademicYearLocal(p, sessionQuery));
        }

        // Group payments by student ID in memory
        const paymentsByStudent: Record<string, typeof sessionPaymentsFiltered> = {};
        sessionPaymentsFiltered.forEach(p => {
            if (!paymentsByStudent[p.studentId]) {
                paymentsByStudent[p.studentId] = [];
            }
            paymentsByStudent[p.studentId].push(p);
        });

        // Link payments to student objects
        students.forEach(s => {
            (s as any).fees = paymentsByStudent[s.id] || [];
        });

        // Calculate elapsed months for current session dues
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const sessionStartMonth = 3; // April
        let monthsToCalculate = 0;
        if (currentMonth >= sessionStartMonth) {
            monthsToCalculate = (currentMonth - sessionStartMonth) + 1;
        } else {
            monthsToCalculate = (currentMonth + 12 - sessionStartMonth) + 1;
        }
        monthsToCalculate = Math.min(12, Math.max(1, monthsToCalculate));

        const totalCollectedSession = sessionPaymentsFiltered.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
        const totalConcessionsSession = sessionPaymentsFiltered.reduce((sum, p) => sum + (p.discount || 0), 0);

        let schoolStudentsCount = students.length;
        let schoolExpectedRevenue = 0;
        let schoolCollected = totalCollectedSession;
        let schoolOutstanding = 0;
        let schoolConcessions = totalConcessionsSession;

        let schoolTuitionExpected = 0;
        let schoolTransportExpected = 0;
        let schoolAdmissionExpected = 0;
        let schoolOtherExpected = 0;
        let schoolPrevDuesExpected = 0;
        let schoolRteExpected = 0;
        let schoolThirdChildExpected = 0;

        const classWiseMatrix = classes.map(cls => {
            const classStudents = students.filter(s => s.classId === cls.id);
            const classFeeStructure = cls.feeStructure ? (cls.feeStructure as any) : {};

            let yearlyProjected = 0;
            let collected = 0;
            let discountGiven = 0;
            let classOutstanding = 0;

            let tuitionExpected = 0;
            let transportExpected = 0;
            let admissionExpected = 0;
            let otherExpected = 0;
            let prevDuesExpected = 0;
            let rteExpected = 0;
            let thirdChildExpected = 0;

            classStudents.forEach(student => {
                const prevDue = student.previousSessionDue || 0;
                prevDuesExpected += prevDue;

                const busFare = student.transportStop?.busFare || 0;
                const transportProj = busFare * 12;
                transportExpected += transportProj;

                let studentMonthlyProj = 0;
                let studentOneTimeProj = 0;
                let studentMonthlyFeeAmount = 0;

                Object.entries(classFeeStructure).forEach(([headName, amountVal]) => {
                    const headNameLower = headName.toLowerCase();
                    const isRteHead = headNameLower.includes('rte students fees');
                    const isThirdChildHead = headNameLower.includes('third child one time fees');

                    const head = feeHeads.find(h => h.name.toLowerCase() === headName.toLowerCase());
                    if (!head && !isRteHead && !isThirdChildHead) return; // Skip unregistered helper fee heads

                    const activeHead = head || { name: headName, type: 'One-time' };
                    const amount = getExpectedFeeAmount(student, activeHead, classFeeStructure, cls.name);
                    if (amount <= 0) return;

                    const isMonthly = activeHead.type === 'Monthly';
                    if (headNameLower.includes('rte students fees')) {
                        rteExpected += amount;
                        studentOneTimeProj += amount;
                    } else if (headNameLower.includes('third child one time fees')) {
                        thirdChildExpected += amount;
                        studentOneTimeProj += amount;
                    } else if (isMonthly) {
                        studentMonthlyProj += amount * 12;
                        studentMonthlyFeeAmount += amount;
                        if (headNameLower.includes('tuition')) {
                            tuitionExpected += amount * 12;
                        } else {
                            otherExpected += amount * 12;
                        }
                    } else {
                        studentOneTimeProj += amount;
                        if (headNameLower.includes('admission') || headNameLower.includes('annual') || headNameLower.includes('exam')) {
                            admissionExpected += amount;
                        } else {
                            otherExpected += amount;
                        }
                    }
                });

                const totalStudentProjected = prevDue + transportProj + studentMonthlyProj + studentOneTimeProj;
                yearlyProjected += totalStudentProjected;

                // Calculate outstanding up to elapsed month
                const expectedMonthlyUpToNow = studentMonthlyFeeAmount * monthsToCalculate;
                const expectedTransportUpToNow = busFare * monthsToCalculate;
                const expectedUpToNow = prevDue + studentOneTimeProj + expectedMonthlyUpToNow + expectedTransportUpToNow;

                let totalPaidAndDiscount = 0;
                (student as any).fees.forEach((payment: any) => {
                    collected += payment.amountPaid || 0;
                    discountGiven += payment.discount || 0;
                    totalPaidAndDiscount += (payment.amountPaid || 0) + (payment.discount || 0);
                });

                const studentOutstanding = Math.max(0, expectedUpToNow - totalPaidAndDiscount);
                classOutstanding += studentOutstanding;
            });

            const outstanding = classOutstanding;

            schoolExpectedRevenue += yearlyProjected;
            schoolCollected += collected;
            schoolConcessions += discountGiven;
            schoolOutstanding += outstanding;
            schoolTuitionExpected += tuitionExpected;
            schoolTransportExpected += transportExpected;
            schoolAdmissionExpected += admissionExpected;
            schoolOtherExpected += otherExpected;
            schoolRteExpected += rteExpected;
            schoolThirdChildExpected += thirdChildExpected;
            schoolPrevDuesExpected += prevDuesExpected;

            return {
                classId: cls.id,
                className: cls.name,
                totalStudents: classStudents.length,
                yearlyProjected,
                collected,
                outstanding,
                discountGiven,
                breakdown: {
                    tuition: tuitionExpected,
                    transport: transportExpected,
                    admission: admissionExpected,
                    previousDues: prevDuesExpected,
                    other: otherExpected,
                    rteFees: rteExpected,
                    thirdChildFees: thirdChildExpected,
                    discount: discountGiven
                }
            };
        });

        const revenueResult = {
            summary: {
                totalStudents: schoolStudentsCount,
                totalExpectedRevenue: schoolExpectedRevenue,
                totalCollected: schoolCollected,
                totalOutstanding: schoolOutstanding,
                totalConcessions: schoolConcessions,
                breakdown: {
                    tuition: schoolTuitionExpected,
                    transport: schoolTransportExpected,
                    admission: schoolAdmissionExpected,
                    previousDues: schoolPrevDuesExpected,
                    other: schoolOtherExpected,
                    rteFees: schoolRteExpected,
                    thirdChildFees: schoolThirdChildExpected,
                    discount: schoolConcessions
                }
            },
            classMatrix: classWiseMatrix
        };
        setCache(revenueCacheKey, revenueResult, 90_000);
        res.json(revenueResult);
    } catch (err: any) {
        console.error('Revenue stats calculation error:', err);
        res.status(500).json({ error: 'Failed to calculate revenue statistics' });
    }
});

// Get Transport Stops
router.get('/transport/stops', async (req, res) => {
    try {
        console.log('Fetching all transport stops...');
        const stops = await prisma.transportStop.findMany();
        console.log(`Fetched ${stops.length} transport stops.`);
        res.json(stops);
    } catch (error: any) {
        console.error('Failed to fetch transport stops:', error.message);
        res.status(500).json({ error: 'Failed to fetch transport stops' });
    }
});

// Add Transport Stop
router.post('/transport/stops', async (req, res) => {
    try {
        const { name, km, ratePerKm, busFare } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: 'Stop name is required' });
        }

        const fareNum = Number(busFare);
        if (isNaN(fareNum)) {
            return res.status(400).json({ error: 'Invalid bus fare amount' });
        }

        const newStop = await prisma.transportStop.create({
            data: { 
                name, 
                km: km ? km.toString() : "", 
                ratePerKm: ratePerKm ? ratePerKm.toString() : "", 
                busFare: fareNum 
            }
        });
        res.json(newStop);
    } catch (error: any) {
        console.error('Transport Stop Creation Error:', error);
        
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Stop with this name already exists' });
        }
        
        res.status(500).json({ error: error.message || 'Failed to create transport stop' });
    }
});

// Delete Transport Stop
router.delete('/transport/stops/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.transportStop.delete({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete transport stop' });
    }
});

// Update Transport Stop
router.put('/transport/stops/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, busFare } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: 'Stop name is required' });
        }

        const fareNum = Number(busFare);
        if (isNaN(fareNum)) {
            return res.status(400).json({ error: 'Invalid bus fare amount' });
        }

        const updatedStop = await prisma.transportStop.update({
            where: { id },
            data: { name, busFare: fareNum }
        });
        res.json(updatedStop);
    } catch (error: any) {
        console.error('Transport Stop Update Error:', error);
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Stop with this name already exists' });
        }
        res.status(500).json({ error: 'Failed to update transport stop' });
    }
});

interface TransportParsedItem {
    name: string;
    amount: number;
    months: string[];
    isTransport: boolean;
}

function parseTransportBreakdown(feeHead: string | null, month: string | null, amountPaid: number, discount: number): TransportParsedItem[] {
    const totalAmount = amountPaid + discount;
    if (!feeHead) return [];
    const items: TransportParsedItem[] = [];

    if (feeHead.includes('==>')) {
        const parts = feeHead.split('==>');
        const monthsStr = parts[0].trim();
        const breakdownStr = parts[1].trim();

        const paidMonths = monthsStr ? monthsStr.split(',').map(m => m.trim()).filter(Boolean) : [];
        const itemParts = breakdownStr.split('||').map(item => item.trim()).filter(Boolean);

        itemParts.forEach(itemPart => {
            const splitColon = itemPart.split(':');
            if (splitColon.length >= 2) {
                const name = splitColon[0].trim();
                const amt = parseFloat(splitColon[1].trim()) || 0;
                const nameLower = name.toLowerCase();
                const isTransport = nameLower.includes('transport') || nameLower.includes('bus');

                items.push({
                    name,
                    amount: amt,
                    months: isTransport ? paidMonths : [],
                    isTransport
                });
            }
        });
    } else {
        const name = feeHead.trim();
        const nameLower = name.toLowerCase();
        const paidMonths = month ? month.split(',').map(m => m.trim()).filter(Boolean) : [];
        const isTransport = nameLower.includes('transport') || nameLower.includes('bus');

        items.push({
            name,
            amount: totalAmount,
            months: isTransport ? paidMonths : [],
            isTransport
        });
    }
    return items;
}

// Get Transport Ledger for all transport users
router.get('/transport/ledger', async (req, res) => {
    try {
        let sessionQuery = req.query.session as string;
        if (!sessionQuery) {
            const defSession = await prisma.session.findFirst({ where: { isDefault: true } });
            sessionQuery = defSession?.name || '2024-2025';
        }

        const altSession = (() => {
            if (sessionQuery) {
                const parts = sessionQuery.split('-');
                if (parts.length === 2) {
                    const start = parts[0];
                    const end = parts[1];
                    if (end.length === 4) {
                        return `${start}-${end.slice(2)}`;
                    } else if (end.length === 2) {
                        return `${start}-20${end}`;
                    }
                }
            }
            return sessionQuery;
        })();

        const students = await prisma.studentProfile.findMany({
            where: {
                status: 'Active',
                transportStopId: { not: null },
                ...(sessionQuery && sessionQuery !== 'All' ? {
                    OR: [
                        { academicYear: sessionQuery },
                        { academicYear: altSession }
                    ]
                } : {})
            },
            include: {
                class: true,
                user: true,
                transportStop: true,
                fees: {
                    where: { status: 'APPROVED' }
                }
            }
        });

        const allMonths = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];
        
        // Calculate elapsed months for current session dues
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const sessionStartMonth = 3; // April
        let monthsToCalculate = 0;
        if (currentMonth >= sessionStartMonth) {
            monthsToCalculate = (currentMonth - sessionStartMonth) + 1;
        } else {
            monthsToCalculate = (currentMonth + 12 - sessionStartMonth) + 1;
        }
        monthsToCalculate = Math.min(12, Math.max(1, monthsToCalculate));
        const elapsedMonths = allMonths.slice(0, monthsToCalculate);

        let totalExpectedYear = 0;
        let totalCollected = 0;
        let totalOutstanding = 0;

        const ledgerRows = students.map(student => {
            const busFare = student.transportStop?.busFare || 0;
            const expectedYearly = busFare * 12;
            const expectedUpToNow = busFare * monthsToCalculate;

            // Map out payments per month
            const monthlyPaidAmounts: Record<string, number> = {};
            allMonths.forEach(m => { monthlyPaidAmounts[m] = 0; });

            let studentCollected = 0;

            student.fees.forEach(payment => {
                // Filter fee payments that belong to the queried academic year
                if (!isPaymentInAcademicYearLocal(payment, sessionQuery)) return;

                const parsed = parseTransportBreakdown(payment.feeHead, payment.month, payment.amountPaid || 0, payment.discount || 0);
                parsed.forEach(item => {
                    if (item.isTransport) {
                        studentCollected += item.amount;
                        if (item.months.length > 0) {
                            const amtPerMonth = item.amount / item.months.length;
                            item.months.forEach(m => {
                                if (monthlyPaidAmounts[m] !== undefined) {
                                    monthlyPaidAmounts[m] += amtPerMonth;
                                }
                            });
                        } else if (payment.month && monthlyPaidAmounts[payment.month] !== undefined) {
                            monthlyPaidAmounts[payment.month] += item.amount;
                        }
                    }
                });
            });

            // Month status array
            const monthsStatus = allMonths.map(m => {
                const isElapsed = elapsedMonths.includes(m);
                const paidAmount = monthlyPaidAmounts[m] || 0;
                // Consider paid if paidAmount >= busFare (with a tiny tolerance of 1 rupee for decimals)
                const isPaid = paidAmount >= (busFare - 1);
                
                let status: 'paid' | 'pending' | 'future' = 'future';
                if (isPaid) {
                    status = 'paid';
                } else if (isElapsed) {
                    status = 'pending';
                }

                return {
                    month: m,
                    paidAmount,
                    status
                };
            });

            const studentOutstanding = Math.max(0, expectedUpToNow - studentCollected);

            totalExpectedYear += expectedYearly;
            totalCollected += studentCollected;
            totalOutstanding += studentOutstanding;

            return {
                studentId: student.id,
                admissionNo: student.admissionNo,
                name: student.user?.name || 'N/A',
                fatherName: student.fatherName || 'N/A',
                className: student.class?.name || 'N/A',
                classId: student.classId,
                stopName: student.transportStop?.name || 'N/A',
                busFare,
                expectedYearly,
                expectedUpToNow,
                collected: studentCollected,
                outstanding: studentOutstanding,
                months: monthsStatus
            };
        });

        res.json({
            stats: {
                totalUsers: students.length,
                totalExpectedYear,
                totalCollected,
                totalOutstanding
            },
            students: ledgerRows,
            elapsedMonths,
            allMonths
        });

    } catch (error: any) {
        console.error('Failed to calculate transport ledger:', error);
        res.status(500).json({ error: error.message || 'Failed to get transport ledger' });
    }
});

// --- TRANSFER CERTIFICATE (TC) ROUTES ---

// Get all TC records
router.get('/tc-records', async (req, res) => {
    try {
        const records = await (prisma as any).transferCertificate.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                student: {
                    select: {
                        id: true,
                        admissionNo: true,
                        class: { select: { name: true } }
                    }
                }
            }
        });
        res.json(records);
    } catch (error: any) {
        console.error('Error fetching TC records:', error);
        res.status(500).json({ error: 'Failed to fetch TC records' });
    }
});

// Save or Update TC record
router.post('/tc-records', async (req, res) => {
    try {
        const {
            id,
            studentId,
            studentName,
            admissionNo,
            withdrawalNo,
            tcNo,
            sRegisterNo,
            className,
            leavingDate,
            reason,
            conduct,
            fatherName,
            motherName,
            occupation,
            address,
            caste,
            lastInstitution,
            dob,
            dobWords,
            aadharNo,
            isPaid,
            receiptNo,
            feeAmount
        } = req.body;

        if (!studentName || !admissionNo) {
            return res.status(400).json({ error: 'Student Name and Admission Number are required' });
        }

        let record;
        if (id) {
            record = await (prisma as any).transferCertificate.update({
                where: { id },
                data: {
                    studentId: studentId || undefined,
                    studentName,
                    admissionNo,
                    withdrawalNo,
                    tcNo: tcNo || undefined,
                    sRegisterNo,
                    className,
                    leavingDate,
                    reason,
                    conduct,
                    fatherName,
                    motherName,
                    occupation,
                    address,
                    caste,
                    lastInstitution,
                    dob,
                    dobWords,
                    aadharNo,
                    isPaid: isPaid ?? false,
                    receiptNo: receiptNo || undefined,
                    feeAmount: feeAmount ? Number(feeAmount) : 0
                }
            });
        } else {
            // Auto generate tcNo if not provided
            const finalTcNo = tcNo || `BIPS/TC/${new Date().getFullYear()}/${Date.now().toString().slice(-4)}`;
            
            record = await (prisma as any).transferCertificate.create({
                data: {
                    studentId: studentId || undefined,
                    studentName,
                    admissionNo,
                    withdrawalNo: withdrawalNo || '',
                    tcNo: finalTcNo,
                    sRegisterNo: sRegisterNo || '',
                    className: className || '',
                    leavingDate: leavingDate || '',
                    reason: reason || '',
                    conduct: conduct || 'Satisfactory',
                    fatherName: fatherName || '',
                    motherName: motherName || '',
                    occupation: occupation || '',
                    address: address || '',
                    caste: caste || '',
                    lastInstitution: lastInstitution || '',
                    dob: dob || '',
                    dobWords: dobWords || '',
                    aadharNo: aadharNo || '',
                    isPaid: isPaid ?? false,
                    receiptNo: receiptNo || undefined,
                    feeAmount: feeAmount ? Number(feeAmount) : 0
                }
            });
        }

        res.json({ success: true, record });
    } catch (error: any) {
        console.error('Error saving TC record:', error);
        res.status(500).json({ error: error.message || 'Failed to save TC record' });
    }
});

// ─── System Users & Role Permissions ──────────────────────────────────────────

// Get all system users
router.get('/system-users', async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                role: true,
                permissions: true,
                createdAt: true
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(users);
    } catch (error: any) {
        console.error('Error fetching system users:', error);
        res.status(500).json({ error: 'Failed to fetch system users' });
    }
});

// Create new system user
router.post('/system-users', async (req, res) => {
    try {
        const { email, password, name, phone, role, permissions } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({ error: 'Email, Name, and Password are required' });
        }

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                phone: phone || null,
                role: (role || 'ACCOUNTS') as any,
                permissions: Array.isArray(permissions) ? permissions : []
            },
            select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                role: true,
                permissions: true,
                createdAt: true
            }
        });

        res.status(201).json({ success: true, user: newUser });
    } catch (error: any) {
        console.error('Error creating system user:', error);
        res.status(500).json({ error: error.message || 'Failed to create user' });
    }
});

// Update permissions or user details for a system user
router.put('/system-users/:id/permissions', async (req, res) => {
    try {
        const { id } = req.params;
        const { permissions, role, name, phone } = req.body;

        const updateData: any = {};
        if (Array.isArray(permissions)) updateData.permissions = permissions;
        if (role) updateData.role = role;
        if (name) updateData.name = name;
        if (phone !== undefined) updateData.phone = phone;

        const updatedUser = await prisma.user.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                role: true,
                permissions: true,
                createdAt: true
            }
        });

        res.json({ success: true, user: updatedUser });
    } catch (error: any) {
        console.error('Error updating user permissions:', error);
        res.status(500).json({ error: 'Failed to update user permissions' });
    }
});

// Delete system user
router.delete('/system-users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.user.delete({ where: { id } });
        res.json({ success: true, message: 'User deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

export default router;


