import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { IndianRupee, CheckCircle, Clock, AlertCircle, Printer, Eye } from 'lucide-react';

const MyFees: React.FC = () => {
    const userRaw = localStorage.getItem('user');
    const user = userRaw ? JSON.parse(userRaw) : null;
    const studentInfo = user?.studentInfo;
    
    const [feeStructure, setFeeStructure] = useState<any>(null);
    const [feeHistory, setFeeHistory] = useState<any[]>([]);
    const [feeHeads, setFeeHeads] = useState<any[]>([]);
    
    // Receipt Modal State
    const [selectedReceipt, setSelectedReceipt] = useState<any>(null);

    useEffect(() => {
        if (studentInfo) {
            fetchData();
        }
    }, [studentInfo]);

    const fetchData = async () => {
        try {
            // Fetch History
            const historyRes = await axios.get(`/api/fees/history/${studentInfo.id}`);
            setFeeHistory(historyRes.data);
            
            // Fetch Structure
            const structRes = await axios.get('/api/fees/structure');
            const studentClassStruct = structRes.data.find((s: any) => s.id === studentInfo.class?.id || s.className === studentInfo.class?.name);
            if (studentClassStruct && studentClassStruct.fees) {
                setFeeStructure(studentClassStruct.fees);
            }

            // Fetch Heads (to know type)
            const headsRes = await axios.get('/api/fees/heads');
            setFeeHeads(headsRes.data);
            
        } catch (error) {
            console.error("Error fetching fee data", error);
        }
    };

    // Calculate Totals based on history
    const totalPaid = feeHistory.filter(h => h.status === 'APPROVED').reduce((sum, h) => sum + (h.amountPaid || 0), 0);
    const pendingRequests = feeHistory.filter(h => h.status === 'PENDING').reduce((sum, h) => sum + (h.totalFee || 0), 0);

    const handlePrintReceipt = () => {
        window.print();
    };

    if (!studentInfo) return <div style={{ padding: '2rem' }}>Loading or User not found...</div>;

    return (
        <div style={{ fontFamily: "'Inter', sans-serif" }}>
            <h1 style={{ marginBottom: '2rem', fontSize: '1.875rem', fontWeight: 800 }}>My Fees & Payments</h1>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
                <div style={{ backgroundColor: '#2b6cb0', color: 'white', padding: '1.75rem', borderRadius: '16px', boxShadow: '0 4px 15px rgba(43,108,176,0.2)' }}>
                    <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.9 }}>Total Paid This Year</p>
                    <h2 style={{ margin: '0.5rem 0 0', fontSize: '2.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <IndianRupee size={32} /> {totalPaid}
                    </h2>
                </div>

                {pendingRequests > 0 && (
                    <div style={{ backgroundColor: '#ed8936', color: 'white', padding: '1.75rem', borderRadius: '16px', boxShadow: '0 4px 15px rgba(237,137,54,0.2)' }}>
                        <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.9 }}>Approval Pending</p>
                        <h2 style={{ margin: '0.5rem 0 0', fontSize: '2.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <IndianRupee size={32} /> {pendingRequests}
                        </h2>
                    </div>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '2rem' }}>
                {/* ── Fee Structure Card ── */}
                <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #edf2f7', padding: '2rem', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid #edf2f7', paddingBottom: '1rem' }}>
                        <div style={{ backgroundColor: '#ebf8ff', color: '#3182ce', padding: '0.5rem', borderRadius: '8px' }}>
                            <AlertCircle size={20} />
                        </div>
                        <h3 style={{ margin: 0, fontWeight: 700, color: '#2d3748' }}>{studentInfo.class?.name} - Applicable Fees</h3>
                    </div>

                    {!feeStructure ? (
                        <p style={{ color: '#718096', fontSize: '0.9rem', textAlign: 'center', padding: '1rem 0' }}>No specific fee structure assigned to this class yet.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            {Object.entries(feeStructure).map(([headName, amount]: any) => {
                                // Find type to show badge
                                const headInfo = feeHeads.find(h => h.name === headName);
                                const type = headInfo?.type || 'Other';
                                
                                return (
                                    <div key={headName} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: '#f7fafc', borderRadius: '12px' }}>
                                        <div>
                                            <p style={{ margin: 0, fontWeight: 600, color: '#2d3748' }}>{headName}</p>
                                            <span style={{ fontSize: '0.7rem', color: '#718096', backgroundColor: '#edf2f7', padding: '0.1rem 0.5rem', borderRadius: '10px', marginTop: '0.2rem', display: 'inline-block' }}>{type}</span>
                                        </div>
                                        <div style={{ fontWeight: 800, color: '#4a5568', fontSize: '1.2rem' }}>
                                            ₹{amount}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* ── Transaction History & Receipts ── */}
                <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #edf2f7', padding: '2rem', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid #edf2f7', paddingBottom: '1rem' }}>
                        <div style={{ backgroundColor: '#f0fff4', color: '#38a169', padding: '0.5rem', borderRadius: '8px' }}>
                            <CheckCircle size={20} />
                        </div>
                        <h3 style={{ margin: 0, fontWeight: 700, color: '#2d3748' }}>Payment History</h3>
                    </div>

                    {feeHistory.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem 0', color: '#a0aec0' }}>
                            <Clock size={40} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                            <p style={{ margin: 0, fontSize: '0.95rem' }}>No payments found on record.</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ color: '#718096', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        <th style={{ padding: '1rem 0.5rem', borderBottom: '2px solid #edf2f7' }}>Date</th>
                                        <th style={{ padding: '1rem 0.5rem', borderBottom: '2px solid #edf2f7' }}>Particulars</th>
                                        <th style={{ padding: '1rem 0.5rem', borderBottom: '2px solid #edf2f7' }}>Amount</th>
                                        <th style={{ padding: '1rem 0.5rem', borderBottom: '2px solid #edf2f7' }}>Status</th>
                                        <th style={{ padding: '1rem 0.5rem', borderBottom: '2px solid #edf2f7', textAlign: 'right' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {feeHistory.map((item) => (
                                        <tr key={item.id} style={{ borderBottom: '1px solid #edf2f7', transition: 'background 0.2s' }}>
                                            <td style={{ padding: '1rem 0.5rem', fontSize: '0.9rem', color: '#4a5568' }}>
                                                {new Date(item.paymentDate).toLocaleDateString()}
                                            </td>
                                            <td style={{ padding: '1rem 0.5rem' }}>
                                                <p style={{ margin: 0, fontWeight: 600, color: '#2d3748', fontSize: '0.95rem' }}>{item.feeHead}</p>
                                                {item.month && <p style={{ margin: 0, fontSize: '0.75rem', color: '#718096' }}>{item.month} {item.year}</p>}
                                            </td>
                                            <td style={{ padding: '1rem 0.5rem', fontWeight: 700, color: '#2b6cb0' }}>
                                                ₹{item.amountPaid}
                                            </td>
                                            <td style={{ padding: '1rem 0.5rem' }}>
                                                <span style={{ 
                                                    padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700,
                                                    backgroundColor: item.status === 'APPROVED' ? '#f0fff4' : item.status === 'PENDING' ? '#fffaf0' : '#fff5f5',
                                                    color: item.status === 'APPROVED' ? '#2f855a' : item.status === 'PENDING' ? '#dd6b20' : '#c53030'
                                                }}>
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>
                                                {item.status === 'APPROVED' && (
                                                    <button 
                                                        onClick={() => setSelectedReceipt(item)}
                                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#edf2f7', color: '#4a5568', padding: '0.5rem 0.75rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.2s' }}
                                                        onMouseOver={e => (e.currentTarget.style.backgroundColor = '#e2e8f0')}
                                                        onMouseOut={e => (e.currentTarget.style.backgroundColor = '#edf2f7')}
                                                    >
                                                        <Eye size={16} /> Receipt
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Receipt Modal ── */}
            {selectedReceipt && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', paddingTop: 'env(safe-area-inset-top)', zIndex: 9999 }}>
                    <div style={{ backgroundColor: 'white', borderRadius: '16px', width: '100%', maxWidth: '600px', maxHeight: '95vh', display: 'flex', flexDirection: 'column', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)' }}>
                        
                        {/* Print Header Hidden from Screen */}
                        <style>
                            {`
                            @media print {
                                body * { visibility: hidden; }
                                #printable-receipt, #printable-receipt * { visibility: visible; }
                                #printable-receipt { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; }
                                .no-print { display: none !important; }
                            }
                            `}
                        </style>

                        <div id="printable-receipt" style={{ padding: '3rem 2rem', backgroundColor: '#fff', borderRadius: '16px' }}>
                            <div style={{ textAlign: 'center', borderBottom: '2px dashed #e2e8f0', paddingBottom: '2rem', marginBottom: '2rem' }}>
                                <img src="/bips-logo.png" alt="BIPS Logo" style={{ width: '80px', height: '80px', objectFit: 'contain', marginBottom: '1rem' }} />
                                <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: '#1a202c', letterSpacing: '-0.5px' }}>BIPS ERP</h1>
                                <p style={{ margin: '0.4rem 0 0', color: '#718096', fontSize: '0.95rem' }}>Official Fee Receipt</p>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                                <div>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#a0aec0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Receipt No</p>
                                    <p style={{ margin: '0.2rem 0 0', fontWeight: 800, fontSize: '1.1rem', color: '#2d3748' }}>{selectedReceipt.receiptNo || 'N/A'}</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#a0aec0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date Paid</p>
                                    <p style={{ margin: '0.2rem 0 0', fontWeight: 800, fontSize: '1.1rem', color: '#2d3748' }}>{new Date(selectedReceipt.paymentDate).toLocaleDateString('en-GB')}</p>
                                </div>
                            </div>

                            <div style={{ backgroundColor: '#f7fafc', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                    <span style={{ color: '#718096' }}>Student Name</span>
                                    <span style={{ fontWeight: 700, color: '#2d3748' }}>{user.name}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                    <span style={{ color: '#718096' }}>Admission / SR No.</span>
                                    <span style={{ fontWeight: 700, color: '#2d3748' }}>{studentInfo.admissionNo}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#718096' }}>Class & Section</span>
                                    <span style={{ fontWeight: 700, color: '#2d3748' }}>{studentInfo.class?.name} - {studentInfo.section?.name}</span>
                                </div>
                            </div>

                            <table style={{ width: '100%', marginBottom: '2rem', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr>
                                        <th style={{ textAlign: 'left', paddingBottom: '0.75rem', borderBottom: '2px solid #edf2f7', color: '#718096', fontSize: '0.85rem' }}>DESCRIPTION</th>
                                        <th style={{ textAlign: 'right', paddingBottom: '0.75rem', borderBottom: '2px solid #edf2f7', color: '#718096', fontSize: '0.85rem' }}>AMOUNT</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td style={{ paddingTop: '1rem', color: '#2d3748', fontWeight: 600 }}>
                                            {selectedReceipt.feeHead} {selectedReceipt.month ? `(${selectedReceipt.month} ${selectedReceipt.year})` : ''}
                                        </td>
                                        <td style={{ paddingTop: '1rem', textAlign: 'right', fontWeight: 700, color: '#2d3748' }}>
                                            ₹{selectedReceipt.totalFee}
                                        </td>
                                    </tr>
                                    {Number(selectedReceipt.discount) > 0 && (
                                        <tr>
                                            <td style={{ paddingTop: '0.5rem', color: '#e53e3e', fontSize: '0.9rem' }}>Discount / Concession</td>
                                            <td style={{ paddingTop: '0.5rem', textAlign: 'right', color: '#e53e3e', fontWeight: 700 }}>- ₹{selectedReceipt.discount}</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderTop: '2px solid #cbd5e0', paddingTop: '1.25rem' }}>
                                <div>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#a0aec0', textTransform: 'uppercase' }}>Payment Mode</p>
                                    <p style={{ margin: '0.2rem 0 0', fontWeight: 700, color: '#2d3748' }}>{selectedReceipt.paymentMode || 'Cash'}</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#a0aec0', textTransform: 'uppercase' }}>Amount Paid</p>
                                    <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: 800, color: '#38a169', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.2rem' }}>
                                        ₹{selectedReceipt.amountPaid}
                                    </h2>
                                </div>
                            </div>

                            <div style={{ textAlign: 'center', marginTop: '3rem' }}>
                                <p style={{ margin: 0, fontSize: '0.85rem', color: '#718096', fontStyle: 'italic' }}>This is an electronically generated receipt.</p>
                            </div>
                        </div>

                        {/* Modal Action Buttons */}
                        <div className="no-print" style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderTop: '1px solid #e2e8f0', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <button 
                                onClick={() => setSelectedReceipt(null)}
                                style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', border: '1px solid #cbd5e0', backgroundColor: 'white', color: '#4a5568', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                                onMouseOver={e => (e.currentTarget.style.backgroundColor = '#f7fafc')}
                                onMouseOut={e => (e.currentTarget.style.backgroundColor = 'white')}
                            >
                                Close
                            </button>
                            <button 
                                onClick={handlePrintReceipt}
                                style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none', backgroundColor: '#3182ce', color: 'white', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(49, 130, 206, 0.3)' }}
                                onMouseOver={e => { e.currentTarget.style.backgroundColor = '#2b6cb0'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                onMouseOut={e => { e.currentTarget.style.backgroundColor = '#3182ce'; e.currentTarget.style.transform = 'translateY(0)'; }}
                            >
                                <Printer size={18} /> Print Receipt
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyFees;
