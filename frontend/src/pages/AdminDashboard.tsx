import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    Users, 
    GraduationCap, 
    Wallet, 
    Calendar, 
    TrendingUp, 
    TrendingDown,
    ArrowRight,
    Bell,
    CheckCircle2,
    Clock,
    UserPlus,
    School,
    IndianRupee,
    AlertCircle
} from 'lucide-react';

const AdminDashboard: React.FC = () => {
    const [stats, setStats] = useState({
        totalStudents: 0,
        totalTeachers: 0,
        monthlyCollection: 0,
        attendancePercentage: 0,
        pendingFees: 0,
        newAdmissions: 0
    });

    const [recentActivities, setRecentActivities] = useState<any[]>([]);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const res = await axios.get('/erp-api/admin/dashboard/stats');
                if (res.data) {
                    setStats(res.data.stats);
                    setRecentActivities(res.data.recentActivities);
                }
            } catch (err) {
                console.error("Failed to fetch dashboard data");
            }
        };
        fetchDashboardData();
    }, []);

    const formatTimeAgo = (dateStr: string) => {
        const diff = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 1000);
        if (diff < 60) return `${diff} sec ago`;
        if (diff < 3600) return `${Math.floor(diff / 60)} mins ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
        return `${Math.floor(diff / 86400)} days ago`;
    };

    const getIcon = (iconName: string, size = 16) => {
        switch (iconName) {
            case 'IndianRupee': return <IndianRupee size={size} />;
            case 'DollarSign': return <IndianRupee size={size} />; // Map old ones just in case
            case 'Clock': return <Clock size={size} />;
            case 'UserPlus': return <UserPlus size={size} />;
            case 'CheckCircle2': return <CheckCircle2 size={size} />;
            default: return <AlertCircle size={size} />;
        }
    };

    const upcomingEvents = [
        { date: '20 Mar', title: 'Annual Sports Meet', location: 'Main Ground' },
        { date: '25 Mar', title: 'Parent-Teacher Meeting', location: 'Conference Hall' },
        { date: '01 Apr', title: 'Final Examination Starts', location: 'All Classes' },
    ];

    return (
        <div style={{ padding: '1rem 0', fontFamily: "'Inter', sans-serif" }}>
            {/* Header Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: '800', color: '#1a202c', margin: 0 }}>Superadmin Dashboard</h1>
                    <p style={{ color: '#718096', marginTop: '0.4rem', fontSize: '1.1rem' }}>Welcome back, System Administrator</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ 
                        backgroundColor: 'white', 
                        padding: '0.75rem', 
                        borderRadius: '12px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        cursor: 'pointer'
                    }}>
                        <Bell size={20} color="#718096" />
                    </div>
                    <div style={{ 
                        backgroundColor: '#4a90e2', 
                        color: 'white', 
                        padding: '0.75rem 1.5rem', 
                        borderRadius: '12px', 
                        fontWeight: '600',
                        boxShadow: '0 4px 6px -1px rgba(74, 144, 226, 0.3)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                         <TrendingUp size={18} />
                         Generate Report
                    </div>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
                <StatCard 
                    title="Total Students" 
                    value={stats.totalStudents} 
                    icon={<GraduationCap size={24} />} 
                    color="#4a90e2" 
                    trend="+4.5%" 
                />
                <StatCard 
                    title="Total Teachers" 
                    value={stats.totalTeachers} 
                    icon={<Users size={24} />} 
                    color="#9f7aea" 
                    trend="+2 new" 
                />
                <StatCard 
                    title="Monthly Collection" 
                    value={`₹${stats.monthlyCollection.toLocaleString()}`} 
                    icon={<Wallet size={24} />} 
                    color="#48bb78" 
                    trend="+12%" 
                />
                <StatCard 
                    title="Avg Attendance" 
                    value={`${stats.attendancePercentage}%`} 
                    icon={<Calendar size={24} />} 
                    color="#ed8936" 
                    trend="-1.2%" 
                    isNegative
                />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                {/* Left Column: Collection Chart Simulation & Recent Activity */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {/* Collection Summary Visual */}
                    <div style={{ 
                        backgroundColor: 'white', 
                        padding: '2rem', 
                        borderRadius: '20px', 
                        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                        border: '1px solid #edf2f7'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#2d3748' }}>Collection Overview</h3>
                            <select style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none' }}>
                                <option>This Week</option>
                                <option>This Month</option>
                                <option>This Year</option>
                            </select>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1.5rem', height: '200px', paddingBottom: '1rem' }}>
                            {[40, 70, 45, 90, 65, 80, 55].map((height, i) => (
                                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{ 
                                        width: '100%', 
                                        height: `${height}%`, 
                                        backgroundColor: i === 3 ? '#4a90e2' : '#ebf4ff',
                                        borderRadius: '8px 8px 0 0',
                                        transition: 'height 1s ease'
                                    }} />
                                    <span style={{ fontSize: '0.8rem', color: '#a0aec0', fontWeight: '500' }}>
                                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div style={{ 
                        backgroundColor: 'white', 
                        padding: '2rem', 
                        borderRadius: '20px', 
                        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                        border: '1px solid #edf2f7'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#2d3748' }}>Recent Activity</h3>
                            <button style={{ color: '#4a90e2', fontWeight: '600', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                View All <ArrowRight size={16} />
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            {recentActivities.map(activity => (
                                <div key={activity.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderRadius: '12px', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                    <div style={{ 
                                        backgroundColor: `${activity.color}20`, 
                                        color: activity.color,
                                        padding: '0.75rem',
                                        borderRadius: '10px'
                                    }}>
                                        {getIcon(activity.iconName || 'AlertCircle', 16)}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ margin: 0, fontWeight: '600', color: '#2d3748' }}>{activity.action}</p>
                                        <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#718096' }}>{activity.user} • {formatTimeAgo(activity.time)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column: Key Metrics & Events */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {/* Distribution Summary */}
                    <div style={{ 
                        backgroundColor: '#2d3748', 
                        padding: '2rem', 
                        borderRadius: '20px', 
                        color: 'white',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                    }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1.5rem', opacity: 0.9 }}>School Statistics</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <MetricRow label="Boys" value="650" percentage={52} color="#4a90e2" />
                            <MetricRow label="Girls" value="600" percentage={48} color="#f687b3" />
                            <MetricRow label="Transporters" value="320" percentage={26} color="#ed8936" />
                        </div>
                        <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: '0.75rem', borderRadius: '12px' }}>
                                    <School size={24} />
                                </div>
                                <div>
                                    <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.7 }}>Affiliation Code</p>
                                    <p style={{ margin: 0, fontWeight: '700', fontSize: '1.1rem' }}>CBSE/2026/0123</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Upcoming Events */}
                    <div style={{ 
                        backgroundColor: 'white', 
                        padding: '2rem', 
                        borderRadius: '20px', 
                        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                        border: '1px solid #edf2f7'
                    }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#2d3748', marginBottom: '1.5rem' }}>Upcoming Events</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            {upcomingEvents.map((event, i) => (
                                <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                    <div style={{ 
                                        backgroundColor: '#ebf4ff', 
                                        color: '#4a90e2',
                                        padding: '0.5rem 0.75rem',
                                        borderRadius: '10px',
                                        textAlign: 'center',
                                        minWidth: '60px'
                                    }}>
                                        <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase' }}>Mar</p>
                                        <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800' }}>{event.date.split(' ')[0]}</p>
                                    </div>
                                    <div>
                                        <p style={{ margin: 0, fontWeight: '600', color: '#2d3748' }}>{event.title}</p>
                                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#718096' }}>{event.location}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Sub-components
const StatCard = ({ title, value, icon, color, trend, isNegative }: any) => (
    <div style={{ 
        backgroundColor: 'white', 
        padding: '1.75rem', 
        borderRadius: '24px', 
        boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
        border: '1px solid #edf2f7',
        position: 'relative',
        overflow: 'hidden'
    }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div style={{ 
                backgroundColor: `${color}15`, 
                color: color, 
                padding: '0.875rem', 
                borderRadius: '16px' 
            }}>
                {icon}
            </div>
            <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.2rem', 
                fontSize: '0.85rem', 
                fontWeight: '700', 
                color: isNegative ? '#e53e3e' : '#38a169',
                backgroundColor: isNegative ? '#fff5f5' : '#f0fff4',
                padding: '0.4rem 0.6rem',
                borderRadius: '20px'
            }}>
                {isNegative ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                {trend}
            </div>
        </div>
        <div>
            <p style={{ margin: 0, color: '#718096', fontSize: '0.95rem', fontWeight: '500' }}>{title}</p>
            <h2 style={{ margin: '0.25rem 0 0 0', color: '#1a202c', fontSize: '1.75rem', fontWeight: '800' }}>{value}</h2>
        </div>
    </div>
);

const MetricRow = ({ label, value, percentage, color }: any) => (
    <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
            <span style={{ opacity: 0.8 }}>{label}</span>
            <span style={{ fontWeight: '600' }}>{value}</span>
        </div>
        <div style={{ height: '6px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ width: `${percentage}%`, height: '100%', backgroundColor: color, borderRadius: '10px' }} />
        </div>
    </div>
);

export default AdminDashboard;
