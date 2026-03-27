import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, Users, BookOpen, Wallet, Calendar,
    LogOut, Shield, Bus, FileText, GraduationCap,
    ArrowUpCircle, Bell
} from 'lucide-react';

// ─── Role accent colors & labels ────────────────────────────────────────────
const ROLE_META: Record<string, { label: string; color: string; bg: string }> = {
    ADMIN:      { label: 'Superadmin',  color: '#4a90e2', bg: 'rgba(74,144,226,0.15)' },
    PRINCIPAL:  { label: 'Principal',   color: '#805ad5', bg: 'rgba(128,90,213,0.15)' },
    ACCOUNTS:   { label: 'Accounts',    color: '#38a169', bg: 'rgba(56,161,105,0.15)' },
    TEACHER:    { label: 'Teacher',     color: '#3182ce', bg: 'rgba(49,130,206,0.15)' },
    TRANSPORT:  { label: 'Transport',   color: '#d69e2e', bg: 'rgba(214,158,46,0.15)' },
    PARENT:     { label: 'Parent',      color: '#e53e3e', bg: 'rgba(229,62,62,0.15)' },
    STUDENT:    { label: 'Student',     color: '#e53e3e', bg: 'rgba(229,62,62,0.15)' },
};

// ─── All possible nav links ───────────────────────────────────────────────────
const ALL_LINKS = (role: string) => [
    { id: 'dashboard',      name: 'Dashboard',           icon: <LayoutDashboard size={19} />, path: role === 'TEACHER' ? '/teacher' : (role === 'PARENT' || role === 'STUDENT') ? '/student' : '/admin' },
    { id: 'students',       name: 'Students',            icon: <Users size={19} />,           path: '/admin/students' },
    { id: 'teachers',       name: 'Teachers',            icon: <Users size={19} />,           path: '/admin/teachers' },
    { id: 'classes',        name: 'Classes',             icon: <BookOpen size={19} />,        path: '/admin/classes' },
    { id: 'fees',           name: 'Accounts / Fees',     icon: <Wallet size={19} />,          path: role === 'TEACHER' ? '/teacher/fee' : (role === 'PARENT' || role === 'STUDENT') ? '/student/fees' : '/admin/fees' },
    { id: 'roles',          name: 'Role Management',     icon: <Shield size={19} />,          path: '/admin/roles' },
    { id: 'transport',      name: 'Transport',           icon: <Bus size={19} />,             path: '/admin/transport' },
    { id: 'attendance',     name: 'Attendance',          icon: <Calendar size={19} />,        path: role === 'TEACHER' ? '/teacher/attendance' : (role === 'PARENT' || role === 'STUDENT') ? '/student/attendance' : '/admin/attendance' },
    { id: 'report-card',    name: 'Report Card',         icon: <FileText size={19} />,        path: '/admin/report-card' },
    { id: 'tc',             name: 'Transfer Certificate',icon: <GraduationCap size={19} />,   path: '/admin/tc' },
    { id: 'promote',        name: 'Promotion',           icon: <ArrowUpCircle size={19} />,   path: '/admin/promote' },
    { id: 'notice',         name: 'Notice Board',        icon: <Bell size={19} />,            path: (role === 'PARENT' || role === 'STUDENT') ? '/parent/notice' : '/teacher/notice' },
    { id: 'leave',          name: 'Leave Apply',         icon: <Calendar size={19} />,        path: '/teacher/leave' },
    { id: 'service-record', name: 'Service Record',      icon: <Shield size={19} />,          path: '/teacher/service-record' },
    { id: 'profile',        name: 'Student Details',     icon: <Users size={19} />,           path: role === 'PARENT' ? '/parent/profile' : '/student/profile' },
    { id: 'marks',          name: 'Marks',               icon: <BookOpen size={19} />,        path: '/student/marks' },
    { id: 'my-classes',     name: 'My Classes',          icon: <BookOpen size={19} />,        path: '/teacher/classes' },
];

// ─── Default link IDs per role ────────────────────────────────────────────────
const ROLE_DEFAULT_IDS: Record<string, string[]> = {
    ADMIN:     ['dashboard','students','teachers','classes','fees','roles','transport','attendance','report-card','tc','promote'],
    PRINCIPAL: ['dashboard','students','teachers','fees','attendance','report-card'],
    ACCOUNTS:  ['dashboard','fees','tc'],
    TEACHER:   ['dashboard','my-classes','attendance','fees','notice','leave','service-record'],
    TRANSPORT: ['dashboard','transport'],
    PARENT:    ['dashboard','profile','fees','attendance','notice'],
    STUDENT:   ['dashboard','profile','fees','attendance','notice'],
};

// ─── Component ────────────────────────────────────────────────────────────────
const Sidebar: React.FC = () => {
    const [role, setRole] = useState('ADMIN');
    const [userName, setUserName] = useState('User');
    const [permissions, setPermissions] = useState<Record<string, string[]>>({});
    const navigate = useNavigate();

    const loadPermissions = () => {
        const saved = localStorage.getItem('role_permissions');
        if (saved) setPermissions(JSON.parse(saved));
    };

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            const parsed = JSON.parse(userData);
            setRole(parsed.role || 'ADMIN');
            setUserName(parsed.name || 'User');
        }
        loadPermissions();
        window.addEventListener('storage', loadPermissions);
        return () => window.removeEventListener('storage', loadPermissions);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    // Build displayed links
    const allLinks = ALL_LINKS(role);
    const rolePerms = permissions[role];
    let links: typeof allLinks;

    if (role === 'ADMIN' || !rolePerms || rolePerms.length === 0) {
        // Force ADMIN to default links, or fallback for others
        const defaultIds = ROLE_DEFAULT_IDS[role] || ROLE_DEFAULT_IDS['ADMIN'];
        links = allLinks.filter(l => defaultIds.includes(l.id));
    } else {
        links = allLinks.filter(l => rolePerms.includes(l.id));
    }

    const meta = ROLE_META[role] || ROLE_META['ADMIN'];
    const initial = userName.charAt(0).toUpperCase();

    return (
        <div className="sidebar" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>

            {/* ── Logo Header ── */}
            <div style={{
                padding: '1.5rem 1.25rem',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                flexShrink: 0
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <img
                        src="/bips-logo.png"
                        alt="BIPS Logo"
                        style={{
                            width: '48px',
                            height: '48px',
                            objectFit: 'contain',
                            borderRadius: '10px',
                            background: 'rgba(255,255,255,0.08)',
                            padding: '3px',
                            boxShadow: `0 4px 14px ${meta.color}55`,
                            flexShrink: 0
                        }}
                    />
                    <div>
                        <h2 style={{ margin: 0, fontWeight: '800', fontSize: '1.1rem', letterSpacing: '0.5px', color: 'white' }}>BIPS ERP</h2>
                        <p style={{ margin: 0, fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>School Management</p>
                    </div>
                </div>
            </div>

            {/* ── Role Badge ── */}
            <div style={{ padding: '1rem 1.25rem', flexShrink: 0 }}>
                <div style={{
                    background: meta.bg,
                    borderRadius: '12px',
                    padding: '0.75rem 1rem',
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    border: `1px solid ${meta.color}30`
                }}>
                    <div style={{
                        width: '36px', height: '36px', borderRadius: '50%',
                        backgroundColor: meta.color, color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: '800', fontSize: '1rem', flexShrink: 0
                    }}>{initial}</div>
                    <div style={{ overflow: 'hidden' }}>
                        <p style={{ margin: 0, color: 'white', fontWeight: '700', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userName}</p>
                        <p style={{ margin: 0, color: meta.color, fontSize: '0.75rem', fontWeight: '600' }}>{meta.label}</p>
                    </div>
                </div>
            </div>

            {/* ── Nav Links ── */}
            <nav style={{
                flex: 1, overflowY: 'auto', padding: '0.5rem 1rem 1rem',
                display: 'flex', flexDirection: 'column', gap: '0.25rem'
            }}>
                <p style={{ fontSize: '0.65rem', fontWeight: '700', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0.5rem 0.5rem 0.75rem' }}>Navigation</p>
                {links.map((link) => (
                    <NavLink
                        key={link.id}
                        to={link.path}
                        end={link.path.split('/').length <= 2}
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                        style={({ isActive }) => isActive ? {
                            background: `linear-gradient(90deg, ${meta.color}, ${meta.color}cc)`,
                            color: 'white',
                            boxShadow: `0 4px 12px ${meta.color}40`
                        } : {}}
                    >
                        {link.icon}
                        <span>{link.name}</span>
                    </NavLink>
                ))}
            </nav>

            {/* ── Logout ── */}
            <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
                <button
                    onClick={handleLogout}
                    style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
                        padding: '0.875rem 1rem', borderRadius: '8px',
                        background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)',
                        color: '#fc8181', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem',
                        transition: 'all 0.2s'
                    }}
                    onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.2)'; }}
                    onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.12)'; }}
                >
                    <LogOut size={18} />
                    <span>Logout</span>
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
