import React, { useState } from 'react';

const MyClasses: React.FC = () => {
    const [viewClass, setViewClass] = useState<any | null>(null);

    const classes = [
        { id: 1, grade: '10', section: 'A', subject: 'Math', studentsCount: 35 },
        { id: 2, grade: '9', section: 'B', subject: 'Math', studentsCount: 32 },
    ];

    const students = [
        { rollNo: 1, name: 'Aditya', status: 'Active' },
        { rollNo: 2, name: 'Rahul', status: 'Active' },
    ];

    return (
        <div>
            <h1 style={{ marginBottom: '2rem', fontSize: '1.875rem', fontWeight: 800 }}>My Classes</h1>

            {/* Teacher Info */}
            <div className="stat-card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                <div>
                    <span style={{ color: '#6b7280', fontSize: '0.875rem', fontWeight: 600 }}>Teacher Name</span>
                    <p style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.5rem' }}>John Doe</p>
                </div>
                <div>
                    <span style={{ color: '#6b7280', fontSize: '0.875rem', fontWeight: 600 }}>Subject</span>
                    <p style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.5rem' }}>Math</p>
                </div>
                <div>
                    <span style={{ color: '#6b7280', fontSize: '0.875rem', fontWeight: 600 }}>Assigned Classes Count</span>
                    <p style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.5rem' }}>2</p>
                </div>
            </div>

            {viewClass ? (
                // View Class Data (Students)
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Class {viewClass.grade} {viewClass.section} - Students List</h2>
                        <button className="btn-secondary" onClick={() => setViewClass(null)} style={{ padding: '0.5rem 1rem', background: '#e5e7eb', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Back to Classes</button>
                    </div>
                    <div className="data-table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Roll No</th>
                                    <th>Student Name</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.map((student, idx) => (
                                    <tr key={idx}>
                                        <td>{student.rollNo}</td>
                                        <td>{student.name}</td>
                                        <td><span className="badge badge-success">{student.status}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                // Assigned Classes Table
                <div className="data-table-container">
                    <div className="table-header">
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Assigned Classes Table</h2>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>Class</th>
                                <th>Section</th>
                                <th>Subject</th>
                                <th>Students</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {classes.map((c) => (
                                <tr key={c.id}>
                                    <td>{c.grade}</td>
                                    <td>{c.section}</td>
                                    <td>{c.subject}</td>
                                    <td>{c.studentsCount}</td>
                                    <td>
                                        <button className="btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.875rem' }} onClick={() => setViewClass(c)}>
                                            View
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default MyClasses;
