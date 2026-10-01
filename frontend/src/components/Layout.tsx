import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const MOBILE_QUERY = '(max-width: 1024px)';
const COLLAPSE_KEY = 'sidebar_collapsed';

const readCollapsedPref = (): boolean => {
    try {
        const saved = localStorage.getItem(COLLAPSE_KEY);
        if (saved !== null) return saved === '1';
    } catch { /* storage unavailable */ }
    // No saved preference: start collapsed on small laptop screens
    return typeof window !== 'undefined' && window.innerWidth <= 1280;
};

const Layout: React.FC = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(readCollapsedPref);
    const location = useLocation();

    // Auto-close the mobile drawer whenever the route changes
    useEffect(() => {
        setSidebarOpen(false);
    }, [location.pathname]);

    // Close the drawer when resizing up to desktop
    useEffect(() => {
        const mq = window.matchMedia(MOBILE_QUERY);
        const onChange = () => { if (!mq.matches) setSidebarOpen(false); };
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, []);

    // While the mobile drawer is open: lock background scroll and allow Esc to close
    useEffect(() => {
        if (!sidebarOpen) return;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSidebarOpen(false); };
        window.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = prevOverflow;
            window.removeEventListener('keydown', onKey);
        };
    }, [sidebarOpen]);

    const toggleCollapsed = () => {
        setCollapsed(c => {
            const next = !c;
            try { localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0'); } catch { /* ignore */ }
            return next;
        });
    };

    // Hamburger: opens the drawer on mobile, collapses/expands the sidebar on desktop
    const handleMenuClick = () => {
        if (window.matchMedia(MOBILE_QUERY).matches) setSidebarOpen(o => !o);
        else toggleCollapsed();
    };

    return (
        <div className="app-layout">
            <Sidebar
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                collapsed={collapsed}
                onToggleCollapse={toggleCollapsed}
            />
            <div
                className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
                onClick={() => setSidebarOpen(false)}
                aria-hidden="true"
            />
            <div className="main-content">
                <Topbar onMenuClick={handleMenuClick} />
                <div className="content-area">
                    <Outlet />
                </div>
            </div>
        </div>
    );
};

export default Layout;
