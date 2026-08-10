import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { IndianRupee, CheckCircle, Clock, AlertCircle, Printer, Eye, CreditCard, ShieldCheck, X } from 'lucide-react';

const MONTHS = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];

const MyFees: React.FC = () => {
    const userRaw = localStorage.getItem('user');
    const user = userRaw ? JSON.parse(userRaw) : null;
    const studentInfo = user?.studentInfo;
    
    const [feeStructure, setFeeStructure] = useState<any>(null);
    const [feeHistory, setFeeHistory] = useState<any[]>([]);
    const [feeHeads, setFeeHeads] = useState<any[]>([]);
    
    // Receipt Modal State
    const [selectedReceipt, setSelectedReceipt] = useState<any>(null);

    // PayU Online Payment States
    const [showPayModal, setShowPayModal] = useState(false);
    const [payMonth, setPayMonth] = useState('April');
    const [payYear, setPayYear] = useState('2024');
    const [payFeeHead, setPayFeeHead] = useState('Tuition Fee');
    const [payAmount, setPayAmount] = useState<number | string>('');
    const [payRemark, setPayRemark] = useState('');
    const [payLoading, setPayLoading] = useState(false);
    const [paymentBanner, setPaymentBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    useEffect(() => {
        if (studentInfo) {
            fetchData();
        }
        // Check URL for payment response status
        const params = new URLSearchParams(window.location.search);
        const status = params.get('payment');
        const receipt = params.get('receipt');
        if (status === 'approved') {
            setPaymentBanner({
                type: 'success',
                message: `Payment Received Successfully! ${receipt ? 'Receipt No: ' + receipt : ''}`
            });
        } else if (status === 'rejected') {
            setPaymentBanner({
                type: 'error',
                message: 'Online payment was not completed or failed. Please try again.'
            });
        }
    }, [studentInfo]);

    const fetchData = async () => {
        try {
            // Fetch History
            const historyRes = await axios.get(`/erp-api/fees/history/${studentInfo.id}`);
            setFeeHistory(historyRes.data);
            
            // Fetch Structure
            const structRes = await axios.get('/erp-api/fees/structure');
            const studentClassStruct = structRes.data.find((s: any) => s.id === studentInfo.class?.id || s.className === studentInfo.class?.name);
            if (studentClassStruct && studentClassStruct.fees) {
                setFeeStructure(studentClassStruct.fees);
            }

            // Fetch Heads (to know type)
            const headsRes = await axios.get('/erp-api/fees/heads');
            setFeeHeads(headsRes.data);
            
        } catch (error) {
            console.error("Error fetching fee data", error);
        }
    };

    // Calculate Totals based on history
    const totalPaid = feeHistory.filter(h => h.status === 'APPROVED').reduce((sum, h) => sum + (h.amountPaid || 0), 0);
    const pendingRequests = feeHistory.filter(h => h.status === 'PENDING').reduce((sum, h) => sum + (h.totalFee || 0), 0);

    const handlePayUInitiate = async (e: React.FormEvent) => {
        e.preventDefault();
        const numAmount = Number(payAmount);
        if (!numAmount || numAmount <= 0) {
            alert('Please enter a valid payment amount');
            return;
        }

        try {
            setPayLoading(true);
            const response = await axios.post('/erp-api/fees/payu/initiate', {
                studentId: studentInfo.id,
                amountPaid: numAmount,
                totalFee: numAmount,
                discount: 0,
                feeHead: `${payMonth} - ${payFeeHead}`,
                month: payMonth,
                year: payYear,
                remark: payRemark || 'Paid via PayU Online Gateway',
                customerName: user?.name || studentInfo.fatherName || 'Student',
                customerEmail: user?.email || studentInfo.fatherEmail || 'student@school.com',
                customerPhone: studentInfo.fatherMobile || user?.phone || '9999999999'
            });

            if (response.data.success && response.data.action && response.data.params) {
                // Submit form directly to PayU launch URL
                const form = document.createElement('form');
                form.method = 'POST';
                form.action = response.data.action;

                Object.entries(response.data.params).forEach(([k, v]) => {
                    const input = document.createElement('input');
                    input.type = 'hidden';
                    input.name = k;
                    input.value = String(v);
                    form.appendChild(input);
                });

                document.body.appendChild(form);
                form.submit();
            } else {
                alert('Could not initialize PayU Gateway: ' + (response.data.error || 'Unknown error'));
            }
        } catch (err: any) {
            console.error('PayU Initiation Error:', err);
            alert(err.response?.data?.error || 'Failed to initiate PayU online payment');
        } finally {
            setPayLoading(false);
        }
    };

    if (!studentInfo) return <div style={{ padding: '2rem' }}>Loading or User not found...</div>;

    return (
        <div style={{ fontFamily: "'Inter', sans-serif" }}>
            <h1 style={{ marginBottom: '2rem', fontSize: '1.875rem', fontWeight: 800 }}>My Fees & Payments</h1>

            {paymentBanner && (
                <div style={{
                    marginBottom: '1.5rem', padding: '1rem 1.5rem', borderRadius: '12px',
                    backgroundColor: paymentBanner.type === 'success' ? '#def7ec' : '#fde8e8',
                    color: paymentBanner.type === 'success' ? '#03543f' : '#9b1c1c',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    border: `1px solid ${paymentBanner.type === 'success' ? '#84e1bc' : '#f8b4b4'}`
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600 }}>
                        {paymentBanner.type === 'success' ? <CheckCircle size={22} /> : <AlertCircle size={22} />}
                        <span>{paymentBanner.message}</span>
                    </div>
                    <button onClick={() => setPaymentBanner(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>
                        <X size={18} />
                    </button>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
                <div style={{ backgroundColor: '#2b6cb0', color: 'white', padding: '1.75rem', borderRadius: '16px', boxShadow: '0 4px 15px rgba(43,108,176,0.2)' }}>
                    <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.9 }}>Total Paid This Year</p>
                    <h2 style={{ margin: '0.5rem 0 0', fontSize: '2.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <IndianRupee size={32} /> {totalPaid}
                    </h2>
                </div>

                <div style={{ backgroundColor: '#107c41', color: 'white', padding: '1.75rem', borderRadius: '16px', boxShadow: '0 4px 15px rgba(16,124,65,0.2)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                        <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.9 }}>Online Fee Payment</p>
                        <h3 style={{ margin: '0.4rem 0 0', fontSize: '1.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <CreditCard size={24} /> PayU Gateway
                        </h3>
                        <p style={{ fontSize: '0.75rem', opacity: 0.85, marginTop: '0.3rem', margin: 0 }}>Instant UPI, Debit/Credit Cards & NetBanking</p>
                    </div>
                    <button 
                        onClick={() => setShowPayModal(true)}
                        style={{ marginTop: '1rem', backgroundColor: '#ffffff', color: '#107c41', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '8px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', width: 'fit-content', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                    >
                        <CreditCard size={18} /> Pay Online Now
                    </button>
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
                                const isMonthly = type === 'Monthly';
                                const displayAmount = (studentInfo.isRT && isMonthly) ? 0 : amount;
                                
                                return (
                                    <div key={headName} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: '#f7fafc', borderRadius: '12px' }}>
                                        <div>
                                            <p style={{ margin: 0, fontWeight: 600, color: '#2d3748' }}>
                                                {headName}
                                                {studentInfo.isRT && isMonthly && (
                                                    <span style={{ marginLeft: '0.5rem', fontSize: '0.65rem', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>RTE Exempt</span>
                                                )}
                                            </p>
                                            <span style={{ fontSize: '0.7rem', color: '#718096', backgroundColor: '#edf2f7', padding: '0.1rem 0.5rem', borderRadius: '10px', marginTop: '0.2rem', display: 'inline-block' }}>{type}</span>
                                        </div>
                                        <div style={{ fontWeight: 800, color: '#4a5568', fontSize: '1.2rem' }}>
                                            ₹{displayAmount}
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

            {/* ── PayU Online Payment Modal ── */}
            {showPayModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 999, padding: '1rem' }}>
                    <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '500px', padding: '2rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #edf2f7', paddingBottom: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ backgroundColor: '#e6fffa', color: '#047857', padding: '0.6rem', borderRadius: '10px' }}>
                                    <CreditCard size={24} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontWeight: 800, color: '#1f2937', fontSize: '1.25rem' }}>Pay Dues via PayU</h3>
                                    <span style={{ fontSize: '0.75rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '2px' }}>
                                        <ShieldCheck size={14} color="#047857" /> 256-bit Encrypted SSL Gateway
                                    </span>
                                </div>
                            </div>
                            <button onClick={() => setShowPayModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handlePayUInitiate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#374151', marginBottom: '0.4rem' }}>Select Fee Month</label>
                                <select 
                                    value={payMonth} 
                                    onChange={e => setPayMonth(e.target.value)}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.95rem', fontWeight: 600 }}
                                >
                                    {MONTHS.map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#374151', marginBottom: '0.4rem' }}>Fee Head / Type</label>
                                <select 
                                    value={payFeeHead} 
                                    onChange={e => setPayFeeHead(e.target.value)}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.95rem', fontWeight: 600 }}
                                >
                                    <option value="Tuition Fee">Tuition Fee</option>
                                    <option value="Transport Fee">Transport Fee</option>
                                    <option value="Exam Fee">Exam Fee</option>
                                    <option value="Annual Charges">Annual Charges</option>
                                    <option value="Previous Dues">Previous Session Dues</option>
                                    <option value="Full Fee Payment">Full Fee Payment</option>
                                </select>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#374151', marginBottom: '0.4rem' }}>Academic Year</label>
                                    <input 
                                        type="text" 
                                        value={payYear} 
                                        onChange={e => setPayYear(e.target.value)} 
                                        placeholder="e.g. 2024"
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.95rem' }} 
                                        required 
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#374151', marginBottom: '0.4rem' }}>Amount to Pay (₹)</label>
                                    <input 
                                        type="number" 
                                        value={payAmount} 
                                        onChange={e => setPayAmount(e.target.value)} 
                                        placeholder="Enter amount"
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.95rem', fontWeight: 700, color: '#047857' }} 
                                        required 
                                        min="1"
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#374151', marginBottom: '0.4rem' }}>Remark (Optional)</label>
                                <input 
                                    type="text" 
                                    value={payRemark} 
                                    onChange={e => setPayRemark(e.target.value)} 
                                    placeholder="e.g. April Tuition Fee Payment"
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.9rem' }} 
                                />
                            </div>

                            <div style={{ backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '10px', fontSize: '0.8rem', color: '#4b5563', border: '1px solid #e5e7eb' }}>
                                <p style={{ margin: '0 0 0.3rem', fontWeight: 700 }}>Payer Information:</p>
                                <p style={{ margin: 0 }}>Name: <b>{user?.name || studentInfo.fatherName || 'Student/Parent'}</b> | SR No: <b>{studentInfo.admissionNo}</b></p>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                <button 
                                    type="button" 
                                    onClick={() => setShowPayModal(false)}
                                    style={{ flex: 1, padding: '0.8rem', borderRadius: '10px', border: '1px solid #d1d5db', backgroundColor: '#ffffff', color: '#374151', fontWeight: 700, cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={payLoading}
                                    style={{ flex: 2, padding: '0.8rem', borderRadius: '10px', border: 'none', backgroundColor: '#047857', color: '#ffffff', fontWeight: 800, cursor: payLoading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: '0 4px 6px -1px rgba(4, 120, 87, 0.3)' }}
                                >
                                    <CreditCard size={18} /> {payLoading ? 'Redirecting to PayU...' : 'Proceed to PayU Gateway'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Receipt Modal (Monospace / Thermal Printer Style) ── */}
            {selectedReceipt && (() => {
                const headContent = selectedReceipt.feeHead || '';
                let items = [];
                let monthLabel = '';
                if (headContent.includes('==>')) {
                    const [month, listPart] = headContent.split(' ==> ');
                    monthLabel = month;
                    items = listPart.split(' || ').map((item: string) => {
                        const [desc, price] = item.split(': ');
                        return { desc: desc.trim(), price: Number(price) };
                    });
                } else {
                    items = [{ desc: selectedReceipt.feeHead, price: selectedReceipt.totalFee || (selectedReceipt.paidAmount + (selectedReceipt.discount || 0)) }];
                }

                const subtotal = items.reduce((sum: number, item: any) => sum + item.price, 0);
                const discount = selectedReceipt.discount || 0;
                const totalPayable = subtotal - discount;
                const dateStr = selectedReceipt.date || new Date(selectedReceipt.paymentDate).toLocaleDateString('en-GB');
                
                // Parent view fallback logic for names
                const studentName = selectedReceipt.studentName || user?.name || 'Student';
                const admissionNo = selectedReceipt.admissionNo || studentInfo?.admissionNo || '-';
                const className = selectedReceipt.className || `${studentInfo?.class?.name || ''} - ${studentInfo?.section?.name || ''}`;

                const padRight = (str: any, length: number) => {
                    const s = String(str).substring(0, length);
                    return s + ' '.repeat(Math.max(0, length - s.length));
                };
                const padLeft = (str: any, length: number) => {
                    const s = String(str).substring(0, length);
                    return ' '.repeat(Math.max(0, length - s.length)) + s;
                };

                const dashedLine = '-'.repeat(55);

                return (
                    <div id="receipt-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem', overflowY: 'auto' }}>
                        <div id="printable-receipt-wrapper" style={{ position: 'relative', margin: 'auto' }}>
                            <div id="printable-receipt" style={{ backgroundColor: '#fff', padding: '2rem', width: '148mm', minHeight: '210mm', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                                <div style={{ fontFamily: '"Courier New", Courier, monospace', fontSize: '15px', fontWeight: 'bold', lineHeight: '1.6', color: '#000', width: '100%', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <img src="/erp/bips-logo.png" alt="School Logo" style={{ width: '80px', height: '80px', objectFit: 'contain', display: 'block', margin: '0 auto 8px auto' }} /><br/>
                                        BIPS ERP<br/>
                                        Official Fee Receipt<br/>
                                    </div>
                                    <br/>
                                    {dashedLine}<br/>
                                    {`Receipt No : ${padRight(selectedReceipt.receiptNo || 'N/A', 15)} Date : ${dateStr}`}<br/>
                                    {dashedLine}<br/>
                                    <br/>
                                    Student Details:<br/>
                                    {dashedLine}<br/>
                                    {`Student Name    : ${studentName}`}<br/>
                                    {`Admission No    : ${admissionNo}`}<br/>
                                    {`Class & Section : ${className}`}<br/>
                                    {dashedLine}<br/>
                                    <br/>
                                    Fee Details {monthLabel ? `(${monthLabel})` : ''}:<br/>
                                    {dashedLine}<br/>
                                    | {padRight('Description', 35)} | {padLeft('Amount (₹)', 13)} |<br/>
                                    {dashedLine}<br/>
                                    {items.map((item: any, i: number) => (
                                        <React.Fragment key={i}>
                                            | {padRight(item.desc, 35)} | {padLeft(item.price.toLocaleString(), 13)} |<br/>
                                        </React.Fragment>
                                    ))}
                                    {dashedLine}<br/>
                                    | {padRight('Subtotal', 35)} | {padLeft(subtotal.toLocaleString(), 13)} |<br/>
                                    | {padRight('Discount', 35)} | {padLeft('-' + discount.toLocaleString(), 13)} |<br/>
                                    {dashedLine}<br/>
                                    | {padRight('TOTAL PAYABLE', 35)} | {padLeft(totalPayable.toLocaleString(), 13)} |<br/>
                                    {dashedLine}<br/>
                                    <br/>
                                    <br/>
                                    Payment Details:<br/>
                                    {dashedLine}<br/>
                                    Amount Paid     : ₹{(selectedReceipt.paidAmount || selectedReceipt.amountPaid || 0).toLocaleString()}<br/>
                                    Remaining Due   : ₹{Math.max(0, totalPayable - (selectedReceipt.paidAmount || selectedReceipt.amountPaid || 0)).toLocaleString()}<br/>
                                    Payment Status  : {Math.max(0, totalPayable - (selectedReceipt.paidAmount || selectedReceipt.amountPaid || 0)) > 0 ? 'Partial Payment' : 'Full Paid'}<br/>
                                    Payment Mode    : {selectedReceipt.paymentMode || 'Cash'}<br/>
                                    {dashedLine}<br/>
                                    <br/>
                                    Remark:<br/>
                                    {dashedLine}<br/>
                                    ₹{(selectedReceipt.paidAmount || selectedReceipt.amountPaid || 0).toLocaleString()} received. {Math.max(0, totalPayable - (selectedReceipt.paidAmount || selectedReceipt.amountPaid || 0)) > 0 ? `₹${Math.max(0, totalPayable - (selectedReceipt.paidAmount || selectedReceipt.amountPaid || 0)).toLocaleString()} left as pending.` : 'All dues cleared.'}<br/>
                                    {dashedLine}<br/>
                                    <br/>
                                    This is a computer-generated receipt.<br/>
                                    <br/><br/><br/>
                                    {padLeft('Authorized Signature', 55)}<br/>
                                    {dashedLine}
                                </div>
                            </div>

                            {/* Print Controls (Hidden on print) */}
                            <div className="no-print" style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                                <button 
                                    onClick={() => window.print()} 
                                    style={{ backgroundColor: '#1e293b', color: 'white', border: 'none', padding: '0.8rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                                >
                                    <Printer size={18} /> Print Receipt
                                </button>
                                <button 
                                    onClick={() => setSelectedReceipt(null)} 
                                    style={{ backgroundColor: 'white', color: '#475569', border: '1px solid #cbd5e1', padding: '0.8rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '0.9rem' }}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                        <style>{`
                            @media print {
                                .no-print { display: none !important; }
                                body, html { background: white; margin: 0; padding: 0; }
                                body * { visibility: hidden; }
                                #receipt-modal-overlay {
                                    position: absolute !important;
                                    top: 0 !important; left: 0 !important;
                                    margin: 0 !important; padding: 0 !important;
                                    display: block !important;
                                    visibility: visible !important;
                                    background: transparent !important;
                                }
                                #receipt-modal-overlay * {
                                    visibility: visible;
                                }
                                #printable-receipt-wrapper {
                                    position: relative !important;
                                    margin: 0 !important;
                                    padding: 0 !important;
                                }
                                #printable-receipt { 
                                    position: relative !important; 
                                    width: 100% !important; 
                                    min-height: auto !important;
                                    padding: 5mm !important;
                                    margin: 0 !important; 
                                    box-shadow: none !important; 
                                }
                                @page { size: A5 portrait; margin: 5mm; }
                            }
                        `}</style>
                    </div>
                );
            })()}
        </div>
    );
};

export default MyFees;
