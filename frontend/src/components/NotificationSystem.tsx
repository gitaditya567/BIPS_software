import React, { useEffect, useRef, useState } from 'react';
import { useNotification } from '../context/NotificationContext';
import type { Notification, NotifType } from '../context/NotificationContext';
import { X, Bell, CheckCheck, Trash2, UserPlus, IndianRupee, Calendar, Bell as BellIcon, CheckCircle2, Info, AlertCircle } from 'lucide-react';

// ── Config per type ──────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<NotifType, { icon: React.ReactNode; color: string; bg: string; borderColor: string }> = {
    admission:  { icon: <UserPlus size={18} />,     color: '#2563eb', bg: '#eff6ff', borderColor: '#93c5fd' },
    fee:        { icon: <IndianRupee size={18} />,  color: '#16a34a', bg: '#f0fdf4', borderColor: '#86efac' },
    leave:      { icon: <Calendar size={18} />,     color: '#d97706', bg: '#fffbeb', borderColor: '#fcd34d' },
    notice:     { icon: <BellIcon size={18} />,     color: '#7c3aed', bg: '#faf5ff', borderColor: '#c4b5fd' },
    attendance: { icon: <CheckCircle2 size={18} />, color: '#0891b2', bg: '#ecfeff', borderColor: '#67e8f9' },
    success:    { icon: <CheckCircle2 size={18} />, color: '#16a34a', bg: '#f0fdf4', borderColor: '#86efac' },
    error:      { icon: <AlertCircle size={18} />,  color: '#dc2626', bg: '#fef2f2', borderColor: '#fca5a5' },
    info:       { icon: <Info size={18} />,         color: '#2563eb', bg: '#eff6ff', borderColor: '#93c5fd' },
};

// ── Single Toast Popup ───────────────────────────────────────────────────────
interface ToastItem extends Notification {
    visible: boolean;
}

const Toast: React.FC<{ toast: ToastItem; onClose: () => void }> = ({ toast, onClose }) => {
    const cfg = TYPE_CONFIG[toast.type];
    return (
        <div style={{
            display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
            background: 'white',
            border: `1px solid ${cfg.borderColor}`,
            borderLeft: `4px solid ${cfg.color}`,
            borderRadius: '12px',
            padding: '1rem 1.25rem',
            boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
            minWidth: '320px',
            maxWidth: '400px',
            position: 'relative',
            opacity: toast.visible ? 1 : 0,
            transform: toast.visible ? 'translateX(0)' : 'translateX(100%)',
            transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}>
            {/* Icon */}
            <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: cfg.bg, color: cfg.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0
            }}>
                {cfg.icon}
            </div>
            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: '700', fontSize: '0.9rem', color: '#1e293b' }}>{toast.title}</p>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#64748b', lineHeight: 1.4 }}>{toast.message}</p>
                <p style={{ margin: '0.35rem 0 0', fontSize: '0.7rem', color: '#94a3b8' }}>
                    {toast.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </p>
            </div>
            {/* Close */}
            <button onClick={onClose} style={{
                background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8',
                padding: '0', display: 'flex', alignItems: 'center', flexShrink: 0
            }}
                onMouseOver={e => (e.currentTarget as HTMLElement).style.color = '#ef4444'}
                onMouseOut={e => (e.currentTarget as HTMLElement).style.color = '#94a3b8'}
            >
                <X size={16} />
            </button>
        </div>
    );
};

// ── Toast Container (bottom-right) ───────────────────────────────────────────
export const ToastContainer: React.FC = () => {
    const { notifications } = useNotification();
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const shownIds = useRef<Set<string>>(new Set());

    useEffect(() => {
        notifications.forEach(notif => {
            if (!shownIds.current.has(notif.id)) {
                shownIds.current.add(notif.id);
                // Add toast
                const item: ToastItem = { ...notif, visible: false };
                setToasts(prev => [...prev, item]);
                // Make visible after mount
                setTimeout(() => {
                    setToasts(prev => prev.map(t => t.id === notif.id ? { ...t, visible: true } : t));
                }, 50);
                // Auto-dismiss after 5s
                setTimeout(() => dismiss(notif.id), 5000);
            }
        });
        // Keep max 5 toasts
    }, [notifications]);

    const dismiss = (id: string) => {
        setToasts(prev => prev.map(t => t.id === id ? { ...t, visible: false } : t));
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 400);
    };

    return (
        <div style={{
            position: 'fixed', bottom: '1.5rem', right: '1.5rem',
            zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'flex-end'
        }}>
            {toasts.slice(-5).map(toast => (
                <Toast key={toast.id} toast={toast} onClose={() => dismiss(toast.id)} />
            ))}
        </div>
    );
};

// ── Bell Icon + Dropdown Panel ───────────────────────────────────────────────
export const NotificationBell: React.FC = () => {
    const { notifications, unreadCount, markAllRead, markRead, clearAll } = useNotification();
    const [open, setOpen] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const formatTime = (d: Date) => {
        const now = new Date();
        const diff = Math.floor((now.getTime() - new Date(d).getTime()) / 1000);
        if (diff < 60) return `${diff}s ago`;
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    };

    return (
        <div ref={panelRef} style={{ position: 'relative' }}>
            {/* Bell Button */}
            <button
                onClick={() => { setOpen(o => !o); if (!open) markAllRead(); }}
                style={{
                    background: open ? '#f1f5f9' : 'none', border: 'none',
                    cursor: 'pointer', color: '#6B7280', position: 'relative',
                    borderRadius: '10px', padding: '0.5rem', display: 'flex',
                    alignItems: 'center', transition: 'all 0.2s'
                }}
                onMouseOver={e => (e.currentTarget as HTMLElement).style.background = '#f1f5f9'}
                onMouseOut={e => { if (!open) (e.currentTarget as HTMLElement).style.background = 'none'; }}
                title="Notifications"
            >
                <Bell size={22} />
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute', top: '2px', right: '2px',
                        backgroundColor: '#ef4444', color: 'white',
                        fontSize: '0.65rem', fontWeight: '800',
                        minWidth: '18px', height: '18px',
                        borderRadius: '999px', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        padding: '0 4px',
                        boxShadow: '0 0 0 2px white',
                        animation: 'pulse 2s infinite'
                    }}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            {open && (
                <div style={{
                    position: 'absolute', right: 0, top: 'calc(100% + 10px)',
                    width: '380px', background: 'white',
                    borderRadius: '16px',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                    border: '1px solid #e2e8f0',
                    zIndex: 1000,
                    overflow: 'hidden',
                    animation: 'dropdownOpen 0.2s ease-out'
                }}>
                    {/* Header */}
                    <div style={{
                        padding: '1rem 1.25rem',
                        borderBottom: '1px solid #f1f5f9',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        background: 'linear-gradient(135deg, #f8fafc, #fff)'
                    }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#1e293b' }}>
                                Notifications
                            </h3>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
                                {notifications.length === 0 ? 'No notifications yet' : `${notifications.length} total`}
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {notifications.length > 0 && (
                                <>
                                    <button onClick={markAllRead} title="Mark all read"
                                        style={{ background: '#f1f5f9', border: 'none', cursor: 'pointer', color: '#4a90e2', borderRadius: '8px', padding: '0.4rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: '600' }}>
                                        <CheckCheck size={14} /> Mark read
                                    </button>
                                    <button onClick={clearAll} title="Clear all"
                                        style={{ background: '#fff1f2', border: 'none', cursor: 'pointer', color: '#ef4444', borderRadius: '8px', padding: '0.4rem 0.6rem', display: 'flex', alignItems: 'center' }}>
                                        <Trash2 size={14} />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Notification List */}
                    <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
                        {notifications.length === 0 ? (
                            <div style={{ padding: '3rem', textAlign: 'center' }}>
                                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔔</div>
                                <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>No notifications yet</p>
                                <p style={{ color: '#cbd5e1', fontSize: '0.8rem', margin: '0.25rem 0 0' }}>Events will appear here</p>
                            </div>
                        ) : (
                            notifications.map(notif => {
                                const cfg = TYPE_CONFIG[notif.type];
                                return (
                                    <div
                                        key={notif.id}
                                        onClick={() => markRead(notif.id)}
                                        style={{
                                            display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
                                            padding: '0.875rem 1.25rem',
                                            borderBottom: '1px solid #f8fafc',
                                            background: notif.read ? 'white' : `${cfg.bg}`,
                                            cursor: 'pointer',
                                            transition: 'background 0.2s'
                                        }}
                                        onMouseOver={e => (e.currentTarget as HTMLElement).style.background = '#f8fafc'}
                                        onMouseOut={e => (e.currentTarget as HTMLElement).style.background = notif.read ? 'white' : cfg.bg}
                                    >
                                        <div style={{
                                            width: '34px', height: '34px', borderRadius: '10px',
                                            background: `${cfg.color}15`, color: cfg.color,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            flexShrink: 0
                                        }}>
                                            {cfg.icon}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <p style={{ margin: 0, fontWeight: notif.read ? '500' : '700', fontSize: '0.85rem', color: '#1e293b' }}>
                                                    {notif.title}
                                                </p>
                                                {!notif.read && (
                                                    <span style={{
                                                        width: '8px', height: '8px', borderRadius: '50%',
                                                        background: cfg.color, flexShrink: 0, marginTop: '4px'
                                                    }} />
                                                )}
                                            </div>
                                            <p style={{ margin: '0.15rem 0 0', fontSize: '0.78rem', color: '#64748b', lineHeight: 1.4 }}>
                                                {notif.message}
                                            </p>
                                            <p style={{ margin: '0.25rem 0 0', fontSize: '0.7rem', color: '#94a3b8' }}>
                                                {formatTime(notif.timestamp)}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
