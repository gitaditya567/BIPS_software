import React, { useEffect, useState } from 'react';
import { Search, Clock } from 'lucide-react';
import { NotificationBell } from './NotificationSystem';
import axios from 'axios';

// ─── Live Clock ───────────────────────────────────────────────────────────────
const LiveClock: React.FC = () => {
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const timeStr = now.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });

    const dateStr = now.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.5rem 1rem',
            background: 'linear-gradient(135deg, #f0f7ff, #e8f4fd)',
            border: '1px solid #c3dffe',
            borderRadius: '12px',
            userSelect: 'none',
        }}>
            <Clock size={16} color="#4a90e2" strokeWidth={2.5} />
            <div style={{ lineHeight: 1.2 }}>
                <p style={{
                    margin: 0,
                    fontSize: '1rem',
                    fontWeight: '800',
                    color: '#1e3a5f',
                    letterSpacing: '0.06em',
                    fontVariantNumeric: 'tabular-nums'
                }}>
                    {timeStr}
                </p>
                <p style={{
                    margin: 0,
                    fontSize: '0.68rem',
                    fontWeight: '600',
                    color: '#4a90e2',
                    letterSpacing: '0.02em'
                }}>
                    {dateStr}
                </p>
            </div>
        </div>
    );
};

// ─── Topbar ───────────────────────────────────────────────────────────────────
const Topbar: React.FC = () => {
    const [user, setUser] = useState<{ name: string; role: string } | null>(null);
    const [sessionState, setSessionState] = useState(localStorage.getItem('activeSession') || '2024-2025');
    const [sessions, setSessions] = useState<{ id: string; name: string; isDefault: boolean }[]>([]);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) setUser(JSON.parse(userData));

        // Fetch academic sessions list
        const loadSessions = async () => {
            try {
                const res = await axios.get('/erp-api/sessions');
                setSessions(res.data);

                const activeRes = await axios.get('/erp-api/sessions/active');
                if (activeRes.data && !localStorage.getItem('activeSession')) {
                    const activeName = activeRes.data.name;
                    localStorage.setItem('activeSession', activeName);
                    setSessionState(activeName);
                    window.dispatchEvent(new Event('activeSessionChanged'));
                }
            } catch (error) {
                console.error('Failed to load academic sessions', error);
            }
        };

        loadSessions();

        const handleSessionChange = () => {
            setSessionState(localStorage.getItem('activeSession') || '2024-2025');
        };
        window.addEventListener('activeSessionChanged', handleSessionChange);
        return () => {
            window.removeEventListener('activeSessionChanged', handleSessionChange);
        };
    }, []);

    const getRoleLabel = (role?: string) => {
        const labels: Record<string, string> = {
            ADMIN: 'Superadmin', PRINCIPAL: 'Principal', ACCOUNTS: 'Accountant',
            TEACHER: 'Teacher', TRANSPORT: 'Transport Manager',
            PARENT: 'Parent', STUDENT: 'Student'
        };
        return labels[role || ''] || role || 'Guest';
    };

    const getRoleColor = (role?: string) => {
        const colors: Record<string, string> = {
            ADMIN: '#4a90e2', PRINCIPAL: '#805ad5', ACCOUNTS: '#38a169',
            TEACHER: '#3182ce', TRANSPORT: '#d69e2e', PARENT: '#e53e3e', STUDENT: '#e53e3e'
        };
        return colors[role || ''] || '#6B7280';
    };

    const initial = user?.name?.charAt(0)?.toUpperCase() || 'U';
    const roleColor = getRoleColor(user?.role);

    return (
        <header className="topbar">
            {/* Search */}
            <div className="search-bar">
                <label htmlFor="topbar-search" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Search size={18} style={{ position: 'absolute', left: '10px', color: '#9CA3AF' }} />
                    <input
                        type="text"
                        id="topbar-search"
                        placeholder="Search students, classes, fees..."
                        style={{
                            padding: '0.5rem 1rem 0.5rem 2.5rem',
                            borderRadius: '9999px',
                            border: '1px solid #E5E7EB',
                            outline: 'none',
                            width: '280px',
                            fontSize: '0.875rem',
                            background: '#f8fafc',
                            transition: 'all 0.2s'
                        }}
                        onFocus={e => { e.currentTarget.style.border = '1px solid #4a90e2'; e.currentTarget.style.background = 'white'; }}
                        onBlur={e => { e.currentTarget.style.border = '1px solid #E5E7EB'; e.currentTarget.style.background = '#f8fafc'; }}
                    />
                </label>
            </div>

            {/* Right section */}
            <div className="topbar-right">

                {/* ── Academic Session Selector ── */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.45rem 1rem',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    marginRight: '0.5rem'
                }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b' }}>Session:</span>
                    <select
                        value={sessionState}
                        onChange={(e) => {
                            const val = e.target.value;
                            localStorage.setItem('activeSession', val);
                            window.dispatchEvent(new Event('activeSessionChanged'));
                            setSessionState(val);
                        }}
                        style={{
                            border: 'none',
                            background: 'transparent',
                            fontSize: '0.85rem',
                            fontWeight: '700',
                            color: '#1e293b',
                            outline: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        {(sessions.length > 0 ? sessions : [
                            { id: '1', name: '2024-2025' },
                            { id: '2', name: '2025-2026' },
                            { id: '3', name: '2026-2027' }
                        ]).map(s => (
                            <option key={s.id} value={s.name}>{s.name}</option>
                        ))}
                    </select>
                </div>

                {/* ── Live Date & Time ── */}
                <LiveClock />

                {/* Divider */}
                <div style={{ width: '1px', height: '32px', background: '#E5E7EB' }} />

                {/* Notification Bell */}
                <NotificationBell />

                {/* Divider */}
                <div style={{ width: '1px', height: '32px', background: '#E5E7EB' }} />

                {/* User Profile */}
                <div className="user-profile">
                    <div style={{
                        width: '40px', height: '40px', borderRadius: '50%',
                        background: `linear-gradient(135deg, ${roleColor}, ${roleColor}bb)`,
                        color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: '800', fontSize: '1rem',
                        boxShadow: `0 2px 8px ${roleColor}40`,
                        flexShrink: 0
                    }}>
                        {initial}
                    </div>
                    <div style={{ textAlign: 'left' }}>
                        <p style={{ fontSize: '0.875rem', fontWeight: 700, margin: 0, color: '#1e293b' }}>
                            {user?.name || 'Guest User'}
                        </p>
                        <p style={{ fontSize: '0.72rem', color: roleColor, margin: 0, fontWeight: '600' }}>
                            {getRoleLabel(user?.role)}
                        </p>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Topbar;
