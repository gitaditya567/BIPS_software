import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, Calendar, BookOpen } from 'lucide-react';

const TeacherDashboard: React.FC = () => {
    const [stats, setStats] = useState<any>({
        myStudents: 0,
        classesAssigned: 0,
        pendingResults: 0,
    });
    const [schedule, setSchedule] = useState<any[]>([]);
    
    useEffect(() => {
        const fetchStats = async () => {
            try {
                const userRaw = localStorage.getItem('user');
                if (userRaw) {
                    const user = JSON.parse(userRaw);
                    const res = await axios.get(`/erp-api/teacher/${user.id}/dashboard-stats`);
                    if (res.data) {
                        setStats(res.data.stats);
                        setSchedule(res.data.todaySchedule || []);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch teacher stats");
            }
        };
        fetchStats();
    }, []);
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
                        <p>{stats.myStudents}</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: '#D1FAE5', color: '#10B981' }}>
                        <Calendar size={28} />
                    </div>
                    <div className="stat-info">
                        <h3>Classes Today</h3>
                        <p>{stats.classesAssigned}</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: '#FEF3C7', color: '#D97706' }}>
                        <BookOpen size={28} />
                    </div>
                    <div className="stat-info">
                        <h3>Pending Results</h3>
                        <p>{stats.pendingResults}</p>
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
                        {schedule.length === 0 ? (
                            <tr>
                                <td colSpan={4} style={{ textAlign: 'center', padding: '1rem' }}>No classes scheduled for today</td>
                            </tr>
                        ) : (
                            schedule.map((s: any, idx: number) => (
                                <tr key={idx}>
                                    <td>{s.time}</td>
                                    <td>{s.class}</td>
                                    <td>{s.subject}</td>
                                    <td><span className={`badge badge-${s.status === 'Completed' ? 'success' : s.status === 'Ongoing' ? 'warning' : 'primary'}`}>{s.status}</span></td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TeacherDashboard;
