import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNotification } from '../../context/NotificationContext';

interface FeeRecord {
    id: string;
    receiptNo: string;
    studentName: string;
    admissionNo: string;
    className: string;
    feeHead: string;
    totalFee: number;
    discount: number;
    paidAmount: number;
    paymentMode: string;
    date: string;
    status: 'APPROVED' | 'PENDING' | 'REJECTED';
    submittedBy: string;
    approvedBy?: string;
    month?: string;
    year?: string;
}

interface FeeHead {
    id: string;
    name: string;
    type: 'Monthly' | 'Annual' | 'One-time' | 'Other';
}

interface DueFee {
    id: string;
    studentName: string;
    className: string;
    total: number;
    paid: number;
    pending: number;
}

// Removed Concession interface

const Fees: React.FC = () => {
    const { addNotification } = useNotification();
    const [user, setUser] = useState<{ id: string; role: string; name: string } | null>(null);
    const [activeTab, setActiveTab] = useState<'collection' | 'heads' | 'due' | 'structure' | 'reports' | 'approvals' | 'drafts'>('collection');
    const [activeReport, setActiveReport] = useState<'daily' | 'monthly' | 'class' | 'pending'>('daily');
    const [showReceipt, setShowReceipt] = useState(false);
    const [selectedReceipt, setSelectedReceipt] = useState<FeeRecord | null>(null);

    // Fee Records State
    const [feeRecords, setFeeRecords] = useState<FeeRecord[]>([]);
    const [studentHistory, setStudentHistory] = useState<FeeRecord[]>([]);
    const [feeHeads, setFeeHeads] = useState<FeeHead[]>([]);


    // Due Fees State
    const [dueFees] = useState<DueFee[]>([]);


    // Concessions State
    // Concessions State Removed


    // Fee Structure State
    const [feeStructure, setFeeStructure] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);

    const [structFilterClass, setStructFilterClass] = useState('');





    const [students, setStudents] = useState<any[]>([]);


    // Collection Form fields
    const [studentName, setStudentName] = useState('');
    const [admissionNo, setAdmissionNo] = useState('');
    const [selectedClass, setSelectedClass] = useState('');
    const [totalFee, setTotalFee] = useState('0');
    const [discount, setDiscount] = useState('0');
    const [finalAmount, setFinalAmount] = useState('0');
    const [paidAmount, setPaidAmount] = useState('');
    const [paymentMode, setPaymentMode] = useState('Cash');
    const [receiptNo, setReceiptNo] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedFees, setSelectedFees] = useState<string[]>([]);
    const [selectedMonth, setSelectedMonth] = useState('April');
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);

    const isFeePaid = (headName: string) => {
        const headObj = feeHeads.find(h => h.name === headName);
        if (!headObj) return false;
        const isMonthly = headObj.type && headObj.type.toLowerCase().includes('month');
        return studentHistory.some(r => {
            const feeParts = r.feeHead.split(':');
            const headsArr = feeParts.length > 1 
                ? feeParts[1].split(',').map(s => s.trim())
                : r.feeHead.split(',').map(s => s.trim());
            return headsArr.includes(headName) && (!isMonthly || r.month === selectedMonth);
        });
    };

    const toggleFeeSelection = (feeName: string) => {
        if (isFeePaid(feeName)) return; // Prevent toggling disabled fees
        setSelectedFees(prev => 
            prev.includes(feeName) 
                ? prev.filter(f => f !== feeName) 
                : [...prev, feeName]
        );
    };

    const selectAllFees = () => {
        const availableFees = feeHeads.filter(h => !isFeePaid(h.name)).map(h => h.name);
        if (selectedFees.length === availableFees.length) {
            setSelectedFees([]);
        } else {
            setSelectedFees(availableFees);
        }
    };

    // Fee Head Form fields
    const [newHeadName, setNewHeadName] = useState('');
    const [newHeadType, setNewHeadType] = useState<'Monthly' | 'Annual' | 'One-time' | 'Other'>('Monthly');

    // Concession Form fields Removed

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            const parsedUser = JSON.parse(userData);
            setUser(parsedUser);
            
            // Initial data load
            if (parsedUser.role === 'PRINCIPAL' || parsedUser.role === 'ADMIN') {
                fetchPendingApprovals();
            }
            if (parsedUser.role === 'ACCOUNTS') {
                fetchAllHistory();
            }

            // Click outside listener for search dropdown
            const handleClickOutside = (e: MouseEvent) => {
                const searchGroup = document.querySelector('.student-search-group');
                if (searchGroup && !searchGroup.contains(e.target as Node)) {
                    setShowSearchDropdown(false);
                }
            };
            document.addEventListener('mousedown', handleClickOutside);

            // Polling for auto-refresh every 5 seconds
            const interval = setInterval(() => {
                if (parsedUser.role === 'PRINCIPAL' || parsedUser.role === 'ADMIN') {
                    fetchPendingApprovals();
                }
                if (parsedUser.role === 'ACCOUNTS') {
                    fetchAllHistory();
                }
            }, 5000);

            // Cleanup interval and listener on unmount
            return () => {
                clearInterval(interval);
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
    }, []);

    // Fetch initial data regardless of login status (for the module to function)
    useEffect(() => {
        fetchClasses();
        fetchStudents();
        fetchFeeHeads();
        fetchFeeStructure();
        fetchNextReceiptNo();
    }, []);

    const fetchNextReceiptNo = async () => {
        try {
            const res = await axios.get('/api/fees/next-receipt');
            if (res.data && res.data.receiptNo) {
                setReceiptNo(res.data.receiptNo);
            }
        } catch (err) {
            console.error('Failed to fetch next receipt number');
        }
    };



    const fetchPendingApprovals = async () => {
        try {
            const res = await axios.get('/api/fees/pending');
            // Map backend amountPaid to frontend paidAmount
            const mappedData = res.data.map((r: any) => ({
                ...r,
                paidAmount: r.amountPaid || r.paidAmount || 0
            }));
            setFeeRecords(prev => {
                const nonPending = prev.filter(r => r.status !== 'PENDING');
                return [...nonPending, ...mappedData];
            });
        } catch (err) {
            console.error('Failed to fetch approvals:', err);
        }
    };


    const fetchStudentHistory = async (studentId: string, studentNameVal: string) => {
        try {
            const res = await axios.get(`/api/fees/history/${studentId}`);
            setStudentHistory(res.data.map((r: any) => ({
                ...r,
                paidAmount: r.amountPaid || r.paidAmount || 0,
                date: new Date(r.paymentDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
                studentName: studentNameVal
            })));
        } catch (err) {
            console.error('Failed to fetch history:', err);
        }
    };



    const fetchClasses = async () => {
        try {
            const res = await axios.get('/api/admin/classes');
            setClasses(res.data);
        } catch (err) { console.error('Failed to fetch classes'); }
    };

    const handleDeleteFeeStructure = async (classId: string) => {
        if (!window.confirm('Are you sure you want to permanently delete the fee structure for this class?')) return;
        try {
            await axios.delete(`/api/fees/structure/${classId}`);
            setFeeStructure(prev => prev.filter(f => f.id !== classId));
            alert('Fee structure deleted permanently.');
        } catch (err) {
            alert('Failed to delete fee structure.');
        }
    };

    const fetchAllHistory = async () => {
        try {
            const res = await axios.get('/api/fees');
            setFeeRecords(res.data.map((r: any) => ({
                ...r,
                paidAmount: r.amountPaid || r.paidAmount || 0,
                date: new Date(r.paymentDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
                studentName: r.student?.user?.name || 'Student'
                // This might need more mapping if we want teacher's info too
            })));
        } catch (err) {
            console.error('Failed to fetch full history:', err);
        }
    };



    const fetchStudents = async () => {
        try {
            const res = await axios.get('/api/admin/students');
            if (res.data && res.data.length > 0) {
                setStudents(res.data);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const fetchFeeHeads = async () => {
        try {
            const res = await axios.get('/api/fees/heads');
            setFeeHeads(res.data);
        } catch (err) { console.error('Failed to fetch fee heads'); }
    };

    // fetchConcessions removed

    const fetchFeeStructure = async () => {
        try {
            const res = await axios.get('/api/fees/structure');
            setFeeStructure(res.data);
        } catch (err) { console.error('Failed to fetch fee structure'); }
    };

    // Auto-update fee amount when Class or selectedFees changes

    useEffect(() => {
        if (selectedClass) {
            const struct = feeStructure.find(s => s.className === selectedClass);
            if (struct && struct.fees) {
                const subtotal = selectedFees.reduce((sum, feeName) => sum + (struct.fees[feeName] || 0), 0);
                const discVal = Number(discount) || 0;
                const netPayable = (subtotal - discVal).toString();
                setTotalFee(subtotal.toString());
                setFinalAmount(netPayable);
                setPaidAmount(netPayable); // Auto-fill amount being paid
            }
        } else {
            setTotalFee('0');
            setFinalAmount('0');
            setPaidAmount('');
        }
    }, [selectedClass, selectedFees, discount, feeStructure]);

    const handleCollectFee = async (e: React.FormEvent) => {
        e.preventDefault();
        const student = students.find(s => s.name === studentName || s.admissionNo === admissionNo);
        if (!student || !paidAmount || !receiptNo || selectedFees.length === 0) 
            return alert('Please search student and select at least one fee head');
            
        const isPending = Number(discount) > 0;
        
        try {
            const payload = {
                studentId: student.id,
                admissionNo: student.admissionNo,
                amountPaid: Number(paidAmount),
                totalFee: Number(totalFee),
                discount: Number(discount),
                discountReason: isPending ? 'Requested Discount' : '',
                feeHead: `${selectedMonth}: ${selectedFees.join(', ')}`,
                paymentMode,
                month: selectedMonth,
                year: new Date().getFullYear().toString(),
                submittedBy: user?.name || 'User'
            };

            const res = await axios.post('/api/fees/collect', payload);
            const savedRecord = res.data.data;
            
            const newRecord: FeeRecord = { 
                ...savedRecord,
                paidAmount: savedRecord.amountPaid || savedRecord.paidAmount || 0,
                id: savedRecord.id,
                date: new Date(savedRecord.paymentDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
                studentName: student.name,
                className: student.className
            };

            
            setFeeRecords([newRecord, ...feeRecords]);
            
            if (isPending) {
                alert('Fee Collection contains a Discount. Request sent to Principal for Approval!');
                addNotification('fee', 'Pending Approval', `Discount proposal for ${studentName} sent to Principal.`);
            } else {
                setSelectedReceipt(newRecord);
                setShowReceipt(true);
                addNotification('fee', 'Fee Received', `₹${Number(paidAmount).toLocaleString()} collected from ${studentName}.`);
            }
            
            // Reset form
            setStudentName(''); 
            setAdmissionNo(''); 
            setSelectedClass('');
            setSelectedFees([]);
            setPaidAmount(''); 
            setTotalFee('0'); 
            setDiscount('0'); 
            setFinalAmount('0');
            fetchNextReceiptNo();
        } catch (error: any) {
            console.error(error);
            const errMsg = error.response?.data?.error || 'Failed to process fee collection';
            alert(errMsg);
        }

    };

    const approveFee = async (id: string) => {
        try {
            await axios.post(`/api/fees/${id}/approve`, { approvedBy: user?.name });
            setFeeRecords(prev => prev.map(rec => 
                rec.id === id ? { ...rec, status: 'APPROVED' } : rec
            ));
            addNotification('fee', 'Fee Approved', 'Principal approved the fee concession.');
        } catch (error) {
            alert('Failed to approve fee');
        }
    };

    const rejectFee = async (id: string) => {
        try {
            await axios.post(`/api/fees/${id}/reject`, { approvedBy: user?.name });
            setFeeRecords(prev => prev.map(rec => 
                rec.id === id ? { ...rec, status: 'REJECTED' } : rec
            ));
            addNotification('fee', 'Fee Rejected', 'Principal rejected the fee concession.');
        } catch (error) {
            alert('Failed to reject fee');
        }
    };


    const payFullRejectedFee = async (id: string) => {
        if (!window.confirm('Discount was rejected. Are you sure you want to collect the FULL amount now?')) return;
        try {
            const res = await axios.post(`/api/fees/${id}/pay-full`);
            const data = res.data.data;
            const updatedRec = {
                ...data,
                paidAmount: data.amountPaid,
                date: new Date(data.paymentDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
                studentName: feeRecords.find(r => r.id === id)?.studentName || 'Student',
                className: feeRecords.find(r => r.id === id)?.className || ''
            };
            setFeeRecords(prev => prev.map(rec => rec.id === id ? updatedRec : rec));
            setSelectedReceipt(updatedRec);
            setShowReceipt(true);
            addNotification('fee', 'Full Amount Collected', 'Rejected draft has been updated to full amount and paid.');
        } catch (error) {
            alert('Failed to process full payment');
        }
    };


    const handleAddFeeHead = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newHeadName) return alert('Please fill required fields');
        try {
            const res = await axios.post('/api/fees/heads', { name: newHeadName, type: newHeadType });
            setFeeHeads([...feeHeads, res.data]);
            setNewHeadName('');
            setNewHeadType('Monthly');
            alert('Fee Head Added Successfully!');
        } catch (err: any) { 
            alert(err.response?.data?.error || 'Failed to add fee head'); 
        }
    };

    const handleDeleteFeeHead = async (id: string, name: string) => {
        if (!window.confirm(`Are you sure you want to permanently delete "${name}"?`)) return;
        try {
            await axios.delete(`/api/fees/heads/${id}`);
            setFeeHeads(feeHeads.filter(h => h.id !== id));
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to delete fee head');
        }
    };

    // handleAddConcession removed

    return (
        <div style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: '#111827' }}>Accounts Module</h1>
                <div style={{ display: 'flex', gap: '0.4rem', background: '#f1f5f9', padding: '0.35rem', borderRadius: '10px' }}>
                    {[
                        { id: 'collection', label: 'Fee Collection' },
                        { id: 'drafts', label: 'My Drafts' },
                        { id: 'approvals', label: 'Approvals' },
                        { id: 'heads', label: 'Fee Heads' },
                        { id: 'due', label: 'Due Fees' },
                        { id: 'structure', label: 'Fee Structure' },
                        { id: 'reports', label: 'Fee Reports' }
                    ].map(tab => {

                        // Principal or Admin only for Approvals
                        const isAuthorized = user?.role === 'PRINCIPAL' || user?.role === 'ADMIN';
                        if (tab.id === 'approvals' && !isAuthorized) return null;
                        
                        // Accountant only for Drafts
                        if (tab.id === 'drafts' && user?.role !== 'ACCOUNTS') return null;

                        
                        return (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem', backgroundColor: activeTab === tab.id ? 'white' : 'transparent', color: activeTab === tab.id ? '#2563eb' : '#64748b', boxShadow: activeTab === tab.id ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', transition: '0.2s' }}>
                                {tab.id === 'approvals' && (feeRecords.filter(r => r.status === 'PENDING').length > 0) ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        {tab.label} <span style={{ backgroundColor: '#ef4444', color: 'white', fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '10px' }}>{feeRecords.filter(r => r.status === 'PENDING').length}</span>
                                    </div>
                                ) : tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {activeTab === 'collection' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
                    {/* 1. Student Search */}
                    <div className="stat-card" style={{ display: 'block' }}>
                        <h3 style={{ marginBottom: '1rem', color: '#1e293b', fontSize: '1.2rem' }}>1. Student Search</h3>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
                             <div className="form-group student-search-group" style={{ flex: 2, position: 'relative' }}>
                                 <label>Enter Student Name or Admission Number</label>
                                 <input 
                                     type="text" 
                                     className="form-control" 
                                     placeholder="Type name, admission no, or class..." 
                                     value={studentName} 
                                     onFocus={() => setShowSearchDropdown(true)}
                                     onChange={e => { 
                                         const val = e.target.value;
                                         setStudentName(val); 
                                         setShowSearchDropdown(true);
                                         
                                         // If value is cleared, reset student details
                                         if (!val) {
                                             setAdmissionNo('');
                                             setSelectedClass('');
                                             setStudentHistory([]);
                                         }
                                     }} 
                                 />
                                 {showSearchDropdown && studentName && (
                                     <div style={{ 
                                         position: 'absolute', 
                                         top: '100%', 
                                         left: 0, 
                                         right: 0, 
                                         backgroundColor: 'white', 
                                         border: '1px solid #e2e8f0', 
                                         borderRadius: '8px', 
                                         marginTop: '4px', 
                                         boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', 
                                         zIndex: 50, 
                                         maxHeight: '300px', 
                                         overflowY: 'auto' 
                                     }}>
                                         {(() => {
                                             const filtered = students.filter(s => 
                                                 s.name.toLowerCase().includes(studentName.toLowerCase()) || 
                                                 s.admissionNo.toLowerCase().includes(studentName.toLowerCase()) ||
                                                 s.className.toLowerCase().includes(studentName.toLowerCase())
                                             ).slice(0, 10); // Limit to top 10 for performance

                                             if (filtered.length === 0) return <div style={{ padding: '1rem', textAlign: 'center', color: '#64748b' }}>No students found</div>;

                                             return filtered.map(s => (
                                                 <div 
                                                     key={s.id} 
                                                     onClick={() => {
                                                         setStudentName(s.name);
                                                         setAdmissionNo(s.admissionNo);
                                                         setSelectedClass(s.className);
                                                         fetchStudentHistory(s.id, s.name);
                                                         setShowSearchDropdown(false);
                                                     }}
                                                     style={{ 
                                                         padding: '0.75rem 1rem', 
                                                         cursor: 'pointer', 
                                                         borderBottom: '1px solid #f1f5f9',
                                                         transition: 'background 0.2s'
                                                     }}
                                                     onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                                     onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
                                                 >
                                                     <div style={{ fontWeight: '700', color: '#1e293b' }}>{s.name}</div>
                                                     <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                         {s.admissionNo} • {s.className}
                                                     </div>
                                                 </div>
                                             ));
                                         })()}
                                     </div>
                                 )}
                             </div>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label>Installment / Month</label>
                                <select className="form-control" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
                                    {['April','May','June','July','August','September','October','November','December','January','February','March'].map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label>Receipt No</label>
                                <input type="text" className="form-control" value={receiptNo} readOnly style={{ backgroundColor: '#f1f5f9' }} />
                            </div>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label>Date</label>
                                <input type="date" className="form-control" value={date} onChange={e => setDate(e.target.value)} />
                            </div>
                        </div>
                    </div>

                    {studentName && admissionNo ? (
                        <>
                            {/* 2. Student Details */}
                            <div className="stat-card" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                <div style={{ gridColumn: 'span 4' }}><h3 style={{ color: '#1e293b', fontSize: '1.1rem' }}>2. Student Details</h3></div>
                                <div><label style={{ color: '#64748b', fontSize: '0.8rem' }}>Full Name</label><div style={{ fontWeight: '700', fontSize: '1.1rem' }}>{studentName}</div></div>
                                <div><label style={{ color: '#64748b', fontSize: '0.8rem' }}>Admission No</label><div style={{ fontWeight: '700', fontSize: '1.1rem' }}>{admissionNo}</div></div>
                                <div><label style={{ color: '#64748b', fontSize: '0.8rem' }}>Current Class</label><div style={{ fontWeight: '700', fontSize: '1.1rem' }}>{selectedClass}</div></div>
                                <div><label style={{ color: '#64748b', fontSize: '0.8rem' }}>Status</label><div><span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold' }}>Active</span></div></div>
                            </div>

                            {/* 3. Fee Structure */}
                            <div className="stat-card" style={{ display: 'block' }}>
                                <h3 style={{ marginBottom: '1rem', color: '#1e293b', fontSize: '1.1rem' }}>3. Applicable Fee Structure ({selectedClass})</h3>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ backgroundColor: '#f1f5f9' }}>
                                                <th style={{ padding: '0.75rem', textAlign: 'center', border: '1px solid #e2e8f0', width: '100px' }}>
                                                    <button onClick={selectAllFees} style={{ fontSize: '0.7rem', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>
                                                        {selectedFees.length === feeHeads.length ? 'Unselect All' : 'Select All'}
                                                    </button>
                                                </th>
                                                {feeHeads.map(h => <th key={h.id} style={{ padding: '0.75rem', textAlign: 'right', border: '1px solid #e2e8f0', fontSize: '0.8rem' }}>{h.name}</th>)}
                                                <th style={{ padding: '0.75rem', textAlign: 'right', border: '1px solid #e2e8f0', background: '#e0f2fe' }}>Total Annual</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td style={{ textAlign: 'center', border: '1px solid #e2e8f0' }}>-</td>
                                                {feeHeads.map(h => {
                                                    const struct = feeStructure.find(s => s.className === selectedClass);
                                                    const amount = struct?.fees?.[h.name] || 0;
                                                    const isSelected = selectedFees.includes(h.name);
                                                    const disabled = isFeePaid(h.name);
                                                    return (
                                                        <td 
                                                            key={h.id} 
                                                            onClick={disabled ? undefined : () => toggleFeeSelection(h.name)}
                                                            style={{ 
                                                                padding: '0.75rem', 
                                                                textAlign: 'right', 
                                                                border: '1px solid #e2e8f0', 
                                                                fontWeight: '600',
                                                                cursor: disabled ? 'not-allowed' : 'pointer',
                                                                backgroundColor: disabled ? '#f1f5f9' : isSelected ? '#dcfce7' : 'transparent',
                                                                color: disabled ? '#94a3b8' : 'inherit',
                                                                transition: '0.2s',
                                                                textDecoration: disabled ? 'line-through' : 'none'
                                                            }}
                                                        >
                                                            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem' }}>
                                                                <input type="checkbox" checked={disabled || isSelected} readOnly disabled={disabled} />
                                                                ₹{amount.toLocaleString()}
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                                <td style={{ padding: '0.75rem', textAlign: 'right', border: '1px solid #e2e8f0', background: '#f0f9ff', fontWeight: '800', color: '#0369a1' }}>
                                                    ₹{(() => {
                                                        const struct = feeStructure.find(s => s.className === selectedClass);
                                                        return (Object.values(struct?.fees || {}) as number[]).reduce((a: number, b: number) => a + b, 0).toLocaleString();
                                                    })()}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* 4. Previous Payment History */}
                            <div className="stat-card" style={{ display: 'block' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                    <h3 style={{ color: '#1e293b', fontSize: '1.1rem' }}>4. Previous & Recent Collections</h3>
                                    {user?.role === 'ACCOUNTS' && <span style={{ fontSize: '0.8rem', color: '#64748b' }}>* Collections with discounts require Principal approval</span>}
                                </div>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead><tr style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '0.85rem' }}><th style={{ padding: '0.75rem' }}>Receipt</th><th style={{ padding: '0.75rem' }}>Fee Head</th><th style={{ padding: '0.75rem' }}>Amount</th><th style={{ padding: '0.75rem' }}>Discount</th><th style={{ padding: '0.75rem' }}>Date</th><th style={{ padding: '0.75rem' }}>Status</th></tr></thead>
                                    <tbody>
                                        {studentHistory.length > 0 ? (
                                            studentHistory.map(r => (
                                                <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '0.75rem', color: '#2563eb', fontWeight: '700' }}>{r.receiptNo}</td>
                                                    <td style={{ padding: '0.75rem', fontSize: '0.9rem' }}>{r.feeHead}</td>
                                                    <td style={{ padding: '0.75rem', fontWeight: '800' }}>₹{r.paidAmount.toLocaleString()}</td>
                                                    <td style={{ padding: '0.75rem', color: r.discount > 0 ? '#ef4444' : '#64748b', fontWeight: '600' }}>{r.discount > 0 ? `₹${r.discount}` : '-'}</td>
                                                    <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>{r.date}</td>
                                                    <td style={{ padding: '0.75rem' }}>
                                                        <span style={{ 
                                                            fontSize: '0.65rem', 
                                                            fontWeight: '800', 
                                                            padding: '0.2rem 0.5rem', 
                                                            borderRadius: '12px',
                                                            textTransform: 'uppercase',
                                                            backgroundColor: r.status === 'APPROVED' ? '#dcfce7' : r.status === 'PENDING' ? '#fef9c3' : '#fee2e2',
                                                            color: r.status === 'APPROVED' ? '#166534' : r.status === 'PENDING' ? '#854d0e' : '#991b1b',
                                                            border: `1px solid ${r.status === 'APPROVED' ? '#16653440' : r.status === 'PENDING' ? '#854d0e40' : '#991b1b40'}`
                                                        }}>
                                                            {r.status}
                                                        </span>
                                                        {r.status === 'APPROVED' && (
                                                            <button onClick={() => { setSelectedReceipt(r); setShowReceipt(true); }} style={{ marginLeft: '0.5rem', border: 'none', background: 'none', color: '#4f46e5', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 'bold', textDecoration: 'underline' }}>View</button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>No previous payments found for this student.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                                {/* 5. Fee Summary */}
                                <div className="stat-card" style={{ display: 'block', backgroundColor: '#fff7ed', border: '1px solid #ffedd5' }}>
                                    <h3 style={{ marginBottom: '1.5rem', color: '#9a3412', fontSize: '1.1rem' }}>5. Fee Summary</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        <label style={{ fontSize: '0.85rem', color: '#7c2d12', fontWeight: 'bold' }}>Selected Fees:</label>
                                        <div style={{ background: 'white', padding: '1rem', borderRadius: '8px', border: '1px solid #fed7aa' }}>
                                            {selectedFees.length > 0 ? (
                                                selectedFees.map(feeName => {
                                                    const struct = feeStructure.find(s => s.className === selectedClass);
                                                    const amount = struct?.fees?.[feeName] || 0;
                                                    return (
                                                        <div key={feeName} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px dashed #fed7aa', fontSize: '0.9rem' }}>
                                                            <span>{feeName}</span>
                                                            <span style={{ fontWeight: 'bold' }}>₹{amount.toLocaleString()}</span>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div style={{ textAlign: 'center', color: '#9a3412', fontSize: '0.875rem' }}>No fees selected. Click on amounts above.</div>
                                            )}
                                        </div>
                                        <div style={{ marginTop: '0.5rem', borderTop: '2px solid #fdba74', paddingTop: '1rem' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem' }}>
                                                <div style={{ textAlign: 'right', fontSize: '0.9rem' }}>Subtotal:</div>
                                                <div style={{ textAlign: 'right', fontWeight: 'bold' }}>₹{Number(totalFee).toLocaleString()}</div>
                                                
                                                <div style={{ textAlign: 'right', fontSize: '0.9rem', color: '#ea580c' }}>- Discount (₹):</div>
                                                <div><input type="number" className="form-control" style={{ height: '30px', textAlign: 'right', fontWeight: 'bold' }} value={discount} onChange={e => setDiscount(e.target.value)} /></div>
                                                
                                                <div style={{ textAlign: 'right', fontSize: '1.1rem', fontWeight: '800', color: '#c2410c' }}>Net Payable:</div>
                                                <div style={{ textAlign: 'right', fontSize: '1.1rem', fontWeight: '800', color: '#c2410c' }}>₹{Number(finalAmount).toLocaleString()}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 6. Payment Form */}
                                <div className="stat-card" style={{ display: 'block', backgroundColor: '#f0fdf4', border: '1px solid #dcfce7' }}>
                                    <h3 style={{ marginBottom: '1.5rem', color: '#166534', fontSize: '1.1rem' }}>6. Payment & Submission</h3>
                                    <form onSubmit={handleCollectFee}>
                                        <div className="form-group">
                                            <label style={{ fontWeight: 'bold' }}>Amount being Paid (₹)</label>
                                            <input type="number" className="form-control" value={paidAmount} onChange={e => setPaidAmount(e.target.value)} required style={{ fontSize: '1.25rem', height: '50px', border: '2px solid #22c55e' }} placeholder="Enter amount" />
                                        </div>
                                        <div className="form-group" style={{ marginTop: '1rem' }}>
                                            <label>Payment Mode</label>
                                            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                                {['Cash', 'UPI', 'Bank'].map(mode => (
                                                    <label key={mode} style={{ flex: 1, textAlign: 'center', padding: '0.75rem', background: paymentMode === mode ? '#22c55e' : 'white', color: paymentMode === mode ? 'white' : '#166534', borderRadius: '8px', border: '1px solid #22c55e', cursor: 'pointer', fontWeight: '700', transition: '0.2s' }}>
                                                        <input type="radio" name="paymentMode" value={mode} checked={paymentMode === mode} onChange={() => setPaymentMode(mode)} style={{ display: 'none' }} /> {mode}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                        <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '1.5rem', padding: '1rem', backgroundColor: Number(discount) > 0 ? '#ea580c' : '#166534', fontSize: '1.1rem' }}>
                                            {Number(discount) > 0 ? 'Submit for Principal Approval' : 'Confirm & Print Receipt'}
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="stat-card" style={{ textAlign: 'center', padding: '4rem', background: '#f8fafc', border: '2px dashed #cbd5e1' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
                            <h3 style={{ color: '#64748b' }}>Search a student to begin fee collection</h3>
                            <p style={{ color: '#94a3b8' }}>Search by Name or Admission Number above</p>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'heads' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '2rem' }}>
                    <div className="stat-card" style={{ display: 'block', height: 'fit-content' }}>
                        <h3 style={{ marginBottom: '1.5rem', fontWeight: 'bold' }}>Create New Fee Head</h3>
                        <form onSubmit={handleAddFeeHead}>
                            <div className="form-group"><label>Fee Head Name</label><input type="text" className="form-control" placeholder="e.g. Activity Fee" value={newHeadName} onChange={e => setNewHeadName(e.target.value)} required /></div>
                            <div className="form-group">
                                <label>Fee Type</label>
                                <select className="form-control" value={newHeadType} onChange={e => setNewHeadType(e.target.value as any)}>
                                    <option value="Monthly">Monthly</option>
                                    <option value="Annual">Annual</option>
                                    <option value="One-time">One-time</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>Create Fee Head</button>
                        </form>
                    </div>
                    <div className="data-table-container">
                        <div className="table-header"><h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Existing Fee Heads</h2></div>
                        <table style={{ width: '100%' }}>
                            <thead><tr><th>Fee Head</th><th>Type</th><th style={{ textAlign: 'center' }}>Action</th></tr></thead>
                            <tbody>{feeHeads.map((head) => (
                                <tr key={head.id}>
                                    <td style={{ fontWeight: '600' }}>{head.name}</td>
                                    <td style={{ fontWeight: 'bold', color: '#111827' }}>{head.type}</td>
                                    <td style={{ textAlign: 'center' }}>
                                        <button 
                                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: '600', fontSize: '0.875rem' }} 
                                            onClick={() => handleDeleteFeeHead(head.id, head.name)}
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'due' && (
                <div className="data-table-container shadow-lg">
                    <div className="table-header" style={{ background: 'linear-gradient(to right, #f8fafc, #ffffff)', padding: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <div>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827' }}>Pending Fee List (Due)</h2>
                                <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>List of students with outstanding balances</p>
                            </div>
                            <button className="btn-primary" style={{ padding: '0.5rem 1rem', width: 'auto', backgroundColor: '#10b981' }}>Print List</button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', background: '#f1f5f9', padding: '1rem', borderRadius: '12px' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: '700' }}>Filter by Class</label>
                                <select className="form-control" style={{ height: '38px' }}>
                                    <option value="">All Classes</option>
                                    {[...classes].sort((a, b) => {
                                        const order = ['Nursery', 'LKG', 'UKG', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11 Bio', 'Class 11 Maths', 'Class 11 Commerce', 'Class 12 Bio', 'Class 12 Maths', 'Class 12 Commerce'];
                                        return order.indexOf(a.name) - order.indexOf(b.name);
                                    }).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: '700' }}>Filter by Month</label>
                                <select className="form-control" style={{ height: '38px' }}>
                                    <option value="">All Months</option>
                                    {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: '700' }}>Filter by Section</label>
                                <select className="form-control" style={{ height: '38px' }}>
                                    <option value="">All Sections</option>
                                    <option value="A">Section A</option>
                                    <option value="B">Section B</option>
                                    <option value="C">Section C</option>
                                </select>
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: '700' }}>Search Student</label>
                                <input type="text" placeholder="Name or Adm No..." className="form-control" style={{ height: '38px' }} />
                            </div>
                        </div>
                    </div>
                    <table style={{ width: '100%' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f8fafc' }}>
                                <th style={{ padding: '1rem 1.5rem' }}>Student Name</th>
                                <th style={{ padding: '1rem 1.5rem' }}>Class</th>
                                <th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>Total (₹)</th>
                                <th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>Paid (₹)</th>
                                <th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>Due (₹)</th>
                                <th style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dueFees.map((fee) => (
                                <tr key={fee.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#1e293b' }}>{fee.studentName}</td>
                                    <td style={{ padding: '1rem 1.5rem' }}>
                                        <span style={{ background: '#e0e7ff', color: '#4338ca', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700' }}>
                                            {fee.className}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right', color: '#64748b' }}>₹{fee.total.toLocaleString()}</td>
                                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right', color: '#059669', fontWeight: '600' }}>₹{fee.paid.toLocaleString()}</td>
                                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right', color: '#ef4444', fontWeight: '800' }}>₹{fee.pending.toLocaleString()}</td>
                                    <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                                        <button
                                            className="btn-primary"
                                            style={{ width: 'auto', padding: '0.4rem 1rem', fontSize: '0.75rem', backgroundColor: '#4f46e5', borderRadius: '6px' }}
                                            onClick={() => alert(`Reminder sent to ${fee.studentName}`)}
                                        >
                                            Send Reminder
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}



            {activeTab === 'structure' && (
                <div>
                    <div className="stat-card" style={{ display: 'block', marginBottom: '2rem' }}>
                        <h3 style={{ marginBottom: '1.5rem', fontWeight: 'bold' }}>Define Class Fee Structure</h3>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            const form = e.target as HTMLFormElement;
                            const formData = new FormData(form);
                            const selectedClassId = formData.get('classId') as string;
                            const fees: any = {};
                            feeHeads.forEach(head => {
                                fees[head.name] = Number(formData.get(head.name) || 0);
                            });
                            
                            try {
                                await axios.post('/api/fees/structure', { classId: selectedClassId, fees });
                                fetchFeeStructure();
                                form.reset();
                                alert('Fee Structure defined and saved successfully!');
                            } catch (err) {
                                console.error(err);
                                alert('Failed to save fee structure');
                            }
                        }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                                <div className="form-group">
                                    <label>Class</label>
                                    <select name="classId" className="form-control" required>
                                        <option value="">Select Class</option>
                                        {[...classes].sort((a,b) => {
                                            const order = ['Nursery', 'LKG', 'UKG', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11 Bio', 'Class 11 Maths', 'Class 11 Commerce', 'Class 12 Bio', 'Class 12 Maths', 'Class 12 Commerce'];
                                            return order.indexOf(a.name) - order.indexOf(b.name);
                                        }).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Section (Reference Only)</label>
                                    <select name="section" className="form-control">
                                        <option value="All">All Sections</option>
                                        <option value="A">Section A</option>
                                        <option value="B">Section B</option>
                                        <option value="C">Section C</option>
                                    </select>
                                </div>
                                {feeHeads.map(head => (
                                    <div key={head.id} className="form-group"><label style={{ fontSize: '0.8rem' }}>{head.name} (₹)</label><input name={head.name} type="number" className="form-control" placeholder="0" style={{ height: '35px' }} /></div>
                                ))}
                            </div>
                            <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '0.6rem 1.5rem', marginTop: '1rem' }}>Save Structure</button>
                        </form>
                    </div>

                    <div className="data-table-container shadow-lg">
                        <div className="table-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to right, #f8fafc, #ffffff)', flexWrap: 'wrap', gap: '1rem' }}>
                            <div>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827' }}>Class-wise Fee Structure</h2>
                                <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>View and manage annual fees for each class</p>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <label style={{ fontWeight: '600', fontSize: '0.9rem' }}>Filter Class:</label>
                                <select className="form-control" style={{ width: '150px', height: '38px' }} value={structFilterClass} onChange={e => setStructFilterClass(e.target.value)}>
                                    <option value="">All Classes</option>
                                    {[...classes].sort((a, b) => {
                                        const order = ['Nursery', 'LKG', 'UKG', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11 Bio', 'Class 11 Maths', 'Class 11 Commerce', 'Class 12 Bio', 'Class 12 Maths', 'Class 12 Commerce'];
                                        return order.indexOf(a.name) - order.indexOf(b.name);
                                    }).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f1f5f9' }}>
                                    <th style={{ position: 'sticky', left: 0, zIndex: 10, padding: '1rem 0.8rem', backgroundColor: '#1e293b', color: 'white', border: '1px solid #334155', textAlign: 'left' }}>Class</th>
                                    <th style={{ position: 'sticky', left: '85px', zIndex: 10, padding: '1rem 0.8rem', backgroundColor: '#1e293b', color: 'white', border: '1px solid #334155' }}>Sec</th>
                                    {feeHeads.map(head => (
                                        <th key={head.id} style={{ padding: '0.8rem', textAlign: 'right', backgroundColor: '#334155', color: 'white', border: '1px solid #475569', fontSize: '0.75rem', fontWeight: '600', minWidth: '110px', whiteSpace: 'normal', verticalAlign: 'middle', textTransform: 'uppercase' }}>{head.name}</th>
                                    ))}
                                    <th style={{ padding: '0.8rem', textAlign: 'center', backgroundColor: '#1e293b', color: 'white', border: '1px solid #334155', minWidth: '120px' }}>Total (₹)</th>
                                    <th style={{ padding: '0.8rem', textAlign: 'center', backgroundColor: '#1e293b', color: 'white', border: '1px solid #334155' }}>Action</th>
                                </tr>
                            </thead>
                             <tbody>
                                {feeStructure
                                    .filter(item => !structFilterClass || item.className === structFilterClass)
                                    .map((item) => (
                                    <tr key={item.id} className="table-row-hover" style={{ backgroundColor: 'white' }}>
                                        <td style={{ position: 'sticky', left: 0, zIndex: 5, padding: '0.8rem', fontWeight: '800', color: '#111827', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', width: '85px' }}>{item.className}</td>
                                        <td style={{ position: 'sticky', left: '85px', zIndex: 5, padding: '0.8rem', textAlign: 'center', fontWeight: '700', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#4b5563' }}>{item.section || '-'}</td>
                                        {feeHeads.map(head => (
                                            <td key={head.id} style={{ padding: '0.8rem', textAlign: 'right', border: '1px solid #e2e8f0', color: '#334155', fontWeight: '500' }}>₹{(item.fees?.[head.name] || 0).toLocaleString()}</td>
                                        ))}
                                        <td style={{ padding: '0.8rem', textAlign: 'center', fontWeight: '900', color: '#2563eb', border: '1px solid #e2e8f0', backgroundColor: '#eff6ff' }}>
                                            ₹{(Object.values(item.fees || {}) as number[]).reduce((a: number, b: number) => a + b, 0).toLocaleString()}
                                        </td>
                                        <td style={{ padding: '0.8rem', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                                            <button style={{ background: '#fee2e2', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: '700', padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.75rem' }} onClick={() => handleDeleteFeeStructure(item.id)}>Delete</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        </div>
                    </div>
                </div>
            )}



            {activeTab === 'approvals' && (user?.role === 'PRINCIPAL' || user?.role === 'ADMIN') && (
                <div className="data-table-container shadow-lg">
                    <div className="table-header">
                        <div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Fee Approval Requests</h2>
                            <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>Principal's review of fee discounts applied by Accountants</p>
                        </div>
                    </div>
                    <table style={{ width: '100%' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f8fafc' }}>
                                <th>Student</th>
                                <th>Class</th>
                                <th>Proposed Discount</th>
                                <th>Net Payable</th>
                                <th>Submitted By</th>
                                <th style={{ textAlign: 'center' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {feeRecords.filter(r => r.status === 'PENDING').length > 0 ? (
                                feeRecords.filter(r => r.status === 'PENDING').map(r => (
                                    <tr key={r.id}>
                                        <td style={{ fontWeight: '700' }}>{r.studentName}</td>
                                        <td>{r.className}</td>
                                        <td style={{ color: '#ef4444', fontWeight: '800' }}>₹{r.discount.toLocaleString()}</td>
                                        <td style={{ fontWeight: '800' }}>₹{r.paidAmount.toLocaleString()}</td>
                                        <td style={{ fontSize: '0.85rem' }}>{r.submittedBy}</td>
                                        <td style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                            <button 
                                                onClick={() => approveFee(r.id)}
                                                style={{ backgroundColor: '#22c55e', color: 'white', border: 'none', padding: '0.4rem 1rem', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '0.75rem' }}
                                            >
                                                Approve
                                            </button>
                                            <button 
                                                onClick={() => rejectFee(r.id)}
                                                style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '0.4rem 1rem', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '0.75rem' }}
                                            >
                                                Reject
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>
                                        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🎉</div>
                                        <p style={{ fontWeight: '600' }}>No pending approval requests.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'drafts' && user?.role === 'ACCOUNTS' && (
                <div className="data-table-container shadow-lg">
                    <div className="table-header">
                        <div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>My Fee Drafts</h2>
                            <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>Track status of your submitted fees that require approval</p>
                        </div>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f8fafc', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
                                <th style={{ padding: '1rem' }}>Student</th>
                                <th style={{ padding: '1rem' }}>Receipt No</th>
                                <th style={{ padding: '1rem' }}>Net Amount</th>
                                <th style={{ padding: '1rem' }}>Discount</th>
                                <th style={{ padding: '1rem' }}>Status</th>
                                <th style={{ padding: '1rem' }}>Approved By</th>
                                <th style={{ padding: '1rem', textAlign: 'center' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {feeRecords.filter(r => r.discount > 0).length > 0 ? (
                                feeRecords.filter(r => r.discount > 0).map(r => (
                                    <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '1rem', fontWeight: '700' }}>{r.studentName}</td>
                                        <td style={{ padding: '1rem', color: '#2563eb' }}>{r.receiptNo}</td>
                                        <td style={{ padding: '1rem', fontWeight: '800' }}>₹{r.paidAmount.toLocaleString()}</td>
                                        <td style={{ padding: '1rem', color: '#ef4444', fontWeight: '800' }}>₹{r.discount.toLocaleString()}</td>
                                        <td style={{ padding: '1rem' }}>
                                            <span style={{ 
                                                fontSize: '0.65rem', 
                                                fontWeight: '800', 
                                                padding: '0.2rem 0.5rem', 
                                                borderRadius: '12px',
                                                backgroundColor: r.status === 'APPROVED' ? '#dcfce7' : r.status === 'PENDING' ? '#fef9c3' : '#fee2e2',
                                                color: r.status === 'APPROVED' ? '#166534' : r.status === 'PENDING' ? '#854d0e' : '#991b1b',
                                                textTransform: 'uppercase'
                                            }}>
                                                {r.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem', fontSize: '0.85rem' }}>{r.approvedBy || '-'}</td>
                                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                                            {r.status === 'APPROVED' ? (
                                                <button 
                                                    onClick={() => { setSelectedReceipt(r); setShowReceipt(true); }}
                                                    style={{ 
                                                        backgroundColor: '#2563eb', 
                                                        color: 'white', 
                                                        border: 'none', 
                                                        padding: '0.4rem 0.8rem', 
                                                        borderRadius: '6px', 
                                                        cursor: 'pointer', 
                                                        fontWeight: '700', 
                                                        fontSize: '0.75rem',
                                                        boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
                                                    }}
                                                >
                                                    Pay & Print Receipt
                                                </button>
                                            ) : r.status === 'REJECTED' ? (
                                                <button 
                                                    onClick={() => payFullRejectedFee(r.id)}
                                                    style={{ 
                                                        backgroundColor: '#ef4444', 
                                                        color: 'white', 
                                                        border: 'none', 
                                                        padding: '0.4rem 0.8rem', 
                                                        borderRadius: '6px', 
                                                        cursor: 'pointer', 
                                                        fontWeight: '700', 
                                                        fontSize: '0.75rem',
                                                        boxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)'
                                                    }}
                                                >
                                                    Pay Full Amount
                                                </button>
                                            ) : (
                                                <span style={{ color: '#64748b', fontSize: '0.75rem', fontStyle: 'italic' }}>Awaiting Approval</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>
                                        <p>No fee drafts currently.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'reports' && (
                <div style={{ animation: 'fadeIn 0.4s ease' }}>
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        {[
                            { id: 'daily', label: 'Daily Collection' },
                            { id: 'monthly', label: 'Monthly Collection' },
                            { id: 'class', label: 'Class-wise Fee' },
                            { id: 'pending', label: 'Pending Fee Report' }
                        ].map(r => (
                            <button
                                key={r.id}
                                onClick={() => setActiveReport(r.id as any)}
                                style={{
                                    padding: '0.6rem 1.2rem',
                                    borderRadius: '8px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    fontWeight: '600',
                                    backgroundColor: activeReport === r.id ? '#4f46e5' : 'transparent',
                                    color: activeReport === r.id ? 'white' : '#64748b',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>

                    <div className="data-table-container shadow-lg">
                        <div className="table-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                                {activeReport === 'daily' && 'Daily Collection Report'}
                                {activeReport === 'monthly' && 'Monthly Collection Summary'}
                                {activeReport === 'class' && 'Class-wise Fee Collection'}
                                {activeReport === 'pending' && 'Outstanding Dues Report'}
                            </h2>
                            <button className="btn-primary" style={{ width: 'auto', padding: '0.5rem 1.5rem', backgroundColor: '#ec4899' }}>Export PDF</button>
                        </div>

                        <table style={{ width: '100%' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f1f5f9' }}>
                                    {activeReport === 'daily' && (<><th style={{ padding: '1rem 1.5rem' }}>Date</th><th style={{ padding: '1rem 1.5rem' }}>Receipts</th><th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>Total Collection (₹)</th></>)}
                                    {activeReport === 'monthly' && (<><th style={{ padding: '1rem 1.5rem' }}>Month</th><th style={{ padding: '1rem 1.5rem' }}>Year</th><th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>Total Collection (₹)</th></>)}
                                    {activeReport === 'class' && (<><th style={{ padding: '1rem 1.5rem' }}>Class</th><th style={{ padding: '1rem 1.5rem' }}>Students</th><th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>Collected Amount (₹)</th></>)}
                                    {activeReport === 'pending' && (<><th style={{ padding: '1rem 1.5rem' }}>Class</th><th style={{ padding: '1rem 1.5rem' }}>Total Dues</th><th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>Pending Amount (₹)</th></>)}
                                </tr>
                            </thead>
                            <tbody>
                                {activeReport === 'daily' && (
                                    <>
                                        <tr><td style={{ padding: '1rem 1.5rem' }}>10 Mar 2026</td><td style={{ padding: '1rem 1.5rem' }}>25</td><td style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: '800', color: '#059669' }}>₹50,000</td></tr>
                                        <tr><td style={{ padding: '1rem 1.5rem' }}>09 Mar 2026</td><td style={{ padding: '1rem 1.5rem' }}>18</td><td style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: '800', color: '#059669' }}>₹32,400</td></tr>
                                        <tr><td style={{ padding: '1rem 1.5rem' }}>08 Mar 2026</td><td style={{ padding: '1rem 1.5rem' }}>12</td><td style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: '800', color: '#059669' }}>₹15,000</td></tr>
                                    </>
                                )}
                                {activeReport === 'monthly' && (
                                    <>
                                        <tr><td style={{ padding: '1rem 1.5rem' }}>March</td><td style={{ padding: '1rem 1.5rem' }}>2026</td><td style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: '800', color: '#4f46e5' }}>₹4,50,000</td></tr>
                                        <tr><td style={{ padding: '1rem 1.5rem' }}>February</td><td style={{ padding: '1rem 1.5rem' }}>2026</td><td style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: '800', color: '#4f46e5' }}>₹3,80,200</td></tr>
                                    </>
                                )}
                                {activeReport === 'class' && (
                                    <>
                                        <tr><td style={{ padding: '1rem 1.5rem' }}>Class 1</td><td style={{ padding: '1rem 1.5rem' }}>40</td><td style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: '700' }}>₹80,000</td></tr>
                                        <tr><td style={{ padding: '1rem 1.5rem' }}>Class 6</td><td style={{ padding: '1rem 1.5rem' }}>35</td><td style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: '700' }}>₹95,500</td></tr>
                                    </>
                                )}
                                {activeReport === 'pending' && (
                                    <>
                                        <tr><td style={{ padding: '1rem 1.5rem' }}>Class 10</td><td style={{ padding: '1rem 1.5rem' }}>5 Students</td><td style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: '800', color: '#ef4444' }}>₹25,000</td></tr>
                                        <tr><td style={{ padding: '1rem 1.5rem' }}>Class 12</td><td style={{ padding: '1rem 1.5rem' }}>3 Students</td><td style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: '800', color: '#ef4444' }}>₹12,000</td></tr>
                                    </>
                                )}
                            </tbody>
                            <tfoot>
                                <tr style={{ backgroundColor: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                                    <td colSpan={2} style={{ padding: '1rem 1.5rem', fontWeight: '800', textAlign: 'right' }}>Total:</td>
                                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: '900', color: '#111827', fontSize: '1.1rem' }}>
                                        {activeReport === 'daily' && '₹97,400'}
                                        {activeReport === 'monthly' && '₹8,30,200'}
                                        {activeReport === 'class' && '₹1,75,500'}
                                        {activeReport === 'pending' && '₹37,000'}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}
            {/* Receipt Modal */}
            {showReceipt && selectedReceipt && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div style={{ backgroundColor: 'white', padding: '2.5rem', borderRadius: '16px', width: '450px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                        <div style={{ textAlign: 'center', borderBottom: '2px dashed #e2e8f0', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
                            <h2 style={{ color: '#1e293b', margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>SCHOOL ERP</h2>
                            <p style={{ color: '#64748b', margin: '0.5rem 0 0 0', fontSize: '0.875rem' }}>Official Fee Receipt</p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem', fontSize: '0.9rem' }}>
                            <div>
                                <label style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Receipt No</label>
                                <p style={{ fontWeight: '700', color: '#1e293b', margin: 0 }}>{selectedReceipt.receiptNo}</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <label style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</label>
                                <p style={{ fontWeight: '700', color: '#1e293b', margin: 0 }}>{selectedReceipt.date}</p>
                            </div>
                        </div>

                        <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ color: '#64748b', fontSize: '0.8rem' }}>Student Name</label>
                                <p style={{ fontWeight: '700', fontSize: '1.1rem', margin: 0 }}>{selectedReceipt.studentName}</p>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                                <div>
                                    <label style={{ color: '#64748b', fontSize: '0.8rem' }}>Admission No</label>
                                    <p style={{ fontWeight: '600', margin: 0 }}>{selectedReceipt.admissionNo}</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <label style={{ color: '#64748b', fontSize: '0.8rem' }}>Class</label>
                                    <p style={{ fontWeight: '600', margin: 0 }}>{selectedReceipt.className}</p>
                                </div>
                            </div>
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                                <span style={{ color: '#64748b' }}>{selectedReceipt.feeHead}</span>
                                <span style={{ fontWeight: '700' }}>₹{selectedReceipt.paidAmount}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderTop: '2px solid #1e293b', marginTop: '0.5rem' }}>
                                <span style={{ fontWeight: '800', color: '#1e293b' }}>Total Paid</span>
                                <span style={{ fontWeight: '900', color: '#2563eb', fontSize: '1.25rem' }}>₹{selectedReceipt.paidAmount}</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button onClick={() => window.print()} style={{ flex: 1, backgroundColor: '#1e293b', color: 'white', border: 'none', padding: '0.75rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Print Receipt</button>
                            <button onClick={() => setShowReceipt(false)} style={{ flex: 1, backgroundColor: '#f1f5f9', color: '#475569', border: 'none', padding: '0.75rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Fees;
