import React from 'react';
import { Users, Calendar, BookOpen } from 'lucide-react';

const TeacherDashboard: React.FC = () => {
    return (
        <div>
            <h1 style={{ marginBottom: '2rem', fontSize: '1.875rem', fontWeight: 800 }}>Welcome, Teacher</h1>

            <div className="dashboard-grid">
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: '#E0E7FF', color: '#4F46E5' }}>
                        <Users size={28} />
                    </div>
                    <div className="stat-info">
                        <h3>My Students</h3>
                        <p>120</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: '#D1FAE5', color: '#10B981' }}>
                        <Calendar size={28} />
                    </div>
                    <div className="stat-info">
                        <h3>Classes Today</h3>
                        <p>5</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: '#FEF3C7', color: '#D97706' }}>
                        <BookOpen size={28} />
                    </div>
                    <div className="stat-info">
                        <h3>Pending Results</h3>
                        <p>2</p>
                    </div>
                </div>
            </div>

            <div className="data-table-container">
                <div className="table-header">
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Today's Schedule</h2>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>Class</th>
                            <th>Subject</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>09:00 AM - 10:00 AM</td>
                            <td>10 - A</td>
                            <td>Mathematics</td>
                            <td><span className="badge badge-success">Completed</span></td>
                        </tr>
                        <tr>
                            <td>10:15 AM - 11:15 AM</td>
                            <td>9 - B</td>
                            <td>Mathematics</td>
                            <td><span className="badge badge-warning">Ongoing</span></td>
                        </tr>
                        <tr>
                            <td>12:00 PM - 01:00 PM</td>
                            <td>11 - Science</td>
                            <td>Physics</td>
                            <td><span className="badge badge-danger">Upcoming</span></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TeacherDashboard;
