import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, UserCheck, AlertTriangle, UserX, Clock } from 'lucide-react';

const MyAttendance: React.FC = () => {
    const userRaw = localStorage.getItem('user');
    const user = userRaw ? JSON.parse(userRaw) : null;
    const studentInfo = user?.studentInfo;

    const [records, setRecords] = useState<any[]>([]);
    
    useEffect(() => {
        if (studentInfo) {
            fetchAttendance();
        }
    }, [studentInfo]);

    const fetchAttendance = async () => {
        try {
            const res = await axios.get(`/api/general/attendance/${studentInfo.id}`);
            setRecords(res.data);
        } catch (error) {
            console.error("Error fetching attendance", error);
        }
    };

    const totalDays = records.length;
    const presentDays = records.filter(r => r.status === 'Present').length;
    const absentDays = records.filter(r => r.status === 'Absent').length;
    const leaveDays = records.filter(r => r.status === 'Leave').length;
    const percentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

    if (!studentInfo) return <div style={{ padding: '2rem' }}>Loading or User not found...</div>;

    return (
        <div style={{ fontFamily: "'Inter', sans-serif" }}>
            <h1 style={{ marginBottom: '2rem', fontSize: '1.875rem', fontWeight: 800 }}>Student Attendance Overview</h1>

            {/* ── Top Stats Cards ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
                <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: '1px solid #edf2f7', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ width: '4px', height: '100%', backgroundColor: '#3182ce', position: 'absolute', left: 0, top: 0 }}></div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#718096', fontWeight: 700, textTransform: 'uppercase' }}>Attendance %</p>
                            <h2 style={{ margin: '0.5rem 0 0', fontSize: '2rem', fontWeight: 800, color: '#2d3748' }}>{totalDays > 0 ? percentage : 100}%</h2>
                        </div>
                        <div style={{ backgroundColor: '#ebf8ff', padding: '0.75rem', borderRadius: '12px', color: '#3182ce' }}>
                            <Calendar size={24} />
                        </div>
                    </div>
                </div>

                <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: '1px solid #edf2f7', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ width: '4px', height: '100%', backgroundColor: '#48bb78', position: 'absolute', left: 0, top: 0 }}></div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#718096', fontWeight: 700, textTransform: 'uppercase' }}>Classes Present</p>
                            <h2 style={{ margin: '0.5rem 0 0', fontSize: '2rem', fontWeight: 800, color: '#2f855a' }}>{presentDays}</h2>
                        </div>
                        <div style={{ backgroundColor: '#f0fff4', padding: '0.75rem', borderRadius: '12px', color: '#48bb78' }}>
                            <UserCheck size={24} />
                        </div>
                    </div>
                </div>

                <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: '1px solid #edf2f7', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ width: '4px', height: '100%', backgroundColor: '#e53e3e', position: 'absolute', left: 0, top: 0 }}></div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#718096', fontWeight: 700, textTransform: 'uppercase' }}>Classes Absent</p>
                            <h2 style={{ margin: '0.5rem 0 0', fontSize: '2rem', fontWeight: 800, color: '#c53030' }}>{absentDays}</h2>
                        </div>
                        <div style={{ backgroundColor: '#fff5f5', padding: '0.75rem', borderRadius: '12px', color: '#e53e3e' }}>
                            <UserX size={24} />
                        </div>
                    </div>
                </div>

                <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: '1px solid #edf2f7', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ width: '4px', height: '100%', backgroundColor: '#d69e2e', position: 'absolute', left: 0, top: 0 }}></div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#718096', fontWeight: 700, textTransform: 'uppercase' }}>On Leave</p>
                            <h2 style={{ margin: '0.5rem 0 0', fontSize: '2rem', fontWeight: 800, color: '#b7791f' }}>{leaveDays}</h2>
                        </div>
                        <div style={{ backgroundColor: '#fffff0', padding: '0.75rem', borderRadius: '12px', color: '#d69e2e' }}>
                            <AlertTriangle size={24} />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Attendance Log Table ── */}
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #edf2f7', padding: '2rem', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid #edf2f7', paddingBottom: '1rem' }}>
                    <div style={{ backgroundColor: '#f7fafc', color: '#4a5568', padding: '0.5rem', borderRadius: '8px' }}>
                        <Clock size={20} />
                    </div>
                    <h3 style={{ margin: 0, fontWeight: 700, color: '#2d3748' }}>Recent Attendance History</h3>
                </div>

                {records.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem 0', color: '#a0aec0' }}>
                        <Calendar size={40} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                        <p style={{ margin: 0, fontSize: '0.95rem' }}>No attendance records found yet.</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ color: '#718096', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    <th style={{ padding: '1rem 0.5rem', borderBottom: '2px solid #edf2f7' }}>Date</th>
                                    <th style={{ padding: '1rem 0.5rem', borderBottom: '2px solid #edf2f7' }}>Day</th>
                                    <th style={{ padding: '1rem 0.5rem', borderBottom: '2px solid #edf2f7' }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.map((item) => {
                                    const recordDate = new Date(item.date);
                                    let statusColor = '#3182ce';
                                    let statusBg = '#ebf8ff';
                                    
                                    if (item.status === 'Absent') {
                                        statusColor = '#e53e3e';
                                        statusBg = '#fff5f5';
                                    } else if (item.status === 'Leave') {
                                        statusColor = '#d69e2e';
                                        statusBg = '#fffff0';
                                    } else if (item.status === 'Present') {
                                        statusColor = '#38a169';
                                        statusBg = '#f0fff4';
                                    }

                                    return (
                                        <tr key={item.id} style={{ borderBottom: '1px solid #edf2f7', transition: 'background 0.2s' }}>
                                            <td style={{ padding: '1rem 0.5rem', fontSize: '0.95rem', color: '#4a5568', fontWeight: 600 }}>
                                                {recordDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </td>
                                            <td style={{ padding: '1rem 0.5rem', fontSize: '0.85rem', color: '#718096' }}>
                                                {recordDate.toLocaleDateString('en-GB', { weekday: 'long' })}
                                            </td>
                                            <td style={{ padding: '1rem 0.5rem' }}>
                                                <span style={{ 
                                                    padding: '0.35rem 1rem', 
                                                    borderRadius: '20px', 
                                                    fontSize: '0.8rem', 
                                                    fontWeight: 700,
                                                    backgroundColor: statusBg,
                                                    color: statusColor,
                                                    border: `1px solid ${statusColor}30`
                                                }}>
                                                    {item.status}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyAttendance;
