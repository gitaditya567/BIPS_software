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
    Settings,
    Save,
    CheckCircle2,
    Plus,
    UserPlus,
    Lock,
    Mail,
    Phone,
    User as UserIcon,
    Search,
    CheckSquare,
    Square,
    RotateCcw,
    Edit3,
    Trash2,
    AlertCircle,
    Bell,
    Check,
    X,
    Filter
} from 'lucide-react';
import axios from 'axios';

// ─── Module and Granular Feature Matrix Definitions ───────────────────────────
export interface Feature {
    id: string;
    name: string;
    description: string;
}

export interface ModulePermission {
    id: string;
    name: string;
    icon: React.ReactNode;
    features: Feature[];
}

export const MODULE_MATRIX: ModulePermission[] = [
    {
        id: 'dashboard',
        name: 'Dashboard',
        icon: <LayoutDashboard size={20} />,
        features: [
            { id: 'dashboard.view', name: 'View Overview', description: 'View dashboard summary cards' },
            { id: 'dashboard.dues', name: 'View Dues Summary', description: 'View total fee dues breakdown' },
            { id: 'dashboard.revenue', name: 'View Financial Revenue', description: 'Access revenue & collection charts' },
            { id: 'dashboard.quick_links', name: 'Quick Links', description: 'Access dashboard quick action shortcuts' }
        ]
    },
    {
        id: 'students',
        name: 'Student Management',
        icon: <Users size={20} />,
        features: [
            { id: 'students.view', name: 'View Student List', description: 'View student profiles & directory' },
            { id: 'students.add', name: 'Add New Student', description: 'Register new student profiles' },
            { id: 'students.edit', name: 'Edit Student Details', description: 'Modify student information & profile' },
            { id: 'students.delete', name: 'Delete Student', description: 'Remove student records' },
            { id: 'students.promote', name: 'Promote Students', description: 'Promote students to next class/session' },
            { id: 'students.export', name: 'Export Student Records', description: 'Download PDF / Excel reports' }
        ]
    },
    {
        id: 'teachers',
        name: 'Teacher & Staff',
        icon: <Users size={20} />,
        features: [
            { id: 'teachers.view', name: 'View Teacher List', description: 'View staff & teacher directory' },
            { id: 'teachers.add', name: 'Add New Teacher', description: 'Create new teacher profile' },
            { id: 'teachers.edit', name: 'Edit Teacher Info', description: 'Update teacher details and subjects' },
            { id: 'teachers.assign', name: 'Assign Class Teacher', description: 'Assign class teacher roles' },
            { id: 'teachers.delete', name: 'Delete Teacher', description: 'Remove teacher profiles' }
        ]
    },
    {
        id: 'classes',
        name: 'Classes & Sections',
        icon: <BookOpen size={20} />,
        features: [
            { id: 'classes.view', name: 'View Classes', description: 'View list of classes and sections' },
            { id: 'classes.add', name: 'Add Class / Section', description: 'Create new class or section' },
            { id: 'classes.edit', name: 'Edit Class', description: 'Modify class details' },
            { id: 'classes.delete', name: 'Delete Class', description: 'Remove class or section' }
        ]
    },
    {
        id: 'fees',
        name: 'Accounts & Fees',
        icon: <Wallet size={20} />,
        features: [
            { id: 'fees.view', name: 'View Fee Receipts', description: 'View fee records & payment ledgers' },
            { id: 'fees.collect', name: 'Collect Fees', description: 'Collect fees & print instant receipts' },
            { id: 'fees.other_fees', name: 'Other Fees Collection', description: 'Collect registration, late fee, event fee & misc fees' },
            { id: 'fees.approve', name: 'Approve Payment Requests', description: 'Approve or reject online payments' },
            { id: 'fees.structure', name: 'Fee Structure & Heads', description: 'Manage fee heads & monthly structures' },
            { id: 'fees.dues', name: 'Dues & Outstanding', description: 'View dues reports & download PDFs' },
            { id: 'fees.previous_due', name: 'Manage Previous Dues', description: 'Update previous session dues & discounts' },
            { id: 'expenses.view', name: 'View Expenses', description: 'Track school income & expenditures' }
        ]
    },
    {
        id: 'attendance',
        name: 'Attendance Management',
        icon: <Calendar size={20} />,
        features: [
            { id: 'attendance.view', name: 'View Attendance', description: 'View daily & monthly attendance logs' },
            { id: 'attendance.mark_student', name: 'Mark Student Attendance', description: 'Input student attendance' },
            { id: 'attendance.mark_teacher', name: 'Mark Teacher Attendance', description: 'Mark staff attendance' },
            { id: 'attendance.reports', name: 'Attendance Reports', description: 'Generate monthly attendance sheets' }
        ]
    },
    {
        id: 'report-card',
        name: 'Report Card & Marks',
        icon: <FileText size={20} />,
        features: [
            { id: 'report_card.view', name: 'View Marks & Grades', description: 'View student marks register' },
            { id: 'report_card.marks_entry', name: 'Enter / Edit Marks', description: 'Input subject exam marks' },
            { id: 'report_card.generate', name: 'Generate Report Cards', description: 'Compile term report cards' },
            { id: 'report_card.download', name: 'Download PDF', description: 'Download report cards as PDF' }
        ]
    },
    {
        id: 'transport',
        name: 'Transport Management',
        icon: <Bus size={20} />,
        features: [
            { id: 'transport.view', name: 'View Bus Routes', description: 'View transport routes & stops' },
            { id: 'transport.manage_stops', name: 'Manage Bus Stops & Fees', description: 'Add/edit bus stops & pricing' },
            { id: 'transport.assign_student', name: 'Assign Transport', description: 'Assign bus stops to students' }
        ]
    },
    {
        id: 'tc',
        name: 'Transfer Certificate (TC)',
        icon: <GraduationCap size={20} />,
        features: [
            { id: 'tc.view', name: 'View TC Records', description: 'View TC register & history' },
            { id: 'tc.issue', name: 'Issue New TC', description: 'Generate new transfer certificate' },
            { id: 'tc.print', name: 'Print TC PDF', description: 'Print TC document' }
        ]
    },
    {
        id: 'notice',
        name: 'Notice Board',
        icon: <Bell size={20} />,
        features: [
            { id: 'notice.view', name: 'View Notices', description: 'Read announcements' },
            { id: 'notice.create', name: 'Create Notice', description: 'Post new announcements' },
            { id: 'notice.delete', name: 'Delete Notice', description: 'Remove announcements' }
        ]
    },
    {
        id: 'roles',
        name: 'Role & User Management',
        icon: <Shield size={20} />,
        features: [
            { id: 'roles.view', name: 'View Role Management', description: 'Access role permissions page' },
            { id: 'roles.edit_matrix', name: 'Edit Role Permissions', description: 'Modify role permission matrix' },
            { id: 'roles.create_user', name: 'Create System Users', description: 'Register staff & set matrix access' }
        ]
    },
    {
        id: 'settings',
        name: 'Settings & Session',
        icon: <Settings size={20} />,
        features: [
            { id: 'settings.view', name: 'View Session Settings', description: 'View academic session details' },
            { id: 'settings.rollover', name: 'Session Rollover', description: 'Perform session rollover' }
        ]
    }
];

const ROLES = ['ADMIN', 'PRINCIPAL', 'ACCOUNTS', 'TEACHER', 'TRANSPORT', 'PARENT'];

// Default feature permissions per role
const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
    ADMIN: MODULE_MATRIX.flatMap(m => [m.id, ...m.features.map(f => f.id)]),
    PRINCIPAL: [
        'dashboard', 'dashboard.view', 'dashboard.dues', 'dashboard.revenue', 'dashboard.quick_links',
        'students', 'students.view', 'students.export',
        'teachers', 'teachers.view', 'teachers.assign',
        'classes', 'classes.view',
        'fees', 'fees.view', 'fees.collect', 'fees.other_fees', 'fees.dues',
        'attendance', 'attendance.view', 'attendance.reports',
        'report-card', 'report_card.view', 'report_card.generate', 'report_card.download',
        'notice', 'notice.view', 'notice.create'
    ],
    ACCOUNTS: [
        'dashboard', 'dashboard.view', 'dashboard.dues', 'dashboard.quick_links',
        'students', 'students.view', 'students.export',
        'classes', 'classes.view',
        'fees', 'fees.view', 'fees.collect', 'fees.other_fees', 'fees.approve', 'fees.structure', 'fees.dues', 'fees.previous_due', 'expenses.view',
        'tc', 'tc.view', 'tc.issue', 'tc.print',
        'notice', 'notice.view'
    ],
    TEACHER: [
        'dashboard', 'dashboard.view', 'dashboard.quick_links',
        'students', 'students.view',
        'classes', 'classes.view',
        'attendance', 'attendance.view', 'attendance.mark_student', 'attendance.reports',
        'report-card', 'report_card.view', 'report_card.marks_entry', 'report_card.generate',
        'notice', 'notice.view', 'notice.create'
    ],
    TRANSPORT: [
        'dashboard', 'dashboard.view',
        'transport', 'transport.view', 'transport.manage_stops', 'transport.assign_student',
        'students', 'students.view'
    ],
    PARENT: [
        'dashboard', 'dashboard.view',
        'fees', 'fees.view',
        'attendance', 'attendance.view',
        'report-card', 'report_card.view',
        'notice', 'notice.view'
    ]
};

const RoleManagement: React.FC = () => {
    // ─── States ─────────────────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState<'ROLE_MATRIX' | 'CREATE_USER' | 'SYSTEM_USERS'>('CREATE_USER');
    
    // Role Matrix tab state
    const [selectedRole, setSelectedRole] = useState(ROLES[0]);
    const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>({});
    
    // Create User tab state
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [userRole, setUserRole] = useState('ACCOUNTS');
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
    
    // Search / Filter inside Matrix
    const [matrixSearch, setMatrixSearch] = useState('');
    
    // System Users tab state
    const [systemUsers, setSystemUsers] = useState<any[]>([]);
    const [editingUser, setEditingUser] = useState<any | null>(null);
    const [editPermissions, setEditPermissions] = useState<string[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    
    // Notifications & Loading
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const [saving, setSaving] = useState(false);

    // ─── Effects ────────────────────────────────────────────────────────────
    useEffect(() => {
        // Load role permissions
        const saved = localStorage.getItem('role_permissions');
        if (saved) {
            setRolePermissions(JSON.parse(saved));
        } else {
            setRolePermissions(DEFAULT_ROLE_PERMISSIONS);
            localStorage.setItem('role_permissions', JSON.stringify(DEFAULT_ROLE_PERMISSIONS));
        }
        
        fetchSystemUsers();
    }, []);

    // Set initial permissions when role changes in Create User form
    useEffect(() => {
        const defaults = rolePermissions[userRole] || DEFAULT_ROLE_PERMISSIONS[userRole] || [];
        setSelectedPermissions(defaults);
    }, [userRole, rolePermissions]);

    const fetchSystemUsers = async () => {
        setLoadingUsers(true);
        try {
            const res = await axios.get('/erp-api/admin/system-users');
            setSystemUsers(res.data || []);
        } catch (err) {
            console.error('Failed to fetch system users:', err);
            // Fallback to local storage custom users if API fails
            const localCustomUsers = localStorage.getItem('custom_users_list');
            if (localCustomUsers) {
                setSystemUsers(JSON.parse(localCustomUsers));
            }
        } finally {
            setLoadingUsers(false);
        }
    };

    const showMessage = (text: string, type: 'success' | 'error' = 'success') => {
        setMessage({ text, type });
        setTimeout(() => setMessage(null), 4000);
    };

    // ─── Permission Matrix Helpers ──────────────────────────────────────────
    const togglePermission = (permId: string, currentList: string[], setter: (perms: string[]) => void) => {
        if (currentList.includes(permId)) {
            // Uncheck feature. Also if unchecking module main ID, uncheck subfeatures
            let updated = currentList.filter(id => id !== permId);
            const mod = MODULE_MATRIX.find(m => m.id === permId);
            if (mod) {
                const subIds = mod.features.map(f => f.id);
                updated = updated.filter(id => !subIds.includes(id));
            }
            setter(updated);
        } else {
            // Check feature. If checking subfeature, ensure module main ID is checked too!
            let updated = [...currentList, permId];
            const parentMod = MODULE_MATRIX.find(m => m.features.some(f => f.id === permId));
            if (parentMod && !updated.includes(parentMod.id)) {
                updated.push(parentMod.id);
            }
            // If checking main module ID, auto-check all its subfeatures!
            const mod = MODULE_MATRIX.find(m => m.id === permId);
            if (mod) {
                const subIds = mod.features.map(f => f.id);
                subIds.forEach(subId => {
                    if (!updated.includes(subId)) updated.push(subId);
                });
            }
            setter(updated);
        }
    };

    const toggleModuleAll = (moduleId: string, currentList: string[], setter: (perms: string[]) => void) => {
        const mod = MODULE_MATRIX.find(m => m.id === moduleId);
        if (!mod) return;
        const allModIds = [mod.id, ...mod.features.map(f => f.id)];
        const isAllSelected = allModIds.every(id => currentList.includes(id));
        
        if (isAllSelected) {
            // Remove all
            setter(currentList.filter(id => !allModIds.includes(id)));
        } else {
            // Add all
            const newSet = new Set([...currentList, ...allModIds]);
            setter(Array.from(newSet));
        }
    };

    const selectAllPermissions = (setter: (perms: string[]) => void) => {
        const allIds = MODULE_MATRIX.flatMap(m => [m.id, ...m.features.map(f => f.id)]);
        setter(allIds);
    };

    const clearAllPermissions = (setter: (perms: string[]) => void) => {
        setter([]);
    };

    const loadRoleDefaults = (roleName: string, setter: (perms: string[]) => void) => {
        const defaults = rolePermissions[roleName] || DEFAULT_ROLE_PERMISSIONS[roleName] || [];
        setter(defaults);
    };

    // ─── Handlers ───────────────────────────────────────────────────────────
    const handleSaveRoleMatrix = () => {
        localStorage.setItem('role_permissions', JSON.stringify(rolePermissions));
        window.dispatchEvent(new Event('storage'));
        showMessage(`Role permissions updated successfully for ${selectedRole}!`);
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !email.trim() || !password.trim()) {
            showMessage('Please enter Full Name, Email/Username, and Password', 'error');
            return;
        }

        setSaving(true);
        try {
            // Call backend API
            const payload = {
                name,
                email: email.trim(),
                password,
                phone,
                role: userRole,
                permissions: selectedPermissions
            };

            await axios.post('/erp-api/admin/system-users', payload);
            
            // Also store in localStorage custom_user_permissions map for instant UI sync
            const customPermsRaw = localStorage.getItem('custom_user_permissions');
            const customPermsMap = customPermsRaw ? JSON.parse(customPermsRaw) : {};
            customPermsMap[email.trim()] = selectedPermissions;
            localStorage.setItem('custom_user_permissions', JSON.stringify(customPermsMap));

            // Store in local custom users list
            const localCustomUsersRaw = localStorage.getItem('custom_users_list');
            const localCustomUsers = localCustomUsersRaw ? JSON.parse(localCustomUsersRaw) : [];
            localCustomUsers.unshift({
                id: Date.now().toString(),
                name,
                email: email.trim(),
                phone,
                role: userRole,
                permissions: selectedPermissions,
                createdAt: new Date().toISOString()
            });
            localStorage.setItem('custom_users_list', JSON.stringify(localCustomUsers));

            window.dispatchEvent(new Event('storage'));
            showMessage(`User '${name}' created successfully with ${selectedPermissions.length} granted matrix permissions!`);

            // Reset form
            setName('');
            setEmail('');
            setPassword('');
            setPhone('');
            fetchSystemUsers();
            setActiveTab('SYSTEM_USERS');
        } catch (err: any) {
            console.error('Create user error:', err);
            const errText = err.response?.data?.error || 'Failed to create user. Email may already exist.';
            showMessage(errText, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateUserPermissions = async () => {
        if (!editingUser) return;
        setSaving(true);
        try {
            await axios.put(`/erp-api/admin/system-users/${editingUser.id}/permissions`, {
                permissions: editPermissions,
                role: editingUser.role
            });

            // Update localStorage
            const customPermsRaw = localStorage.getItem('custom_user_permissions');
            const customPermsMap = customPermsRaw ? JSON.parse(customPermsRaw) : {};
            customPermsMap[editingUser.email] = editPermissions;
            localStorage.setItem('custom_user_permissions', JSON.stringify(customPermsMap));

            window.dispatchEvent(new Event('storage'));
            showMessage(`Permissions updated successfully for user ${editingUser.name}!`);
            setEditingUser(null);
            fetchSystemUsers();
        } catch (err: any) {
            console.error('Update permissions error:', err);
            showMessage('Failed to update user permissions', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteUser = async (userId: string, userName: string) => {
        if (!window.confirm(`Are you sure you want to delete user "${userName}"?`)) return;
        try {
            await axios.delete(`/erp-api/admin/system-users/${userId}`);
            showMessage(`User ${userName} deleted successfully.`);
            fetchSystemUsers();
        } catch (err) {
            console.error('Delete user error:', err);
            // Fallback for local users
            const localCustomUsersRaw = localStorage.getItem('custom_users_list');
            if (localCustomUsersRaw) {
                const list = JSON.parse(localCustomUsersRaw).filter((u: any) => u.id !== userId);
                localStorage.setItem('custom_users_list', JSON.stringify(list));
            }
            showMessage(`User deleted.`);
            fetchSystemUsers();
        }
    };

    // Filter modules based on search input
    const filteredModules = MODULE_MATRIX.filter(m => 
        m.name.toLowerCase().includes(matrixSearch.toLowerCase()) ||
        m.features.some(f => f.name.toLowerCase().includes(matrixSearch.toLowerCase()) || f.description.toLowerCase().includes(matrixSearch.toLowerCase()))
    );

    // ─── Render Helper Component for Permission Matrix Grid ──────────────────
    const renderMatrixGrid = (currentPermissions: string[], setter: (perms: string[]) => void) => {
        return (
            <div>
                {/* Search and Quick Controls Header */}
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1rem',
                    marginBottom: '1.5rem',
                    padding: '1rem',
                    backgroundColor: '#f8fafc',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '1', minWidth: '250px' }}>
                        <Search size={18} color="#94a3b8" />
                        <input 
                            type="text" 
                            placeholder="Search module or feature permission..."
                            value={matrixSearch}
                            onChange={(e) => setMatrixSearch(e.target.value)}
                            style={{
                                width: '100%',
                                border: 'none',
                                background: 'transparent',
                                outline: 'none',
                                fontSize: '0.95rem',
                                color: '#1e293b'
                            }}
                        />
                        {matrixSearch && (
                            <button 
                                onClick={() => setMatrixSearch('')}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button
                            type="button"
                            onClick={() => selectAllPermissions(setter)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.5rem 0.85rem',
                                backgroundColor: '#ebf5ff',
                                color: '#2563eb',
                                border: '1px solid #bfdbfe',
                                borderRadius: '6px',
                                fontSize: '0.85rem',
                                fontWeight: '600',
                                cursor: 'pointer'
                            }}
                        >
                            <CheckSquare size={15} /> Select All
                        </button>
                        <button
                            type="button"
                            onClick={() => clearAllPermissions(setter)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.5rem 0.85rem',
                                backgroundColor: '#fef2f2',
                                color: '#dc2626',
                                border: '1px solid #fecaca',
                                borderRadius: '6px',
                                fontSize: '0.85rem',
                                fontWeight: '600',
                                cursor: 'pointer'
                            }}
                        >
                            <Square size={15} /> Clear All
                        </button>
                        <button
                            type="button"
                            onClick={() => loadRoleDefaults(userRole || selectedRole, setter)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.5rem 0.85rem',
                                backgroundColor: '#f0fdf4',
                                color: '#16a34a',
                                border: '1px solid #bbf7d0',
                                borderRadius: '6px',
                                fontSize: '0.85rem',
                                fontWeight: '600',
                                cursor: 'pointer'
                            }}
                        >
                            <RotateCcw size={15} /> Reset to {userRole || selectedRole} Defaults
                        </button>
                    </div>
                </div>

                {/* Modules & Feature Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
                    {filteredModules.map(module => {
                        const allModFeatureIds = [module.id, ...module.features.map(f => f.id)];
                        const selectedCount = allModFeatureIds.filter(id => currentPermissions.includes(id)).length;
                        const isAllSelected = selectedCount === allModFeatureIds.length;
                        const isPartial = selectedCount > 0 && !isAllSelected;

                        return (
                            <div 
                                key={module.id}
                                style={{
                                    border: isAllSelected ? '2px solid #3b82f6' : isPartial ? '1px solid #93c5fd' : '1px solid #e2e8f0',
                                    borderRadius: '12px',
                                    backgroundColor: isAllSelected ? '#f8fafc' : '#ffffff',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                                    overflow: 'hidden',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {/* Module Card Header */}
                                <div style={{
                                    padding: '0.85rem 1.1rem',
                                    backgroundColor: isAllSelected ? '#eff6ff' : '#f8fafc',
                                    borderBottom: '1px solid #e2e8f0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                        <div style={{
                                            padding: '0.4rem',
                                            borderRadius: '8px',
                                            backgroundColor: isAllSelected ? '#3b82f6' : '#e2e8f0',
                                            color: isAllSelected ? '#ffffff' : '#475569'
                                        }}>
                                            {module.icon}
                                        </div>
                                        <div>
                                            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '600', color: '#1e293b' }}>
                                                {module.name}
                                            </h4>
                                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                {selectedCount} / {allModFeatureIds.length} Access Granted
                                            </span>
                                        </div>
                                    </div>

                                    {/* Toggle Module Header Checkbox */}
                                    <button
                                        type="button"
                                        onClick={() => toggleModuleAll(module.id, currentPermissions, setter)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.4rem',
                                            padding: '0.35rem 0.65rem',
                                            borderRadius: '6px',
                                            border: '1px solid',
                                            borderColor: isAllSelected ? '#2563eb' : '#cbd5e1',
                                            backgroundColor: isAllSelected ? '#2563eb' : '#ffffff',
                                            color: isAllSelected ? '#ffffff' : '#475569',
                                            fontSize: '0.8rem',
                                            fontWeight: '600',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {isAllSelected ? <CheckSquare size={14} /> : isPartial ? <Filter size={14} /> : <Square size={14} />}
                                        {isAllSelected ? 'Full Access' : isPartial ? 'Partial' : 'Enable Module'}
                                    </button>
                                </div>

                                {/* Features Checklist */}
                                <div style={{ padding: '0.85rem 1.1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                    {module.features.map(feature => {
                                        const isChecked = currentPermissions.includes(feature.id);
                                        return (
                                            <label
                                                key={feature.id}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'flex-start',
                                                    gap: '0.65rem',
                                                    padding: '0.5rem 0.65rem',
                                                    borderRadius: '6px',
                                                    backgroundColor: isChecked ? '#f0f9ff' : 'transparent',
                                                    border: isChecked ? '1px solid #bae6fd' : '1px solid transparent',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.15s'
                                                }}
                                                onMouseOver={(e) => {
                                                    if (!isChecked) e.currentTarget.style.backgroundColor = '#f8fafc';
                                                }}
                                                onMouseOut={(e) => {
                                                    if (!isChecked) e.currentTarget.style.backgroundColor = 'transparent';
                                                }}
                                            >
                                                <input 
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => togglePermission(feature.id, currentPermissions, setter)}
                                                    style={{ marginTop: '0.15rem', width: '16px', height: '16px', cursor: 'pointer' }}
                                                />
                                                <div>
                                                    <span style={{ fontSize: '0.875rem', fontWeight: '500', color: isChecked ? '#0369a1' : '#334155' }}>
                                                        {feature.name}
                                                    </span>
                                                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
                                                        {feature.description}
                                                    </p>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // ─── Main Component Return ──────────────────────────────────────────────
    return (
        <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
            {/* Header Title */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.75rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                        <Shield size={32} color="#3b82f6" />
                        Role & User Access Control
                    </h2>
                    <p style={{ color: '#64748b', marginTop: '0.35rem', marginBottom: 0 }}>
                        Manage default role permissions, register staff users, and customize granular permission matrix access.
                    </p>
                </div>
            </div>

            {/* Notification Banner */}
            {message && (
                <div style={{ 
                    padding: '1rem 1.25rem', 
                    backgroundColor: message.type === 'success' ? '#f0fdf4' : '#fef2f2', 
                    border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`, 
                    color: message.type === 'success' ? '#15803d' : '#991b1b', 
                    borderRadius: '10px', 
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    fontWeight: '500'
                }}>
                    {message.type === 'success' ? <CheckCircle2 size={22} /> : <AlertCircle size={22} />}
                    {message.text}
                </div>
            )}

            {/* Navigation Tabs */}
            <div style={{
                display: 'flex',
                gap: '0.5rem',
                borderBottom: '2px solid #e2e8f0',
                marginBottom: '2rem'
            }}>
                <button
                    type="button"
                    onClick={() => setActiveTab('CREATE_USER')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.85rem 1.5rem',
                        border: 'none',
                        borderBottom: activeTab === 'CREATE_USER' ? '3px solid #3b82f6' : '3px solid transparent',
                        backgroundColor: 'transparent',
                        color: activeTab === 'CREATE_USER' ? '#2563eb' : '#64748b',
                        fontWeight: activeTab === 'CREATE_USER' ? '700' : '500',
                        fontSize: '1rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                >
                    <UserPlus size={20} />
                    Create User & Permission Matrix
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('SYSTEM_USERS')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.85rem 1.5rem',
                        border: 'none',
                        borderBottom: activeTab === 'SYSTEM_USERS' ? '3px solid #3b82f6' : '3px solid transparent',
                        backgroundColor: 'transparent',
                        color: activeTab === 'SYSTEM_USERS' ? '#2563eb' : '#64748b',
                        fontWeight: activeTab === 'SYSTEM_USERS' ? '700' : '500',
                        fontSize: '1rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                >
                    <Users size={20} />
                    System Users & Matrix ({systemUsers.length})
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('ROLE_MATRIX')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.85rem 1.5rem',
                        border: 'none',
                        borderBottom: activeTab === 'ROLE_MATRIX' ? '3px solid #3b82f6' : '3px solid transparent',
                        backgroundColor: 'transparent',
                        color: activeTab === 'ROLE_MATRIX' ? '#2563eb' : '#64748b',
                        fontWeight: activeTab === 'ROLE_MATRIX' ? '700' : '500',
                        fontSize: '1rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                >
                    <Shield size={20} />
                    Role Matrix Defaults
                </button>
            </div>

            {/* ─── TAB 1: CREATE USER & PERMISSION MATRIX ────────────────────────── */}
            {activeTab === 'CREATE_USER' && (
                <form onSubmit={handleCreateUser}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '16px',
                        padding: '2rem',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                        marginBottom: '2rem'
                    }}>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#1e293b', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <UserIcon size={20} color="#3b82f6" /> User Account Details
                        </h3>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.25rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '0.4rem' }}>
                                    Full Name <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <UserIcon size={18} color="#94a3b8" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
                                    <input 
                                        type="text"
                                        required
                                        placeholder="e.g. Ramesh Kumar"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem 0.85rem 0.75rem 2.6rem',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '8px',
                                            fontSize: '0.95rem',
                                            outline: 'none',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '0.4rem' }}>
                                    Email / Login ID <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <Mail size={18} color="#94a3b8" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
                                    <input 
                                        type="email"
                                        required
                                        placeholder="e.g. ramesh@school.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem 0.85rem 0.75rem 2.6rem',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '8px',
                                            fontSize: '0.95rem',
                                            outline: 'none',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '0.4rem' }}>
                                    Password <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <Lock size={18} color="#94a3b8" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
                                    <input 
                                        type="password"
                                        required
                                        placeholder="Set password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem 0.85rem 0.75rem 2.6rem',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '8px',
                                            fontSize: '0.95rem',
                                            outline: 'none',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '0.4rem' }}>
                                    Phone / Mobile
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <Phone size={18} color="#94a3b8" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
                                    <input 
                                        type="text"
                                        placeholder="e.g. 9876543210"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem 0.85rem 0.75rem 2.6rem',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '8px',
                                            fontSize: '0.95rem',
                                            outline: 'none',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '0.4rem' }}>
                                    Primary Role Designation <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <select
                                    value={userRole}
                                    onChange={(e) => setUserRole(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem 0.85rem',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '8px',
                                        fontSize: '0.95rem',
                                        outline: 'none',
                                        backgroundColor: '#ffffff',
                                        fontWeight: '600',
                                        color: '#2563eb'
                                    }}
                                >
                                    {ROLES.map(r => (
                                        <option key={r} value={r}>{r}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Section: Permission Matrix */}
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '16px',
                        padding: '2rem',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                        marginBottom: '2rem'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Shield size={22} color="#3b82f6" /> User Permission Matrix Access
                                </h3>
                                <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
                                    Check specific modules and features you want to grant to this user.
                                </p>
                            </div>
                            <span style={{
                                padding: '0.4rem 0.85rem',
                                backgroundColor: '#ebf5ff',
                                color: '#2563eb',
                                borderRadius: '20px',
                                fontWeight: '700',
                                fontSize: '0.85rem'
                            }}>
                                {selectedPermissions.length} Permissions Selected
                            </span>
                        </div>

                        {renderMatrixGrid(selectedPermissions, setSelectedPermissions)}

                        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                type="submit"
                                disabled={saving}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.65rem',
                                    padding: '0.85rem 2.5rem',
                                    backgroundColor: saving ? '#94a3b8' : '#2563eb',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '10px',
                                    fontWeight: '700',
                                    fontSize: '1.05rem',
                                    cursor: saving ? 'not-allowed' : 'pointer',
                                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <UserPlus size={20} />
                                {saving ? 'Creating User...' : 'Create User & Save Permission Matrix'}
                            </button>
                        </div>
                    </div>
                </form>
            )}

            {/* ─── TAB 2: SYSTEM USERS LIST & EDIT MATRIX ──────────────────────── */}
            {activeTab === 'SYSTEM_USERS' && (
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '16px',
                    padding: '2rem',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                                System Users & Assigned Matrix
                            </h3>
                            <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
                                View created user accounts and customize their individual access matrix.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => setActiveTab('CREATE_USER')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.65rem 1.25rem',
                                backgroundColor: '#2563eb',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: '600',
                                cursor: 'pointer'
                            }}
                        >
                            <Plus size={18} /> Add New User
                        </button>
                    </div>

                    {loadingUsers ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                            Loading system users...
                        </div>
                    ) : systemUsers.length === 0 ? (
                        <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                            <UserIcon size={40} color="#94a3b8" style={{ marginBottom: '1rem' }} />
                            <h4 style={{ margin: 0, color: '#334155' }}>No Custom System Users Found</h4>
                            <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.35rem' }}>
                                Click "Add New User" to register a user with a customized permission matrix.
                            </p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                        <th style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', fontWeight: '700', color: '#475569' }}>USER NAME</th>
                                        <th style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', fontWeight: '700', color: '#475569' }}>EMAIL / LOGIN</th>
                                        <th style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', fontWeight: '700', color: '#475569' }}>DESIGNATION ROLE</th>
                                        <th style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', fontWeight: '700', color: '#475569' }}>MATRIX GRANTED</th>
                                        <th style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', fontWeight: '700', color: '#475569' }}>CREATED DATE</th>
                                        <th style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', fontWeight: '700', color: '#475569', textAlign: 'right' }}>ACTIONS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {systemUsers.map(usr => {
                                        const perms: string[] = usr.permissions || [];
                                        return (
                                            <tr key={usr.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '1rem', fontWeight: '600', color: '#0f172a' }}>
                                                    {usr.name}
                                                </td>
                                                <td style={{ padding: '1rem', color: '#334155', fontSize: '0.9rem' }}>
                                                    {usr.email}
                                                </td>
                                                <td style={{ padding: '1rem' }}>
                                                    <span style={{
                                                        padding: '0.3rem 0.7rem',
                                                        borderRadius: '12px',
                                                        backgroundColor: '#ebf5ff',
                                                        color: '#2563eb',
                                                        fontSize: '0.8rem',
                                                        fontWeight: '700'
                                                    }}>
                                                        {usr.role || 'ACCOUNTS'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '1rem' }}>
                                                    <span style={{
                                                        padding: '0.3rem 0.7rem',
                                                        borderRadius: '12px',
                                                        backgroundColor: perms.length > 0 ? '#f0fdf4' : '#fef2f2',
                                                        color: perms.length > 0 ? '#16a34a' : '#dc2626',
                                                        fontSize: '0.8rem',
                                                        fontWeight: '700'
                                                    }}>
                                                        {perms.length} Features Granted
                                                    </span>
                                                </td>
                                                <td style={{ padding: '1rem', color: '#64748b', fontSize: '0.85rem' }}>
                                                    {usr.createdAt ? new Date(usr.createdAt).toLocaleDateString() : 'N/A'}
                                                </td>
                                                <td style={{ padding: '1rem', textAlign: 'right' }}>
                                                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setEditingUser(usr);
                                                                setEditPermissions(usr.permissions || rolePermissions[usr.role] || []);
                                                            }}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '0.35rem',
                                                                padding: '0.45rem 0.75rem',
                                                                backgroundColor: '#f1f5f9',
                                                                color: '#334155',
                                                                border: '1px solid #cbd5e1',
                                                                borderRadius: '6px',
                                                                fontSize: '0.85rem',
                                                                fontWeight: '600',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            <Edit3 size={15} /> Edit Permissions Matrix
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteUser(usr.id, usr.name)}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '0.35rem',
                                                                padding: '0.45rem 0.65rem',
                                                                backgroundColor: '#fef2f2',
                                                                color: '#dc2626',
                                                                border: '1px solid #fecaca',
                                                                borderRadius: '6px',
                                                                fontSize: '0.85rem',
                                                                fontWeight: '600',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            <Trash2 size={15} /> Delete
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ─── EDIT USER PERMISSIONS MODAL ──────────────────────────────────── */}
            {editingUser && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2rem'
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '16px',
                        maxWidth: '1100px',
                        width: '100%',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        padding: '2rem',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: '700', color: '#0f172a' }}>
                                    Edit Permission Matrix: <span style={{ color: '#2563eb' }}>{editingUser.name}</span>
                                </h3>
                                <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>
                                    Role: <strong>{editingUser.role}</strong> | Email: <strong>{editingUser.email}</strong>
                                </p>
                            </div>
                            <button 
                                onClick={() => setEditingUser(null)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {renderMatrixGrid(editPermissions, setEditPermissions)}

                        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <button
                                type="button"
                                onClick={() => setEditingUser(null)}
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    backgroundColor: '#f1f5f9',
                                    color: '#475569',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleUpdateUserPermissions}
                                disabled={saving}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.75rem 2rem',
                                    backgroundColor: '#2563eb',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: '700',
                                    cursor: 'pointer'
                                }}
                            >
                                <Save size={18} />
                                {saving ? 'Saving...' : 'Save Matrix Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── TAB 3: ROLE MATRIX DEFAULTS ───────────────────────────────────── */}
            {activeTab === 'ROLE_MATRIX' && (
                <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '2rem' }}>
                    {/* Role Picker List */}
                    <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#475569', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Select Role Designation
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {ROLES.map(role => (
                                <button
                                    key={role}
                                    onClick={() => setSelectedRole(role)}
                                    style={{
                                        padding: '0.85rem 1.1rem',
                                        textAlign: 'left',
                                        backgroundColor: selectedRole === role ? '#ebf5ff' : 'transparent',
                                        color: selectedRole === role ? '#2563eb' : '#334155',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontWeight: selectedRole === role ? '700' : '500',
                                        transition: 'all 0.2s',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between'
                                    }}
                                >
                                    <span>{role}</span>
                                    {selectedRole === role && <Check size={16} color="#2563eb" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Role Matrix Content */}
                    <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '2rem', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>
                                    Default Access Matrix for <span style={{ color: '#2563eb' }}>{selectedRole}</span> Role
                                </h3>
                                <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.875rem' }}>
                                    These defaults apply to all newly created users assigned to the {selectedRole} role.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={handleSaveRoleMatrix}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.75rem 1.5rem',
                                    backgroundColor: '#2563eb',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                <Save size={18} /> Save Role Matrix
                            </button>
                        </div>

                        {renderMatrixGrid(
                            rolePermissions[selectedRole] || DEFAULT_ROLE_PERMISSIONS[selectedRole] || [],
                            (updated) => setRolePermissions({ ...rolePermissions, [selectedRole]: updated })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default RoleManagement;
