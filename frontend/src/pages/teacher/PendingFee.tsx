import React, { useState } from 'react';

const PendingFee: React.FC = () => {
    // Form states for filtering
    const [selectedClass, setSelectedClass] = useState('10');
    const [section, setSection] = useState('A');

    // Due list (dummy data as requested, view-only)
    const feeData = [
        { rollNo: 1, name: 'Aditya', totalFee: 20000, paid: 18000, pending: 2000 },
        { rollNo: 2, name: 'Rahul', totalFee: 20000, paid: 15000, pending: 5000 },
    ];

    return (
        <div>
            <h1 style={{ marginBottom: '2rem', fontSize: '1.875rem', fontWeight: 800 }}>Pending Fee List</h1>

            {/* Filters */}
            <div className="stat-card" style={{ display: 'block', marginBottom: '2rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
                        <select className="form-control" value={section} onChange={e => setSection(e.target.value)}>
                            <option value="">Select Section</option>
                            <option value="A">Section A</option>
                            <option value="B">Section B</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Fee Due Table */}
            <div className="data-table-container">
                <div className="table-header">
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Fee Due Record (Class {selectedClass || '-'} - {section || '-'})</h2>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Roll</th>
                            <th>Student</th>
                            <th>Total Fee</th>
                            <th>Paid</th>
                            <th style={{ color: '#ef4444' }}>Pending</th>
                        </tr>
                    </thead>
                    <tbody>
                        {feeData.map((data) => (
                            <tr key={data.rollNo}>
                                <td>{data.rollNo}</td>
                                <td style={{ fontWeight: 'bold' }}>{data.name}</td>
                                <td>₹{data.totalFee.toLocaleString()}</td>
                                <td style={{ color: '#10b981', fontWeight: 600 }}>₹{data.paid.toLocaleString()}</td>
                                <td style={{ color: '#ef4444', fontWeight: 'bold' }}>₹{data.pending.toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PendingFee;
