import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Printer, Search, GraduationCap, CreditCard, CheckCircle, Receipt, Trash2, Eye, X, Lock, AlertCircle } from 'lucide-react';

interface TCRecord {
    id: string;
    studentId?: string;
    studentName: string;
    admissionNo: string;
    withdrawalNo?: string;
    tcNo: string;
    sRegisterNo?: string;
    className?: string;
    leavingDate?: string;
    reason?: string;
    conduct?: string;
    issueDate: string;
    fatherName?: string;
    motherName?: string;
    occupation?: string;
    address?: string;
    caste?: string;
    lastInstitution?: string;
    dob?: string;
    dobWords?: string;
    aadharNo?: string;
    isPaid?: boolean;
    receiptNo?: string;
    feeAmount?: number;
}

const TransferCertificate: React.FC = () => {
    const [students, setStudents] = useState<any[]>([]);
    const [tcRecords, setTcRecords] = useState<TCRecord[]>([]);

    const [showPreview, setShowPreview] = useState(false);
    const [selectedTC, setSelectedTC] = useState<TCRecord | null>(null);

    // Form fields
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [studentName, setStudentName] = useState('');
    const [admissionNo, setAdmissionNo] = useState('');
    const [withdrawalNo, setWithdrawalNo] = useState('');
    const [tcNo, setTcNo] = useState('');
    const [sRegisterNo, setSRegisterNo] = useState('');
    const [className, setClassName] = useState('');
    const [leavingDate, setLeavingDate] = useState('');
    const [reason] = useState('');
    const [conduct] = useState('Satisfactory');
    const [fatherName, setFatherName] = useState('');
    const [motherName, setMotherName] = useState('');
    const [occupation, setOccupation] = useState('');
    const [address, setAddress] = useState('');
    const [caste, setCaste] = useState('');
    const [lastInstitution, setLastInstitution] = useState('');
    const [dob, setDob] = useState('');
    const [dobWords, setDobWords] = useState('');
    const [aadharNo, setAadharNo] = useState('');

    // Payment state for current form session
    const [isFormPaid, setIsFormPaid] = useState<boolean>(false);
    const [currentReceiptNo, setCurrentReceiptNo] = useState<string>('');

    // TC Fee Payment Modal state
    const [showPayModal, setShowPayModal] = useState(false);
    const [tcFeeAmount, setTcFeeAmount] = useState<number>(500);
    const [paymentMode, setPaymentMode] = useState<string>('Cash');
    const [paymentRemark, setPaymentRemark] = useState<string>('TC Fee Payment');
    const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

    // Receipt Modal state
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [activeReceipt, setActiveReceipt] = useState<any>(null);

    useEffect(() => {
        fetchStudents();
        fetchTcRecords();
    }, []);

    const fetchStudents = async () => {
        try {
            const res = await axios.get('/erp-api/admin/students');
            setStudents(res.data);
        } catch (err) {
            console.error('Error fetching students:', err);
        }
    };

    const fetchTcRecords = async () => {
        try {
            const res = await axios.get('/erp-api/admin/tc-records');
            setTcRecords(res.data);
            localStorage.setItem('tc_records', JSON.stringify(res.data));
        } catch (err) {
            console.error('Failed to fetch TC records from backend:', err);
            const saved = localStorage.getItem('tc_records');
            if (saved) setTcRecords(JSON.parse(saved));
        }
    };

    const handleSelectStudent = (val: string) => {
        setStudentName(val);
        const s = students.find(x => x.name === val || x.admissionNo === val || x.user?.name === val);
        if (s) {
            setSelectedStudentId(s.id || '');
            setAdmissionNo(s.admissionNo || '');
            setClassName(s.className || s.class?.name || '');
            setFatherName(s.fatherName || '');
            setMotherName(s.motherName || '');
            setOccupation(s.fatherOccupation || '');
            setAddress(s.address || s.user?.address || '');
            setAadharNo(s.aadhaarNumber || '');
            setDob(s.dateOfBirth ? s.dateOfBirth.replace(/-/g, '') : '');
            if (s.religion || s.category) {
                setCaste(`${s.religion || ''} ${s.category ? '(' + s.category + ')' : ''}`.trim());
            }

            // Check if this student already has a paid TC record
            const existingPaid = tcRecords.find(t => t.admissionNo === s.admissionNo && t.isPaid);
            if (existingPaid) {
                setIsFormPaid(true);
                setCurrentReceiptNo(existingPaid.receiptNo || '');
                if (existingPaid.tcNo) setTcNo(existingPaid.tcNo);
            } else {
                setIsFormPaid(false);
                setCurrentReceiptNo('');
            }
        } else {
            setIsFormPaid(false);
            setCurrentReceiptNo('');
        }
    };

    const handleGenerateTC = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!studentName || !admissionNo) {
            return alert('Please fill student name and admission number');
        }

        // STRICT CONDITION: Payment MUST be completed before generating & saving record
        if (!isFormPaid) {
            return alert(
                'Payment Required!\n\nTransfer Certificate generate aur record save karne ke liye pahle "Pay Now" button par click karke TC Fee payment karein.'
            );
        }

        const newTC: Partial<TCRecord> = {
            studentId: selectedStudentId || undefined,
            studentName,
            admissionNo,
            withdrawalNo,
            tcNo: tcNo || `BIPS/TC/${new Date().getFullYear()}/${tcRecords.length + 1}`,
            sRegisterNo,
            className,
            leavingDate,
            reason,
            conduct,
            issueDate: new Date().toISOString().split('T')[0],
            fatherName,
            motherName,
            occupation,
            address,
            caste,
            lastInstitution,
            dob,
            dobWords,
            aadharNo,
            isPaid: true,
            receiptNo: currentReceiptNo,
            feeAmount: tcFeeAmount
        };

        try {
            const res = await axios.post('/erp-api/admin/tc-records', newTC);
            const saved = res.data.record || { ...newTC, id: Date.now().toString() };
            const updated = [saved, ...tcRecords.filter(x => x.id !== saved.id)];
            setTcRecords(updated);
            localStorage.setItem('tc_records', JSON.stringify(updated));
            setSelectedTC(saved as TCRecord);
            setShowPreview(true);
        } catch (err) {
            console.error('Error saving TC record:', err);
            const fallback: TCRecord = { ...(newTC as TCRecord), id: Date.now().toString() };
            const updated = [fallback, ...tcRecords];
            setTcRecords(updated);
            localStorage.setItem('tc_records', JSON.stringify(updated));
            setSelectedTC(fallback);
            setShowPreview(true);
        }
    };

    const handleOpenPayModal = () => {
        if (!studentName || !admissionNo) {
            return alert('Please select or enter student details first before paying TC fee.');
        }
        setShowPayModal(true);
    };

    const handleConfirmPayment = async () => {
        if (!tcFeeAmount || tcFeeAmount <= 0) {
            return alert('Please enter a valid TC fee amount.');
        }

        try {
            setIsSubmittingPayment(true);

            if (paymentMode === 'PayU') {
                const payuRes = await axios.post('/erp-api/fees/payu/initiate', {
                    studentId: selectedStudentId || undefined,
                    amountPaid: Number(tcFeeAmount),
                    totalFee: Number(tcFeeAmount),
                    discount: 0,
                    feeHead: 'Transfer Certificate (TC) Fee',
                    month: 'TC Fee',
                    year: new Date().getFullYear().toString(),
                    remark: paymentRemark || 'TC Fee Payment via PayU Gateway',
                    customerName: studentName || 'Student',
                    customerEmail: 'student@school.com',
                    customerPhone: '9999999999',
                    udf4: 'TC'
                });

                if (payuRes.data.success && payuRes.data.action && payuRes.data.params) {
                    const form = document.createElement('form');
                    form.method = 'POST';
                    form.action = payuRes.data.action;

                    Object.entries(payuRes.data.params).forEach(([k, v]) => {
                        const input = document.createElement('input');
                        input.type = 'hidden';
                        input.name = k;
                        input.value = String(v);
                        form.appendChild(input);
                    });

                    document.body.appendChild(form);
                    form.submit();
                    return;
                } else {
                    alert('Could not initiate PayU Gateway: ' + (payuRes.data.error || 'Unknown error'));
                    setIsSubmittingPayment(false);
                    return;
                }
            }

            // 1. Record fee payment in central ERP Fee System
            let receiptNo = `RCP${Date.now().toString().slice(-5)}`;
            try {
                const feeRes = await axios.post('/erp-api/fees/collect', {
                    studentId: selectedStudentId || undefined,
                    admissionNo: admissionNo || 'TC-STUDENT',
                    studentName: studentName,
                    className: className || 'N/A',
                    fatherName: fatherName || 'N/A',
                    amountPaid: Number(tcFeeAmount),
                    totalFee: Number(tcFeeAmount),
                    discount: 0,
                    feeHead: 'Transfer Certificate (TC) Fee',
                    paymentMode: 'Cash',
                    remark: paymentRemark || 'TC Fee Payment',
                    month: 'TC Fee',
                    year: new Date().getFullYear().toString()
                });
                if (feeRes.data?.data?.receiptNo) {
                    receiptNo = feeRes.data.data.receiptNo;
                }
            } catch (err: any) {
                console.warn('Fee collection API warning:', err);
            }

            // Mark form session as paid and store receipt number
            setIsFormPaid(true);
            setCurrentReceiptNo(receiptNo);
            const generatedTcNo = tcNo || `BIPS/TC/${new Date().getFullYear()}/${tcRecords.length + 1}`;
            setTcNo(generatedTcNo);

            setShowPayModal(false);

            // Open Receipt confirmation modal (record is NOT saved to history until user clicks Generate & Preview)
            setActiveReceipt({
                receiptNo,
                studentName,
                admissionNo,
                className,
                fatherName,
                amountPaid: tcFeeAmount,
                paymentMode: 'Cash',
                feeHead: 'Transfer Certificate (TC) Fee',
                paymentDate: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
                paymentTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });

            setShowReceiptModal(true);
        } catch (err: any) {
            console.error('Failed to confirm TC fee payment:', err);
            alert(err.response?.data?.error || 'Failed to record TC fee payment.');
        } finally {
            setIsSubmittingPayment(false);
        }
    };

    const handleDeleteTC = async (id: string) => {
        if (!confirm('Are you sure you want to delete this TC record?')) return;
        try {
            await axios.delete(`/erp-api/admin/tc-records/${id}`);
        } catch (err) {
            console.warn('API delete warning:', err);
        }
        const updated = tcRecords.filter(x => x.id !== id);
        setTcRecords(updated);
        localStorage.setItem('tc_records', JSON.stringify(updated));
    };

    const handleViewReceiptFromRecord = (tc: TCRecord) => {
        setActiveReceipt({
            receiptNo: tc.receiptNo || 'RCP-TC',
            studentName: tc.studentName,
            admissionNo: tc.admissionNo,
            className: tc.className || 'N/A',
            fatherName: tc.fatherName || 'N/A',
            amountPaid: tc.feeAmount || 500,
            paymentMode: 'Cash / Saved',
            feeHead: 'Transfer Certificate (TC) Fee',
            paymentDate: new Date(tc.issueDate || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
            paymentTime: '10:00 AM'
        });
        setShowReceiptModal(true);
    };

    const renderBoxes = (text: string, count: number) => {
        const chars = text.split('').slice(0, count);
        const boxes = [];
        for (let i = 0; i < count; i++) {
            boxes.push(
                <div key={i} style={{ 
                    width: '25px', 
                    height: '25px', 
                    border: '1px solid black', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: 'bold'
                }}>
                    {chars[i] || ''}
                </div>
            );
        }
        return <div style={{ display: 'flex' }}>{boxes}</div>;
    };

    return (
        <div style={{ padding: '1.5rem' }}>
            <div className="no-print">
                <h1 style={{ marginBottom: '2rem', fontSize: '1.875rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <GraduationCap className="text-primary" size={32} />
                    Transfer Certificate Management
                </h1>

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(360px, 1fr) 1.5fr', gap: '2rem' }}>
                    {/* TC Form */}
                    <div className="stat-card" style={{ display: 'block', height: 'fit-content', padding: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>
                            <h3 style={{ margin: 0, fontWeight: 'bold' }}>Scholar Details</h3>
                            {isFormPaid ? (
                                <span style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <CheckCircle size={14} /> Fee Paid ({currentReceiptNo})
                                </span>
                            ) : (
                                <span style={{ backgroundColor: '#fef3c7', color: '#b45309', padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <AlertCircle size={14} /> Fee Pending
                                </span>
                            )}
                        </div>

                        <form onSubmit={handleGenerateTC}>
                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Find Scholar</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        list="tc-students"
                                        type="text"
                                        className="form-control"
                                        placeholder="Type Name or Admission No..."
                                        value={studentName}
                                        onChange={e => handleSelectStudent(e.target.value)}
                                        required
                                    />
                                    <Search size={16} style={{ position: 'absolute', right: '12px', top: '12px', color: '#9ca3af' }} />
                                    <datalist id="tc-students">
                                        {students.map(s => <option key={s.id} value={s.name || s.user?.name}>{s.admissionNo}</option>)}
                                    </datalist>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <div className="form-group">
                                    <label>Adm. No</label>
                                    <input type="text" className="form-control" value={admissionNo} onChange={e => setAdmissionNo(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Withdrawal No</label>
                                    <input type="text" className="form-control" value={withdrawalNo} onChange={e => setWithdrawalNo(e.target.value)} />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <div className="form-group">
                                    <label>TC No</label>
                                    <input type="text" className="form-control" value={tcNo} onChange={e => setTcNo(e.target.value)} placeholder="Auto-generated" />
                                </div>
                                <div className="form-group">
                                    <label>S. Register No</label>
                                    <input type="text" className="form-control" value={sRegisterNo} onChange={e => setSRegisterNo(e.target.value)} />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Caste / Religion</label>
                                <input type="text" className="form-control" value={caste} onChange={e => setCaste(e.target.value)} placeholder="e.g. Hindu (General)" />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <div className="form-group">
                                    <label>Father's Name</label>
                                    <input type="text" className="form-control" value={fatherName} onChange={e => setFatherName(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Mother's Name</label>
                                    <input type="text" className="form-control" value={motherName} onChange={e => setMotherName(e.target.value)} />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Occupation & Address</label>
                                <input type="text" className="form-control" value={occupation} onChange={e => setOccupation(e.target.value)} placeholder="Occupation" style={{ marginBottom: '0.5rem' }} />
                                <textarea className="form-control" rows={2} value={address} onChange={e => setAddress(e.target.value)} placeholder="Full Address" />
                            </div>

                            <div className="form-group">
                                <label>Date of Birth (DDMMYYYY)</label>
                                <input type="text" className="form-control" value={dob} onChange={e => setDob(e.target.value)} maxLength={8} />
                            </div>

                            <div className="form-group">
                                <label>Date of Birth (in Words)</label>
                                <input type="text" className="form-control" value={dobWords} onChange={e => setDobWords(e.target.value)} />
                            </div>

                            <div className="form-group">
                                <label>Aadhar No</label>
                                <input type="text" className="form-control" value={aadharNo} onChange={e => setAadharNo(e.target.value)} maxLength={12} />
                            </div>

                            <div className="form-group">
                                <label>Last Institution Attended</label>
                                <input type="text" className="form-control" value={lastInstitution} onChange={e => setLastInstitution(e.target.value)} />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <div className="form-group">
                                    <label>Class</label>
                                    <input type="text" className="form-control" value={className} onChange={e => setClassName(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Leaving Date</label>
                                    <input type="date" className="form-control" value={leavingDate} onChange={e => setLeavingDate(e.target.value)} />
                                </div>
                            </div>

                            {/* SEPARATE BUTTONS: STEP 1 (PAY NOW) & STEP 2 (GENERATE & PREVIEW) */}
                            <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {/* STEP 1: PAY NOW BUTTON */}
                                <button
                                    type="button"
                                    onClick={handleOpenPayModal}
                                    style={{
                                        width: '100%',
                                        height: '45px',
                                        fontWeight: 'bold',
                                        backgroundColor: isFormPaid ? '#15803d' : '#16a34a',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '0.5rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <CreditCard size={18} />
                                    {isFormPaid ? `TC Fee Paid (${currentReceiptNo})` : 'Pay TC Fee Now'}
                                </button>

                                {/* STEP 2: GENERATE & PREVIEW BUTTON */}
                                <button
                                    type="submit"
                                    className="btn-primary"
                                    style={{
                                        width: '100%',
                                        height: '45px',
                                        fontWeight: 'bold',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem',
                                        opacity: isFormPaid ? 1 : 0.65,
                                        cursor: isFormPaid ? 'pointer' : 'not-allowed',
                                        backgroundColor: isFormPaid ? '#4f46e5' : '#6b7280'
                                    }}
                                >
                                    {isFormPaid ? <Printer size={18} /> : <Lock size={18} />}
                                    Generate & Preview Form
                                </button>

                                {!isFormPaid && (
                                    <p style={{ margin: 0, fontSize: '11px', color: '#dc2626', textAlign: 'center', fontWeight: '500' }}>
                                        * Note: TC Certificate cannot be generated or saved until TC Fee is paid.
                                    </p>
                                )}
                            </div>
                        </form>
                    </div>

                    {/* Records Table */}
                    <div className="data-table-container">
                        <div className="table-header">
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>History of Issued Forms</h2>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%' }}>
                                <thead>
                                    <tr>
                                        <th>Student Name</th>
                                        <th>Adm No</th>
                                        <th>TC No</th>
                                        <th>Payment Status</th>
                                        <th>Issue Date</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tcRecords.map(tc => (
                                        <tr key={tc.id}>
                                            <td style={{ fontWeight: '600' }}>{tc.studentName}</td>
                                            <td>{tc.admissionNo}</td>
                                            <td>{tc.tcNo}</td>
                                            <td>
                                                {tc.isPaid ? (
                                                    <span style={{
                                                        backgroundColor: '#dcfce7',
                                                        color: '#15803d',
                                                        padding: '4px 10px',
                                                        borderRadius: '12px',
                                                        fontSize: '11px',
                                                        fontWeight: 'bold',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px'
                                                    }}>
                                                        <CheckCircle size={12} /> Paid ({tc.receiptNo || 'Receipt'})
                                                    </span>
                                                ) : (
                                                    <span style={{
                                                        backgroundColor: '#fee2e2',
                                                        color: '#b91c1c',
                                                        padding: '4px 10px',
                                                        borderRadius: '12px',
                                                        fontSize: '11px',
                                                        fontWeight: '600'
                                                    }}>
                                                        Unpaid
                                                    </span>
                                                )}
                                            </td>
                                            <td>{new Date(tc.issueDate).toLocaleDateString()}</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '0.4rem' }}>
                                                    <button
                                                        onClick={() => { setSelectedTC(tc); setShowPreview(true); }}
                                                        className="btn-secondary"
                                                        style={{ padding: '4px 8px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                                                    >
                                                        <Eye size={13} /> View TC
                                                    </button>
                                                    {tc.isPaid && (
                                                        <button
                                                            onClick={() => handleViewReceiptFromRecord(tc)}
                                                            style={{
                                                                padding: '4px 8px',
                                                                fontSize: '12px',
                                                                backgroundColor: '#3b82f6',
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: '0.25rem',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '4px'
                                                            }}
                                                        >
                                                            <Receipt size={13} /> Receipt
                                                        </button>
                                                    )}
                                                    <button
                                                        className="btn-danger"
                                                        style={{ padding: '4px 8px', fontSize: '12px' }}
                                                        onClick={() => handleDeleteTC(tc.id)}
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {tcRecords.length === 0 && (
                                        <tr>
                                            <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>
                                                No TC records found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* TC FEE PAYMENT MODAL */}
            {showPayModal && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1100,
                    padding: '1rem'
                }} className="no-print">
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '0.75rem',
                        padding: '2rem',
                        width: '100%',
                        maxWidth: '480px',
                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.75rem' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                                <CreditCard className="text-primary" size={24} />
                                Transfer Certificate (TC) Fee Payment
                            </h3>
                            <button onClick={() => setShowPayModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ backgroundColor: '#f9fafb', padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
                                <div style={{ fontSize: '0.875rem', color: '#4b5563' }}>Scholar: <strong style={{ color: '#111827' }}>{studentName}</strong></div>
                                <div style={{ fontSize: '0.875rem', color: '#4b5563', marginTop: '4px' }}>Adm No: <strong>{admissionNo}</strong> | Class: <strong>{className || 'N/A'}</strong></div>
                            </div>

                            <div className="form-group">
                                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>Payment Head</label>
                                <input type="text" className="form-control" value="Transfer Certificate (TC) Fee" readOnly style={{ backgroundColor: '#f3f4f6' }} />
                            </div>

                            <div className="form-group">
                                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>Fee Amount (₹)</label>
                                <input
                                    type="number"
                                    className="form-control"
                                    value={tcFeeAmount}
                                    onChange={e => setTcFeeAmount(Number(e.target.value))}
                                    min={0}
                                    placeholder="Amount"
                                />
                            </div>

                            <div className="form-group">
                                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem', display: 'block' }}>Payment Mode</label>
                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                    <label style={{ flex: 1, textAlign: 'center', padding: '0.65rem', background: paymentMode === 'Cash' ? '#22c55e' : 'white', color: paymentMode === 'Cash' ? 'white' : '#166534', borderRadius: '8px', border: '1px solid #22c55e', cursor: 'pointer', fontWeight: '700', fontSize: '0.875rem', transition: '0.2s' }}>
                                        <input type="radio" name="tcPaymentMode" value="Cash" checked={paymentMode === 'Cash'} onChange={() => setPaymentMode('Cash')} style={{ display: 'none' }} /> 💵 Cash
                                    </label>
                                    <label style={{ flex: 1, textAlign: 'center', padding: '0.65rem', background: paymentMode === 'PayU' ? '#047857' : 'white', color: paymentMode === 'PayU' ? 'white' : '#047857', borderRadius: '8px', border: '1px solid #047857', cursor: 'pointer', fontWeight: '700', fontSize: '0.875rem', transition: '0.2s' }}>
                                        <input type="radio" name="tcPaymentMode" value="PayU" checked={paymentMode === 'PayU'} onChange={() => setPaymentMode('PayU')} style={{ display: 'none' }} /> 💳 PayU Online
                                    </label>
                                </div>
                            </div>

                            <div className="form-group">
                                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>Remark / Note</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={paymentRemark}
                                    onChange={e => setPaymentRemark(e.target.value)}
                                    placeholder="e.g. TC Fee Payment"
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowPayModal(false)}
                                    className="btn-secondary"
                                    style={{ flex: 1, padding: '0.6rem' }}
                                    disabled={isSubmittingPayment}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmPayment}
                                    style={{
                                        flex: 1,
                                        padding: '0.6rem',
                                        backgroundColor: '#16a34a',
                                        color: 'white',
                                        fontWeight: 'bold',
                                        border: 'none',
                                        borderRadius: '0.5rem',
                                        cursor: isSubmittingPayment ? 'wait' : 'pointer'
                                    }}
                                    disabled={isSubmittingPayment}
                                >
                                    {isSubmittingPayment ? 'Processing...' : 'Confirm & Collect Fee'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* RECEIPT MODAL */}
            {showReceiptModal && activeReceipt && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(0,0,0,0.75)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1200,
                    padding: '1.5rem',
                    overflowY: 'auto'
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '0.5rem',
                        width: '100%',
                        maxWidth: '520px',
                        padding: '2rem',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                    }}>
                        <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginBottom: '1rem' }}>
                            <button
                                onClick={() => window.print()}
                                className="btn-primary"
                                style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '14px' }}
                            >
                                <Printer size={16} /> Print Receipt
                            </button>
                            <button
                                onClick={() => setShowReceiptModal(false)}
                                className="btn-secondary"
                                style={{ padding: '0.5rem 1rem', fontSize: '14px' }}
                            >
                                Close
                            </button>
                        </div>

                        {/* Printable Fee Receipt */}
                        <div id="printable-receipt" style={{
                            border: '2px solid #1e293b',
                            borderRadius: '6px',
                            padding: '1.5rem',
                            backgroundColor: '#fff',
                            color: '#000',
                            fontFamily: 'Arial, sans-serif'
                        }}>
                            <div style={{ textAlign: 'center', borderBottom: '2px solid #1e293b', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase', color: '#1e3a8a' }}>
                                    BIPIN INTER COLLEGE (BIPS)
                                </h2>
                                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#4b5563' }}>Official Fee Payment Receipt</p>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '1rem', borderBottom: '1px dashed #cbd5e1', paddingBottom: '0.5rem' }}>
                                <div>Receipt No: <strong style={{ color: '#16a34a' }}>{activeReceipt.receiptNo}</strong></div>
                                <div>Date: <strong>{activeReceipt.paymentDate}</strong></div>
                            </div>

                            <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse', marginBottom: '1rem' }}>
                                <tbody>
                                    <tr>
                                        <td style={{ padding: '4px 0', color: '#4b5563', width: '35%' }}>Student Name:</td>
                                        <td style={{ padding: '4px 0', fontWeight: 'bold' }}>{activeReceipt.studentName}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ padding: '4px 0', color: '#4b5563' }}>Admission No:</td>
                                        <td style={{ padding: '4px 0', fontWeight: 'bold' }}>{activeReceipt.admissionNo}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ padding: '4px 0', color: '#4b5563' }}>Class:</td>
                                        <td style={{ padding: '4px 0' }}>{activeReceipt.className || 'N/A'}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ padding: '4px 0', color: '#4b5563' }}>Father's Name:</td>
                                        <td style={{ padding: '4px 0' }}>{activeReceipt.fatherName || 'N/A'}</td>
                                    </tr>
                                </tbody>
                            </table>

                            <div style={{ border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden', marginBottom: '1rem' }}>
                                <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                                    <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                        <tr>
                                            <th style={{ padding: '6px 8px', textAlign: 'left' }}>Fee Head</th>
                                            <th style={{ padding: '6px 8px', textAlign: 'left' }}>Mode</th>
                                            <th style={{ padding: '6px 8px', textAlign: 'right' }}>Amount (₹)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td style={{ padding: '8px', fontWeight: '600' }}>{activeReceipt.feeHead}</td>
                                            <td style={{ padding: '8px' }}>{activeReceipt.paymentMode}</td>
                                            <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', fontSize: '14px', color: '#16a34a' }}>
                                                ₹ {Number(activeReceipt.amountPaid).toLocaleString('en-IN')}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '1.5rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0', fontSize: '11px', color: '#64748b' }}>
                                <div>
                                    <div>Status: <span style={{ color: '#16a34a', fontWeight: 'bold' }}>APPROVED</span></div>
                                    <div>Generated automatically by BIPS ERP</div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ borderTop: '1px solid #000', width: '100px', marginTop: '20px', paddingTop: '2px', fontWeight: 'bold', color: '#000' }}>
                                        Authorized Signatory
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* PREVIEW MODAL */}
            {showPreview && selectedTC && (
                <div className="print-modal-wrapper" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1000, overflowY: 'auto', padding: '2rem' }}>
                    <div style={{ backgroundColor: 'white', padding: '3rem', cursor: 'default', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)', borderRadius: '4px' }}>
                        <div className="no-print" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <button onClick={() => {
                                const originalTitle = document.title;
                                document.title = `${selectedTC.studentName}_TC`;
                                window.print();
                                setTimeout(() => { document.title = originalTitle; }, 1000);
                            }} className="btn-primary" style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Printer size={18} /> Print Certificate
                            </button>
                            <button onClick={() => setShowPreview(false)} className="btn-secondary" style={{ padding: '0.75rem 1.5rem' }}>Close</button>
                        </div>
                        
                        {/* THE ACTUAL FORM UI START */}
                        <div id="printable-tc" style={{ 
                            width: '210mm', 
                            minHeight: '297mm', 
                            padding: '10mm', 
                            border: '1px solid #ccc', 
                            backgroundColor: 'white',
                            color: 'black',
                            fontFamily: '"Times New Roman", Times, serif',
                            boxSizing: 'border-box'
                        }}>
                            <div style={{ position: 'relative', marginBottom: '1rem', minHeight: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 80px' }}>
                                <img src="/erp/bips-logo.png" alt="BIPS Logo" style={{ position: 'absolute', left: '0', top: '50%', transform: 'translateY(-50%)', width: '70px', height: '70px', objectFit: 'contain' }} />
                                <h2 style={{ textAlign: 'center', margin: '0', textTransform: 'uppercase', fontSize: '22px', fontWeight: 'bold' }}>
                                    Scholar's Register & Transfer Certificate Form
                                </h2>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', gap: '10px', marginBottom: '10px', fontSize: '13px' }}>
                                <div>Adm. No. <span style={{ borderBottom: '1px dashed black', flex: 1, padding: '0 5px' }}>{selectedTC.admissionNo}</span></div>
                                <div>Withdrawal No. <span style={{ borderBottom: '1px dashed black', flex: 1, padding: '0 5px' }}>{selectedTC.withdrawalNo}</span></div>
                                <div>TC. No. <span style={{ borderBottom: '1px dashed black', flex: 1, padding: '0 5px' }}>{selectedTC.tcNo}</span></div>
                                <div>S. Register No. <span style={{ borderBottom: '1px dashed black', flex: 1, padding: '0 5px' }}>{selectedTC.sRegisterNo}</span></div>
                            </div>

                            <div style={{ border: '1px solid black', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', minHeight: '120px' }}>
                                <div style={{ borderRight: '1px solid black', padding: '10px' }}>
                                    <p style={{ margin: '0 0 10px 0', fontSize: '14px', textAlign: 'center', borderBottom: '1px solid black', paddingBottom: '5px' }}>
                                        Name of the Scholar with Caste<br/>if Hindu, Otherwise religion
                                    </p>
                                    <p style={{ fontSize: '16px', fontWeight: 'bold', textAlign: 'center' }}>
                                        {selectedTC.studentName}<br/>
                                        <span style={{ fontSize: '12px', fontWeight: 'normal' }}>({selectedTC.caste})</span>
                                    </p>
                                </div>
                                <div style={{ borderRight: '1px solid black', padding: '10px' }}>
                                    <div style={{ marginBottom: '8px', borderBottom: '1px dashed #777' }}>Father's Name: <b>{selectedTC.fatherName}</b></div>
                                    <div style={{ marginBottom: '8px', borderBottom: '1px dashed #777' }}>Mother's Name: <b>{selectedTC.motherName}</b></div>
                                    <div style={{ marginBottom: '8px', borderBottom: '1px dashed #777' }}>Occupation: <b>{selectedTC.occupation}</b></div>
                                    <div>Address: <span style={{ fontSize: '12px' }}>{selectedTC.address}</span></div>
                                </div>
                                <div style={{ padding: '10px' }}>
                                    <p style={{ margin: '0 0 10px 0', fontSize: '13px', textAlign: 'center', borderBottom: '1px solid black', paddingBottom: '5px' }}>
                                        The last Institution<br/>attended by the Scholar
                                    </p>
                                    <p style={{ fontSize: '13px', textAlign: 'center' }}>{selectedTC.lastInstitution}</p>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '15px', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '14px' }}>Date of Birth (in Figures)</span>
                                    {renderBoxes(selectedTC.dob || '', 8)}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '14px' }}>Aadhar No.</span>
                                    {renderBoxes(selectedTC.aadharNo || '', 12)}
                                </div>
                            </div>
                            <div style={{ marginTop: '10px', fontSize: '14px' }}>
                                Date of Birth (in Words) <span style={{ borderBottom: '1px dashed black', padding: '0 10px' }}>{selectedTC.dobWords}</span>
                            </div>

                            <table className="tc-table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px', border: '1px solid black' }}>
                                <thead>
                                    <tr>
                                        <th rowSpan={2} style={thStyle}>Class</th>
                                        <th style={thStyle}>Date of Admission</th>
                                        <th style={thStyle}>Date of Promotion</th>
                                        <th style={thStyle}>Date of Removal</th>
                                        <th style={thStyle}>Cause of removal i.e. Non payment of dues removal of family, expulsion etc.</th>
                                        <th rowSpan={2} style={thStyle}>Year</th>
                                        <th rowSpan={2} style={thStyle}>Conduct & Work</th>
                                    </tr>
                                    <tr>
                                        <th style={thStyle}>1</th>
                                        <th style={thStyle}>2</th>
                                        <th style={thStyle}>3</th>
                                        <th style={thStyle}>4</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <StaticRow label="Pre Nursery" />
                                    <StaticRow label="Nursery" />
                                    <StaticRow label="K.G." />
                                    <SectionRow label="Primary" classes={['I', 'II', 'III', 'IV', 'V']} />
                                    <SectionRow label="Secondary" classes={['VI', 'VII', 'VIII', 'IX', 'X']} />
                                    <SectionRow label="Sr. Sec." classes={['XI', 'XII']} />
                                </tbody>
                            </table>

                            <div style={{ marginTop: '20px', fontSize: '12px', display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'flex-start' }}>
                                <div>
                                    <p style={{ margin: '0 0 5px 0' }}>1. Certified the above Scholar's Register has been posted upto date Scholar's leaving as required by the Department Rules.</p>
                                    <p style={{ margin: '0' }}>Note: If Student has been among the first five in the class, this fact should be mentioned in the column of work. In the case of student leaving of the classes IX to XII of the attendance or lecture should be entered at the back of this form.</p>
                                </div>
                                <div style={{ textAlign: 'center', marginTop: '40px', minWidth: '150px' }}>
                                    <p style={{ fontWeight: 'bold' }}>Principal</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @media print {
                    ::-webkit-scrollbar { display: none !important; }
                    .no-print { display: none !important; }
                    body { background: white !important; padding: 0 !important; margin: 0 !important; overflow: hidden !important; }
                    .print-modal-wrapper { padding: 0 !important; overflow: visible !important; background: transparent !important; position: absolute !important; left: 0 !important; top: 0 !important; }
                    @page { margin: 0; size: auto; }
                    #printable-tc { 
                        position: absolute !important; 
                        left: 0 !important; 
                        top: 0 !important; 
                        margin: 0 !important; 
                        /* Do NOT override width, padding, border, or box-sizing here */
                        /* They should inherit from the inline styles to match the UI perfectly */
                        background: white !important;
                    }
                    #printable-receipt { 
                        position: absolute !important; 
                        left: 0 !important; 
                        top: 0 !important; 
                        border: none !important; 
                        box-shadow: none !important; 
                        margin: 0 !important; 
                        width: 100% !important; 
                        padding: 0 !important; 
                        background: white !important;
                    }
                }
                .form-control { width: 100%; padding: 0.6rem; border: 1px solid #d1d5db; borderRadius: 0.5rem; outline: none; transition: border 0.2s; }
                .form-control:focus { border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1); }
                .tc-table th, .tc-table td { border: 1px solid black; padding: 4px; font-size: 11px; text-align: center; }
            `}</style>
        </div>
    );
};

const thStyle: React.CSSProperties = { border: '1px solid black', padding: '4px', fontSize: '10px', backgroundColor: '#f9f9f9' };

const StaticRow: React.FC<{ label: string }> = ({ label }) => (
    <tr style={{ height: '24px' }}>
        <td style={{ fontWeight: 'bold' }}>{label}</td>
        <td></td><td></td><td></td><td></td><td></td><td></td>
    </tr>
);

const SectionRow: React.FC<{ label: string, classes: string[] }> = ({ label, classes }) => (
    <>
        {classes.map((c, i) => (
            <tr key={c} style={{ height: '24px' }}>
                {i === 0 && <td rowSpan={classes.length} style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontWeight: 'bold', fontSize: '10px' }}>{label}</td>}
                <td style={{ textAlign: 'left', paddingLeft: '10px' }}>{i + 1} &nbsp;&nbsp;&nbsp; {c}</td>
                <td></td><td></td><td></td><td></td><td></td><td></td>
            </tr>
        ))}
    </>
);

export default TransferCertificate;
