import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNotification } from '../../context/NotificationContext';

const Attendance: React.FC = () => {
    const { addNotification } = useNotification();
    const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [selectedClassId, setSelectedClassId] = useState('');
    const [sectionId, setSectionId] = useState('');

    const [classes, setClasses] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isSaved, setIsSaved] = useState(false);

    const userRaw = localStorage.getItem('user');
    const user = userRaw ? JSON.parse(userRaw) : null;
    const teacherId = user?.id;

    useEffect(() => {
        if (!teacherId) return;
        const fetchClasses = async () => {
            try {
                const res = await axios.get(`/erp-api/teacher/${teacherId}/classes`);
                setClasses(res.data);
            } catch (err) {
                console.error("Failed to fetch classes", err);
            }
        };
        fetchClasses();
    }, [teacherId]);

    const fetchStudentsForClass = async (classId: string, sectId: string, targetDate: string) => {
        if (!classId || !sectId) return;
        setLoading(true);
        try {
            const res = await axios.get(`/erp-api/teacher/students?classId=${classId}&sectionId=${sectId}&date=${targetDate}`);
            
            let hasSaved = false;
            const sList = res.data.map((s: any) => {
                if (s.existingAttendance) hasSaved = true;
                return {
                    id: s.id,
                    rollNo: s.rollNo,
                    name: s.name,
                    attendance: s.existingAttendance || 'Present'
                };
            });
            
            setStudents(sList);
            setIsSaved(hasSaved); // If any has past attendance on this date, lock it
        } catch (err) {
            console.error("Failed to fetch students", err);
        } finally {
            setLoading(false);
        }
    };

    // Re-fetch when date changes if a class is already selected
    useEffect(() => {
        if (selectedClassId && sectionId) {
            fetchStudentsForClass(selectedClassId, sectionId, date);
        }
    }, [date]);

    const handleClassChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        setIsSaved(false);
        const uniqueKey = e.target.value;
        const cls = classes.find((c) => c.id === uniqueKey);
        
        if (!cls) {
            setSelectedClassId('');
            setSectionId('');
            setStudents([]);
            return;
        }

        setSelectedClassId(cls.classId);
        setSectionId(cls.sectionId);
        fetchStudentsForClass(cls.classId, cls.sectionId, date);
    };

    const handleAttendanceChange = (studentId: string, status: string) => {
        setStudents(students.map(s => s.id === studentId ? { ...s, attendance: status } : s));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!selectedClassId || !sectionId || students.length === 0) {
            alert("No students to mark attendance for.");
            return;
        }

        try {
            const records = students.map(s => ({
                studentId: s.id,
                status: s.attendance
            }));
            
            await axios.post('/erp-api/general/attendance', {
                records,
                date
            });

            const presentCount = students.filter(s => s.attendance === 'Present').length;
            addNotification('attendance', 'Attendance Marked Successfully', `Saved ${presentCount}/${students.length} present records.`);
            setIsSaved(true);
        } catch (err) {
            console.error("Failed to save attendance", err);
            alert("Failed to save attendance.");
        }
    };

    return (
        <div>
            <h1 style={{ marginBottom: '2rem', fontSize: '1.875rem', fontWeight: 800 }}>Mark Attendance</h1>

            {/* Attendance Form Details */}
            <div className="stat-card" style={{ display: 'block', marginBottom: '2rem' }}>
                <form>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                            <label>Date</label>
                            <input 
                                type="date" 
                                className="form-control" 
                                value={date} 
                                max={new Date().toISOString().split('T')[0]}
                                onChange={e => { setDate(e.target.value); setIsSaved(false); }} 
                            />
                        </div>
                        <div className="form-group" style={{ gridColumn: 'span 3' }}>
                            <label>Assigned Class & Section</label>
                            <select className="form-control" onChange={handleClassChange}>
                                <option value="">Select Class & Section</option>
                                {classes.map((cls) => (
                                    <option key={cls.id} value={cls.id}>
                                        Class {cls.grade} - {cls.section} ({cls.subject})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </form>
            </div>

            {/* Student Attendance Table */}
            <div className="data-table-container">
                <div className="table-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Student Attendance Table</h2>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn-primary" onClick={handleSave} style={{ padding: '0.5rem 1rem' }} disabled={isSaved}>
                            {isSaved ? 'Saved' : 'Save Attendance'}
                        </button>
                    </div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>S.No.</th>
                            <th>Name</th>
                            <th style={{ textAlign: 'center' }}>Present</th>
                            <th style={{ textAlign: 'center' }}>Absent</th>
                            <th style={{ textAlign: 'center' }}>Leave</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>Loading students...</td>
                            </tr>
                        ) : students.length === 0 ? (
                            <tr>
                                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>Select a class or no students found.</td>
                            </tr>
                        ) : (
                            students.map((student, idx) => (
                                <tr key={student.id}>
                                    <td>{idx + 1}</td>
                                    <td style={{ fontWeight: 'bold' }}>{student.name}</td>
                                    <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                        <input
                                            type="radio"
                                            name={`attendance-${student.id}`}
                                            checked={student.attendance === 'Present'}
                                            onChange={() => handleAttendanceChange(student.id, 'Present')}
                                            disabled={isSaved}
                                            style={{ transform: 'scale(1.5)', cursor: isSaved ? 'not-allowed' : 'pointer', margin: 0 }}
                                        />
                                    </td>
                                    <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                        <input
                                            type="radio"
                                            name={`attendance-${student.id}`}
                                            checked={student.attendance === 'Absent'}
                                            onChange={() => handleAttendanceChange(student.id, 'Absent')}
                                            disabled={isSaved}
                                            style={{ transform: 'scale(1.5)', cursor: isSaved ? 'not-allowed' : 'pointer', margin: 0 }}
                                        />
                                    </td>
                                    <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                        <input
                                            type="radio"
                                            name={`attendance-${student.id}`}
                                            checked={student.attendance === 'Leave'}
                                            onChange={() => handleAttendanceChange(student.id, 'Leave')}
                                            disabled={isSaved}
                                            style={{ transform: 'scale(1.5)', cursor: isSaved ? 'not-allowed' : 'pointer', margin: 0 }}
                                        />
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Attendance;
