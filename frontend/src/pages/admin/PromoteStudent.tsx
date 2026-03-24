import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowUpCircle, ArrowDownCircle, Search, Calendar, GraduationCap } from 'lucide-react';

interface PromotionRecord {
    id: string;
    studentName: string;
    admissionNo: string;
    oldClass: string;
    newClass: string;
    academicYear: string;
    type: 'Promote' | 'De-promote';
    date: string;
}

const PromoteStudent: React.FC = () => {
    const [students, setStudents] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [promotionHistory, setPromotionHistory] = useState<PromotionRecord[]>([
        {
            id: '1',
            studentName: 'Aditya Sharma',
            admissionNo: 'ADM/2026/001',
            oldClass: '9th',
            newClass: '10th',
            academicYear: '2026-27',
            type: 'Promote',
            date: '2026-03-09'
        }
    ]);

    // Form states
    const [selectedStudentName, setSelectedStudentName] = useState('');
    const [admissionNo, setAdmissionNo] = useState('');
    const [currentClass, setCurrentClass] = useState('');
    const [newClass, setNewClass] = useState('');
    const [academicYear, setAcademicYear] = useState('2026-27');
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [actionType, setActionType] = useState<'Promote' | 'De-promote'>('Promote');

    useEffect(() => {
        fetchStudents();
        fetchClasses();
    }, []);

    const fetchStudents = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/admin/students');
            setStudents(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchClasses = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/admin/classes');
            setClasses(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleProcessAction = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStudentId || !newClass) return alert('Fill all fields');

        const targetClass = classes.find(c => c.name === newClass);
        if (!targetClass) return alert('Invalid target class');

        try {
            await axios.post('http://localhost:5000/api/admin/students/promote', {
                studentId: selectedStudentId,
                newClassId: targetClass.id,
                actionType
            });

            const newRecord: PromotionRecord = {
                id: Date.now().toString(),
                studentName: selectedStudentName,
                admissionNo,
                oldClass: currentClass,
                newClass: newClass,
                academicYear,
                type: actionType,
                date: new Date().toISOString().split('T')[0]
            };

            setPromotionHistory([newRecord, ...promotionHistory]);
            alert(`Student ${actionType}d Successfully in Database!`);
            fetchStudents(); // Refresh student list

            // Reset
            setSelectedStudentName('');
            setAdmissionNo('');
            setCurrentClass('');
            setNewClass('');
            setSelectedStudentId('');
        } catch (err) {
            alert('Failed to process promotion in database');
        }
    };

    return (
        <div style={{ padding: '1.5rem' }}>
            <h1 style={{ marginBottom: '2rem', fontSize: '1.875rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <GraduationCap className="text-primary" size={32} />
                Student Promotion / De-promotion
            </h1>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '2rem' }}>
                {/* Form Card */}
                <div className="stat-card" style={{ display: 'block', height: 'fit-content' }}>
                    <h3 style={{ marginBottom: '1.5rem', fontWeight: 'bold' }}>Update Academic Level</h3>

                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', backgroundColor: '#f3f4f6', padding: '0.25rem', borderRadius: '8px' }}>
                        <button
                            onClick={() => setActionType('Promote')}
                            style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', backgroundColor: actionType === 'Promote' ? '#10b981' : 'transparent', color: actionType === 'Promote' ? 'white' : '#4b5563' }}
                        >
                            <ArrowUpCircle size={18} /> Promote
                        </button>
                        <button
                            onClick={() => setActionType('De-promote')}
                            style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', backgroundColor: actionType === 'De-promote' ? '#ef4444' : 'transparent', color: actionType === 'De-promote' ? 'white' : '#4b5563' }}
                        >
                            <ArrowDownCircle size={18} /> De-promote
                        </button>
                    </div>

                    <form onSubmit={handleProcessAction}>
                        <div className="form-group">
                            <label>Search Student</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    list="promote-students"
                                    className="form-control"
                                    placeholder="Enter Student Name..."
                                    value={selectedStudentName}
                                    onChange={e => {
                                        const val = e.target.value;
                                        setSelectedStudentName(val);
                                        const student = students.find(s => s.name === val || s.admissionNo === val);
                                        if (student) {
                                            setSelectedStudentId(student.id);
                                            setAdmissionNo(student.admissionNo);
                                            setCurrentClass(student.className);
                                        }
                                    }}
                                    required
                                />
                                <Search size={16} style={{ position: 'absolute', right: '12px', top: '12px', color: '#9ca3af' }} />
                                <datalist id="promote-students">
                                    {students.map(s => <option key={s.id} value={s.name}>{s.admissionNo}</option>)}
                                </datalist>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Current Class</label>
                            <input type="text" className="form-control" value={currentClass} readOnly style={{ backgroundColor: '#f9fafb' }} />
                        </div>

                        <div className="form-group">
                            <label>New Class ({actionType === 'Promote' ? 'Next' : 'Previous'})</label>
                            <select className="form-control" value={newClass} onChange={e => setNewClass(e.target.value)} required>
                                <option value="">Select New Class</option>
                                {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Academic Year</label>
                            <div style={{ position: 'relative' }}>
                                <input type="text" className="form-control" value={academicYear} onChange={e => setAcademicYear(e.target.value)} placeholder="e.g. 2026-27" />
                                <Calendar size={16} style={{ position: 'absolute', right: '12px', top: '12px', color: '#9ca3af' }} />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn-primary"
                            style={{
                                width: '100%',
                                marginTop: '1rem',
                                backgroundColor: actionType === 'Promote' ? '#10b981' : '#ef4444'
                            }}
                        >
                            Confirm {actionType}
                        </button>
                    </form>
                </div>

                {/* History Table */}
                <div className="data-table-container">
                    <div className="table-header">
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Promotion History</h2>
                    </div>
                    <table style={{ width: '100%' }}>
                        <thead>
                            <tr>
                                <th>Student</th>
                                <th>Old Class</th>
                                <th>New Class</th>
                                <th>Year</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {promotionHistory.map(rec => (
                                <tr key={rec.id}>
                                    <td title={rec.admissionNo}>
                                        <div style={{ fontWeight: '600' }}>{rec.studentName}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{rec.admissionNo}</div>
                                    </td>
                                    <td>{rec.oldClass}</td>
                                    <td style={{ fontWeight: 'bold' }}>{rec.newClass}</td>
                                    <td>{rec.academicYear}</td>
                                    <td>
                                        <span className={`badge ${rec.type === 'Promote' ? 'badge-success' : 'badge-danger'}`}>
                                            {rec.type}d
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PromoteStudent;
