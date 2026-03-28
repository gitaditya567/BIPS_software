import express from 'express';
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';


const router = express.Router();
const prisma = new PrismaClient();

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
        const students = await prisma.studentProfile.findMany({
            include: {
                user: true,
                class: true,
                section: true
            }
        });
        res.json(students.map(s => ({
            ...s,
            name: s.user.name,
            email: s.user.email,
            className: s.class.name,
            sectionName: s.section.name,
        })));
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
            gender, dob, bloodGroup, category, religion, nationality, aadhaar, address, photo,
            prevSchoolName, prevClass, prevSchoolAddress, prevMarks
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
                        admissionNo,
                        studentId,
                        classId,
                        sectionId,
                        gender,
                        dateOfBirth: dob,
                        bloodGroup,
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
                    }
                }
            },
            include: { studentProfile: true }
        });

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
            gender, dob, bloodGroup, category, religion, nationality, aadhaar, address, photo,
            prevSchoolName, prevClass, prevSchoolAddress, prevMarks, password
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
                classId,
                sectionId,
                gender,
                dateOfBirth: dob,
                bloodGroup,
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
            }
        });

        res.json(updatedStudent);
    } catch (error: any) {
        console.error('Student Update Error:', error);
        res.status(500).json({ error: 'Failed to update student' });
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
        res.json({ success: true, message: 'Student deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed' });
    }
});

// Dashboard Stats
router.get('/dashboard/stats', async (req, res) => {
    try {
        const totalStudents = await prisma.user.count({ where: { role: 'STUDENT' } });
        const totalTeachers = await prisma.user.count({ where: { role: 'TEACHER' } });
        
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        const monthlyFees = await prisma.feePayment.aggregate({
            _sum: { amountPaid: true },
            where: {
                paymentDate: { gte: startOfMonth },
                status: 'APPROVED'
            }
        });
        const monthlyCollection = monthlyFees._sum.amountPaid || 0;
        
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const attendances = await prisma.attendance.findMany({
            where: { 
                date: { 
                    gte: startOfDay,
                    lt: new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)
                }
            }
        });
        const presentCount = attendances.filter(a => a.status === 'Present').length;
        const totalAttendanceCount = attendances.length;
        const attendancePercentage = totalAttendanceCount > 0 ? Math.round((presentCount / totalAttendanceCount) * 100) : 0;
        
        const pendingFeesAgg = await prisma.feePayment.aggregate({
            _sum: { totalFee: true },
            where: { status: 'PENDING' }
        });
        const pendingFees = pendingFeesAgg._sum.totalFee || 0;
        
        const newAdmissions = await prisma.studentProfile.count({
            where: { admissionDate: { gte: startOfMonth } }
        });
        
        const recentFees = await prisma.feePayment.findMany({
            take: 4,
            orderBy: { paymentDate: 'desc' },
            include: { student: { include: { user: true } } }
        });
        
        const recentAdmissions = await prisma.studentProfile.findMany({
            take: 4,
            orderBy: { admissionDate: 'desc' },
            include: { user: true, class: true }
        });
        
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
        
        res.json({
            stats: {
                totalStudents,
                totalTeachers,
                monthlyCollection,
                attendancePercentage,
                pendingFees,
                newAdmissions
            },
            recentActivities
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
});

export default router;
