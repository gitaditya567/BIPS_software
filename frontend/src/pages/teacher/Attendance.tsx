import React, { useState } from 'react';
import { useNotification } from '../../context/NotificationContext';

const Attendance: React.FC = () => {
    const { addNotification } = useNotification();
    // Form states
    const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [selectedClass, setSelectedClass] = useState('');
    const [section, setSection] = useState('');
    const [subject, setSubject] = useState('');

    // Attendance students list
    const [students, setStudents] = useState([
        { rollNo: 1, name: 'Aditya', attendance: 'Present' },
        { rollNo: 2, name: 'Rahul', attendance: 'Absent' },
    ]);

    const handleAttendanceChange = (rollNo: number, status: string) => {
        setStudents(students.map(s => s.rollNo === rollNo ? { ...s, attendance: status } : s));
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        const presentCount = students.filter(s => s.attendance === 'Present').length;
        addNotification('attendance', 'Attendance Marked', `Class ${selectedClass || ''}-${section || ''}: ${presentCount}/${students.length} students present.`);
    };

    const handleEdit = (e: React.FormEvent) => {
        e.preventDefault();
        alert('Edit Mode Enabled (Frontend Only)');
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
                            <input type="date" className="form-control" value={date} onChange={e => setDate(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label>Class</label>
                            <select className="form-control" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                                <option value="">Select Class</option>
                                <option value="9">Class 9</option>
                                <option value="10">Class 10</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Section</label>
                            <input type="text" className="form-control" value={section} onChange={e => setSection(e.target.value)} placeholder="e.g. A" />
                        </div>
                        <div className="form-group">
                            <label>Subject</label>
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
                        <button className="btn-primary" onClick={handleSave} style={{ padding: '0.5rem 1rem' }}>
                            Save Attendance
                        </button>
                    </div>
                </div>
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
                            <tr key={student.rollNo}>
                                <td>{student.rollNo}</td>
                                <td style={{ fontWeight: 'bold' }}>{student.name}</td>
                                <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                    <input
                                        type="radio"
                                        name={`attendance-${student.rollNo}`}
                                        checked={student.attendance === 'Present'}
                                        onChange={() => handleAttendanceChange(student.rollNo, 'Present')}
                                        style={{ transform: 'scale(1.5)', cursor: 'pointer', margin: 0 }}
                                    />
                                </td>
                                <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                    <input
                                        type="radio"
                                        name={`attendance-${student.rollNo}`}
                                        checked={student.attendance === 'Absent'}
                                        onChange={() => handleAttendanceChange(student.rollNo, 'Absent')}
                                        style={{ transform: 'scale(1.5)', cursor: 'pointer', margin: 0 }}
                                    />
                                </td>
                                <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                    <input
                                        type="radio"
                                        name={`attendance-${student.rollNo}`}
                                        checked={student.attendance === 'Leave'}
                                        onChange={() => handleAttendanceChange(student.rollNo, 'Leave')}
                                        style={{ transform: 'scale(1.5)', cursor: 'pointer', margin: 0 }}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Attendance;
