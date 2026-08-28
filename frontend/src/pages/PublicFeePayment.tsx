import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CreditCard, CheckCircle2, AlertCircle, Download, Calendar, Check, ShieldCheck, RefreshCw, Search, Tag, Sparkles, Wallet, X } from 'lucide-react';

export const PublicFeePayment: React.FC = () => {
    const [searchParams] = useSearchParams();
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const [studentData, setStudentData] = useState<any>(null);

    // Selected Fee Items state
    const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
    const [includePrevDues, setIncludePrevDues] = useState(false);
    const [remark, setRemark] = useState<string>('');
    const [paymentProcessing, setPaymentProcessing] = useState(false);
    const [showReceiptHistoryModal, setShowReceiptHistoryModal] = useState(false);

    // Modern In-App Warning & Previous Due Modal State
    const [dueWarningModal, setDueWarningModal] = useState<{
        show: boolean;
        title: string;
        message: string;
        amount?: number;
        breakdown?: { month: string; totalDue: number; heads: string[] }[];
    } | null>(null);

    const showDueWarning = (title: string, message: string, amount?: number, breakdown?: { month: string; totalDue: number; heads: string[] }[]) => {
        setDueWarningModal({ show: true, title, message, amount, breakdown });
    };

    // Success Modal state after PayU return
    const [paymentResult, setPaymentResult] = useState<{ status: string; receiptNo?: string; txnid?: string; amount?: number; feeHead?: string } | null>(null);
    const [showSuccessSlipModal, setShowSuccessSlipModal] = useState(false);

    const allMonths = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];

    const getCurrentAcademicMonthIndex = () => {
        const month = new Date().getMonth(); // 0 = Jan, 1 = Feb, ..., 3 = Apr, 7 = Aug, 11 = Dec
        if (month >= 3) {
            return month - 3;
        } else {
            return month + 9;
        }
    };

    const currentAcademicMonthIdx = getCurrentAcademicMonthIndex();
    const currentAcademicMonthName = allMonths[currentAcademicMonthIdx] || 'August';

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
            const resObj = {
                status: paymentStatus,
                receiptNo: receiptNo || undefined,
                txnid: txnid || undefined,
                amount: amount ? Number(amount) : undefined,
                feeHead: feeHead || undefined
            };
            setPaymentResult(resObj);
            if (paymentStatus.toLowerCase() === 'approved') {
                setShowSuccessSlipModal(true);
            }
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

            const curIdx = getCurrentAcademicMonthIndex();
            // Automatically select unpaid months up to current academic month
            const defaultMonths = allMonths.slice(0, curIdx + 1).filter(mName => {
                const mObj = (res.data.monthlyDues || []).find((x: any) => x.month === mName);
                return mObj && mObj.pending > 0;
            });

            setSelectedMonths(defaultMonths);
            setIncludePrevDues((res.data.summary?.previousDuePending || 0) > 0);
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

        // Add selected Monthly Dues (which already includes tuition + transport + monthly heads)
        (studentData.monthlyDues || []).forEach((m: any) => {
            if (selectedMonths.includes(m.month)) {
                total += (m.pending || 0);
            }
        });

        return total;
    };

    // Select month only if all previous months are paid
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
            // Check if there are unpaid previous months
            const unpaidEarlierDetails: { month: string; totalDue: number; heads: string[] }[] = [];
            let totalUnpaidEarlierAmount = 0;

            for (let i = 0; i < mIdx; i++) {
                const prevM = allMonths[i];
                if (!isMonthPaid(prevM)) {
                    const mObj = (studentData?.monthlyDues || []).find((x: any) => x.month === prevM);
                    const pendAmt = mObj?.pending || 0;
                    const dueHeads = (mObj?.heads || [])
                        .filter((h: any) => (h.pending !== undefined ? h.pending : Math.max(0, (h.expected || 0) - (h.paid || 0))) > 0)
                        .map((h: any) => {
                            const amt = h.pending !== undefined ? h.pending : Math.max(0, (h.expected || 0) - (h.paid || 0));
                            return `${h.name}: ₹${amt.toLocaleString('en-IN')}`;
                        });
                    
                    unpaidEarlierDetails.push({
                        month: prevM,
                        totalDue: pendAmt,
                        heads: dueHeads
                    });
                    totalUnpaidEarlierAmount += pendAmt;
                }
            }

            if (previousSessionDuePending > 0 && !includePrevDues) {
                showDueWarning(
                    'Outstanding Previous Session Due Pending',
                    `Student has an outstanding balance of ₹${previousSessionDuePending.toLocaleString('en-IN')} from the previous academic session.\n\nYou must clear previous session dues first before paying current month fees.`,
                    previousSessionDuePending
                );
                setIncludePrevDues(true);
                return;
            }

            if (unpaidEarlierDetails.length > 0) {
                showDueWarning(
                    'Month Disabled: Previous Fee Due',
                    `You cannot select or pay for ${mName} because previous month fee of ₹${totalUnpaidEarlierAmount.toLocaleString('en-IN')} is still unpaid.\n\nPlease pay previous month dues first.`,
                    totalUnpaidEarlierAmount,
                    unpaidEarlierDetails
                );
                // STRICTLY DO NOT SELECT DISABLED MONTH
                return;
            }

            // If no earlier unpaid months, add this month to selection
            setSelectedMonths([...selectedMonths, mName]);
        }
    };

    const handleSelectCurrentDuesOnly = () => {
        if (!studentData) return;
        const curIdx = getCurrentAcademicMonthIndex();
        const curDues = allMonths.slice(0, curIdx + 1).filter(m => {
            const mObj = (studentData.monthlyDues || []).find((x: any) => x.month === m);
            return mObj && mObj.pending > 0;
        });
        setSelectedMonths(curDues);
        setIncludePrevDues((studentData.summary?.previousDuePending || 0) > 0);
    };

    const handleSelectFullYearAdvance = () => {
        if (!studentData) return;
        const unpaidAll = allMonths.filter(m => {
            const mObj = (studentData.monthlyDues || []).find((x: any) => x.month === m);
            return mObj && mObj.pending > 0;
        });
        setSelectedMonths(unpaidAll);
        setIncludePrevDues((studentData.summary?.previousDuePending || 0) > 0);
    };

    const handleDeselectAll = () => {
        setSelectedMonths([]);
        setIncludePrevDues(false);
    };

    // Pay On-Time: selects ONLY the current academic month (not previous dues)
    const handlePayOnTime = () => {
        if (!studentData) return;
        const curIdx = getCurrentAcademicMonthIndex();
        const curMonthName = allMonths[curIdx];
        const mObj = (studentData.monthlyDues || []).find((x: any) => x.month === curMonthName);
        if (mObj && !mObj.isPaid) {
            setSelectedMonths([curMonthName]);
            setIncludePrevDues(false); // On-time means just this month
        }
    };

    const handlePayUCheckout = async () => {
        const finalAmount = calculateSelectedTotal();
        if (finalAmount <= 0) {
            showDueWarning('No Month Selected', 'Please select at least one unpaid month to proceed with fee payment.', 0);
            return;
        }

        if (previousSessionDuePending > 0 && !includePrevDues) {
            showDueWarning(
                'Previous Session Due Required',
                `Please include your Last Session Due of ₹${previousSessionDuePending.toLocaleString('en-IN')} before paying future months.`,
                previousSessionDuePending
            );
            setIncludePrevDues(true);
            return;
        }

        // Verify that no earlier unpaid months are skipped
        if (selectedMonths.length > 0) {
            const firstSelectedIdx = allMonths.indexOf(selectedMonths[0]);
            const unselectedEarlier: { month: string; totalDue: number; heads: string[] }[] = [];
            let totalUnpaidEarlier = 0;

            for (let i = 0; i < firstSelectedIdx; i++) {
                const m = allMonths[i];
                if (!isMonthPaid(m)) {
                    const mObj = (studentData?.monthlyDues || []).find((x: any) => x.month === m);
                    const pendAmt = mObj?.pending || 0;
                    const dueHeads = (mObj?.heads || [])
                        .filter((h: any) => (h.pending !== undefined ? h.pending : Math.max(0, (h.expected || 0) - (h.paid || 0))) > 0)
                        .map((h: any) => {
                            const amt = h.pending !== undefined ? h.pending : Math.max(0, (h.expected || 0) - (h.paid || 0));
                            return `${h.name}: ₹${amt.toLocaleString('en-IN')}`;
                        });
                    unselectedEarlier.push({
                        month: m,
                        totalDue: pendAmt,
                        heads: dueHeads
                    });
                    totalUnpaidEarlier += pendAmt;
                }
            }
            if (unselectedEarlier.length > 0) {
                showDueWarning(
                    'Previous Month Dues Must Be Paid First',
                    `You cannot skip earlier unpaid months. Please clear earlier month dues first.`,
                    totalUnpaidEarlier,
                    unselectedEarlier
                );
                return;
            }
        }

        setPaymentProcessing(true);

        try {
            const breakdownParts: string[] = [];

            if (includePrevDues && studentData.summary?.previousDuePending) {
                breakdownParts.push(`Previous Session Due: ${studentData.summary.previousDuePending}`);
            }

            selectedMonths.forEach(mName => {
                const mObj = (studentData.monthlyDues || []).find((x: any) => x.month === mName);
                if (mObj && mObj.pending > 0) {
                    const isAdv = allMonths.indexOf(mName) > currentAcademicMonthIdx;
                    const dueHeads = (mObj.heads || []).filter((h: any) => (h.pending !== undefined ? h.pending : Math.max(0, (h.expected || 0) - (h.paid || 0))) > 0);
                    if (dueHeads.length > 0) {
                        dueHeads.forEach((dh: any) => {
                            const pendAmt = dh.pending !== undefined ? dh.pending : Math.max(0, (dh.expected || 0) - (dh.paid || 0));
                            const headLabel = dh.name.toLowerCase().includes('transport') ? `Transport (${studentData.student?.transportStop?.name || 'Bus'})` : dh.name;
                            breakdownParts.push(`${mName}${isAdv ? ' (Advance)' : ''} ==> ${headLabel}: ${pendAmt}`);
                        });
                    } else {
                        breakdownParts.push(`${mName}${isAdv ? ' (Advance)' : ''} Total: ${mObj.pending}`);
                    }
                }
            });

            const feeHeadValue = selectedMonths.length > 0
                ? `${selectedMonths.join(', ')} ==> ${breakdownParts.join(' || ')}`
                : ` ==> ${breakdownParts.join(' || ')}`;

            const selectedMonthStr = selectedMonths.length > 0 ? selectedMonths.join(', ') : 'All';

            const payload = {
                studentId: studentData.student.id,
                amountPaid: finalAmount,
                totalFee: finalAmount,
                feeHead: feeHeadValue,
                month: selectedMonthStr,
                year: studentData.student.academicYear || '2026-2027',
                remark: remark || 'Parent Online PayU Fee Payment',
                customerName: studentData.student.studentName,
                customerEmail: 'parent@bips.local',
                customerPhone: studentData.student.fatherMobile !== 'N/A' ? studentData.student.fatherMobile : '9999999999',
                clientOrigin: window.location.origin,
                udf4: `PublicFeeOnline@@${window.location.origin}::${feeHeadValue}`
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

    // Calculate General / School Due vs Transport Due up to current academic month
    let currentGeneralElapsedDue = 0;
    let currentTransportElapsedDue = 0;

    if (studentData) {
        (studentData.monthlyDues || []).slice(0, currentAcademicMonthIdx + 1).forEach((m: any) => {
            (m.heads || []).forEach((h: any) => {
                const isTransport = h.name.toLowerCase().includes('transport') || h.name.toLowerCase().includes('bus');
                const pending = h.pending !== undefined ? h.pending : Math.max(0, (h.expected || 0) - (h.paid || 0));
                if (isTransport) {
                    currentTransportElapsedDue += pending;
                } else {
                    currentGeneralElapsedDue += pending;
                }
            });
        });
    }

    const previousSessionDuePending = studentData?.summary?.previousDuePending || 0;
    const totalCurrentOutstanding = previousSessionDuePending + currentGeneralElapsedDue + currentTransportElapsedDue;

    return (
        <div style={{ 
            height: '100vh', 
            maxHeight: '100vh', 
            display: 'flex', 
            flexDirection: 'column', 
            backgroundColor: '#0f172a', 
            fontFamily: 'Inter, -apple-system, sans-serif', 
            color: '#1e293b',
            overflow: 'hidden'
        }}>
            {/* Header Navigation Bar */}
            <header style={{ 
                backgroundColor: '#1e293b', 
                borderBottom: '1px solid #334155', 
                padding: '0.55rem 1.25rem', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                zIndex: 10
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '36px', height: '36px', backgroundColor: 'white', borderRadius: '8px', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                        <img 
                            src="/erp/bips-logo.png" 
                            alt="BIPS Logo" 
                            onError={(e: any) => { e.target.onerror = null; e.target.src = "/bips-logo.png"; }}
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                        />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: '#f8fafc', letterSpacing: '0.3px', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                            BIMLA INTERNATIONAL PUBLIC SCHOOL
                            <span style={{ fontSize: '0.68rem', backgroundColor: '#2563eb', color: 'white', padding: '0.12rem 0.45rem', borderRadius: '10px', fontWeight: 700 }}>PARENT PORTAL</span>
                        </h1>
                        <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: 0 }}>Direct Online Fee Payment & Advance Month Statement</p>
                    </div>
                </div>

                {/* Top Search Toolbar & Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#0f172a', border: '1.5px solid #3b82f6', borderRadius: '8px', overflow: 'hidden', height: '34px' }}>
                            <span style={{ backgroundColor: '#1e3a8a', padding: '0 0.55rem', color: '#93c5fd', fontSize: '0.72rem', fontWeight: 800, display: 'flex', alignItems: 'center', height: '100%' }}>
                                SR NO
                            </span>
                            <input 
                                type="text" 
                                placeholder="e.g. BIPS/26/1447" 
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                style={{ width: '170px', padding: '0 0.6rem', border: 'none', outline: 'none', background: 'transparent', color: 'white', fontSize: '0.82rem', fontWeight: 700 }}
                                required
                            />
                        </div>
                        <button 
                            type="submit" 
                            disabled={loading}
                            style={{ 
                                height: '34px', 
                                padding: '0 0.85rem', 
                                backgroundColor: '#2563eb', 
                                color: 'white', 
                                border: 'none', 
                                borderRadius: '8px', 
                                fontWeight: 800, 
                                fontSize: '0.78rem', 
                                cursor: loading ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                boxShadow: '0 2px 6px rgba(37, 99, 235, 0.3)'
                            }}
                        >
                            {loading ? <RefreshCw className="animate-spin" size={14} /> : <Search size={14} />}
                            Search
                        </button>
                    </form>

                    {studentData && (
                        <>
                            <button 
                                onClick={() => setShowReceiptHistoryModal(true)}
                                style={{ 
                                    height: '34px', 
                                    padding: '0 0.75rem', 
                                    backgroundColor: '#334155', 
                                    color: '#e2e8f0', 
                                    border: '1px solid #475569', 
                                    borderRadius: '8px', 
                                    fontWeight: 700, 
                                    fontSize: '0.75rem', 
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.35rem'
                                }}
                            >
                                <Download size={13} color="#38bdf8" /> Receipts ({studentData.approvedReceipts?.length || 0})
                            </button>
                            <button 
                                onClick={handleResetToHome}
                                style={{ 
                                    height: '34px', 
                                    padding: '0 0.75rem', 
                                    backgroundColor: '#1e293b', 
                                    color: '#94a3b8', 
                                    border: '1px solid #475569', 
                                    borderRadius: '8px', 
                                    fontWeight: 700, 
                                    fontSize: '0.75rem', 
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.3rem'
                                }}
                                title="Reset Search / Go to Home"
                            >
                                ✕ Reset
                            </button>
                        </>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', backgroundColor: '#064e3b', padding: '0.3rem 0.6rem', borderRadius: '8px', border: '1px solid #059669', fontSize: '0.72rem', color: '#6ee7b7', fontWeight: 700 }}>
                        <ShieldCheck size={14} /> PayU Safe
                    </div>
                </div>
            </header>

            {/* Error Message Toast */}
            {errorMsg && (
                <div style={{ backgroundColor: '#7f1d1d', color: '#fecaca', padding: '0.45rem 1.25rem', fontSize: '0.82rem', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <AlertCircle size={16} /> {errorMsg}
                    </div>
                    <button onClick={() => setErrorMsg('')} style={{ background: 'none', border: 'none', color: '#fecaca', cursor: 'pointer', fontWeight: 800 }}>✕</button>
                </div>
            )}

            {/* Payment Return Notification Banner */}
            {paymentResult && (
                <div style={{ 
                    backgroundColor: paymentResult.status === 'approved' ? '#064e3b' : '#7f1d1d', 
                    color: paymentResult.status === 'approved' ? '#a7f3d0' : '#fecaca', 
                    padding: '0.55rem 1.25rem', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    flexShrink: 0,
                    borderBottom: '1px solid rgba(255,255,255,0.1)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        {paymentResult.status === 'approved' ? <CheckCircle2 size={18} color="#34d399" /> : <AlertCircle size={18} color="#f87171" />}
                        <div>
                            <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>
                                {paymentResult.status === 'approved' ? 'Payment Approved Successfully!' : 'Online Payment Cancelled or Failed'}
                            </span>
                            <span style={{ marginLeft: '0.65rem', fontSize: '0.78rem', opacity: 0.9 }}>
                                {paymentResult.status === 'approved' 
                                    ? `Receipt No: ${paymentResult.receiptNo || 'RCP-ONLINE'} • Amount Paid: ₹${(paymentResult.amount || 0).toLocaleString('en-IN')}` 
                                    : 'Please retry using PayU or contact school accounts.'}
                            </span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {paymentResult.status === 'approved' && paymentResult.receiptNo && (
                            <button
                                onClick={() => generatePDFReceipt({ 
                                    receiptNo: paymentResult.receiptNo, 
                                    date: new Date().toLocaleDateString('en-GB'), 
                                    amountPaid: paymentResult.amount || calculateSelectedTotal(), 
                                    feeHead: paymentResult.feeHead || 'Online Fee Collection', 
                                    txnid: paymentResult.txnid 
                                }, studentData?.student)}
                                style={{ padding: '0.3rem 0.65rem', backgroundColor: '#059669', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                            >
                                <Download size={13} /> PDF Receipt
                            </button>
                        )}
                        <button onClick={() => setPaymentResult(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem' }}>✕</button>
                    </div>
                </div>
            )}

            {/* Pending Online Payment Alert Banner */}
            {studentData && studentData.pendingTransactions && studentData.pendingTransactions.length > 0 && (
                <div style={{
                    backgroundColor: '#fffbeb',
                    color: '#92400e',
                    borderBottom: '1px solid #fde68a',
                    padding: '0.5rem 1.25rem',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexShrink: 0
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <AlertCircle size={16} color="#d97706" />
                        <span>
                            <strong>Payment Submitted for Verification:</strong> You have {studentData.pendingTransactions.length} online payment of ₹{studentData.pendingTransactions.reduce((s: number, p: any) => s + (p.amount || 0), 0).toLocaleString('en-IN')} (Txn ID: {studentData.pendingTransactions.map((p: any) => p.txnid).join(', ')}) awaiting verification by School Accounts. Your fee balance and official receipt will be updated as soon as Admin approves it.
                        </span>
                    </div>
                </div>
            )}

            {/* 100vh Main Workspace */}
            <main style={{ 
                flex: 1, 
                backgroundColor: '#f8fafc', 
                display: 'flex', 
                overflow: 'hidden',
                padding: '0.75rem 1rem',
                gap: '0.85rem'
            }}>
                {!studentData ? (
                    /* Empty / Search Prompt State */
                    <div style={{ 
                        flex: 1, 
                        display: 'flex', 
                        flexDirection: 'column', 
                        justifyContent: 'center', 
                        alignItems: 'center', 
                        textAlign: 'center',
                        backgroundColor: 'white',
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0',
                        padding: '2rem'
                    }}>
                        <div style={{ width: '70px', height: '70px', borderRadius: '50%', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', marginBottom: '1.25rem' }}>
                            <CreditCard size={36} />
                        </div>
                        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
                            BIPS Parent Online Fee Portal
                        </h2>
                        <p style={{ color: '#64748b', fontSize: '0.95rem', maxWidth: '540px', margin: '0 0 1.5rem 0', lineHeight: '1.5' }}>
                            Enter the student's <strong>Admission Number (SR No)</strong> above to inspect previous dues, current month fee with transport, advance month payment options, and official discount chips.
                        </p>
                        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem', width: '100%', maxWidth: '420px' }}>
                            <input 
                                type="text" 
                                placeholder="Enter Admission No (e.g. BIPS/26/1447)" 
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: '10px', border: '2px solid #cbd5e1', outline: 'none', fontSize: '0.95rem', fontWeight: 700 }}
                                required
                            />
                            <button 
                                type="submit" 
                                disabled={loading}
                                style={{ padding: '0.75rem 1.25rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                            >
                                {loading ? <RefreshCw className="animate-spin" size={18} /> : <Search size={18} />}
                                View Fees
                            </button>
                        </form>
                    </div>
                ) : (
                    /* Loaded Student 100vh 2-Column Dashboard */
                    <>
                        {/* LEFT COLUMN: Statistics Dashboard, Discount Chips, Statement, Transport Card (66% width) */}
                        <div style={{ 
                            flex: '1 1 66%', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: '0.65rem', 
                            height: '100%', 
                            overflowY: 'auto',
                            paddingRight: '0.25rem'
                        }}>
                            {/* Student Profile Ribbon & All-Over Discount Chips */}
                            <div style={{ 
                                backgroundColor: 'white', 
                                borderRadius: '12px', 
                                padding: '0.65rem 1rem', 
                                border: '1px solid #e2e8f0', 
                                boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexShrink: 0,
                                flexWrap: 'wrap',
                                gap: '0.5rem'
                            }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                                            {studentData.student.studentName}
                                        </h2>
                                        
                                        {/* ALL-OVER DISCOUNT & CONCESSION CHIPS */}
                                        {studentData.student.isThirdChild && (
                                            <span style={{ fontSize: '0.68rem', padding: '0.12rem 0.5rem', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: '12px', fontWeight: 800, border: '1px solid #fde68a', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                                <Sparkles size={11} color="#d97706" /> 3rd Child (Tuition Free • Only Computer & Bus Apply)
                                            </span>
                                        )}
                                        {studentData.student.isRT && (
                                            <span style={{ fontSize: '0.68rem', padding: '0.12rem 0.5rem', backgroundColor: '#f0fdf4', color: '#166534', borderRadius: '12px', fontWeight: 800, border: '1px solid #bbf7d0', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                                <Tag size={11} color="#16a34a" /> RTE 100% Exempt
                                            </span>
                                        )}
                                        {studentData.student.isOldStudent && (
                                            <span style={{ fontSize: '0.68rem', padding: '0.12rem 0.5rem', backgroundColor: '#e0f2fe', color: '#0369a1', borderRadius: '12px', fontWeight: 800, border: '1px solid #bae6fd' }}>
                                                Old Student
                                            </span>
                                        )}
                                        {studentData.student.transportStop && (
                                            <span style={{ fontSize: '0.68rem', padding: '0.12rem 0.5rem', backgroundColor: '#faf5ff', color: '#7e22ce', borderRadius: '12px', fontWeight: 800, border: '1px solid #e9d5ff' }}>
                                                🚌 {studentData.student.transportStop.name} (₹{studentData.student.transportStop.busFare}/mo)
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.2rem', fontSize: '0.78rem', color: '#64748b', flexWrap: 'wrap' }}>
                                        <span>SR No: <strong style={{ color: '#1e293b' }}>{studentData.student.admissionNo}</strong></span>
                                        <span>Class: <strong style={{ color: '#1e293b' }}>{studentData.student.className}</strong></span>
                                        <span>Father: <strong style={{ color: '#1e293b' }}>{studentData.student.fatherName}</strong></span>
                                        <span>Session: <strong style={{ color: '#2563eb' }}>{studentData.student.academicYear || '2026-2027'}</strong></span>
                                    </div>
                                </div>

                                {/* Current Due & Last Session Due Badges */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                    {previousSessionDuePending > 0 && (
                                        <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.55rem', backgroundColor: '#fffbe7', color: '#b45309', borderRadius: '8px', fontWeight: 800, border: '1px solid #fde047' }}>
                                            Last Session Due: ₹{previousSessionDuePending.toLocaleString('en-IN')}
                                        </span>
                                    )}
                                    <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.55rem', backgroundColor: totalCurrentOutstanding > 0 ? '#fef2f2' : '#f0fdf4', color: totalCurrentOutstanding > 0 ? '#dc2626' : '#16a34a', borderRadius: '8px', fontWeight: 800, border: `1px solid ${totalCurrentOutstanding > 0 ? '#fca5a5' : '#86efac'}` }}>
                                        {totalCurrentOutstanding > 0 ? `Total Net Due (${currentAcademicMonthName.substring(0, 3)}): ₹${totalCurrentOutstanding.toLocaleString('en-IN')}` : `Up To Date Clear (${currentAcademicMonthName.substring(0, 3)}) ✓`}
                                    </span>
                                </div>
                            </div>

                            {/* DISCOUNT SAVINGS BANNER — only shown for RTE / Third Child */}
                            {studentData.discountInfo && studentData.discountInfo.type !== 'None' && studentData.discountInfo.monthlyDiscount > 0 && (
                                <div style={{
                                    background: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)',
                                    borderRadius: '12px',
                                    padding: '0.65rem 1rem',
                                    border: '1.5px solid #059669',
                                    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.18)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    flexShrink: 0,
                                    flexWrap: 'wrap',
                                    gap: '0.5rem'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'rgba(52, 211, 153, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <span style={{ fontSize: '1.1rem' }}>🎓</span>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', fontWeight: 900, color: '#a7f3d0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                {studentData.discountInfo.type === 'RTE' ? 'RTE Government Scholarship — Fee Exemption Active' : '3rd Child Concession — Fee Exemption Active'}
                                            </div>
                                            <div style={{ fontSize: '0.82rem', color: '#d1fae5', marginTop: '0.15rem' }}>
                                                {studentData.discountInfo.description}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.55rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                        <div style={{ textAlign: 'center', backgroundColor: 'rgba(16, 185, 129, 0.2)', borderRadius: '10px', padding: '0.35rem 0.75rem', border: '1px solid rgba(52, 211, 153, 0.3)' }}>
                                            <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#6ee7b7', textTransform: 'uppercase' }}>Monthly Saving</div>
                                            <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#34d399' }}>
                                                ₹{studentData.discountInfo.monthlyDiscount.toLocaleString('en-IN')}<span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#a7f3d0' }}>/mo</span>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'center', backgroundColor: 'rgba(16, 185, 129, 0.2)', borderRadius: '10px', padding: '0.35rem 0.75rem', border: '1px solid rgba(52, 211, 153, 0.3)' }}>
                                            <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#6ee7b7', textTransform: 'uppercase' }}>Full Session Saving</div>
                                            <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#34d399' }}>
                                                ₹{studentData.discountInfo.sessionDiscount.toLocaleString('en-IN')}<span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#a7f3d0' }}>/yr</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}


                            <div style={{ 
                                display: 'grid', 
                                gridTemplateColumns: 'repeat(4, 1fr)', 
                                gap: '0.5rem',
                                flexShrink: 0
                            }}>
                                {/* Stat 1: Total Annual Fee */}
                                <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '0.65rem 0.85rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Annual Session Fee</div>
                                    <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', marginTop: '0.15rem' }}>
                                        ₹{(studentData.summary?.totalExpected || 0).toLocaleString('en-IN')}
                                    </div>
                                    <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '0.1rem' }}>12 Mos + Transport</div>
                                </div>

                                {/* Stat 2: Total Fee Paid Till Date */}
                                <div style={{ backgroundColor: '#f0fdf4', borderRadius: '10px', padding: '0.65rem 0.85rem', border: '1px solid #bbf7d0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase' }}>Total Fee Paid</div>
                                    <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#15803d', marginTop: '0.15rem' }}>
                                        ₹{(studentData.summary?.totalPaid || 0).toLocaleString('en-IN')}
                                    </div>
                                    <div style={{ fontSize: '0.65rem', color: '#166534', marginTop: '0.1rem' }}>Submitted Receipts</div>
                                </div>

                                {/* Stat 3: Current Net Outstanding (Split: General + Transport) */}
                                <div style={{ backgroundColor: '#fef2f2', borderRadius: '10px', padding: '0.65rem 0.85rem', border: '1px solid #fecaca', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#991b1b', textTransform: 'uppercase' }}>Current Net Due</div>
                                    <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#dc2626', marginTop: '0.15rem' }}>
                                        ₹{totalCurrentOutstanding.toLocaleString('en-IN')}
                                    </div>
                                    <div style={{ fontSize: '0.62rem', color: '#b91c1c', marginTop: '0.1rem', fontWeight: 700 }}>
                                        School: ₹{currentGeneralElapsedDue} | Bus: ₹{currentTransportElapsedDue}
                                    </div>
                                </div>

                                {/* Stat 4: Remaining Whole Year Session Balance */}
                                <div style={{ backgroundColor: '#eff6ff', borderRadius: '10px', padding: '0.65rem 0.85rem', border: '1px solid #bfdbfe', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#1e40af', textTransform: 'uppercase' }}>Full Session Balance</div>
                                    <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#2563eb', marginTop: '0.15rem' }}>
                                        ₹{Math.max(0, (studentData.summary?.totalExpected || 0) - (studentData.summary?.totalPaid || 0)).toLocaleString('en-IN')}
                                    </div>
                                    <div style={{ fontSize: '0.65rem', color: '#1d4ed8', marginTop: '0.1rem' }}>Advance / Full Year</div>
                                </div>
                            </div>

                            {/* DEDICATED TRANSPORT FACILITY & MONTHLY CALENDAR CARD */}
                            {studentData.student.transportStop && (
                                <div style={{ 
                                    backgroundColor: 'white', 
                                    borderRadius: '12px', 
                                    border: '1.5px solid #e9d5ff', 
                                    boxShadow: '0 2px 6px rgba(147, 51, 234, 0.04)',
                                    overflow: 'hidden',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    flexShrink: 0
                                }}>
                                    {/* Transport Header & Summary Bar */}
                                    <div style={{ padding: '0.55rem 0.85rem', backgroundColor: '#faf5ff', borderBottom: '1px solid #f3e8ff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span style={{ fontSize: '1.1rem' }}>🚌</span>
                                            <div>
                                                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#6b21a8' }}>
                                                    Transport Stop: {studentData.student.transportStop.name}
                                                </div>
                                                <div style={{ fontSize: '0.68rem', color: '#7e22ce' }}>
                                                    Monthly Fare: <strong>₹{studentData.student.transportStop.busFare || 0}</strong> • Annual Total: <strong>₹{((studentData.student.transportStop.busFare || 0) * 12).toLocaleString('en-IN')}</strong> (12 Months)
                                                </div>
                                            </div>
                                        </div>

                                        {/* Transport Paid vs Due Stats */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            {(() => {
                                                const busFare = studentData.student.transportStop.busFare || 0;
                                                let trPaidTotal = 0;
                                                let trPendingTotal = 0;

                                                allMonths.forEach(mName => {
                                                    const mObj = (studentData.monthlyDues || []).find((x: any) => x.month === mName);
                                                    const trHead = (mObj?.heads || []).find((h: any) => h.name.toLowerCase().includes('transport') || h.name.toLowerCase().includes('bus'));
                                                    const trExpected = trHead ? (trHead.expected || 0) : busFare;
                                                    const trPaid = trHead ? (trHead.paid || 0) : 0;
                                                    const trPending = trHead ? (trHead.pending !== undefined ? trHead.pending : Math.max(0, trExpected - trPaid)) : busFare;
                                                    
                                                    trPaidTotal += trPaid;
                                                    trPendingTotal += trPending;
                                                });

                                                return (
                                                    <>
                                                        <span style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem', backgroundColor: '#dcfce7', color: '#15803d', borderRadius: '6px', fontWeight: 800, border: '1px solid #86efac' }}>
                                                            Transport Paid: ₹{trPaidTotal.toLocaleString('en-IN')}
                                                        </span>
                                                        <span style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem', backgroundColor: trPendingTotal > 0 ? '#fef2f2' : '#f0fdf4', color: trPendingTotal > 0 ? '#dc2626' : '#16a34a', borderRadius: '6px', fontWeight: 800, border: `1px solid ${trPendingTotal > 0 ? '#fca5a5' : '#86efac'}` }}>
                                                            Transport Due: ₹{trPendingTotal.toLocaleString('en-IN')}
                                                        </span>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </div>

                                    {/* 12-Month Transport Calendar Grid */}
                                    <div style={{ padding: '0.55rem 0.85rem' }}>
                                        <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#7e22ce', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem', display: 'flex', justifyContent: 'space-between' }}>
                                            <span>Monthly Transport Payment Calendar (April – March):</span>
                                            <span style={{ color: '#94a3b8', fontSize: '0.62rem', fontWeight: 600 }}>Included in Monthly Total</span>
                                        </div>
                                        
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '0.3rem' }}>
                                            {allMonths.map((mName, mIdx) => {
                                                const busFare = studentData.student.transportStop.busFare || 0;
                                                const mObj = (studentData.monthlyDues || []).find((x: any) => x.month === mName);
                                                const trHead = (mObj?.heads || []).find((h: any) => h.name.toLowerCase().includes('transport') || h.name.toLowerCase().includes('bus'));
                                                const trExpected = trHead ? (trHead.expected || 0) : busFare;
                                                const trPaid = trHead ? (trHead.paid || 0) : 0;
                                                const trPending = trHead ? (trHead.pending !== undefined ? trHead.pending : Math.max(0, trExpected - trPaid)) : busFare;
                                                const isTrPaid = trPending <= 0;
                                                const isSelected = selectedMonths.includes(mName);
                                                const isCurrent = mIdx === currentAcademicMonthIdx;

                                                return (
                                                    <div 
                                                        key={mName}
                                                        onClick={() => !isTrPaid && handleMonthClick(mName)}
                                                        style={{ 
                                                            textAlign: 'center', 
                                                            padding: '0.3rem 0.1rem', 
                                                            borderRadius: '6px',
                                                            border: `1px solid ${isTrPaid ? '#86efac' : isSelected ? '#3b82f6' : (isCurrent ? '#f59e0b' : '#e9d5ff')}`,
                                                            backgroundColor: isTrPaid ? '#f0fdf4' : isSelected ? '#eff6ff' : (isCurrent ? '#fffbeb' : '#faf5ff'),
                                                            cursor: isTrPaid ? 'default' : 'pointer',
                                                            transition: 'all 0.15s',
                                                            boxShadow: isSelected ? '0 2px 4px rgba(59, 130, 246, 0.15)' : 'none'
                                                        }}
                                                        title={`${mName} Transport: ${isTrPaid ? 'Paid' : `Due ₹${trPending}`}`}
                                                    >
                                                        <div style={{ fontSize: '0.62rem', fontWeight: 800, color: isTrPaid ? '#15803d' : isSelected ? '#1d4ed8' : '#6b21a8' }}>
                                                            {mName.substring(0, 3).toUpperCase()}
                                                        </div>
                                                        <div style={{ fontSize: '0.6rem', fontWeight: 900, color: isTrPaid ? '#16a34a' : '#9333ea', marginTop: '0.05rem' }}>
                                                            {isTrPaid ? '✓' : `₹${busFare}`}
                                                        </div>
                                                        <div style={{ fontSize: '0.55rem', fontWeight: 800, marginTop: '0.05rem', color: isTrPaid ? '#15803d' : isSelected ? '#2563eb' : '#dc2626' }}>
                                                            {isTrPaid ? 'Paid' : (isSelected ? 'Select' : 'Due')}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Monthly Breakdown Table (April to March) with Itemized School Fee vs Transport Fee */}
                            <div style={{ 
                                backgroundColor: 'white', 
                                borderRadius: '12px', 
                                border: '1px solid #e2e8f0', 
                                boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column'
                            }}>
                                <div style={{ padding: '0.55rem 0.85rem', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <Calendar size={15} color="#2563eb" />
                                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                            Monthly Fee Statement (School Fee + Transport Bus Itemized)
                                        </span>
                                    </div>

                                    {/* Quick Selection Presets */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                                        {/* Pay On-Time: just this month */}
                                        {(() => {
                                            const curIdx = getCurrentAcademicMonthIndex();
                                            const curMonthName = allMonths[curIdx];
                                            const mObj = (studentData.monthlyDues || []).find((x: any) => x.month === curMonthName);
                                            const isCurrentPaid = mObj?.isPaid;
                                            if (isCurrentPaid) return null;
                                            return (
                                                <button 
                                                    type="button"
                                                    onClick={handlePayOnTime}
                                                    style={{ padding: '0.25rem 0.65rem', fontSize: '0.7rem', borderRadius: '6px', border: '1.5px solid #059669', background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)', cursor: 'pointer', fontWeight: 800, color: '#065f46', display: 'flex', alignItems: 'center', gap: '0.25rem', boxShadow: '0 1px 4px rgba(5,150,105,0.15)' }}
                                                    title={`Pay only ${curMonthName} — On Time, no previous dues selected`}
                                                >
                                                    ✓ Pay {curMonthName.substring(0, 3)} On-Time
                                                </button>
                                            );
                                        })()}
                                        <button 
                                            type="button"
                                            onClick={handleSelectCurrentDuesOnly}
                                            style={{ padding: '0.25rem 0.55rem', fontSize: '0.7rem', borderRadius: '6px', border: '1px solid #fecaca', background: '#fef2f2', cursor: 'pointer', fontWeight: 800, color: '#dc2626' }}
                                            title={`Select all due months up to ${currentAcademicMonthName}`}
                                        >
                                            Current Dues Only ({currentAcademicMonthName.substring(0, 3)})
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={handleSelectFullYearAdvance}
                                            style={{ padding: '0.25rem 0.55rem', fontSize: '0.7rem', borderRadius: '6px', border: '1px solid #bfdbfe', background: '#eff6ff', cursor: 'pointer', fontWeight: 800, color: '#1d4ed8' }}
                                            title="Select all unpaid months including advance months up to March"
                                        >
                                            ⚡ Pay Full Year / Advance
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={handleDeselectAll}
                                            style={{ padding: '0.25rem 0.55rem', fontSize: '0.7rem', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontWeight: 700, color: '#64748b' }}
                                        >
                                            Clear
                                        </button>
                                    </div>

                                </div>

                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
                                        <thead>
                                            <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1', color: '#475569', fontWeight: 800, fontSize: '0.72rem' }}>
                                                <th style={{ padding: '0.5rem 0.65rem', width: '38px', textAlign: 'center' }}>Pay</th>
                                                <th style={{ padding: '0.5rem 0.65rem' }}>Month</th>
                                                <th style={{ padding: '0.5rem 0.65rem', textAlign: 'right' }}>Total Expected (₹)</th>
                                                <th style={{ padding: '0.5rem 0.65rem', textAlign: 'right' }}>School Fee (Due)</th>
                                                <th style={{ padding: '0.5rem 0.65rem', textAlign: 'right' }}>Transport Bus (Due)</th>
                                                <th style={{ padding: '0.5rem 0.65rem', textAlign: 'right' }}>Paid (₹)</th>
                                                <th style={{ padding: '0.5rem 0.65rem', textAlign: 'right', fontWeight: 900 }}>Total Month Due (₹)</th>
                                                <th style={{ padding: '0.5rem 0.65rem', textAlign: 'right', backgroundColor: '#fef2f2' }}>Carry Forward Due (₹)</th>
                                                <th style={{ padding: '0.5rem 0.65rem', textAlign: 'center' }}>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {/* Previous Session Dues Row (if any) */}
                                            {previousSessionDuePending > 0 && (
                                                <tr style={{ backgroundColor: '#fffbe7', borderBottom: '1px solid #fde047', fontWeight: 700 }}>
                                                    <td style={{ padding: '0.5rem 0.65rem', textAlign: 'center' }}>
                                                        <input 
                                                            type="checkbox" 
                                                            checked={includePrevDues}
                                                            onChange={e => setIncludePrevDues(e.target.checked)}
                                                            style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: '#d97706' }}
                                                        />
                                                    </td>
                                                    <td style={{ padding: '0.5rem 0.65rem', color: '#78350f', fontWeight: 800 }}>
                                                        Last Session Dues
                                                    </td>
                                                    <td style={{ padding: '0.5rem 0.65rem', textAlign: 'right', color: '#78350f' }}>
                                                        ₹{studentData.student?.previousSessionDue?.toLocaleString('en-IN') || previousSessionDuePending.toLocaleString('en-IN')}
                                                    </td>
                                                    <td style={{ padding: '0.5rem 0.65rem', textAlign: 'right', color: '#94a3b8' }}>
                                                        -
                                                    </td>
                                                    <td style={{ padding: '0.5rem 0.65rem', textAlign: 'right', color: '#94a3b8' }}>
                                                        -
                                                    </td>
                                                    <td style={{ padding: '0.5rem 0.65rem', textAlign: 'right', color: '#16a34a' }}>
                                                        ₹{Math.max(0, (studentData.student?.previousSessionDue || 0) - previousSessionDuePending).toLocaleString('en-IN')}
                                                    </td>
                                                    <td style={{ padding: '0.5rem 0.65rem', textAlign: 'right', color: '#b45309', fontWeight: 900 }}>
                                                        ₹{previousSessionDuePending.toLocaleString('en-IN')}
                                                    </td>
                                                    <td style={{ padding: '0.5rem 0.65rem', textAlign: 'right', color: '#b45309', fontWeight: 900, backgroundColor: '#fef3c7' }}>
                                                        ₹{previousSessionDuePending.toLocaleString('en-IN')}
                                                    </td>
                                                    <td style={{ padding: '0.5rem 0.65rem', textAlign: 'center' }}>
                                                        <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '0.15rem 0.45rem', borderRadius: '6px', backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
                                                            PREV DUE
                                                        </span>
                                                    </td>
                                                </tr>
                                            )}

                                            {(() => {
                                                let runningAccumulatedDue = (includePrevDues ? previousSessionDuePending : 0);

                                                return allMonths.map((mName, mIdx) => {
                                                    const mObj = (studentData.monthlyDues || []).find((x: any) => x.month === mName);
                                                    const isPaid = isMonthPaid(mName);
                                                    const isSelected = selectedMonths.includes(mName);

                                                    const expected = mObj?.expected || 0;
                                                    const paid = mObj?.paid || 0;
                                                    const pending = Math.max(0, expected - paid);

                                                    // Calculate individual heads (School/Computer vs Transport)
                                                    let genExpected = 0;
                                                    let genPaid = 0;
                                                    let genPending = 0;

                                                    let trExpected = 0;
                                                    let trPaid = 0;
                                                    let trPending = 0;

                                                    (mObj?.heads || []).forEach((h: any) => {
                                                        const isTr = h.name.toLowerCase().includes('transport') || h.name.toLowerCase().includes('bus');
                                                        const hExp = h.expected || 0;
                                                        const hPaid = h.paid || 0;
                                                        const hPend = h.pending !== undefined ? h.pending : Math.max(0, hExp - hPaid);

                                                        if (isTr) {
                                                            trExpected += hExp;
                                                            trPaid += hPaid;
                                                            trPending += hPend;
                                                        } else {
                                                            genExpected += hExp;
                                                            genPaid += hPaid;
                                                            genPending += hPend;
                                                        }
                                                    });

                                                    const isCurrentMonth = mIdx === currentAcademicMonthIdx;
                                                    const isAdvanceMonth = mIdx > currentAcademicMonthIdx;

                                                    const hasPriorUnpaid = allMonths.slice(0, mIdx).some(prevM => !isMonthPaid(prevM));
                                                    const isLocked = !isPaid && hasPriorUnpaid && !selectedMonths.includes(mName);

                                                    runningAccumulatedDue += pending;

                                                    return (
                                                        <tr 
                                                            key={mName} 
                                                            onClick={() => !isPaid && handleMonthClick(mName)}
                                                            style={{ 
                                                                borderBottom: '1px solid #f1f5f9',
                                                                backgroundColor: isSelected ? '#eff6ff' : isPaid ? '#ffffff' : (isCurrentMonth ? '#fffbeb' : '#ffffff'),
                                                                cursor: isPaid ? 'default' : (isLocked ? 'not-allowed' : 'pointer'),
                                                                opacity: isLocked ? 0.6 : 1,
                                                                transition: 'background 0.15s, opacity 0.2s'
                                                            }}
                                                            title={isLocked ? `🔒 Locked: Prior month dues must be cleared before paying ${mName}` : undefined}
                                                        >
                                                            <td style={{ padding: '0.45rem 0.65rem', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                                                                {isPaid ? (
                                                                    <Check size={15} color="#16a34a" strokeWidth={3} />
                                                                ) : (
                                                                    <input 
                                                                        type="checkbox" 
                                                                        checked={isSelected}
                                                                        disabled={isLocked}
                                                                        onChange={() => handleMonthClick(mName)}
                                                                        style={{ 
                                                                            width: '15px', 
                                                                            height: '15px', 
                                                                            cursor: isLocked ? 'not-allowed' : 'pointer', 
                                                                            accentColor: '#2563eb',
                                                                            opacity: isLocked ? 0.5 : 1
                                                                        }}
                                                                    />
                                                                )}
                                                            </td>
                                                            <td style={{ padding: '0.45rem 0.65rem', fontWeight: 800, color: isPaid ? '#166534' : isSelected ? '#1d4ed8' : (isLocked ? '#94a3b8' : '#0f172a') }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                                                    {mName}
                                                                    {isLocked && (
                                                                        <span style={{ fontSize: '0.62rem', backgroundColor: '#f1f5f9', color: '#94a3b8', padding: '0.08rem 0.35rem', borderRadius: '6px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                                                            🔒 Locked
                                                                        </span>
                                                                    )}
                                                                    {isCurrentMonth && (
                                                                        <span style={{ fontSize: '0.62rem', backgroundColor: '#dbeafe', color: '#1e40af', padding: '0.08rem 0.35rem', borderRadius: '6px', fontWeight: 800 }}>
                                                                            Current
                                                                        </span>
                                                                    )}
                                                                    {isAdvanceMonth && (
                                                                        <span style={{ fontSize: '0.62rem', backgroundColor: '#ede9fe', color: '#6d28d9', padding: '0.08rem 0.38rem', borderRadius: '6px', fontWeight: 800, border: '1px solid #c4b5fd', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                                                            ⚡ Advance
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td style={{ padding: '0.45rem 0.65rem', textAlign: 'right', fontWeight: 700, color: '#334155' }}>
                                                                ₹{expected.toLocaleString('en-IN')}
                                                            </td>
                                                            <td style={{ padding: '0.45rem 0.65rem', textAlign: 'right', color: genPending > 0 ? '#dc2626' : '#16a34a', fontWeight: 700, fontSize: '0.75rem' }}>
                                                                {genExpected > 0 ? (genPending > 0 ? `₹${genPending} Due` : '₹0 (Paid ✓)') : 'Exempt / ₹0'}
                                                            </td>
                                                            <td style={{ padding: '0.45rem 0.65rem', textAlign: 'right', color: trPending > 0 ? '#7e22ce' : '#16a34a', fontWeight: 700, fontSize: '0.75rem' }}>
                                                                {trExpected > 0 ? (trPending > 0 ? `₹${trPending} Due` : '₹0 (Paid ✓)') : '-'}
                                                            </td>
                                                            <td style={{ padding: '0.45rem 0.65rem', textAlign: 'right', fontWeight: 800, color: paid > 0 ? '#16a34a' : '#94a3b8' }}>
                                                                ₹{paid.toLocaleString('en-IN')}
                                                            </td>
                                                            <td style={{ padding: '0.45rem 0.65rem', textAlign: 'right', fontWeight: 900, color: pending > 0 ? '#dc2626' : '#16a34a' }}>
                                                                {pending > 0 ? `₹${pending.toLocaleString('en-IN')}` : '₹0'}
                                                            </td>
                                                            <td style={{ padding: '0.45rem 0.65rem', textAlign: 'right', fontWeight: 900, color: runningAccumulatedDue > 0 ? '#b91c1c' : '#166534', backgroundColor: '#fef2f2' }}>
                                                                ₹{runningAccumulatedDue.toLocaleString('en-IN')}
                                                            </td>
                                                            <td style={{ padding: '0.45rem 0.65rem', textAlign: 'center' }}>
                                                                <span style={{ 
                                                                    fontSize: '0.65rem', 
                                                                    fontWeight: 800, 
                                                                    padding: '0.15rem 0.45rem', 
                                                                    borderRadius: '6px',
                                                                    backgroundColor: isPaid ? '#dcfce7' : (isLocked ? '#f1f5f9' : paid > 0 ? '#fef3c7' : isAdvanceMonth ? '#ede9fe' : '#fee2e2'),
                                                                    color: isPaid ? '#15803d' : (isLocked ? '#64748b' : paid > 0 ? '#92400e' : isAdvanceMonth ? '#6d28d9' : '#b91c1c'),
                                                                    border: `1px solid ${isPaid ? '#86efac' : (isLocked ? '#e2e8f0' : paid > 0 ? '#fde047' : isAdvanceMonth ? '#c4b5fd' : '#fca5a5')}`,
                                                                    textTransform: 'uppercase'
                                                                }}>
                                                                    {isPaid ? 'Paid ✓' : (isLocked ? '🔒 Locked' : paid > 0 ? 'Partial' : isAdvanceMonth ? '⚡ Advance' : 'Due')}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                });
                                            })()}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Online Payment Panel (34% width, Sticky 100vh) */}
                        <div style={{ 
                            flex: '1 1 34%', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            height: '100%', 
                            backgroundColor: 'white', 
                            borderRadius: '14px', 
                            border: '1px solid #cbd5e1', 
                            boxShadow: '0 8px 20px -4px rgba(0, 0, 0, 0.08)',
                            overflow: 'hidden'
                        }}>
                            {/* Panel Header */}
                            <div style={{ padding: '0.65rem 1rem', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                                <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <Wallet size={17} color="#2563eb" /> Online Fee Checkout
                                </h3>
                                <span style={{ fontSize: '0.68rem', backgroundColor: '#dcfce7', color: '#166534', padding: '0.12rem 0.45rem', borderRadius: '8px', fontWeight: 800 }}>
                                    PayU Gateway
                                </span>
                            </div>

                            {/* Scrollable Itemized Breakdown Area */}
                            <div style={{ flex: 1, padding: '0.85rem 1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {/* Big Amount To Be Paid Gradient Banner */}
                                <div style={{ 
                                    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)', 
                                    borderRadius: '12px', 
                                    padding: '0.9rem 1rem', 
                                    color: 'white', 
                                    textAlign: 'center',
                                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.22)',
                                    flexShrink: 0
                                }}>
                                    <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#bfdbfe' }}>
                                        Net Online Payable Amount
                                    </div>
                                    <div style={{ fontSize: '1.9rem', fontWeight: 900, margin: '0.15rem 0' }}>
                                        ₹{calculateSelectedTotal().toLocaleString('en-IN')}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: '#e0f2fe' }}>
                                        {selectedMonths.length > 0 ? `${selectedMonths.length} Month(s) Selected (${selectedMonths[0]} to ${selectedMonths[selectedMonths.length - 1]})` : 'No months selected'}
                                    </div>
                                </div>

                                {/* Selected Items List */}
                                <div style={{ flex: 1, backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '0.65rem 0.75rem' }}>
                                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '0.45rem', display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Selected Fee Breakdown:</span>
                                        <span>Amount</span>
                                    </div>

                                    {calculateSelectedTotal() === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '1.5rem 0.5rem', color: '#94a3b8', fontSize: '0.78rem' }}>
                                            Select month(s) from table to calculate payable fee.
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.78rem' }}>
                                            {includePrevDues && previousSessionDuePending > 0 && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b45309', fontWeight: 700, backgroundColor: '#fffbe7', padding: '0.3rem 0.5rem', borderRadius: '6px' }}>
                                                    <span>Previous Session Due:</span>
                                                    <span>₹{previousSessionDuePending.toLocaleString('en-IN')}</span>
                                                </div>
                                            )}

                                            {selectedMonths.map(mName => {
                                                const mObj = (studentData.monthlyDues || []).find((x: any) => x.month === mName);
                                                const p = mObj?.pending || 0;
                                                const isAdv = allMonths.indexOf(mName) > currentAcademicMonthIdx;

                                                return (
                                                    <div key={mName} style={{ display: 'flex', justifyContent: 'space-between', color: '#334155', padding: '0.2rem 0.35rem' }}>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                            {mName} (School + Bus)
                                                            {isAdv && <span style={{ fontSize: '0.62rem', color: '#2563eb', fontWeight: 700 }}>(Advance)</span>}
                                                        </span>
                                                        <strong style={{ color: '#0f172a' }}>₹{p.toLocaleString('en-IN')}</strong>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Optional Remark */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: '0.2rem' }}>
                                        Parent Remarks / Reference Note (Optional)
                                    </label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. Paid by Father via UPI" 
                                        value={remark}
                                        onChange={e => setRemark(e.target.value)}
                                        style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.78rem' }}
                                    />
                                </div>
                            </div>

                            {/* Panel Footer: CTA Checkout Button */}
                            <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc', flexShrink: 0 }}>
                                <button 
                                    onClick={handlePayUCheckout}
                                    disabled={paymentProcessing || calculateSelectedTotal() <= 0}
                                    style={{ 
                                        width: '100%', 
                                        padding: '0.75rem', 
                                        backgroundColor: calculateSelectedTotal() > 0 ? '#16a34a' : '#94a3b8', 
                                        color: 'white', 
                                        border: 'none', 
                                        borderRadius: '10px', 
                                        fontWeight: 900, 
                                        fontSize: '0.95rem', 
                                        cursor: calculateSelectedTotal() > 0 && !paymentProcessing ? 'pointer' : 'not-allowed',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.45rem',
                                        boxShadow: calculateSelectedTotal() > 0 ? '0 4px 12px rgba(22, 163, 74, 0.35)' : 'none',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {paymentProcessing ? (
                                        <>
                                            <RefreshCw className="animate-spin" size={17} /> Connecting to PayU Gateway...
                                        </>
                                    ) : (
                                        <>
                                            <ShieldCheck size={18} /> Pay ₹{calculateSelectedTotal().toLocaleString('en-IN')} Online
                                        </>
                                    )}
                                </button>
                                <p style={{ margin: '0.35rem 0 0 0', textAlign: 'center', fontSize: '0.65rem', color: '#64748b' }}>
                                    🔒 256-Bit SSL Encrypted | Official Receipt Generated Instantly
                                </p>
                            </div>
                        </div>
                    </>
                )}
            </main>

            {/* Receipt History Modal */}
            {showReceiptHistoryModal && studentData && (
                <div 
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(15, 23, 42, 0.7)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 99999,
                        padding: '1rem'
                    }}
                    onClick={() => setShowReceiptHistoryModal(false)}
                >
                    <div 
                        style={{
                            backgroundColor: 'white',
                            borderRadius: '16px',
                            maxWidth: '900px',
                            width: '95vw',
                            maxHeight: '85vh',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
                            overflow: 'hidden'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                                    📄 Approved Fee Receipts: {studentData.student.studentName}
                                </h3>
                                <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                                    Admission No: <strong>{studentData.student.admissionNo}</strong> • Class: <strong>{studentData.student.className}</strong>
                                </p>
                            </div>
                            <button 
                                onClick={() => setShowReceiptHistoryModal(false)}
                                style={{ border: 'none', background: '#e2e8f0', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', fontWeight: 800 }}
                            >
                                ✕
                            </button>
                        </div>

                        <div style={{ padding: '1rem 1.25rem', overflowY: 'auto', flex: 1 }}>
                            {(!studentData.approvedReceipts || studentData.approvedReceipts.length === 0) ? (
                                <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🧾</div>
                                    <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748b' }}>No approved receipts found for this student.</p>
                                </div>
                            ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1', textAlign: 'left', color: '#475569', fontWeight: 800 }}>
                                            <th style={{ padding: '0.6rem' }}>Receipt No</th>
                                            <th style={{ padding: '0.6rem' }}>Date</th>
                                            <th style={{ padding: '0.6rem' }}>Fee Heads / Month</th>
                                            <th style={{ padding: '0.6rem', textAlign: 'right' }}>Amount Paid</th>
                                            <th style={{ padding: '0.6rem', textAlign: 'center' }}>Mode</th>
                                            <th style={{ padding: '0.6rem', textAlign: 'center' }}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {studentData.approvedReceipts.map((r: any) => (
                                            <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '0.6rem', fontWeight: 800, color: '#2563eb' }}>{r.receiptNo}</td>
                                                <td style={{ padding: '0.6rem', color: '#64748b' }}>{r.date}</td>
                                                <td style={{ padding: '0.6rem', color: '#1e293b' }}>{r.feeHead} ({r.month})</td>
                                                <td style={{ padding: '0.6rem', textAlign: 'right', fontWeight: 800, color: '#16a34a' }}>₹{r.amountPaid.toLocaleString('en-IN')}</td>
                                                <td style={{ padding: '0.6rem', textAlign: 'center' }}>
                                                    <span style={{ fontSize: '0.68rem', padding: '0.12rem 0.45rem', borderRadius: '6px', backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', fontWeight: 700 }}>
                                                        Online
                                                    </span>
                                                </td>
                                                <td style={{ padding: '0.6rem', textAlign: 'center' }}>
                                                    <button
                                                        onClick={() => generatePDFReceipt(r)}
                                                        style={{ padding: '0.25rem 0.6rem', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb', borderRadius: '6px', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                                                    >
                                                        <Download size={12} /> Download PDF
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Payment Successful Official Receipt Slip Modal */}
            {showSuccessSlipModal && paymentResult && paymentResult.status.toLowerCase() === 'approved' && (
                <div 
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(15, 23, 42, 0.75)',
                        backdropFilter: 'blur(5px)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 999999,
                        padding: '1rem'
                    }}
                    onClick={() => setShowSuccessSlipModal(false)}
                >
                    <div 
                        style={{
                            backgroundColor: 'white',
                            borderRadius: '16px',
                            maxWidth: '680px',
                            width: '100%',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
                            overflow: 'hidden',
                            border: '1.5px solid #86efac'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Slip Header */}
                        <div style={{ backgroundColor: '#f0fdf4', padding: '1.25rem 1.5rem', borderBottom: '2px solid #bbf7d0', textAlign: 'center', position: 'relative' }}>
                            <button 
                                onClick={() => setShowSuccessSlipModal(false)}
                                style={{ position: 'absolute', right: '1rem', top: '1rem', border: 'none', background: '#dcfce7', color: '#166534', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', fontWeight: 800, fontSize: '0.85rem' }}
                            >
                                ✕
                            </button>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#dcfce7', color: '#15803d', padding: '0.2rem 0.65rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800, border: '1px solid #86efac', marginBottom: '0.5rem' }}>
                                <CheckCircle2 size={14} color="#16a34a" /> PAYMENT SUCCESSFUL • OFFICIAL RECEIPT SLIP
                            </div>
                            <h2 style={{ margin: '0.2rem 0 0.1rem 0', fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>
                                BIMLA INTERNATIONAL PUBLIC SCHOOL
                            </h2>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
                                Makhdoompur Kaithi, Jaiti Khera, Sarojini Nagar, Lucknow
                            </p>
                        </div>

                        {/* Slip Content Body */}
                        <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {/* Receipt & Txn Ribbon */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', backgroundColor: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.8rem' }}>
                                <div>
                                    <span style={{ color: '#64748b' }}>Receipt No:</span> <strong style={{ color: '#2563eb' }}>{paymentResult.receiptNo || 'RCP-ONLINE'}</strong>
                                </div>
                                <div>
                                    <span style={{ color: '#64748b' }}>Date:</span> <strong>{new Date().toLocaleDateString('en-GB')}</strong>
                                </div>
                                <div>
                                    <span style={{ color: '#64748b' }}>Payment Mode:</span> <strong style={{ color: '#047857' }}>Online (PayU Gateway)</strong>
                                </div>
                                <div>
                                    <span style={{ color: '#64748b' }}>Txn ID:</span> <strong style={{ fontFamily: 'monospace', color: '#334155' }}>{paymentResult.txnid || '-'}</strong>
                                </div>
                            </div>

                            {/* Student Profile Particulars */}
                            {studentData && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.82rem', padding: '0.5rem 0', borderBottom: '1px solid #e2e8f0' }}>
                                    <div>Student Name: <strong style={{ color: '#0f172a' }}>{studentData.student.studentName}</strong></div>
                                    <div>Admission No: <strong style={{ color: '#0f172a' }}>{studentData.student.admissionNo}</strong></div>
                                    <div>Class & Section: <strong style={{ color: '#0f172a' }}>{studentData.student.className}</strong></div>
                                    <div>Father's Name: <strong style={{ color: '#0f172a' }}>{studentData.student.fatherName}</strong></div>
                                </div>
                            )}

                            {/* Fee Heads Breakdown */}
                            <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '0.85rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: '0.72rem', color: '#166534', fontWeight: 700, textTransform: 'uppercase' }}>Paid Particulars</div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#064e3b', marginTop: '0.15rem' }}>
                                        {paymentResult.feeHead || 'Online School & Bus Fee'}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.72rem', color: '#166534', fontWeight: 700, textTransform: 'uppercase' }}>Amount Paid</div>
                                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#15803d' }}>
                                        ₹{(paymentResult.amount || 0).toLocaleString('en-IN')}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Slip Footer Actions */}
                        <div style={{ padding: '0.85rem 1.5rem', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
                            <button 
                                onClick={() => setShowSuccessSlipModal(false)}
                                style={{ padding: '0.55rem 1rem', backgroundColor: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
                            >
                                ✕ Close & View Portal
                            </button>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button 
                                    onClick={() => generatePDFReceipt({ 
                                        receiptNo: paymentResult.receiptNo, 
                                        date: new Date().toLocaleDateString('en-GB'), 
                                        amountPaid: paymentResult.amount || 0, 
                                        feeHead: paymentResult.feeHead || 'Online Fee Collection', 
                                        txnid: paymentResult.txnid 
                                    }, studentData?.student)}
                                    style={{ padding: '0.55rem 1.1rem', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: '0 2px 6px rgba(22, 163, 74, 0.3)' }}
                                >
                                    <Download size={14} /> Download PDF Receipt
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modern In-App Due & Month Warning Modal */}
            {dueWarningModal && dueWarningModal.show && (
                <div 
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(15, 23, 42, 0.7)',
                        backdropFilter: 'blur(5px)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 100000,
                        padding: '1rem',
                        animation: 'fadeIn 0.2s ease-out'
                    }}
                    onClick={() => setDueWarningModal(null)}
                >
                    <div 
                        style={{
                            backgroundColor: '#ffffff',
                            borderRadius: '16px',
                            maxWidth: '540px',
                            width: '100%',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
                            overflow: 'hidden',
                            animation: 'modalSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{
                            padding: '1.25rem 1.5rem',
                            backgroundColor: '#fffbeb',
                            borderBottom: '1px solid #fde68a',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{
                                    width: '38px',
                                    height: '38px',
                                    borderRadius: '10px',
                                    backgroundColor: '#fef3c7',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#d97706',
                                    fontSize: '1.4rem'
                                }}>
                                    ⚠️
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#92400e' }}>
                                        {dueWarningModal.title}
                                    </h3>
                                    <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#b45309' }}>
                                        Sequential month payment rule
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setDueWarningModal(null)}
                                style={{
                                    border: 'none',
                                    background: '#fef3c7',
                                    color: '#78350f',
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '50%',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div style={{ padding: '1.5rem', maxHeight: '60vh', overflowY: 'auto' }}>
                            {dueWarningModal.amount !== undefined && dueWarningModal.amount > 0 && (
                                <div style={{
                                    backgroundColor: '#fef2f2',
                                    border: '1.5px solid #fecaca',
                                    borderRadius: '10px',
                                    padding: '0.85rem 1rem',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '1.25rem'
                                }}>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#991b1b', textTransform: 'uppercase' }}>
                                            Total Outstanding Dues
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#b91c1c', marginTop: '2px' }}>
                                            Must be settled chronologically
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#dc2626' }}>
                                        ₹{dueWarningModal.amount.toLocaleString('en-IN')}
                                    </div>
                                </div>
                            )}

                            <div style={{ whiteSpace: 'pre-line', color: '#334155', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: dueWarningModal.breakdown && dueWarningModal.breakdown.length > 0 ? '1rem' : 0 }}>
                                {dueWarningModal.message}
                            </div>

                            {dueWarningModal.breakdown && dueWarningModal.breakdown.length > 0 && (
                                <div style={{ marginTop: '1rem', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                                    <div style={{ backgroundColor: '#f8fafc', padding: '0.5rem 0.75rem', borderBottom: '1px solid #e2e8f0', fontWeight: 800, fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase' }}>
                                        Pending Month-wise Breakdown
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        {dueWarningModal.breakdown.map((item, idx) => (
                                            <div 
                                                key={item.month}
                                                style={{
                                                    padding: '0.65rem 0.85rem',
                                                    borderBottom: idx === (dueWarningModal.breakdown?.length || 0) - 1 ? 'none' : '1px solid #f1f5f9',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafafa'
                                                }}
                                            >
                                                <div>
                                                    <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#1e293b' }}>
                                                        {item.month}
                                                    </div>
                                                    {item.heads && item.heads.length > 0 && (
                                                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                                                            {item.heads.join(' • ')}
                                                        </div>
                                                    )}
                                                </div>
                                                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#dc2626' }}>
                                                    ₹{item.totalDue.toLocaleString('en-IN')}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div style={{ padding: '0.85rem 1.5rem', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                type="button"
                                onClick={() => setDueWarningModal(null)}
                                style={{
                                    backgroundColor: '#2563eb',
                                    color: 'white',
                                    border: 'none',
                                    padding: '0.55rem 1.4rem',
                                    borderRadius: '8px',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)'
                                }}
                            >
                                Understood
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PublicFeePayment;
