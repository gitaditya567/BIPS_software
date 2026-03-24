import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

export type NotifType = 'admission' | 'fee' | 'leave' | 'notice' | 'attendance' | 'success' | 'error' | 'info';

export interface Notification {
    id: string;
    type: NotifType;
    title: string;
    message: string;
    timestamp: Date;
    read: boolean;
}

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    addNotification: (type: NotifType, title: string, message: string) => void;
    markAllRead: () => void;
    markRead: (id: string) => void;
    clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export const useNotification = () => {
    const ctx = useContext(NotificationContext);
    if (!ctx) throw new Error('useNotification must be used within NotificationProvider');
    return ctx;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const idRef = useRef(0);

    const addNotification = useCallback((type: NotifType, title: string, message: string) => {
        idRef.current += 1;
        const newNotif: Notification = {
            id: `notif-${idRef.current}-${Date.now()}`,
            type,
            title,
            message,
            timestamp: new Date(),
            read: false,
        };
        setNotifications(prev => [newNotif, ...prev].slice(0, 50)); // max 50
    }, []);

    const markAllRead = useCallback(() => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }, []);

    const markRead = useCallback((id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    }, []);

    const clearAll = useCallback(() => setNotifications([]), []);

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, addNotification, markAllRead, markRead, clearAll }}>
            {children}
        </NotificationContext.Provider>
    );
};
