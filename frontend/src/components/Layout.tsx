import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const Layout: React.FC = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();

    // Auto-close the mobile drawer whenever the route changes
    useEffect(() => {
        setSidebarOpen(false);
    }, [location.pathname]);

    return (
        <div className="app-layout">
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <div
                className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
                onClick={() => setSidebarOpen(false)}
                aria-hidden="true"
            />
            <div className="main-content">
                <Topbar onMenuClick={() => setSidebarOpen(o => !o)} />
                <div className="content-area">
                    <Outlet />
                </div>
            </div>
        </div>
    );
};

export default Layout;
