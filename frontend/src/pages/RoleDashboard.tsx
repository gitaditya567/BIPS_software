import React, { useState, useEffect } from 'react';
import {
    Users, GraduationCap, Wallet, Calendar, TrendingUp, TrendingDown,
    ArrowRight, Bell, CheckCircle2, Clock, UserPlus, School,
    BookOpen, Bus, Shield, FileText, ArrowUpCircle, BarChart2, AlertCircle, IndianRupee
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// ─── Time Formatter ──────────────────────────────────────────────────────────
const formatTimeAgo = (dateStr: string) => {
    const diff = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return `${diff} sec ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} mins ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return `${Math.floor(diff / 86400)} days ago`;
};

const getIconElement = (iconName: string, size = 16) => {
    switch (iconName) {
        case 'IndianRupee': return <IndianRupee size={size} />;
        case 'Clock': return <Clock size={size} />;
        case 'UserPlus': return <UserPlus size={size} />;
        case 'CheckCircle2': return <CheckCircle2 size={size} />;
        default: return <AlertCircle size={size} />;
    }
};


// ─── Reusable Subcomponents ──────────────────────────────────────────────────

const StatCard = ({ title, value, icon, color, trend, isNegative }: any) => (
    <div style={{
        backgroundColor: 'white',
        padding: '1.75rem',
        borderRadius: '20px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
        border: '1px solid #edf2f7',
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform 0.2s, box-shadow 0.2s',
    }}
        onMouseOver={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 30px rgba(0,0,0,0.10)'; }}
        onMouseOut={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.05)'; }}
    >
        {/* Background decoration */}
        <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', borderRadius: '50%', backgroundColor: `${color}10` }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div style={{ backgroundColor: `${color}15`, color, padding: '0.875rem', borderRadius: '16px' }}>
                {icon}
            </div>
            {trend && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.2rem',
                    fontSize: '0.85rem', fontWeight: '700',
                    color: isNegative ? '#e53e3e' : '#38a169',
                    backgroundColor: isNegative ? '#fff5f5' : '#f0fff4',
                    padding: '0.4rem 0.6rem', borderRadius: '20px'
                }}>
                    {isNegative ? <TrendingDown size={14} /> : <TrendingUp size={14} />} {trend}
                </div>
            )}
        </div>
        <p style={{ margin: 0, color: '#718096', fontSize: '0.9rem', fontWeight: '500' }}>{title}</p>
        <h2 style={{ margin: '0.25rem 0 0 0', color: '#1a202c', fontSize: '1.75rem', fontWeight: '800' }}>{value}</h2>
    </div>
);

const SectionCard = ({ title, children }: any) => (
    <div style={{
        backgroundColor: 'white', borderRadius: '20px', padding: '2rem',
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid #edf2f7'
    }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#2d3748', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #f0f4f8' }}>
            {title}
        </h3>
        {children}
    </div>
);

const ActivityItem = ({ icon, color, title, sub }: any) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.875rem', borderRadius: '12px', transition: 'background 0.2s', cursor: 'default' }}
        onMouseOver={e => (e.currentTarget as HTMLElement).style.backgroundColor = '#f8fafc'}
        onMouseOut={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'}>
        <div style={{ backgroundColor: `${color}20`, color, padding: '0.65rem', borderRadius: '10px', flexShrink: 0 }}>{icon}</div>
        <div><p style={{ margin: 0, fontWeight: '600', color: '#2d3748', fontSize: '0.9rem' }}>{title}</p>
            <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: '#718096' }}>{sub}</p></div>
    </div>
);

const QuickLink = ({ icon, color, label, path }: any) => {
    const navigate = useNavigate();
    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
            padding: '1.25rem', borderRadius: '14px', background: `${color}10`,
            cursor: 'pointer', transition: 'all 0.2s', border: `1px solid ${color}25`
        }}
            onClick={() => path && navigate(path)}
            onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = `${color}18`; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
            onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = `${color}10`; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}>
            <div style={{ color }}>{icon}</div>
            <span style={{ fontSize: '0.78rem', fontWeight: '600', color: '#4a5568', textAlign: 'center' }}>{label}</span>
        </div>
    );
};


// ─── Role-based config ────────────────────────────────────────────────────────

const getRoleConfig = (role: string, statsData: any) => {
    switch (role) {
        case 'ADMIN':
            return {
                greeting: 'Superadmin Dashboard',
                subtitle: 'System-wide overview and management',
                accentColor: '#4a90e2',
                badge: { label: 'ADMIN', bg: '#ebf4ff', color: '#2b6cb0' },
                stats: [
                    { title: 'Total Students', value: statsData?.totalStudents || '0', icon: <GraduationCap size={22} />, color: '#4a90e2', trend: `+${statsData?.newAdmissions || 0} recent` },
                    { title: 'Total Teachers', value: statsData?.totalTeachers || '0', icon: <Users size={22} />, color: '#9f7aea', trend: '' },
                    { title: 'Monthly Collection', value: `₹${(statsData?.monthlyCollection || 0).toLocaleString()}`, icon: <Wallet size={22} />, color: '#48bb78', trend: '' },
                    { title: 'Avg. Attendance', value: `${statsData?.attendancePercentage || 0}%`, icon: <Calendar size={22} />, color: '#ed8936', trend: '' },
                ],
            };
        case 'PRINCIPAL':
            return {
                greeting: 'Principal Dashboard',
                subtitle: 'Academic performance & school overview',
                accentColor: '#805ad5',
                badge: { label: 'PRINCIPAL', bg: '#faf5ff', color: '#6b46c1' },
                stats: [
                    { title: 'Total Students', value: statsData?.totalStudents || '0', icon: <GraduationCap size={22} />, color: '#805ad5', trend: '' },
                    { title: 'Total Teachers', value: statsData?.totalTeachers || '0', icon: <Users size={22} />, color: '#4a90e2', trend: '' },
                    { title: 'Classes Running', value: '0', icon: <BookOpen size={22} />, color: '#48bb78', trend: '' },
                    { title: 'Avg. Attendance', value: `${statsData?.attendancePercentage || 0}%`, icon: <Calendar size={22} />, color: '#ed8936', trend: '' },
                ],
            };
        case 'ACCOUNTS':
            return {
                greeting: 'Accounts Dashboard',
                subtitle: 'Fee collection, dues & financial overview',
                accentColor: '#38a169',
                badge: { label: 'ACCOUNTS', bg: '#f0fff4', color: '#276749' },
                stats: [
                    { title: 'Total Collected', value: `₹${(statsData?.monthlyCollection || 0).toLocaleString()}`, icon: <Wallet size={22} />, color: '#38a169', trend: '' },
                    { title: 'Pending Dues', value: `₹${(statsData?.pendingFees || 0).toLocaleString()}`, icon: <AlertCircle size={22} />, color: '#e53e3e', trend: '' },
                    { title: 'Students with Dues', value: '0', icon: <Users size={22} />, color: '#ed8936', trend: '' },
                    { title: 'TC Issued', value: '0', icon: <GraduationCap size={22} />, color: '#4a90e2', trend: '' },
                ],
            };
        case 'TEACHER':
            return {
                greeting: 'Teacher Dashboard',
                subtitle: "Today's schedule, students & class overview",
                accentColor: '#3182ce',
                badge: { label: 'TEACHER', bg: '#ebf8ff', color: '#2c5282' },
                stats: [
                    { title: 'My Students', value: statsData?.myStudents || '0', icon: <Users size={22} />, color: '#4a90e2', trend: '' },
                    { title: 'Classes Assigned', value: statsData?.classesAssigned || '0', icon: <Calendar size={22} />, color: '#9f7aea', trend: '' },
                    { title: 'Pending Results', value: statsData?.pendingResults || '0', icon: <FileText size={22} />, color: '#ed8936', trend: '' },
                    { title: 'Attendance Marked', value: statsData?.attendanceMarked || '0/0', icon: <CheckCircle2 size={22} />, color: '#48bb78', trend: '' },
                ],
            };
        case 'TRANSPORT':
            return {
                greeting: 'Transport Dashboard',
                subtitle: 'Routes, buses & student transport overview',
                accentColor: '#d69e2e',
                badge: { label: 'TRANSPORT', bg: '#fffff0', color: '#7b6a00' },
                stats: [
                    { title: 'Total Buses', value: '0', icon: <Bus size={22} />, color: '#d69e2e', trend: '' },
                    { title: 'Total Routes', value: '0', icon: <BarChart2 size={22} />, color: '#4a90e2', trend: '' },
                    { title: 'Students Using Bus', value: '0', icon: <Users size={22} />, color: '#48bb78', trend: '' },
                    { title: 'Dues Pending', value: '₹0', icon: <Wallet size={22} />, color: '#e53e3e', trend: '' },
                ],
            };
        case 'PARENT':
        case 'STUDENT':
            return {
                greeting: role === 'PARENT' ? 'Parent Dashboard' : 'Student Dashboard',
                subtitle: role === 'PARENT' ? "Viewing your child's academic progress" : 'My attendance, fees & progress',
                accentColor: '#4a90e2',
                badge: { label: role, bg: '#ebf4ff', color: '#2b6cb0' },
                stats: [
                    { title: 'Attendance', value: statsData?.attendance || '0%', icon: <Calendar size={22} />, color: '#4a90e2', trend: '' },
                    { title: 'Fee Dues', value: statsData?.feeDues || '₹0', icon: <Wallet size={22} />, color: '#48bb78', trend: '' },
                    { title: 'Pending Assignments', value: statsData?.assignments || '0', icon: <BookOpen size={22} />, color: '#ed8936', trend: '' },
                    { title: 'Exams This Month', value: statsData?.exams || '0', icon: <FileText size={22} />, color: '#9f7aea', trend: '' },
                ],
            };
        default:
            return {
                greeting: 'Dashboard',
                subtitle: 'Welcome back!',
                accentColor: '#4a90e2',
                badge: { label: role || 'GUEST', bg: '#ebf4ff', color: '#2b6cb0' },
                stats: [],
            };
    }
};

// ─── Role-specific Quick Links ─────────────────────────────────────────────────

const getQuickLinks = (role: string) => {
    if (role === 'TEACHER') return [
        { icon: <Calendar size={22} />, color: '#4a90e2', label: 'Mark Attendance', path: '/teacher/attendance' },
        { icon: <FileText size={22} />, color: '#9f7aea', label: 'Submit Results', path: '/teacher/classes' },
        { icon: <Bell size={22} />, color: '#ed8936', label: 'Post Notice', path: '/teacher/notice' },
        { icon: <ArrowUpCircle size={22} />, color: '#48bb78', label: 'Leave Apply', path: '/teacher/leave' },
    ];
    if (role === 'ACCOUNTS') return [
        { icon: <Wallet size={22} />, color: '#38a169', label: 'Collect Fee', path: '/admin/fees' },
        { icon: <GraduationCap size={22} />, color: '#4a90e2', label: 'Issue TC', path: '/admin/tc' },
        { icon: <AlertCircle size={22} />, color: '#e53e3e', label: 'Send Reminder', path: '/admin/fees' },
        { icon: <FileText size={22} />, color: '#805ad5', label: 'Fee Report', path: '/admin/fees' },
    ];

    if (role === 'TRANSPORT') return [
        { icon: <Bus size={22} />, color: '#d69e2e', label: 'Manage Buses', path: '/admin/transport' },
        { icon: <Users size={22} />, color: '#4a90e2', label: 'Assign Students', path: '/admin/transport' },
        { icon: <Wallet size={22} />, color: '#48bb78', label: 'Collect Dues', path: '/admin/transport' },
        { icon: <BarChart2 size={22} />, color: '#9f7aea', label: 'Route Report', path: '/admin/transport' },
    ];
    if (role === 'PRINCIPAL') return [
        { icon: <Users size={22} />, color: '#805ad5', label: 'View Students', path: '/admin/students' },
        { icon: <Calendar size={22} />, color: '#4a90e2', label: 'Attendance', path: '/admin/attendance' },
        { icon: <Wallet size={22} />, color: '#48bb78', label: 'Fee Status', path: '/admin/fees' },
        { icon: <FileText size={22} />, color: '#ed8936', label: 'Report Cards', path: '/admin/report-card' },
    ];

    if (role === 'PARENT' || role === 'STUDENT') {
        const basePath = role === 'PARENT' ? '/parent' : '/student';
        return [
            { icon: <Calendar size={22} />, color: '#4a90e2', label: 'My Attendance', path: role === 'STUDENT' ? '/student/attendance' : '/parent/profile' },
            { icon: <Wallet size={22} />, color: '#48bb78', label: 'Fee Details', path: role === 'STUDENT' ? '/student/fees' : '/parent/profile' },
            { icon: <BookOpen size={22} />, color: '#9f7aea', label: 'My Marks', path: role === 'STUDENT' ? '/student/marks' : '/parent/profile' },
            { icon: <Users size={22} />, color: '#ed8936', label: 'My Profile', path: `${basePath}/profile` },
        ];
    }
    // ADMIN
    return [
        { icon: <UserPlus size={22} />, color: '#4a90e2', label: 'Add Student', path: '/admin/students' },
        { icon: <Wallet size={22} />, color: '#48bb78', label: 'Collect Fee', path: '/admin/fees' },
        { icon: <Calendar size={22} />, color: '#ed8936', label: 'Attendance', path: '/admin/attendance' },
        { icon: <Shield size={22} />, color: '#9f7aea', label: 'Role Control', path: '/admin/roles' },
        { icon: <School size={22} />, color: '#e53e3e', label: 'Classes', path: '/admin/classes' },
        { icon: <Bus size={22} />, color: '#d69e2e', label: 'Transport', path: '/admin/transport' },
    ];
};

// ─── Main Component ────────────────────────────────────────────────────────────

const RoleDashboard: React.FC = () => {
    const [user, setUser] = useState<any>(() => {
        const userRaw = localStorage.getItem('user');
        return userRaw ? JSON.parse(userRaw) : { name: 'User', role: 'ADMIN' };
    });
    
    const role: string = user.role || 'ADMIN';
    const firstName = user.name?.split(' ')[0] || 'User';

    const [statsData, setStatsData] = useState<any>({});
    const [fetchedActivities, setFetchedActivities] = useState<any[]>([]);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                if (['ADMIN', 'PRINCIPAL', 'ACCOUNTS'].includes(role)) {
                    const res = await axios.get('/api/admin/dashboard/stats');
                    if (res.data) {
                        setStatsData(res.data.stats);
                        setFetchedActivities(res.data.recentActivities || []);
                    }
                } else if (role === 'TEACHER' && user.id) {
                    // Sync Profile for Service Record
                    const profileRes = await axios.get(`/api/general/user/${user.id}`);
                    if (profileRes.data) {
                        const updatedUser = { ...user, ...profileRes.data, role: user.role };
                        setUser(updatedUser);
                        localStorage.setItem('user', JSON.stringify(updatedUser));
                    }

                    // Fetch Stats
                    const statsRes = await axios.get(`/api/teacher/${user.id}/dashboard-stats`);
                    if (statsRes.data) {
                        setStatsData(statsRes.data.stats);
                        setFetchedActivities(statsRes.data.recentActivities || []);
                    }
                } else if (['PARENT', 'STUDENT'].includes(role) && user.id) {
                    // Fetch latest profile to keep changes synced with admin panel
                    const res = await axios.get(`/api/general/user/${user.id}`);
                    if (res.data) {
                        const updatedUser = { ...user, ...res.data, role: user.role }; 
                        setUser(updatedUser);
                        localStorage.setItem('user', JSON.stringify(updatedUser));
                    }
                    
                    if (user.studentInfo?.id) {
                        const statsRes = await axios.get(`/api/general/dashboard-stats/student/${user.studentInfo.id}`);
                        if (statsRes.data) {
                            setStatsData(statsRes.data.stats);
                            setFetchedActivities(statsRes.data.recentActivities || []);
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to fetch dashboard data");
            }
        };
        fetchDashboardData();
    }, [role, user.id]);

    const config = getRoleConfig(role, statsData);
    const quickLinks = getQuickLinks(role);

    const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <div style={{ fontFamily: "'Inter', sans-serif", padding: '0.5rem 0' }}>

            {/* ── Header ── */}
            <div style={{
                background: `linear-gradient(135deg, ${config.accentColor} 0%, ${config.accentColor}bb 100%)`,
                borderRadius: '20px',
                padding: '2rem 2.5rem',
                marginBottom: '2rem',
                color: 'white',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: `0 8px 32px ${config.accentColor}40`
            }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <span style={{
                            backgroundColor: 'rgba(255,255,255,0.25)',
                            backdropFilter: 'blur(4px)',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '999px',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            letterSpacing: '0.05em'
                        }}>{config.badge.label}</span>
                    </div>
                    <h1 style={{ margin: 0, fontSize: '1.9rem', fontWeight: '800' }}>
                        Welcome back, {firstName}! 👋
                    </h1>
                    <p style={{ margin: '0.4rem 0 0', opacity: 0.85, fontSize: '1rem' }}>{config.subtitle}</p>
                    <p style={{ margin: '0.25rem 0 0', opacity: 0.7, fontSize: '0.85rem' }}>{today}</p>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.75rem' }}>
                    <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: '1rem 1.5rem', borderRadius: '16px', backdropFilter: 'blur(4px)' }}>
                        <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.8 }}>Academic Year</p>
                        <p style={{ margin: 0, fontWeight: '800', fontSize: '1.2rem' }}>2026 – 2027</p>
                    </div>
                </div>
            </div>

            {/* ── Stats Grid ── */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${Math.min(config.stats.length, 4)}, 1fr)`,
                gap: '1.25rem',
                marginBottom: '2rem'
            }}>
                {config.stats.map((s: any, i: number) => (
                    <StatCard key={i} {...s} />
                ))}
            </div>

            {/* ── Quick Links ── */}
            <SectionCard title="⚡ Quick Actions">
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${Math.min(quickLinks.length, 6)}, 1fr)`,
                    gap: '1rem'
                }}>
                    {quickLinks.map((ql: any, i: number) => (
                        <QuickLink key={i} {...ql} />
                    ))}
                </div>
            </SectionCard>

            {/* ── Activity Feed ── */}
            <div style={{ marginTop: '2rem' }}>
                <SectionCard title="🕐 Recent Activity">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {fetchedActivities.length > 0 ? fetchedActivities.map((a: any, i: number) => (
                            <ActivityItem key={i} icon={getIconElement(a.iconName, 18)} color={a.color} title={a.action} sub={`${a.user} • ${formatTimeAgo(a.time)}`} />
                        )) : <p style={{ textAlign: 'center', color: '#94a3b8', padding: '1rem' }}>No recent activities.</p>}

                    </div>
                </SectionCard>
            </div>

            {/* ── Admin-only: Upcoming Events ── */}
            {(role === 'ADMIN' || role === 'PRINCIPAL') && (
                <div style={{ marginTop: '2rem' }}>
                    <SectionCard title="📅 Upcoming Events">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {([].length > 0) ? ([].map((ev: any, i) => (
                                <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '0.75rem', borderRadius: '12px', background: '#fafafa', border: '1px solid #f0f4f8' }}>
                                    <div style={{ backgroundColor: `${ev.color}15`, color: ev.color, padding: '0.6rem 0.9rem', borderRadius: '10px', textAlign: 'center', minWidth: '60px' }}>
                                        <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>MAR</p>
                                        <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800' }}>{ev.date.split(' ')[0]}</p>
                                    </div>
                                    <div>
                                        <p style={{ margin: 0, fontWeight: '600', color: '#2d3748' }}>{ev.title}</p>
                                        <p style={{ margin: '0.15rem 0 0', fontSize: '0.83rem', color: '#718096' }}>{ev.location}</p>
                                    </div>
                                    <div style={{ marginLeft: 'auto' }}>
                                        <ArrowRight size={16} color="#cbd5e0" />
                                    </div>
                                </div>
                            ))) : <p style={{ textAlign: 'center', color: '#94a3b8', padding: '1rem' }}>No upcoming events scheduled.</p>}
                        </div>

                    </SectionCard>
                </div>
            )}

            {/* ── Student/Parent Profile Details Removed (moved to StudentProfile tab) ── */}
        </div>
    );
};

export default RoleDashboard;
