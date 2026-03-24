import React from 'react';
import { Calendar, Wallet, BookOpen } from 'lucide-react';

const StudentDashboard: React.FC = () => {
    return (
        <div>
            <h1 style={{ marginBottom: '2rem', fontSize: '1.875rem', fontWeight: 800 }}>Student Dashboard</h1>

            <div className="dashboard-grid">
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: '#E0E7FF', color: '#4F46E5' }}>
                        <Calendar size={28} />
                    </div>
                    <div className="stat-info">
                        <h3>Attendance</h3>
                        <p>94%</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: '#D1FAE5', color: '#10B981' }}>
                        <Wallet size={28} />
                    </div>
                    <div className="stat-info">
                        <h3>Fees Dues</h3>
                        <p>₹0.00</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: '#FEF3C7', color: '#D97706' }}>
                        <BookOpen size={28} />
                    </div>
                    <div className="stat-info">
                        <h3>Assignments Pending</h3>
                        <p>3</p>
                    </div>
                </div>
            </div>

            <div className="data-table-container">
                <div className="table-header">
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Upcoming Exams</h2>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Subject</th>
                            <th>Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>12 Mar 2026</td>
                            <td>Mathematics</td>
                            <td>10:00 AM</td>
                        </tr>
                        <tr>
                            <td>14 Mar 2026</td>
                            <td>Science</td>
                            <td>10:00 AM</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default StudentDashboard;
