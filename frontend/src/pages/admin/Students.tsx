import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNotification } from '../../context/NotificationContext';
import { Printer, Download, Pencil, Trash2, Search, Users } from 'lucide-react';

const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let pass = '';
    for (let i = 0; i < 8; i++) {
        pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
};

const Students: React.FC = () => {
    const [students, setStudents] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [sections, setSections] = useState<any[]>([]);
    const [transportStops, setTransportStops] = useState<any[]>([]);
    const { addNotification } = useNotification();

    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const recordsPerPage = 5;

    const [filterClassId, setFilterClassId] = useState('');
    const [filterSectionId, setFilterSectionId] = useState('');
    const [filterRT, setFilterRT] = useState('');
    const [filterSections, setFilterSections] = useState<any[]>([]);
    const [filterStatus, setFilterStatus] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (filterClassId) {
            const cls = classes.find(c => c.id === filterClassId);
            setFilterSections(cls?.sections || []);
            setFilterSectionId('');
        } else {
            setFilterSections([]);
            setFilterSectionId('');
        }
        setCurrentPage(1);
    }, [filterClassId, classes]);

    useEffect(() => {
        setCurrentPage(1);
    }, [filterSectionId]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    useEffect(() => {
        setCurrentPage(1);
    }, [filterStatus]);

    // Form fields
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState(generateRandomPassword()); // Default password
    const [admissionNo, setAdmissionNo] = useState('');
    const [classId, setClassId] = useState('');
    const [sectionId, setSectionId] = useState('');
    const [transportStopId, setTransportStopId] = useState('');
    const [status, setStatus] = useState('Active');

    const [gender, setGender] = useState('');
    const [dob, setDob] = useState('');
    const [address, setAddress] = useState('');
    const [bloodGroup, setBloodGroup] = useState('');
    const [isRT, setIsRT] = useState(false);
    const [category, setCategory] = useState('');
    const [religion, setReligion] = useState('');
    const [nationality, setNationality] = useState('');
    const [aadhaar, setAadhaar] = useState('');
    const [photo, setPhoto] = useState('');
    const [showPhotoModal, setShowPhotoModal] = useState(false);
    const [showWhatsappModal, setShowWhatsappModal] = useState(false);
    const [studentToDelete, setStudentToDelete] = useState<{id: string, name: string} | null>(null);

    const [activeTab, setActiveTab] = useState('personal');
    // Academic fields
    const [admissionDate, setAdmissionDate] = useState('');
    const [rollNumber, setRollNumber] = useState('');
    const [medium, setMedium] = useState('');
    const [academicYear, setAcademicYear] = useState('');
    const [house, setHouse] = useState('');

    const [prevSchoolName, setPrevSchoolName] = useState('');
    const [prevClass, setPrevClass] = useState('');
    const [prevSchoolAddress, setPrevSchoolAddress] = useState('');
    const [prevMarks, setPrevMarks] = useState('');
    const [leavingReason, setLeavingReason] = useState('');
    const [siblingInfo, setSiblingInfo] = useState('');

    // Parent details
    const [fatherName, setFatherName] = useState('');
    const [fatherMobile, setFatherMobile] = useState('');
    const [fatherOccupation, setFatherOccupation] = useState('');
    const [fatherQualification, setFatherQualification] = useState('');
    const [fatherEmail, setFatherEmail] = useState('');

    const [motherName, setMotherName] = useState('');
    const [motherMobile, setMotherMobile] = useState('');
    const [motherOccupation, setMotherOccupation] = useState('');
    const [motherQualification, setMotherQualification] = useState('');

    useEffect(() => {
        fetchStudents();
        fetchClasses();
        fetchTransportStops();
    }, []);

    const fetchTransportStops = async () => {
        try {
            const res = await axios.get('/erp-api/admin/transport/stops');
            setTransportStops(res.data);
        } catch (err) {
            console.error(err);
        }
    };


    useEffect(() => {
        // When class changes, update available sections
        if (classId) {
            const cls = classes.find(c => c.id === classId);
            setSections(cls?.sections || []);
            setSectionId(''); // Reset section
        } else {
            setSections([]);
        }
    }, [classId, classes]);

    const fetchStudents = async () => {
        try {
            const res = await axios.get('/erp-api/admin/students');
            setStudents(res.data);
            setCurrentPage(1);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchClasses = async () => {
        try {
            const res = await axios.get('/erp-api/admin/classes');
            setClasses(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setFirstName(''); setLastName(''); setEmail(''); setPhone(''); setPassword(generateRandomPassword()); setAdmissionNo('');
        setClassId(''); setSectionId(''); setTransportStopId(''); setStatus('Active');
        setGender(''); setDob(''); setAddress(''); setBloodGroup(''); setIsRT(false); setCategory('');
        setReligion(''); setNationality(''); setAadhaar(''); setPhoto('');
        setPrevSchoolName(''); setPrevClass(''); setPrevSchoolAddress(''); setPrevMarks(''); setLeavingReason(''); setSiblingInfo('');
        setAdmissionDate(''); setRollNumber(''); setMedium(''); setAcademicYear(''); setHouse('');
        setFatherName(''); setFatherMobile(''); setFatherOccupation(''); setFatherQualification(''); setFatherEmail('');
        setMotherName(''); setMotherMobile(''); setMotherOccupation(''); setMotherQualification('');
        setActiveTab('personal');
    };

    const handleEdit = (student: any) => {
        setEditingId(student.id);
        
        const parts = student.name ? student.name.split(' ') : [];
        setFirstName(parts[0] || '');
        setLastName(parts.slice(1).join(' ') || '');
        
        setEmail(student.email || '');
        setPhone(student.user?.phone || student.phone || '');
        setPassword('');
        
        setAdmissionNo(student.admissionNo || '');
        
        setClassId(student.classId || '');
        setTimeout(() => setSectionId(student.sectionId || ''), 100);
        setTransportStopId(student.transportStopId || '');
        setStatus(student.status || 'Active');
        
        setGender(student.gender || '');
        setDob(student.dateOfBirth || '');
        setAddress(student.user?.address || student.address || '');
        setBloodGroup(student.bloodGroup || '');
        setIsRT(student.isRT || false);
        setCategory(student.category || '');
        setReligion(student.religion || '');
        setNationality(student.nationality || '');
        setAadhaar(student.aadhaarNumber || '');
        setPhoto(student.photo || '');
        
        setAdmissionDate(student.admissionDate ? new Date(student.admissionDate).toISOString().split('T')[0] : '');
        setRollNumber(student.rollNumber || '');
        setMedium(student.medium || '');
        setAcademicYear(student.academicYear || '');
        setHouse(student.house || '');
        
        setPrevSchoolName(student.prevSchoolName || '');
        setPrevClass(student.prevClass || '');
        setPrevSchoolAddress(student.prevSchoolAddress || '');
        setPrevMarks(student.prevMarks || '');
        setLeavingReason(student.leavingReason || '');
        setSiblingInfo(student.siblingInfo || '');
        
        setFatherName(student.fatherName || '');
        setFatherMobile(student.fatherMobile || '');
        setFatherOccupation(student.fatherOccupation || '');
        setFatherQualification(student.fatherQualification || '');
        setFatherEmail(student.fatherEmail || '');
        
        setMotherName(student.motherName || '');
        setMotherMobile(student.motherMobile || '');
        setMotherOccupation(student.motherOccupation || '');
        setMotherQualification(student.motherQualification || '');
        
        setActiveTab('personal');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firstName) return alert('Please enter the First Name, it is required.');

        setLoading(true);
        
        let finalEmail = email.trim();
        if (!finalEmail) {
            finalEmail = `${firstName.toLowerCase().replace(/\s+/g, '')}.${Math.floor(Math.random() * 10000)}@bips.local`;
        }
        
        try {
            if (editingId) {
                const originalStudent = students.find(s => s.id === editingId);
                let finalAdmissionNo = admissionNo || originalStudent?.admissionNo;

                await axios.put(`/erp-api/admin/students/${editingId}`, {
                    firstName, lastName, email: finalEmail, phone, password, admissionNo: finalAdmissionNo, 
                    classId: classId ? classId.trim() : null, 
                    sectionId: sectionId ? sectionId.trim() : null,
                    transportStopId: transportStopId ? transportStopId : null,
                    gender, dob, address, bloodGroup, isRT, category, religion, nationality, aadhaar, photo,
                    prevSchoolName, prevClass, prevSchoolAddress, prevMarks, leavingReason, siblingInfo,
                    admissionDate, rollNumber, medium, academicYear, house,
                    fatherName, fatherMobile, fatherOccupation, fatherQualification, fatherEmail, status,
                    motherName, motherMobile, motherOccupation, motherQualification
                });
                addNotification('admission', 'Student Updated', `${firstName} ${lastName} has been updated successfully!`);
             } else {
                // Find the highest existing admission number to continue the sequence
                let nextNumber = 1;
                if (students.length > 0) {
                    const numbers = students.map(s => {
                        const val = s.admissionNo || '';
                        if (val.startsWith('BIPS/26/')) {
                            const num = parseInt(val.split('/')[2]);
                            return isNaN(num) ? 0 : num;
                        }
                        return 0;
                    });
                    nextNumber = Math.max(...numbers, 0) + 1;
                }
                
                // Final safety check: ensure the number hasn't been used in the current session
                const finalAdmissionNo = `BIPS/26/${String(nextNumber).padStart(3, '0')}`;
                
                await axios.post('/erp-api/admin/students', {
                    firstName, lastName, email: finalEmail, phone, password, admissionNo: finalAdmissionNo, 
                    classId, sectionId, transportStopId,
                    gender, dob, address, bloodGroup, isRT, category, religion, nationality, aadhaar, photo,
                    prevSchoolName, prevClass, prevSchoolAddress, prevMarks, leavingReason, siblingInfo,
                    admissionDate, rollNumber, medium, academicYear, house,
                    fatherName, fatherMobile, fatherOccupation, fatherQualification, fatherEmail, status,
                    motherName, motherMobile, motherOccupation, motherQualification
                });
                addNotification('admission', 'New Admission', `${firstName} ${lastName} has been admitted as ${finalAdmissionNo}!`);
            }
            
            fetchStudents();
            resetForm();
        } catch (err: any) {
            console.error(err);
            alert(err.response?.data?.error || 'Failed to save student');
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = (student: any) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const html = `
            <html>
            <head>
                <title>Admission Form - ${student.name}</title>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
                    @page { size: A4; margin: 10mm; }
                    body { font-family: 'Inter', sans-serif; padding: 0; margin: 0; color: #1e293b; line-height: 1.3; font-size: 12px; }
                    .header { text-align: center; margin-bottom: 12px; position: relative; padding-top: 5px; }
                    .school-name { font-size: 24px; font-weight: 800; color: #000; margin: 0; text-transform: uppercase; letter-spacing: 1px; }
                    .address { font-size: 11px; font-weight: 600; color: #4b5563; margin: 2px 0; }
                    .tagline-banner { 
                        background: #ef4444; 
                        color: white; 
                        padding: 4px 12px; 
                        font-weight: 700; 
                        font-size: 11px; 
                        border-radius: 4px; 
                        display: inline-block; 
                        margin-top: 5px;
                        text-transform: uppercase;
                    }
                    .form-title { font-size: 16px; font-weight: 700; text-align: center; margin: 10px 0; text-decoration: underline; color: #1a202c; text-transform: uppercase; }
                    
                    .student-photo { position: absolute; top: 0; right: 0; width: 90px; height: 110px; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #94a3b8; background: #fff; }
                    .student-photo img { width: 100%; height: 100%; object-fit: cover; }

                    .info-section { margin-bottom: 10px; border: 1px solid #e2e8f0; padding: 10px 15px; border-radius: 6px; }
                    .section-title { font-size: 11px; font-weight: 800; background: #f8fafc; padding: 3px 10px; margin: -10px -15px 8px -15px; border-bottom: 1px solid #e2e8f0; border-radius: 6px 6px 0 0; color: #334155; text-transform: uppercase; }
                    
                    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 20px; }
                    .field { display: flex; gap: 8px; margin-bottom: 2px; }
                    .label { font-weight: 700; color: #64748b; min-width: 110px; }
                    .value { border-bottom: 1px dotted #cbd5e1; flex: 1; padding-bottom: 1px; font-weight: 600; color: #1e293b; }

                    .signature-row { display: flex; justify-content: space-between; margin-top: 35px; padding: 0 10px; }
                    .sig-box { text-align: center; width: 160px; border-top: 1px solid #64748b; padding-top: 5px; font-size: 11px; font-weight: 700; color: #475569; }
                    
                    @media print {
                        body { -webkit-print-color-adjust: exact; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div style="font-size: 30px; margin-bottom: 5px;">🏫</div>
                    <h1 class="school-name">BIMLA INTERNATIONAL PUBLIC SCHOOL</h1>
                    <p class="address">Makhdoompur Kaithi, Jaiti Khera, Sarojini Nagar, Lucknow.</p>
                    <div class="tagline-banner">AN ENGLISH MEDIUM CO-EDUCATIONAL SCHOOL (U.P. BOARD)</div>
                    
                    <div class="student-photo">
                        ${student.photo ? `<img src="${student.photo}" />` : 'Paste Photo Here'}
                    </div>
                </div>

                <h2 class="form-title">Student Admission Form</h2>

                <div class="info-section">
                    <div class="section-title">Academic Details</div>
                    <div class="grid">
                        <div class="field"><span class="label">Admission No:</span><span class="value">${student.admissionNo || 'N/A'}</span></div>
                        <div class="field"><span class="label">Admission Date:</span><span class="value">${student.admissionDate ? new Date(student.admissionDate).toLocaleDateString() : 'N/A'}</span></div>
                        <div class="field"><span class="label">Academic Year:</span><span class="value">${student.academicYear || '2026-2027'}</span></div>
                        <div class="field"><span class="label">Class/Section:</span><span class="value">${student.className || 'N/A'} / ${student.sectionName || 'N/A'}</span></div>
                    </div>
                </div>

                <div class="info-section" style="margin-bottom: 8px;">
                    <div class="section-title">Personal Information</div>
                    <div class="grid">
                        <div class="field"><span class="label">Student Name:</span><span class="value">${student.name}</span></div>
                        <div class="field"><span class="label">Gender:</span><span class="value">${student.gender || 'N/A'}</span></div>
                        <div class="field"><span class="label">Date of Birth:</span><span class="value">${student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : 'N/A'}</span></div>
                        <div class="field"><span class="label">Aadhaar No:</span><span class="value">${student.aadhaarNumber || 'N/A'}</span></div>
                        <div class="field"><span class="label">Blood Group:</span><span class="value">${student.bloodGroup || 'N/A'}</span></div>
                        <div class="field"><span class="label">Category:</span><span class="value">${student.category || 'N/A'}</span></div>
                        <div class="field"><span class="label">Religion:</span><span class="value">${student.religion || 'N/A'}</span></div>
                        <div class="field"><span class="label">Phone:</span><span class="value">${student.phone || 'N/A'}</span></div>
                    </div>
                    <div class="field" style="margin-top: 5px;"><span class="label">Address:</span><span class="value">${student.address || 'N/A'}</span></div>
                </div>

                <div class="info-section" style="margin-bottom: 8px;">
                    <div class="section-title">Parent Information</div>
                    <div class="grid">
                        <div class="field"><span class="label">Father's Name:</span><span class="value">${student.fatherName || 'N/A'}</span></div>
                        <div class="field"><span class="label">Mother's Name:</span><span class="value">${student.motherName || 'N/A'}</span></div>
                        <div class="field"><span class="label">Father Phone:</span><span class="value">${student.fatherMobile || 'N/A'}</span></div>
                        <div class="field"><span class="label">Mother Phone:</span><span class="value">${student.motherMobile || 'N/A'}</span></div>
                        <div class="field"><span class="label">Father Occ.:</span><span class="value">${student.fatherOccupation || 'N/A'}</span></div>
                        <div class="field"><span class="label">Mother Occ.:</span><span class="value">${student.motherOccupation || 'N/A'}</span></div>
                    </div>
                </div>

                <div class="info-section" style="margin-bottom: 8px;">
                    <div class="section-title">Previous Education</div>
                    <div class="grid">
                        <div class="field"><span class="label">School Name:</span><span class="value">${student.prevSchoolName || 'N/A'}</span></div>
                        <div class="field"><span class="label">Last Class:</span><span class="value">${student.prevClass || 'N/A'}</span></div>
                        <div class="field"><span class="label">Leaving Reason:</span><span class="value">${student.leavingReason || 'N/A'}</span></div>
                    </div>
                </div>

                <div class="signature-row">
                    <div class="sig-box">Student Signature</div>
                    <div class="sig-box">Parent/Guardian Signature</div>
                    <div class="sig-box">Principal Signature</div>
                </div>
                
                <script>
                    window.onload = function() {
                        setTimeout(() => {
                            window.print();
                            window.onafterprint = () => window.close();
                        }, 500);
                    };
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
    };

    const confirmDelete = async () => {
        if (!studentToDelete) return;
        setLoading(true);
        try {
            await axios.delete(`/erp-api/admin/students/${studentToDelete.id}`);
            fetchStudents();
            addNotification('admission', 'Student Deleted', `${studentToDelete.name} has been removed.`);
            setStudentToDelete(null);
        } catch (err) {
            alert('Failed to delete student');
        } finally {
            setLoading(false);
        }
    };

    const handleExportExcel = () => {
        const headers = ['S.R No', 'STUDENT ID', 'NAME', 'FATHER NAME', 'ADDRESS', 'CLASS', 'SECTION', 'STATUS'];
        
        const csvContent = [
            headers.join(','),
            ...filteredStudents.map((s, idx) => {
                const srNo = s.admissionNo || `BIPS/26/${String(filteredStudents.length - idx).padStart(3, '0')}`;
                const studentId = s.studentId || 'N/A';
                const name = `"${s.name || ''}"`;
                const fatherName = `"${s.fatherName || 'N/A'}"`;
                const address = `"${s.address || s.user?.address || 'N/A'}"`;
                const currentClass = `"${s.className || 'N/A'}"`;
                const currentSection = `"${s.sectionName || 'N/A'}"`;
                const status = s.status || 'Active';
                
                return [srNo, studentId, name, fatherName, address, currentClass, currentSection, status].join(',');
            })
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', 'student_records.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    let filteredStudents = [...students].reverse();
    if (filterClassId) {
        filteredStudents = filteredStudents.filter(s => s.classId === filterClassId);
    }
    if (filterSectionId) {
        filteredStudents = filteredStudents.filter(s => s.sectionId === filterSectionId);
    }
    if (filterRT) {
        const isRTBool = filterRT === 'Yes';
        filteredStudents = filteredStudents.filter(s => s.isRT === isRTBool);
    }
    if (filterStatus) {
        filteredStudents = filteredStudents.filter(s => s.status === filterStatus);
    }
    if (searchQuery) {
        const lowerQ = searchQuery.toLowerCase();
        filteredStudents = filteredStudents.filter(s => 
            (s.name && s.name.toLowerCase().includes(lowerQ)) ||
            (s.admissionNo && s.admissionNo.toLowerCase().includes(lowerQ)) ||
            (s.studentId && s.studentId.toLowerCase().includes(lowerQ))
        );
    }
    const totalPages = Math.ceil(filteredStudents.length / recordsPerPage) || 1;

    return (
        <div>
            <style>
                {`
                @keyframes popIn {
                    0% { transform: scale(0.9); opacity: 0; }
                    100% { transform: scale(1); opacity: 1; }
                }
                `}
            </style>
            <h1 style={{ marginBottom: '2rem', fontSize: '1.875rem', fontWeight: 800 }}>Student Management</h1>

            {/* Add Student Card */}
            <div className="stat-card" style={{ display: 'block', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontWeight: 'bold', margin: 0 }}>{editingId ? 'Edit Student Details' : 'Admit New Student'}</h3>
                    {editingId && <button type="button" onClick={resetForm} className="btn-secondary" style={{ padding: '0.4rem 1rem', borderRadius: '4px', cursor: 'pointer', background: '#e5e7eb', border: 'none' }}>Cancel Edit</button>}
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #e5e7eb', marginBottom: '1.5rem' }}>
                        <button type="button" onClick={() => setActiveTab('personal')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem 1rem', fontSize: '1rem', fontWeight: activeTab === 'personal' ? 'bold' : 'normal', color: activeTab === 'personal' ? '#2563eb' : '#6b7280', borderBottom: activeTab === 'personal' ? '2px solid #2563eb' : 'none' }}>Personal Information</button>
                        <button type="button" onClick={() => setActiveTab('academic')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem 1rem', fontSize: '1rem', fontWeight: activeTab === 'academic' ? 'bold' : 'normal', color: activeTab === 'academic' ? '#2563eb' : '#6b7280', borderBottom: activeTab === 'academic' ? '2px solid #2563eb' : 'none' }}>Previous Schooling & Details</button>
                        <button type="button" onClick={() => setActiveTab('parent')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem 1rem', fontSize: '1rem', fontWeight: activeTab === 'parent' ? 'bold' : 'normal', color: activeTab === 'parent' ? '#2563eb' : '#6b7280', borderBottom: activeTab === 'parent' ? '2px solid #2563eb' : 'none' }}>Parent Information</button>
                        <button type="button" onClick={() => setActiveTab('sibling')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem 1rem', fontSize: '1rem', fontWeight: activeTab === 'sibling' ? 'bold' : 'normal', color: activeTab === 'sibling' ? '#2563eb' : '#6b7280', borderBottom: activeTab === 'sibling' ? '2px solid #2563eb' : 'none' }}>Sibling Information</button>
                    </div>

                    {activeTab === 'personal' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                            <div className="form-group">
                                <label>Student ID</label>
                                <input type="text" className="form-control" value="Auto Generated" disabled style={{ backgroundColor: '#f0f0f0' }} />
                            </div>

                            <div className="form-group">
                                <label>Status</label>
                                <select className="form-control" value={status} onChange={e => setStatus(e.target.value)}>
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                </select>
                            </div>

                             <div className="form-group">
                                <label>S.R / Admission No</label>
                                {editingId ? (
                                    <input type="text" className="form-control" value={admissionNo} onChange={e => setAdmissionNo(e.target.value)} />
                                ) : (
                                    <input 
                                        type="text" 
                                        className="form-control" 
                                        value={(() => {
                                            const numbers = students.map(s => {
                                                const val = s.admissionNo || '';
                                                if (val.startsWith('BIPS/26/')) {
                                                    const num = parseInt(val.split('/')[2]);
                                                    return isNaN(num) ? 0 : num;
                                                }
                                                return 0;
                                            });
                                            const next = Math.max(...numbers, 0) + 1;
                                            return `BIPS/26/${String(next).padStart(3, '0')} (Auto)`;
                                        })()} 
                                        disabled 
                                        style={{ backgroundColor: '#f0f0f0', fontWeight: 'bold', color: '#2563eb' }} 
                                    />
                                )}
                            </div>

                             <div className="form-group">
                                <label>Class of Admission</label>
                                <select className="form-control" value={classId} onChange={e => setClassId(e.target.value)}>
                                    <option value="">Select Class</option>
                                    {classes.map(cls => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>First Name</label>
                                <input type="text" className="form-control" value={firstName} onChange={e => setFirstName(e.target.value)} required />
                            </div>

                            <div className="form-group">
                                <label>Last Name (optional)</label>
                                <input type="text" className="form-control" value={lastName} onChange={e => setLastName(e.target.value)} />
                            </div>

                            <div className="form-group">
                                <label>Gender</label>
                                <select className="form-control" value={gender} onChange={e => setGender(e.target.value)}>
                                    <option value="">Select Gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Date of Birth</label>
                                <input type="date" className="form-control" value={dob} onChange={e => setDob(e.target.value)} />
                            </div>

                            <div className="form-group">
                                <label>Email Address(optional)</label>
                                <input type="email" className="form-control" value={email} onChange={e => setEmail(e.target.value)} />
                            </div>

                            <div className="form-group">
                                <label>Phone Number</label>
                                <input type="text" className="form-control" maxLength={10} value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))} />
                            </div>

                            <div className="form-group">
                                <label>RT Student</label>
                                <select className="form-control" value={isRT ? 'Yes' : 'No'} onChange={e => setIsRT(e.target.value === 'Yes')}>
                                    <option value="No">No</option>
                                    <option value="Yes">Yes</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Category</label>
                                <select className="form-control" value={category} onChange={e => setCategory(e.target.value)}>
                                    <option value="">Select Category</option>
                                    <option value="General">General</option>
                                    <option value="OBC">OBC</option>
                                    <option value="SC">SC</option>
                                    <option value="ST">ST</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Religion</label>
                                <input type="text" className="form-control" value={religion} onChange={e => setReligion(e.target.value)} />
                            </div>

                            <div className="form-group">
                                <label>Nationality</label>
                                <input type="text" className="form-control" value={nationality} onChange={e => setNationality(e.target.value)} />
                            </div>

                            <div className="form-group">
                                <label>Address</label>
                                <input type="text" className="form-control" value={address} onChange={e => setAddress(e.target.value)} />
                            </div>

                            <div className="form-group">
                                <label>Aadhaar Number (optional)</label>
                                <input type="text" className="form-control" value={aadhaar} onChange={e => setAadhaar(e.target.value)} />
                            </div>

                            <div className="form-group">
                                <label>Student Photo (Upload)</label>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                    <input type="file" className="form-control" accept="image/*" onChange={e => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            const reader = new FileReader();
                                            reader.onloadend = () => setPhoto(reader.result as string);
                                            reader.readAsDataURL(file);
                                        }
                                    }} style={{ flex: 1 }} />
                                    {photo && (
                                        <div 
                                            onClick={() => setShowPhotoModal(true)}
                                            title="Click to view full photo"
                                            style={{ width: '45px', height: '45px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', flexShrink: 0, cursor: 'pointer' }}
                                        >
                                            <img src={photo} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Default Password</label>
                                <input type="text" className="form-control" value={password} onChange={e => setPassword(e.target.value)} />
                            </div>

                            <div className="form-group">
                                <label>Transport Stop (If applicable)</label>
                                <select className="form-control" value={transportStopId} onChange={e => setTransportStopId(e.target.value)}>
                                    <option value="">No Transport</option>
                                    {transportStops.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} (₹{s.busFare})</option>
                                    ))}
                                </select>
                            </div>

                        </div>
                    )}

                    {activeTab === 'academic' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                            <div className="form-group">
                                <label>Admission Date</label>
                                <input type="date" className="form-control" value={admissionDate} onChange={e => setAdmissionDate(e.target.value)} />
                            </div>


                            <div className="form-group">
                                <label>Section</label>
                                <select className="form-control" value={sectionId} onChange={e => setSectionId(e.target.value)} disabled={!classId}>
                                    <option value="">Select Section</option>
                                    {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Roll Number</label>
                                <input type="text" className="form-control" value={rollNumber} onChange={e => setRollNumber(e.target.value)} />
                            </div>

                            <div className="form-group">
                                <label>Medium</label>
                                <select className="form-control" value={medium} onChange={e => setMedium(e.target.value)}>
                                    <option value="">Select Medium</option>
                                    <option value="English">English</option>
                                    <option value="Hindi">Hindi</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Academic Year</label>
                                <input type="text" className="form-control" value={academicYear} onChange={e => setAcademicYear(e.target.value)} placeholder="e.g. 2026-2027" />
                            </div>

                            <div className="form-group">
                                <label>House (optional)</label>
                                <input type="text" className="form-control" value={house} onChange={e => setHouse(e.target.value)} />
                            </div>

                            <div className="form-group">
                                <label>Previous School Name</label>
                                <input type="text" className="form-control" value={prevSchoolName} onChange={e => setPrevSchoolName(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label>Previous Class / Course</label>
                                <input type="text" className="form-control" value={prevClass} onChange={e => setPrevClass(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label>Previous School Address</label>
                                <input type="text" className="form-control" value={prevSchoolAddress} onChange={e => setPrevSchoolAddress(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label>Previous Marks / Percentage</label>
                                <input type="text" className="form-control" value={prevMarks} onChange={e => setPrevMarks(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label>Reason of Leaving</label>
                                <input type="text" className="form-control" value={leavingReason} onChange={e => setLeavingReason(e.target.value)} placeholder="e.g. Relocating, Fees issue" />
                            </div>
                        </div>
                    )}

                    {activeTab === 'parent' && (
                        <div>
                            <h4 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 'bold' }}>Father Details</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                                <div className="form-group">
                                    <label>Father Name</label>
                                    <input type="text" className="form-control" value={fatherName} onChange={e => setFatherName(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Father Mobile</label>
                                    <input type="text" className="form-control" maxLength={10} value={fatherMobile} onChange={e => setFatherMobile(e.target.value.replace(/\D/g, ''))} />
                                </div>
                                <div className="form-group">
                                    <label>Father Occupation</label>
                                    <input type="text" className="form-control" value={fatherOccupation} onChange={e => setFatherOccupation(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Father Qualification</label>
                                    <input type="text" className="form-control" value={fatherQualification} onChange={e => setFatherQualification(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Father Email</label>
                                    <input type="email" className="form-control" value={fatherEmail} onChange={e => setFatherEmail(e.target.value)} />
                                </div>
                            </div>

                            <h4 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 'bold' }}>Mother Details</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                <div className="form-group">
                                    <label>Mother Name</label>
                                    <input type="text" className="form-control" value={motherName} onChange={e => setMotherName(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Mother Mobile</label>
                                    <input type="text" className="form-control" maxLength={10} value={motherMobile} onChange={e => setMotherMobile(e.target.value.replace(/\D/g, ''))} />
                                </div>
                                <div className="form-group">
                                    <label>Mother Occupation</label>
                                    <input type="text" className="form-control" value={motherOccupation} onChange={e => setMotherOccupation(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Mother Qualification</label>
                                    <input type="text" className="form-control" value={motherQualification} onChange={e => setMotherQualification(e.target.value)} />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'sibling' && (
                        <div>
                            <h4 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 'bold', color: '#1e40af', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem' }}>Sibling Information</h4>
                            <div className="form-group">
                                <label>Brother & Sisters Studying here (Name, Class)</label>
                                <textarea 
                                    className="form-control" 
                                    value={siblingInfo} 
                                    onChange={e => setSiblingInfo(e.target.value)} 
                                    placeholder="Enter sibling names and classes if any..." 
                                    style={{ minHeight: '120px', padding: '0.75rem' }}
                                />
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {editingId ? 'Update Student' : 'Submit Admission'}
                        </button>
                    </div>
                </form>
            </div>

            {/* List */}
            <div className="data-table-container" style={{ padding: '1.5rem' }}>
                <div className="table-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <div style={{ width: '52px', height: '52px', backgroundColor: '#eff6ff', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6', border: '1px solid #dbeafe' }}>
                            <Users size={26} strokeWidth={2.5} />
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Student Database</h2>
                                <span style={{ 
                                    backgroundColor: '#dbeafe', 
                                    color: '#1e40af', 
                                    padding: '0.2rem 0.6rem', 
                                    borderRadius: '6px', 
                                    fontSize: '0.8rem', 
                                    fontWeight: 700, 
                                    border: '1px solid #bfdbfe'
                                }}>
                                    {filteredStudents.length} Records
                                </span>
                            </div>
                            <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>Manage admissions, update details, and view records.</p>
                        </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <div style={{ position: 'relative' }}>
                            <div style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', display: 'flex' }}>
                                <Search size={16} />
                            </div>
                            <input 
                                type="text" 
                                placeholder="Search Name or SR No..." 
                                value={searchQuery} 
                                onChange={e => setSearchQuery(e.target.value)}
                                style={{ width: '260px', padding: '0.6rem 1rem 0.6rem 2.4rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem', backgroundColor: '#f8fafc', transition: 'all 0.2s', color: '#0f172a', fontWeight: 500 }}
                                onFocus={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'; }}
                                onBlur={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.boxShadow = 'none'; }}
                            />
                        </div>
                        
                        <select value={filterClassId} onChange={e => setFilterClassId(e.target.value)} style={{ padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem', backgroundColor: '#f8fafc', cursor: 'pointer', color: '#475569', fontWeight: 500, transition: 'all 0.2s' }} onFocus={e => e.currentTarget.style.borderColor = '#3b82f6'} onBlur={e => e.currentTarget.style.borderColor = '#cbd5e1'}>
                            <option value="">All Classes</option>
                            {classes.map(cls => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
                        </select>
                        
                        <select value={filterSectionId} onChange={e => setFilterSectionId(e.target.value)} disabled={!filterClassId} style={{ padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem', backgroundColor: '#f8fafc', cursor: 'pointer', color: '#475569', fontWeight: 500, opacity: !filterClassId ? 0.6 : 1, transition: 'all 0.2s' }} onFocus={e => e.currentTarget.style.borderColor = '#3b82f6'} onBlur={e => e.currentTarget.style.borderColor = '#cbd5e1'}>
                            <option value="">All Sections</option>
                            {filterSections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        
                        <select value={filterRT} onChange={e => setFilterRT(e.target.value)} style={{ padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem', backgroundColor: '#f8fafc', cursor: 'pointer', color: '#475569', fontWeight: 500, transition: 'all 0.2s' }} onFocus={e => e.currentTarget.style.borderColor = '#3b82f6'} onBlur={e => e.currentTarget.style.borderColor = '#cbd5e1'}>
                            <option value="">All RT</option>
                            <option value="Yes">RTE Yes</option>
                            <option value="No">RTE No</option>
                        </select>
                        
                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem', backgroundColor: '#f8fafc', cursor: 'pointer', color: '#475569', fontWeight: 500, transition: 'all 0.2s' }} onFocus={e => e.currentTarget.style.borderColor = '#3b82f6'} onBlur={e => e.currentTarget.style.borderColor = '#cbd5e1'}>
                            <option value="">All Status</option>
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                        
                        <button 
                            onClick={handleExportExcel}
                            style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', border: 'none', backgroundColor: '#10b981', color: 'white', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)' }}
                            onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 8px -1px rgba(16, 185, 129, 0.3)'; }}
                            onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(16, 185, 129, 0.2)'; }}
                        >
                            <Download size={16} />
                            Export Excel
                        </button>
                    </div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>S.R No</th>
                            <th>STUDENT ID</th>
                            <th>CLASS OF ADM.</th>
                            <th>NAME</th>
                            <th>EMAIL</th>
                            <th>CLASS</th>
                            <th>SECTION</th>
                            <th>STATUS</th>
                            <th>ACTION</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(() => {
                            const lastIndex = currentPage * recordsPerPage;
                            const firstIndex = lastIndex - recordsPerPage;
                            const currentRecords = filteredStudents.slice(firstIndex, lastIndex);
                            
                            return currentRecords.map((s, idx) => (
                                <tr key={s.id}>
                                    <td>{s.admissionNo || `BIPS/26/${String(filteredStudents.length - (firstIndex + idx)).padStart(3, '0')}`}</td>
                                    <td>{s.studentId || 'N/A'}</td>
                                    <td style={{ fontWeight: 'bold' }}>{s.className || 'N/A'}</td>
                                    <td>{s.name}</td>
                                    <td>{s.email}</td>
                                    <td>{s.className}</td>
                                    <td>{s.sectionName}</td>
                                    <td>
                                        <span className={`badge ${s.status === 'Inactive' ? 'badge-danger' : 'badge-success'}`}>
                                            {s.status === 'Inactive' ? 'Inactive' : 'Active'}
                                        </span>
                                    </td>
                                    <td style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <button 
                                            title="Edit"
                                            onClick={() => handleEdit(s)} 
                                            style={{ padding: '0.4rem', backgroundColor: '#eff6ff', color: '#3b82f6', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background-color 0.2s' }}
                                            onMouseOver={e => e.currentTarget.style.backgroundColor = '#dbeafe'}
                                            onMouseOut={e => e.currentTarget.style.backgroundColor = '#eff6ff'}
                                        >
                                            <Pencil size={16} />
                                        </button>
                                        <button 
                                            title="Print"
                                            onClick={() => handlePrint(s)}
                                            style={{ padding: '0.4rem', backgroundColor: '#f0fdf4', color: '#10b981', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background-color 0.2s' }}
                                            onMouseOver={e => e.currentTarget.style.backgroundColor = '#dcfce7'}
                                            onMouseOut={e => e.currentTarget.style.backgroundColor = '#f0fdf4'}
                                        >
                                            <Printer size={16} />
                                        </button>
                                        <button 
                                            onClick={() => setShowWhatsappModal(true)}
                                            title="WhatsApp"
                                            style={{ padding: '0.4rem', backgroundColor: '#f0fdf4', color: '#25D366', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background-color 0.2s' }}
                                            onMouseOver={e => e.currentTarget.style.backgroundColor = '#dcfce7'}
                                            onMouseOut={e => e.currentTarget.style.backgroundColor = '#f0fdf4'}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                            </svg>
                                        </button>
                                        <button 
                                            title="Delete"
                                            onClick={() => setStudentToDelete({id: s.id, name: s.name || 'this student'})} 
                                            style={{ padding: '0.4rem', backgroundColor: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background-color 0.2s' }}
                                            onMouseOver={e => e.currentTarget.style.backgroundColor = '#fee2e2'}
                                            onMouseOut={e => e.currentTarget.style.backgroundColor = '#fef2f2'}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ));
                        })()}
                    </tbody>
                </table>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem', marginTop: '2rem', padding: '1rem' }}>
                    {(() => {
                        const getVisiblePages = () => {
                            const pages = [];
                            let start = Math.max(1, currentPage - 1);
                            let end = Math.min(totalPages, start + 2);
                            
                            if (end === totalPages) {
                                start = Math.max(1, totalPages - 2);
                            }
                            
                            for (let i = start; i <= end; i++) {
                                pages.push(i);
                            }
                            return pages;
                        };
                        
                        const visiblePages = getVisiblePages();
                        
                        return (
                            <>
                                <button 
                                    onClick={() => setCurrentPage(1)} 
                                    disabled={currentPage === 1}
                                    style={{ padding: '0.4rem 0.7rem', border: '1px solid #e2e8f0', borderRadius: '6px', background: 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1, fontWeight: 'bold' }}
                                >
                                    «
                                </button>
                                <button 
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                                    disabled={currentPage === 1}
                                    style={{ padding: '0.4rem 0.7rem', border: '1px solid #e2e8f0', borderRadius: '6px', background: 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1, fontWeight: 'bold' }}
                                >
                                    ‹
                                </button>

                                {visiblePages[0] > 1 && <span style={{ color: '#94a3b8', padding: '0 0.2rem' }}>...</span>}

                                {visiblePages.map(p => (
                                    <button 
                                        key={p} 
                                        onClick={() => setCurrentPage(p)}
                                        style={{ 
                                            minWidth: '38px',
                                            height: '38px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            border: '1px solid #e2e8f0', 
                                            borderRadius: '6px', 
                                            backgroundColor: currentPage === p ? '#2563eb' : 'white', 
                                            color: currentPage === p ? 'white' : '#64748b',
                                            fontWeight: 'bold',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            boxShadow: currentPage === p ? '0 4px 6px -1px rgba(37, 99, 235, 0.2)' : 'none'
                                        }}
                                    >
                                        {p}
                                    </button>
                                ))}

                                {visiblePages[visiblePages.length - 1] < totalPages && <span style={{ color: '#94a3b8', padding: '0 0.2rem' }}>...</span>}

                                <button 
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                                    disabled={currentPage === totalPages}
                                    style={{ padding: '0.4rem 0.7rem', border: '1px solid #e2e8f0', borderRadius: '6px', background: 'white', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1, fontWeight: 'bold' }}
                                >
                                    ›
                                </button>
                                <button 
                                    onClick={() => setCurrentPage(totalPages)} 
                                    disabled={currentPage === totalPages}
                                    style={{ padding: '0.4rem 0.7rem', border: '1px solid #e2e8f0', borderRadius: '6px', background: 'white', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1, fontWeight: 'bold' }}
                                >
                                    »
                                </button>
                            </>
                        );
                    })()}
                </div>
            </div>
            {showPhotoModal && photo && (
                <div 
                    onClick={() => setShowPhotoModal(false)}
                    title="Click anywhere to close"
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'zoom-out' }}
                >
                    <img src={photo} alt="Student Full Preview" style={{ maxHeight: '90vh', maxWidth: '90vw', border: '4px solid white', borderRadius: '12px', objectFit: 'contain', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }} />
                </div>
            )}
            {showWhatsappModal && (
                <div 
                    onClick={() => setShowWhatsappModal(false)}
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(3px)' }}
                >
                    <div 
                        onClick={e => e.stopPropagation()}
                        style={{ backgroundColor: 'white', padding: '2.5rem 2rem', borderRadius: '16px', maxWidth: '420px', width: '90%', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', animation: 'popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
                    >
                        <div style={{ width: '64px', height: '64px', backgroundColor: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: '#16a34a' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
                        </div>
                        <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem' }}>Premium Feature Locked</h3>
                        <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '2rem' }}>
                            Direct WhatsApp integration is a premium module. Please contact your software provider to unlock and configure this feature for your school.
                        </p>
                        <button 
                            onClick={() => setShowWhatsappModal(false)}
                            style={{ width: '100%', padding: '0.85rem', backgroundColor: '#0f172a', color: 'white', border: 'none', borderRadius: '10px', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', transition: 'background-color 0.2s' }}
                            onMouseOver={e => e.currentTarget.style.backgroundColor = '#334155'}
                            onMouseOut={e => e.currentTarget.style.backgroundColor = '#0f172a'}
                        >
                            Got it, thanks
                        </button>
                    </div>
                </div>
            )}
            
            {studentToDelete && (
                <div 
                    onClick={() => setStudentToDelete(null)}
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(3px)' }}
                >
                    <div 
                        onClick={e => e.stopPropagation()}
                        style={{ backgroundColor: 'white', padding: '2.5rem 2rem', borderRadius: '16px', maxWidth: '420px', width: '90%', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', animation: 'popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
                    >
                        <div style={{ width: '64px', height: '64px', backgroundColor: '#fee2e2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: '#ef4444' }}>
                            <Trash2 size={32} strokeWidth={2.5} />
                        </div>
                        <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem' }}>Delete Student?</h3>
                        <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '2rem' }}>
                            Are you sure you want to permanently delete <strong>{studentToDelete.name}</strong>? This action cannot be undone and will remove all associated records.
                        </p>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button 
                                onClick={() => setStudentToDelete(null)}
                                style={{ flex: 1, padding: '0.85rem', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '10px', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', transition: 'background-color 0.2s' }}
                                onMouseOver={e => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                                onMouseOut={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={confirmDelete}
                                disabled={loading}
                                style={{ flex: 1, padding: '0.85rem', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '10px', fontSize: '1rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', transition: 'background-color 0.2s', opacity: loading ? 0.7 : 1 }}
                                onMouseOver={e => !loading && (e.currentTarget.style.backgroundColor = '#dc2626')}
                                onMouseOut={e => !loading && (e.currentTarget.style.backgroundColor = '#ef4444')}
                            >
                                {loading ? 'Deleting...' : 'Yes, Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Students;
