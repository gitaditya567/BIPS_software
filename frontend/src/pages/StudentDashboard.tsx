import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, Wallet, BookOpen } from 'lucide-react';

const StudentDashboard: React.FC = () => {
    const [stats, setStats] = useState<any>({
        attendance: '0%',
        feeDues: '₹0',
        assignments: '0',
        exams: '0'
    });
    const [upcomingExams, setUpcomingExams] = useState<any[]>([]);
    
    useEffect(() => {
        const fetchStats = async () => {
            try {
                const userRaw = localStorage.getItem('user');
                if (userRaw) {
                    const user = JSON.parse(userRaw);
                    const studentId = user.studentInfo?.id;
                    if (studentId) {
                        const res = await axios.get(`/erp-api/general/dashboard-stats/student/${studentId}`);
                        if (res.data) {
                            setStats(res.data.stats);
                            setUpcomingExams(res.data.upcomingExams || []);
                        }
                    }
                }
            } catch (error) {
                console.error("Failed to fetch student stats");
            }
        };
        fetchStats();
    }, []);
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
                        <p>{stats.attendance}</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: '#D1FAE5', color: '#10B981' }}>
                        <Wallet size={28} />
                    </div>
                    <div className="stat-info">
                        <h3>Fees Dues</h3>
                        <p>{stats.feeDues}</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: '#FEF3C7', color: '#D97706' }}>
                        <BookOpen size={28} />
                    </div>
                    <div className="stat-info">
                        <h3>Assignments Pending</h3>
                        <p>{stats.assignments}</p>
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
                        {upcomingExams.length === 0 ? (
                            <tr>
                                <td colSpan={3} style={{ textAlign: 'center', padding: '1rem' }}>No upcoming exams scheduled</td>
                            </tr>
                        ) : (
                            upcomingExams.map((exam: any, idx: number) => (
                                <tr key={idx}>
                                    <td>{exam.date}</td>
                                    <td>{exam.subject}</td>
                                    <td>{exam.time}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default StudentDashboard;
