import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Attendance: React.FC = () => {
    // Form states
    const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [classes, setClasses] = useState<any[]>([]);
    const [sections, setSections] = useState<any[]>([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSection, setSelectedSection] = useState('');
    const [subject, setSubject] = useState('');
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchClasses();
    }, []);

    useEffect(() => {
        if (selectedClass) {
            const cls = classes.find(c => c.id === selectedClass);
            setSections(cls?.sections || []);
            setSelectedSection('');
            setStudents([]);
        } else {
            setSections([]);
            setStudents([]);
        }
    }, [selectedClass, classes]);

    useEffect(() => {
        if (selectedClass && selectedSection) {
            fetchStudents();
        } else {
            setStudents([]);
        }
    }, [selectedSection]);

    const fetchClasses = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/admin/classes');
            setClasses(res.data);
        } catch (err) {
            console.error('Error fetching classes:', err);
        }
    };

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const res = await axios.get('http://localhost:5000/api/admin/students');
            // Filter by class and section
            const filtered = res.data.filter((s: any) => s.classId === selectedClass && s.sectionId === selectedSection);
            setStudents(filtered.map((s: any, index: number) => ({
                id: s.id,
                rollNo: s.rollNumber || index + 1,
                name: s.name,
                attendance: 'Present' // Default to present
            })));
        } catch (err) {
            console.error('Error fetching students:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAttendanceChange = (studentId: string, status: string) => {
        setStudents(students.map(s => s.id === studentId ? { ...s, attendance: status } : s));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedClass || !selectedSection || students.length === 0) {
            return alert('Please select class/section and ensure students are present.');
        }
        
        try {
            await axios.post('http://localhost:5000/api/general/attendance', {
                date,
                classId: selectedClass,
                sectionId: selectedSection,
                subject,
                records: students.map(s => ({ studentId: s.id, status: s.attendance }))
            });
            alert('Attendance records saved successfully in MongoDB!');
        } catch (err) {
            alert('Failed to save attendance');
        }
    };

    const handleEdit = (e: React.FormEvent) => {
        e.preventDefault();
        alert('Edit Mode (Backend Integration Pending)');
    };

    return (
        <div>
            <h1 style={{ marginBottom: '2rem', fontSize: '1.875rem', fontWeight: 800 }}>Mark Attendance (Admin)</h1>

            {/* Attendance Form Details */}
            <div className="stat-card" style={{ display: 'block', marginBottom: '2rem' }}>
                <form>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                            <label>Date</label>
                            <input type="date" className="form-control" value={date} onChange={e => setDate(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label>Class</label>
                            <select className="form-control" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                                <option value="">Select Class</option>
                                {classes.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Section</label>
                            <select className="form-control" value={selectedSection} onChange={e => setSelectedSection(e.target.value)} disabled={!selectedClass}>
                                <option value="">Select Section</option>
                                {sections.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Subject (Optional)</label>
                            <input type="text" className="form-control" value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Mathematics" />
                        </div>
                    </div>
                </form>
            </div>

            {/* Student Attendance Table */}
            <div className="data-table-container">
                <div className="table-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Student Attendance Table</h2>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn-secondary" onClick={handleEdit} style={{ background: '#f59e0b', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                            Edit Attendance
                        </button>
                        <button className="btn-primary" onClick={handleSave} style={{ padding: '0.5rem 1rem' }} disabled={students.length === 0 || loading}>
                            {loading ? 'Loading...' : 'Save Attendance'}
                        </button>
                    </div>
                </div>
                {students.length > 0 ? (
                    <table>
                        <thead>
                            <tr>
                                <th>Roll</th>
                                <th>Name</th>
                                <th style={{ textAlign: 'center' }}>Present</th>
                                <th style={{ textAlign: 'center' }}>Absent</th>
                                <th style={{ textAlign: 'center' }}>Leave</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.map((student) => (
                                <tr key={student.id}>
                                    <td>{student.rollNo}</td>
                                    <td style={{ fontWeight: 'bold' }}>{student.name}</td>
                                    <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                        <input
                                            type="radio"
                                            name={`attendance-${student.id}`}
                                            checked={student.attendance === 'Present'}
                                            onChange={() => handleAttendanceChange(student.id, 'Present')}
                                            style={{ transform: 'scale(1.5)', cursor: 'pointer', margin: 0 }}
                                        />
                                    </td>
                                    <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                        <input
                                            type="radio"
                                            name={`attendance-${student.id}`}
                                            checked={student.attendance === 'Absent'}
                                            onChange={() => handleAttendanceChange(student.id, 'Absent')}
                                            style={{ transform: 'scale(1.5)', cursor: 'pointer', margin: 0 }}
                                        />
                                    </td>
                                    <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                        <input
                                            type="radio"
                                            name={`attendance-${student.id}`}
                                            checked={student.attendance === 'Leave'}
                                            onChange={() => handleAttendanceChange(student.id, 'Leave')}
                                            style={{ transform: 'scale(1.5)', cursor: 'pointer', margin: 0 }}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#6B7280' }}>
                        {selectedClass && selectedSection ? 'No students found in this class/section.' : 'Please select a class and section to view students.'}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Attendance;
