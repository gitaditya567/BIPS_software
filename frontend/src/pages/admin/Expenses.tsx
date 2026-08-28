import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    Plus, Trash2, Search, IndianRupee, 
    Loader2, ArrowRight,
    Calendar, Shield
} from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';

interface Expense {
    id: string;
    title: string;
    category: string;
    amount: number;
    date: string;
    payee: string | null;
    paymentMethod: string | null;
    description: string | null;
    status: string;
}

const CATEGORIES = ['Salary', 'Maintenance', 'Stationery', 'Utilities', 'Events', 'Other'];
const PAYMENT_METHODS = ['Cash', 'UPI', 'Bank Transfer', 'Cheque'];

const Expenses: React.FC = () => {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('All');
    const { addNotification } = useNotification();
    const [role, setRole] = useState<string>('ADMIN');

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            const parsed = JSON.parse(userData);
            setRole(parsed.role || '');
        }
    }, []);

    const [newExpense, setNewExpense] = useState({
        title: '',
        category: 'Maintenance',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        payee: '',
        paymentMethod: 'Cash',
        description: ''
    });

    const fetchExpenses = async () => {
        try {
            setLoading(true);
            const res = await axios.get('/erp-api/admin/expenses');
            setExpenses(res.data);
        } catch (err) {
            addNotification('error', 'Expense Load Error', 'Failed to fetch expenses');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (role === 'ADMIN') {
            fetchExpenses();
        }
    }, [role]);

    const handleAddExpense = async (e: React.FormEvent) => {
        // ... previous logic remains same but now only Admin can trigger the UI ...
        e.preventDefault();
        try {
            await axios.post('/erp-api/admin/expenses', newExpense);
            addNotification('success', 'Expense Saved', 'Expense added successfully');
            setNewExpense({
                title: '',
                category: 'Maintenance',
                amount: '',
                date: new Date().toISOString().split('T')[0],
                payee: '',
                paymentMethod: 'Cash',
                description: ''
            });
            fetchExpenses();
        } catch (err) {
            addNotification('error', 'Form Error', 'Failed to add expense');
        }
    };

    const handleDeleteExpense = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this expense?')) return;
        try {
            await axios.delete(`/erp-api/admin/expenses/${id}`);
            addNotification('success', 'Deleted', 'Expense deleted');
            fetchExpenses();
        } catch (err) {
            addNotification('error', 'Internal Error', 'Failed to delete expense');
        }
    };

    const filteredExpenses = expenses.filter(exp => {
        const matchesSearch = (exp.title || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                             (exp.payee || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = filterCategory === 'All' || exp.category === filterCategory;
        return matchesSearch && matchesCategory;
    });

    if (role !== 'ADMIN') {
        return (
            <div style={{ padding: '4rem', textAlign: 'center' }}>
                <div style={{ 
                    backgroundColor: 'white', 
                    padding: '3rem', 
                    borderRadius: '1.25rem', 
                    display: 'inline-block',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
                }}>
                    <Shield size={48} color="#ef4444" style={{ marginBottom: '1.5rem' }} />
                    <h2 style={{ margin: 0, color: '#1f2937' }}>Access Denied</h2>
                    <p style={{ color: '#6b7280', marginTop: '0.5rem' }}>Only administrators can view or manage expenses.</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: '2rem', height: '100%', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.875rem', fontWeight: '800', color: '#1f2937' }}>Expenses Management</h1>
                    <p style={{ margin: '0.25rem 0 0', color: '#6b7280' }}>Track and manage school expenditures</p>
                </div>
            </div>

            {/* Split Layout Container */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'minmax(350px, 400px) 1fr', 
                gap: '2rem',
                alignItems: 'start',
                flex: 1
            }}>
                
                {/* Left Side: Add Expense Form */}
                <div style={{ 
                    backgroundColor: 'white', 
                    borderRadius: '1.25rem', 
                    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                    overflow: 'hidden',
                    border: '1px solid #f3f4f6',
                    position: 'sticky',
                    top: '2rem'
                }}>
                    <div style={{ 
                        padding: '1.5rem', 
                        background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem'
                    }}>
                        <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: '0.5rem', borderRadius: '0.75rem' }}>
                            <Plus size={20} color="white" strokeWidth={3} />
                        </div>
                        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700' }}>Add Expense</h2>
                    </div>

                    <form onSubmit={handleAddExpense} style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#4b5563', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Expense Title</label>
                            <input 
                                required
                                type="text" 
                                value={newExpense.title}
                                onChange={(e) => setNewExpense({...newExpense, title: e.target.value})}
                                placeholder="e.g., Monthly Electricity Bill"
                                style={{ width: '100%', padding: '0.875rem', borderRadius: '0.75rem', border: '1px solid #e5e7eb', outline: 'none', backgroundColor: '#f9fafb', fontSize: '0.95rem' }}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#4b5563', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Amount (₹)</label>
                                <input 
                                    required
                                    type="number" 
                                    value={newExpense.amount}
                                    onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                                    placeholder="0.00"
                                    style={{ width: '100%', padding: '0.875rem', borderRadius: '0.75rem', border: '1px solid #e5e7eb', outline: 'none', backgroundColor: '#f9fafb' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#4b5563', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Date</label>
                                <input 
                                    required
                                    type="date" 
                                    value={newExpense.date}
                                    onChange={(e) => setNewExpense({...newExpense, date: e.target.value})}
                                    style={{ width: '100%', padding: '0.875rem', borderRadius: '0.75rem', border: '1px solid #e5e7eb', outline: 'none', backgroundColor: '#f9fafb' }}
                                />
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#4b5563', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Payment Mode</label>
                            <select 
                                value={newExpense.paymentMethod}
                                onChange={(e) => setNewExpense({...newExpense, paymentMethod: e.target.value})}
                                style={{ width: '100%', padding: '0.875rem', borderRadius: '0.75rem', border: '1px solid #e5e7eb', outline: 'none', backgroundColor: '#f9fafb', cursor: 'pointer' }}
                            >
                                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>

                        <button 
                            type="submit"
                            style={{ 
                                marginTop: '0.5rem',
                                padding: '1rem', 
                                borderRadius: '0.875rem', 
                                border: 'none', 
                                background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
                                color: 'white', 
                                fontWeight: '700', 
                                fontSize: '1.05rem',
                                cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem'
                            }}
                            onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseOut={e => e.currentTarget.style.transform = 'none'}
                        >
                            Save Expense Record <ArrowRight size={18} />
                        </button>
                    </form>
                </div>

                {/* Right Side: Table View */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    
                    {/* Search & Stats Header */}
                    <div style={{ 
                        backgroundColor: 'white', 
                        padding: '1.25rem', 
                        borderRadius: '1.25rem', 
                        boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '1.5rem',
                        border: '1px solid #f3f4f6'
                    }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                            <input 
                                type="text" 
                                placeholder="Search by title, payee..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ 
                                    width: '100%', padding: '0.75rem 1rem 0.75rem 2.75rem', 
                                    border: '1px solid #e5e7eb', borderRadius: '0.875rem', outline: 'none',
                                    fontSize: '0.95rem'
                                }}
                            />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <select 
                                value={filterCategory}
                                onChange={(e) => setFilterCategory(e.target.value)}
                                style={{ padding: '0.75rem 1.25rem', border: '1px solid #e5e7eb', borderRadius: '0.875rem', outline: 'none', fontSize: '0.95rem', cursor: 'pointer' }}
                            >
                                <option value="All">All Categories</option>
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <div style={{ 
                                background: 'rgba(79, 70, 229, 0.1)', 
                                padding: '0.75rem 1.25rem', 
                                borderRadius: '0.875rem', 
                                border: '1px solid rgba(79, 70, 229, 0.1)' 
                            }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#4f46e5', textTransform: 'uppercase', display: 'block', lineHeight: 1 }}>Total Results</span>
                                <span style={{ fontSize: '1.1rem', fontWeight: '800', color: '#4f46e5' }}>{filteredExpenses.length}</span>
                            </div>
                        </div>
                    </div>

                    {/* Table Card */}
                    <div style={{ 
                        backgroundColor: 'white', 
                        borderRadius: '1.25rem', 
                        boxShadow: '0 4px 20px rgba(0,0,0,0.05)', 
                        overflow: 'hidden',
                        border: '1px solid #f3f4f6'
                    }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
                                    <tr>
                                        <th style={{ padding: '1.25rem 1.5rem', color: '#4b5563', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Expense Title</th>
                                        <th style={{ padding: '1.25rem 1.5rem', color: '#4b5563', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Amount</th>
                                        <th style={{ padding: '1.25rem 1.5rem', color: '#4b5563', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mode</th>
                                        <th style={{ padding: '1.25rem 1.5rem', color: '#4b5563', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan={4} style={{ padding: '4rem', textAlign: 'center' }}>
                                                <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto', color: '#4f46e5' }} />
                                            </td>
                                        </tr>
                                    ) : filteredExpenses.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} style={{ padding: '4rem', textAlign: 'center', color: '#6b7280' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                                    <IndianRupee size={40} style={{ opacity: 0.2 }} />
                                                    <span>No expenses found matching your search.</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredExpenses.map((exp) => (
                                            <tr key={exp.id} className="table-row-hover" style={{ borderBottom: '1px solid #f3f4f6', transition: 'background-color 0.2s' }}>
                                                <td style={{ padding: '1.25rem 1.5rem' }}>
                                                    <div style={{ fontWeight: '700', color: '#111827', marginBottom: '0.2rem' }}>{exp.title}</div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#6b7280' }}>
                                                        <Calendar size={12} /> {new Date(exp.date).toLocaleDateString()}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '1.25rem 1.5rem' }}>
                                                    <div style={{ fontWeight: '800', color: '#10b981', fontSize: '1.1rem' }}>
                                                        ₹{(exp.amount || 0).toLocaleString()}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '1.25rem 1.5rem' }}>
                                                    <div style={{ fontSize: '0.75rem', color: '#4f46e5', fontWeight: '700', backgroundColor: 'rgba(79, 70, 229, 0.08)', padding: '0.25rem 0.5rem', borderRadius: '0.5rem', display: 'inline-block', textTransform: 'uppercase' }}>
                                                        {exp.paymentMethod || 'CASH'}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '1.25rem 1.5rem' }}>
                                                    <button 
                                                        onClick={() => handleDeleteExpense(exp.id)}
                                                        style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.5rem', borderRadius: '0.5rem', transition: 'background-color 0.2s' }}
                                                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
                                                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
            
            <style>{`
                .table-row-hover:hover {
                    background-color: #f9fafb !important;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-spin {
                    animation: spin 1s linear infinite;
                }
            `}</style>
        </div>
    );
};

export default Expenses;
