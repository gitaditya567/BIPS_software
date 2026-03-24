import React from 'react';

const ServiceRecord: React.FC = () => {
    // Current Teacher Info (Dummy Data)
    const teacherProfile = {
        teacherId: 'TCH-2024-0015',
        name: 'John Doe',
        qualification: 'M.Sc. Mathematics, B.Ed.',
        department: 'Science & Mathematics',
    };

    // Joining/Relieving Details
    const records = [
        { joiningDate: '01 July 2024', position: 'Math Teacher', status: 'Active' }
    ];

    return (
        <div>
            <h1 style={{ marginBottom: '2rem', fontSize: '1.875rem', fontWeight: 800 }}>Service Record</h1>

            {/* Teacher Profile Section */}
            <div className="stat-card" style={{ display: 'block', marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1.5rem', fontWeight: 'bold' }}>Teacher Profile</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                    <div>
                        <div style={{ marginBottom: '1rem' }}>
                            <span style={{ color: '#6b7280', fontSize: '0.875rem', fontWeight: 600 }}>Teacher ID</span>
                            <p style={{ fontSize: '1.1rem', fontWeight: 600, marginTop: '0.2rem' }}>{teacherProfile.teacherId}</p>
                        </div>
                        <div>
                            <span style={{ color: '#6b7280', fontSize: '0.875rem', fontWeight: 600 }}>Name</span>
                            <p style={{ fontSize: '1.1rem', fontWeight: 600, marginTop: '0.2rem' }}>{teacherProfile.name}</p>
                        </div>
                    </div>
                    <div>
                        <div style={{ marginBottom: '1rem' }}>
                            <span style={{ color: '#6b7280', fontSize: '0.875rem', fontWeight: 600 }}>Qualification</span>
                            <p style={{ fontSize: '1.1rem', fontWeight: 600, marginTop: '0.2rem' }}>{teacherProfile.qualification}</p>
                        </div>
                        <div>
                            <span style={{ color: '#6b7280', fontSize: '0.875rem', fontWeight: 600 }}>Department</span>
                            <p style={{ fontSize: '1.1rem', fontWeight: 600, marginTop: '0.2rem' }}>{teacherProfile.department}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Joining Details Section */}
            <div className="data-table-container">
                <div className="table-header">
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Joining Details</h2>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Joining Date</th>
                            <th>Position</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {records.map((record, index) => (
                            <tr key={index}>
                                <td>{record.joiningDate}</td>
                                <td>{record.position}</td>
                                <td>
                                    <span style={{
                                        backgroundColor: '#10b981',
                                        color: 'white',
                                        padding: '0.25rem 0.6rem',
                                        borderRadius: '4px',
                                        fontSize: '0.75rem',
                                        fontWeight: 'bold'
                                    }}>
                                        {record.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ServiceRecord;
