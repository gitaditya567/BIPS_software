import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CreditCard, CheckCircle2, AlertCircle, Download, Calendar, Check, ShieldCheck, RefreshCw } from 'lucide-react';

export const PublicFeePayment: React.FC = () => {
    const [searchParams] = useSearchParams();
    const [searchQuery, setSearchQuery] = useState('');
    const [dobQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const [studentData, setStudentData] = useState<any>(null);

    // Selected Fee Items state
    const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
    const [selectedOneTimeHeads, setSelectedOneTimeHeads] = useState<string[]>([]);
    const [includePrevDues, setIncludePrevDues] = useState(false);
    const [includeTransport, setIncludeTransport] = useState(true);
    const [isTransportYearly, setIsTransportYearly] = useState(false);
    const [deselectedMonthlyHeads, setDeselectedMonthlyHeads] = useState<string[]>([]);
    const [remark, setRemark] = useState<string>('');
    const [paymentProcessing, setPaymentProcessing] = useState(false);

    // Success Modal state after PayU return
    const [paymentResult, setPaymentResult] = useState<{ status: string; receiptNo?: string; txnid?: string; amount?: number; feeHead?: string } | null>(null);

    const allMonths = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];

    // Check query params on mount for PayU redirect result
    useEffect(() => {
        const paymentStatus = searchParams.get('payment');
        const receiptNo = searchParams.get('receipt');
        const txnid = searchParams.get('txnid');
        const studentId = searchParams.get('studentId');
        const admissionNo = searchParams.get('admissionNo');
        const amount = searchParams.get('amount');
        const feeHead = searchParams.get('feeHead');

        const targetQuery = admissionNo || studentId;

        if (targetQuery) {
            setSearchQuery(targetQuery);
            fetchStudentByAdmissionNo(targetQuery);
        }

        if (paymentStatus) {
            setPaymentResult({
                status: paymentStatus,
                receiptNo: receiptNo || undefined,
                txnid: txnid || undefined,
                amount: amount ? Number(amount) : undefined,
                feeHead: feeHead || undefined
            });
            // Clean URL query parameters so browser refresh resets to home state
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, [searchParams]);

    const handleResetToHome = () => {
        setStudentData(null);
        setSearchQuery('');
        setPaymentResult(null);
        setErrorMsg('');
        setSelectedMonths([]);
        setSelectedOneTimeHeads([]);
        setDeselectedMonthlyHeads([]);
        setIsTransportYearly(false);
        setRemark('');
        window.history.replaceState({}, document.title, window.location.pathname);
    };

    const fetchStudentByAdmissionNo = async (queryStr: string) => {
        const targetQuery = queryStr.trim();
        if (!targetQuery) return;

        setLoading(true);
        setErrorMsg('');
        try {
            const res = await axios.get(`/erp-api/fees/public/student-dues`, {
                params: { admissionNo: targetQuery }
            });
            setStudentData(res.data);

            const unpaidM = (res.data.monthlyDues || []).filter((m: any) => m.isElapsed && m.pending > 0).map((m: any) => m.month);

            setSelectedOneTimeHeads([]);
            setDeselectedMonthlyHeads([]);
            setSelectedMonths(unpaidM);
            setIncludePrevDues((res.data.summary?.previousDuePending || 0) > 0);
            setIncludeTransport(!!res.data.student?.transportStop);
        } catch (err: any) {
            console.error(err);
            setErrorMsg(err.response?.data?.error || 'No active student record found with this Admission Number.');
        } finally {
            setLoading(false);
        }
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        fetchStudentByAdmissionNo(searchQuery);
    };

    const toggleMonthlyHead = (hName: string) => {
        setDeselectedMonthlyHeads(prev =>
            prev.includes(hName) ? prev.filter(x => x !== hName) : [...prev, hName]
        );
    };

    // Helper checks
    const isMonthPaid = (mName: string) => {
        if (!studentData) return false;
        const m = (studentData.monthlyDues || []).find((x: any) => x.month === mName);
        if (!m) return false;
        if (studentData.student?.isRT) return true;
        return m.isPaid !== undefined ? m.isPaid : (m.expected > 0 ? m.paid >= m.expected : m.pending <= 0);
    };

    // Calculate total selected amount
    const calculateSelectedTotal = () => {
        if (!studentData) return 0;

        let total = 0;

        if (includePrevDues && studentData.summary?.previousDuePending) {
            total += studentData.summary.previousDuePending;
        }

        // Add selected One-Time Heads
        (studentData.oneTimeBreakdown || []).forEach((ot: any) => {
            if (selectedOneTimeHeads.includes(ot.name)) {
                total += ot.pending;
            }
        });

        // Add selected Monthly Dues (only selected heads for selected months)
        (studentData.monthlyDues || []).forEach((m: any) => {
            if (selectedMonths.includes(m.month)) {
                (m.heads || []).forEach((h: any) => {
                    const isThirdChildExempt = studentData.student?.isThirdChild && h.name.toLowerCase().includes('tuition');
                    const isTransportHead = h.name.toLowerCase().includes('transport') || h.name.toLowerCase().includes('bus');
                    if (isTransportHead) return;

                    if (deselectedMonthlyHeads.includes(h.name)) return;

                    const headPending = h.pending !== undefined ? h.pending : Math.max(0, (h.expected || 0) - (h.paid || 0));

                    if (!isThirdChildExempt && headPending > 0) {
                        total += headPending;
                    }
                });
            }
        });

        // Add Transport Fee if enabled and not unselected
        if (includeTransport && studentData.student?.transportStop && !deselectedMonthlyHeads.includes('Transport Fee')) {
            const busFare = studentData.student.transportStop.busFare || 0;
            const targetTransportMonths = isTransportYearly ? allMonths : selectedMonths;

            targetTransportMonths.forEach((mName: string) => {
                const mObj = (studentData.monthlyDues || []).find((x: any) => x.month === mName);
                const trHead = (mObj?.heads || []).find((h: any) => h.name.toLowerCase().includes('transport') || h.name.toLowerCase().includes('bus'));
                const trPending = trHead ? (trHead.pending !== undefined ? trHead.pending : Math.max(0, (trHead.expected || 0) - (trHead.paid || 0))) : busFare;
                if (trPending > 0) {
                    total += trPending;
                }
            });
        }

        return total;
    };

    // Select month and auto-select all previous unpaid months up to that month
    const handleMonthClick = (mName: string) => {
        if (isMonthPaid(mName)) return;
        const mIdx = allMonths.indexOf(mName);
        if (mIdx === -1) return;

        const isCurrentlySelected = selectedMonths.includes(mName);

        if (isCurrentlySelected) {
            // Keep only selected months that come before mIdx
            const remaining = selectedMonths.filter(m => allMonths.indexOf(m) < mIdx);
            setSelectedMonths(remaining);
        } else {
            // Select all unpaid months from April up to mIdx
            const newSelection: string[] = [];
            for (let i = 0; i <= mIdx; i++) {
                const monthName = allMonths[i];
                if (!isMonthPaid(monthName)) {
                    newSelection.push(monthName);
                }
            }
            setSelectedMonths(newSelection);
        }
    };

    const handleSelectAllUnpaid = () => {
        if (!studentData) return;
        const unpaidM = (studentData.monthlyDues || []).filter((m: any) => m.pending > 0).map((m: any) => m.month);

        setSelectedOneTimeHeads([]);
        setSelectedMonths(unpaidM);
        setIncludePrevDues((studentData.summary?.previousDuePending || 0) > 0);
    };

    const handleDeselectAll = () => {
        setSelectedOneTimeHeads([]);
        setSelectedMonths([]);
        setIncludePrevDues(false);
    };

    const handlePayUCheckout = async () => {
        const finalAmount = calculateSelectedTotal();
        if (finalAmount <= 0) {
            alert('Please select at least one fee head or month to proceed with payment.');
            return;
        }

        setPaymentProcessing(true);

        try {
            const feeItems: string[] = [];
            const breakdownParts: string[] = [];

            if (includePrevDues && studentData.summary?.previousDuePending) {
                feeItems.push('Previous Dues');
                breakdownParts.push(`Previous Dues: ${studentData.summary.previousDuePending}`);
            }

            selectedOneTimeHeads.forEach(hName => {
                const ot = (studentData.oneTimeBreakdown || []).find((x: any) => x.name === hName);
                if (ot && ot.pending > 0) {
                    feeItems.push(ot.name);
                    breakdownParts.push(`${ot.name}: ${ot.pending}`);
                }
            });

            const activeSelectedMonths: string[] = [];
            selectedMonths.forEach(mName => {
                const mObj = (studentData.monthlyDues || []).find((x: any) => x.month === mName);
                if (mObj) {
                    let monthHasHeadSelected = false;
                    (mObj.heads || []).forEach((h: any) => {
                        const isThirdChildExempt = studentData.student?.isThirdChild && h.name.toLowerCase().includes('tuition');
                        const isTransportHead = h.name.toLowerCase().includes('transport') || h.name.toLowerCase().includes('bus');
                        if (isTransportHead) return;
                        if (deselectedMonthlyHeads.includes(h.name)) return;

                        const headPending = h.pending !== undefined ? h.pending : Math.max(0, (h.expected || 0) - (h.paid || 0));

                        if (!isThirdChildExempt && headPending > 0) {
                            monthHasHeadSelected = true;
                            breakdownParts.push(`${h.name}: ${headPending}`);
                        }
                    });
                    if (monthHasHeadSelected) {
                        activeSelectedMonths.push(mName);
                    }
                }
            });

            if (includeTransport && studentData.student?.transportStop && !deselectedMonthlyHeads.includes('Transport Fee')) {
                const busFare = studentData.student.transportStop.busFare || 0;
                const targetTransportMonths = isTransportYearly ? allMonths : selectedMonths;
                let trTotal = 0;
                targetTransportMonths.forEach((mName: string) => {
                    const mObj = (studentData.monthlyDues || []).find((x: any) => x.month === mName);
                    const trHead = (mObj?.heads || []).find((h: any) => h.name.toLowerCase().includes('transport') || h.name.toLowerCase().includes('bus'));
                    const trPending = trHead ? (trHead.pending !== undefined ? trHead.pending : Math.max(0, (trHead.expected || 0) - (trHead.paid || 0))) : busFare;
                    if (trPending > 0) {
                        trTotal += trPending;
                    }
                });
                if (trTotal > 0) {
                    breakdownParts.push(`Transport Fee (${studentData.student.transportStop.name}): ${trTotal}`);
                }
            }

            const hasMonthly = activeSelectedMonths.length > 0;
            const feeHeadValue = hasMonthly 
                ? `${activeSelectedMonths.join(', ')} ==> ${breakdownParts.join(' || ')}`
                : ` ==> ${breakdownParts.join(' || ')}`;

            const selectedMonthStr = activeSelectedMonths.length > 0 ? activeSelectedMonths.join(', ') : 'All';

            const payload = {
                studentId: studentData.student.id,
                amountPaid: finalAmount,
                totalFee: finalAmount,
                feeHead: feeHeadValue,
                month: selectedMonthStr,
                year: studentData.student.academicYear || '2026-2027',
                remark: remark || 'Online PayU Fee Payment',
                customerName: studentData.student.studentName,
                customerEmail: 'parent@bips.local',
                customerPhone: studentData.student.fatherMobile !== 'N/A' ? studentData.student.fatherMobile : '9999999999',
                udf4: 'PublicFeeOnline::' + feeHeadValue
            };

            const res = await axios.post('/erp-api/fees/payu/initiate', payload);

            if (res.data && res.data.action && res.data.params) {
                const form = document.createElement('form');
                form.method = 'POST';
                form.action = res.data.action;

                Object.keys(res.data.params).forEach(key => {
                    const input = document.createElement('input');
                    input.type = 'hidden';
                    input.name = key;
                    input.value = res.data.params[key];
                    form.appendChild(input);
                });

                document.body.appendChild(form);
                form.submit();
            } else {
                alert('Payment initiation failed. Please try again.');
                setPaymentProcessing(false);
            }
        } catch (err: any) {
            console.error('PayU Payment Initiate Error:', err);
            alert(err.response?.data?.error || 'Failed to connect to PayU Gateway. Please try again.');
            setPaymentProcessing(false);
        }
    };

    // PDF Receipt Export Function
    const generatePDFReceipt = (receipt: any, customStudentObj?: any) => {
        const doc = new jsPDF();
        const stInfo = customStudentObj || studentData?.student || {};
        const activeSessionStr = stInfo?.academicYear || '2026-2027';
        const amountVal = Number(receipt.amountPaid || receipt.amount || 0);

        // Header
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('BIMLA INTERNATIONAL PUBLIC SCHOOL', 105, 14, { align: 'center' });

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Makhdoompur Kaithi, Jaiti Khera, Sarojini Nagar, Lucknow', 105, 20, { align: 'center' });

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('ONLINE FEE PAYMENT RECEIPT', 105, 27, { align: 'center' });

        // Line
        doc.setLineWidth(0.5);
        doc.line(14, 30, 196, 30);

        // Receipt Details Box
        doc.setFontSize(9.5);
        doc.setFont('helvetica', 'bold');
        doc.text(`Receipt No: ${receipt.receiptNo || 'RCP-ONLINE'}`, 14, 37);
        doc.text(`Date: ${receipt.date || new Date().toLocaleDateString('en-GB')}`, 140, 37);
        doc.text(`Payment Mode: Online (PayU)`, 14, 43);
        doc.text(`Txn ID: ${receipt.txnid || 'N/A'}`, 140, 43);

        // Student Info Box
        autoTable(doc, {
            startY: 48,
            theme: 'grid',
            head: [['Student Information', 'Details']],
            body: [
                ['Student Name', stInfo?.studentName || 'N/A'],
                ['Admission No (SR No)', stInfo?.admissionNo || 'N/A'],
                ['Class & Section', stInfo?.className || 'N/A'],
                ['Father\'s Name', stInfo?.fatherName || 'N/A'],
                ['Academic Session', activeSessionStr]
            ],
            headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 9 }
        });

        // Payment Particulars
        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 6,
            theme: 'grid',
            head: [['Particulars / Fee Head', 'Month / Session', 'Amount Paid (₹)']],
            body: [
                [receipt.feeHead || 'Online Fee Collection', receipt.month || 'N/A', `₹${amountVal > 0 ? amountVal.toLocaleString('en-IN') : Number(receipt.amount || 0).toLocaleString('en-IN')}`],
                [{ content: 'TOTAL PAID AMOUNT:', colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } }, { content: `₹${amountVal > 0 ? amountVal.toLocaleString('en-IN') : Number(receipt.amount || 0).toLocaleString('en-IN')}`, styles: { fontStyle: 'bold', textColor: [4, 120, 87] } }]
            ],
            headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 9.5 }
        });

        // Footer
        const finalY = (doc as any).lastAutoTable.finalY + 20;
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'italic');
        doc.text('Computer Generated Fee Receipt. No signature required.', 105, finalY, { align: 'center' });

        doc.save(`${receipt.receiptNo || 'RCP'}_BIPS_Fee_Receipt.pdf`);
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'Inter, sans-serif', color: '#1e293b' }}>
            {/* Top Navigation Bar */}
            <div style={{ backgroundColor: '#1e293b', color: 'white', padding: '1rem 2rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <div style={{ width: '45px', height: '45px', backgroundColor: 'white', borderRadius: '10px', padding: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                            <img 
                                src="/erp/bips-logo.png" 
                                alt="BIPS Logo" 
                                onError={(e: any) => { e.target.onerror = null; e.target.src = "/bips-logo.png"; }}
                                style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                            />
                        </div>
                        <div>
                            <h1 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, letterSpacing: '0.5px' }}>BIMLA INTERNATIONAL PUBLIC SCHOOL</h1>
                            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>Online Fee Payment Portal • Sarojini Nagar, Lucknow</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <button
                            onClick={handleResetToHome}
                            style={{ backgroundColor: '#334155', border: '1px solid #475569', color: 'white', padding: '0.45rem 0.9rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', transition: 'all 0.2s' }}
                        >
                            🏠 Portal Home
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#0f172a', padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid #334155', fontSize: '0.8rem', color: '#38bdf8' }}>
                            <ShieldCheck size={16} /> 100% Safe PayU Gateway
                        </div>
                    </div>
                </div>
            </div>

            {/* Hero Header */}
            <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', color: 'white', padding: '2.5rem 1.5rem', textAlign: 'center' }}>
                <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <span style={{ backgroundColor: 'rgba(255,255,255,0.15)', padding: '0.3rem 0.9rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Direct Parent Fee Payment
                    </span>
                    <h2 style={{ fontSize: '2.2rem', fontWeight: 900, marginTop: '0.5rem', marginBottom: '0.4rem' }}>
                        BIPS ONLINE PAYMENT
                    </h2>
                    <p style={{ fontSize: '0.95rem', color: '#e0f2fe', opacity: 0.9, maxWidth: '600px', margin: '0 auto' }}>
                        Enter Admission Number (SR No) below to view fee structure, select heads/months, and pay online securely.
                    </p>
                </div>
            </div>

            {/* Main Content Container */}
            <div style={{ maxWidth: '1100px', margin: '-2rem auto 4rem', padding: '0 1rem' }}>

                {/* Step 1: Search Box Card */}
                <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '1.75rem', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0', marginBottom: '1.75rem' }}>
                    <form onSubmit={handleSearchSubmit}>
                        <div style={{ marginBottom: '1.25rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#334155', marginBottom: '0.4rem' }}>
                                    Admission Number (SR No) <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <div style={{ display: 'flex', alignItems: 'center', border: '2px solid #3b82f6', borderRadius: '10px', overflow: 'hidden', backgroundColor: '#f8fafc' }}>
                                    <span style={{ backgroundColor: '#eff6ff', padding: '0.75rem 0.85rem', fontWeight: 800, color: '#1d4ed8', fontSize: '0.85rem', borderRight: '1px solid #bfdbfe' }}>
                                        SR No:
                                    </span>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. BIPS/26/1447 or 1447" 
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        style={{ flex: 1, padding: '0.75rem 0.85rem', border: 'none', outline: 'none', fontSize: '0.95rem', fontWeight: 700 }}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <button 
                            type="submit"
                            disabled={loading}
                            style={{ 
                                width: '100%',
                                padding: '0.85rem 1.75rem', 
                                backgroundColor: '#2563eb', 
                                color: 'white', 
                                border: 'none', 
                                borderRadius: '10px', 
                                fontWeight: 800, 
                                fontSize: '1rem', 
                                cursor: loading ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                                transition: 'all 0.2s'
                            }}
                        >
                            {loading ? <RefreshCw className="animate-spin" size={20} /> : <ShieldCheck size={20} />}
                            Fetch Student Fee Details
                        </button>
                    </form>

                    {errorMsg && (
                        <div style={{ marginTop: '1.25rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '1rem', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <AlertCircle size={22} />
                            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{errorMsg}</span>
                        </div>
                    )}
                </div>

                {/* PayU Return Success / Status Banner */}
                {paymentResult && (
                    <div style={{ backgroundColor: paymentResult.status === 'approved' ? '#ecfdf5' : '#fef2f2', border: `2px solid ${paymentResult.status === 'approved' ? '#a7f3d0' : '#fecaca'}`, borderRadius: '16px', padding: '1.5rem', marginBottom: '1.75rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                            {paymentResult.status === 'approved' ? (
                                <CheckCircle2 size={34} style={{ color: '#059669' }} />
                            ) : (
                                <AlertCircle size={34} style={{ color: '#dc2626' }} />
                            )}
                            <div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: paymentResult.status === 'approved' ? '#065f46' : '#991b1b' }}>
                                    {paymentResult.status === 'approved' ? 'Online Payment Successful!' : 'Online Payment Unsuccessful / Cancelled'}
                                </h3>
                                <p style={{ margin: 0, fontSize: '0.85rem', color: paymentResult.status === 'approved' ? '#047857' : '#b91c1c' }}>
                                    {paymentResult.status === 'approved' 
                                        ? `Transaction ID: ${paymentResult.txnid || 'N/A'} | Receipt No: ${paymentResult.receiptNo || 'RCP-ONLINE'} | Amount Paid: ₹${paymentResult.amount?.toLocaleString() || 'Paid'}`
                                        : 'The transaction could not be completed. If amount was debited, it will be refunded automatically.'}
                                </p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                            {paymentResult.status === 'approved' && paymentResult.receiptNo && (
                                <button
                                    onClick={() => generatePDFReceipt({ 
                                        receiptNo: paymentResult.receiptNo, 
                                        date: new Date().toLocaleDateString('en-GB'), 
                                        amountPaid: paymentResult.amount || calculateSelectedTotal(), 
                                        feeHead: paymentResult.feeHead || 'Online Fee Collection', 
                                        txnid: paymentResult.txnid 
                                    }, studentData?.student)}
                                    style={{ padding: '0.65rem 1.25rem', backgroundColor: '#059669', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                                >
                                    <Download size={18} /> Download Official PDF Receipt
                                </button>
                            )}
                            <button
                                onClick={handleResetToHome}
                                style={{ padding: '0.65rem 1.25rem', backgroundColor: '#1e293b', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                            >
                                🏠 Portal Home / New Search
                            </button>
                        </div>
                    </div>
                )}

                {/* Loaded Student Content */}
                {studentData && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

                        {/* Step 2: Student Info Header Card */}
                        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '1.5rem 1.75rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem', alignItems: 'center' }}>
                                <div>
                                    <label style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Student Name</label>
                                    <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        {studentData.student.studentName}
                                        {studentData.student.isOldStudent && (
                                            <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', backgroundColor: '#e0f2fe', color: '#0369a1', borderRadius: '12px', fontWeight: 700, border: '1px solid #bae6fd' }}>
                                                Old Student
                                            </span>
                                        )}
                                        {studentData.student.isThirdChild && (
                                            <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: '12px', fontWeight: 700, border: '1px solid #fde68a' }}>
                                                Third Child
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Father Name</label>
                                    <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#1e293b' }}>{studentData.student.fatherName}</div>
                                </div>
                                <div>
                                    <label style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Admission / SR No</label>
                                    <div style={{ fontWeight: 900, fontSize: '1.1rem', color: '#2563eb' }}>{studentData.student.admissionNo}</div>
                                </div>
                                <div>
                                    <label style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Current Class</label>
                                    <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#1e293b' }}>{studentData.student.className}</div>
                                </div>
                                <div>
                                    <label style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Status</label>
                                    <div>
                                        <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '0.25rem 0.65rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800 }}>
                                            Active
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Step 2.5: Parent Fee Summary Dashboard */}
                        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '1.75rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px -2px rgba(0,0,0,0.06)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                <div>
                                    <h3 style={{ color: '#0f172a', fontSize: '1.15rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        📊 Parent Fee Summary Dashboard
                                    </h3>
                                    <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '2px 0 0 0' }}>
                                        Complete Fee Summary & Status for {studentData.student.studentName} ({studentData.student.className})
                                    </p>
                                </div>
                                <span style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', padding: '0.3rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, border: '1px solid #bfdbfe' }}>
                                    Academic Session: {studentData.student.academicYear || '2026-2027'}
                                </span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                {/* Card 1: Total Fee Expected */}
                                <div style={{ backgroundColor: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '14px', padding: '1.15rem', position: 'relative', overflow: 'hidden' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Fee (Annual)</div>
                                            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', marginTop: '0.25rem' }}>
                                                ₹{(studentData.summary?.totalExpected || 0).toLocaleString('en-IN')}
                                            </div>
                                        </div>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155', fontWeight: 800 }}>
                                            📖
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.5rem', fontWeight: 600 }}>
                                        Full Session Fee (12 Mos + Annual)
                                    </div>
                                </div>

                                {/* Card 2: Total Paid Till Date */}
                                <div style={{ backgroundColor: '#ecfdf5', border: '1.5px solid #a7f3d0', borderRadius: '14px', padding: '1.15rem', position: 'relative', overflow: 'hidden' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#047857', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Fee Paid</div>
                                            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#065f46', marginTop: '0.25rem' }}>
                                                ₹{(studentData.summary?.totalPaid || 0).toLocaleString('en-IN')}
                                            </div>
                                        </div>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#047857', fontWeight: 800 }}>
                                            ✓
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: '#047857', marginTop: '0.5rem', fontWeight: 600 }}>
                                        Submitted Amount Till Date
                                    </div>
                                </div>

                                {/* Card 3: Net Outstanding Dues Till Current Month */}
                                <div style={{ backgroundColor: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: '14px', padding: '1.15rem', position: 'relative', overflow: 'hidden' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#b91c1c', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dues (Till {new Date().toLocaleString('en-US', { month: 'short' })})</div>
                                            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#991b1b', marginTop: '0.25rem' }}>
                                                ₹{(studentData.summary?.totalPending || 0).toLocaleString('en-IN')}
                                            </div>
                                        </div>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b91c1c', fontWeight: 800 }}>
                                            ⚠️
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: '#b91c1c', marginTop: '0.5rem', fontWeight: 600 }}>
                                        {(studentData.summary?.totalPending || 0) <= 0 ? 'Up To Date Cleared ✓' : `Dues Pending Up To ${new Date().toLocaleString('en-US', { month: 'long' })}`}
                                    </div>
                                </div>

                                {/* Card 4: Session Remaining Balance */}
                                <div style={{ backgroundColor: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: '14px', padding: '1.15rem', position: 'relative', overflow: 'hidden' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Session Balance</div>
                                            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#1e40af', marginTop: '0.25rem' }}>
                                                ₹{Math.max(0, (studentData.summary?.totalExpected || 0) - (studentData.summary?.totalPaid || 0)).toLocaleString('en-IN')}
                                            </div>
                                        </div>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1d4ed8', fontWeight: 800 }}>
                                            💳
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: '#1d4ed8', marginTop: '0.5rem', fontWeight: 600 }}>
                                        Remaining Fee For Full Year
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Step 3: Fee Collection Tracker & Structure Card */}
                        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '1.75rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                                <h3 style={{ color: '#1e293b', fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
                                    3. Fee Collection Tracker & Structure
                                </h3>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button 
                                        type="button"
                                        onClick={handleSelectAllUnpaid}
                                        style={{ padding: '0.45rem 0.85rem', fontSize: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer', fontWeight: 700, color: '#2563eb' }}
                                    >
                                        Select All Unpaid
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={handleDeselectAll}
                                        style={{ padding: '0.45rem 0.85rem', fontSize: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontWeight: 700, color: '#64748b' }}
                                    >
                                        Deselect All
                                    </button>
                                </div>
                            </div>

                            {/* Previous Session Dues Alert Banner */}
                            {studentData.summary?.previousDuePending > 0 && (
                                <div style={{ backgroundColor: '#fffbe7', border: '1.5px solid #fde047', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <AlertCircle size={22} style={{ color: '#b45309', flexShrink: 0 }} />
                                        <div>
                                            <div style={{ fontWeight: 800, color: '#78350f', fontSize: '0.95rem' }}>Previous Session Dues Outstanding</div>
                                            <div style={{ fontSize: '0.8rem', color: '#92400e' }}>Pending dues of ₹{studentData.summary.previousDuePending.toLocaleString('en-IN')} from previous academic session.</div>
                                        </div>
                                    </div>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', backgroundColor: '#fef3c7', padding: '0.5rem 0.85rem', borderRadius: '8px', border: '1px solid #fde68a', fontWeight: 700, fontSize: '0.85rem', color: '#92400e' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={includePrevDues} 
                                            onChange={e => setIncludePrevDues(e.target.checked)} 
                                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                        />
                                        Include Previous Dues (₹{studentData.summary.previousDuePending.toLocaleString('en-IN')})
                                    </label>
                                </div>
                            )}

                            {/* Monthly Payment Status Grid (Session 2026-27) */}
                            <div style={{ marginBottom: '2rem', background: '#f8fafc', padding: '1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                                <p style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Calendar size={15} /> MONTHLY PAYMENT STATUS (SESSION {studentData.student.academicYear || '2026-27'})
                                </p>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(68px, 1fr))', gap: '0.5rem' }}>
                                    {allMonths.map(m => {
                                        const paid = isMonthPaid(m);
                                        const isSelected = selectedMonths.includes(m);
                                        const mObj = (studentData.monthlyDues || []).find((x: any) => x.month === m);
                                        const isPartiallyPaid = !paid && mObj && mObj.paid > 0 && mObj.pending > 0;
                                        
                                        return (
                                            <div 
                                                key={m} 
                                                onClick={() => handleMonthClick(m)}
                                                style={{ 
                                                    textAlign: 'center', 
                                                    padding: '0.6rem 0.25rem', 
                                                    borderRadius: '10px', 
                                                    background: isSelected ? '#4f46e5' : paid ? '#dcfce7' : isPartiallyPaid ? '#fef3c7' : '#fef2f2',
                                                    border: `1.5px solid ${isSelected ? '#4f46e5' : paid ? '#16653440' : isPartiallyPaid ? '#f59e0b' : '#ef4444'}`,
                                                    cursor: paid ? 'default' : 'pointer',
                                                    transition: '0.2s',
                                                    boxShadow: isSelected ? '0 4px 8px rgba(79, 70, 229, 0.3)' : 'none'
                                                }}
                                            >
                                                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: isSelected ? 'white' : paid ? '#166534' : isPartiallyPaid ? '#92400e' : '#b91c1c' }}>
                                                    {m.substring(0, 3)}
                                                </div>
                                                <div style={{ marginTop: '0.3rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                                    {paid ? (
                                                        <Check size={14} strokeWidth={3} color={isSelected ? 'white' : '#166534'} />
                                                    ) : isPartiallyPaid ? (
                                                        <span style={{ fontSize: '0.6rem', fontWeight: 800, color: isSelected ? 'white' : '#b45309' }}>
                                                            Partial
                                                        </span>
                                                    ) : (
                                                        <span style={{ fontSize: '0.6rem', fontWeight: 900, color: isSelected ? 'white' : '#dc2626', textTransform: 'uppercase' }}>
                                                            DUE
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            const unpaid = allMonths.filter(m => !isMonthPaid(m));
                                            setSelectedMonths(unpaid);
                                        }}
                                        style={{ padding: '0.4rem 1rem', fontSize: '0.75rem', borderRadius: '8px', backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', color: '#475569', fontWeight: '700', cursor: 'pointer' }}
                                    >
                                        Select All Unpaid (Full Year)
                                    </button>
                                </div>
                            </div>

                            {/* Monthly Fees Breakdown */}
                            <div style={{ marginBottom: '2rem' }}>
                                
                                {/* Left Column: Monthly Fees for selected month(s) */}
                                <div>
                                    <p style={{ fontSize: '0.85rem', fontWeight: 800, color: '#4f46e5', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4f46e5' }} /> 
                                        Monthly Fees ({selectedMonths.length > 0 ? (selectedMonths.length > 1 ? `${selectedMonths[0]} to ${selectedMonths[selectedMonths.length-1]}` : selectedMonths[0]) : 'None Selected'})
                                    </p>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                                        {selectedMonths.length === 0 ? (
                                            <div style={{ padding: '1rem', backgroundColor: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '10px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic' }}>
                                                Select month(s) above to view monthly tuition breakdown
                                            </div>
                                        ) : (
                                            (() => {
                                                const currentStudent = studentData.student;
                                                const headMap = new Map<string, {
                                                    name: string;
                                                    amount: number;
                                                    isPaid: boolean;
                                                    isExempt: boolean;
                                                    unpaidMonthsCount: number;
                                                    isThirdChildExempt: boolean;
                                                    isRteExempt: boolean;
                                                    headNamesList: string[];
                                                }>();

                                                (studentData.monthlyDues || [])
                                                    .filter((m: any) => selectedMonths.includes(m.month))
                                                    .forEach((m: any) => {
                                                        (m.heads || []).forEach((h: any) => {
                                                            const isThirdChildExempt = Boolean(currentStudent.isThirdChild && h.name.toLowerCase().includes('tuition'));
                                                            const isRteExempt = Boolean(currentStudent.isRT);
                                                            const isExempt = isThirdChildExempt || isRteExempt;
                                                            
                                                            const key = h.name;
                                                            const existing = headMap.get(key) || {
                                                                name: h.name,
                                                                amount: 0,
                                                                isPaid: true,
                                                                isExempt,
                                                                unpaidMonthsCount: 0,
                                                                isThirdChildExempt,
                                                                isRteExempt,
                                                                headNamesList: []
                                                            };

                                                            const hPending = isExempt ? 0 : (h.pending !== undefined ? h.pending : Math.max(0, (h.expected || 0) - (h.paid || 0)));
                                                            existing.amount += hPending;
                                                            if (hPending > 0) {
                                                                existing.isPaid = false;
                                                                existing.unpaidMonthsCount += 1;
                                                            }

                                                            headMap.set(key, existing);
                                                        });
                                                    });

                                                // Process transport fee if assigned
                                                if (currentStudent.transportStop && includeTransport) {
                                                    let trPendingTotal = 0;
                                                    let trUnpaidCount = 0;
                                                    const busFare = currentStudent.transportStop.busFare || 0;
                                                    const stopName = currentStudent.transportStop.name || 'Bus';

                                                    const targetTransportMonths = isTransportYearly ? allMonths : selectedMonths;

                                                    targetTransportMonths.forEach((mName: string) => {
                                                        const mObj = (studentData.monthlyDues || []).find((x: any) => x.month === mName);
                                                        const trHead = (mObj?.heads || []).find((h: any) => h.name.toLowerCase().includes('transport') || h.name.toLowerCase().includes('bus'));
                                                        const p = trHead ? (trHead.pending !== undefined ? trHead.pending : Math.max(0, (trHead.expected || 0) - (trHead.paid || 0))) : busFare;
                                                        if (p > 0) {
                                                            trPendingTotal += p;
                                                            trUnpaidCount += 1;
                                                        }
                                                    });

                                                    headMap.set('Transport Fee', {
                                                        name: `Transport Fee (${stopName})${isTransportYearly ? ' (Yearly)' : ''}`,
                                                        amount: trPendingTotal,
                                                        isPaid: trUnpaidCount === 0,
                                                        isExempt: false,
                                                        unpaidMonthsCount: trUnpaidCount,
                                                        isThirdChildExempt: false,
                                                        isRteExempt: false,
                                                        headNamesList: []
                                                    });
                                                }

                                                return Array.from(headMap.values()).map(item => {
                                                    const isHeadDeselected = deselectedMonthlyHeads.includes(item.name) || (item.name.startsWith('Transport Fee') && deselectedMonthlyHeads.includes('Transport Fee'));
                                                    const isSelected = !item.isPaid && !isHeadDeselected;

                                                    return (
                                                        <div 
                                                            key={item.name}
                                                            onClick={item.isPaid ? undefined : () => {
                                                                const rawName = item.name.startsWith('Transport Fee') ? 'Transport Fee' : item.name;
                                                                toggleMonthlyHead(rawName);
                                                            }}
                                                            style={{ 
                                                                display: 'flex', 
                                                                justifyContent: 'space-between', 
                                                                alignItems: 'center', 
                                                                padding: '0.85rem 1rem', 
                                                                borderRadius: '12px', 
                                                                background: item.isPaid ? '#f0fdf4' : isSelected ? '#eff6ff' : 'white',
                                                                border: `1px solid ${item.isPaid ? '#bbf7d0' : isSelected ? '#bfdbfe' : '#e2e8f0'}`,
                                                                cursor: item.isPaid ? 'default' : 'pointer',
                                                                transition: '0.2s'
                                                            }}
                                                        >
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                                {item.isPaid ? (
                                                                    <Check size={18} color="#166534" strokeWidth={3} />
                                                                ) : (
                                                                    <input 
                                                                        type="checkbox" 
                                                                        checked={isSelected} 
                                                                        onChange={(e) => {
                                                                            e.stopPropagation();
                                                                            const rawName = item.name.startsWith('Transport Fee') ? 'Transport Fee' : item.name;
                                                                            toggleMonthlyHead(rawName);
                                                                        }} 
                                                                        style={{ width: '18px', height: '18px', cursor: 'pointer' }} 
                                                                    />
                                                                )}
                                                                <span style={{ fontWeight: 600, color: item.isPaid ? '#166534' : (isSelected ? '#1e293b' : '#94a3b8'), fontSize: '0.9rem' }}>
                                                                    {item.name}
                                                                    {item.isThirdChildExempt && (
                                                                        <span style={{ marginLeft: '0.5rem', fontSize: '0.65rem', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                                                                            Third Child Exempt
                                                                        </span>
                                                                    )}
                                                                    {item.isRteExempt && (
                                                                        <span style={{ marginLeft: '0.5rem', fontSize: '0.65rem', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                                                                            RTE Exempt
                                                                        </span>
                                                                    )}
                                                                </span>
                                                            </div>
                                                            <div style={{ textAlign: 'right' }}>
                                                                <div style={{ fontWeight: 900, color: item.isPaid ? '#166534' : '#dc2626', fontSize: '0.95rem' }}>
                                                                    ₹{item.isExempt ? '0' : item.amount.toLocaleString('en-IN')}
                                                                </div>
                                                                {item.isThirdChildExempt ? (
                                                                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase' }}>THIRD CHILD EXEMPT</span>
                                                                ) : item.isRteExempt ? (
                                                                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase' }}>RTE EXEMPT</span>
                                                                ) : item.isPaid ? (
                                                                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase' }}>ALREADY PAID</span>
                                                                ) : (
                                                                    <span style={{ fontSize: '0.65rem', fontWeight: 900, backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', padding: '2px 8px', borderRadius: '6px', textTransform: 'uppercase', display: 'inline-block', marginTop: '3px' }}>
                                                                        {item.unpaidMonthsCount} Month(s) Remaining (UNPAID DUE)
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                });
                                            })()
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Step 3.5: Transport Section Card */}
                            {studentData.student.transportStop && (
                                <div style={{ backgroundColor: '#fdfcfe', border: '1px solid #f3e8ff', borderRadius: '14px', padding: '1.25rem 1.5rem', marginTop: '1.5rem', boxShadow: '0 2px 4px rgba(147, 51, 234, 0.04)' }}>
                                    {/* Top Toggle Bar */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <input 
                                                type="checkbox" 
                                                id="transport-toggle-public"
                                                checked={includeTransport} 
                                                onChange={e => setIncludeTransport(e.target.checked)} 
                                                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#7e22ce' }}
                                            />
                                            <label htmlFor="transport-toggle-public" style={{ fontWeight: 800, fontSize: '1.1rem', color: '#6b21a8', cursor: 'pointer' }}>
                                                Enable Transport Facility
                                            </label>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f5f3ff', padding: '0.35rem 0.75rem', borderRadius: '8px', border: '1px solid #ddd6fe' }}>
                                                <input 
                                                    type="checkbox" 
                                                    id="transport-yearly-public"
                                                    checked={isTransportYearly}
                                                    onChange={e => {
                                                        const checked = e.target.checked;
                                                        setIsTransportYearly(checked);
                                                        if (checked) {
                                                            const unpaidM = allMonths.filter(m => !isMonthPaid(m));
                                                            setSelectedMonths(unpaidM);
                                                        }
                                                    }}
                                                    style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#7e22ce' }}
                                                />
                                                <label htmlFor="transport-yearly-public" style={{ fontSize: '0.8rem', color: '#6b21a8', fontWeight: 700, cursor: 'pointer' }}>
                                                    Pay Yearly (12 Months)
                                                </label>
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: '#9333ea', fontWeight: 600 }}>
                                                Transport Fee will be added to the total amount
                                            </div>
                                        </div>
                                    </div>

                                    {/* Route Name & Transport Fee Fields */}
                                    {includeTransport && (
                                        <div style={{ marginBottom: '0.5rem' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: '1rem', alignItems: 'start' }}>
                                                <div>
                                                    <label style={{ display: 'block', textAlign: 'left', color: '#6d28d9', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
                                                        ROUTE NAME
                                                    </label>
                                                    <input 
                                                        type="text" 
                                                        value={studentData.student.transportStop.name || 'Assigned Stop'} 
                                                        readOnly
                                                        style={{ width: '100%', border: '1px solid #ddd6fe', borderRadius: '12px', background: '#f5f3ff', padding: '0.75rem 1rem', fontWeight: 700, color: '#1e293b', fontSize: '0.95rem', cursor: 'default' }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', textAlign: 'left', color: '#6d28d9', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
                                                        TRANSPORT FEE (₹)
                                                    </label>
                                                    <input 
                                                        type="text" 
                                                        value={studentData.student.transportStop.busFare || 0} 
                                                        readOnly
                                                        style={{ width: '100%', border: '1px solid #ddd6fe', borderRadius: '12px', background: '#f5f3ff', padding: '0.75rem 1rem', fontWeight: 900, color: '#4f46e5', fontSize: '1rem', cursor: 'default' }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Month-wise status tiles */}
                                            <div style={{ marginTop: '1.25rem', borderTop: '1px dashed #ddd6fe', paddingTop: '1rem' }}>
                                                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#6d28d9', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                    TRANSPORT PAYMENT STATUS (MONTH-WISE):
                                                </div>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                                    {allMonths.map(m => {
                                                        const mObj = (studentData.monthlyDues || []).find((x: any) => x.month === m);
                                                        const trHead = (mObj?.heads || []).find((h: any) => h.name.toLowerCase().includes('transport') || h.name.toLowerCase().includes('bus'));
                                                        const trPending = trHead ? (trHead.pending !== undefined ? trHead.pending : Math.max(0, (trHead.expected || 0) - (trHead.paid || 0))) : (studentData.student.transportStop?.busFare || 0);
                                                        const isPaid = trPending <= 0;

                                                        return (
                                                            <div 
                                                                key={m} 
                                                                style={{ 
                                                                    padding: '0.35rem 0.75rem', 
                                                                    borderRadius: '8px', 
                                                                    fontSize: '0.75rem', 
                                                                    fontWeight: 800, 
                                                                    textTransform: 'uppercase',
                                                                    border: `1px solid ${isPaid ? '#22c55e' : '#cbd5e1'}`,
                                                                    backgroundColor: isPaid ? '#dcfce7' : '#f1f5f9',
                                                                    color: isPaid ? '#15803d' : '#64748b',
                                                                    textAlign: 'center',
                                                                    minWidth: '46px',
                                                                    transition: 'all 0.2s'
                                                                }}
                                                            >
                                                                {m.substring(0, 3).toUpperCase()} {isPaid ? '✓' : ''}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                        </div>

                        {/* Step 4: Previous & Recent Collections Table */}
                        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '1.75rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                            <h3 style={{ color: '#1e293b', fontSize: '1.15rem', fontWeight: 800, marginBottom: '1.25rem' }}>
                                4. Previous & Recent Collections ({studentData.approvedReceipts?.length || 0})
                            </h3>
                            <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '0.8rem', position: 'sticky', top: 0, backgroundColor: '#f8fafc', zIndex: 1 }}>
                                            <th style={{ padding: '0.75rem' }}>Receipt</th>
                                            <th style={{ padding: '0.75rem' }}>Fee Head</th>
                                            <th style={{ padding: '0.75rem' }}>Amount</th>
                                            <th style={{ padding: '0.75rem' }}>Mode</th>
                                            <th style={{ padding: '0.75rem' }}>Date</th>
                                            <th style={{ padding: '0.75rem' }}>Status</th>
                                            <th style={{ padding: '0.75rem', textAlign: 'center' }}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {studentData.approvedReceipts && studentData.approvedReceipts.length > 0 ? (
                                            studentData.approvedReceipts.map((r: any) => (
                                                <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '0.75rem', color: '#2563eb', fontWeight: 800 }}>{r.receiptNo}</td>
                                                    <td style={{ padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>{r.feeHead} ({r.month})</td>
                                                    <td style={{ padding: '0.75rem', fontWeight: 800 }}>₹{r.amountPaid.toLocaleString()}</td>
                                                    <td style={{ padding: '0.75rem' }}>
                                                        <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.55rem', borderRadius: '6px', backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>
                                                            💳 Online (PayU)
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>{r.date}</td>
                                                    <td style={{ padding: '0.75rem' }}>
                                                        <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '0.2rem 0.5rem', backgroundColor: '#dcfce7', color: '#15803d', borderRadius: '12px' }}>
                                                            APPROVED
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                                        <button
                                                            onClick={() => generatePDFReceipt(r)}
                                                            style={{ padding: '0.35rem 0.75rem', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb', borderRadius: '6px', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                                                        >
                                                            <Download size={13} /> View / PDF
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                                                    No past approved online fee collections found for this student.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Step 5 & 6: Fee Summary & Payment Submission Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.75rem' }}>
                            
                            {/* Step 5: Fee Summary Card */}
                            <div style={{ backgroundColor: '#fff7ed', borderRadius: '16px', padding: '1.75rem', border: '1px solid #fed7aa', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                                <h3 style={{ color: '#c2410c', fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.25rem' }}>
                                    5. Fee Summary
                                </h3>
                                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '0.5rem' }}>
                                    Selected Fees:
                                </div>
                                
                                <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '1rem', border: '1px solid #ffedd5', minHeight: '110px', marginBottom: '1.25rem' }}>
                                    {calculateSelectedTotal() === 0 ? (
                                        <p style={{ color: '#94a3b8', fontStyle: 'italic', margin: 0, fontSize: '0.85rem', textAlign: 'center', padding: '1.5rem 0' }}>
                                            No fees selected. Click on fee heads/months above.
                                        </p>
                                    ) : (
                                        <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                            {includePrevDues && studentData.summary?.previousDuePending > 0 && (
                                                <li>Previous Session Dues: ₹{studentData.summary.previousDuePending.toLocaleString()}</li>
                                            )}
                                            {selectedOneTimeHeads.map(hName => {
                                                const ot = (studentData.oneTimeBreakdown || []).find((x: any) => x.name === hName);
                                                return ot && ot.pending > 0 ? (
                                                    <li key={hName}>{ot.name}: ₹{ot.pending.toLocaleString()}</li>
                                                ) : null;
                                            })}
                                            {selectedMonths.map(mName => {
                                                const mObj = (studentData.monthlyDues || []).find((x: any) => x.month === mName);
                                                if (!mObj) return null;

                                                const activeHeads = (mObj.heads || []).filter((h: any) => {
                                                    const isThirdChildExempt = studentData.student?.isThirdChild && h.name.toLowerCase().includes('tuition');
                                                    const isTransportHead = h.name.toLowerCase().includes('transport') || h.name.toLowerCase().includes('bus');
                                                    if (isTransportHead) return false;
                                                    if (deselectedMonthlyHeads.includes(h.name)) return false;

                                                    const headPending = h.pending !== undefined ? h.pending : Math.max(0, (h.expected || 0) - (h.paid || 0));
                                                    return !isThirdChildExempt && headPending > 0;
                                                });

                                                if (activeHeads.length === 0) return null;

                                                return (
                                                    <li key={mName}>
                                                        <strong>{mName} Dues:</strong> {activeHeads.map((h: any) => `${h.name} (₹${(h.pending !== undefined ? h.pending : Math.max(0, (h.expected || 0) - (h.paid || 0))).toLocaleString()})`).join(', ')}
                                                    </li>
                                                );
                                            })}

                                            {includeTransport && studentData.student?.transportStop && !deselectedMonthlyHeads.includes('Transport Fee') && (() => {
                                                const busFare = studentData.student.transportStop.busFare || 0;
                                                const targetTransportMonths = isTransportYearly ? allMonths : selectedMonths;
                                                let trTotal = 0;
                                                let trCount = 0;

                                                targetTransportMonths.forEach((mName: string) => {
                                                    const mObj = (studentData.monthlyDues || []).find((x: any) => x.month === mName);
                                                    const trHead = (mObj?.heads || []).find((h: any) => h.name.toLowerCase().includes('transport') || h.name.toLowerCase().includes('bus'));
                                                    const trPending = trHead ? (trHead.pending !== undefined ? trHead.pending : Math.max(0, (trHead.expected || 0) - (trHead.paid || 0))) : busFare;
                                                    if (trPending > 0) {
                                                        trTotal += trPending;
                                                        trCount += 1;
                                                    }
                                                });

                                                if (trTotal <= 0) return null;

                                                return (
                                                    <li key="Transport Fee">
                                                        <strong>Transport Fee ({studentData.student.transportStop.name}):</strong> ₹{trTotal.toLocaleString()} ({trCount} Month{trCount > 1 ? 's' : ''})
                                                    </li>
                                                );
                                            })()}
                                        </ul>
                                    )}
                                </div>

                                <div style={{ borderTop: '1px dashed #fed7aa', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#475569', fontWeight: 600 }}>
                                        <span>Subtotal:</span>
                                        <span style={{ fontWeight: 800, color: '#1e293b' }}>₹{calculateSelectedTotal().toLocaleString('en-IN')}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#475569', fontWeight: 600 }}>
                                        <span>Discount / Concession:</span>
                                        <span style={{ fontWeight: 800, color: '#059669' }}>₹0 <span style={{ fontSize: '0.7rem', color: '#64748b' }}>(Read-Only)</span></span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.15rem', color: '#c2410c', fontWeight: 900, borderTop: '2px solid #fed7aa', paddingTop: '0.65rem', marginTop: '0.2rem' }}>
                                        <span>Net Payable Amount:</span>
                                        <span>₹{calculateSelectedTotal().toLocaleString('en-IN')}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Step 6: Payment & Submission Card */}
                            <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '1.75rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                                <h3 style={{ color: '#1e293b', fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.25rem' }}>
                                    6. Payment & Submission
                                </h3>

                                <div style={{ marginBottom: '1.25rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '0.4rem' }}>
                                        Amount being Paid (₹) <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>(Read Only - Auto-calculated from DB)</span>
                                    </label>
                                    <input 
                                        type="text" 
                                        value={`₹ ${calculateSelectedTotal().toLocaleString('en-IN')}`} 
                                        readOnly
                                        style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '2px solid #cbd5e1', fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', backgroundColor: '#f1f5f9', cursor: 'not-allowed' }}
                                    />
                                </div>

                                <div style={{ marginBottom: '1.25rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '0.4rem' }}>
                                        Discount / Concession (₹) <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>(Read Only - Locked)</span>
                                    </label>
                                    <input 
                                        type="text" 
                                        value="₹ 0" 
                                        readOnly
                                        style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '2px solid #cbd5e1', fontSize: '1.05rem', fontWeight: 800, color: '#059669', backgroundColor: '#f1f5f9', cursor: 'not-allowed' }}
                                    />
                                </div>

                                <div style={{ marginBottom: '1.25rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '0.4rem' }}>
                                        Payment Mode
                                    </label>
                                    <div style={{ padding: '0.75rem 1rem', backgroundColor: '#ecfdf5', border: '1.5px solid #a7f3d0', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#047857', fontWeight: 800, fontSize: '0.95rem' }}>
                                        <CreditCard size={20} /> PayU Gateway 💳 (Online Payment)
                                    </div>
                                </div>

                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '0.4rem' }}>
                                        Remark (Optional)
                                    </label>
                                    <input 
                                        type="text" 
                                        placeholder="Enter payment remark (e.g. Online fee submission)" 
                                        value={remark}
                                        onChange={e => setRemark(e.target.value)}
                                        style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                                    />
                                </div>

                                <button
                                    onClick={handlePayUCheckout}
                                    disabled={paymentProcessing || calculateSelectedTotal() <= 0}
                                    style={{ 
                                        width: '100%', 
                                        padding: '0.9rem', 
                                        backgroundColor: calculateSelectedTotal() > 0 ? '#059669' : '#94a3b8', 
                                        color: 'white', 
                                        border: 'none', 
                                        borderRadius: '10px', 
                                        fontWeight: 800, 
                                        fontSize: '1.05rem', 
                                        cursor: calculateSelectedTotal() > 0 ? 'pointer' : 'not-allowed',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.6rem',
                                        boxShadow: calculateSelectedTotal() > 0 ? '0 4px 14px rgba(5, 150, 105, 0.35)' : 'none',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {paymentProcessing ? <RefreshCw className="animate-spin" size={22} /> : <CreditCard size={22} />}
                                    Pay ₹{calculateSelectedTotal().toLocaleString()} Online via PayU
                                </button>
                            </div>

                        </div>

                    </div>
                )}

            </div>
        </div>
    );
};

export default PublicFeePayment;
