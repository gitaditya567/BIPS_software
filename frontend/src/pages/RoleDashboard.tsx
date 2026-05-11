import React, { useState, useEffect } from 'react';
import {
    Users, GraduationCap, Wallet, Calendar, TrendingUp, TrendingDown,
    ArrowRight, Bell, CheckCircle2, Clock, UserPlus, School,
    BookOpen, Bus, Shield, FileText, ArrowUpCircle, BarChart2, AlertCircle, IndianRupee,
    CheckSquare, CornerDownLeft, Check, Trash2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Chart from 'react-apexcharts';

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

// ─── Animated Number Component ───────────────────────────────────────────────
const AnimatedNumber = ({ value, isCurrency = false, suffix = '' }: { value: number, isCurrency?: boolean, suffix?: string }) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let start = 0;
        const duration = 1200; // 1.2s
        const increment = value / (duration / 16);
        if (value === 0) { setCount(0); return; }
        
        const timer = setInterval(() => {
            start += increment;
            if (start >= value) {
                setCount(value);
                clearInterval(timer);
            } else {
                setCount(Math.ceil(start));
            }
        }, 16);
        return () => clearInterval(timer);
    }, [value]);

    if (isCurrency) return <>₹{count.toLocaleString()}</>;
    return <>{count.toLocaleString()}{suffix}</>;
};


// ─── Reusable Subcomponents ──────────────────────────────────────────────────

const StatCard = ({ title, value, icon, color, trend, isNegative, sparklineData }: any) => {
    const sparklineOptions = {
        chart: { type: 'area', sparkline: { enabled: true }, animations: { enabled: true, easing: 'easeinout', speed: 800 } },
        stroke: { curve: 'smooth', width: 2 },
        fill: { 
            type: 'gradient', 
            gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0, stops: [0, 100] },
            colors: [color]
        },
        colors: [color],
        tooltip: {
            fixed: { enabled: false },
            x: { show: false },
            y: { title: { formatter: () => '' } },
            marker: { show: false }
        }
    };

    return (
        <div style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            paddingBottom: sparklineData ? '3rem' : '1.5rem',
            borderRadius: '20px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
            border: '1px solid #edf2f7',
            position: 'relative',
            overflow: 'hidden',
            transition: 'transform 0.2s, box-shadow 0.2s',
            display: 'flex',
            flexDirection: 'column',
            height: '100%'
        }}
            onMouseOver={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 30px rgba(0,0,0,0.10)'; }}
            onMouseOut={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.05)'; }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', zIndex: 1 }}>
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
            <div style={{ zIndex: 1 }}>
                <p style={{ margin: 0, color: '#718096', fontSize: '0.9rem', fontWeight: '500' }}>{title}</p>
                <h2 style={{ margin: '0.25rem 0 0 0', color: '#1a202c', fontSize: '1.75rem', fontWeight: '800' }}>{value}</h2>
            </div>
            
            {sparklineData && (
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60px', zIndex: 0 }}>
                    <Chart 
                        options={sparklineOptions as any} 
                        series={[{ data: sparklineData }]} 
                        type="area" 
                        height="100%" 
                        width="100%" 
                    />
                </div>
            )}
        </div>
    );
};

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
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.85rem',
            padding: '1.5rem 1rem', borderRadius: '18px', background: '#ffffff',
            cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
            border: `1px solid #edf2f7`,
            boxShadow: '0 4px 15px rgba(0,0,0,0.02)'
        }}
            onClick={() => path && navigate(path)}
            onMouseOver={e => { 
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-6px)'; 
                (e.currentTarget as HTMLElement).style.boxShadow = `0 14px 28px ${color}25`; 
                (e.currentTarget as HTMLElement).style.borderColor = `${color}50`;
                const iconDiv = (e.currentTarget as HTMLElement).querySelector('.icon-container') as HTMLElement;
                if(iconDiv) iconDiv.style.transform = 'scale(1.1)';
            }}
            onMouseOut={e => { 
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; 
                (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 15px rgba(0,0,0,0.02)';
                (e.currentTarget as HTMLElement).style.borderColor = '#edf2f7';
                const iconDiv = (e.currentTarget as HTMLElement).querySelector('.icon-container') as HTMLElement;
                if(iconDiv) iconDiv.style.transform = 'scale(1)';
            }}
            onMouseDown={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.96)'; }}
            onMouseUp={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-6px)'; }}
        >
            <div className="icon-container" style={{ 
                backgroundColor: `${color}15`, color, padding: '0.9rem', 
                borderRadius: '14px', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex', justifyContent: 'center', alignItems: 'center'
            }}>
                {icon}
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#2d3748', textAlign: 'center', letterSpacing: '0.01em' }}>{label}</span>
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
                    { title: 'Total Students', value: <AnimatedNumber value={statsData?.totalStudents || 0} />, icon: <GraduationCap size={22} />, color: '#4a90e2', trend: `+${statsData?.newAdmissions || 0} recent`, sparklineData: [400, 430, 450, 490, 560, 650, statsData?.totalStudents || 702] },
                    { title: 'Total Teachers', value: <AnimatedNumber value={statsData?.totalTeachers || 0} />, icon: <Users size={22} />, color: '#9f7aea', trend: '', sparklineData: [15, 16, 16, 18, 19, 21, statsData?.totalTeachers || 22] },
                    { title: 'Monthly Collection', value: <AnimatedNumber value={statsData?.monthlyCollection || 0} isCurrency={true} />, icon: <Wallet size={22} />, color: '#48bb78', trend: '', sparklineData: statsData?.dailyCollections?.map((d:any)=>d.amount) || [1000, 5000, 2000, 8000, 15000, 12000] },
                    { title: 'Avg. Attendance', value: <AnimatedNumber value={statsData?.attendancePercentage || 0} suffix="%" />, icon: <Calendar size={22} />, color: '#ed8936', trend: '', sparklineData: [85, 82, 88, 91, 95, 93, statsData?.attendancePercentage || 95] },
                ],
            };
        case 'PRINCIPAL':
            return {
                greeting: 'Principal Dashboard',
                subtitle: 'Academic performance & school overview',
                accentColor: '#805ad5',
                badge: { label: 'PRINCIPAL', bg: '#faf5ff', color: '#6b46c1' },
                stats: [
                    { title: 'Total Students', value: <AnimatedNumber value={statsData?.totalStudents || 0} />, icon: <GraduationCap size={22} />, color: '#805ad5', trend: '', sparklineData: [400, 430, 450, 490, 560, 650, statsData?.totalStudents || 702] },
                    { title: 'Total Teachers', value: <AnimatedNumber value={statsData?.totalTeachers || 0} />, icon: <Users size={22} />, color: '#4a90e2', trend: '', sparklineData: [15, 16, 16, 18, 19, 21, statsData?.totalTeachers || 22] },
                    { title: 'Classes Running', value: <AnimatedNumber value={15} />, icon: <BookOpen size={22} />, color: '#48bb78', trend: '', sparklineData: [5, 8, 12, 14, 15, 15, 15] },
                    { title: 'Avg. Attendance', value: <AnimatedNumber value={statsData?.attendancePercentage || 0} suffix="%" />, icon: <Calendar size={22} />, color: '#ed8936', trend: '', sparklineData: [85, 82, 88, 91, 95, 93, statsData?.attendancePercentage || 95] },
                ],
            };
        case 'ACCOUNTS':
            return {
                greeting: 'Accounts Dashboard',
                subtitle: 'Fee collection, dues & financial overview',
                accentColor: '#38a169',
                badge: { label: 'ACCOUNTS', bg: '#f0fff4', color: '#276749' },
                stats: [
                    { title: 'Total Collected', value: <AnimatedNumber value={statsData?.monthlyCollection || 0} isCurrency={true} />, icon: <Wallet size={22} />, color: '#38a169', trend: '', sparklineData: statsData?.dailyCollections?.map((d:any)=>d.amount) || [1000, 5000, 2000, 8000, 15000, 12000] },
                    { title: 'Pending Dues', value: <AnimatedNumber value={statsData?.pendingFees || 0} isCurrency={true} />, icon: <AlertCircle size={22} />, color: '#e53e3e', trend: '', sparklineData: [50000, 45000, 42000, 38000, 31000, statsData?.pendingFees || 25000] },
                    { title: 'Students with Dues', value: <AnimatedNumber value={0} />, icon: <Users size={22} />, color: '#ed8936', trend: '', sparklineData: [120, 115, 105, 95, 85, 70, 50] },
                    { title: 'TC Issued', value: <AnimatedNumber value={0} />, icon: <GraduationCap size={22} />, color: '#4a90e2', trend: '', sparklineData: [0, 1, 2, 2, 4, 5, 5] },
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

    // State for live clock & greeting
    const [time, setTime] = useState(new Date());
    
    // State for To-Do list
    const [todos, setTodos] = useState<{id: number, text: string, done: boolean}[]>(() => {
        const saved = localStorage.getItem('erp_todos');
        return saved ? JSON.parse(saved) : [
            { id: 1, text: 'Review pending fee receipts', done: false },
            { id: 2, text: 'Check daily attendance report', done: false }
        ];
    });
    const [newTodo, setNewTodo] = useState('');
    
    // State for FAB menu
    const [fabOpen, setFabOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        // Live Clock
        const clockTimer = setInterval(() => setTime(new Date()), 1000);
        
        const fetchDashboardData = async () => {
            try {
                if (['ADMIN', 'PRINCIPAL', 'ACCOUNTS'].includes(role)) {
                    const res = await axios.get('/erp-api/admin/dashboard/stats');
                    if (res.data) {
                        setStatsData(res.data.stats);
                        setFetchedActivities(res.data.recentActivities || []);
                    }
                } else if (role === 'TEACHER' && user.id) {
                    // Sync Profile for Service Record
                    const profileRes = await axios.get(`/erp-api/general/user/${user.id}`);
                    if (profileRes.data) {
                        const updatedUser = { ...user, ...profileRes.data, role: user.role };
                        setUser(updatedUser);
                        localStorage.setItem('user', JSON.stringify(updatedUser));
                    }

                    // Fetch Stats
                    const statsRes = await axios.get(`/erp-api/teacher/${user.id}/dashboard-stats`);
                    if (statsRes.data) {
                        setStatsData(statsRes.data.stats);
                        setFetchedActivities(statsRes.data.recentActivities || []);
                    }
                } else if (['PARENT', 'STUDENT'].includes(role) && user.id) {
                    // Fetch latest profile to keep changes synced with admin panel
                    const res = await axios.get(`/erp-api/general/user/${user.id}`);
                    if (res.data) {
                        const updatedUser = { ...user, ...res.data, role: user.role }; 
                        setUser(updatedUser);
                        localStorage.setItem('user', JSON.stringify(updatedUser));
                    }
                    
                    if (user.studentInfo?.id) {
                        const statsRes = await axios.get(`/erp-api/general/dashboard-stats/student/${user.studentInfo.id}`);
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
        return () => clearInterval(clockTimer);
    }, [role, user.id]);

    const config = getRoleConfig(role, statsData);
    const quickLinks = getQuickLinks(role);

    const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeString = time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    const hour = time.getHours();
    let greetingTime = 'Good Evening';
    let greetingIcon = '🌙';
    if (hour < 12) { greetingTime = 'Good Morning'; greetingIcon = '☀️'; }
    else if (hour < 17) { greetingTime = 'Good Afternoon'; greetingIcon = '🌤️'; }

    // To-Do list handlers
    const toggleTodo = (id: number) => {
        const newTodos = todos.map(t => t.id === id ? { ...t, done: !t.done } : t);
        setTodos(newTodos);
        localStorage.setItem('erp_todos', JSON.stringify(newTodos));
    };
    const addTodo = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && newTodo.trim()) {
            const newTodos = [...todos, { id: Date.now(), text: newTodo.trim(), done: false }];
            setTodos(newTodos);
            localStorage.setItem('erp_todos', JSON.stringify(newTodos));
            setNewTodo('');
        }
    };
    const deleteTodo = (id: number) => {
        const newTodos = todos.filter(t => t.id !== id);
        setTodos(newTodos);
        localStorage.setItem('erp_todos', JSON.stringify(newTodos));
    };

    const cssStyles = `
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
        .delay-1 { animation-delay: 0.1s; }
        .delay-2 { animation-delay: 0.2s; }
        .delay-3 { animation-delay: 0.3s; }
        .delay-4 { animation-delay: 0.4s; }
        .glass-card {
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.25);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
    `;

    return (
        <div style={{ fontFamily: "'Inter', sans-serif", padding: '0.5rem 0', overflowX: 'hidden' }}>
            <style>{cssStyles}</style>

            {/* ── Header ── */}
            <div className="animate-fade-in" style={{
                background: `linear-gradient(135deg, ${config.accentColor} 0%, ${config.accentColor}dd 100%)`,
                borderRadius: '24px',
                padding: '2.5rem 3rem',
                marginBottom: '2rem',
                color: 'white',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: `0 12px 40px ${config.accentColor}50`,
                position: 'relative',
                overflow: 'hidden'
            }}>
                {/* Abstract Geometric Background Shapes */}
                <div style={{ position: 'absolute', top: '-50%', left: '-10%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', bottom: '-40%', right: '10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

                <div style={{ position: 'relative', zIndex: 1 }}>
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
                        <span style={{ fontSize: '0.9rem', opacity: 0.9 }}>{timeString}</span>
                    </div>
                    <h1 style={{ margin: 0, fontSize: '1.9rem', fontWeight: '800' }}>
                        {greetingTime}, {firstName}! {greetingIcon}
                    </h1>
                    <p style={{ margin: '0.4rem 0 0', opacity: 0.85, fontSize: '1rem' }}>{config.subtitle}</p>
                    <p style={{ margin: '0.25rem 0 0', opacity: 0.7, fontSize: '0.85rem' }}>{today}</p>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.75rem', zIndex: 1 }}>
                    <div className="glass-card" style={{ padding: '1.2rem 1.8rem', borderRadius: '18px' }}>
                        <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Academic Year</p>
                        <p style={{ margin: '0.2rem 0 0', fontWeight: '800', fontSize: '1.4rem', textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>2026 – 2027</p>
                    </div>
                </div>
            </div>

            {/* ── Stats Grid ── */}
            <div className="animate-fade-in delay-1" style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${Math.min(config.stats.length, 4)}, 1fr)`,
                gap: '1.5rem',
                marginBottom: '2rem'
            }}>
                {config.stats.map((s: any, i: number) => (
                    <StatCard key={i} {...s} />
                ))}
            </div>

            {/* ── Quick Links ── */}
            <div className="animate-fade-in delay-2" style={{ marginBottom: '2rem' }}>
                <SectionCard title="⚡ Quick Actions">
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${Math.min(quickLinks.length, 6)}, 1fr)`,
                        gap: '1.25rem'
                    }}>
                        {quickLinks.map((ql: any, i: number) => (
                            <QuickLink key={i} {...ql} />
                        ))}
                    </div>
                </SectionCard>
            </div>

            {/* ── Dashboard Charts ── */}
            <div className="animate-fade-in delay-3" style={{ 
                display: role === 'ADMIN' ? 'grid' : 'block', 
                gridTemplateColumns: role === 'ADMIN' ? '1.8fr 1fr' : 'none', 
                gap: '1.5rem', 
                marginBottom: '2rem' 
            }}>
                
                {/* ── Monthly Collection Chart (ADMIN ONLY) ── */}
                {role === 'ADMIN' && (
                    <SectionCard title="📈 Monthly Collection Overview">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <div>
                                <h4 style={{ margin: 0, fontSize: '0.85rem', color: '#718096', fontWeight: '500' }}>Total Collected (This Year)</h4>
                                <p style={{ margin: '0.2rem 0 0', fontSize: '1.4rem', fontWeight: '800', color: '#2d3748' }}>₹{(statsData?.monthlyCollection * 8 || 125000).toLocaleString()}</p>
                            </div>
                            <select style={{ padding: '0.4rem 0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.85rem', fontWeight: '600', color: '#4a5568', outline: 'none', background: '#f8fafc' }}>
                                <option>Year 2026</option>
                                <option>Year 2025</option>
                            </select>
                        </div>
                        
                        {/* Interactive ApexCharts Bar Chart */}
                        <div style={{ height: '260px', marginTop: '1rem' }}>
                            {statsData?.dailyCollections ? (
                                <Chart 
                                    options={{
                                        chart: { 
                                            type: 'bar', 
                                            toolbar: { show: false },
                                            fontFamily: "'Inter', sans-serif",
                                            parentHeightOffset: 0,
                                        },
                                        plotOptions: { 
                                            bar: { 
                                                borderRadius: 6, 
                                                columnWidth: '65%',
                                                dataLabels: { position: 'top' }
                                            } 
                                        },
                                        dataLabels: { 
                                            enabled: false,
                                        },
                                        xaxis: { 
                                            categories: statsData.dailyCollections.map((d: any) => `${d.day} ${new Date(d.date).toLocaleString('en-IN', { month: 'short' })}`),
                                            labels: {
                                                style: { colors: '#718096', fontSize: '11px', fontWeight: 600 }
                                            },
                                            axisBorder: { show: false },
                                            axisTicks: { show: false }
                                        },
                                        yaxis: { 
                                            labels: { 
                                                formatter: (val) => val >= 1000 ? `₹${(val / 1000).toFixed(1)}k` : `₹${val}`,
                                                style: { colors: '#a0aec0', fontSize: '11px', fontWeight: 600 }
                                            } 
                                        },
                                        grid: {
                                            borderColor: '#f1f5f9',
                                            strokeDashArray: 4,
                                            yaxis: { lines: { show: true } }
                                        },
                                        colors: ['#4a90e2'],
                                        fill: {
                                            type: 'gradient',
                                            gradient: {
                                                shade: 'light',
                                                type: 'vertical',
                                                shadeIntensity: 0.25,
                                                gradientToColors: ['#357abd'],
                                                inverseColors: true,
                                                opacityFrom: 1,
                                                opacityTo: 1,
                                                stops: [0, 100]
                                            }
                                        },
                                        tooltip: { 
                                            theme: 'light',
                                            y: { formatter: (val) => `₹${val.toLocaleString()}` } 
                                        }
                                    }}
                                    series={[{ 
                                        name: 'Daily Collection', 
                                        data: statsData.dailyCollections.map((d: any) => d.amount) 
                                    }]}
                                    type="bar" 
                                    height="100%" 
                                />
                            ) : (
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#a0aec0' }}>
                                    Loading chart data...
                                </div>
                            )}
                        </div>
                    </SectionCard>
                )}

                {/* ── User Distribution Chart (ADMIN ONLY) ── */}
                {role === 'ADMIN' && (
                    <SectionCard title="👥 User Distribution">
                        <div style={{ height: '280px', marginTop: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <Chart
                                options={{
                                    chart: { type: 'donut', fontFamily: "'Inter', sans-serif" },
                                    labels: ['Students', 'Teachers', 'Staff', 'Admins'],
                                    colors: ['#4a90e2', '#9f7aea', '#48bb78', '#ed8936'],
                                    plotOptions: {
                                        pie: {
                                            donut: {
                                                size: '72%',
                                                labels: { 
                                                    show: true, 
                                                    name: { fontSize: '14px', color: '#718096' }, 
                                                    value: { fontSize: '26px', fontWeight: 800, color: '#2d3748' }, 
                                                    total: { show: true, label: 'Total Users', color: '#718096', fontSize: '13px' } 
                                                }
                                            }
                                        }
                                    },
                                    dataLabels: { enabled: false },
                                    stroke: { width: 0 },
                                    legend: { position: 'bottom', markers: { size: 12 }, itemMargin: { horizontal: 10, vertical: 5 } },
                                    tooltip: { theme: 'light' }
                                }}
                                series={[statsData?.totalStudents || 702, statsData?.totalTeachers || 22, 12, 3]}
                                type="donut"
                                height="100%"
                            />
                        </div>
                    </SectionCard>
                )}
            </div>

            {/* ── Recent Activity, Alerts & Tasks ── */}
            <div className="animate-fade-in delay-4" style={{ 
                display: role === 'ADMIN' || role === 'PRINCIPAL' ? 'grid' : 'block', 
                gridTemplateColumns: role === 'ADMIN' || role === 'PRINCIPAL' ? 'repeat(3, 1fr)' : 'none', 
                gap: '1.5rem', 
                marginBottom: '2rem',
                alignItems: 'stretch'
            }}>
                {/* ── Recent Activity ── */}
                <SectionCard title="🕐 Recent Activity">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {fetchedActivities.length > 0 ? fetchedActivities.map((a: any, i: number) => (
                            <ActivityItem key={i} icon={getIconElement(a.iconName, 18)} color={a.color} title={a.action} sub={`${a.user} • ${formatTimeAgo(a.time)}`} />
                        )) : <p style={{ textAlign: 'center', color: '#94a3b8', padding: '1rem' }}>No recent activities.</p>}
                    </div>
                </SectionCard>
                {/* ── Important Alerts ── */}
                {(role === 'ADMIN' || role === 'PRINCIPAL') && (
                    <SectionCard title="🔔 Important Alerts">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {/* Alert 1 */}
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '0.85rem', borderRadius: '12px', background: '#fff5f5', border: '1px solid #fed7d7', transition: 'all 0.2s', cursor: 'pointer' }}
                                onMouseOver={e => (e.currentTarget as HTMLElement).style.transform = 'translateX(5px)'}
                                onMouseOut={e => (e.currentTarget as HTMLElement).style.transform = 'translateX(0)'}>
                                <div style={{ backgroundColor: '#fc8181', color: 'white', padding: '0.6rem', borderRadius: '10px' }}>
                                    <AlertCircle size={20} />
                                </div>
                                <div>
                                    <p style={{ margin: 0, fontWeight: '700', color: '#c53030' }}>Pending Approvals</p>
                                    <p style={{ margin: '0.15rem 0 0', fontSize: '0.85rem', color: '#e53e3e' }}>{statsData?.pendingFees > 0 ? 'You have fee receipts pending approval.' : 'No pending fee approvals.'}</p>
                                </div>
                                <div style={{ marginLeft: 'auto' }}><ArrowRight size={16} color="#feb2b2" /></div>
                            </div>

                            {/* Alert 2 */}
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '0.85rem', borderRadius: '12px', background: '#fffaf0', border: '1px solid #feebc8', transition: 'all 0.2s', cursor: 'pointer' }}
                                onMouseOver={e => (e.currentTarget as HTMLElement).style.transform = 'translateX(5px)'}
                                onMouseOut={e => (e.currentTarget as HTMLElement).style.transform = 'translateX(0)'}>
                                <div style={{ backgroundColor: '#f6ad55', color: 'white', padding: '0.6rem', borderRadius: '10px' }}>
                                    <Bell size={20} />
                                </div>
                                <div>
                                    <p style={{ margin: 0, fontWeight: '700', color: '#dd6b20' }}>New Admissions</p>
                                    <p style={{ margin: '0.15rem 0 0', fontSize: '0.85rem', color: '#ed8936' }}>{statsData?.newAdmissions || 0} new students joined this month.</p>
                                </div>
                                <div style={{ marginLeft: 'auto' }}><ArrowRight size={16} color="#fbd38d" /></div>
                            </div>

                            {/* Alert 3 */}
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '0.85rem', borderRadius: '12px', background: '#f0fff4', border: '1px solid #c6f6d5', transition: 'all 0.2s', cursor: 'pointer' }}
                                onMouseOver={e => (e.currentTarget as HTMLElement).style.transform = 'translateX(5px)'}
                                onMouseOut={e => (e.currentTarget as HTMLElement).style.transform = 'translateX(0)'}>
                                <div style={{ backgroundColor: '#68d391', color: 'white', padding: '0.6rem', borderRadius: '10px' }}>
                                    <CheckCircle2 size={20} />
                                </div>
                                <div>
                                    <p style={{ margin: 0, fontWeight: '700', color: '#2f855a' }}>System Backup</p>
                                    <p style={{ margin: '0.15rem 0 0', fontSize: '0.85rem', color: '#38a169' }}>Database backed up successfully 2 hours ago.</p>
                                </div>
                                <div style={{ marginLeft: 'auto' }}><ArrowRight size={16} color="#9ae6b4" /></div>
                            </div>
                        </div>
                    </SectionCard>
                )}

                {/* ── To-Do List Widget ── */}
                <SectionCard title={
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div style={{ padding: '0.4rem', background: '#e0e7ff', borderRadius: '8px', color: '#4f46e5', display: 'flex' }}><CheckSquare size={18} /></div>
                        Task Board
                    </span>
                }>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
                        {/* Input Field */}
                        <div style={{ position: 'relative' }}>
                            <input 
                                type="text" 
                                value={newTodo}
                                onChange={e => setNewTodo(e.target.value)}
                                onKeyDown={addTodo}
                                placeholder="What needs to be done?"
                                style={{ 
                                    width: '100%', padding: '0.85rem 1.2rem', paddingRight: '3rem', 
                                    borderRadius: '14px', border: '2px solid #edf2f7', outline: 'none', 
                                    fontSize: '0.9rem', backgroundColor: '#f8fafc',
                                    transition: 'all 0.2s', fontWeight: '500', color: '#2d3748'
                                }}
                                onFocus={e => { (e.currentTarget.style.borderColor = '#4a90e2'); (e.currentTarget.style.backgroundColor = '#ffffff'); }}
                                onBlur={e => { (e.currentTarget.style.borderColor = '#edf2f7'); (e.currentTarget.style.backgroundColor = '#f8fafc'); }}
                            />
                            <div style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: '#a0aec0', background: '#e2e8f0', padding: '0.35rem', borderRadius: '8px', display: 'flex' }}>
                                <CornerDownLeft size={14} />
                            </div>
                        </div>
                        
                        {/* Todo Items */}
                        <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.6rem', paddingRight: '0.4rem' }}>
                            {todos.map(todo => (
                                <div key={todo.id} 
                                    style={{ 
                                        display: 'flex', alignItems: 'center', gap: '0.85rem', 
                                        padding: '0.75rem 1rem', borderRadius: '12px', 
                                        backgroundColor: todo.done ? '#f8fafc' : '#ffffff', 
                                        border: '1px solid', borderColor: todo.done ? '#f1f5f9' : '#e2e8f0', 
                                        borderLeft: todo.done ? '4px solid #cbd5e1' : '4px solid #4a90e2',
                                        transition: 'all 0.2s', cursor: 'pointer',
                                        opacity: todo.done ? 0.7 : 1
                                    }}
                                    onClick={() => toggleTodo(todo.id)}
                                    onMouseOver={e => {
                                        (e.currentTarget as HTMLElement).style.transform = 'translateX(4px)';
                                        (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.03)';
                                    }}
                                    onMouseOut={e => {
                                        (e.currentTarget as HTMLElement).style.transform = 'translateX(0)';
                                        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                                    }}
                                >
                                    <div style={{ 
                                        width: '22px', height: '22px', borderRadius: '50%', 
                                        border: `2px solid ${todo.done ? '#48bb78' : '#cbd5e1'}`, 
                                        backgroundColor: todo.done ? '#48bb78' : 'transparent', 
                                        display: 'flex', justifyContent: 'center', alignItems: 'center',
                                        transition: 'all 0.2s'
                                    }}>
                                        {todo.done && <Check size={14} color="white" strokeWidth={3} />}
                                    </div>
                                    <span style={{ 
                                        fontSize: '0.9rem', fontWeight: todo.done ? '500' : '600',
                                        color: todo.done ? '#a0aec0' : '#2d3748', 
                                        textDecoration: todo.done ? 'line-through' : 'none', 
                                        flex: 1, transition: 'all 0.2s' 
                                    }}>
                                        {todo.text}
                                    </span>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); deleteTodo(todo.id); }}
                                        style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: '0.3rem', display: 'flex' }}
                                        onMouseOver={e => (e.currentTarget as HTMLElement).style.color = '#e53e3e'}
                                        onMouseOut={e => (e.currentTarget as HTMLElement).style.color = '#cbd5e1'}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                            {todos.length === 0 && (
                                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', border: '2px dashed #e2e8f0', borderRadius: '14px', backgroundColor: '#f8fafc', marginTop: '0.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
                                        <CheckSquare size={32} color="#cbd5e1" />
                                    </div>
                                    <p style={{ margin: 0, color: '#718096', fontSize: '0.9rem', fontWeight: 600 }}>All caught up!</p>
                                    <p style={{ margin: '0.2rem 0 0', color: '#a0aec0', fontSize: '0.8rem' }}>No pending tasks for today.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </SectionCard>
            </div>

            {/* ── Student/Parent Profile Details Removed ── */}
            
            {/* ── Floating Action Button (FAB) ── */}
            {role === 'ADMIN' && (
                <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.75rem' }}>
                    {/* FAB Menu Items (shown when fabOpen is true) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', opacity: fabOpen ? 1 : 0, transform: fabOpen ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.8)', pointerEvents: fabOpen ? 'auto' : 'none', transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)', transformOrigin: 'bottom center' }}>
                        <div onClick={() => navigate('/admin/students')} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                            <span style={{ backgroundColor: 'white', padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600', color: '#4a5568', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>Add Student</span>
                            <div style={{ width: '45px', height: '45px', borderRadius: '50%', backgroundColor: '#4a90e2', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 4px 12px rgba(74, 144, 226, 0.3)' }}><UserPlus size={20} /></div>
                        </div>
                        <div onClick={() => navigate('/admin/fees')} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                            <span style={{ backgroundColor: 'white', padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600', color: '#4a5568', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>Collect Fee</span>
                            <div style={{ width: '45px', height: '45px', borderRadius: '50%', backgroundColor: '#48bb78', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 4px 12px rgba(72, 187, 120, 0.3)' }}><Wallet size={20} /></div>
                        </div>
                        <div onClick={() => alert('New Notice functionality coming soon!')} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                            <span style={{ backgroundColor: 'white', padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600', color: '#4a5568', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>Post Notice</span>
                            <div style={{ width: '45px', height: '45px', borderRadius: '50%', backgroundColor: '#ed8936', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 4px 12px rgba(237, 137, 54, 0.3)' }}><Bell size={20} /></div>
                        </div>
                    </div>
                    
                    {/* Main FAB Toggle Button */}
                    <button 
                        onClick={() => setFabOpen(!fabOpen)}
                        style={{ 
                            width: '60px', height: '60px', borderRadius: '50%', 
                            backgroundColor: '#2d3748', color: 'white', 
                            border: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center', 
                            boxShadow: '0 8px 24px rgba(45, 55, 72, 0.4)', cursor: 'pointer',
                            transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                            transform: fabOpen ? 'rotate(45deg)' : 'rotate(0)'
                        }}
                        onMouseOver={e => (e.currentTarget as HTMLElement).style.transform = fabOpen ? 'rotate(45deg) scale(1.05)' : 'scale(1.05)'}
                        onMouseOut={e => (e.currentTarget as HTMLElement).style.transform = fabOpen ? 'rotate(45deg) scale(1)' : 'scale(1)'}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                    </button>
                </div>
            )}

        </div>
    );
};

export default RoleDashboard;
