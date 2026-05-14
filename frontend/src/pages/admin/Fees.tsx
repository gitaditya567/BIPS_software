import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNotification } from '../../context/NotificationContext';
import { IndianRupee, TrendingUp, CalendarDays, Trash2, Check, AlertCircle, Calendar, Users } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
    approvalDate?: string;
    month?: string;
    year?: string;
    remark?: string;
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
    previousSessionDue?: number;
    isRT?: boolean;
    pendingMonths?: string[];
    admissionNo?: string;
    monthlyFeeAmount?: number;
    monthWisePaid?: Record<string, number>;
    fatherName?: string;
}

// Removed Concession interface

const CLASS_ORDER = [
    'Play', 'Nursery', 'Lower Kindergarten (LKG)', 'Upper Kindergarten (UKG)', 
    'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 
    'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 
    'Class 11 (Maths)', 'Class 11 (Bio)', 'Class 11 (Commerce)', 
    'Class 12 (Maths)', 'Class 12 (Bio)', 'Class 12 (Commerce)'
];

const sortClassNames = (a: string, b: string) => {
    let indexA = CLASS_ORDER.indexOf(a);
    let indexB = CLASS_ORDER.indexOf(b);
    if (indexA === -1) indexA = 999;
    if (indexB === -1) indexB = 999;
    if (indexA !== indexB) return indexA - indexB;
    return a.localeCompare(b);
};

const Fees: React.FC = () => {
    const { addNotification } = useNotification();
    const [user, setUser] = useState<{ id: string; role: string; name: string } | null>(null);
    const [activeTab, setActiveTab] = useState<'collection' | 'heads' | 'due' | 'structure' | 'reports' | 'approvals' | 'drafts' | 'previous_due'>('collection');
    const [activeReport, setActiveReport] = useState<'daily' | 'monthly' | 'class' | 'pending'>('daily');
    const [showReceipt, setShowReceipt] = useState(false);
    const [selectedReceipt, setSelectedReceipt] = useState<FeeRecord | null>(null);

    // Fee Records State
    const [feeRecords, setFeeRecords] = useState<FeeRecord[]>([]);
    const [studentHistory, setStudentHistory] = useState<FeeRecord[]>([]);
    const [pendingDues, setPendingDues] = useState<number>(0);
    const [feeHeads, setFeeHeads] = useState<FeeHead[]>([]);

    // State for Editing Fee Structure
    const [editingClassId, setEditingClassId] = useState<string | null>(null);

    const handleEditFeeStructure = (item: any) => {
        setEditingClassId(item.id);
        const form = document.getElementById('fee-structure-form') as HTMLFormElement;
        if (form) {
            const classSelect = form.querySelector('select[name="classId"]') as HTMLSelectElement;
            if (classSelect) classSelect.value = item.id;
            
            feeHeads.forEach(head => {
                const input = form.querySelector(`input[name="${head.name}"]`) as HTMLInputElement;
                if (input) input.value = (item.fees?.[head.name] || 0).toString();
            });
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Due Fees State
    const [dueFees, setDueFees] = useState<DueFee[]>([]);

    // Reports State
    const [reportData, setReportData] = useState<{ daily: any[], monthly: any[], classWise: any[] }>({
        daily: [],
        monthly: [],
        classWise: []
    });
    const [reportFilterMonth, setReportFilterMonth] = useState(new Date().toLocaleString('en-GB', { month: 'long' }));
    const [classReportFilter, setClassReportFilter] = useState('All');
    const [pendingClassFilter, setPendingClassFilter] = useState('All');
    const [prevDueClassFilter, setPrevDueClassFilter] = useState('All');
    const [dueClassFilter, setDueClassFilter] = useState('All');
    const [dueMonthFilter, setDueMonthFilter] = useState('All');
    const [selectedStudentForHistory, setSelectedStudentForHistory] = useState<any>(null);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [dueRtFilter, setDueRtFilter] = useState('All');
    const [dueView, setDueView] = useState<'general' | 'transport'>('general');
    const [transportDues, setTransportDues] = useState<any[]>([]);
    const [loadingTransportDues, setLoadingTransportDues] = useState(false);
    const [remark, setRemark] = useState('');

    /* Temporary Upload State - Disabled
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [uploadReport, setUploadReport] = useState<any>(null);
    */

    const fetchReports = async () => {
        try {
            const res = await axios.get('/erp-api/fees/reports');
            setReportData(res.data);
        } catch (err) {
            console.error("Failed to fetch reports");
        }
    };

    const handleDeleteReceipt = async (id: string, receiptNo: string) => {
        if (!window.confirm(`Are you sure you want to delete receipt ${receiptNo}? This action cannot be undone.`)) return;
        try {
            await axios.delete(`/erp-api/fees/${id}`);
            alert('Receipt deleted successfully!');
            fetchReports(); // Refresh collection data
            // Also refresh dueFees if needed
            const dueListRes = await axios.get('/erp-api/fees/due-list');
            setDueFees(dueListRes.data);
        } catch (err) {
            alert('Failed to delete receipt');
        }
    };

    /* Temporary Upload Handlers - Disabled
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setCsvFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!csvFile) return;
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target?.result as string;
            const lines = text.split('\n');
            const data = [];
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                const parts = line.split(',');
                if (parts.length >= 3) {
                    data.push({
                        studentName: parts[0].trim(),
                        fatherName: parts[1].trim(),
                        amount: parts[2].trim()
                    });
                }
            }
            
            try {
                const res = await axios.post('/erp-api/fees/import-previous-due', { data });
                setUploadReport(res.data.report);
                alert('Upload completed. Check report for details.');
                // Refresh due list
                const dueListRes = await axios.get('/erp-api/fees/due-list');
                setDueFees(dueListRes.data);
            } catch (error) {
                console.error(error);
                alert('Failed to upload data');
            }
        };
        reader.readAsText(csvFile);
    };
    */

    const exportToPDF = () => {
        const doc = new jsPDF() as any;
        doc.setFont("helvetica", "bold");
        doc.text("BIPS ERP - SCHOOL MANAGEMENT SYSTEM", 14, 15);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);

        let reportName = "";
        let head: any[] = [];
        let body: any[] = [];

        if (activeReport === 'daily') {
            const todayStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
            reportName = `Daily Collection Report (${todayStr})`;
            head = [['Date', 'Student Name', 'Father Name', 'Class', 'Receipt No', 'Amount (INR)']];
            body = reportData.daily
                .filter(d => d.date === todayStr)
                .map(d => [d.date, d.studentName, d.fatherName || 'N/A', d.className, d.receiptNo, `Rs. ${d.paidAmount.toLocaleString()}`]);
        } else if (activeReport === 'monthly') {
            reportName = `Monthly Collection Detailed (${reportFilterMonth})`;
            head = [['Date', 'Receipt No', 'Student Name', 'Class', 'Mode', 'Amount (INR)']];
            const filtered = reportData.daily.filter(d => {
                const pDate = new Date(d.paymentDate);
                const m = pDate.toLocaleString('en-GB', { month: 'long' });
                return m === reportFilterMonth;
            });
            body = filtered.map(d => [d.date, d.receiptNo, d.studentName, d.className, d.paymentMode, `Rs. ${d.paidAmount.toLocaleString()}`]);
            
            // Add a total row
            const total = filtered.reduce((s, d) => s + d.paidAmount, 0);
            body.push([{ content: 'GRAND TOTAL:', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold' } }, { content: `Rs. ${total.toLocaleString()}`, styles: { fontStyle: 'bold' } }]);
        } else if (activeReport === 'class') {
            reportName = "Class-wise Fee Collection";
            head = [['Class', 'Students Paid', 'Collected (INR)']];
            body = reportData.classWise.map(c => [c.className, c.students, `Rs. ${c.total.toLocaleString()}`]);
        } else if (activeReport === 'pending') {
            reportName = "Outstanding Dues Report";
            if (pendingClassFilter !== 'All') reportName += ` - ${pendingClassFilter}`;
            if (dueMonthFilter !== 'All') reportName += ` (${dueMonthFilter})`;
            
            const isMonthFiltered = dueMonthFilter !== 'All';
            head = [['Student Name', 'Adm No', 'Class', isMonthFiltered ? 'Month Due (INR)' : 'Pending Months', 'Total Due (INR)']];
            body = dueFees
                .filter(f => {
                    const classMatch = pendingClassFilter === 'All' || f.className === pendingClassFilter;
                    const rtMatch = dueRtFilter === 'All' || 
                                  (dueRtFilter === 'RT' && f.isRT) || 
                                  (dueRtFilter === 'Non-RT' && !f.isRT);
                    const monthMatch = dueMonthFilter === 'All' || (f.pendingMonths || []).includes(dueMonthFilter);
                    return classMatch && rtMatch && monthMatch;
                })
                .map(f => [
                    f.studentName, 
                    f.admissionNo, 
                    f.className, 
                    isMonthFiltered ? `Rs. ${Math.max(0, (f.monthlyFeeAmount || 0) - (f.monthWisePaid?.[dueMonthFilter] || 0)).toLocaleString()}` : (f.pendingMonths?.join(', ') || 'None'), 
                    `Rs. ${f.pending.toLocaleString()}`
                ]);
            
            const total = dueFees
                .filter(f => {
                    const classMatch = pendingClassFilter === 'All' || f.className === pendingClassFilter;
                    const rtMatch = dueRtFilter === 'All' || 
                                  (dueRtFilter === 'RT' && f.isRT) || 
                                  (dueRtFilter === 'Non-RT' && !f.isRT);
                    const monthMatch = dueMonthFilter === 'All' || (f.pendingMonths || []).includes(dueMonthFilter);
                    return classMatch && rtMatch && monthMatch;
                })
                .reduce((s, f) => s + f.pending, 0);
            body.push([{ content: 'GRAND TOTAL:', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } }, { content: `Rs. ${total.toLocaleString()}`, styles: { fontStyle: 'bold' } }]);
        }

        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(reportName, 14, 32);

        autoTable(doc, {
            startY: 38,
            head: head,
            body: body,
            theme: 'grid',
            headStyles: { fillColor: [79, 70, 229], textColor: 255 },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            margin: { top: 40 }
        });

        doc.save(`${reportName.replace(/ /g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
    };


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
    const [fatherName, setFatherName] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedFees, setSelectedFees] = useState<string[]>([]);
    const [selectedMonths, setSelectedMonths] = useState<string[]>(['April']);
    const [selectedMonth, setSelectedMonth] = useState<string>('April');
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);
    const [requiresApproval, setRequiresApproval] = useState(false);

    // Transport state
    const [isTransportEnabled, setIsTransportEnabled] = useState(false);
    const [isTransportYearly, setIsTransportYearly] = useState(false);
    const [transportRows, setTransportRows] = useState([{ name: '', km: '', price: '', showDropdown: false }]);
    const [transportStops, setTransportStops] = useState<{ id: string; name: string; km: string; ratePerKm?: string, busFare: number }[]>([]);

    useEffect(() => {
        fetchTransportStops();
    }, []);

    const fetchTransportStops = async () => {
        try {
            const res = await axios.get('/erp-api/admin/transport/stops');
            setTransportStops(res.data);
        } catch (error) {
            console.error('Failed to fetch transport stops');
        }
    };

    const isHeadPaidForMonth = (headName: string, month: string) => {
        return studentHistory.some(r => {
            if (r.status !== 'APPROVED' || r.month !== month) return false;
            const parts = r.feeHead.split('==>');
            if (parts.length < 2) return false;
            const headsPart = parts[1];
            const headNames = headsPart.split('||').map(hn => hn.split(':')[0].trim());
            return headNames.includes(headName);
        });
    };

    const isTransportPaidForMonth = (month: string) => {
        return studentHistory.some(r => {
            if (r.status !== 'APPROVED' || r.month !== month) return false;
            return r.feeHead.includes('Transport');
        });
    };


    const isFeePaid = (headName: string) => {
        const headObj = feeHeads.find(h => h.name === headName);
        if (!headObj) return false;
        
        const isMonthly = headObj.type && headObj.type.toLowerCase().includes('month');
        
        return studentHistory.some(r => {
            if (r.status === 'REJECTED') return false;
            
            const parts = r.feeHead.split('==>');
            if (parts.length < 2) return false;
            
            const headsPart = parts[1];
            const headNames = headsPart.split('||').map(h => h.split(':')[0].trim());
            
            return headNames.includes(headName) && (!isMonthly || selectedMonths.includes(r.month || ''));
        });
    };

    const isMonthPaid = (month: string) => {
        const struct = feeStructure.find(s => s.className === selectedClass);
        if (!struct) return false;
        
        const monthlyHeads = feeHeads.filter(h => h.type === 'Monthly' && (struct.fees?.[h.name] || 0) > 0);
        if (monthlyHeads.length === 0) return false;

        // A month is fully paid only if all monthly heads for that month have been paid
        return monthlyHeads.every(h => {
             return studentHistory.some(r => {
                 if (r.status !== 'APPROVED' || r.month !== month) return false;
                 const parts = r.feeHead.split('==>');
                 if (parts.length < 2) return false;
                 const headsPart = parts[1];
                 const headNames = headsPart.split('||').map(hn => hn.split(':')[0].trim());
                 return headNames.includes(h.name);
             });
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



    // Fee Head Form fields
    const [newHeadName, setNewHeadName] = useState('');
    const [newHeadType, setNewHeadType] = useState<'Monthly' | 'Annual' | 'One-time' | 'Other'>('Monthly');
    const [editingHeadId, setEditingHeadId] = useState<string | null>(null);

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
            if (parsedUser.role === 'ACCOUNTS' || parsedUser.role === 'ADMIN' || parsedUser.role === 'PRINCIPAL') {
                fetchAllHistory();
                fetchReports();
                fetchDueFees();
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
                if (parsedUser.role === 'ACCOUNTS' || parsedUser.role === 'ADMIN' || parsedUser.role === 'PRINCIPAL') {
                    fetchAllHistory();
                    fetchDueFees();
                }
                // Refresh reports if active
                if (activeTab === 'reports') {
                    fetchReports();
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
            const res = await axios.get('/erp-api/fees/next-receipt');
            if (res.data && res.data.receiptNo) {
                setReceiptNo(res.data.receiptNo);
            }
        } catch (err) {
            console.error('Failed to fetch next receipt number');
        }
    };



    const fetchPendingApprovals = async () => {
        try {
            const res = await axios.get('/erp-api/fees/pending');
            // Map backend amountPaid to frontend paidAmount
            const mappedData = res.data.map((r: any) => ({
                ...r,
                paidAmount: r.amountPaid || r.paidAmount || 0,
                studentName: r.studentName || 'Unknown Student',
                admissionNo: r.admissionNo || 'N/A',
                className: r.className || 'Unknown Class'
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
            const res = await axios.get(`/erp-api/fees/history/${studentId}`);
            setStudentHistory(res.data.map((r: any) => ({
                ...r,
                paidAmount: r.amountPaid || r.paidAmount || 0,
                date: new Date(r.paymentDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
                studentName: studentNameVal,
                admissionNo: r.student?.admissionNo || r.admissionNo || 'N/A',
                className: r.student?.class?.name || r.className || 'N/A'
            })));
            
            const balRes = await axios.get(`/erp-api/fees/student/${studentId}/balance`);
            setPendingDues(balRes.data.outstandingBalance || 0);
        } catch (err) {
            console.error('Failed to fetch history:', err);
        }
    };



    const fetchClasses = async () => {
        try {
            const res = await axios.get('/erp-api/admin/classes');
            setClasses(res.data);
        } catch (err) { console.error('Failed to fetch classes'); }
    };

    const handleDeleteFeeStructure = async (classId: string) => {
        if (!window.confirm('Are you sure you want to permanently delete the fee structure for this class?')) return;
        try {
            await axios.delete(`/erp-api/fees/structure/${classId}`);
            setFeeStructure(prev => prev.filter(f => f.id !== classId));
            alert('Fee structure deleted permanently.');
        } catch (err) {
            alert('Failed to delete fee structure.');
        }
    };

    const fetchAllHistory = async () => {
        try {
            const res = await axios.get('/erp-api/fees');
            setFeeRecords(res.data.map((r: any) => ({
                ...r,
                paidAmount: r.amountPaid || r.paidAmount || 0,
                date: new Date(r.paymentDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
                studentName: r.studentName || 'Unknown Student',
                className: r.className || 'Unknown Class'
            })));
        } catch (err) {
            console.error('Failed to fetch full history:', err);
        }
    };

    const fetchDueFees = async () => {
        try {
            const res = await axios.get('/erp-api/fees/due-list');
            console.log("Due Fees Data Received:", res.data.length, "records");
            if (res.data.length > 0) {
                console.log("First Record Sample:", {
                    name: res.data[0].studentName,
                    pendingMonths: res.data[0].pendingMonths
                });
            }
            setDueFees(res.data);
        } catch (err) {
            console.error('Failed to fetch due fees:', err);
        }
    };

    const fetchTransportDues = async () => {
        setLoadingTransportDues(true);
        try {
            const res = await axios.get('/erp-api/fees/transport-due-list');
            setTransportDues(res.data);
        } catch (error) {
            console.error('Failed to fetch transport dues');
        } finally {
            setLoadingTransportDues(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'due' && dueView === 'transport') {
            fetchTransportDues();
        }
    }, [activeTab, dueView]);

    const downloadDueExcel = () => {
        if (dueView === 'general') {
            const filtered = (dueFees as any[])
                .filter(f => dueClassFilter === 'All' || f.className === dueClassFilter)
                .filter(f => {
                    if (dueRtFilter === 'All') return true;
                    if (dueRtFilter === 'RT') return f.isRT;
                    return !f.isRT;
                })
                .filter(f => {
                    if (dueMonthFilter === 'All') return true;
                    return (f.pendingMonths || []).includes(dueMonthFilter);
                });

            const isMonthSelected = dueMonthFilter !== 'All';
            const headers = [
                "Student Name", 
                "Father Name", 
                "Class", 
                "Admission No", 
                isMonthSelected ? `${dueMonthFilter} Monthly Fee` : "Total Expected", 
                "Total Paid", 
                "Total Net Pending",
                "Remaining Amount"
            ];
            
            const csvContent = [
                headers.join(","),
                ...filtered.map(f => [
                    `"${f.studentName}"`,
                    `"${f.fatherName || 'N/A'}"`,
                    `"${f.className}"`,
                    `"${f.admissionNo}"`,
                    isMonthSelected ? f.monthlyFeeAmount : f.totalExpected,
                    f.totalPaid,
                    f.pending,
                    isMonthSelected ? Math.max(0, (f.monthlyFeeAmount || 0) - (f.monthWisePaid?.[dueMonthFilter] || 0)) : f.pending
                ].join(","))
            ].join("\n");

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `Pending_Fees_${new Date().toLocaleDateString()}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            // Transport Excel
            const headers = ['STUDENT NAME', 'FATHER NAME', 'CLASS', 'STOP', 'MONTHLY FARE', 'TOTAL PAID', 'TOTAL PENDING', 'MONTHS PAID'];
            const filtered = transportDues
                .filter(d => dueClassFilter === 'All' || d.className === dueClassFilter)
                .filter(d => {
                    if (dueRtFilter === 'All') return true;
                    if (dueRtFilter === 'RT') return d.isRT;
                    return !d.isRT;
                });
            const csvContent = [
                headers.join(','),
                ...filtered.map(d => [
                    `"${d.studentName}"`,
                    `"${d.fatherName || 'N/A'}"`,
                    `"${d.className}"`,
                    `"${d.stopName}"`,
                    d.monthlyFare,
                    d.totalPaid,
                    d.pending,
                    `"${(d.paidMonths || []).join('; ')}"`
                ].join(','))
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `Transport_Dues_${new Date().toLocaleDateString()}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };



    const fetchStudents = async () => {
        try {
            const res = await axios.get('/erp-api/admin/students');
            if (res.data && res.data.length > 0) {
                setStudents(res.data);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const fetchFeeHeads = async () => {
        try {
            const res = await axios.get('/erp-api/fees/heads');
            setFeeHeads(res.data);
        } catch (err) { console.error('Failed to fetch fee heads'); }
    };

    // fetchConcessions removed

    const fetchFeeStructure = async () => {
        try {
            const res = await axios.get('/erp-api/fees/structure');
            setFeeStructure(res.data);
        } catch (err) { console.error('Failed to fetch fee structure'); }
    };

    // Auto-update fee amount when Class or selectedFees changes

    useEffect(() => {
        if (selectedClass) {
            const struct = feeStructure.find(s => s.className === selectedClass);
            if (struct && struct.fees) {
                const subtotal = selectedFees.reduce((sum, feeName) => {
                    const amount = struct.fees[feeName] || 0;
                    const head = feeHeads.find(h => h.name === feeName);
                    const multiplier = (head?.type === 'Monthly') ? selectedMonths.filter(m => !isHeadPaidForMonth(feeName, m)).length : 1;
                    return sum + (amount * multiplier);
                }, 0);
                
                const transportMonthlyTotal = isTransportEnabled ? transportRows.reduce((sum, row) => sum + (Number(row.price) || 0), 0) : 0;
                const unpaidTransportMonths = selectedMonths.filter(m => !isTransportPaidForMonth(m));
                const transportTotal = isTransportYearly ? transportMonthlyTotal * 12 : (transportMonthlyTotal * unpaidTransportMonths.length);
                const total = subtotal + transportTotal;
                const discVal = Number(discount) || 0;
                const netPayable = (total + pendingDues - discVal).toString();
                setTotalFee(total.toString());
                setFinalAmount(netPayable);
                setPaidAmount(netPayable); // Auto-fill amount being paid
            }
        } else {
            setTotalFee('0');
            setFinalAmount('0');
            setPaidAmount('');
        }
    }, [selectedClass, selectedFees, discount, feeStructure, isTransportEnabled, isTransportYearly, transportRows, pendingDues, selectedMonths]);

    const handleCollectFee = async (e: React.FormEvent) => {
        e.preventDefault();
        const student = students.find(s => s.admissionNo === admissionNo);
        if (!student || !paidAmount || !receiptNo || (selectedFees.length === 0 && pendingDues === 0 && !isTransportEnabled)) 
            return alert('Please search student and select at least one fee head or clear previous dues');
            
        const isPending = Number(discount) > 0 && requiresApproval;
        
        try {
            const struct = feeStructure.find(s => s.className === student.className);
            const breakdownParts = selectedFees.map(f => {
                const amount = struct?.fees?.[f] || 0;
                const head = feeHeads.find(h => h.name === f);
                const unpaidCount = head?.type === 'Monthly' ? selectedMonths.filter(m => !isHeadPaidForMonth(f, m)).length : 1;
                return `${f}: ${amount * unpaidCount}`;
            });
            if (isTransportEnabled) {
                transportRows.forEach(r => {
                    if (r.name && r.price) {
                        const unpaidTransportCount = isTransportYearly ? 12 : selectedMonths.filter(m => !isTransportPaidForMonth(m)).length;
                        const amount = Number(r.price) * unpaidTransportCount;
                        breakdownParts.push(`Transport (${r.name})${isTransportYearly ? ' (Yearly)' : ''}: ${amount}`);
                    }
                });
            }
            if (pendingDues > 0) {
                breakdownParts.push(`Previous Dues: ${pendingDues}`);
            }

            const payload = {
                studentId: student.id,
                admissionNo: student.admissionNo,
                amountPaid: Number(paidAmount),
                totalFee: Number(totalFee),
                discount: Number(discount),
                discountReason: isPending ? 'Requested Discount' : '',
                feeHead: `${selectedMonths.join(', ')} ==> ${breakdownParts.join(' || ')}`,
                paymentMode,
                month: selectedMonths[0], // Primary month for grouping
                year: new Date().getFullYear().toString(),
                submittedBy: user?.name || 'User',
                remark
            };

            const res = await axios.post('/erp-api/fees/collect', payload);
            const savedRecord = res.data.data;
            
            const newRecord: FeeRecord = { 
                ...savedRecord,
                paidAmount: savedRecord.amountPaid || savedRecord.paidAmount || 0,
                id: savedRecord.id,
                date: new Date(savedRecord.paymentDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
                studentName: student.name,
                admissionNo: student.admissionNo,
                className: student.className
            };

            
            setFeeRecords([newRecord, ...feeRecords]);
            setStudentHistory(prev => [newRecord, ...prev]);
            
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
            setFatherName('');
            setSelectedClass('');
            setSelectedFees([]);
            setPaidAmount(''); 
            setTotalFee('0'); 
            setDiscount('0'); 
            setRequiresApproval(false);
            setFinalAmount('0');
            setSelectedMonths(['April']);
            setIsTransportEnabled(false);
            setIsTransportYearly(false);
            setTransportRows([{ name: '', km: '', price: '', showDropdown: false }]);
            setPendingDues(0);
            setRemark('');
            fetchNextReceiptNo();
        } catch (error: any) {
            console.error(error);
            const errMsg = error.response?.data?.error || 'Failed to process fee collection';
            alert(errMsg);
        }

    };

    const approveFee = async (id: string) => {
        try {
            await axios.post(`/erp-api/fees/${id}/approve`, { approvedBy: user?.name });
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
            await axios.post(`/erp-api/fees/${id}/reject`, { approvedBy: user?.name });
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
            const res = await axios.post(`/erp-api/fees/${id}/pay-full`);
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
            if (editingHeadId) {
                const res = await axios.put(`/erp-api/fees/heads/${editingHeadId}`, { name: newHeadName, type: newHeadType });
                setFeeHeads(feeHeads.map(h => h.id === editingHeadId ? res.data : h));
                setEditingHeadId(null);
                alert('Fee Head Updated Successfully!');
            } else {
                const res = await axios.post('/erp-api/fees/heads', { name: newHeadName, type: newHeadType });
                setFeeHeads([...feeHeads, res.data]);
                alert('Fee Head Created Successfully!');
            }
            setNewHeadName('');
            setNewHeadType('Monthly');
        } catch (err: any) { 
            alert(err.response?.data?.error || 'Failed to process fee head'); 
        }
    };

    const handleEditFeeHead = (head: FeeHead) => {
        setEditingHeadId(head.id);
        setNewHeadName(head.name);
        setNewHeadType(head.type);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteFeeHead = async (id: string, name: string) => {
        if (!window.confirm(`Are you sure you want to permanently delete "${name}"?`)) return;
        try {
            await axios.delete(`/erp-api/fees/heads/${id}`);
            setFeeHeads(feeHeads.filter(h => h.id !== id));
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to delete fee head');
        }
    };

    // handleAddConcession removed

    return (
        <div style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: '#111827' }}>Accounts Module <span style={{fontSize: '0.7rem', color: '#94a3b8', fontWeight: 'normal'}}>v1.2-deploy-check</span></h1>
                <div style={{ display: 'flex', gap: '0.4rem', background: '#f1f5f9', padding: '0.35rem', borderRadius: '10px', flexWrap: 'wrap', overflowX: 'auto' }}>
                    {[
                        { id: 'collection', label: 'Fee Collection' },
                        { id: 'drafts', label: 'My Drafts' },
                        { id: 'approvals', label: 'Approvals' },
                        { id: 'heads', label: 'Fee Heads' },
                        { id: 'due', label: 'Due Fees' },
                        { id: 'previous_due', label: 'Previous Dues' },
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
                                             setFatherName('');
                                             setSelectedClass('');
                                             setStudentHistory([]);
                                             setPendingDues(0);
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
                                                         setFatherName(s.fatherName || 'N/A');
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
                                 <select 
                                    className="form-control" 
                                    value={selectedMonth} 
                                    onChange={e => {
                                        const months = ['April','May','June','July','August','September','October','November','December','January','February','March'];
                                        const newM = e.target.value;
                                        const mIdx = months.indexOf(newM);
                                        const prevUnpaid = months.slice(0, mIdx).find(m => !isMonthPaid(m));
                                        
                                        if (prevUnpaid) {
                                            alert(`Student has unpaid dues for ${prevUnpaid}. Please collect that first.`);
                                            setSelectedMonth(prevUnpaid);
                                        } else {
                                            setSelectedMonth(newM);
                                        }
                                    }}
                                >
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
                            <div className="stat-card" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1.5rem', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                <div style={{ gridColumn: 'span 5' }}><h3 style={{ color: '#1e293b', fontSize: '1.1rem' }}>2. Student Details</h3></div>
                                <div><label style={{ color: '#64748b', fontSize: '0.8rem' }}>Full Name</label><div style={{ fontWeight: '700', fontSize: '1.1rem' }}>{studentName}</div></div>
                                <div><label style={{ color: '#64748b', fontSize: '0.8rem' }}>Father Name</label><div style={{ fontWeight: '700', fontSize: '1.1rem' }}>{fatherName}</div></div>
                                <div><label style={{ color: '#64748b', fontSize: '0.8rem' }}>Admission No</label><div style={{ fontWeight: '700', fontSize: '1.1rem' }}>{admissionNo}</div></div>
                                <div><label style={{ color: '#64748b', fontSize: '0.8rem' }}>Current Class</label><div style={{ fontWeight: '700', fontSize: '1.1rem' }}>{selectedClass}</div></div>
                                <div><label style={{ color: '#64748b', fontSize: '0.8rem' }}>Status</label><div><span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold' }}>Active</span></div></div>
                            </div>

                            {/* 3. Fee Structure & Month Tracker */}
                            <div className="stat-card" style={{ display: 'block' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                    <h3 style={{ color: '#1e293b', fontSize: '1.1rem' }}>3. Fee Collection Tracker & Structure</h3>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button 
                                            onClick={() => {
                                                const struct = feeStructure.find(s => s.className === selectedClass);
                                                const unpaidHeads = feeHeads.filter(h => (struct?.fees?.[h.name] || 0) > 0 && !isFeePaid(h.name));
                                                if (selectedFees.length === unpaidHeads.length) {
                                                    setSelectedFees([]);
                                                } else {
                                                    setSelectedFees(unpaidHeads.map(h => h.name));
                                                }
                                            }}
                                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontWeight: '600' }}
                                        >
                                            {(() => {
                                                const struct = feeStructure.find(s => s.className === selectedClass);
                                                const unpaidHeads = feeHeads.filter(h => (struct?.fees?.[h.name] || 0) > 0 && !isFeePaid(h.name));
                                                return selectedFees.length === unpaidHeads.length ? 'Deselect All' : 'Select All Unpaid';
                                            })()}
                                        </button>
                                    </div>
                                </div>

                                {/* Month-wise Status Tracker */}
                                <div style={{ marginBottom: '2rem', background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                    <p style={{ fontSize: '0.8rem', fontWeight: '800', color: '#64748b', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Calendar size={14} /> Monthly Payment Status (Session 2024-25)
                                    </p>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '0.5rem' }}>
                                        {['April','May','June','July','August','September','October','November','December','January','February','March'].map(m => {
                                            const paid = isMonthPaid(m);
                                            const isSelected = selectedMonths.includes(m);
                                            const months = ['April','May','June','July','August','September','October','November','December','January','February','March'];
                                            
                                            return (
                                                <div 
                                                    key={m} 
                                                    onClick={() => {
                                                        if (paid) return;
                                                        const mIdx = months.indexOf(m);
                                                        
                                                        if (isSelected) {
                                                            // Deselect this and all after
                                                            setSelectedMonths(prev => prev.filter(month => months.indexOf(month) < mIdx));
                                                        } else {
                                                            // Select up to this
                                                            const newSelection = [];
                                                            for (let i = 0; i <= mIdx; i++) {
                                                                if (!isMonthPaid(months[i])) {
                                                                    newSelection.push(months[i]);
                                                                }
                                                            }
                                                            setSelectedMonths(newSelection);
                                                        }
                                                    }}
                                                    style={{ 
                                                        textAlign: 'center', 
                                                        padding: '0.75rem 0.25rem', 
                                                        borderRadius: '10px', 
                                                        background: isSelected ? '#4f46e5' : paid ? '#dcfce7' : 'white',
                                                        border: `1px solid ${isSelected ? '#4f46e5' : paid ? '#16653440' : '#e2e8f0'}`,
                                                        cursor: paid ? 'default' : 'pointer',
                                                        transition: '0.2s',
                                                        boxShadow: isSelected ? '0 4px 6px -1px rgba(79, 70, 229, 0.4)' : 'none'
                                                    }}
                                                >
                                                    <div style={{ fontSize: '0.7rem', fontWeight: '800', color: isSelected ? 'white' : paid ? '#166534' : '#64748b' }}>{m.substring(0, 3)}</div>
                                                    <div style={{ marginTop: '0.4rem', display: 'flex', justifyContent: 'center' }}>
                                                        {paid ? (
                                                            <Check size={14} strokeWidth={3} color={isSelected ? 'white' : '#166534'} />
                                                        ) : (
                                                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: isSelected ? 'white' : '#cbd5e1' }} />
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
                                                const months = ['April','May','June','July','August','September','October','November','December','January','February','March'];
                                                const unpaid = months.filter(m => !isMonthPaid(m));
                                                setSelectedMonths(unpaid);
                                            }}
                                            style={{ padding: '0.4rem 1rem', fontSize: '0.75rem', borderRadius: '6px', backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', color: '#475569', fontWeight: '700', cursor: 'pointer' }}
                                        >
                                            Select All Unpaid (Full Year)
                                        </button>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                                    {/* Monthly Fees Section */}
                                    <div>
                                        <p style={{ fontSize: '0.85rem', fontWeight: '800', color: '#4f46e5', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4f46e5' }} /> 
                                            Monthly Fees ({selectedMonths.length > 1 ? `${selectedMonths[0]} to ${selectedMonths[selectedMonths.length-1]}` : selectedMonths[0]})
                                        </p>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            {feeHeads.filter(h => {
                                                const struct = feeStructure.find(s => s.className === selectedClass);
                                                const amount = struct?.fees?.[h.name] || 0;
                                                return h.type === 'Monthly' && amount > 0;
                                            }).map(h => {
                                                                                                 const struct = feeStructure.find(s => s.className === selectedClass);
                                                 const perMonthAmount = struct?.fees?.[h.name] || 0;
                                                 const unpaidMonths = selectedMonths.filter(m => !isHeadPaidForMonth(h.name, m));
                                                 const amount = perMonthAmount * unpaidMonths.length;
                                                 const isSelected = selectedFees.includes(h.name);
                                                 const paid = unpaidMonths.length === 0;
                                                 const partiallyPaid = !paid && unpaidMonths.length < selectedMonths.length;

                                                return (
                                                    <div 
                                                        key={h.id}
                                                        onClick={paid ? undefined : () => toggleFeeSelection(h.name)}
                                                        style={{ 
                                                            display: 'flex', 
                                                            justifyContent: 'space-between', 
                                                            alignItems: 'center', 
                                                            padding: '0.85rem 1rem', 
                                                            borderRadius: '12px', 
                                                            background: paid ? '#f0fdf4' : isSelected ? '#eff6ff' : 'white',
                                                            border: `1px solid ${paid ? '#bbf7d0' : isSelected ? '#bfdbfe' : '#e2e8f0'}`,
                                                            cursor: paid ? 'default' : 'pointer',
                                                            transition: '0.2s'
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                            {paid ? <Check size={18} color="#166534" strokeWidth={3} /> : <input type="checkbox" checked={isSelected} readOnly style={{ width: '18px', height: '18px' }} />}
                                                            <span style={{ fontWeight: '600', color: paid ? '#166534' : '#1e293b' }}>{h.name}</span>
                                                        </div>
                                                        <div style={{ textAlign: 'right' }}>
                                                             <div style={{ fontWeight: '800', color: paid ? '#166534' : '#1e293b' }}>₹{amount.toLocaleString()}</div>
                                                             {paid && <span style={{ fontSize: '0.65rem', fontWeight: '800', color: '#166534', textTransform: 'uppercase' }}>Already Paid</span>}
                                                             {partiallyPaid && <span style={{ fontSize: '0.65rem', fontWeight: '800', color: '#f59e0b', textTransform: 'uppercase' }}>{unpaidMonths.length} Month(s) Remaining</span>}
                                                         </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Annual / One-time Fees Section */}
                                    <div>
                                        <p style={{ fontSize: '0.85rem', fontWeight: '800', color: '#ea580c', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ea580c' }} /> 
                                            Annual & One-time Fees
                                        </p>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            {feeHeads.filter(h => {
                                                const struct = feeStructure.find(s => s.className === selectedClass);
                                                const amount = struct?.fees?.[h.name] || 0;
                                                // Group Annual, One-time and Others together in the right section
                                                return h.type !== 'Monthly' && amount > 0;
                                            }).map(h => {
                                                const struct = feeStructure.find(s => s.className === selectedClass);
                                                const amount = struct?.fees?.[h.name] || 0;
                                                const isSelected = selectedFees.includes(h.name);
                                                const paid = isFeePaid(h.name);
                                                return (
                                                    <div 
                                                        key={h.id}
                                                        onClick={paid ? undefined : () => toggleFeeSelection(h.name)}
                                                        style={{ 
                                                            display: 'flex', 
                                                            justifyContent: 'space-between', 
                                                            alignItems: 'center', 
                                                            padding: '0.85rem 1rem', 
                                                            borderRadius: '12px', 
                                                            background: paid ? '#f0fdf4' : isSelected ? '#fff7ed' : 'white',
                                                            border: `1px solid ${paid ? '#bbf7d0' : isSelected ? '#fed7aa' : '#e2e8f0'}`,
                                                            cursor: paid ? 'default' : 'pointer',
                                                            transition: '0.2s'
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                            {paid ? <Check size={18} color="#166534" strokeWidth={3} /> : <input type="checkbox" checked={isSelected} readOnly style={{ width: '18px', height: '18px' }} />}
                                                            <span style={{ fontWeight: '600', color: paid ? '#166534' : '#1e293b' }}>{h.name}</span>
                                                        </div>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <div style={{ fontWeight: '800', color: paid ? '#166534' : '#1e293b' }}>₹{amount.toLocaleString()}</div>
                                                            {paid && <span style={{ fontSize: '0.65rem', fontWeight: '800', color: '#166534', textTransform: 'uppercase' }}>Already Paid</span>}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 3.5 Transport Section */}
                            <div className="stat-card" style={{ display: 'block', backgroundColor: '#fdfcfe', border: '1px solid #f3e8ff' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{ backgroundColor: '#f3e8ff', color: '#9333ea', padding: '0.4rem', borderRadius: '8px' }}>
                                            <input 
                                                type="checkbox" 
                                                id="transport-toggle"
                                                checked={isTransportEnabled} 
                                                onChange={e => setIsTransportEnabled(e.target.checked)} 
                                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                            />
                                        </div>
                                        <label htmlFor="transport-toggle" style={{ fontWeight: '700', fontSize: '1.1rem', color: '#6b21a8', cursor: 'pointer' }}>
                                            Enable Transport Facility
                                        </label>
                                    </div>
                                    {isTransportEnabled && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f5f3ff', padding: '0.4rem 0.75rem', borderRadius: '10px', border: '1px solid #ddd6fe' }}>
                                                <input 
                                                    type="checkbox" 
                                                    id="transport-yearly"
                                                    checked={isTransportYearly} 
                                                    onChange={e => setIsTransportYearly(e.target.checked)} 
                                                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                                />
                                                <label htmlFor="transport-yearly" style={{ fontSize: '0.85rem', color: '#6b21a8', fontWeight: '700', cursor: 'pointer' }}>
                                                    Pay Yearly (12 Months)
                                                </label>
                                            </div>
                                            <div style={{ fontSize: '0.85rem', color: '#9333ea', fontWeight: '600' }}>
                                                Transport Fee will be added to the total amount
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {isTransportEnabled && (
                                    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                                        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 0.75rem' }}>
                                            <thead>
                                                <tr>
                                                    <th style={{ textAlign: 'left', padding: '0 0.5rem', color: '#6d28d9', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Route Name</th>
                                                    <th style={{ textAlign: 'left', padding: '0 0.5rem', color: '#6d28d9', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Transport Fee (₹)</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {transportRows.map((row, idx) => (
                                                    <tr key={idx}>
                                                        <td style={{ padding: '0 0.5rem', position: 'relative' }}>
                                                            <div style={{ position: 'relative' }}>
                                                                <input 
                                                                    type="text" 
                                                                    className="form-control" 
                                                                    placeholder="Search Route..." 
                                                                    value={row.name} 
                                                                    onChange={e => {
                                                                        const newRows = [...transportRows];
                                                                        newRows[idx].name = e.target.value;
                                                                        newRows[idx].showDropdown = true;
                                                                        setTransportRows(newRows);
                                                                    }} 
                                                                    onFocus={() => {
                                                                        const newRows = [...transportRows];
                                                                        newRows[idx].showDropdown = true;
                                                                        setTransportRows(newRows);
                                                                    }}
                                                                    style={{ border: '1px solid #ddd6fe', borderRadius: '12px', background: '#fdfbff', padding: '0.8rem 1rem' }}
                                                                />
                                                                {row.showDropdown && (
                                                                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, backgroundColor: 'white', border: '1px solid #ddd6fe', borderRadius: '12px', marginTop: '4px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', maxHeight: '250px', overflowY: 'auto' }}>
                                                                        {transportStops
                                                                            .filter(s => s.name.toLowerCase().includes(row.name.toLowerCase()))
                                                                            .map((stop) => (
                                                                                <div 
                                                                                    key={stop.id} 
                                                                                    style={{ padding: '0.75rem 1rem', cursor: 'pointer', borderBottom: '1px solid #f5f3ff', transition: 'background 0.2s' }}
                                                                                    onClick={() => {
                                                                                        const newRows = [...transportRows];
                                                                                        newRows[idx].name = stop.name;
                                                                                        newRows[idx].km = stop.km;
                                                                                        newRows[idx].price = (stop.busFare || 0).toString();
                                                                                        newRows[idx].showDropdown = false;
                                                                                        setTransportRows(newRows);
                                                                                    }}
                                                                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f5f3ff'}
                                                                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
                                                                                >
                                                                                    <div style={{ fontWeight: '600' }}>{stop.name}</div>
                                                                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>₹{stop.busFare || 0}</div>
                                                                                </div>
                                                                            ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '0 0.5rem' }}>
                                                            <input 
                                                                type="text" 
                                                                className="form-control" 
                                                                placeholder="0" 
                                                                readOnly
                                                                value={row.price} 
                                                                style={{ border: '1px solid #ddd6fe', borderRadius: '12px', background: '#f3f4f6', padding: '0.8rem 1rem', fontWeight: '700', color: '#4f46e5' }}
                                                            />
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            {/* 4. Previous Payment History */}
                            <div className="stat-card" style={{ display: 'block' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                    <h3 style={{ color: '#1e293b', fontSize: '1.1rem' }}>4. Previous & Recent Collections</h3>
                                    {user?.role === 'ACCOUNTS' && <span style={{ fontSize: '0.8rem', color: '#64748b' }}>* Collections with discounts require Principal approval</span>}
                                </div>
                                <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead><tr style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '0.85rem', position: 'sticky', top: 0, backgroundColor: '#f8fafc', zIndex: 1 }}><th style={{ padding: '0.75rem' }}>Receipt</th><th style={{ padding: '0.75rem' }}>Fee Head</th><th style={{ padding: '0.75rem' }}>Amount</th><th style={{ padding: '0.75rem' }}>Due</th><th style={{ padding: '0.75rem' }}>Discount</th><th style={{ padding: '0.75rem' }}>Date</th><th style={{ padding: '0.75rem' }}>Status</th></tr></thead>
                                    <tbody>
                                        {studentHistory.length > 0 ? (
                                            studentHistory.map(r => {
                                                let parsedPreviousDue = 0;
                                                if (r.feeHead && r.feeHead.includes('Previous Dues:')) {
                                                    const match = r.feeHead.match(/Previous Dues:\s*(\d+(\.\d+)?)/);
                                                    if (match) {
                                                        parsedPreviousDue = parseFloat(match[1]);
                                                    }
                                                }
                                                const rawDue = ((r.totalFee || 0) + parsedPreviousDue) - (r.paidAmount || 0) - (r.discount || 0);
                                                const isAdvance = rawDue < 0;
                                                const dueAmt = Math.abs(rawDue);
                                                return (
                                                <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '0.75rem', color: '#2563eb', fontWeight: '700' }}>{r.receiptNo}</td>
                                                    <td style={{ padding: '0.75rem', fontSize: '0.9rem' }}>{r.feeHead}</td>
                                                    <td style={{ padding: '0.75rem', fontWeight: '800' }}>₹{r.paidAmount.toLocaleString()}</td>
                                                    <td style={{ padding: '0.75rem', fontWeight: '600', color: rawDue > 0 ? '#ef4444' : isAdvance ? '#22c55e' : '#64748b' }}>
                                                        {rawDue === 0 ? '-' : isAdvance ? `+₹${dueAmt.toLocaleString()} (Adv)` : `₹${dueAmt.toLocaleString()}`}
                                                    </td>
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
                                                );
                                            })
                                        ) : (
                                            <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>No previous payments found for this student.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                                </div>
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
                                            ) : !isTransportEnabled && (
                                                <div style={{ textAlign: 'center', color: '#9a3412', fontSize: '0.875rem' }}>No fees selected. Click on amounts above.</div>
                                            )}
                                            {isTransportEnabled && transportRows.map((row, idx) => (
                                                row.price && (
                                                    <div key={`trans-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px dashed #fed7aa', fontSize: '0.9rem', color: '#9333ea' }}>
                                                        <span style={{ fontWeight: '500' }}>Transport: {row.name || `Route ${idx+1}`} {isTransportYearly ? '(Yearly)' : '(Monthly)'}</span>
                                                        <span style={{ fontWeight: 'bold' }}>₹{(isTransportYearly ? Number(row.price) * 12 : Number(row.price)).toLocaleString()}</span>
                                                    </div>
                                                )
                                            ))}
                                            {pendingDues > 0 && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px dashed #fed7aa', fontSize: '0.9rem', color: '#dc2626' }}>
                                                    <span style={{ fontWeight: '500' }}>Previous Dues</span>
                                                    <span style={{ fontWeight: 'bold' }}>₹{pendingDues.toLocaleString()}</span>
                                                </div>
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

                                            {Number(discount) > 0 && (
                                                <div style={{ 
                                                    marginTop: '1.25rem', 
                                                    padding: '0.75rem', 
                                                    backgroundColor: '#fffbeb', 
                                                    border: '1px solid #fde68a', 
                                                    borderRadius: '10px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '1rem',
                                                    animation: 'fadeIn 0.3s ease-out'
                                                }}>
                                                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                                        <input 
                                                            type="checkbox" 
                                                            id="approval-check"
                                                            checked={requiresApproval}
                                                            onChange={e => setRequiresApproval(e.target.checked)}
                                                            style={{ 
                                                                width: '20px', 
                                                                height: '20px', 
                                                                cursor: 'pointer',
                                                                accentColor: '#d97706'
                                                            }}
                                                        />
                                                    </div>
                                                    <label htmlFor="approval-check" style={{ color: '#92400e', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer', flex: 1 }}>
                                                        Send for Principal Approval? 
                                                        <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: '500', color: '#b45309', marginTop: '2px' }}>
                                                            {requiresApproval ? 'Request will be sent to Principal' : 'Pay now with discount (Immediate)'}
                                                        </span>
                                                    </label>
                                                </div>
                                            )}
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
                                        
                                        <div className="form-group" style={{ marginTop: '1rem' }}>
                                            <label style={{ fontWeight: 'bold' }}>Remark (Max 50 words)</label>
                                            <textarea 
                                                className="form-control"
                                                value={remark}
                                                onChange={(e) => {
                                                    const text = e.target.value;
                                                    const words = text.trim().split(/\s+/).filter(w => w.length > 0);
                                                    if (words.length <= 50 || text.length < remark.length) {
                                                        setRemark(text);
                                                    }
                                                }}
                                                placeholder="Enter any additional remarks..."
                                                rows={2}
                                                style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.75rem', width: '100%', resize: 'none' }}
                                            />
                                            <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#64748b' }}>
                                                {remark.trim().split(/\s+/).filter(w => w.length > 0).length}/50 words
                                            </div>
                                        </div>

                                        <div 
                                            title="This feature is currently disabled"
                                            style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', backgroundColor: '#f1f5f9', borderRadius: '8px', border: '1px dashed #cbd5e1', cursor: 'not-allowed', opacity: 0.6 }} 
                                        >
                                            <input 
                                                type="checkbox" 
                                                checked={false} 
                                                disabled
                                                onChange={() => {}} 
                                                style={{ width: '18px', height: '18px', cursor: 'not-allowed', accentColor: '#94a3b8' }} 
                                            />
                                            <label style={{ cursor: 'not-allowed', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontSize: '0.95rem' }}>
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="#94a3b8">
                                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                                </svg>
                                                Send Receipt via WhatsApp
                                            </label>
                                        </div>
                                        <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '1.5rem', padding: '1rem', backgroundColor: (Number(discount) > 0 && requiresApproval) ? '#ea580c' : '#166534', fontSize: '1.1rem' }}>
                                            {(Number(discount) > 0 && requiresApproval) ? 'Submit for Principal Approval' : 'Confirm & Print Receipt'}
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
                        <h3 style={{ marginBottom: '1.5rem', fontWeight: 'bold' }}>{editingHeadId ? 'Edit Fee Head' : 'Create New Fee Head'}</h3>
                        <form onSubmit={handleAddFeeHead}>
                            <div className="form-group">
                                <label>Fee Head Name</label>
                                <input type="text" className="form-control" placeholder="e.g. Activity Fee" value={newHeadName} onChange={e => setNewHeadName(e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label>Fee Type</label>
                                <select className="form-control" value={newHeadType} onChange={e => setNewHeadType(e.target.value as any)}>
                                    <option value="Monthly">Monthly</option>
                                    <option value="Annual">Annual</option>
                                    <option value="One-time">One-time</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button type="submit" className="btn-primary" style={{ flex: 2, marginTop: '0.5rem' }}>
                                    {editingHeadId ? 'Update Fee Head' : 'Create Fee Head'}
                                </button>
                                {editingHeadId && (
                                    <button 
                                        type="button" 
                                        onClick={() => { setEditingHeadId(null); setNewHeadName(''); setNewHeadType('Monthly'); }} 
                                        style={{ flex: 1, marginTop: '0.5rem', backgroundColor: '#64748b', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700' }}
                                    >
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                    <div className="data-table-container">
                        <div className="table-header"><h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Existing Fee Heads</h2></div>
                        <table style={{ width: '100%' }}>
                            <thead><tr><th style={{ padding: '1rem' }}>Fee Head</th><th style={{ padding: '1rem' }}>Type</th><th style={{ textAlign: 'center', padding: '1rem' }}>Action</th></tr></thead>
                            <tbody>{feeHeads.map((head) => (
                                <tr key={head.id}>
                                    <td style={{ padding: '1rem', fontWeight: '600' }}>{head.name}</td>
                                    <td style={{ padding: '1rem', fontWeight: 'bold', color: '#111827' }}>{head.type}</td>
                                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                                        <button 
                                            style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontWeight: '700', fontSize: '0.875rem', marginRight: '1rem' }} 
                                            onClick={() => handleEditFeeHead(head)}
                                        >
                                            Edit
                                        </button>
                                        <button 
                                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: '700', fontSize: '0.875rem' }} 
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
                <div style={{ padding: '1rem' }}>
                    {/* Toggle Button for Due View */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: '#f1f5f9', padding: '0.4rem', borderRadius: '12px', width: 'fit-content' }}>
                        <button 
                            onClick={() => setDueView('general')}
                            style={{ 
                                padding: '0.6rem 1.5rem', 
                                border: 'none', 
                                borderRadius: '10px', 
                                cursor: 'pointer', 
                                fontWeight: '700', 
                                fontSize: '0.85rem',
                                transition: 'all 0.3s',
                                backgroundColor: dueView === 'general' ? '#ffffff' : 'transparent',
                                color: dueView === 'general' ? '#1e293b' : '#64748b',
                                boxShadow: dueView === 'general' ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none'
                            }}
                        >
                            General Fees Dues
                        </button>
                        <button 
                            onClick={() => setDueView('transport')}
                            style={{ 
                                padding: '0.6rem 1.5rem', 
                                border: 'none', 
                                borderRadius: '10px', 
                                cursor: 'pointer', 
                                fontWeight: '700', 
                                fontSize: '0.85rem',
                                transition: 'all 0.3s',
                                backgroundColor: dueView === 'transport' ? '#ffffff' : 'transparent',
                                color: dueView === 'transport' ? '#1e293b' : '#64748b',
                                boxShadow: dueView === 'transport' ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none'
                            }}
                        >
                            Transport Fees Dues
                        </button>
                    </div>

                    {dueView === 'transport' && (
                        <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
                            {/* Summary Cards */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                                <div className="stat-card" style={{ padding: '1.5rem', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1rem', background: '#fff' }}>
                                    <div style={{ backgroundColor: '#eff6ff', color: '#3b82f6', padding: '0.75rem', borderRadius: '12px' }}><Users size={24} /></div>
                                    <div>
                                        <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>Total Transport Students</div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#1e293b' }}>{transportDues.length}</div>
                                    </div>
                                </div>
                                <div className="stat-card" style={{ padding: '1.5rem', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1rem', background: '#fff' }}>
                                    <div style={{ backgroundColor: '#fff1f2', color: '#f43f5e', padding: '0.75rem', borderRadius: '12px' }}><AlertCircle size={24} /></div>
                                    <div>
                                        <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>Pending Students</div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#f43f5e' }}>{transportDues.filter(d => d.pending > 0).length}</div>
                                    </div>
                                </div>
                                <div className="stat-card" style={{ padding: '1.5rem', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1rem', background: '#fff' }}>
                                    <div style={{ backgroundColor: '#fff1f2', color: '#f43f5e', padding: '0.75rem', borderRadius: '12px' }}><IndianRupee size={24} /></div>
                                    <div>
                                        <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>Total Pending Amount</div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#f43f5e' }}>₹{transportDues.reduce((sum, d) => sum + d.pending, 0).toLocaleString()}</div>
                                    </div>
                                </div>
                                <div className="stat-card" style={{ padding: '1.5rem', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1rem', background: '#fff' }}>
                                    <div style={{ backgroundColor: '#ecfdf5', color: '#10b981', padding: '0.75rem', borderRadius: '12px' }}><IndianRupee size={24} /></div>
                                    <div>
                                        <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>Total Collected Amount</div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#1e293b' }}>₹{transportDues.reduce((sum, d) => sum + d.totalPaid, 0).toLocaleString()}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="data-table-container shadow-sm" style={{ border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                        <div className="table-header" style={{ background: '#f8fafc', padding: '1.5rem', borderBottom: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-end' }}>
                                <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                                    <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b' }}>Select Class</label>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <select 
                                            className="form-control" 
                                            value={dueClassFilter}
                                            onChange={(e) => setDueClassFilter(e.target.value)}
                                            style={{ flex: 1 }}
                                        >
                                            <option value="All">All Classes</option>
                                            {/* Dynamic classes from DB */}
                                            {classes && classes.length > 0 ? (
                                                Array.from(new Set(classes.map(c => c.name))).sort((a, b) => sortClassNames(a, b)).map((className, idx) => (
                                                    <option key={idx} value={className}>{className}</option>
                                                ))
                                            ) : (
                                                /* Fallback common classes if DB is empty or fetching fails */
                                                [
                                                    'Play', 'Nursery', 'Lower Kindergarten (LKG)', 'Upper Kindergarten (UKG)', 
                                                    'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 
                                                    'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 
                                                    'Class 11 (Maths)', 'Class 11 (Bio)', 'Class 11 (Commerce)', 
                                                    'Class 12 (Maths)', 'Class 12 (Bio)', 'Class 12 (Commerce)'
                                                ].map((c, i) => (
                                                    <option key={`fallback-${i}`} value={c}>{c}</option>
                                                ))
                                            )}
                                        </select>
                                        <button 
                                            onClick={() => { fetchClasses(); fetchDueFees(); }}
                                            className="btn-primary"
                                            style={{ padding: '0.4rem', width: 'auto', backgroundColor: '#64748b' }}
                                            title="Refresh Classes"
                                        >
                                            <TrendingUp size={16} />
                                        </button>
                                    </div>
                                </div>
                                <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                                    <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b' }}>Select Month</label>
                                    <select 
                                        className="form-control" 
                                        value={dueMonthFilter}
                                        onChange={(e) => setDueMonthFilter(e.target.value)}
                                    >
                                        <option value="All">All Pending (Full Session)</option>
                                        {['April','May','June','July','August','September','October','November','December','January','February','March'].map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>
                                <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                                    <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b' }}>Student Type</label>
                                    <select 
                                        className="form-control" 
                                        value={dueRtFilter}
                                        onChange={(e) => setDueRtFilter(e.target.value)}
                                    >
                                        <option value="All">All Students</option>
                                        <option value="RT">RT Students</option>
                                        <option value="Non-RT">Non-RT Students</option>
                                    </select>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button 
                                        onClick={downloadDueExcel}
                                        className="btn-primary" 
                                        style={{ padding: '0.6rem 1.2rem', width: 'auto', backgroundColor: '#059669', fontSize: '0.85rem' }}
                                    >
                                        Export CSV
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div style={{ maxHeight: '520px', overflowY: 'auto', borderTop: '1px solid #e2e8f0' }}>
                        {dueView === 'general' ? (
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left', position: 'sticky', top: 0, zIndex: 2 }}>
                                    <th style={{ padding: '1rem', color: '#475569', fontSize: '0.8rem', fontWeight: '700' }}>Student Name ({(
                                        dueFees
                                            .filter(f => dueClassFilter === 'All' || f.className?.trim() === dueClassFilter.trim())
                                            .filter(f => {
                                                if (dueRtFilter === 'All') return true;
                                                if (dueRtFilter === 'RT') return !!f.isRT;
                                                return !f.isRT;
                                            })
                                            .filter(f => {
                                                if (dueMonthFilter === 'All') return true;
                                                return (f.pendingMonths || []).includes(dueMonthFilter);
                                            })
                                    ).length})</th>
                                    <th style={{ padding: '1rem', color: '#475569', fontSize: '0.8rem', fontWeight: '700' }}>Admission No</th>
                                    <th style={{ padding: '1rem', color: '#475569', fontSize: '0.8rem', fontWeight: '700' }}>Class</th>
                                    <th style={{ padding: '1rem', color: '#475569', fontSize: '0.8rem', fontWeight: '700', textAlign: 'right' }}>{dueMonthFilter === 'All' ? 'Total Pending (₹)' : `${dueMonthFilter} Monthly Fee (₹)`}</th>
                                    <th style={{ padding: '1rem', color: '#475569', fontSize: '0.8rem', fontWeight: '700', textAlign: 'center' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(() => {
                                    const filtered = dueFees
                                        .filter(f => dueClassFilter === 'All' || f.className?.trim() === dueClassFilter.trim())
                                        .filter(f => {
                                            if (dueRtFilter === 'All') return true;
                                            if (dueRtFilter === 'RT') return !!f.isRT;
                                            return !f.isRT;
                                        })
                                        .filter(f => {
                                            if (dueMonthFilter === 'All') return true;
                                            return (f.pendingMonths || []).includes(dueMonthFilter);
                                        });
                                    
                                    if (filtered.length === 0) {
                                        return (
                                            <tr>
                                                <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                                                    {dueMonthFilter === 'All' ? 'No pending dues found.' : `All students have paid for ${dueMonthFilter}. ✓`}
                                                </td>
                                            </tr>
                                        );
                                    }


                                    return (
                                        <>
                                            {/* Summary banner when month is selected */}
                                            {dueMonthFilter !== 'All' && (
                                                <tr style={{ backgroundColor: '#f0f9ff' }}>
                                                    <td colSpan={5} style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#0369a1', fontWeight: '700', borderBottom: '2px solid #bae6fd' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <span>📅 Showing {filtered.length} student(s) with dues for <strong>{dueMonthFilter}</strong></span>
                                                            <div style={{ display: 'flex', gap: '1.5rem' }}>
                                                                <span>Month Bill: <strong>₹{filtered.reduce((s: number, f: any) => s + (f.monthlyFeeAmount || 0), 0).toLocaleString()}</strong></span>
                                                                <span style={{ color: '#059669' }}>Month Paid: <strong>₹{filtered.reduce((s: number, f: any) => s + (f.monthWisePaid?.[dueMonthFilter] || 0), 0).toLocaleString()}</strong></span>
                                                                <span style={{ color: '#ef4444' }}>Month Pending: <strong>₹{filtered.reduce((s: number, f: any) => s + Math.max(0, (f.monthlyFeeAmount || 0) - (f.monthWisePaid?.[dueMonthFilter] || 0)), 0).toLocaleString()}</strong></span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                            {filtered.map((fee: any) => {
                                                const mPaid = dueMonthFilter === 'All' ? 0 : (fee.monthWisePaid?.[dueMonthFilter] || 0);
                                                const mPending = dueMonthFilter === 'All' ? fee.pending : Math.max(0, fee.monthlyFeeAmount - mPaid);
                                                return (
                                                    <tr key={fee.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                        <td style={{ padding: '1rem', fontWeight: '600' }}>{fee.studentName}</td>
                                                        <td style={{ padding: '1rem', color: '#64748b' }}>{fee.admissionNo}</td>
                                                        <td style={{ padding: '1rem' }}>
                                                            <span style={{ background: '#e0e7ff', color: '#4338ca', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>
                                                                {fee.className}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '1rem', textAlign: 'right', verticalAlign: 'middle' }}>
                                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                                                <div style={{ fontSize: '1rem', fontWeight: '800', color: '#ef4444' }}>
                                                                    ₹{mPending.toLocaleString()}
                                                                </div>
                                                                {dueMonthFilter !== 'All' && (
                                                                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                                                                        {mPaid > 0 ? (
                                                                            <>₹{fee.monthlyFeeAmount.toLocaleString()} - <span style={{ color: '#059669', fontWeight: 'bold' }}>₹{mPaid.toLocaleString()} paid</span></>
                                                                        ) : (
                                                                            <>Full Month Bill: ₹{fee.monthlyFeeAmount.toLocaleString()}</>
                                                                        )}
                                                                    </div>
                                                                )}
                                                                <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#1e293b', marginTop: '4px', background: '#f1f5f9', padding: '1px 6px', borderRadius: '4px' }}>
                                                                    Total Dues: ₹{fee.pending.toLocaleString()}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedStudentForHistory(fee);
                                                                    fetchStudentHistory(fee.id, fee.studentName);
                                                                    setShowHistoryModal(true);
                                                                }}
                                                                style={{ background: '#4f46e5', color: 'white', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', marginRight: '0.5rem' }}
                                                            >
                                                                View Details
                                                            </button>
                                                            <button
                                                                disabled
                                                                title="WhatsApp reminder — coming soon"
                                                                style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '0.4rem 0.7rem', borderRadius: '6px', cursor: 'not-allowed', opacity: 0.55, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="15" height="15" fill="#25d366">
                                                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                                                </svg>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </>
                                    );
                                })()}
                            </tbody>
                        </table>
                        ) : (
                            /* Transport Dues Table */
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left', position: 'sticky', top: 0, zIndex: 2 }}>
                                        <th style={{ padding: '1rem', color: '#475569', fontSize: '0.8rem', fontWeight: '700' }}>Student Name</th>
                                        <th style={{ padding: '1rem', color: '#475569', fontSize: '0.8rem', fontWeight: '700' }}>Father Name</th>
                                        <th style={{ padding: '1rem', color: '#475569', fontSize: '0.8rem', fontWeight: '700' }}>Class</th>
                                        <th style={{ padding: '1rem', color: '#475569', fontSize: '0.8rem', fontWeight: '700' }}>Stop</th>
                                        <th style={{ padding: '1rem', color: '#475569', fontSize: '0.8rem', fontWeight: '700', textAlign: 'right' }}>Monthly Fare</th>
                                        <th style={{ padding: '1rem', color: '#475569', fontSize: '0.8rem', fontWeight: '700' }}>Months Status</th>
                                        <th style={{ padding: '1rem', color: '#475569', fontSize: '0.8rem', fontWeight: '700', textAlign: 'right' }}>Total Pending</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loadingTransportDues ? (
                                        <tr><td colSpan={7} style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>Loading transport dues...</td></tr>
                                    ) : transportDues.length > 0 ? (
                                        transportDues
                                            .filter(d => dueClassFilter === 'All' || d.className === dueClassFilter)
                                            .filter(d => {
                                                if (dueRtFilter === 'All') return true;
                                                if (dueRtFilter === 'RT') return d.isRT;
                                                return !d.isRT;
                                            })
                                            .map((due: any) => (
                                                <tr key={due.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                    <td style={{ padding: '1rem', fontWeight: '600' }}>{due.studentName}</td>
                                                    <td style={{ padding: '1rem' }}>{due.fatherName || 'N/A'}</td>
                                                    <td style={{ padding: '1rem' }}>{due.className}</td>
                                                    <td style={{ padding: '1rem' }}>
                                                        <span style={{ backgroundColor: '#f1f5f9', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600' }}>
                                                            {due.stopName}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '700' }}>₹{due.monthlyFare}</td>
                                                    <td style={{ padding: '1rem' }}>
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.2rem' }}>
                                                            {['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'].map(m => {
                                                                const isPaid = due.paidMonths?.includes(m);
                                                                return (
                                                                    <span 
                                                                        key={m}
                                                                        style={{ 
                                                                            fontSize: '0.6rem', 
                                                                            padding: '0.1rem 0.3rem', 
                                                                            borderRadius: '3px',
                                                                            backgroundColor: isPaid ? '#dcfce7' : '#fee2e2',
                                                                            color: isPaid ? '#166534' : '#991b1b',
                                                                            fontWeight: '700'
                                                                        }}
                                                                    >
                                                                        {m.substring(0, 3)}
                                                                    </span>
                                                                );
                                                            })}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '800', color: due.pending > 0 ? '#ef4444' : '#10b981' }}>
                                                        ₹{due.pending.toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))
                                    ) : (
                                        <tr><td colSpan={7} style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>No transport students found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'previous_due' && (
                <div className="data-table-container shadow-lg">
                    <div className="table-header" style={{ background: 'linear-gradient(to right, #f8fafc, #ffffff)', padding: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <div>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827' }}>Students with Previous Session Dues</h2>
                                <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>List of students carrying dues from previous year</p>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                                    Total Students: {dueFees.filter(f => (f.previousSessionDue || 0) > 0).filter(f => prevDueClassFilter === 'All' || f.className === prevDueClassFilter).length}
                                </span>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', background: '#f1f5f9', padding: '1rem', borderRadius: '12px' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: '700' }}>Filter by Class</label>
                                <select className="form-control" style={{ height: '38px', padding: '0.2rem 0.8rem' }} onChange={(e) => setPrevDueClassFilter(e.target.value)}>
                                    <option value="All">All Classes</option>
                                    {Array.from(new Map(classes.map(c => [c.name, c])).values()).sort((a, b) => sortClassNames(a.name, b.name)).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div style={{ maxHeight: '520px', overflowY: 'auto', borderTop: '1px solid #e2e8f0' }}>
                    <table style={{ width: '100%' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f8fafc' }}>
                                <th style={{ padding: '1rem 1.5rem' }}>Student Name</th>
                                <th style={{ padding: '1rem 1.5rem' }}>Class</th>
                                <th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>Previous Due (₹)</th>
                                <th style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dueFees
                                .filter(f => (f.previousSessionDue || 0) > 0)
                                .filter(f => prevDueClassFilter === 'All' || f.className === prevDueClassFilter)
                                .map((fee) => (
                                    <tr key={fee.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#1e293b' }}>{fee.studentName}</td>
                                        <td style={{ padding: '1rem 1.5rem' }}>
                                            <span style={{ background: '#e0e7ff', color: '#4338ca', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700' }}>
                                                {fee.className}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem', textAlign: 'right', color: '#ef4444', fontWeight: '800' }}>₹{(fee.previousSessionDue || 0).toLocaleString()}</td>
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
                </div>
            )}

            {activeTab === 'structure' && (
                <div>
                    <div className="stat-card" style={{ display: 'block', marginBottom: '2rem' }}>
                        <h3 style={{ marginBottom: '1.5rem', fontWeight: 'bold' }}>{editingClassId ? 'Edit' : 'Define'} Class Fee Structure</h3>
                        <form id="fee-structure-form" onSubmit={async (e) => {
                            e.preventDefault();
                            const form = e.target as HTMLFormElement;
                            const formData = new FormData(form);
                            // Important: disabled fields are not in FormData, so we use editingClassId if available
                            const selectedClassId = editingClassId || (formData.get('classId') as string);
                            const fees: any = {};
                            feeHeads.forEach(head => {
                                fees[head.name] = Number(formData.get(head.name) || 0);
                            });
                            
                            try {
                                await axios.post('/erp-api/fees/structure', { classId: selectedClassId, fees });
                                fetchFeeStructure();
                                form.reset();
                                setEditingClassId(null);
                                alert(editingClassId ? 'Fee Structure updated successfully!' : 'Fee Structure defined and saved successfully!');
                            } catch (err) {
                                console.error(err);
                                alert('Failed to save fee structure');
                            }
                        }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                                <div className="form-group">
                                    <label>Class</label>
                                    <select name="classId" className="form-control" required disabled={!!editingClassId}>
                                        <option value="">Select Class</option>
                                        {Array.from(new Map(classes.map(c => [c.name, c])).values()).sort((a, b) => sortClassNames(a.name, b.name)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '0.6rem 1.5rem', backgroundColor: editingClassId ? '#059669' : '#4f46e5' }}>
                                    {editingClassId ? 'Update Structure' : 'Save Structure'}
                                </button>
                                {editingClassId && (
                                    <button 
                                        type="button" 
                                        onClick={() => { setEditingClassId(null); (document.getElementById('fee-structure-form') as HTMLFormElement).reset(); }} 
                                        style={{ width: 'auto', padding: '0.6rem 1.5rem', backgroundColor: '#94a3b8', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                                    >
                                        Cancel
                                    </button>
                                )}
                            </div>
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
                                <select className="form-control" style={{ width: '150px', height: '38px', padding: '0.2rem 0.8rem' }} value={structFilterClass} onChange={e => setStructFilterClass(e.target.value)}>
                                    <option value="">All Classes</option>
                                    {Array.from(new Map(classes.map(c => [c.name, c])).values()).sort((a, b) => sortClassNames(a.name, b.name)).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
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
                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                <button style={{ background: '#dcfce7', border: 'none', color: '#166534', cursor: 'pointer', fontWeight: '700', padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.75rem' }} onClick={() => handleEditFeeStructure(item)}>Edit</button>
                                                <button style={{ background: '#fee2e2', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: '700', padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.75rem' }} onClick={() => handleDeleteFeeStructure(item.id)}>Delete</button>
                                            </div>
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
                                <th style={{ padding: '1rem' }}>Action Taken Date</th>
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
                                        <td style={{ padding: '1rem' }}>
                                            {r.approvalDate ? new Date(r.approvalDate).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        {/* Today's Card */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-5 hover:shadow-md transition-all">
                            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center text-2xl">
                                <TrendingUp size={28} />
                            </div>
                            <div>
                                <p className="text-slate-500 text-sm font-medium">Today's Collection</p>
                                <h3 className="text-2xl font-bold text-slate-900 mt-1">
                                    ₹ {reportData.daily.filter(d => d.date === new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })).reduce((s, d) => s + d.paidAmount, 0).toLocaleString()}
                                </h3>
                            </div>
                        </div>

                        {/* Selected Month Card */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-5 hover:shadow-md transition-all">
                            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center text-2xl">
                                <IndianRupee size={28} />
                            </div>
                            <div>
                                <p className="text-slate-500 text-sm font-medium">Selected Month ({reportFilterMonth})</p>
                                <h3 className="text-2xl font-bold text-slate-900 mt-1">
                                    ₹ {(reportData.monthly.find(m => m.month === reportFilterMonth)?.total || 0).toLocaleString()}
                                </h3>
                            </div>
                        </div>

                        {/* Annual Card */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-5 hover:shadow-md transition-all">
                            <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center text-2xl">
                                <CalendarDays size={28} />
                            </div>
                            <div>
                                <p className="text-slate-500 text-sm font-medium">Total Yearly Collection</p>
                                <h3 className="text-2xl font-bold text-slate-900 mt-1">
                                    ₹ {reportData.monthly.reduce((s, m) => s + m.total, 0).toLocaleString()}
                                </h3>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        {[
                            { id: 'daily', label: 'Daily Collection' },
                            { id: 'monthly', label: 'Monthly Collection' },
                            { id: 'class', label: 'Class-wise Fee' },
                            { id: 'pending', label: 'Pending Fee Report', disabled: true }
                        ].map(r => (
                            <button
                                key={r.id}
                                onClick={() => {
                                    if (r.disabled) return;
                                    setActiveReport(r.id as any);
                                }}
                                disabled={r.disabled}
                                style={{
                                    padding: '0.6rem 1.2rem',
                                    borderRadius: '8px',
                                    border: 'none',
                                    cursor: r.disabled ? 'not-allowed' : 'pointer',
                                    fontSize: '0.9rem',
                                    fontWeight: '600',
                                    backgroundColor: activeReport === r.id ? '#4f46e5' : 'transparent',
                                    color: activeReport === r.id ? 'white' : (r.disabled ? '#94a3b8' : '#64748b'),
                                    opacity: r.disabled ? 0.5 : 1,
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
                                {activeReport === 'monthly' && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        Monthly Collection Summary
                                        <select 
                                            value={reportFilterMonth} 
                                            onChange={(e) => setReportFilterMonth(e.target.value)}
                                            style={{ 
                                                marginLeft: '1rem', 
                                                padding: '0.4rem 0.8rem', 
                                                borderRadius: '8px', 
                                                border: '1px solid #e2e8f0', 
                                                fontSize: '0.85rem', 
                                                fontWeight: '600', 
                                                color: '#475569',
                                                backgroundColor: '#f8fafc',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                                                <option key={m} value={m}>{m}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                {activeReport === 'class' && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        Class-wise Fee Collection
                                        <select 
                                            value={classReportFilter} 
                                            onChange={(e) => setClassReportFilter(e.target.value)}
                                            style={{ 
                                                marginLeft: '1rem', 
                                                padding: '0.4rem 0.8rem', 
                                                borderRadius: '8px', 
                                                border: '1px solid #e2e8f0', 
                                                fontSize: '0.85rem', 
                                                fontWeight: '600', 
                                                color: '#475569',
                                                backgroundColor: '#f8fafc',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <option value="All">All Classes</option>
                                            {[...new Set(reportData.classWise.map(c => c.className))].sort(sortClassNames).map(cls => (
                                                <option key={cls} value={cls}>{cls}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                {activeReport === 'pending' && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        Outstanding Dues Report
                                        <select 
                                            value={pendingClassFilter} 
                                            onChange={(e) => setPendingClassFilter(e.target.value)}
                                            style={{ 
                                                marginLeft: '1rem', 
                                                padding: '0.4rem 0.8rem', 
                                                borderRadius: '8px', 
                                                border: '1px solid #e2e8f0', 
                                                fontSize: '0.85rem', 
                                                fontWeight: '600', 
                                                color: '#475569',
                                                backgroundColor: '#f8fafc',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <option value="All">All Classes</option>
                                            {[...new Set(dueFees.map(f => f.className))].sort(sortClassNames).map(cls => (
                                                <option key={cls} value={cls}>{cls}</option>
                                            ))}
                                        </select>
                                         <select 
                                            value={dueRtFilter} 
                                            onChange={(e) => setDueRtFilter(e.target.value)}
                                            style={{ 
                                                marginLeft: '1rem', 
                                                padding: '0.4rem 0.8rem', 
                                                borderRadius: '8px', 
                                                border: '1px solid #e2e8f0', 
                                                fontSize: '0.85rem', 
                                                fontWeight: '600', 
                                                color: '#475569',
                                                backgroundColor: '#f8fafc',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <option value="All">All Students</option>
                                            <option value="RT">RT Students Only</option>
                                            <option value="Non-RT">Non-RT Students Only</option>
                                        </select>
                                        <select 
                                            value={dueMonthFilter} 
                                            onChange={(e) => setDueMonthFilter(e.target.value)}
                                            style={{ 
                                                marginLeft: '1rem', 
                                                padding: '0.4rem 0.8rem', 
                                                borderRadius: '8px', 
                                                border: '1px solid #e2e8f0', 
                                                fontSize: '0.85rem', 
                                                fontWeight: '600', 
                                                color: '#475569',
                                                backgroundColor: '#f8fafc',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <option value="All">All Months</option>
                                            {['April','May','June','July','August','September','October','November','December','January','February','March'].map(m => (
                                                <option key={m} value={m}>{m}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </h2>
                            <div style={{ display: 'flex', gap: '1rem' }}>

                                <button onClick={exportToPDF} className="btn-primary" style={{ width: 'auto', padding: '0.5rem 1.5rem', backgroundColor: '#ec4899' }}>Export PDF</button>
                            </div>
                        </div>
 
                         <div style={{ maxHeight: '500px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)', position: 'relative' }} className="custom-scrollbar">
                          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                              <thead style={{ position: 'sticky', top: 0, zIndex: 20 }}>
                                  <tr style={{ backgroundColor: '#f1f5f9' }}>

                                     {activeReport === 'daily' && (<><th style={{ padding: '1rem 1.5rem' }}>Date</th><th style={{ padding: '1rem 1.5rem' }}>Student Name</th><th style={{ padding: '1rem 1.5rem' }}>Father Name</th><th style={{ padding: '1rem 1.5rem' }}>Class</th><th style={{ padding: '1rem 1.5rem' }}>Receipt No</th><th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>Amount (₹)</th><th style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>Actions</th></>)}
                                     {activeReport === 'monthly' && (<><th style={{ padding: '1rem 1.5rem' }}>Month</th><th style={{ padding: '1rem 1.5rem' }}>Year</th><th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>Total Collection (₹)</th></>)}
                                     {activeReport === 'class' && (<><th style={{ padding: '1rem 1.5rem' }}>Class</th><th style={{ padding: '1rem 1.5rem' }}>Students</th><th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>Collected Amount (₹)</th></>)}
                                     {activeReport === 'pending' && (<><th style={{ padding: '1rem 1.5rem' }}>Student Name</th><th style={{ padding: '1rem 1.5rem' }}>Adm No</th><th style={{ padding: '1rem 1.5rem' }}>Class</th><th style={{ padding: '1rem 1.5rem' }}>This Month (₹)</th><th style={{ padding: '1rem 1.5rem' }}>Month Paid (₹)</th><th style={{ padding: '1rem 1.5rem' }}>Month Due (₹)</th><th style={{ padding: '1rem 1.5rem' }}>Pending Months</th><th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>Total Due (₹)</th></>)}
                                 </tr>
                             </thead>
                             <tbody>
                                 {activeReport === 'daily' && (() => {
                                     const todayData = reportData.daily.filter(d => d.date === new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }));
                                     if (todayData.length === 0) return <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>No collections today.</td></tr>;
                                     return todayData.map((d, i) => (
                                         <tr key={i}>
                                             <td style={{ padding: '1rem 1.5rem' }}>{d.date}</td>
                                             <td style={{ padding: '1rem 1.5rem', fontWeight: '600' }}>{d.studentName}</td>
                                             <td style={{ padding: '1rem 1.5rem' }}>{d.fatherName || 'N/A'}</td>
                                             <td style={{ padding: '1rem 1.5rem' }}>{d.className}</td>
                                             <td style={{ padding: '1rem 1.5rem', fontWeight: '900', color: '#2563eb' }}>{d.receiptNo}</td>
                                             <td style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: '800', color: '#059669' }}>₹{d.paidAmount.toLocaleString()}</td>
                                             <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                                                 <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                     <button 
                                                         onClick={() => { setSelectedReceipt(d); setShowReceipt(true); }}
                                                         style={{ 
                                                             padding: '0.4rem 0.8rem', 
                                                             backgroundColor: '#eff6ff', 
                                                             border: '1px solid #bfdbfe', 
                                                             color: '#2563eb', 
                                                             borderRadius: '6px', 
                                                             cursor: 'pointer', 
                                                             fontSize: '0.75rem', 
                                                             fontWeight: '800' 
                                                         }}
                                                     >
                                                         View Recipt
                                                     </button>
                                                     <button 
                                                         onClick={() => handleDeleteReceipt(d.id, d.receiptNo)}
                                                         style={{ 
                                                             padding: '0.4rem', 
                                                             backgroundColor: '#fee2e2', 
                                                             border: '1px solid #fecaca', 
                                                             color: '#ef4444', 
                                                             borderRadius: '6px', 
                                                             cursor: 'pointer',
                                                             display: 'flex',
                                                             alignItems: 'center',
                                                             justifyContent: 'center'
                                                         }}
                                                         title="Delete Receipt"
                                                     >
                                                         <Trash2 size={16} />
                                                     </button>
                                                 </div>
                                             </td>
                                         </tr>
                                     ));
                                 })()}
                                 {activeReport === 'monthly' && (
                                    reportData.monthly.filter(m => m.month === reportFilterMonth).length > 0 ? (
                                        reportData.monthly.filter(m => m.month === reportFilterMonth).map((m, i) => (
                                            <tr key={i}>
                                                <td style={{ padding: '1rem 1.5rem' }}>{m.month}</td>
                                                <td style={{ padding: '1rem 1.5rem' }}>{m.year}</td>
                                                <td style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: '800', color: '#4f46e5' }}>₹{m.total.toLocaleString()}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={3} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>No collection data for {reportFilterMonth}.</td>
                                        </tr>
                                    )
                                 )}
                                 {activeReport === 'class' && reportData.classWise
                                     .filter(c => classReportFilter === 'All' || c.className === classReportFilter)
                                     .map((c, idx) => (
                                         <tr key={idx}>
                                             <td style={{ padding: '1rem 1.5rem' }}>{c.className}</td>
                                             <td style={{ padding: '1rem 1.5rem' }}>{c.students}</td>
                                             <td style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: '700' }}>₹{c.total.toLocaleString()}</td>
                                         </tr>
                                     ))}
                                 {activeReport === 'pending' && (() => {
                                     const filteredDues = dueFees.filter(f => {
                                         const classMatch = pendingClassFilter === 'All' || f.className === pendingClassFilter;
                                         const rtMatch = dueRtFilter === 'All' || 
                                                       (dueRtFilter === 'RT' && f.isRT) || 
                                                       (dueRtFilter === 'Non-RT' && !f.isRT);
                                         const monthMatch = dueMonthFilter === 'All' || (f.pendingMonths || []).includes(dueMonthFilter);
                                         return classMatch && rtMatch && monthMatch;
                                     });
                                     if (filteredDues.length === 0) return <tr><td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No pending dues found matching filters.</td></tr>;
                                     return filteredDues.map((fee: any) => (
                                         <tr key={fee.id}>
                                             <td style={{ padding: '1rem 1.5rem', fontWeight: 'bold' }}>
                                                {fee.studentName}
                                                {fee.isRT && <span style={{ marginLeft: '0.5rem', fontSize: '0.65rem', backgroundColor: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '4px' }}>RT</span>}
                                             </td>
                                             <td style={{ padding: '1rem 1.5rem' }}>{fee.admissionNo}</td>
                                             <td style={{ padding: '1rem 1.5rem' }}>{fee.className}</td>
                                                                                           <td style={{ padding: '1rem 1.5rem', color: '#64748b' }}>
                                                  ₹{dueMonthFilter === 'All' ? (fee.currentMonthExpected || 0).toLocaleString() : (fee.monthlyFeeAmount || 0).toLocaleString()}
                                              </td>
                                                                                           <td style={{ padding: '1rem 1.5rem', color: '#059669', fontWeight: '600' }}>
                                                  ₹{dueMonthFilter === 'All' ? (fee.currentMonthPaid || 0).toLocaleString() : (fee.monthWisePaid?.[dueMonthFilter] || 0).toLocaleString()}
                                              </td>
                                                                                           <td style={{ padding: '1rem 1.5rem', color: '#ef4444', fontWeight: '600' }}>
                                                  ₹{dueMonthFilter === 'All' ? (fee.currentMonthPending || 0).toLocaleString() : Math.max(0, (fee.monthlyFeeAmount || 0) - (fee.monthWisePaid?.[dueMonthFilter] || 0)).toLocaleString()}
                                              </td>
                                             <td style={{ padding: '1rem 1.5rem', fontSize: '0.8rem', color: '#64748b' }}>{fee.pendingMonths?.join(', ') || 'None'}</td>
                                             <td style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: '800', color: '#dc2626' }}>₹{fee.pending.toLocaleString()}</td>
                                         </tr>
                                     ));
                                 })()}
                             </tbody>
                             <tfoot>
                                 <tr style={{ backgroundColor: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                                     <td colSpan={activeReport === 'pending' ? 7 : 2} style={{ padding: '1rem 1.5rem', fontWeight: '800', textAlign: 'right' }}>Grand Total:</td>
                                     <td style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: '900', color: '#111827', fontSize: '1.1rem' }}>
                                         ₹{(() => {
                                             if (activeReport === 'daily') return reportData.daily.filter(d => d.date === new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })).reduce((s, d) => s + d.paidAmount, 0).toLocaleString();
                                             if (activeReport === 'monthly') return reportData.monthly.filter(m => m.month === reportFilterMonth).reduce((s, m) => s + m.total, 0).toLocaleString();
                                             if (activeReport === 'class') return reportData.classWise
                                                 .filter(c => classReportFilter === 'All' || c.className === classReportFilter)
                                                 .reduce((s, c) => s + c.total, 0).toLocaleString();
                                             if (activeReport === 'pending') return dueFees
                                                 .filter(f => {
                                                     const classMatch = pendingClassFilter === 'All' || f.className === pendingClassFilter;
                                                     const rtMatch = dueRtFilter === 'All' || 
                                                                   (dueRtFilter === 'RT' && f.isRT) || 
                                                                   (dueRtFilter === 'Non-RT' && !f.isRT);
                                                     const monthMatch = dueMonthFilter === 'All' || (f.pendingMonths || []).includes(dueMonthFilter);
                                                     return classMatch && rtMatch && monthMatch;
                                                 })
                                                 .reduce((s: any, d: any) => s + d.pending, 0).toLocaleString();
                                             return '0';
                                         })()}
                                     </td>
                                     {activeReport === 'daily' && <td></td>}
                                 </tr>
                             </tfoot>
                        </table>
                        </div>
                    </div>
                </div>
            )}
            {/* Receipt Modal (Monospace / Thermal Printer Style) */}
            {showReceipt && selectedReceipt && (() => {
                const headContent = selectedReceipt.feeHead || '';
                let items = [];
                let monthLabel = '';
                if (headContent.includes('==>')) {
                    const [month, listPart] = headContent.split(' ==> ');
                    monthLabel = month;
                    items = listPart.split(' || ').map(item => {
                        const [desc, price] = item.split(': ');
                        return { desc: desc.trim(), price: Number(price) };
                    });
                } else {
                    items = [{ desc: selectedReceipt.feeHead, price: selectedReceipt.totalFee || (selectedReceipt.paidAmount + (selectedReceipt.discount || 0)) }];
                }

                const subtotal = items.reduce((sum, item) => sum + item.price, 0);
                const discount = selectedReceipt.discount || 0;
                const totalPayable = subtotal - discount;
                const paidAmt = selectedReceipt.paidAmount || 0;
                const remainingDue = Math.max(0, totalPayable - paidAmt);
                const dateStr = selectedReceipt.date || new Date().toLocaleDateString('en-GB');

                const padRight = (str: any, length: number) => {
                    const s = String(str).substring(0, length);
                    return s + ' '.repeat(Math.max(0, length - s.length));
                };
                const padLeft = (str: any, length: number) => {
                    const s = String(str).substring(0, length);
                    return ' '.repeat(Math.max(0, length - s.length)) + s;
                };

                const dashedLine = '-'.repeat(55);

                const renderReceiptCopy = (copyType: string) => (
                    <div style={{ backgroundColor: '#fff', padding: '8mm 12mm', width: '148.5mm', height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', overflow: 'hidden' }}>
                        <div style={{ fontFamily: '"Courier New", Courier, monospace', fontSize: '10.5px', fontWeight: 'bold', lineHeight: '1.25', color: '#000', width: '100%', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                            <div style={{ textAlign: 'center' }}>
                                <img src="/erp/bips-logo.png" alt="School Logo" style={{ width: '55px', height: '55px', objectFit: 'contain', display: 'block', margin: '0 auto 4px auto' }} />
                                <span style={{ fontSize: '13px' }}>BIPS ERP</span><br/>
                                Official Fee Receipt<br/>
                                {copyType}<br/>
                            </div>
                            <br/>
                            {dashedLine}<br/>
                            {`Receipt No : ${padRight(selectedReceipt.receiptNo || 'N/A', 15)} Date : ${dateStr}`}<br/>
                            {dashedLine}<br/>
                            <br/>
                            Student Details:<br/>
                            {dashedLine}<br/>
                            {`Student Name    : ${selectedReceipt.studentName || 'N/A'}`}<br/>
                            {`Admission No    : ${selectedReceipt.admissionNo || 'N/A'}`}<br/>
                            {`Class & Section : ${selectedReceipt.className || 'N/A'}`}<br/>
                            {dashedLine}<br/>
                            <br/>
                            Fee Details {monthLabel ? `(${monthLabel})` : ''}:<br/>
                            {dashedLine}<br/>
                            | {padRight('Description', 35)} | {padLeft('Amount (₹)', 13)} |<br/>
                            {dashedLine}<br/>
                            {items.map((item, i) => (
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
                            Payment Details:<br/>
                            {dashedLine}<br/>
                            Amount Paid     : ₹{paidAmt.toLocaleString()}<br/>
                            Remaining Due   : ₹{remainingDue.toLocaleString()}<br/>
                            Payment Status  : {remainingDue > 0 ? 'Partial Payment' : 'Full Paid'}<br/>
                            Payment Mode    : {selectedReceipt.paymentMode || 'Cash'}<br/>
                            {dashedLine}<br/>
                            <br/>
                            Remark:<br/>
                            {dashedLine}<br/>
                            ₹{paidAmt.toLocaleString()} received. {remainingDue > 0 ? `₹${remainingDue.toLocaleString()} left as pending.` : 'All dues cleared.'}<br/>
                            {selectedReceipt.remark && <>{selectedReceipt.remark}<br/></>}
                            {dashedLine}<br/>
                            <br/>
                            This is a computer-generated receipt.<br/>
                            <br/><br/>
                            {padLeft('Authorized Signature', 55)}<br/>
                            {dashedLine}
                        </div>
                    </div>
                );

                return (
                    <div id="receipt-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem', overflowY: 'auto' }}>
                        <div id="printable-receipt-wrapper" style={{ position: 'relative', margin: 'auto' }}>
                            <div id="printable-receipt" style={{ backgroundColor: '#fff', display: 'flex', flexDirection: 'row', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', width: '297mm', height: '209mm' }}>
                                {renderReceiptCopy('(School Copy)')}
                                <div style={{ borderLeft: '1px dashed #ccc', height: '209mm' }}></div>
                                {renderReceiptCopy('(Parent Copy)')}
                            </div>

                            {/* Print Controls (Hidden on print) */}
                            <div className="no-print" style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                                <button 
                                    onClick={() => window.print()} 
                                    style={{ backgroundColor: '#1e293b', color: 'white', border: 'none', padding: '0.8rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                                >
                                    🖨️ Print Receipt
                                </button>
                                <button 
                                    onClick={() => setShowReceipt(false)} 
                                    style={{ backgroundColor: 'white', color: '#475569', border: '1px solid #cbd5e1', padding: '0.8rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '0.9rem' }}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                        <style>{`
                            @media print {
                                .no-print { display: none !important; }
                                body, html { 
                                    background: white !important; 
                                    margin: 0 !important; 
                                    padding: 0 !important; 
                                    height: 100vh !important;
                                    overflow: hidden !important;
                                }
                                body * { visibility: hidden; }
                                #receipt-modal-overlay {
                                    position: absolute !important;
                                    top: 0 !important; left: 0 !important;
                                    margin: 0 !important; padding: 0 !important;
                                    display: flex !important;
                                    visibility: visible !important;
                                    background: transparent !important;
                                    overflow: visible !important;
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
                                    width: 297mm !important; 
                                    height: auto !important;
                                    max-height: 210mm !important;
                                    padding: 0 !important;
                                    margin: 0 !important; 
                                    box-shadow: none !important; 
                                    overflow: hidden !important;
                                    page-break-after: avoid !important;
                                    page-break-inside: avoid !important;
                                }
                                @page { size: A4 landscape; margin: 0; }
                            }
                        `}</style>
                    </div>
                );
            })()}

            {/* History & Due Breakdown Modal */}
            {showHistoryModal && selectedStudentForHistory && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100, padding: '1.5rem', backdropFilter: 'blur(8px)' }}>
                    <div style={{ backgroundColor: 'white', borderRadius: '20px', width: '100%', maxWidth: '1000px', maxHeight: '95vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
                        <div style={{ padding: '1.5rem 2rem', background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: '800', letterSpacing: '-0.025em' }}>Student Fee Dashboard</h2>
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.4rem', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.9rem', color: '#cbd5e1', fontWeight: '500' }}>{selectedStudentForHistory.studentName}</span>
                                    <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#64748b' }} />
                                    <span style={{ fontSize: '0.9rem', color: '#cbd5e1', fontWeight: '500' }}>Class: {selectedStudentForHistory.className}</span>
                                    <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#64748b' }} />
                                    <span style={{ fontSize: '0.9rem', color: '#cbd5e1', fontWeight: '500' }}>Adm No: {selectedStudentForHistory.admissionNo}</span>
                                </div>
                            </div>
                            <button onClick={() => setShowHistoryModal(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: '40px', height: '40px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', transition: '0.2s' }}>×</button>
                        </div>

                        <div style={{ padding: '2rem', overflowY: 'auto', flex: 1, backgroundColor: '#f8fafc' }}>
                            {/* 1. Quick Stats & Month Tracker */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', marginBottom: '2rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <div style={{ background: 'white', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                                        <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Pending Balance</p>
                                        <p style={{ fontSize: '1.75rem', fontWeight: '900', color: '#ef4444' }}>₹{selectedStudentForHistory.pending.toLocaleString()}</p>
                                    </div>
                                    <div style={{ background: 'white', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>Total Expected:</span>
                                            <span style={{ fontSize: '0.8rem', fontWeight: '800' }}>₹{(selectedStudentForHistory.totalExpected || 0).toLocaleString()}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>Total Paid:</span>
                                            <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#10b981' }}>₹{(selectedStudentForHistory.totalPaid || 0).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                                    <p style={{ fontSize: '0.85rem', fontWeight: '800', color: '#1e293b', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Calendar size={16} color="#4f46e5" /> Session Payment Tracker (2024-25)
                                    </p>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.75rem' }}>
                                        {['April','May','June','July','August','September','October','November','December','January','February','March'].map(m => {
                                            const paid = isMonthPaid(m);
                                            return (
                                                <div key={m} style={{ 
                                                    textAlign: 'center', 
                                                    padding: '0.6rem 0.4rem', 
                                                    borderRadius: '12px', 
                                                    background: paid ? '#f0fdf4' : '#f8fafc',
                                                    border: `1px solid ${paid ? '#bbf7d0' : '#e2e8f0'}`,
                                                    transition: '0.2s'
                                                }}>
                                                    <div style={{ fontSize: '0.65rem', fontWeight: '800', color: paid ? '#166534' : '#64748b' }}>{m.substring(0, 3)}</div>
                                                    <div style={{ marginTop: '0.25rem' }}>
                                                        {paid ? <Check size={12} color="#166534" strokeWidth={4} /> : <div style={{ height: '12px' }} />}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* 2. Fee Heads Breakdown */}
                            {/* 2. Fee Heads Breakdown (Detailed Structure) */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                                <div>
                                    <h4 style={{ fontSize: '1rem', fontWeight: '800', color: '#4f46e5', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#4f46e5' }} /> 
                                        Monthly Fees Structure
                                    </h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {feeHeads.filter(h => {
                                            const struct = feeStructure.find(s => s.className === selectedStudentForHistory.className);
                                            return h.type === 'Monthly' && (struct?.fees?.[h.name] || 0) > 0;
                                        }).map(h => {
                                            const struct = feeStructure.find(s => s.className === selectedStudentForHistory.className);
                                            const amount = (struct?.fees?.[h.name] || 0);
                                            const everPaid = studentHistory.some(r => r.feeHead.toLowerCase().includes(h.name.toLowerCase()) && r.status === 'APPROVED');
                                            
                                            return (
                                                <div 
                                                    key={h.id} 
                                                    style={{ 
                                                        display: 'flex', 
                                                        justifyContent: 'space-between', 
                                                        alignItems: 'center', 
                                                        padding: '1rem', 
                                                        borderRadius: '14px', 
                                                        background: everPaid ? '#f0fdf4' : 'white', 
                                                        border: `1px solid ${everPaid ? '#bbf7d0' : '#e2e8f0'}`,
                                                        boxShadow: everPaid ? 'none' : '0 2px 4px rgba(0,0,0,0.02)'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                        <div style={{ 
                                                            width: '24px', 
                                                            height: '24px', 
                                                            borderRadius: '6px', 
                                                            background: everPaid ? '#dcfce7' : '#f1f5f9',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        }}>
                                                            {everPaid ? <Check size={14} color="#166534" strokeWidth={3} /> : <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#94a3b8' }} />}
                                                        </div>
                                                        <span style={{ fontSize: '0.9rem', fontWeight: '700', color: everPaid ? '#166534' : '#1e293b' }}>{h.name}</span>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <div style={{ fontWeight: '800', fontSize: '0.9rem', color: everPaid ? '#166534' : '#1e293b' }}>₹{amount.toLocaleString()}</div>
                                                        {everPaid && <span style={{ fontSize: '0.65rem', fontWeight: '800', color: '#166534', textTransform: 'uppercase' }}>History Recorded</span>}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div>
                                    <h4 style={{ fontSize: '1rem', fontWeight: '800', color: '#ea580c', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#ea580c' }} /> 
                                        Annual & One-time Structure
                                    </h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {feeHeads.filter(h => {
                                            const struct = feeStructure.find(s => s.className === selectedStudentForHistory.className);
                                            return h.type !== 'Monthly' && (struct?.fees?.[h.name] || 0) > 0;
                                        }).map(h => {
                                            const struct = feeStructure.find(s => s.className === selectedStudentForHistory.className);
                                            const amount = (struct?.fees?.[h.name] || 0);
                                            const everPaid = studentHistory.some(r => r.feeHead.toLowerCase().includes(h.name.toLowerCase()) && r.status === 'APPROVED');
                                            
                                            return (
                                                <div 
                                                    key={h.id} 
                                                    style={{ 
                                                        display: 'flex', 
                                                        justifyContent: 'space-between', 
                                                        alignItems: 'center', 
                                                        padding: '1rem', 
                                                        borderRadius: '14px', 
                                                        background: everPaid ? '#fff7ed' : 'white', 
                                                        border: `1px solid ${everPaid ? '#fed7aa' : '#e2e8f0'}`,
                                                        boxShadow: everPaid ? 'none' : '0 2px 4px rgba(0,0,0,0.02)'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                        <div style={{ 
                                                            width: '24px', 
                                                            height: '24px', 
                                                            borderRadius: '6px', 
                                                            background: everPaid ? '#ffedd5' : '#f1f5f9',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        }}>
                                                            {everPaid ? <Check size={14} color="#9a3412" strokeWidth={3} /> : <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#94a3b8' }} />}
                                                        </div>
                                                        <span style={{ fontSize: '0.9rem', fontWeight: '700', color: everPaid ? '#9a3412' : '#1e293b' }}>{h.name}</span>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <div style={{ fontWeight: '800', fontSize: '0.9rem', color: everPaid ? '#9a3412' : '#1e293b' }}>₹{amount.toLocaleString()}</div>
                                                        {everPaid && <span style={{ fontSize: '0.65rem', fontWeight: '800', color: '#9a3412', textTransform: 'uppercase' }}>Fully Paid</span>}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* 3. Transaction History Table */}
                            <h4 style={{ fontSize: '0.9rem', fontWeight: '800', color: '#1e293b', marginBottom: '1rem' }}>Transaction History</h4>
                            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflowY: 'auto', maxHeight: '400px' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ textAlign: 'left', background: '#f1f5f9', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', position: 'sticky', top: 0, zIndex: 1 }}>
                                            <th style={{ padding: '1rem' }}>Receipt</th>
                                            <th style={{ padding: '1rem' }}>Fees Covered</th>
                                            <th style={{ padding: '1rem', textAlign: 'right' }}>Amount</th>
                                            <th style={{ padding: '1rem' }}>Date</th>
                                            <th style={{ padding: '1rem' }}>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {studentHistory.length > 0 ? (
                                            studentHistory.map(r => (
                                                <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '1rem', fontWeight: '700', color: '#2563eb', fontSize: '0.85rem' }}>{r.receiptNo}</td>
                                                    <td style={{ padding: '1rem', fontSize: '0.8rem', color: '#475569', maxWidth: '300px' }}>
                                                        {r.feeHead.includes('==>') ? r.feeHead.split('==>')[1].trim() : r.feeHead}
                                                    </td>
                                                    <td style={{ padding: '1rem', fontWeight: '800', textAlign: 'right', fontSize: '0.85rem' }}>₹{r.paidAmount.toLocaleString()}</td>
                                                    <td style={{ padding: '1rem', fontSize: '0.8rem', color: '#64748b' }}>{r.date}</td>
                                                    <td style={{ padding: '1rem' }}>
                                                        <span style={{ 
                                                            fontSize: '0.6rem', 
                                                            fontWeight: '900', 
                                                            padding: '0.2rem 0.5rem', 
                                                            borderRadius: '10px',
                                                            backgroundColor: r.status === 'APPROVED' ? '#dcfce7' : r.status === 'PENDING' ? '#fef9c3' : '#fee2e2',
                                                            color: r.status === 'APPROVED' ? '#166534' : r.status === 'PENDING' ? '#854d0e' : '#991b1b'
                                                        }}>{r.status}</span>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>No transaction history found.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div style={{ padding: '1.5rem 2rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', background: '#f8fafc' }}>
                            <button onClick={() => setShowHistoryModal(false)} style={{ padding: '0.75rem 2rem', background: '#1e293b', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', transition: '0.2s' }}>Close Dashboard</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Fees;
