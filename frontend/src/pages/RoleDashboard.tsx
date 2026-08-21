import React, { useState, useEffect } from 'react';
import {
    Users, GraduationCap, Wallet, Calendar, TrendingUp, TrendingDown,
    ArrowRight, Bell, CheckCircle2, Clock, UserPlus, School,
    BookOpen, Bus, Shield, FileText, ArrowUpCircle, BarChart2, AlertCircle, IndianRupee,
    CheckSquare, CornerDownLeft, Check, Trash2, Download, ChevronRight, ChevronDown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Chart from 'react-apexcharts';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

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

    if (isCurrency) return <>₹{count.toLocaleString('en-IN')}</>;
    return <>{count.toLocaleString('en-IN')}{suffix}</>;
};


// ─── Reusable Subcomponents ──────────────────────────────────────────────────

const StatCard = ({ title, value, icon, color, trend, isNegative, sparklineData, tooltip }: any) => {
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
        <div title={tooltip} style={{
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

const SectionCard = ({ title, action, children }: any) => (
    <div style={{
        backgroundColor: 'white', borderRadius: '20px', padding: '2rem',
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid #edf2f7'
    }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #f0f4f8', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#2d3748', margin: 0 }}>
                {title}
            </h3>
            {action}
        </div>
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

const getRoleConfig = (role: string, statsData: any, revenueData?: any) => {
    switch (role) {
        case 'ADMIN':
        case 'ACCOUNTS':
        case 'PRINCIPAL':
            return {
                greeting: role === 'ADMIN' ? 'Superadmin Dashboard' : role === 'ACCOUNTS' ? 'Accounts Dashboard' : 'Principal Dashboard',
                subtitle: role === 'ADMIN' ? 'System-wide overview and management' : role === 'ACCOUNTS' ? 'Fee collection, dues & financial overview' : 'Academic performance & school overview',
                accentColor: role === 'ADMIN' ? '#4a90e2' : role === 'ACCOUNTS' ? '#38a169' : '#805ad5',
                badge: { 
                    label: role, 
                    bg: role === 'ADMIN' ? '#ebf4ff' : role === 'ACCOUNTS' ? '#f0fff4' : '#faf5ff', 
                    color: role === 'ADMIN' ? '#2b6cb0' : role === 'ACCOUNTS' ? '#276749' : '#6b46c1' 
                },
                stats: [
                    { title: 'Total Students', value: <AnimatedNumber value={revenueData?.summary?.totalStudents || statsData?.totalStudents || 0} />, icon: <GraduationCap size={22} />, color: '#4a90e2', trend: `+${statsData?.newAdmissions || 0} recent`, tooltip: 'Total number of active students currently enrolled in the selected academic session.' },
                    { title: 'Expected Revenue (Year)', value: <AnimatedNumber value={revenueData?.summary?.totalExpectedRevenue || 0} isCurrency={true} />, icon: <Wallet size={22} />, color: '#9f7aea', trend: '', tooltip: 'Total expected fee collection for the entire academic session (12 months), including tuition, transport, and one-time fees.' },
                    { title: 'Total Collected', value: <AnimatedNumber value={revenueData?.summary?.totalCollected || 0} isCurrency={true} />, icon: <Wallet size={22} />, color: '#48bb78', trend: '', tooltip: 'Total fee amount that has been successfully collected and approved in the current academic session so far.' },
                    { title: 'Total Outstanding', value: <AnimatedNumber value={revenueData?.summary?.totalOutstanding || 0} isCurrency={true} />, icon: <AlertCircle size={22} />, color: '#e53e3e', trend: '', tooltip: 'Total pending dues for the entire academic session. Calculated as: Expected Revenue - Total Collected - Total Concessions.' },
                    { title: 'Concessions Given', value: <AnimatedNumber value={revenueData?.summary?.totalConcessions || 0} isCurrency={true} />, icon: <TrendingDown size={22} />, color: '#ed8936', trend: '', tooltip: 'Total amount of discounts and fee concessions given to students in the current academic session.' },
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
    const navigate = useNavigate();
    const [user, setUser] = useState<any>(() => {
        const userRaw = localStorage.getItem('user');
        return userRaw ? JSON.parse(userRaw) : { name: 'User', role: 'ADMIN' };
    });
    
    const role: string = user.role || 'ADMIN';
    const firstName = user.name?.split(' ')[0] || 'User';

    useEffect(() => {
        if (role === 'ACCOUNTS2') {
            navigate('/admin/fees');
        }
    }, [role, navigate]);

    const [statsData, setStatsData] = useState<any>({});
    const [fetchedActivities, setFetchedActivities] = useState<any[]>([]);
    const [revenueData, setRevenueData] = useState<any | null>(null);
    const [expandedClassId, setExpandedClassId] = useState<string | null>(null);
    const [downloadingClassId, setDownloadingClassId] = useState<string | null>(null);

    const downloadClassExcelReport = async (classId: string, className: string) => {
        try {
            setDownloadingClassId(classId);
            const res = await axios.get(`/erp-api/fees/dashboard/revenue/class/${classId}`);
            if (!res.data || !res.data.students || res.data.students.length === 0) {
                alert("No students found in this class to export.");
                setDownloadingClassId(null);
                return;
            }

            const studentsData = res.data.students;

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet(`${className} Detailed Report`);

            const oneTimeHeads = new Set<string>();
            const monthlyHeads = new Set<string>();

            studentsData.forEach((s: any) => {
                if (s.oneTime?.details) {
                    s.oneTime.details.forEach((item: any) => oneTimeHeads.add(item.name));
                }
                if (s.monthly?.details) {
                    s.monthly.details.forEach((item: any) => monthlyHeads.add(item.name));
                }
            });

            const oneTimeHeadsList = Array.from(oneTimeHeads);
            const monthlyHeadsList = Array.from(monthlyHeads);

            // Filter out heads that have 0 expected values across ALL students in this class
            const activeOneTimeHeads = oneTimeHeadsList.filter(head => {
                return studentsData.some((s: any) => {
                    const detail = s.oneTime?.details?.find((d: any) => d.name === head);
                    return detail && Number(detail.expected) > 0;
                });
            });

            const activeMonthlyHeads = monthlyHeadsList.filter(head => {
                return studentsData.some((s: any) => {
                    const detail = s.monthly?.details?.find((d: any) => d.name === head);
                    return detail && Number(detail.expected) > 0;
                });
            });

            // Columns structure
            const cols = [
                { header: 'Roll No', key: 'rollNo', width: 12 },
                { header: 'Admission No', key: 'admNo', width: 15 },
                { header: 'Student Name', key: 'name', width: 25 },
                { header: 'RTE Status', key: 'rte', width: 15 },
                { header: 'Previous Session Dues (Expected)', key: 'prevExpected', width: 25 },
                { header: 'Previous Session Dues (Paid)', key: 'prevPaid', width: 25 },
                { header: 'Previous Session Dues (Due)', key: 'prevBalance', width: 25 },
                { header: 'Transport Fee (Yearly Expected)', key: 'transExpected', width: 25 },
                { header: 'Transport Fee (Yearly Paid)', key: 'transPaid', width: 25 },
                { header: 'Transport Fee (Yearly Due)', key: 'transBalance', width: 25 },
            ];

            activeOneTimeHeads.forEach(head => {
                cols.push(
                    { header: `${head} (Expected)`, key: `ot_${head}_exp`, width: 22 },
                    { header: `${head} (Paid)`, key: `ot_${head}_paid`, width: 22 },
                    { header: `${head} (Due)`, key: `ot_${head}_bal`, width: 22 }
                );
            });

            activeMonthlyHeads.forEach(head => {
                cols.push(
                    { header: `${head} Yearly (Expected)`, key: `m_${head}_exp`, width: 22 },
                    { header: `${head} Yearly (Paid)`, key: `m_${head}_paid`, width: 22 },
                    { header: `${head} Yearly (Due)`, key: `m_${head}_bal`, width: 22 }
                );
            });

            cols.push(
                { header: 'Total Expected (Annual Gross)', key: 'grossExpected', width: 28 },
                { header: 'Total Paid (Annual Net)', key: 'grossPaid', width: 25 },
                { header: 'Total Concessions (Discount)', key: 'grossDiscount', width: 25 },
                { header: 'Net Outstanding Dues', key: 'grossOutstanding', width: 25 }
            );

            // 1. Report Header & Metadata
            const totalColsCount = cols.length;
            const getColLetter = (index: number): string => {
                let temp = index;
                let letter = '';
                while (temp >= 0) {
                    letter = String.fromCharCode((temp % 26) + 65) + letter;
                    temp = Math.floor(temp / 26) - 1;
                }
                return letter;
            };
            const lastColLetter = getColLetter(totalColsCount - 1);

            worksheet.mergeCells(`A1:${lastColLetter}1`);
            const row1Cell = worksheet.getCell('A1');
            row1Cell.value = 'BIPS SENIOR SECONDARY SCHOOL';
            row1Cell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
            row1Cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
            row1Cell.alignment = { vertical: 'middle', horizontal: 'center' };
            worksheet.getRow(1).height = 40;

            worksheet.mergeCells(`A2:${lastColLetter}2`);
            const row2Cell = worksheet.getCell('A2');
            row2Cell.value = 'Detailed Class-Wise Revenue Ledger';
            row2Cell.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF334155' } };
            row2Cell.alignment = { vertical: 'middle', horizontal: 'center' };
            worksheet.getRow(2).height = 25;

            const activeSessionStr = localStorage.getItem('activeSession') || '2026-2027';
            worksheet.mergeCells(`A3:${lastColLetter}3`);
            const row3Cell = worksheet.getCell('A3');
            row3Cell.value = `Academic Session: ${activeSessionStr}  |  Class: ${className}  |  Generated On: ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
            row3Cell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF64748B' } };
            row3Cell.alignment = { vertical: 'middle', horizontal: 'center' };
            worksheet.getRow(3).height = 20;

            worksheet.getRow(4).height = 15;

            worksheet.getRow(5).values = cols.map(c => c.header);
            worksheet.getRow(5).height = 28;

            cols.forEach((col, idx) => {
                const cell = worksheet.getRow(5).getCell(idx + 1);
                cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
                
                if (col.key.endsWith('exp') || col.key === 'grossExpected') {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF475569' } };
                } else if (col.key.endsWith('paid') || col.key === 'grossPaid') {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF15803D' } };
                } else if (col.key.endsWith('bal') || col.key === 'grossOutstanding' || col.key.endsWith('Due') || col.key.endsWith('Balance')) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB91C1C' } };
                } else {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
                }
                
                cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            });

            const startRow = 6;
            studentsData.forEach((s: any) => {
                const rowData: any = {};
                rowData[cols[0].key || 'rollNo'] = s.rollNumber;
                rowData[cols[1].key || 'admNo'] = s.admissionNo;
                rowData[cols[2].key || 'name'] = s.studentName;
                rowData[cols[3].key || 'rte'] = s.isRT ? 'RTE' : 'Regular';
                rowData[cols[4].key || 'prevExpected'] = Number(s.prevDues.expected);
                rowData[cols[5].key || 'prevPaid'] = Number(s.prevDues.paid);
                rowData[cols[6].key || 'prevBalance'] = Number(s.prevDues.balance);
                rowData[cols[7].key || 'transExpected'] = Number(s.transport.expected);
                rowData[cols[8].key || 'transPaid'] = Number(s.transport.paid);
                rowData[cols[9].key || 'transBalance'] = Number(s.transport.balance);

                activeOneTimeHeads.forEach(head => {
                    const detail = s.oneTime?.details?.find((d: any) => d.name === head);
                    rowData[`ot_${head}_exp`] = detail ? Number(detail.expected) : 0;
                    rowData[`ot_${head}_paid`] = detail ? Number(detail.paid) : 0;
                    rowData[`ot_${head}_bal`] = detail ? Number(detail.balance) : 0;
                });

                activeMonthlyHeads.forEach(head => {
                    const detail = s.monthly?.details?.find((d: any) => d.name === head);
                    rowData[`m_${head}_exp`] = detail ? Number(detail.expected) : 0;
                    rowData[`m_${head}_paid`] = detail ? Number(detail.paid) : 0;
                    rowData[`m_${head}_bal`] = detail ? Number(detail.balance) : 0;
                });

                rowData['grossExpected'] = Number(s.grossSummary.expected);
                rowData['grossPaid'] = Number(s.grossSummary.paid);
                rowData['grossDiscount'] = Number(s.grossSummary.discount);
                rowData['grossOutstanding'] = Number(s.grossSummary.outstanding);

                const rowValues = cols.map(c => rowData[c.key]);
                const row = worksheet.addRow(rowValues);
                row.height = 20;

                cols.forEach((col, cIdx) => {
                    const cell = row.getCell(cIdx + 1);
                    cell.font = { name: 'Arial', size: 9 };
                    cell.alignment = { vertical: 'middle', horizontal: cIdx < 4 ? 'left' : 'right' };

                    if (cIdx >= 4) {
                        cell.numFmt = '₹#,##0.00';
                        
                        if (col.key.endsWith('exp') || col.key === 'grossExpected') {
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
                        } else if (col.key.endsWith('paid') || col.key === 'grossPaid') {
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F4EA' } };
                        } else if (col.key.endsWith('bal') || col.key === 'grossOutstanding' || col.key.endsWith('Due') || col.key.endsWith('Balance')) {
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE8E6' } };
                        }
                    }
                });

                const outstandingVal = Number(s.grossSummary.outstanding);
                if (outstandingVal <= 0) {
                    cols.forEach((_, cIdx) => {
                        const cell = row.getCell(cIdx + 1);
                        if (cIdx < 4) {
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
                        }
                    });
                } else if (outstandingVal > 10000) {
                    cols.forEach((_, cIdx) => {
                        const cell = row.getCell(cIdx + 1);
                        if (cIdx < 4) {
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
                        }
                    });
                }
            });

            const lastStudentRow = startRow + studentsData.length - 1;

            const summaryRowValues = [];
            summaryRowValues[0] = '';
            summaryRowValues[1] = '';
            summaryRowValues[2] = 'GRAND TOTAL';
            summaryRowValues[3] = '';

            cols.forEach((_, cIdx) => {
                if (cIdx >= 4) {
                    const colLetter = getColLetter(cIdx);
                    summaryRowValues[cIdx] = { formula: `=SUM(${colLetter}${startRow}:${colLetter}${lastStudentRow})` };
                }
            });

            const summaryRow = worksheet.addRow(summaryRowValues);
            summaryRow.height = 24;

            cols.forEach((_, cIdx) => {
                const cell = summaryRow.getCell(cIdx + 1);
                cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1E293B' } };
                cell.alignment = { vertical: 'middle', horizontal: cIdx < 4 ? 'left' : 'right' };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
                
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FF94A3B8' } },
                    bottom: { style: 'double', color: { argb: 'FF1E293B' } }
                };

                if (cIdx >= 4) {
                    cell.numFmt = '₹#,##0.00';
                }
            });

            worksheet.views = [
                {
                    state: 'frozen',
                    xSplit: 3,
                    ySplit: 5
                }
            ];

            cols.forEach((_, cIdx) => {
                if (cIdx >= 4 && cIdx < totalColsCount - 4) {
                    worksheet.getColumn(cIdx + 1).outlineLevel = 1;
                }
            });

            cols.forEach((col, cIdx) => {
                const excelCol = worksheet.getColumn(cIdx + 1);
                const currentWidth = col.width || 15;
                excelCol.width = Math.max(currentWidth, 12);
            });

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(blob, `${className}_Detailed_Revenue_Report_${activeSessionStr}_${new Date().toISOString().split('T')[0]}.xlsx`);
            setDownloadingClassId(null);
        } catch (error) {
            console.error("Failed to export Excel report:", error);
            alert("Failed to export Excel. Please try again.");
            setDownloadingClassId(null);
        }
    };

    const downloadMatrixExcel = async () => {
        if (!revenueData || !revenueData.classMatrix) {
            alert("No data available to export.");
            return;
        }

        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('School Snapshot Matrix');

            const cols = [
                { header: 'Class Name', key: 'className', width: 25 },
                { header: 'Total Students', key: 'totalStudents', width: 18 },
                { header: 'Yearly Projected (Gross)', key: 'yearlyProjected', width: 28 },
                { header: 'Collected (Net)', key: 'collected', width: 20 },
                { header: 'Discounts Given', key: 'discountGiven', width: 20 },
                { header: 'Current Outstanding (Due)', key: 'currentOutstanding', width: 28 },
                { header: 'Collection %', key: 'collectionPercent', width: 18 }
            ];

            worksheet.columns = cols;

            // Report Header
            worksheet.mergeCells('A1:G1');
            const row1Cell = worksheet.getCell('A1');
            row1Cell.value = 'BIPS SENIOR SECONDARY SCHOOL';
            row1Cell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
            row1Cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
            row1Cell.alignment = { vertical: 'middle', horizontal: 'center' };
            worksheet.getRow(1).height = 40;

            worksheet.mergeCells('A2:G2');
            const row2Cell = worksheet.getCell('A2');
            row2Cell.value = 'Class-Wise Financial Matrix (School Snapshot)';
            row2Cell.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF334155' } };
            row2Cell.alignment = { vertical: 'middle', horizontal: 'center' };
            worksheet.getRow(2).height = 25;

            const activeSessionStr = localStorage.getItem('activeSession') || '2026-2027';
            worksheet.mergeCells('A3:G3');
            const row3Cell = worksheet.getCell('A3');
            row3Cell.value = `Academic Session: ${activeSessionStr}  |  Generated On: ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
            row3Cell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF64748B' } };
            row3Cell.alignment = { vertical: 'middle', horizontal: 'center' };
            worksheet.getRow(3).height = 20;

            // Header Row (Row 5)
            const headerRow = worksheet.getRow(5);
            headerRow.values = cols.map(c => c.header);
            headerRow.height = 30;
            headerRow.eachCell((cell, colNumber) => {
                cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } }; // Blue header
                cell.alignment = { 
                    vertical: 'middle', 
                    horizontal: colNumber === 1 ? 'left' : (colNumber === 2 ? 'center' : 'right') 
                };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                    bottom: { style: 'medium', color: { argb: 'FF1E3A8A' } },
                    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                    right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
                };
            });

            let grandStudents = 0;
            let grandProjected = 0;
            let grandCollected = 0;
            let grandDiscount = 0;
            let grandOutstanding = 0;

            revenueData.classMatrix.forEach((cls: any, index: number) => {
                const totalStudents = cls.totalStudents || 0;
                const yearlyProjected = Math.round(cls.yearlyProjected || 0);
                const collected = Math.round(cls.collected || 0);
                const discountGiven = Math.round(cls.discountGiven || 0);
                const currentOutstanding = Math.round(cls.currentOutstanding || 0);
                const collectionPercent = yearlyProjected > 0 
                    ? Math.round(((collected + discountGiven) / yearlyProjected) * 100) 
                    : 0;

                grandStudents += totalStudents;
                grandProjected += yearlyProjected;
                grandCollected += collected;
                grandDiscount += discountGiven;
                grandOutstanding += currentOutstanding;

                const rowNum = 6 + index;
                const row = worksheet.getRow(rowNum);
                row.values = [
                    cls.className,
                    totalStudents,
                    yearlyProjected,
                    collected,
                    discountGiven,
                    currentOutstanding,
                    `${collectionPercent}%`
                ];
                row.height = 22;

                const isEven = index % 2 === 0;
                row.eachCell((cell, colNumber) => {
                    cell.font = { name: 'Arial', size: 10, color: { argb: 'FF334155' } };
                    cell.alignment = { 
                        vertical: 'middle', 
                        horizontal: colNumber === 1 ? 'left' : (colNumber === 2 ? 'center' : 'right') 
                    };
                    if (isEven) {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
                    }
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
                    };

                    if ([3, 4, 5, 6].includes(colNumber)) {
                        cell.numFmt = '₹#,##,##0';
                    }
                });
            });

            // Grand Total Row
            const grandTotalRowNum = 6 + revenueData.classMatrix.length;
            const grandRow = worksheet.getRow(grandTotalRowNum);
            const overallEfficiency = grandProjected > 0 
                ? Math.round(((grandCollected + grandDiscount) / grandProjected) * 100)
                : 0;

            grandRow.values = [
                'GRAND TOTAL',
                grandStudents,
                grandProjected,
                grandCollected,
                grandDiscount,
                grandOutstanding,
                `${overallEfficiency}%`
            ];
            grandRow.height = 26;
            grandRow.eachCell((cell, colNumber) => {
                cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1E293B' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
                cell.alignment = { 
                    vertical: 'middle', 
                    horizontal: colNumber === 1 ? 'left' : (colNumber === 2 ? 'center' : 'right') 
                };
                cell.border = {
                    top: { style: 'medium', color: { argb: 'FF94A3B8' } },
                    bottom: { style: 'double', color: { argb: 'FF1E293B' } },
                    left: { style: 'thin', color: { argb: 'FF94A3B8' } },
                    right: { style: 'thin', color: { argb: 'FF94A3B8' } }
                };

                if ([3, 4, 5, 6].includes(colNumber)) {
                    cell.numFmt = '₹#,##,##0';
                }
            });

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(blob, `Class_Wise_Financial_Matrix_Report_${activeSessionStr}_${new Date().toISOString().split('T')[0]}.xlsx`);
        } catch (error) {
            console.error("Failed to export Matrix Excel report:", error);
            alert("Failed to export Excel. Please try again.");
        }
    };

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

    useEffect(() => {
        // Live Clock
        const clockTimer = setInterval(() => setTime(new Date()), 1000);
        
        const fetchDashboardData = async () => {
            try {
                if (['ADMIN', 'PRINCIPAL', 'ACCOUNTS'].includes(role)) {
                    const session = localStorage.getItem('activeSession') || '2026-2027';
                    const res = await axios.get(`/erp-api/admin/dashboard/stats?session=${session}`);
                    if (res.data) {
                        setStatsData(res.data.stats);
                        setFetchedActivities(res.data.recentActivities || []);
                    }
                    const revRes = await axios.get(`/erp-api/admin/dashboard/revenue?session=${session}`);
                    if (revRes.data) {
                        setRevenueData(revRes.data);
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

    const config = getRoleConfig(role, statsData, revenueData);
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
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
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

            {/* ── Dashboard Charts / Revenue Dashboard ── */}
            {['ADMIN', 'PRINCIPAL', 'ACCOUNTS'].includes(role) && revenueData ? (
                <>
                    {/* ── Class-Wise Financial Matrix Table ── */}
                    <div className="animate-fade-in delay-3" style={{ marginBottom: '2rem' }}>
                        <SectionCard 
                            title="📊 Class-Wise Financial Matrix (School Snapshot)"
                            action={
                                <button 
                                    onClick={downloadMatrixExcel}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        backgroundColor: '#10B981', // Emerald green for Excel
                                        color: 'white',
                                        border: 'none',
                                        padding: '0.6rem 1.2rem',
                                        borderRadius: '10px',
                                        cursor: 'pointer',
                                        fontWeight: '700',
                                        fontSize: '0.85rem',
                                        boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)',
                                        transition: 'all 0.2s',
                                        outline: 'none'
                                    }}
                                    onMouseOver={e => {
                                        e.currentTarget.style.backgroundColor = '#059669';
                                        e.currentTarget.style.transform = 'translateY(-1px)';
                                        e.currentTarget.style.boxShadow = '0 6px 8px -1px rgba(16, 185, 129, 0.3)';
                                    }}
                                    onMouseOut={e => {
                                        e.currentTarget.style.backgroundColor = '#10B981';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(16, 185, 129, 0.2)';
                                    }}
                                >
                                    <Download size={16} /> Excel Download
                                </button>
                            }
                        >
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#4a5568', fontSize: '0.85rem', fontWeight: '700' }}>
                                            <th style={{ padding: '1rem 0.5rem' }}>Class Name</th>
                                            <th style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>Total Students</th>
                                            <th style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>Yearly Projected (Gross)</th>
                                            <th style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>Collected (Net)</th>
                                            <th style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>Discounts Given</th>
                                            <th style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>Yearly Outstanding (Pending)</th>
                                            <th style={{ padding: '1rem 0.5rem', width: '180px' }}>Collection %</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {revenueData.classMatrix.map((cls: any) => {
                                            const isExpanded = expandedClassId === cls.classId;
                                            const collectionPercent = cls.yearlyProjected > 0 
                                                ? Math.min(100, Math.round(((cls.collected + cls.discountGiven) / cls.yearlyProjected) * 100)) 
                                                : 0;
                                            return (
                                                <React.Fragment key={cls.classId}>
                                                    <tr 
                                                        onClick={() => setExpandedClassId(isExpanded ? null : cls.classId)}
                                                        style={{ 
                                                            borderBottom: '1px solid #edf2f7', 
                                                            cursor: 'pointer',
                                                            transition: 'background 0.2s',
                                                            fontSize: '0.9rem',
                                                            fontWeight: '600'
                                                        }}
                                                        onMouseOver={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                                        onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                                    >
                                                        <td style={{ padding: '1rem 0.5rem', color: '#1a202c', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            {isExpanded ? <ChevronDown size={15} style={{ color: '#4a5568', marginRight: '0.2rem' }} /> : <ChevronRight size={15} style={{ color: '#a0aec0', marginRight: '0.2rem' }} />}
                                                            {cls.className}
                                                        </td>
                                                        <td style={{ padding: '1rem 0.5rem', textAlign: 'center', color: '#4a5568' }}>{cls.totalStudents}</td>
                                                        <td style={{ padding: '1rem 0.5rem', textAlign: 'right', color: '#2b6cb0' }} title="Click to view expected fee head breakdown">
                                                            ₹{cls.yearlyProjected.toLocaleString('en-IN')}
                                                        </td>
                                                        <td style={{ padding: '1rem 0.5rem', textAlign: 'right', color: '#2f855a' }}>
                                                            ₹{cls.collected.toLocaleString('en-IN')}
                                                        </td>
                                                        <td style={{ padding: '1rem 0.5rem', textAlign: 'right', color: '#dd6b20' }}>
                                                            ₹{cls.discountGiven.toLocaleString('en-IN')}
                                                        </td>
                                                        <td style={{ padding: '1rem 0.5rem', textAlign: 'right', color: cls.outstanding > 0 ? '#e53e3e' : '#48bb78' }}>
                                                            ₹{cls.outstanding.toLocaleString('en-IN')}
                                                        </td>
                                                        <td style={{ padding: '1rem 0.5rem' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                <div style={{ flex: 1, height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                                                    <div style={{ 
                                                                        width: `${collectionPercent}%`, 
                                                                        height: '100%', 
                                                                        backgroundColor: collectionPercent >= 80 ? '#48bb78' : collectionPercent >= 50 ? '#d69e2e' : '#e53e3e',
                                                                        borderRadius: '4px' 
                                                                    }} />
                                                                </div>
                                                                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#4a5568', width: '35px', textAlign: 'right' }}>
                                                                    {collectionPercent}%
                                                                </span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                    {isExpanded && (
                                                        <tr>
                                                            <td colSpan={7} style={{ backgroundColor: '#f7fafc', padding: '1.25rem' }}>
                                                                <div style={{
                                                                    display: 'grid',
                                                                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                                                    gap: '1.5rem',
                                                                    border: '1px solid #e2e8f0',
                                                                    borderRadius: '12px',
                                                                    padding: '1.25rem',
                                                                    backgroundColor: 'white',
                                                                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                                                                }}>
                                                                    <div>
                                                                        <h5 style={{ margin: '0 0 0.5rem 0', color: '#718096', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Revenue Source Breakdown</h5>
                                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem' }}>
                                                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                                <span style={{ color: '#4a5568' }}>Tuition Fees (12 Months):</span>
                                                                                <span style={{ fontWeight: '700', color: '#2d3748' }}>₹{cls.breakdown.tuition.toLocaleString('en-IN')}</span>
                                                                            </div>
                                                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                                <span style={{ color: '#4a5568' }}>Transport Fees (12 Months):</span>
                                                                                <span style={{ fontWeight: '700', color: '#2d3748' }}>₹{cls.breakdown.transport.toLocaleString('en-IN')}</span>
                                                                            </div>
                                                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                                <span style={{ color: '#4a5568' }}>One-Time & Annual Fees:</span>
                                                                                <span style={{ fontWeight: '700', color: '#2d3748' }}>₹{cls.breakdown.admission.toLocaleString('en-IN')}</span>
                                                                            </div>
                                                                            {cls.breakdown.previousDues !== undefined ? (
                                                                                <>
                                                                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                                        <span style={{ color: '#4a5568' }}>Prev. Session Dues:</span>
                                                                                        <span style={{ fontWeight: '700', color: '#2d3748' }}>₹{cls.breakdown.previousDues.toLocaleString('en-IN')}</span>
                                                                                    </div>
                                                                                    {cls.breakdown.other > 0 && (
                                                                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                                            <span style={{ color: '#4a5568' }}>Other &amp; Misc Fees:</span>
                                                                                            <span style={{ fontWeight: '700', color: '#2d3748' }}>₹{cls.breakdown.other.toLocaleString('en-IN')}</span>
                                                                                        </div>
                                                                                    )}
                                                                                    {((cls.breakdown as any).rteFees || 0) > 0 && (
                                                                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                                            <span style={{ color: '#e53e3e', fontWeight: '600' }}>🔴 RTE Student Fees:</span>
                                                                                            <span style={{ fontWeight: '700', color: '#e53e3e' }}>₹{((cls.breakdown as any).rteFees || 0).toLocaleString('en-IN')}</span>
                                                                                        </div>
                                                                                    )}
                                                                                    {((cls.breakdown as any).thirdChildFees || 0) > 0 && (
                                                                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                                            <span style={{ color: '#805ad5', fontWeight: '600' }}>👨‍👩‍👧 Third Child Fees:</span>
                                                                                            <span style={{ fontWeight: '700', color: '#805ad5' }}>₹{((cls.breakdown as any).thirdChildFees || 0).toLocaleString('en-IN')}</span>
                                                                                        </div>
                                                                                    )}
                                                                                </>
                                                                            ) : (
                                                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                                    <span style={{ color: '#4a5568' }}>Prev. Session Dues &amp; Misc:</span>
                                                                                    <span style={{ fontWeight: '700', color: '#2d3748' }}>₹{cls.breakdown.other.toLocaleString('en-IN')}</span>
                                                                                </div>
                                                                            )}
                                                                            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #edf2f7', paddingTop: '0.4rem', marginTop: '0.2rem' }}>
                                                                                <span style={{ color: '#4a5568', fontWeight: '600' }}>Gross Expected Total:</span>
                                                                                <span style={{ fontWeight: '800', color: '#2b6cb0' }}>₹{cls.yearlyProjected.toLocaleString('en-IN')}</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    <div style={{ borderLeft: '1px solid #edf2f7', paddingLeft: '1.5rem' }}>
                                                                        <h5 style={{ margin: '0 0 0.5rem 0', color: '#718096', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Collection Summary</h5>
                                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem' }}>
                                                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                                <span style={{ color: '#4a5568' }}>Actual Fees Collected:</span>
                                                                                <span style={{ fontWeight: '700', color: '#2f855a' }}>₹{cls.collected.toLocaleString('en-IN')}</span>
                                                                            </div>
                                                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                                <span style={{ color: '#4a5568' }}>Concessions / Discounts:</span>
                                                                                <span style={{ fontWeight: '700', color: '#dd6b20' }}>- ₹{cls.breakdown.discount.toLocaleString('en-IN')}</span>
                                                                            </div>
                                                                            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #edf2f7', paddingTop: '0.4rem', marginTop: '0.2rem' }}>
                                                                                <span style={{ color: '#4a5568', fontWeight: '600' }}>Outstanding Balance (Due):</span>
                                                                                <span style={{ fontWeight: '800', color: '#e53e3e' }}>₹{cls.outstanding.toLocaleString('en-IN')}</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    <div style={{ borderLeft: '1px solid #edf2f7', paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                                                                        <div style={{ textAlign: 'center' }}>
                                                                            <div style={{ fontSize: '1.75rem', fontWeight: '800', color: collectionPercent >= 80 ? '#48bb78' : collectionPercent >= 50 ? '#d69e2e' : '#e53e3e' }}>
                                                                                {collectionPercent}%
                                                                            </div>
                                                                            <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#718096', textTransform: 'uppercase', marginTop: '0.25rem', marginBottom: '1rem' }}>
                                                                                Collection Efficiency
                                                                            </div>
                                                                            <button
                                                                                disabled={downloadingClassId === cls.classId}
                                                                                onClick={(e) => { e.stopPropagation(); downloadClassExcelReport(cls.classId, cls.className); }}
                                                                                style={{
                                                                                    backgroundColor: '#1e293b',
                                                                                    color: 'white',
                                                                                    border: 'none',
                                                                                    padding: '0.5rem 1rem',
                                                                                    borderRadius: '8px',
                                                                                    fontSize: '0.8rem',
                                                                                    fontWeight: '700',
                                                                                    cursor: 'pointer',
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    gap: '0.5rem',
                                                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                                                                    transition: 'all 0.2s',
                                                                                    opacity: downloadingClassId === cls.classId ? 0.7 : 1
                                                                                }}
                                                                                onMouseOver={e => e.currentTarget.style.backgroundColor = '#0f172a'}
                                                                                onMouseOut={e => e.currentTarget.style.backgroundColor = '#1e293b'}
                                                                            >
                                                                                <Download size={14} />
                                                                                {downloadingClassId === cls.classId ? 'Exporting...' : 'Export Excel'}
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </SectionCard>
                    </div>

                    {/* ── Expected vs Collected Revenue Chart & Revenue Distribution Chart ── */}
                    <div className="animate-fade-in delay-4" style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '1.6fr 1fr', 
                        gap: '1.5rem', 
                        marginBottom: '2rem' 
                    }}>
                        <SectionCard title="📈 Expected vs Collected Revenue By Class">
                            <div style={{ height: '320px' }}>
                                <Chart 
                                    options={{
                                        chart: {
                                            type: 'bar',
                                            toolbar: { show: false },
                                            fontFamily: "'Inter', sans-serif"
                                        },
                                        plotOptions: {
                                            bar: {
                                                borderRadius: 6,
                                                columnWidth: '55%',
                                                dataLabels: { position: 'top' }
                                            }
                                        },
                                        dataLabels: { enabled: false },
                                        xaxis: {
                                            categories: revenueData.classMatrix.map((c: any) => c.className),
                                            labels: { style: { colors: '#718096', fontSize: '11px', fontWeight: 600 } }
                                        },
                                        yaxis: {
                                            labels: {
                                                formatter: (val) => val >= 100000 ? `₹${(val / 100000).toFixed(1)}L` : val >= 1000 ? `₹${(val / 1000).toFixed(0)}k` : `₹${val}`,
                                                style: { colors: '#a0aec0', fontSize: '11px', fontWeight: 600 }
                                            }
                                        },
                                        grid: {
                                            borderColor: '#f1f5f9',
                                            strokeDashArray: 4
                                        },
                                        colors: ['#4a90e2', '#48bb78'],
                                        legend: {
                                            position: 'top',
                                            horizontalAlign: 'right',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            labels: { colors: '#4a5568' }
                                        },
                                        tooltip: {
                                            theme: 'light',
                                            y: { formatter: (val) => `₹${val.toLocaleString()}` }
                                        }
                                    }}
                                    series={[
                                        { name: 'Expected Projected', data: revenueData.classMatrix.map((c: any) => c.yearlyProjected) },
                                        { name: 'Collected', data: revenueData.classMatrix.map((c: any) => c.collected) }
                                    ]}
                                    type="bar"
                                    height="100%"
                                />
                            </div>
                        </SectionCard>

                        <SectionCard title="🍰 Revenue Distribution Source">
                            <div style={{ height: '320px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                <Chart 
                                    options={{
                                        chart: {
                                            type: 'donut',
                                            fontFamily: "'Inter', sans-serif"
                                        },
                                        labels: ['Tuition Fee', 'Transport Fee', 'Admission/One-Time', 'Other & Misc', 'RTE Student Fees', 'Third Child Fees'],
                                        colors: ['#4a90e2', '#ed8936', '#9f7aea', '#48bb78', '#e53e3e', '#805ad5'],
                                        legend: {
                                            position: 'bottom',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            labels: { colors: '#4a5568' }
                                        },
                                        plotOptions: {
                                            pie: {
                                                donut: {
                                                    size: '65%',
                                                    labels: {
                                                        show: true,
                                                        total: {
                                                            show: true,
                                                            label: 'Total Expected',
                                                            formatter: () => `₹${(revenueData.summary.totalExpectedRevenue / 100000).toFixed(1)}L`,
                                                            fontSize: '14px',
                                                            fontWeight: '700',
                                                            color: '#2d3748'
                                                        }
                                                    }
                                                }
                                            }
                                        },
                                        tooltip: {
                                            y: { formatter: (val) => `₹${val.toLocaleString()}` }
                                        }
                                    }}
                                    series={[
                                        revenueData.summary.breakdown.tuition,
                                        revenueData.summary.breakdown.transport,
                                        revenueData.summary.breakdown.admission,
                                        revenueData.summary.breakdown.other,
                                        (revenueData.summary.breakdown as any).rteFees || 0,
                                        (revenueData.summary.breakdown as any).thirdChildFees || 0
                                    ]}
                                    type="donut"
                                    width="100%"
                                    height="100%"
                                />
                            </div>
                        </SectionCard>
                    </div>
                </>
            ) : (
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
            )}

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
