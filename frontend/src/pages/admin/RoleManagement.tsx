import React, { useState, useEffect } from 'react';
import { 
    Shield, 
    LayoutDashboard, 
    Users, 
    BookOpen, 
    Wallet, 
    Calendar, 
    Bus, 
    FileText, 
    GraduationCap, 
    ArrowUpCircle, 
    Settings,
    Save,
    CheckCircle2
} from 'lucide-react';

interface Module {
    id: string;
    name: string;
    icon: React.ReactNode;
}

const AVAILABLE_MODULES: Module[] = [
    { id: 'dashboard', name: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'students', name: 'Students', icon: <Users size={18} /> },
    { id: 'teachers', name: 'Teachers', icon: <Users size={18} /> },
    { id: 'classes', name: 'Classes', icon: <BookOpen size={18} /> },
    { id: 'fees', name: 'Accounts', icon: <Wallet size={18} /> },
    { id: 'attendance', name: 'Attendance', icon: <Calendar size={18} /> },
    { id: 'report-card', name: 'Report Card', icon: <FileText size={18} /> },
    { id: 'transport', name: 'Transport', icon: <Bus size={18} /> },
    { id: 'tc', name: 'Transfer Certificate', icon: <GraduationCap size={18} /> },
    { id: 'promote', name: 'Promotion', icon: <ArrowUpCircle size={18} /> },
    { id: 'roles', name: 'Role Management', icon: <Shield size={18} /> },
    { id: 'settings', name: 'Settings', icon: <Settings size={18} /> },
    { id: 'notice', name: 'Notice', icon: <FileText size={18} /> },
    { id: 'leave', name: 'Leave Apply', icon: <Calendar size={18} /> },
    { id: 'service-record', name: 'Service Record', icon: <Shield size={18} /> },
    { id: 'profile', name: 'My Profile', icon: <Users size={18} /> },
    { id: 'marks', name: 'Marks', icon: <BookOpen size={18} /> },
    { id: 'my-classes', name: 'My Classes', icon: <BookOpen size={18} /> },
];

const ROLES = ['ADMIN', 'PRINCIPAL', 'ACCOUNTS', 'TEACHER', 'TRANSPORT', 'PARENT'];

const RoleManagement: React.FC = () => {
    const [selectedRole, setSelectedRole] = useState(ROLES[0]);
    const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>({});
    const [message, setMessage] = useState('');

    useEffect(() => {
        // Load permissions from localStorage or defaults
        const saved = localStorage.getItem('role_permissions');
        if (saved) {
            setRolePermissions(JSON.parse(saved));
        } else {
            // Default setup
            const defaults = {
                ADMIN: AVAILABLE_MODULES.map(m => m.id),
                PRINCIPAL: ['dashboard', 'fees', 'attendance'],
                ACCOUNTS: ['dashboard', 'students', 'fees', 'tc'],
                TEACHER: ['dashboard', 'attendance', 'report-card'],
                TRANSPORT: ['dashboard', 'transport']
            };
            setRolePermissions(defaults);
            localStorage.setItem('role_permissions', JSON.stringify(defaults));
        }
    }, []);

    const togglePermission = (moduleId: string) => {
        const current = rolePermissions[selectedRole] || [];
        let updated;
        if (current.includes(moduleId)) {
            updated = current.filter(id => id !== moduleId);
        } else {
            updated = [...current, moduleId];
        }
        
        const newPermissions = { ...rolePermissions, [selectedRole]: updated };
        setRolePermissions(newPermissions);
    };

    const handleSave = () => {
        localStorage.setItem('role_permissions', JSON.stringify(rolePermissions));
        setMessage('Permissions updated successfully!');
        
        // Broadcast change for Sidebar (since they are in the same tab/window usually)
        window.dispatchEvent(new Event('storage'));
        
        setTimeout(() => setMessage(''), 3000);
    };

    const currentPermissions = rolePermissions[selectedRole] || [];

    return (
        <div style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.75rem', fontWeight: '700', color: '#1a202c' }}>
                        <Shield size={28} color="#4a90e2" />
                        Role Management
                    </h2>
                    <p style={{ color: '#718096', marginTop: '0.25rem' }}>Define which modules each user role can access.</p>
                </div>
                <button 
                    onClick={handleSave}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.75rem 1.5rem',
                        backgroundColor: '#4a90e2',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '1rem',
                        transition: 'all 0.2s',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#357abd'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#4a90e2'}
                >
                    <Save size={18} />
                    Save Changes
                </button>
            </div>

            {message && (
                <div style={{ 
                    padding: '1rem', 
                    backgroundColor: '#f0fff4', 
                    border: '1px solid #c6f6d5', 
                    color: '#2f855a', 
                    borderRadius: '8px', 
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}>
                    <CheckCircle2 size={20} />
                    {message}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '2rem', minHeight: '60vh' }}>
                {/* Roles Side List */}
                <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', fontWeight: '600', color: '#4a5568' }}>Select Role</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {ROLES.map(role => (
                            <button
                                key={role}
                                onClick={() => setSelectedRole(role)}
                                style={{
                                    padding: '0.875rem 1.25rem',
                                    textAlign: 'left',
                                    backgroundColor: selectedRole === role ? '#edf2ff' : 'transparent',
                                    color: selectedRole === role ? '#3b82f6' : '#4a5568',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: selectedRole === role ? '600' : '500',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {role}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Modules Checklist */}
                <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '2rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', fontWeight: '600', color: '#1a202c', borderBottom: '1px solid #edf2f7', paddingBottom: '1rem' }}>
                        Allotted Modules for <span style={{ color: '#4a90e2' }}>{selectedRole}</span>
                    </h3>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                        {AVAILABLE_MODULES.map(module => (
                            <div 
                                key={module.id}
                                onClick={() => togglePermission(module.id)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '1rem',
                                    border: '1px solid',
                                    borderColor: currentPermissions.includes(module.id) ? '#4a90e2' : '#e2e8f0',
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                    backgroundColor: currentPermissions.includes(module.id) ? '#f0f7ff' : '#fff',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <input 
                                    type="checkbox" 
                                    checked={currentPermissions.includes(module.id)}
                                    onChange={() => {}} // Controlled by parent div click
                                    style={{ width: '18px', height: '18px', marginRight: '1rem', cursor: 'pointer' }}
                                />
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: currentPermissions.includes(module.id) ? '#2c5282' : '#4a5568' }}>
                                    <div style={{ backgroundColor: currentPermissions.includes(module.id) ? '#fff' : '#f7fafc', padding: '0.5rem', borderRadius: '8px', color: currentPermissions.includes(module.id) ? '#4a90e2' : '#718096' }}>
                                        {module.icon}
                                    </div>
                                    <span style={{ fontWeight: '500' }}>{module.name}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RoleManagement;
