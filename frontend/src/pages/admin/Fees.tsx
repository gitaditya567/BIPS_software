import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNotification } from '../../context/NotificationContext';
import { IndianRupee, TrendingUp, CalendarDays, Trash2, Check, AlertCircle, Calendar, Users, Download, CreditCard, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

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
    txnid?: string;
    payuMoneyId?: string;
    gatewayStatus?: string;
    date: string;
    status: 'APPROVED' | 'PENDING' | 'REJECTED';
    submittedBy: string;
    approvedBy?: string;
    approvalDate?: string;
    month?: string;
    year?: string;
    remark?: string;
    session?: {
        name: string;
    };
    sessionName?: string | null;
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
    advancePaid?: number;
    advanceBalance?: number;
    previousSessionDue?: number;
    prevDuePending?: number;
    isRT?: boolean;
    pendingMonths?: string[];
    admissionNo?: string;
    monthlyFeeAmount?: number;
    monthWisePaid?: Record<string, number>;
    oneTimeBreakdown?: { name: string, amount: number }[];
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

const isClass1To8OrPrePrimary = (className: string | null | undefined): boolean => {
    if (!className) return false;
    const name = className.toLowerCase();
    
    // Pre-primary classes
    if (name.includes('nursery') || name.includes('lkg') || name.includes('ukg') || name.includes('kindergarten')) {
        return true;
    }
    
    // Match Class 1 to Class 8
    const match = name.match(/class\s+(\d+)/);
    if (match) {
        const num = parseInt(match[1]);
        if (num >= 1 && num <= 8) {
            return true;
        }
    }
    return false;
};

const isFeeExempt = (
    student: { isRT: boolean; isThirdChild?: boolean; className?: string } | null | undefined,
    head: { name: string; type: string }
): boolean => {
    if (!student) return false;
    const headNameLower = head.name.toLowerCase();
    const isRT = student.isRT || false;
    const isThirdChild = student.isThirdChild || false;
    const isOldStudent = (student as any).isOldStudent || false;

    // Admission Fee & Admission Form Fee are exempt for Old Students
    if (isOldStudent && (headNameLower === 'admission fee' || headNameLower === 'admission form fee' || headNameLower.includes('admission fee') || headNameLower.includes('admission form fee'))) {
        return true;
    }

    // Filter "RTE STUDENTS FEES" - only charged to RTE students
    if (headNameLower.includes('rte students fees')) {
        return !isRT;
    }

    // Filter "third child one time fees" - only charged to Third Child students
    if (headNameLower.includes('third child one time fees')) {
        return !isThirdChild;
    }

    if (head.type && head.type.toLowerCase().includes('month')) {
        // RTE students are exempt from all monthly fees
        if (isRT) {
            return true;
        }
        // Third Child students do NOT pay monthly fees, EXCEPT Computer Class Fee in Nursery-Class 8
        if (isThirdChild) {
            if (headNameLower.includes('computer class fee') && isClass1To8OrPrePrimary(student.className)) {
                return false;
            }
            return true;
        }
    }

    return false;
};

const formatAmount = (val: any) => {
    const num = Number(val);
    if (isNaN(num)) return '0';
    return Math.round(num).toLocaleString('en-IN');
};

const isApproverRole = (role?: string) => {
    if (!role) return false;
    const r = role.toUpperCase();
    return r === 'PRINCIPAL' || r === 'ADMIN' || r === 'SUPERADMIN' || r === 'SUPER_ADMIN' || r === 'SUPERADMINISTRATOR' || r === 'SUPER_ADMINISTRATOR';
};

const isSuperAdminRole = (role?: string) => {
    if (!role) return false;
    const r = role.toUpperCase();
    return r === 'ADMIN' || r === 'SUPERADMIN' || r === 'SUPER_ADMIN' || r === 'SUPERADMINISTRATOR' || r === 'SUPER_ADMINISTRATOR';
};

const Fees: React.FC = () => {
    const navigate = useNavigate();
    const { addNotification } = useNotification();
    const [user, setUser] = useState<{ id: string; role: string; name: string } | null>(null);
    const [activeTab, setActiveTab] = useState<'collection' | 'other_fees' | 'heads' | 'due' | 'structure' | 'reports' | 'approvals' | 'drafts' | 'previous_due'>('collection');
    const [activeReport, setActiveReport] = useState<'daily' | 'monthly' | 'class' | 'pending'>('daily');
    const [showReceipt, setShowReceipt] = useState(false);
    const [selectedReceipt, setSelectedReceipt] = useState<FeeRecord | null>(null);

    // Support ?tab= query parameter in URL (e.g. ?tab=other_fees)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const tabParam = params.get('tab');
        if (tabParam && ['collection', 'other_fees', 'heads', 'due', 'structure', 'reports', 'approvals', 'drafts', 'previous_due'].includes(tabParam)) {
            setActiveTab(tabParam as any);
        }
    }, []);

    // Fee Records State
    const [feeRecords, setFeeRecords] = useState<FeeRecord[]>([]);
    const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0);
    const [studentHistory, setStudentHistory] = useState<FeeRecord[]>([]);
    const [pendingDues, setPendingDues] = useState<number>(0);
    const [feeHeads, setFeeHeads] = useState<FeeHead[]>([]);

    // Modern In-App Alert Dialog State
    const [customAlert, setCustomAlert] = useState<{
        show: boolean;
        title: string;
        message: string;
        type?: 'warning' | 'info' | 'success' | 'error';
        amount?: number;
    } | null>(null);

    const showAppAlert = (title: string, message: string, type: 'warning' | 'info' | 'success' | 'error' = 'info', amount?: number) => {
        setCustomAlert({ show: true, title, message, type, amount });
    };

    // Other Fees State
    const [otherFeeSubTab, setOtherFeeSubTab] = useState<'reg_fee' | 'late_fee' | 'event_fee' | 'other_misc'>('reg_fee');
    const [otherFeeSearchQuery, setOtherFeeSearchQuery] = useState('');
    const [otherFeeShowSearchDropdown, setOtherFeeShowSearchDropdown] = useState(false);
    const [otherFeeStudent, setOtherFeeStudent] = useState<any | null>(null);
    const [otherFeeDate, setOtherFeeDate] = useState(new Date().toISOString().split('T')[0]);
    const [otherFeeStudentName, setOtherFeeStudentName] = useState('');
    const [otherFeeAdmissionNo, setOtherFeeAdmissionNo] = useState('');
    const [otherFeeFatherName, setOtherFeeFatherName] = useState('');
    const [otherFeeClass, setOtherFeeClass] = useState('');
    const [otherFeeAddress, setOtherFeeAddress] = useState('');
    const [otherFeeCategory, setOtherFeeCategory] = useState('Registration Fee');
    const [otherFeeDescription, setOtherFeeDescription] = useState('');
    const [otherFeeAmount, setOtherFeeAmount] = useState('');
    const [otherFeePaymentMode, setOtherFeePaymentMode] = useState<'Cash' | 'PayU'>('Cash');
    const [otherFeeRemark, setOtherFeeRemark] = useState('');
    const [otherFeeSubmitting, setOtherFeeSubmitting] = useState(false);
    const [otherFeeTableSearch, setOtherFeeTableSearch] = useState('');

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

    // Helper functions for Date Filtering in Fee Reports
    const getTodayISO = () => {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };

    const getYesterdayISO = () => {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };

    const formatDisplayDate = (isoDate: string) => {
        if (!isoDate) return '';
        const parts = isoDate.split('-');
        if (parts.length !== 3) return isoDate;
        const dt = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const getTxnDateISO = (d: any): string => {
        if (!d) return '';
        const raw = d.paymentDate || d.createdAt;
        if (raw) {
            const dt = new Date(raw);
            if (!isNaN(dt.getTime())) {
                const y = dt.getFullYear();
                const m = String(dt.getMonth() + 1).padStart(2, '0');
                const day = String(dt.getDate()).padStart(2, '0');
                return `${y}-${m}-${day}`;
            }
        }
        if (d.date) {
            const dt = new Date(d.date);
            if (!isNaN(dt.getTime())) {
                const y = dt.getFullYear();
                const m = String(dt.getMonth() + 1).padStart(2, '0');
                const day = String(dt.getDate()).padStart(2, '0');
                return `${y}-${m}-${day}`;
            }
        }
        return '';
    };

    // Reports State
    const [reportData, setReportData] = useState<{ daily: any[], monthly: any[], classWise: any[] }>({
        daily: [],
        monthly: [],
        classWise: []
    });
    const [reportFilterMonth, setReportFilterMonth] = useState('All');
    const [classReportFilter, setClassReportFilter] = useState('All');

    // Calendar Date Filter State for Daily Fee Reports
    const [reportDateMode, setReportDateMode] = useState<'single' | 'range' | 'all'>('single');
    const [reportStartDate, setReportStartDate] = useState<string>(getTodayISO());
    const [reportEndDate, setReportEndDate] = useState<string>(getTodayISO());

    const getFilteredDailyReports = () => {
        const rawQuery = receiptSearchQuery.trim().toLowerCase();
        const numOnlyQuery = rawQuery.replace(/^rcp/i, '');
        const admSearch = reportAdmissionSearch.trim().toLowerCase();
        const list = reportData.daily || [];

        return list.filter((d: any) => {
            // 1. Admission / Name / Father / Receipt search
            if (admSearch !== '') {
                const sName = (d.studentName || '').toLowerCase();
                const admNo = (d.admissionNo || '').toLowerCase();
                const fName = (d.fatherName || '').toLowerCase();
                const rNo = (d.receiptNo || '').toLowerCase();
                const matches = admNo.includes(admSearch) || sName.includes(admSearch) || fName.includes(admSearch) || rNo.includes(admSearch);
                if (!matches) return false;
            }

            // 2. Receipt No search query
            if (rawQuery !== '') {
                const rNo = (d.receiptNo || '').toLowerCase();
                const sName = (d.studentName || '').toLowerCase();
                const admNo = (d.admissionNo || '').toLowerCase();
                const matches = rNo.includes(rawQuery) || (numOnlyQuery !== '' && rNo.includes(numOnlyQuery)) ||
                                sName.includes(rawQuery) || (numOnlyQuery !== '' && sName.includes(numOnlyQuery)) ||
                                admNo.includes(rawQuery) || (numOnlyQuery !== '' && admNo.includes(numOnlyQuery));
                if (!matches) return false;
            }

            // 3. Date / Calendar Filter
            if (reportDateMode === 'single') {
                const txnDate = getTxnDateISO(d);
                if (txnDate !== reportStartDate) return false;
            } else if (reportDateMode === 'range') {
                const txnDate = getTxnDateISO(d);
                if (reportStartDate && txnDate < reportStartDate) return false;
                if (reportEndDate && txnDate > reportEndDate) return false;
            }

            return true;
        });
    };

    const getCurrentAcademicMonth = () => {
        const currentDate = new Date();
        const currentMonthIdx = currentDate.getMonth();
        const sessionStartMonth = 3; // April
        const monthsElapsed = currentMonthIdx >= sessionStartMonth 
            ? (currentMonthIdx - sessionStartMonth) + 1 
            : (currentMonthIdx + 12 - sessionStartMonth) + 1;
        const academicMonths = ['April','May','June','July','August','September','October','November','December','January','February','March'];
        return academicMonths[Math.min(11, Math.max(0, monthsElapsed - 1))];
    };

    const [pendingClassFilter, setPendingClassFilter] = useState('All');
    const [prevDueClassFilter, setPrevDueClassFilter] = useState('All');
    const [dueClassFilter, setDueClassFilter] = useState('Nursery');
    const [dueMonthFilter, setDueMonthFilter] = useState(getCurrentAcademicMonth());
    const [dueSearchQuery, setDueSearchQuery] = useState('');
    const [prevDueSearchQuery, setPrevDueSearchQuery] = useState('');
    const [receiptSearchQuery, setReceiptSearchQuery] = useState('');
    const [selectedStudentForHistory] = useState<any>(null);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [showTransactionDetailsModal, setShowTransactionDetailsModal] = useState(false);
    const [reportAdmissionSearch, setReportAdmissionSearch] = useState('');
    const [studentLedger, setStudentLedger] = useState<any | null>(null);
    const [loadingLedger, setLoadingLedger] = useState(false);
    const [dueRtFilter, setDueRtFilter] = useState('All');
    const [dueStatusFilter, setDueStatusFilter] = useState('All');
    const [dueFeeTypeFilter, setDueFeeTypeFilter] = useState('Monthly Only');
    const [dueCalculationMode, setDueCalculationMode] = useState<'cumulative' | 'single'>('cumulative');
    const [dueView, setDueView] = useState<'general' | 'transport'>('general');

    useEffect(() => {
        if (dueView === 'transport' && dueFeeTypeFilter === 'One-time Only') {
            setDueFeeTypeFilter('Monthly Only');
        }
    }, [dueView, dueFeeTypeFilter]);
    const [transportDues, setTransportDues] = useState<any[]>([]);
    const [loadingTransportDues, setLoadingTransportDues] = useState(false);
    const [remark, setRemark] = useState('');
    const [submitting, setSubmitting] = useState(false);

    /* Temporary Upload State - Disabled
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [uploadReport, setUploadReport] = useState<any>(null);
    */

    const calculateDynamicDues = (fee: any, selectedMonthFilter: string) => {
        const allMonths = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];
        
        let monthsToCalculate = 0;
        let selectedMonthIndex = -1;
        if (selectedMonthFilter !== 'All' && allMonths.includes(selectedMonthFilter)) {
            selectedMonthIndex = allMonths.indexOf(selectedMonthFilter);
            monthsToCalculate = selectedMonthIndex + 1;
        } else {
            const currentDate = new Date();
            const currentMonth = currentDate.getMonth();
            const sessionStartMonth = 3;
            if (currentMonth >= sessionStartMonth) {
                monthsToCalculate = (currentMonth - sessionStartMonth) + 1;
            } else {
                monthsToCalculate = (currentMonth + 12 - sessionStartMonth) + 1;
            }
            monthsToCalculate = Math.min(12, Math.max(1, monthsToCalculate));
        }

        const prevBalance = fee.previousSessionDue || 0;
        const expectedOneTime = fee.isRT ? 0 : (fee.expectedOneTime || 0);
        const monthlyFee = fee.isRT ? 0 : (fee.monthlyFeeAmount || 0);

        const actualOneTimePaid = fee.actualOneTimePaid ?? 0;
        const actualMonthlyPaid = fee.actualMonthlyPaid ?? 0;
        const actualPrevDuesPaid = fee.actualPrevDuesPaid ?? 0;

        const pendingOneTime = Math.max(0, expectedOneTime - actualOneTimePaid);
        const adjustedPrevBalance = Math.max(0, prevBalance - actualPrevDuesPaid);

        const cumulativeMonthlyExpected = monthlyFee * monthsToCalculate;
        const fullSessionMonthlyExpected = monthlyFee * 12;

        const pendingMonthly = Math.max(0, cumulativeMonthlyExpected - actualMonthlyPaid);

        const totalPayableNow = adjustedPrevBalance + pendingOneTime + pendingMonthly;
        const fullSessionPayable = adjustedPrevBalance + expectedOneTime + fullSessionMonthlyExpected;

        // Month-wise breakdown & arrears calculation
        const unpaidMonthsList: string[] = [];
        let prevMonthsArrears = 0;
        let selectedMonthExpected = 0;
        let selectedMonthPaid = 0;
        let selectedMonthDue = 0;

        for (let i = 0; i < monthsToCalculate; i++) {
            const m = allMonths[i];
            const rawPaidForMonth = fee.monthWisePaid?.[m] || 0;
            const paidForMonth = Math.min(monthlyFee, rawPaidForMonth);
            const dueForMonth = Math.max(0, monthlyFee - paidForMonth);

            if (dueForMonth > 0) {
                unpaidMonthsList.push(m);
            }

            if (selectedMonthIndex !== -1) {
                if (i < selectedMonthIndex) {
                    prevMonthsArrears += dueForMonth;
                } else if (i === selectedMonthIndex) {
                    selectedMonthExpected = monthlyFee;
                    selectedMonthPaid = paidForMonth;
                    selectedMonthDue = dueForMonth;
                }
            }
        }

        const totalCumulativeDueTillMonth = prevMonthsArrears + selectedMonthDue;

        let pendingDetailsParts = [];
        if (adjustedPrevBalance > 0) pendingDetailsParts.push('Old Dues');
        if (pendingOneTime > 0) pendingDetailsParts.push('Admission/Annual Fees');
        if (unpaidMonthsList.length > 0) pendingDetailsParts.push(unpaidMonthsList.join(', '));
        
        const pendingDetailsText = pendingDetailsParts.length > 0 ? pendingDetailsParts.join(' + ') : 'None';

        return {
            prevBalance: adjustedPrevBalance,
            expectedOneTime,
            paidTowardsOneTime: actualOneTimePaid,
            pendingOneTime,
            monthsToCalculate,
            cumulativeMonthlyExpected,
            fullSessionMonthlyExpected,
            paidTowardsMonthly: actualMonthlyPaid,
            pendingMonthly,
            totalPayableNow,
            fullSessionPayable,
            unpaidMonthsList,
            pendingDetailsText,
            prevMonthsArrears,
            selectedMonthExpected,
            selectedMonthPaid,
            selectedMonthDue,
            totalCumulativeDueTillMonth
        };
    };

    const getFilteredDues = (sourceList: any[]) => {
        return sourceList
            .filter(f => dueClassFilter === 'All' || f.className?.trim() === dueClassFilter.trim())
            .filter(f => {
                if (dueRtFilter === 'All') return true;
                if (dueRtFilter === 'RT') return !!f.isRT;
                return !f.isRT;
            })
            .filter(f => {
                if (dueSearchQuery === '') return true;
                const query = dueSearchQuery.toLowerCase();
                return (f.studentName || '').toLowerCase().includes(query) || 
                       (f.admissionNo || '').toLowerCase().includes(query) ||
                       (f.fatherName || '').toLowerCase().includes(query);
            })
            .filter(f => {
                const effectiveMonth = dueCalculationMode === 'cumulative' ? getCurrentAcademicMonth() : dueMonthFilter;
                const isMonthSelected = effectiveMonth !== 'All';
                const dyn = calculateDynamicDues(f, effectiveMonth);

                let expected = 0;
                let paid = 0;
                let pending = 0;

                if (isMonthSelected) {
                    if (dueFeeTypeFilter === 'One-time Only') {
                        expected = dyn.expectedOneTime;
                        paid = f.actualOneTimePaid || 0;
                        pending = dyn.pendingOneTime;
                    } else if (dueCalculationMode === 'cumulative') {
                        expected = dyn.cumulativeMonthlyExpected;
                        paid = dyn.cumulativeMonthlyExpected - dyn.totalCumulativeDueTillMonth;
                        pending = dyn.totalCumulativeDueTillMonth;
                    } else {
                        expected = dyn.selectedMonthExpected;
                        paid = dyn.selectedMonthPaid;
                        pending = dyn.selectedMonthDue;
                    }
                } else {
                    if (dueFeeTypeFilter === 'Monthly Only') {
                        expected = dyn.cumulativeMonthlyExpected;
                        paid = f.actualMonthlyPaid || 0;
                        pending = dyn.pendingMonthly;
                    } else if (dueFeeTypeFilter === 'One-time Only') {
                        expected = dyn.expectedOneTime;
                        paid = f.actualOneTimePaid || 0;
                        pending = dyn.pendingOneTime;
                    } else {
                        expected = (f.previousSessionDue || 0) + dyn.expectedOneTime + dyn.fullSessionMonthlyExpected;
                        paid = (f.actualPrevDuesPaid || 0) + (f.actualOneTimePaid || 0) + (f.actualMonthlyPaid || 0);
                        pending = dyn.totalPayableNow;
                    }
                }

                if (dueStatusFilter === 'Paid') {
                    return pending === 0;
                } else if (dueStatusFilter === 'Unpaid') {
                    return paid === 0 && expected > 0;
                } else if (dueStatusFilter === 'Partially Paid') {
                    return paid > 0 && pending > 0;
                } else if (dueStatusFilter === 'Any Outstanding') {
                    return pending > 0;
                }
                return true;
            });
    };


    const downloadStudentStatementExcel = (ledger: any) => {
        if (!ledger) return;
        
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Account Statement');
        
        // 1. Title Block
        worksheet.mergeCells('A1:H1');
        worksheet.getCell('A1').value = 'BIPS SENIOR SECONDARY SCHOOL';
        worksheet.getCell('A1').font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
        worksheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
        worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.getRow(1).height = 40;

        worksheet.mergeCells('A2:H2');
        worksheet.getCell('A2').value = 'OFFICIAL STATEMENT OF ACCOUNT / LEDGER';
        worksheet.getCell('A2').font = { size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        worksheet.getCell('A2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF475569' } };
        worksheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.getRow(2).height = 25;

        // Generated timestamp
        worksheet.mergeCells('A3:H3');
        const activeSessionStr = localStorage.getItem('activeSession') || '2024-2025';
        worksheet.getCell('A3').value = `Generated on: ${new Date().toLocaleString('en-GB')} | Academic Session: ${activeSessionStr}`;
        worksheet.getCell('A3').font = { size: 9, italic: true, color: { argb: 'FF64748B' } };
        worksheet.getCell('A3').alignment = { horizontal: 'center' };

        // 2. Student & Parent Profile Block
        worksheet.getCell('A5').value = 'Student Profile Details';
        worksheet.getCell('A5').font = { bold: true, size: 11, color: { argb: 'FF1E293B' } };
        
        worksheet.getCell('A6').value = 'Student Name:';
        worksheet.getCell('B6').value = ledger.student?.name || 'N/A';
        worksheet.getCell('B6').font = { bold: true };
        
        worksheet.getCell('A7').value = 'Admission No:';
        worksheet.getCell('B7').value = ledger.student?.admissionNo || 'N/A';
        worksheet.getCell('B7').font = { bold: true };

        worksheet.getCell('A8').value = 'Class / Grade:';
        worksheet.getCell('B8').value = ledger.student?.className || 'N/A';
        worksheet.getCell('B8').font = { bold: true };

        worksheet.getCell('C6').value = "Father's Name:";
        worksheet.getCell('D6').value = ledger.student?.fatherName || 'N/A';
        worksheet.getCell('D6').font = { bold: true };

        worksheet.getCell('C7').value = 'Transport Stop:';
        worksheet.getCell('D7').value = ledger.student?.transportStop !== 'N/A' ? ledger.student?.transportStop : 'None (Self-Transport)';
        worksheet.getCell('D7').font = { bold: true };

        worksheet.getCell('C8').value = 'RTE Student:';
        worksheet.getCell('D8').value = ledger.student?.isRT ? 'Yes (Exempt)' : 'No (Regular)';
        worksheet.getCell('D8').font = { bold: true };

        // Summary Box
        worksheet.getCell('F5').value = 'Ledger Summary';
        worksheet.getCell('F5').font = { bold: true, size: 11, color: { argb: 'FF059669' } };

        worksheet.getCell('F6').value = 'Total Expected (Year):';
        worksheet.getCell('G6').value = ledger.summary?.totalExpectedWholeYear || 0;
        worksheet.getCell('G6').numFmt = '₹#,##0.00';
        worksheet.getCell('G6').font = { bold: true };

        worksheet.getCell('F7').value = 'Total Paid (All Time):';
        worksheet.getCell('G7').value = ledger.summary?.totalPaidAllTime || 0;
        worksheet.getCell('G7').numFmt = '₹#,##0.00';
        worksheet.getCell('G7').font = { bold: true, color: { argb: 'FF059669' } };

        worksheet.getCell('F8').value = 'Total Concessions:';
        const totalConcessions = ledger.payments?.reduce((sum: number, p: any) => sum + (p.discount || 0), 0) || 0;
        worksheet.getCell('G8').value = totalConcessions;
        worksheet.getCell('G8').numFmt = '₹#,##0.00';
        worksheet.getCell('G8').font = { bold: true, color: { argb: 'FFD97706' } };

        worksheet.getCell('F9').value = 'Net Outstanding:';
        worksheet.getCell('G9').value = ledger.summary?.netOutstanding || 0;
        worksheet.getCell('G9').numFmt = '₹#,##0.00';
        worksheet.getCell('G9').font = { bold: true, color: { argb: 'FFEF4444' } };

        // Table headers
        const tableHeaderRow = 11;
        worksheet.getRow(tableHeaderRow).values = [
            'Date',
            'Particulars / Transaction Description',
            'Receipt No.',
            'Type',
            'Debit (Billed) (Dr.)',
            'Credit (Paid) (Cr.)',
            'Discount/Concession (Cr.)',
            'Running Balance'
        ];
        worksheet.getRow(tableHeaderRow).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        worksheet.getRow(tableHeaderRow).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF475569' } };
        worksheet.getRow(tableHeaderRow).alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.getRow(tableHeaderRow).height = 25;

        interface LedgerEvent {
            date: Date;
            dateStr: string;
            description: string;
            receiptNo: string;
            type: string;
            debit: number;
            credit: number;
            discount: number;
        }
        
        const events: LedgerEvent[] = [];

        // A. Opening/Previous dues (April 1, 2024)
        if (ledger.summary?.previousSessionDue > 0) {
            events.push({
                date: new Date('2024-04-01T00:00:00.000Z'),
                dateStr: '01/04/2024',
                description: 'Previous Academic Session Pending Dues (Opening Balance)',
                receiptNo: '-',
                type: 'Opening Dues',
                debit: ledger.summary?.previousSessionDue,
                credit: 0,
                discount: 0
            });
        }

        // B. One-Time/Annual Fees expected (April 1, 2024)
        ledger.oneTimeStatus?.forEach((ot: any) => {
            events.push({
                date: new Date('2024-04-01T00:01:00.000Z'),
                dateStr: '01/04/2024',
                description: `Billed: ${ot.name}`,
                receiptNo: '-',
                type: 'One-Time Fee',
                debit: ot.amount,
                credit: 0,
                discount: 0
            });
        });

        // C. Monthly Fees expected (1st of each month)
        const months = ['April','May','June','July','August','September','October','November','December','January','February','March'];
        const struct = feeStructure.find((s: any) => s.className === ledger.student?.className);
        const regularMonthlyFee = feeHeads.filter((h: any) => h.type === 'Monthly' && (struct?.fees?.[h.name] || 0) > 0);
        
        months.forEach((m, mIndex) => {
            const year = mIndex < 9 ? 2024 : 2025;
            const monthNumber = mIndex < 9 ? mIndex + 3 : mIndex - 9;
            const billingDate = new Date(year, monthNumber, 1);
            
            regularMonthlyFee.forEach((f: any) => {
                const amount = ledger.student?.isRT ? 0 : (struct?.fees?.[f.name] || 0);
                if (amount > 0) {
                    events.push({
                        date: billingDate,
                        dateStr: `01/${(monthNumber + 1).toString().padStart(2, '0')}/${year}`,
                        description: `Billed: Monthly ${f.name} (${m})`,
                        receiptNo: '-',
                        type: 'Monthly Fee',
                        debit: amount,
                        credit: 0,
                        discount: 0
                    });
                }
            });

            if (ledger.student?.transportFare > 0) {
                events.push({
                    date: new Date(year, monthNumber, 1, 0, 1),
                    dateStr: `01/${(monthNumber + 1).toString().padStart(2, '0')}/${year}`,
                    description: `Billed: Monthly Transport Fare (${m})`,
                    receiptNo: '-',
                    type: 'Transport Fee',
                    debit: ledger.student?.transportFare,
                    credit: 0,
                    discount: 0
                });
            }
        });

        // D. Payments/Concessions (Approved Receipts)
        ledger.payments?.forEach((p: any) => {
            const payDate = new Date(p.paymentDate);
            const day = payDate.getDate().toString().padStart(2, '0');
            const month = (payDate.getMonth() + 1).toString().padStart(2, '0');
            const yr = payDate.getFullYear();
            
            events.push({
                date: payDate,
                dateStr: `${day}/${month}/${yr}`,
                description: `Payment Received | Mode: ${p.paymentMode || 'Cash'} ${p.remark ? `(${p.remark})` : ''}`,
                receiptNo: p.receiptNo || 'N/A',
                type: 'Receipt Credit',
                debit: 0,
                credit: p.amountPaid || 0,
                discount: p.discount || 0
            });
        });

        // Sort all events chronologically
        events.sort((a, b) => a.date.getTime() - b.date.getTime());

        let runningBalance = 0;
        let currentRow = tableHeaderRow + 1;
        const borderThin = { style: 'thin' as const, color: { argb: 'FFE2E8F0' } };

        events.forEach((evt) => {
            runningBalance += evt.debit - evt.credit - evt.discount;

            worksheet.getRow(currentRow).values = [
                evt.dateStr,
                evt.description,
                evt.receiptNo,
                evt.type,
                evt.debit === 0 ? '-' : evt.debit,
                evt.credit === 0 ? '-' : evt.credit,
                evt.discount === 0 ? '-' : evt.discount,
                runningBalance
            ];

            worksheet.getCell(`A${currentRow}`).alignment = { horizontal: 'center' };
            worksheet.getCell(`C${currentRow}`).alignment = { horizontal: 'center' };
            worksheet.getCell(`D${currentRow}`).alignment = { horizontal: 'center' };
            
            if (evt.debit > 0) {
                worksheet.getCell(`E${currentRow}`).numFmt = '₹#,##0.00';
                worksheet.getCell(`E${currentRow}`).font = { color: { argb: 'FF334155' } };
            }
            if (evt.credit > 0) {
                worksheet.getCell(`F${currentRow}`).numFmt = '₹#,##0.00';
                worksheet.getCell(`F${currentRow}`).font = { color: { argb: 'FF059669' }, bold: true };
            }
            if (evt.discount > 0) {
                worksheet.getCell(`G${currentRow}`).numFmt = '₹#,##0.00';
                worksheet.getCell(`G${currentRow}`).font = { color: { argb: 'FFD97706' } };
            }
            
            worksheet.getCell(`H${currentRow}`).numFmt = '₹#,##0.00';
            worksheet.getCell(`H${currentRow}`).font = { bold: true, color: { argb: runningBalance > 0 ? 'FFEF4444' : 'FF059669' } };

            if (evt.credit > 0) {
                worksheet.getRow(currentRow).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };
            }

            for (let c = 1; c <= 8; c++) {
                worksheet.getRow(currentRow).getCell(c).border = {
                    top: borderThin,
                    bottom: borderThin,
                    left: borderThin,
                    right: borderThin
                };
            }

            currentRow++;
        });

        // Set column widths
        worksheet.getColumn('A').width = 12;
        worksheet.getColumn('B').width = 45;
        worksheet.getColumn('C').width = 15;
        worksheet.getColumn('D').width = 15;
        worksheet.getColumn('E').width = 18;
        worksheet.getColumn('F').width = 18;
        worksheet.getColumn('G').width = 18;
        worksheet.getColumn('H').width = 20;

        workbook.xlsx.writeBuffer().then((buffer) => {
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            const session = localStorage.getItem('activeSession') || '2024-2025';
            link.setAttribute("download", `Statement_of_Account_${ledger.student?.name?.replace(/\s+/g, '_')}_${ledger.student?.admissionNo}_${session}.xlsx`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    };

    const fetchReports = async () => {
        try {
            const session = localStorage.getItem('activeSession') || '2026-2027';
            const res = await axios.get(`/erp-api/fees/reports?session=${session}`);
            setReportData(res.data);
        } catch (err) {
            console.error("Failed to fetch reports");
        }
    };

    const handleDeleteReceipt = async (id: string, receiptNo: string) => {
        if (!isSuperAdminRole(user?.role)) {
            showAppAlert('Permission Denied', 'Only Super Admin can delete fee receipts.', 'error');
            return;
        }

        if (!window.confirm(`Are you sure you want to permanently delete receipt "${receiptNo || id}"?\n\nThis will remove the payment record and update fee balances and reports. This action cannot be undone.`)) return;
        try {
            const token = localStorage.getItem('token');
            const res = await axios.delete(`/erp-api/fees/${id}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            if (res.data && (res.data.success || !res.data.error)) {
                showAppAlert('Receipt Deleted', `Receipt ${receiptNo || ''} has been permanently deleted.`, 'success');
                addNotification('fee', 'Receipt Deleted', `Receipt ${receiptNo || ''} deleted.`);
                
                // Refresh local records and reports
                setReportData(prev => ({
                    ...prev,
                    daily: prev.daily.filter((d: any) => d.id !== id && d.receiptNo !== receiptNo)
                }));
                setFeeRecords(prev => prev.filter(r => r.id !== id && r.receiptNo !== receiptNo));
                fetchAllHistory();
                fetchReports();
                fetchDueFees();
                fetchPendingApprovals();
            } else {
                showAppAlert('Delete Failed', res.data.error || 'Failed to delete receipt.', 'error');
            }
        } catch (err: any) {
            console.error(err);
            const errMsg = err.response?.data?.error || err.message || 'Failed to delete fee receipt';
            showAppAlert('Delete Failed', errMsg, 'error');
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
        const activeSessionStr = localStorage.getItem('activeSession') || '2024-2025';

        let reportName = "";
        let head: any[] = [];
        let body: any[] = [];
        let summaryHead: any[] = [];
        let summaryBody: any[] = [];

        if (activeReport === 'daily') {
            const rawQuery = receiptSearchQuery.trim().toLowerCase();
            const filtered = getFilteredDailyReports();
            
            let dateLabel = '';
            if (rawQuery !== '') {
                dateLabel = `Search Collection Report`;
            } else if (reportDateMode === 'single') {
                dateLabel = `Daily Collection Report (${formatDisplayDate(reportStartDate)})`;
            } else if (reportDateMode === 'range') {
                dateLabel = `Collection Report (${formatDisplayDate(reportStartDate)} to ${formatDisplayDate(reportEndDate)})`;
            } else {
                dateLabel = `Complete Collection Report (All Dates)`;
            }
            reportName = dateLabel;
            head = [['S.No.', 'Date', 'Student Name', 'Father Name', 'Class', 'Receipt No', 'Payment Mode', 'Amount (₹)']];
            
            body = filtered.map((d, index) => {
                const isOnline = (d.paymentMode || '').toLowerCase().includes('payu') || (d.paymentMode || '').toLowerCase().includes('online');
                return [index + 1, d.date, d.studentName, d.fatherName || 'N/A', d.className, d.receiptNo, isOnline ? 'Online (PayU)' : 'Cash', `₹${(d.paidAmount || 0).toLocaleString('en-IN')}`];
            });
            
            // Calculate totals and counts for Cash, Online, and Grand Total
            const cashFiltered = filtered.filter(d => !(d.paymentMode || '').toLowerCase().includes('payu') && !(d.paymentMode || '').toLowerCase().includes('online'));
            const onlineFiltered = filtered.filter(d => (d.paymentMode || '').toLowerCase().includes('payu') || (d.paymentMode || '').toLowerCase().includes('online'));
            
            const cashCount = cashFiltered.length;
            const onlineCount = onlineFiltered.length;
            const cashTotal = cashFiltered.reduce((s, d) => s + (d.paidAmount || 0), 0);
            const onlineTotal = onlineFiltered.reduce((s, d) => s + (d.paidAmount || 0), 0);
            const total = filtered.reduce((s, d) => s + (d.paidAmount || 0), 0);

            // Separate Top Executive Summary Table
            const reportDateSummaryStr = reportDateMode === 'single' ? formatDisplayDate(reportStartDate) : reportDateMode === 'range' ? `${formatDisplayDate(reportStartDate)} - ${formatDisplayDate(reportEndDate)}` : 'All Dates';
            summaryHead = [['REPORT DATE / PERIOD', 'TOTAL RECEIPTS', 'CASH TOTAL (₹)', 'ONLINE TOTAL (₹)', 'GRAND TOTAL (₹)']];
            summaryBody = [[
                reportDateSummaryStr,
                `${filtered.length} Receipt(s)\n(Cash: ${cashCount} | Online: ${onlineCount})`,
                `₹${cashTotal.toLocaleString('en-IN')}`,
                `₹${onlineTotal.toLocaleString('en-IN')}`,
                `₹${total.toLocaleString('en-IN')}`
            ]];

            // Add Cash Total, Online Total, and Grand Total rows
            body.push([{ content: 'Cash Collection Total:', colSpan: 7, styles: { halign: 'right', fontStyle: 'bold', textColor: [51, 65, 85] } }, { content: `₹${cashTotal.toLocaleString('en-IN')}`, styles: { fontStyle: 'bold', textColor: [51, 65, 85] } }]);
            body.push([{ content: 'Online (PayU) Collection Total:', colSpan: 7, styles: { halign: 'right', fontStyle: 'bold', textColor: [4, 120, 87] } }, { content: `₹${onlineTotal.toLocaleString('en-IN')}`, styles: { fontStyle: 'bold', textColor: [4, 120, 87] } }]);
            body.push([{ content: 'GRAND TOTAL:', colSpan: 7, styles: { halign: 'right', fontStyle: 'bold', fillColor: [241, 245, 249] } }, { content: `₹${total.toLocaleString('en-IN')}`, styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }]);
        } else if (activeReport === 'monthly') {
            reportName = `Monthly Collection Fee Report (${reportFilterMonth === 'All' ? 'April to March' : reportFilterMonth})`;
            head = [['S.No.', 'Month', 'Academic Session', 'Total Collection (₹)']];
            const academicMonths = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];
            const filteredMonths = academicMonths.map(m => {
                const found = (reportData.monthly || []).find((rec: any) => rec.month?.trim().toLowerCase() === m.toLowerCase());
                return {
                    month: m,
                    year: found ? found.year : activeSessionStr,
                    total: found ? found.total : 0
                };
            }).filter(m => reportFilterMonth === 'All' || m.month.toLowerCase() === reportFilterMonth.toLowerCase());

            body = filteredMonths.map((m, idx) => [idx + 1, m.month, m.year, `₹${m.total.toLocaleString('en-IN')}`]);
            
            // Add Grand Total row
            const total = filteredMonths.reduce((s, m) => s + m.total, 0);
            body.push([{ content: 'GRAND TOTAL:', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold', fillColor: [241, 245, 249] } }, { content: `₹${total.toLocaleString('en-IN')}`, styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }]);
        } else if (activeReport === 'class') {
            reportName = "Class-wise Fee Collection";
            head = [['Class', 'Students Paid', 'Collected (₹)']];
            body = reportData.classWise.map(c => [c.className, c.students, `₹${c.total.toLocaleString('en-IN')}`]);
        } else if (activeReport === 'pending') {
            const effectiveMonth = dueCalculationMode === 'cumulative' ? getCurrentAcademicMonth() : dueMonthFilter;
            const allAcademicMonths = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];
            const targetIdx = allAcademicMonths.indexOf(effectiveMonth);
            const monthsList = targetIdx !== -1 ? allAcademicMonths.slice(0, targetIdx + 1) : allAcademicMonths.slice(0, 5);

            reportName = dueCalculationMode === 'cumulative'
                ? `Outstanding Dues Report (Carry Forward - Till ${effectiveMonth})`
                : "Outstanding Dues Report";
            if (pendingClassFilter !== 'All') reportName += ` - ${pendingClassFilter}`;
            if (dueCalculationMode !== 'cumulative' && dueMonthFilter !== 'All') reportName += ` (${dueMonthFilter})`;

            const filtered = getFilteredDues(dueFees);

            if (dueCalculationMode === 'cumulative') {
                head = [['S.No.', 'Student Name', 'Adm No', 'Class', 'Prev Due', ...monthsList.map(m => m.slice(0, 3)), `Total Due (Till ${effectiveMonth.slice(0, 3)})`, 'Status']];
                body = filtered.map((f, idx) => {
                    const dyn = calculateDynamicDues(f, effectiveMonth);
                    const monthlyRate = f.isRT ? 0 : (f.monthlyFeeAmount || 0);
                    const prevDue = Math.max(0, (f.previousSessionDue || 0) - (f.actualPrevDuesPaid || 0));
                    const totalDue = prevDue + dyn.totalCumulativeDueTillMonth;

                    let status = "Unpaid";
                    if (monthlyRate === 0 && prevDue === 0) status = f.isRT ? "RT" : "-";
                    else if (totalDue === 0) status = "Paid";
                    else if ((f.actualMonthlyPaid || 0) > 0 || (f.actualPrevDuesPaid || 0) > 0) status = "Partial";

                    const monthCols = monthsList.map(m => {
                        const paid = Math.min(monthlyRate, f.monthWisePaid?.[m] || 0);
                        return `₹${Math.max(0, monthlyRate - paid).toLocaleString('en-IN')}`;
                    });

                    return [
                        idx + 1,
                        f.studentName,
                        f.admissionNo,
                        f.className,
                        `₹${prevDue.toLocaleString('en-IN')}`,
                        ...monthCols,
                        `₹${totalDue.toLocaleString('en-IN')}`,
                        status
                    ];
                });

                const total = filtered.reduce((s, f) => {
                    const dyn = calculateDynamicDues(f, effectiveMonth);
                    const prevDue = Math.max(0, (f.previousSessionDue || 0) - (f.actualPrevDuesPaid || 0));
                    return s + prevDue + dyn.totalCumulativeDueTillMonth;
                }, 0);
                body.push([{ content: 'GRAND TOTAL:', colSpan: 4 + monthsList.length, styles: { halign: 'right', fontStyle: 'bold' } }, { content: `₹${total.toLocaleString('en-IN')}`, styles: { fontStyle: 'bold' } }, { content: '', styles: {} }]);
            } else {
                const isMonthFiltered = dueMonthFilter !== 'All';
                head = [['Student Name', 'Adm No', 'Class', isMonthFiltered ? 'Month Due (₹)' : 'Pending Months', 'Total Due (₹)']];
                body = filtered.map(f => {
                    const dyn = calculateDynamicDues(f, dueMonthFilter);
                    return [
                        f.studentName,
                        f.admissionNo,
                        f.className,
                        isMonthFiltered ? `₹${dyn.selectedMonthDue.toLocaleString('en-IN')}` : (dyn.unpaidMonthsList?.join(', ') || 'None'),
                        `₹${(isMonthFiltered ? dyn.totalCumulativeDueTillMonth : dyn.totalPayableNow).toLocaleString('en-IN')}`
                    ];
                });

                const total = filtered.reduce((s, f) => {
                    const dyn = calculateDynamicDues(f, dueMonthFilter);
                    return s + (isMonthFiltered ? dyn.totalCumulativeDueTillMonth : dyn.totalPayableNow);
                }, 0);
                body.push([{ content: 'GRAND TOTAL:', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } }, { content: `₹${total.toLocaleString('en-IN')}`, styles: { fontStyle: 'bold' } }]);
            }
        }

        // Header Section (Clean, non-overlapping vertical Y alignment)
        doc.setFontSize(15);
        doc.setFont("helvetica", "bold");
        doc.text("BIPS SENIOR SECONDARY SCHOOL", 14, 13);

        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(reportName, 14, 20);

        doc.setFontSize(8.5);
        doc.setFont("helvetica", "normal");
        doc.text(`Generated on: ${new Date().toLocaleString()} | Academic Session: ${activeSessionStr}`, 14, 26);

        if (activeReport === 'daily' && summaryHead.length > 0) {
            // 1. Render Top Executive Summary Table
            autoTable(doc, {
                startY: 31,
                head: summaryHead,
                body: summaryBody,
                theme: 'grid',
                headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold', halign: 'center' },
                bodyStyles: { fontStyle: 'bold', halign: 'center', fontSize: 9.5 },
                columnStyles: {
                    2: { textColor: [51, 65, 85] },
                    3: { textColor: [4, 120, 87] },
                    4: { textColor: [30, 41, 59], fillColor: [241, 245, 249] }
                }
            });

            // 2. Render Main Receipts Table below summary table
            autoTable(doc, {
                startY: (doc as any).lastAutoTable.finalY + 8,
                head: head,
                body: body,
                theme: 'grid',
                headStyles: { fillColor: [79, 70, 229], textColor: 255 },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                margin: { top: 20 },
                didParseCell: function (data) {
                    if (data.section === 'body' && Array.isArray(data.row.raw)) {
                        const modeCell = String(data.row.raw[6] || '').toLowerCase();
                        if (modeCell.includes('online') || modeCell.includes('payu')) {
                            data.cell.styles.fillColor = [236, 253, 245];
                            data.cell.styles.textColor = [4, 120, 87];
                            data.cell.styles.fontStyle = 'bold';
                        }
                    }
                }
            });
        } else {
            autoTable(doc, {
                startY: 32,
                head: head,
                body: body,
                theme: 'grid',
                headStyles: { fillColor: [79, 70, 229], textColor: 255 },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                margin: { top: 20 }
            });
        }

        doc.save(`${reportName.replace(/ /g, '_')}_${activeSessionStr}_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const exportDailyToExcel = async () => {
        const filtered = getFilteredDailyReports();
        const activeSessionStr = localStorage.getItem('activeSession') || '2024-2025';
        const dateStr = reportDateMode === 'single' ? formatDisplayDate(reportStartDate) : reportDateMode === 'range' ? `${formatDisplayDate(reportStartDate)}_to_${formatDisplayDate(reportEndDate)}` : 'All_Dates';

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Daily Collection');

        worksheet.columns = [
            { header: 'S.No.', key: 'sno', width: 8 },
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Student Name', key: 'studentName', width: 25 },
            { header: 'Admission No', key: 'admNo', width: 16 },
            { header: 'Father Name', key: 'fatherName', width: 22 },
            { header: 'Class', key: 'class', width: 14 },
            { header: 'Receipt No', key: 'receiptNo', width: 18 },
            { header: 'Payment Mode', key: 'paymentMode', width: 16 },
            { header: 'Amount (₹)', key: 'amount', width: 18 }
        ];

        worksheet.insertRow(1, [`BIPS SENIOR SECONDARY SCHOOL | Fee Collection Report (${dateStr.replace(/_/g, ' ')}) | Session: ${activeSessionStr}`]);
        worksheet.insertRow(2, []);

        worksheet.mergeCells('A1:I1');
        worksheet.getRow(1).font = { bold: true, size: 12, color: { argb: 'FF1F2937' } };
        worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'left' };

        worksheet.getRow(3).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        worksheet.getRow(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
        worksheet.getRow(3).alignment = { vertical: 'middle', horizontal: 'center' };

        filtered.forEach((d: any, idx: number) => {
            const isOnline = (d.paymentMode || '').toLowerCase().includes('payu') || (d.paymentMode || '').toLowerCase().includes('online');
            const row = worksheet.addRow({
                sno: idx + 1,
                date: d.date,
                studentName: d.studentName || 'Unknown',
                admNo: d.admissionNo || 'N/A',
                fatherName: d.fatherName || 'N/A',
                class: d.className || 'Unknown',
                receiptNo: d.receiptNo || 'N/A',
                paymentMode: isOnline ? 'Online (PayU)' : 'Cash',
                amount: d.paidAmount || 0
            });
            if (isOnline) {
                row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } };
            }
        });

        // Totals
        const total = filtered.reduce((s: number, d: any) => s + (d.paidAmount || 0), 0);
        const cashTotal = filtered.filter((d: any) => !(d.paymentMode || '').toLowerCase().includes('payu') && !(d.paymentMode || '').toLowerCase().includes('online')).reduce((s: number, d: any) => s + (d.paidAmount || 0), 0);
        const onlineTotal = filtered.filter((d: any) => (d.paymentMode || '').toLowerCase().includes('payu') || (d.paymentMode || '').toLowerCase().includes('online')).reduce((s: number, d: any) => s + (d.paidAmount || 0), 0);

        worksheet.addRow({});
        const cashRow = worksheet.addRow({ receiptNo: 'Cash Total:', amount: cashTotal });
        cashRow.font = { bold: true };
        const onlineRow = worksheet.addRow({ receiptNo: 'Online Total:', amount: onlineTotal });
        onlineRow.font = { bold: true, color: { argb: 'FF047857' } };
        const grandRow = worksheet.addRow({ receiptNo: 'GRAND TOTAL:', amount: total });
        grandRow.font = { bold: true };
        grandRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `Fee_Collection_Report_${dateStr}_${new Date().toISOString().split('T')[0]}.xlsx`);
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
    const [isOldStudent, setIsOldStudent] = useState(false);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedFees, setSelectedFees] = useState<string[]>([]);
    const currentMonthNameInit = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][new Date().getMonth()];
    const [selectedMonths, setSelectedMonths] = useState<string[]>([currentMonthNameInit]);
    const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthNameInit);
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);
    const [requiresApproval, setRequiresApproval] = useState(false);

    // Transport state
    const [isTransportEnabled, setIsTransportEnabled] = useState(false);
    const [isTransportFixed, setIsTransportFixed] = useState(false);
    const [transportRows, setTransportRows] = useState([{ name: '', km: '', price: '', showDropdown: false }]);
    const [transportStops, setTransportStops] = useState<{ id: string; name: string; km: string; ratePerKm?: string, busFare: number }[]>([]);
    void transportStops;


    useEffect(() => {
        fetchTransportStops();
        
        const handleAfterPrint = () => {
            document.body.classList.remove('printing-statement');
            document.body.classList.remove('printing-receipt');
            document.body.classList.remove('printing-dues-report');
        };
        window.addEventListener('afterprint', handleAfterPrint);
        return () => {
            window.removeEventListener('afterprint', handleAfterPrint);
        };
    }, []);

    const printStudentStatement = () => {
        document.body.classList.add('printing-statement');
        window.print();
    };

    const printDuesReport = () => {
        document.body.classList.add('printing-dues-report');
        window.print();
    };

    const getPaidAmountForHeadAndMonth = (headName: string, month: string) => {
        const shortToFull: Record<string, string> = {
            'Jan': 'January', 'Feb': 'February', 'Mar': 'March',
            'Apr': 'April', 'May': 'May', 'Jun': 'June',
            'Jul': 'July', 'Aug': 'August', 'Sep': 'September',
            'Oct': 'October', 'Nov': 'November', 'Dec': 'December'
        };
        const normalizedTargetMonth = shortToFull[month] || month;

        let totalPaid = 0;
        (studentHistory || []).forEach((r: any) => {
            if (r.status !== 'APPROVED') return;
            let paidMonths = [r.month?.trim() || ''];
            if (r.feeHead && r.feeHead.includes('==>')) {
                paidMonths = r.feeHead.split('==>')[0].split(',').map((m: string) => m.trim());
            }
            const normMonths = paidMonths.map((m: string) => shortToFull[m] || m);
            if (!normMonths.includes(normalizedTargetMonth)) return;

            const parts = (r.feeHead || '').split('==>');
            const headsPart = parts.length > 1 ? parts[1] : parts[0];
            const headEntries = headsPart.split('||');

            const isTargetTransport = headName.toLowerCase().includes('transport') || headName.toLowerCase().includes('bus');

            headEntries.forEach((he: string) => {
                const [hName, hPrice] = he.split(':').map((s: string) => s.trim());
                const isEntryTransport = hName && (hName.toLowerCase().includes('transport') || hName.toLowerCase().includes('bus'));
                
                if (hName && (hName.toLowerCase() === headName.toLowerCase() || (isTargetTransport && isEntryTransport))) {
                    const headBilled = Number(hPrice) || (Number(r.paidAmount) || 0);
                    const totalReceiptBilled = Number(r.totalFee) || (Number(r.paidAmount) + (Number(r.discount) || 0));
                    const ratio = totalReceiptBilled > 0 ? ((Number(r.paidAmount) || 0) + (Number(r.discount) || 0)) / totalReceiptBilled : 1;
                    const headNetPaid = headBilled * ratio;
                    totalPaid += (headNetPaid / (normMonths.length || 1));
                }
            });
        });
        return totalPaid;
    };

    const isHeadPaidForMonth = (headName: string, month: string) => {
        if (studentLedger && studentLedger.monthlyStatus && studentLedger.monthlyStatus.length > 0) {
            const mStatus = studentLedger.monthlyStatus.find((ms: any) => ms.month.trim().toLowerCase() === month.trim().toLowerCase());
            if (mStatus && mStatus.heads) {
                const hStatus = mStatus.heads.find((h: any) => h.name.trim().toLowerCase() === headName.trim().toLowerCase());
                if (hStatus) {
                    return hStatus.pending === 0;
                }
            }
        }
        const struct = feeStructure.find(s => s.className === selectedClass);
        const expected = struct?.fees?.[headName] || 0;
        if (expected <= 0) return true;
        return getPaidAmountForHeadAndMonth(headName, month) >= expected;
    };

    const isTransportPaidForMonth = (month: string) => {
        if (studentLedger && studentLedger.monthlyStatus && studentLedger.monthlyStatus.length > 0) {
            const mStatus = studentLedger.monthlyStatus.find((ms: any) => ms.month.trim().toLowerCase() === month.trim().toLowerCase());
            if (mStatus && mStatus.heads) {
                const tStatus = mStatus.heads.find((h: any) => h.name.toLowerCase().includes('transport') || h.name.toLowerCase().includes('bus'));
                if (tStatus) {
                    return tStatus.pending === 0;
                }
            }
        }
        const fare = Number(transportRows[0]?.price) || 0;
        if (fare <= 0) return true;
        return getPaidAmountForHeadAndMonth('Transport Fee', month) >= fare;
    };

    const isMonthPaid = (month: string) => {
        // 1. If studentLedger is available, check monthlyStatus
        if (studentLedger && studentLedger.monthlyStatus && studentLedger.monthlyStatus.length > 0) {
            const mStatus = studentLedger.monthlyStatus.find((ms: any) => ms.month.trim().toLowerCase() === month.trim().toLowerCase());
            if (mStatus) {
                return mStatus.pending === 0;
            }
        }

        // 2. Otherwise compute from fee structure and student history
        const struct = feeStructure.find(s => s.className === selectedClass);
        if (!struct) return false;
        
        const currentStudent = students.find(s => s.admissionNo === admissionNo);
        
        const monthlyHeads = feeHeads.filter(h => {
            const isMonthly = h.type && h.type.toLowerCase().includes('month');
            if (!isMonthly) return false;
            if ((struct.fees?.[h.name] || 0) <= 0) return false;
            if (currentStudent && isFeeExempt(currentStudent, h)) return false;
            return true;
        });

        const isGeneralPaid = monthlyHeads.length === 0 || monthlyHeads.every(h => {
            const expectedAmt = struct.fees?.[h.name] || 0;
            const paidAmt = getPaidAmountForHeadAndMonth(h.name, month);
            return paidAmt >= expectedAmt;
        });

        if (currentStudent?.transportStopId || isTransportEnabled) {
            const fare = Number(transportRows[0]?.price) || 0;
            const isTransportPaid = fare <= 0 || getPaidAmountForHeadAndMonth('Transport Fee', month) >= fare;
            return isGeneralPaid && isTransportPaid;
        }

        return isGeneralPaid;
    };

    useEffect(() => {
        if (selectedMonth) {
            const months = ['April','May','June','July','August','September','October','November','December','January','February','March'];
            const mIdx = months.indexOf(selectedMonth);
            if (mIdx !== -1) {
                const newSelection = [];
                for (let i = 0; i <= mIdx; i++) {
                    if (!isMonthPaid(months[i])) {
                        newSelection.push(months[i]);
                    }
                }
                setSelectedMonths(newSelection);
            }
        }
    }, [selectedMonth, studentHistory, studentLedger]);

    const fetchTransportStops = async () => {
        try {
            const res = await axios.get('/erp-api/admin/transport/stops');
            setTransportStops(res.data);
        } catch (error) {
            console.error('Failed to fetch transport stops');
        }
    };

    const isFeePaid = (headName: string) => {
        const headObj = feeHeads.find(h => h.name === headName);
        if (!headObj) return false;
        
        const isMonthly = headObj.type && headObj.type.toLowerCase().includes('month');
        
        // Find if student is RTE / Third Child
        const currentStudent = students.find(s => s.admissionNo === admissionNo);
        if (currentStudent && isFeeExempt(currentStudent, headObj)) {
            return true;
        }
        
        if (isMonthly) {
            if (selectedMonths.length === 0) return false;
            return selectedMonths.every(m => isHeadPaidForMonth(headName, m));
        }
        
        return studentHistory.some(r => {
            if (r.status !== 'APPROVED') return false;
            
            const parts = r.feeHead.split('==>');
            if (parts.length < 2) return false;
            
            const headsPart = parts[1];
            const headNames = headsPart.split('||').map(h => h.split(':')[0].trim());
            
            return headNames.includes(headName);
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
            if (isApproverRole(parsedUser.role)) {
                fetchPendingApprovals();
            }
            if (parsedUser.role === 'ACCOUNTS' || parsedUser.role === 'ADMIN' || parsedUser.role === 'PRINCIPAL' || isApproverRole(parsedUser.role)) {
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

            // Polling for auto-refresh every 15 seconds (only for pending approvals)
            const interval = setInterval(() => {
                if (isApproverRole(parsedUser.role)) {
                    fetchPendingApprovals();
                }
            }, 15000);

            const handleSessionChange = () => {
                fetchAllHistory();
                fetchReports();
                fetchDueFees();
                fetchStudents();
                fetchTransportDues(true);
            };
            window.addEventListener('activeSessionChanged', handleSessionChange);

            // Cleanup interval and listener on unmount
            return () => {
                clearInterval(interval);
                document.removeEventListener('mousedown', handleClickOutside);
                window.removeEventListener('activeSessionChanged', handleSessionChange);
            };
        }
    }, []);

    // Handle post-payment URL params (PayU redirect return)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const paymentStatus = params.get('payment');
        const receiptParam = params.get('receipt');

        if (paymentStatus === 'approved') {
            if (receiptParam) {
                axios.get('/erp-api/fees').then(res => {
                    const foundRec = res.data.find((r: any) => r.receiptNo === receiptParam);
                    if (foundRec) {
                        const formattedRec: FeeRecord = {
                            ...foundRec,
                            paidAmount: foundRec.amountPaid || foundRec.paidAmount || 0,
                            date: new Date(foundRec.paymentDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
                            studentName: foundRec.studentName || foundRec.student?.user?.name || 'Student',
                            className: foundRec.className || foundRec.student?.class?.name || '',
                            admissionNo: foundRec.admissionNo || foundRec.student?.admissionNo || '-'
                        };
                        setSelectedReceipt(formattedRec);
                        setShowReceipt(true);

                        // Populate Student Fee Counter view behind the modal
                        const stId = foundRec.studentId || foundRec.student?.id;
                        const stName = foundRec.studentName || foundRec.student?.user?.name;
                        const admNo = foundRec.admissionNo || foundRec.student?.admissionNo;
                        const clsName = foundRec.className || foundRec.student?.class?.name;
                        const fName = foundRec.student?.fatherName || 'N/A';
                        const oldSt = Boolean(foundRec.student?.isOldStudent);

                        if (stName) setStudentName(stName);
                        if (admNo) setAdmissionNo(admNo);
                        if (clsName) setSelectedClass(clsName);
                        if (fName) setFatherName(fName);
                        setIsOldStudent(oldSt);

                        if (stId) {
                            fetchStudentHistory(stId, stName || 'Student');
                        }
                    }
                }).catch(console.error);
            }
        } else if (paymentStatus === 'rejected') {
            const studentIdParam = params.get('studentId');
            if (studentIdParam) {
                axios.get(`/erp-api/admin/students/${studentIdParam}`).then(res => {
                    const s = res.data;
                    if (s) {
                        setStudentName(s.user?.name || s.name || '');
                        setAdmissionNo(s.admissionNo || '');
                        setFatherName(s.fatherName || 'N/A');
                        setIsOldStudent(Boolean(s.isOldStudent));
                        setSelectedClass(s.class?.name || s.className || '');
                        fetchStudentHistory(s.id, s.user?.name || s.name || 'Student');
                    }
                }).catch(() => {
                    const s = students.find((st: any) => st.id === studentIdParam);
                    if (s) {
                        setStudentName(s.name);
                        setAdmissionNo(s.admissionNo);
                        setFatherName(s.fatherName || 'N/A');
                        setIsOldStudent(Boolean(s.isOldStudent));
                        setSelectedClass(s.className);
                        fetchStudentHistory(s.id, s.name);
                    }
                });
            }
            addNotification('fee', 'Payment Status', 'PayU Payment was cancelled or failed. Please try again.');
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
        }
    }, [students]);

    // Fetch initial data regardless of login status (for the module to function)
    useEffect(() => {
        fetchClasses();
        fetchStudents();
        fetchFeeHeads();
        fetchFeeStructure();
        fetchNextReceiptNo();
        fetchPendingApprovals();
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
            const mappedData = res.data.map((r: any) => ({
                ...r,
                paidAmount: r.amountPaid || r.paidAmount || 0,
                studentName: r.studentName || r.student?.user?.name || 'Unknown Student',
                admissionNo: r.admissionNo || r.student?.admissionNo || 'N/A',
                className: r.className || r.student?.class?.name || 'Unknown Class'
            }));
            setPendingApprovalsCount(mappedData.length);
            setFeeRecords(prev => {
                const nonPending = prev.filter(r => r.status !== 'PENDING');
                return [...mappedData, ...nonPending];
            });
        } catch (err) {
            console.error('Failed to fetch approvals:', err);
        }
    };


    const fetchStudentHistory = async (
        studentId: string, 
        studentNameVal: string, 
        autoSelect: boolean = false, 
        dueFeeItem: any = null, 
        monthFilter: string = 'All'
    ) => {
        try {
            setLoadingLedger(true);
            const res = await axios.get(`/erp-api/fees/history/${studentId}`);
            const mappedHistory = res.data.map((r: any) => ({
                ...r,
                paidAmount: r.amountPaid || r.paidAmount || 0,
                date: new Date(r.paymentDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
                studentName: r.studentName || r.student?.user?.name || studentNameVal || 'Student',
                admissionNo: r.admissionNo || r.student?.admissionNo || admissionNo || 'N/A',
                className: r.className || r.student?.class?.name || selectedClass || 'N/A',
                sessionName: r.session?.name || r.sessionName || null
            }));
            setStudentHistory(mappedHistory);
            
            const balRes = await axios.get(`/erp-api/fees/student/${studentId}/balance`);

            let calculatedPendingDues = 0;
            const approvedHistory = mappedHistory.filter((r: any) => r.status === 'APPROVED');

            if (approvedHistory.length > 0) {
                const latestReceipt = approvedHistory[0];
                let parsedPreviousDue = 0;
                if (latestReceipt.feeHead && latestReceipt.feeHead.includes('Previous Dues:')) {
                    const match = latestReceipt.feeHead.match(/Previous Dues:\s*(\d+(\.\d+)?)/i);
                    if (match) {
                        parsedPreviousDue = parseFloat(match[1]);
                    }
                }
                const feeHeadLower = (latestReceipt.feeHead || '').toLowerCase().trim();
                const isPurePrevDue = (feeHeadLower.includes('previous dues') || feeHeadLower.includes('previous due')) && 
                                     !feeHeadLower.includes('||') && 
                                     !feeHeadLower.includes('tuition') && 
                                     !feeHeadLower.includes('computer') && 
                                     !feeHeadLower.includes('transport') && 
                                     !feeHeadLower.includes('annual') && 
                                     !feeHeadLower.includes('exam') && 
                                     !feeHeadLower.includes('fee card') && 
                                     !feeHeadLower.includes('admission');
                
                const baseTotal = isPurePrevDue ? 0 : (Number(latestReceipt.totalFee) || 0);
                const latestDue = Math.max(0, (baseTotal + parsedPreviousDue) - (Number(latestReceipt.paidAmount) || 0) - (Number(latestReceipt.discount) || 0));
                
                calculatedPendingDues = latestDue;
            } else {
                calculatedPendingDues = Number(balRes.data.previousSessionDue || 0);
            }
            setPendingDues(calculatedPendingDues);

            const hasTr = balRes.data.hasTransport || false;

            if (hasTr) {
                setIsTransportEnabled(true);
                setTransportRows([{ 
                    name: balRes.data.transportStopName || '', 
                    km: '', 
                    price: (balRes.data.transportBusFare || 0).toString(), 
                    showDropdown: false 
                }]);
                setIsTransportFixed(true);
            } else {
                setIsTransportEnabled(false);
                setTransportRows([{ name: '', km: '', price: '', showDropdown: false }]);
                setIsTransportFixed(false);
            }

            const ledgerRes = await axios.get(`/erp-api/fees/student/${studentId}/ledger`);
            setStudentLedger(ledgerRes.data);

            if (calculatedPendingDues > 0) {
                setSelectedFees([]);
                showAppAlert(
                    'Outstanding Dues Alert!',
                    `${studentNameVal} has an outstanding due of ₹${calculatedPendingDues.toLocaleString('en-IN')} from previous fee receipts / session.\n\nAs per policy, this pending due must be settled first before regular monthly and annual fees can be selected.`,
                    'warning',
                    calculatedPendingDues
                );
            } else if (autoSelect && dueFeeItem) {
                const dyn = calculateDynamicDues(dueFeeItem, monthFilter);
                
                // 1. Select unpaid months
                if (dyn.unpaidMonthsList && dyn.unpaidMonthsList.length > 0) {
                    setSelectedMonths(dyn.unpaidMonthsList);
                } else if (monthFilter !== 'All') {
                    setSelectedMonths([monthFilter]);
                } else {
                    const currentDate = new Date();
                    const allMonths = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];
                    const currentMonthName = allMonths[(currentDate.getMonth() - 3 + 12) % 12];
                    setSelectedMonths([currentMonthName]);
                }

                // 2. Select unpaid fee heads
                const struct = feeStructure.find(s => s.className === dueFeeItem.className);
                if (struct && struct.fees) {
                    const unpaidHeads: string[] = [];
                    
                    const checkIsHeadPaidForMonth = (headName: string, month: string) => {
                        return mappedHistory.some((r: any) => {
                            if (r.status !== 'APPROVED') return false;
                            let paidMonths = [r.month?.trim()];
                            if (r.feeHead.includes('==>')) {
                                paidMonths = r.feeHead.split('==>')[0].split(',').map((m: string) => m.trim());
                            }
                            if (!paidMonths.includes(month)) return false;
                            const parts = r.feeHead.split('==>');
                            const headsPart = parts.length > 1 ? parts[1] : parts[0];
                            const headNames = headsPart.split('||').map((hn: string) => hn.split(':')[0].trim());
                            return headNames.includes(headName);
                        });
                    };

                    const checkIsTransportPaidForMonth = (month: string) => {
                        const shortToFull: Record<string, string> = {
                            'Jan': 'January', 'Feb': 'February', 'Mar': 'March',
                            'Apr': 'April', 'May': 'May', 'Jun': 'June',
                            'Jul': 'July', 'Aug': 'August', 'Sep': 'September',
                            'Oct': 'October', 'Nov': 'November', 'Dec': 'December'
                        };
                        const normalizedMonth = shortToFull[month] || month;
                        return mappedHistory.some((r: any) => {
                            if (r.status !== 'APPROVED') return false;
                            let paidMonths: string[] = [r.month?.trim() || ''];
                            if (r.feeHead.includes('==>')) {
                                paidMonths = r.feeHead.split('==>')[0].split(',').map((m: string) => m.trim());
                            }
                            const normalizedPaidMonths = paidMonths.map(m => shortToFull[m] || m);
                            if (!normalizedPaidMonths.includes(normalizedMonth)) return false;
                            return r.feeHead.includes('Transport');
                        });
                    };

                    // Check monthly and one-time heads
                    feeHeads.forEach(h => {
                        const amount = struct.fees?.[h.name] || 0;
                        if (amount <= 0) return;
                        
                        const isMonthly = h.type === 'Monthly';
                        const currentStudent = students.find(s => s.id === studentId || s.admissionNo === dueFeeItem.admissionNo);
                        const isExempt = currentStudent && isFeeExempt(currentStudent, h);
                        if (isExempt) return;

                        if (isMonthly) {
                            const monthsToCheck = dyn.unpaidMonthsList.length > 0 ? dyn.unpaidMonthsList : (monthFilter !== 'All' ? [monthFilter] : []);
                            const hasUnpaidMonth = monthsToCheck.some(m => !checkIsHeadPaidForMonth(h.name, m));
                            if (hasUnpaidMonth) {
                                unpaidHeads.push(h.name);
                            }
                        } else {
                            const isPaid = mappedHistory.some((r: any) => {
                                if (r.status !== 'APPROVED') return false;
                                const parts = r.feeHead.split('==>');
                                const headsPart = parts.length > 1 ? parts[1] : parts[0];
                                const headNames = headsPart.split('||').map((hn: string) => hn.split(':')[0].trim());
                                return headNames.includes(h.name);
                            });
                            if (!isPaid) {
                                unpaidHeads.push(h.name);
                            }
                        }
                    });

                    // Check transport if enabled
                    if (hasTr) {
                        const monthsToCheck = dyn.unpaidMonthsList.length > 0 ? dyn.unpaidMonthsList : (monthFilter !== 'All' ? [monthFilter] : []);
                        const hasUnpaidTransport = monthsToCheck.some(m => !checkIsTransportPaidForMonth(m));
                        if (hasUnpaidTransport) {
                            unpaidHeads.push('Transport Fee');
                        }
                    }

                    setSelectedFees(unpaidHeads);
                }
            }
        } catch (err) {
            console.error('Failed to fetch history:', err);
        } finally {
            setLoadingLedger(false);
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
            const newHistory = res.data.map((r: any) => ({
                ...r,
                paidAmount: r.amountPaid || r.paidAmount || 0,
                date: new Date(r.paymentDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
                studentName: r.studentName || r.student?.user?.name || 'Unknown Student',
                className: r.className || r.student?.class?.name || 'Unknown Class',
                sessionName: r.session?.name || null
            }));
            setFeeRecords(prev => {
                const pendingItems = prev.filter(r => r.status === 'PENDING');
                const pendingIds = new Set(pendingItems.map(p => p.id));
                const filteredHistory = newHistory.filter((h: any) => !pendingIds.has(h.id));
                return [...pendingItems, ...filteredHistory];
            });
        } catch (err) {
            console.error('Failed to fetch full history:', err);
        }
    };

    const fetchDueFees = async () => {
        try {
            const session = localStorage.getItem('activeSession') || '2024-2025';
            const res = await axios.get(`/erp-api/fees/due-list?session=${session}`);
            console.log("Due Fees Data Received:", res.data.length, "records");
            const enrichedData = res.data.map((f: any) => {
                if (!f.pendingMonths) {
                    const allMonths = ['April','May','June','July','August','September','October','November','December','January','February','March'];
                    const pMonths: string[] = [];
                    const monthlyFee = f.monthlyFeeAmount || 0;
                    const oneTime = f.expectedOneTime || 0;
                    const totalPaid = f.totalPaid || 0;
                    // Assume 12 months for calculation fallback
                    for (let i = 0; i < 12; i++) {
                        const cumulativeExpected = oneTime + (monthlyFee * (i + 1));
                        if (totalPaid < cumulativeExpected) {
                            pMonths.push(allMonths[i]);
                        }
                    }
                    return { ...f, pendingMonths: pMonths };
                }
                return f;
            });
            setDueFees(enrichedData);
        } catch (err) {
            console.error('Failed to fetch due fees:', err);
        }
    };

    const fetchTransportDues = async (showLoading = false) => {
        if (showLoading || transportDues.length === 0) {
            setLoadingTransportDues(true);
        }
        try {
            const session = localStorage.getItem('activeSession') || '2024-2025';
            const res = await axios.get(`/erp-api/fees/transport-due-list?session=${session}`);
            setTransportDues(res.data);
        } catch (error) {
            console.error('Failed to fetch transport dues');
        } finally {
            setLoadingTransportDues(false);
        }
    };

    useEffect(() => {
        const refreshData = (showLoading = false) => {
            switch (activeTab) {
                case 'due':
                    if (dueView === 'general') {
                        fetchDueFees();
                    } else if (dueView === 'transport') {
                        fetchTransportDues(showLoading);
                    }
                    break;
                case 'previous_due':
                    fetchDueFees();
                    break;
                case 'reports':
                    fetchReports();
                    break;
                case 'approvals':
                    fetchPendingApprovals();
                    break;
                case 'drafts':
                    fetchAllHistory();
                    break;
                case 'other_fees':
                    fetchAllHistory();
                    fetchNextReceiptNo();
                    break;
                case 'collection':
                    fetchAllHistory();
                    fetchNextReceiptNo();
                    fetchPendingApprovals();
                    break;
                case 'heads':
                    fetchFeeHeads();
                    break;
                case 'structure':
                    fetchFeeStructure();
                    break;
                default:
                    break;
            }
        };

        refreshData(true);
    }, [activeTab, dueView]);

    // Auto pop-up Printable Thermal Receipt when returning from online PayU payment
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const paymentStatus = params.get('payment');
        const receiptNoParam = params.get('receipt');

        if (paymentStatus === 'approved' && receiptNoParam) {
            axios.get('/erp-api/fees/history').then(res => {
                const found = (res.data || []).find((r: any) => r.receiptNo === receiptNoParam);
                if (found) {
                    setSelectedReceipt(found);
                    setShowReceipt(true);
                    addNotification('fee', 'Payment Approved', `Online PayU Payment Approved! Receipt ${receiptNoParam} generated successfully.`);
                }
            }).catch(err => console.error('Failed to fetch receipt for modal popup', err));

            // Clean query parameters from URL so modal doesn't pop up again on refresh
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
        } else if (paymentStatus && (paymentStatus.toLowerCase() === 'rejected' || paymentStatus.toLowerCase() === 'failure' || paymentStatus.toLowerCase() === 'failed')) {
            addNotification('fee', 'Payment Failed / Cancelled', 'Online PayU payment was cancelled or failed. No receipt generated.');
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
        }
    }, []);

    const getFilteredTransportDues = () => {
        const effectiveMonth = dueCalculationMode === 'cumulative' ? getCurrentAcademicMonth() : dueMonthFilter;
        const allMonths = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];
        const targetIdx = allMonths.indexOf(effectiveMonth);
        const elapsedMonths = targetIdx !== -1 ? allMonths.slice(0, targetIdx + 1) : allMonths;

        return transportDues
            .filter(d => dueClassFilter === 'All' || (d.className || '').trim() === dueClassFilter.trim())
            .filter(d => {
                if (dueRtFilter === 'All') return true;
                if (dueRtFilter === 'RT') return d.isRT;
                return !d.isRT;
            })
            .filter(d => {
                if (dueSearchQuery === '') return true;
                const query = dueSearchQuery.toLowerCase();
                return (d.studentName || '').toLowerCase().includes(query) ||
                       (d.admissionNo || '').toLowerCase().includes(query) ||
                       (d.fatherName || '').toLowerCase().includes(query) ||
                       (d.stopName || '').toLowerCase().includes(query);
            })
            .filter(d => {
                const fare = d.monthlyFare || 0;
                let expected = 0;
                let paid = 0;
                let pending = 0;

                if (dueCalculationMode === 'cumulative') {
                    expected = fare * elapsedMonths.length;
                    elapsedMonths.forEach(m => {
                        const raw = d.monthWisePaid?.[m] || 0;
                        const isMthPaid = (fare > 0 && raw >= fare) || (fare === 0);
                        const p = isMthPaid ? fare : Math.min(fare, raw);
                        paid += p;
                    });
                    pending = Math.max(0, expected - paid);
                } else if (dueMonthFilter !== 'All') {
                    expected = fare;
                    const raw = d.monthWisePaid?.[dueMonthFilter] || 0;
                    const isMthPaid = (fare > 0 && raw >= fare) || (fare === 0);
                    paid = isMthPaid ? fare : Math.min(fare, raw);
                    pending = Math.max(0, expected - paid);
                } else {
                    expected = fare * 12;
                    paid = d.totalPaid || 0;
                    pending = Math.max(0, expected - paid);
                }

                if (dueStatusFilter === 'Paid') {
                    return pending === 0;
                }
                if (dueStatusFilter === 'Unpaid') {
                    return paid === 0 && expected > 0;
                }
                if (dueStatusFilter === 'Partially Paid') {
                    return paid > 0 && pending > 0;
                }
                if (dueStatusFilter === 'Any Outstanding') {
                    return pending > 0;
                }
                return true;
            });
    };

    const downloadDueExcel = () => {
        const activeSessionStr = localStorage.getItem('activeSession') || '2024-2025';
        if (dueView === 'general') {
            const filtered = getFilteredDues(dueFees);

            let headers: string[] = [];
            let csvContentLines: string[] = [];

            if (dueFeeTypeFilter === 'One-time Only') {
                headers = [
                    "S.No.",
                    "Student Name",
                    "Admission No",
                    "Father Name",
                    "Class",
                    "One-Time Expected (₹)",
                    "One-Time Paid (₹)",
                    "One-Time Balance (₹)",
                    "Status"
                ];

                csvContentLines = [
                    `"Academic Session: ${activeSessionStr} | Component: One-Time / Annual Fees | Student Type: ${dueRtFilter} | Status: ${dueStatusFilter}"`,
                    "",
                    headers.join(","),
                    ...filtered.map((f, index) => {
                        const exp = f.isRT ? 0 : (f.expectedOneTime || 0);
                        const paid = f.actualOneTimePaid || 0;
                        const bal = Math.max(0, exp - paid);

                        let status = "Pending";
                        if (exp === 0) {
                            status = f.isRT ? "RT Student" : "No Fee Assigned";
                        } else if (paid >= exp) {
                            status = "Paid";
                        } else if (paid > 0) {
                            status = "Partially Paid";
                        }

                        return [
                            index + 1,
                            `"${f.studentName || 'Unknown'}"`,
                            `"${f.admissionNo || 'N/A'}"`,
                            `"${f.fatherName || 'N/A'}"`,
                            `"${f.className || 'Unknown'}"`,
                            exp,
                            paid,
                            bal,
                            `"${status}"`
                        ].join(",");
                    })
                ];
            } else if (dueCalculationMode === 'cumulative') {
                const effectiveMonth = getCurrentAcademicMonth();
                const allMonths = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];
                const sIdx = allMonths.indexOf(effectiveMonth);
                const monthsList = sIdx !== -1 ? allMonths.slice(0, sIdx + 1) : allMonths.slice(0, 5);

                headers = [
                    "S.No",
                    "Student Name",
                    "Admission No",
                    "Father Name",
                    "Class",
                    "Previous Session Dues (₹)",
                    ...monthsList.map(m => `${m.slice(0, 3)} Due (₹)`),
                    `Total Due Till ${effectiveMonth.slice(0, 3)} (₹)`,
                    "Status"
                ];
                
                csvContentLines = [
                    `"Academic Session: ${activeSessionStr} | Mode: Carry Forward (Till ${effectiveMonth}) | Student Type: ${dueRtFilter} | Status: ${dueStatusFilter}"`,
                    "",
                    headers.join(","),
                    ...filtered.map((f, index) => {
                        const dyn = calculateDynamicDues(f, effectiveMonth);
                        const monthlyRate = f.isRT ? 0 : (f.monthlyFeeAmount || 0);
                        const prevDue = Math.max(0, (f.previousSessionDue || 0) - (f.actualPrevDuesPaid || 0));
                        const totalDueTillMonth = prevDue + dyn.totalCumulativeDueTillMonth;

                        let status = "Unpaid";
                        if (monthlyRate === 0 && prevDue === 0) {
                            status = f.isRT ? "RT Student" : "No Fee Assigned";
                        } else if (totalDueTillMonth === 0) {
                            status = "Paid Till Date";
                        } else if ((f.actualMonthlyPaid || 0) > 0 || (f.actualPrevDuesPaid || 0) > 0) {
                            status = "Partially Paid";
                        }

                        const monthDues = monthsList.map(m => {
                            const rawPaid = f.monthWisePaid?.[m] || 0;
                            const paid = Math.min(monthlyRate, rawPaid);
                            return Math.max(0, monthlyRate - paid);
                        });

                        return [
                            index + 1,
                            `"${f.studentName || 'Unknown'}"`,
                            `"${f.admissionNo || 'N/A'}"`,
                            `"${f.fatherName || 'N/A'}"`,
                            `"${f.className || 'Unknown'}"`,
                            prevDue,
                            ...monthDues,
                            totalDueTillMonth,
                            `"${status}"`
                        ].join(",");
                    })
                ];
            } else if (dueMonthFilter !== 'All') {
                const monthShort = dueMonthFilter.slice(0, 3);
                const allMonths = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];
                const sIdx = allMonths.indexOf(dueMonthFilter);
                const prevMonthName = sIdx > 0 ? allMonths[sIdx - 1].slice(0, 3) : 'None';

                headers = [
                    "S.No.",
                    "Student Name",
                    "Admission No",
                    "Father Name",
                    "Class",
                    "Monthly Fee Rate (₹)",
                    "Previous Session Dues (₹)",
                    sIdx > 0 ? `Old Arrears (Till ${prevMonthName}) (₹)` : "Old Arrears (₹)",
                    `${monthShort} Expected (₹)`,
                    `${monthShort} Paid (₹)`,
                    `${monthShort} Due (₹)`,
                    `TOTAL DUE TILL ${dueMonthFilter.toUpperCase()} (₹)`,
                    "Pending Months List",
                    "Status"
                ];
                
                csvContentLines = [
                    `"Academic Session: ${activeSessionStr} | Month: ${dueMonthFilter} (Single Month Mode) | Student Type: ${dueRtFilter} | Status: ${dueStatusFilter}"`,
                    "",
                    headers.join(","),
                    ...filtered.map((f, index) => {
                        const dyn = calculateDynamicDues(f, dueMonthFilter);
                        const mExpected = f.isRT ? 0 : (f.monthlyFeeAmount || 0);
                        const prevDue = f.previousSessionDue || 0;
                        const prevArrears = dyn.prevMonthsArrears;
                        const mPaid = dyn.selectedMonthPaid;
                        const mDue = dyn.selectedMonthDue;
                        const totalDueTillMonth = dyn.totalCumulativeDueTillMonth;

                        let status = "Pending";
                        if (mExpected === 0) {
                            status = f.isRT ? "RT Student" : "No Fee Assigned";
                        } else if (totalDueTillMonth === 0) {
                            status = "Paid Till Date";
                        } else if (mPaid > 0 || (f.actualMonthlyPaid || 0) > 0) {
                            status = "Partially Paid";
                        }

                        return [
                            index + 1,
                            `"${f.studentName || 'Unknown'}"`,
                            `"${f.admissionNo || 'N/A'}"`,
                            `"${f.fatherName || 'N/A'}"`,
                            `"${f.className || 'Unknown'}"`,
                            mExpected,
                            prevDue,
                            prevArrears,
                            mExpected,
                            mPaid,
                            mDue,
                            totalDueTillMonth,
                            `"${dyn.unpaidMonthsList.join('; ') || 'None'}"`,
                            `"${status}"`
                        ].join(",");
                    })
                ];
            } else {
                headers = [
                    "S.No.",
                    "Student Name",
                    "Admission No",
                    "Father Name",
                    "Class",
                    "Session Expected (12 Mos) (₹)",
                    "Expected Till Date (₹)",
                    "Total Paid (₹)",
                    "Dues Pending Till Date (₹)",
                    "Status",
                    "Pending Details"
                ];

                csvContentLines = [
                    `"Academic Session: ${activeSessionStr} | Filter: All Months | Student Type: ${dueRtFilter} | Status: ${dueStatusFilter}"`,
                    "",
                    headers.join(","),
                    ...filtered.map((f, index) => {
                        const dyn = calculateDynamicDues(f, 'All');

                        let sessionExpected = 0;
                        let expectedTillNow = 0;
                        let paidAmt = 0;
                        let duesTillNow = 0;

                        if (dueFeeTypeFilter === 'Monthly Only') {
                            sessionExpected = dyn.fullSessionMonthlyExpected;
                            expectedTillNow = dyn.cumulativeMonthlyExpected;
                            paidAmt = f.actualMonthlyPaid || 0;
                            duesTillNow = dyn.pendingMonthly;
                        } else if (dueFeeTypeFilter === 'One-time Only') {
                            sessionExpected = dyn.expectedOneTime;
                            expectedTillNow = dyn.expectedOneTime;
                            paidAmt = f.actualOneTimePaid || 0;
                            duesTillNow = dyn.pendingOneTime;
                        } else {
                            sessionExpected = (f.previousSessionDue || 0) + dyn.expectedOneTime + dyn.fullSessionMonthlyExpected;
                            expectedTillNow = (f.previousSessionDue || 0) + dyn.expectedOneTime + dyn.cumulativeMonthlyExpected;
                            paidAmt = (f.actualPrevDuesPaid || 0) + (f.actualOneTimePaid || 0) + (f.actualMonthlyPaid || 0);
                            duesTillNow = dyn.totalPayableNow;
                        }

                        let status = "Pending";
                        if (sessionExpected === 0) {
                            status = f.isRT ? "RT Student" : "No Fee Assigned";
                        } else if (duesTillNow === 0) {
                            status = "Paid Till Date";
                        } else if (paidAmt > 0) {
                            status = "Partially Paid";
                        }

                        return [
                            index + 1,
                            `"${f.studentName || 'Unknown'}"`,
                            `"${f.admissionNo || 'N/A'}"`,
                            `"${f.fatherName || 'N/A'}"`,
                            `"${f.className || 'Unknown'}"`,
                            sessionExpected,
                            expectedTillNow,
                            paidAmt,
                            duesTillNow,
                            `"${status}"`,
                            `"${dyn.pendingDetailsText}"`
                        ].join(",");
                    })
                ];
            }

            const csvContent = csvContentLines.join("\n");

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", dueMonthFilter !== 'All' ? `Dues_Report_${dueMonthFilter}_${activeSessionStr}_${new Date().toISOString().split('T')[0]}.csv` : `Full_Dues_Report_${activeSessionStr}_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            // Transport Excel
            const filtered = getFilteredTransportDues();
            let headers: string[] = [];
            let csvContentLines: string[] = [];

            if (dueCalculationMode === 'cumulative') {
                const effectiveMonth = getCurrentAcademicMonth();
                const allMonths = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];
                const targetIdx = allMonths.indexOf(effectiveMonth);
                const monthsList = targetIdx !== -1 ? allMonths.slice(0, targetIdx + 1) : allMonths.slice(0, 5);

                headers = [
                    "S.No",
                    "Student Name",
                    "Admission No",
                    "Father Name",
                    "Class",
                    "Stop",
                    "Monthly Fare (₹)",
                    ...monthsList.map(m => `${m.slice(0, 3)} Due (₹)`),
                    `Total Due Till ${effectiveMonth.slice(0, 3)} (₹)`,
                    "Status"
                ];

                csvContentLines = [
                    `"Academic Session: ${activeSessionStr} | Transport Fees | Mode: Carry Forward (Till ${effectiveMonth}) | Student Type: ${dueRtFilter} | Status: ${dueStatusFilter}"`,
                    "",
                    headers.join(","),
                    ...filtered.map((d, index) => {
                        const fare = d.monthlyFare || 0;
                        const monthDues = monthsList.map(m => {
                            const raw = d.monthWisePaid?.[m] || 0;
                            const isPaid = (fare > 0 && raw >= fare) || (fare === 0);
                            const paid = isPaid ? fare : Math.min(fare, raw);
                            return Math.max(0, fare - paid);
                        });
                        const totalDueTillMonth = monthDues.reduce((s, v) => s + v, 0);

                        let status = "Unpaid";
                        if (fare === 0) {
                            status = "No Transport Fare";
                        } else if (totalDueTillMonth === 0) {
                            status = "Paid Till Date";
                        } else if ((d.totalPaid || 0) > 0) {
                            status = "Partially Paid";
                        }

                        return [
                            index + 1,
                            `"${d.studentName || 'Unknown'}"`,
                            `"${d.admissionNo || 'N/A'}"`,
                            `"${d.fatherName || 'N/A'}"`,
                            `"${d.className || 'Unknown'}"`,
                            `"${d.stopName || 'N/A'}"`,
                            fare,
                            ...monthDues,
                            totalDueTillMonth,
                            `"${status}"`
                        ].join(",");
                    })
                ];
            } else if (dueMonthFilter !== 'All') {
                headers = ['S.No', 'STUDENT NAME', 'ADMISSION NO', 'FATHER NAME', 'CLASS', 'STOP', 'MONTHLY FARE', `${dueMonthFilter.toUpperCase()} PAID`, `${dueMonthFilter.toUpperCase()} DUE`, 'STATUS'];
                csvContentLines = [
                    `"Academic Session: ${activeSessionStr} | Transport Fees | Month: ${dueMonthFilter} | Status: ${dueStatusFilter}"`,
                    "",
                    headers.join(','),
                    ...filtered.map((d, index) => {
                        const fare = d.monthlyFare || 0;
                        const raw = d.monthWisePaid?.[dueMonthFilter] || 0;
                        const isPaid = (fare > 0 && raw >= fare) || (fare === 0);
                        const paid = isPaid ? fare : Math.min(fare, raw);
                        const due = Math.max(0, fare - paid);
                        const statusText = due === 0 ? 'PAID' : paid > 0 ? 'PARTIALLY PAID' : 'UNPAID';
                        return [
                            index + 1,
                            `"${d.studentName}"`,
                            `"${d.admissionNo || 'N/A'}"`,
                            `"${d.fatherName || 'N/A'}"`,
                            `"${d.className}"`,
                            `"${d.stopName}"`,
                            fare,
                            paid,
                            due,
                            `"${statusText}"`
                        ].join(',');
                    })
                ];
            } else {
                headers = ['S.No', 'STUDENT NAME', 'ADMISSION NO', 'FATHER NAME', 'CLASS', 'STOP', 'MONTHLY FARE', 'TOTAL PAID', 'TOTAL PENDING', 'MONTHS PAID'];
                csvContentLines = [
                    `"Academic Session: ${activeSessionStr} | Transport Fees | Status: ${dueStatusFilter}"`,
                    "",
                    headers.join(','),
                    ...filtered.map((d, index) => [
                        index + 1,
                        `"${d.studentName}"`,
                        `"${d.admissionNo || 'N/A'}"`,
                        `"${d.fatherName || 'N/A'}"`,
                        `"${d.className}"`,
                        `"${d.stopName}"`,
                        d.monthlyFare,
                        d.totalPaid,
                        d.pending,
                        `"${(d.paidMonths || []).join('; ')}"`
                    ].join(','))
                ];
            }

            const csvContent = csvContentLines.join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", dueMonthFilter !== 'All' ? `Transport_Dues_${dueMonthFilter}_${activeSessionStr}.csv` : `Transport_Dues_${activeSessionStr}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const downloadFullDetailsExcel = async () => {
        if (dueView !== 'general') return;
        
        const filtered = getFilteredDues(dueFees);
        const isMonthSelected = dueMonthFilter !== 'All';
        const monthShort = isMonthSelected ? dueMonthFilter.slice(0, 3) : 'Month';

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Full Details');

        const effectiveMonth = dueCalculationMode === 'cumulative' ? getCurrentAcademicMonth() : dueMonthFilter;
        const allMonths = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];
        const sIdx = allMonths.indexOf(effectiveMonth);
        const monthsList = sIdx !== -1 ? allMonths.slice(0, sIdx + 1) : allMonths.slice(0, 5);

        if (dueCalculationMode === 'cumulative') {
            worksheet.columns = [
                { header: 'S.No.', key: 'sno', width: 8 },
                { header: 'Student Name', key: 'studentName', width: 25 },
                { header: 'Admission No', key: 'admNo', width: 15 },
                { header: 'Father Name', key: 'fatherName', width: 22 },
                { header: 'Class', key: 'class', width: 15 },
                { header: 'Previous Session Dues (₹)', key: 'prevSessionDues', width: 24 },
                ...monthsList.map(m => ({
                    header: `${m} Due (₹)`,
                    key: `due_${m}`,
                    width: 15
                })),
                { header: `TOTAL DUE TILL ${effectiveMonth.toUpperCase()} (₹)`, key: 'totalOutstanding', width: 26 },
                { header: 'Payment Status', key: 'status', width: 18 }
            ];
        } else if (isMonthSelected) {
            worksheet.columns = [
                { header: 'S.No.', key: 'sno', width: 8 },
                { header: 'Student Name', key: 'studentName', width: 25 },
                { header: 'Admission No', key: 'admNo', width: 15 },
                { header: 'Father Name', key: 'fatherName', width: 22 },
                { header: 'Class', key: 'class', width: 15 },
                { header: 'Monthly Fee Rate (₹)', key: 'monthlyRate', width: 20 },
                { header: 'Previous Session Dues (₹)', key: 'prevSessionDues', width: 24 },
                { header: 'Old Arrears (Previous Mos) (₹)', key: 'prevArrears', width: 28 },
                { header: `${monthShort} Expected (₹)`, key: 'mExpected', width: 20 },
                { header: `${monthShort} Paid (₹)`, key: 'mPaid', width: 18 },
                { header: `${monthShort} Due (₹)`, key: 'mDue', width: 18 },
                { header: `TOTAL DUE TILL ${dueMonthFilter.toUpperCase()} (₹)`, key: 'totalOutstanding', width: 28 },
                { header: 'Total Paid All Time (₹)', key: 'totalPaidTillDate', width: 24 },
                { header: 'Payment Status', key: 'status', width: 18 },
                { header: 'Pending Months List', key: 'description', width: 35 }
            ];
        } else {
            worksheet.columns = [
                { header: 'S.No.', key: 'sno', width: 8 },
                { header: 'Student Name', key: 'studentName', width: 25 },
                { header: 'Admission No', key: 'admNo', width: 15 },
                { header: 'Father Name', key: 'fatherName', width: 22 },
                { header: 'Class', key: 'class', width: 15 },
                { header: 'Previous Session Dues (₹)', key: 'prevSessionDues', width: 25 },
                { header: 'One-Time Fees Expected (₹)', key: 'expectedOneTime', width: 25 },
                { header: 'One-Time Fees Paid (₹)', key: 'paidOneTime', width: 22 },
                { header: 'Full Session Monthly Expected (12 Mos) (₹)', key: 'fullSessionMonthly', width: 32 },
                { header: 'Monthly Expected Till Date (₹)', key: 'monthlyExpectedTillNow', width: 28 },
                { header: 'Monthly Fees Paid (₹)', key: 'monthlyPaid', width: 22 },
                { header: 'Dues Pending Till Date (₹)', key: 'totalOutstanding', width: 25 },
                { header: 'Total Paid Till Date (₹)', key: 'totalPaidTillDate', width: 24 },
                { header: 'Payment Status', key: 'status', width: 18 },
                { header: 'Pending Details', key: 'description', width: 35 }
            ];
        }

        // Insert Title row for Session
        const activeSessionStr = localStorage.getItem('activeSession') || '2024-2025';
        worksheet.insertRow(1, [`Academic Session: ${activeSessionStr} | General Fees Dues Breakdown ${dueCalculationMode === 'cumulative' ? `(${effectiveMonth} - Carry Forward Mode)` : isMonthSelected ? `(${dueMonthFilter} - Single Month Mode)` : '(All Months)'}`]);
        worksheet.insertRow(2, []); // Blank spacer

        const lastColIdx = (worksheet.columns?.length || 15);
        const lastColLetter = String.fromCharCode(64 + Math.min(26, lastColIdx));
        worksheet.mergeCells(`A1:${lastColLetter}1`);
        worksheet.getRow(1).font = { bold: true, size: 12, color: { argb: 'FF1F2937' } };
        worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'left' };

        // Style the header (now row 3)
        worksheet.getRow(3).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        worksheet.getRow(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF475569' } };
        worksheet.getRow(3).alignment = { vertical: 'middle', horizontal: 'center' };

        const enrichedData = filtered.map((f) => {
            const dyn = calculateDynamicDues(f, effectiveMonth);
            const totalPaidTillDate = f.totalPaid ?? ((f.actualPrevDuesPaid || 0) + (f.actualOneTimePaid || 0) + (f.actualMonthlyPaid || 0) + (f.actualTransportPaid || 0));

            const prevSessionDues = Math.max(0, (f.previousSessionDue || 0) - (f.actualPrevDuesPaid || 0));
            const expectedOneTime = dyn.expectedOneTime;
            const paidOneTime = f.actualOneTimePaid || 0;
            const fullSessionMonthly = dyn.fullSessionMonthlyExpected;
            const monthlyExpectedTillNow = dyn.cumulativeMonthlyExpected;
            const monthlyPaid = f.actualMonthlyPaid || 0;
            const totalOutstanding = dueCalculationMode === 'cumulative' 
                ? (prevSessionDues + dyn.totalCumulativeDueTillMonth)
                : isMonthSelected ? dyn.totalCumulativeDueTillMonth : dyn.totalPayableNow;
            
            let status = 'Pending';
            let rowColor = 'FFFFFFFF';
            
            if (totalOutstanding <= 0) {
                status = f.isRT ? 'RT Student' : 'Paid Till Date';
                rowColor = 'FFDCFCE7'; // Green
            } else if (paidOneTime > 0 || monthlyPaid > 0 || (isMonthSelected && dyn.selectedMonthPaid > 0)) {
                status = 'Partially Paid';
                rowColor = 'FFFEEBC8'; // Yellow
            } else {
                status = 'Unpaid';
                rowColor = 'FFFEE2E2'; // Red
            }

            const description = isMonthSelected 
                ? (dyn.unpaidMonthsList.length > 0 ? dyn.unpaidMonthsList.join(', ') : 'None')
                : dyn.pendingDetailsText;

            const monthlyRate = f.isRT ? 0 : (f.monthlyFeeAmount || 0);
            const monthDuesObj: Record<string, number> = {};
            monthsList.forEach(m => {
                const rawPaid = f.monthWisePaid?.[m] || 0;
                const paid = Math.min(monthlyRate, rawPaid);
                monthDuesObj[`due_${m}`] = Math.max(0, monthlyRate - paid);
            });

            return {
                studentName: f.studentName || 'Unknown',
                admNo: f.admissionNo || 'N/A',
                fatherName: f.fatherName || 'N/A',
                class: f.className || 'Unknown',
                monthlyRate,
                prevArrears: dyn.prevMonthsArrears,
                mExpected: dyn.selectedMonthExpected,
                mPaid: dyn.selectedMonthPaid,
                mDue: dyn.selectedMonthDue,
                prevSessionDues,
                ...monthDuesObj,
                expectedOneTime,
                paidOneTime,
                fullSessionMonthly,
                monthlyExpectedTillNow,
                monthlyPaid,
                totalOutstanding,
                totalPaidTillDate,
                status,
                rowColor,
                description
            };
        });

        enrichedData.forEach((f, index) => {
            const row = worksheet.addRow({
                sno: index + 1,
                ...f
            });

            row.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: f.rowColor }
            };
            
            row.eachCell((cell) => {
                cell.border = {
                    top: {style:'thin', color: {argb:'FFE2E8F0'}},
                    left: {style:'thin', color: {argb:'FFE2E8F0'}},
                    bottom: {style:'thin', color: {argb:'FFE2E8F0'}},
                    right: {style:'thin', color: {argb:'FFE2E8F0'}}
                };
                if(typeof cell.value === 'number') {
                    cell.alignment = { horizontal: 'right' };
                }
            });
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `Full_Details_Dues_${dueMonthFilter}_${activeSessionStr}_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const downloadClassWiseTransportSummary = async () => {
        const classCounts: Record<string, number> = {};
        
        transportDues.forEach(s => {
            const className = s.className || 'Unassigned Class';
            classCounts[className] = (classCounts[className] || 0) + 1;
        });

        const CLASS_ORDER = [
            'Play', 'Nursery', 'Lower Kindergarten (LKG)', 'Upper Kindergarten (UKG)', 
            'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 
            'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 
            'Class 11 (Maths)', 'Class 11 (Bio)', 'Class 11 (Commerce)', 
            'Class 12 (Maths)', 'Class 12 (Bio)', 'Class 12 (Commerce)'
        ];

        const sortedClasses = Object.keys(classCounts).sort((a, b) => {
            let indexA = CLASS_ORDER.indexOf(a);
            let indexB = CLASS_ORDER.indexOf(b);
            if (indexA === -1) indexA = 999;
            if (indexB === -1) indexB = 999;
            if (indexA !== indexB) return indexA - indexB;
            return a.localeCompare(b);
        });

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Transport Summary');

        worksheet.columns = [
            { header: 'Class Name', key: 'className', width: 30 },
            { header: 'Transport Student Count', key: 'studentCount', width: 25 }
        ];

        const activeSessionStr = localStorage.getItem('activeSession') || '2024-2025';
        worksheet.insertRow(1, [`Academic Session: ${activeSessionStr} | Class-wise Transport Students Summary`]);
        worksheet.insertRow(2, []); // Blank spacer

        worksheet.mergeCells('A1:B1');
        worksheet.getRow(1).font = { bold: true, size: 12, color: { argb: 'FF1F2937' } };
        worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'left' };

        // Style the header (now row 3)
        worksheet.getRow(3).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        worksheet.getRow(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7C3AED' } }; // Purple color matching the button
        worksheet.getRow(3).alignment = { vertical: 'middle', horizontal: 'left' };

        sortedClasses.forEach(className => {
            worksheet.addRow({
                className: className,
                studentCount: classCounts[className]
            });
        });

        // Add Total Row
        const totalRow = worksheet.addRow({
            className: 'Total Transport Students',
            studentCount: transportDues.length
        });
        totalRow.font = { bold: true };
        totalRow.getCell('studentCount').font = { bold: true };
        totalRow.border = {
            top: { style: 'thin' },
            bottom: { style: 'double' }
        };

        // Align numbers to right
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber > 3) {
                row.getCell('studentCount').alignment = { horizontal: 'right' };
            }
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `Class_wise_Transport_Summary_${activeSessionStr}.xlsx`);
    };

    const exportPreviousDueExcel = () => {
        const filtered = dueFees
            .filter(f => (f.previousSessionDue || 0) > 0)
            .filter(f => prevDueClassFilter === 'All' || f.className === prevDueClassFilter)
            .filter(f => prevDueSearchQuery === '' || (f.studentName || '').toLowerCase().includes(prevDueSearchQuery.toLowerCase()));

        const headers = ['S.No.', 'Student Name', 'Father Name', 'Class', 'Previous Due (₹)'];
        const activeSessionStr = localStorage.getItem('activeSession') || '2024-2025';
        const csvContent = [
            `"Academic Session: ${activeSessionStr}"`,
            "",
            headers.join(','),
            ...filtered.map((f, idx) => [
                idx + 1,
                `"${f.studentName}"`,
                `"${f.fatherName || 'N/A'}"`,
                `"${f.className}"`,
                f.previousSessionDue
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Previous_Dues_${activeSessionStr}_${new Date().toLocaleDateString()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const fetchStudents = async () => {
        try {
            const session = localStorage.getItem('activeSession') || '2024-2025';
            const res = await axios.get(`/erp-api/admin/students?session=${session}`);
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
            if (pendingDues > 0) {
                const total = pendingDues;
                const discVal = Number(discount) || 0;
                const netPayable = Math.max(0, total - discVal).toString();
                setTotalFee(total.toString());
                setFinalAmount(netPayable);
                setPaidAmount(netPayable);
                return;
            }

            const struct = feeStructure.find(s => s.className === selectedClass);
            if (struct && struct.fees) {
                const currentStudent = students.find(s => s.admissionNo === admissionNo);

                const subtotal = selectedFees.reduce((sum, feeName) => {
                    if (feeName === 'Transport Fee') {
                        const unpaidTransportMonths = selectedMonths.filter(m => !isTransportPaidForMonth(m));
                        const fareVal = isTransportEnabled ? (Number(transportRows[0]?.price) || 0) : 0;
                        const unpaidCount = unpaidTransportMonths.length;
                        return sum + (fareVal * unpaidCount);
                    }
                    const head = feeHeads.find(h => h.name === feeName);
                    const isMonthly = head?.type === 'Monthly';
                    const isExempt = currentStudent && head ? isFeeExempt(currentStudent, head) : false;
                    const amount = isExempt ? 0 : (struct.fees[feeName] || 0);
                    const multiplier = isMonthly ? selectedMonths.filter(m => !isHeadPaidForMonth(feeName, m)).length : 1;
                    return sum + (amount * multiplier);
                }, 0);
                
                const total = subtotal;
                const discVal = Number(discount) || 0;
                const netPayable = Math.max(0, total - discVal).toString();
                setTotalFee(total.toString());
                setFinalAmount(netPayable);
                setPaidAmount(netPayable); // Auto-fill amount being paid
            }
        }
    }, [selectedClass, selectedFees, discount, feeStructure, isTransportEnabled, transportRows, pendingDues, selectedMonths]);

    const handleCollectOtherFee = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!otherFeeAmount || Number(otherFeeAmount) <= 0) {
            alert('Please enter a valid fee amount');
            return;
        }
        if (!otherFeeStudentName || !otherFeeAdmissionNo) {
            alert('Please enter student name and admission number');
            return;
        }

        setOtherFeeSubmitting(true);
        try {
            const matchingStudent = otherFeeStudent || students.find(s => s.admissionNo === otherFeeAdmissionNo || (s.name || '').toLowerCase() === otherFeeStudentName.toLowerCase()) || (students.length > 0 ? students[0] : null);

            const feeHeadValue = `${otherFeeCategory}${otherFeeDescription ? `: ${otherFeeDescription}` : ''}`;

            const payload = {
                studentId: matchingStudent?.id || (students.length > 0 ? students[0].id : undefined),
                admissionNo: otherFeeAdmissionNo,
                amountPaid: Number(otherFeeAmount),
                totalFee: Number(otherFeeAmount),
                discount: 0,
                feeHead: feeHeadValue,
                paymentMode: otherFeePaymentMode,
                month: new Date().toLocaleString('en-US', { month: 'long' }),
                year: new Date().getFullYear().toString(),
                submittedBy: user?.name || 'User',
                remark: otherFeeRemark || `Collected ${otherFeeCategory}${otherFeeAddress ? ` | Address: ${otherFeeAddress}` : ''}${otherFeeFatherName ? ` | Father: ${otherFeeFatherName}` : ''}`
            };

            if (otherFeePaymentMode === 'PayU') {
                const payuRes = await axios.post('/erp-api/fees/payu/initiate', {
                    studentId: matchingStudent?.id || (students.length > 0 ? students[0].id : undefined),
                    amountPaid: Number(otherFeeAmount),
                    totalFee: Number(otherFeeAmount),
                    discount: 0,
                    feeHead: feeHeadValue,
                    month: new Date().toLocaleString('en-US', { month: 'long' }),
                    year: new Date().getFullYear().toString(),
                    remark: otherFeeRemark || `Collected ${otherFeeCategory}`,
                    customerName: otherFeeStudentName,
                    customerEmail: 'student@school.com',
                    customerPhone: '9999999999',
                    udf4: 'Admin'
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
                    return;
                }
            }

            const res = await axios.post('/erp-api/fees/collect', payload);
            const savedRecord = res.data.data;

            const newRecord: FeeRecord = {
                ...savedRecord,
                paidAmount: savedRecord.amountPaid || savedRecord.paidAmount || Number(otherFeeAmount),
                id: savedRecord.id,
                date: new Date(savedRecord.paymentDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
                studentName: otherFeeStudentName,
                admissionNo: otherFeeAdmissionNo,
                className: otherFeeClass || 'General',
                sessionName: savedRecord.session?.name || null
            };

            setFeeRecords([newRecord, ...feeRecords]);
            setSelectedReceipt(newRecord);
            setShowReceipt(true);
            addNotification('fee', `${otherFeeCategory} Collected`, `₹${Number(otherFeeAmount).toLocaleString()} collected from ${otherFeeStudentName}.`);

            // Reset form
            setOtherFeeStudent(null);
            setOtherFeeStudentName('');
            setOtherFeeAdmissionNo('');
            setOtherFeeFatherName('');
            setOtherFeeClass('');
            setOtherFeeAddress('');
            setOtherFeeDescription('');
            setOtherFeeAmount('');
            setOtherFeeRemark('');
            setOtherFeeSearchQuery('');
            fetchNextReceiptNo();
            fetchDueFees();
            fetchAllHistory();
        } catch (err: any) {
            console.error(err);
            alert(err.response?.data?.error || 'Failed to collect fee');
        } finally {
            setOtherFeeSubmitting(false);
        }
    };

    const handleRetryPayment = async (record: FeeRecord) => {
        const student = students.find(s => s.admissionNo === admissionNo) || (record as any).student;
        if (!student) {
            alert('Student details not found');
            return;
        }

        const confirmRetry = window.confirm(`Retry payment of ₹${record.paidAmount || record.totalFee} for ${record.feeHead || 'Fee'} via PayU?`);
        if (!confirmRetry) return;

        setSubmitting(true);
        try {
            const payuRes = await axios.post('/erp-api/fees/payu/initiate', {
                studentId: student.id,
                amountPaid: Number(record.paidAmount || record.totalFee),
                totalFee: Number(record.totalFee || record.paidAmount),
                discount: Number(record.discount || 0),
                feeHead: record.feeHead || 'Retry Fee Payment',
                month: record.month || selectedMonths[0] || 'April',
                year: new Date().getFullYear().toString(),
                remark: `Retry Payment for ${record.receiptNo || 'Failed Txn'}`,
                customerName: student.name || studentName,
                customerEmail: 'student@school.com',
                customerPhone: '9999999999',
                udf4: 'Admin'
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
            } else {
                alert('Could not initiate PayU Gateway: ' + (payuRes.data.error || 'Unknown error'));
                setSubmitting(false);
            }
        } catch (err: any) {
            alert('Failed to retry payment: ' + (err.message || err));
            setSubmitting(false);
        }
    };

    const handleCollectFee = async (e: React.FormEvent) => {
        e.preventDefault();
        if (submitting) return;
        
        const student = students.find(s => s.admissionNo === admissionNo);
        if (!student || !paidAmount || !receiptNo || (selectedFees.length === 0 && pendingDues === 0 && !isTransportEnabled)) 
            return showAppAlert('Selection Incomplete', 'Please search student and select at least one fee head or clear previous dues.', 'warning');

        if (pendingDues === 0 && selectedMonths.length > 0) {
            const months = ['April','May','June','July','August','September','October','November','December','January','February','March'];
            const firstSelectedIdx = months.indexOf(selectedMonths[0]);
            const unselectedEarlier: { month: string; amount: number; heads: string[] }[] = [];
            let totalUnpaidEarlier = 0;

            const struct = feeStructure.find(s => s.className === student.className);
            const currentStudent = student;

            for (let i = 0; i < firstSelectedIdx; i++) {
                const prevM = months[i];
                if (!isMonthPaid(prevM)) {
                    let monthExpected = 0;
                    const dueHeadNames: string[] = [];
                    feeHeads.filter(h => h.type === 'Monthly').forEach(h => {
                        const isExempt = currentStudent ? isFeeExempt(currentStudent, h) : false;
                        const perMonth = isExempt ? 0 : (struct?.fees?.[h.name] || 0);
                        if (perMonth > 0 && !isHeadPaidForMonth(h.name, prevM)) {
                            monthExpected += perMonth;
                            dueHeadNames.push(`${h.name}: ₹${perMonth.toLocaleString()}`);
                        }
                    });
                    if (isTransportEnabled && !isTransportPaidForMonth(prevM)) {
                        const busFare = Number(transportRows[0]?.price) || 0;
                        if (busFare > 0) {
                            monthExpected += busFare;
                            dueHeadNames.push(`Transport Bus: ₹${busFare.toLocaleString()}`);
                        }
                    }
                    unselectedEarlier.push({
                        month: prevM,
                        amount: monthExpected,
                        heads: dueHeadNames
                    });
                    totalUnpaidEarlier += monthExpected;
                }
            }
            if (unselectedEarlier.length > 0) {
                const breakdownText = unselectedEarlier.map(d => 
                    `• ${d.month}: ₹${d.amount.toLocaleString()} (${d.heads.join(', ')})`
                ).join('\n');
                return showAppAlert(
                    'Previous Month Dues Pending', 
                    `Cannot collect fee for ${selectedMonths.join(', ')} because earlier month fee of ₹${totalUnpaidEarlier.toLocaleString()} is still unpaid.\n\nDue Details:\n${breakdownText}\n\nPlease collect earlier month dues first.`, 
                    'warning',
                    totalUnpaidEarlier
                );
            }
        }
            
        const isApprover = isApproverRole(user?.role);
        const isPending = Number(discount) > 0 && (!isApprover || requiresApproval);
        
        setSubmitting(true);
        try {
            const struct = feeStructure.find(s => s.className === student.className);
            const currentStudent = students.find(s => s.admissionNo === admissionNo);

            let feeHeadValue = '';
            if (pendingDues > 0) {
                feeHeadValue = `Previous Dues: ${Number(totalFee)}`;
            } else {
                const breakdownParts = selectedFees.filter(f => f !== 'Transport Fee').map(f => {
                    const head = feeHeads.find(h => h.name === f);
                    const isMonthly = head?.type === 'Monthly';
                    const isExempt = currentStudent && head ? isFeeExempt(currentStudent, head) : false;
                    const amount = isExempt ? 0 : (struct?.fees?.[f] || 0);
                    const unpaidCount = isMonthly ? selectedMonths.filter(m => !isHeadPaidForMonth(f, m)).length : 1;
                    return `${f}: ${amount * unpaidCount}`;
                });
                if (isTransportEnabled && selectedFees.includes('Transport Fee')) {
                    transportRows.forEach(r => {
                        if (r.name && r.price) {
                            const unpaidTransportCount = selectedMonths.filter(m => !isTransportPaidForMonth(m)).length;
                            const amount = Number(r.price) * unpaidTransportCount;
                            breakdownParts.push(`Transport (${r.name}): ${amount}`);
                        }
                    });
                }

                const hasMonthly = selectedFees.some(f => {
                    if (f === 'Transport Fee') return false;
                    const head = feeHeads.find(h => h.name === f);
                    return head?.type === 'Monthly';
                }) || (isTransportEnabled && selectedFees.includes('Transport Fee'));

                const feeHeadPrefix = hasMonthly ? `${selectedMonths.join(', ')} ==> ` : ' ==> ';
                feeHeadValue = `${feeHeadPrefix}${breakdownParts.join(' || ')}`;
            }

            const payload = {
                studentId: student.id,
                admissionNo: student.admissionNo,
                amountPaid: Number(paidAmount),
                totalFee: Number(totalFee),
                discount: Number(discount),
                requiresApproval: !isApprover || Boolean(requiresApproval),
                discountReason: isPending ? 'Requested Discount' : (Number(discount) > 0 ? 'Direct Discount' : ''),
                feeHead: feeHeadValue,
                paymentMode,
                month: pendingDues > 0 ? (selectedMonths[0] || 'April') : selectedMonths[0], // Primary month for grouping
                year: new Date().getFullYear().toString(),
                submittedBy: user?.name || 'User',
                remark: remark || (pendingDues > 0 ? 'Clearance of Outstanding Previous Dues' : '')
            };

            if (paymentMode === 'PayU') {
                const payuRes = await axios.post('/erp-api/fees/payu/initiate', {
                    studentId: student.id,
                    amountPaid: Number(paidAmount),
                    totalFee: Number(totalFee),
                    discount: Number(discount),
                    feeHead: feeHeadValue,
                    month: selectedMonths[0] || 'April',
                    year: new Date().getFullYear().toString(),
                    remark: remark || 'Paid via PayU Online Gateway',
                    customerName: student.name,
                    customerEmail: 'student@school.com',
                    customerPhone: '9999999999',
                    udf4: 'Admin'
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
                    return;
                }
            }

            const res = await axios.post('/erp-api/fees/collect', payload);
            const savedRecord = res.data.data;
            
            const newRecord: FeeRecord = { 
                ...savedRecord,
                paidAmount: savedRecord.amountPaid || savedRecord.paidAmount || 0,
                id: savedRecord.id,
                date: new Date(savedRecord.paymentDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
                studentName: student.name,
                admissionNo: student.admissionNo,
                className: student.className,
                sessionName: savedRecord.session?.name || null
            };

            
            setFeeRecords([newRecord, ...feeRecords]);
            setStudentHistory(prev => [newRecord, ...prev]);
            
            if (isPending) {
                setPendingApprovalsCount(prev => prev + 1);
                showAppAlert('Approval Request Submitted', `Fee collection for ${studentName} contains a discount and has been submitted to Principal / Super Admin for approval.`, 'info');
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
            setIsOldStudent(false);
            setSelectedClass('');
            setSelectedFees([]);
            setPaidAmount(''); 
            setTotalFee('0'); 
            setDiscount('0'); 
            setRequiresApproval(false);
            setFinalAmount('0');
            const currentMonthNameReset = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][new Date().getMonth()];
            setSelectedMonth(currentMonthNameReset);
            setSelectedMonths([currentMonthNameReset]);
            setIsTransportEnabled(false);
            setIsTransportFixed(false);
            setTransportRows([{ name: '', km: '', price: '', showDropdown: false }]);
            setPendingDues(0);
            setRemark('');
            fetchNextReceiptNo();
            fetchPendingApprovals();
            fetchDueFees();
            fetchAllHistory();
        } catch (error: any) {
            console.error(error);
            const errMsg = error.response?.data?.error || 'Failed to process fee collection';
            showAppAlert('Collection Error', errMsg, 'error');
        } finally {
            setSubmitting(false);
        }

    };
 
    const handlePayPreviousYearDuesRedirect = (fee: any) => {
        // Reset selected fees to avoid mix-up
        setSelectedFees([]);
        
        // Switch to Fee Collection tab
        setActiveTab('collection');
        
        // Populate search/selection details
        setStudentName(fee.studentName);
        setAdmissionNo(fee.admissionNo);
        setFatherName(fee.fatherName || 'N/A');
        setSelectedClass(fee.className);
        
        // Fetch student history, dues (populates pendingDues), and ledger
        fetchStudentHistory(fee.id, fee.studentName);
        
        // Close search dropdown
        setShowSearchDropdown(false);
    };

    const handlePayDuesRedirect = (fee: any, monthFilter: string) => {
        // Switch to Fee Collection tab
        setActiveTab('collection');
        
        // Populate search/selection details
        setStudentName(fee.studentName);
        setAdmissionNo(fee.admissionNo);
        setFatherName(fee.fatherName || 'N/A');
        setSelectedClass(fee.className);
        
        // Fetch student history, dues (populates pendingDues), and ledger with autoSelect enabled
        fetchStudentHistory(fee.id, fee.studentName, true, fee, monthFilter);
        
        // Close search dropdown
        setShowSearchDropdown(false);
    };

    const checkPayUTransactionStatus = async (txnid: string) => {
        if (!txnid || txnid === '-') {
            alert('No PayU Transaction ID associated with this record.');
            return;
        }
        try {
            const res = await axios.get(`/erp-api/fees/payu/verify-status/${txnid}`);
            const data = res.data;
            if (data.status === 'SUCCESS' || data.gatewayStatus === 'success') {
                alert(`✅ PayU Verified Success!\n\nTxn ID: ${txnid}\nAmount: ₹${data.amount || ''}\nPayU Status: ${data.gatewayStatus || data.status}\n\nYou can now click 'Approve' to issue the official receipt.`);
            } else {
                alert(`ℹ️ PayU Status: ${data.gatewayStatus || data.status || 'PENDING'}\n\nTxn ID: ${txnid}\nMessage: ${data.message || 'Payment is pending or awaiting confirmation.'}`);
            }
        } catch (err: any) {
            alert('Failed to check status with PayU: ' + (err.response?.data?.error || err.message));
        }
    };

    const approveFee = async (id: string) => {
        try {
            const res = await axios.post(`/erp-api/fees/${id}/approve`, { approvedBy: user?.name });
            const updated = res.data?.data;
            setFeeRecords(prev => prev.map(rec => 
                rec.id === id ? { ...rec, ...updated, status: 'APPROVED' } : rec
            ));
            setPendingApprovalsCount(prev => Math.max(0, prev - 1));
            addNotification('fee', 'Fee Approved', `Fee Approved! Receipt ${updated?.receiptNo || ''} generated.`);
            fetchPendingApprovals();
            fetchAllHistory();
            fetchDueFees();

            if (updated) {
                const targetRec = feeRecords.find(r => r.id === id);
                const fullReceipt = {
                    ...updated,
                    paidAmount: updated.amountPaid || targetRec?.paidAmount || 0,
                    studentName: targetRec?.studentName || 'Student',
                    className: targetRec?.className || '',
                    admissionNo: targetRec?.admissionNo || ''
                };
                setSelectedReceipt(fullReceipt);
                setShowReceipt(true);
            }
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
            setPendingApprovalsCount(prev => Math.max(0, prev - 1));
            addNotification('fee', 'Fee Rejected', 'Fee approval request has been rejected.');
            fetchPendingApprovals();
            fetchAllHistory();
            fetchDueFees();
        } catch (error) {
            alert('Failed to reject fee');
        }
    };


    const payFullRejectedFee = async (id: string) => {
        if (!window.confirm('Discount was rejected. Are you sure you want to collect the FULL amount now?')) return;
        try {
            const res = await axios.post(`/erp-api/fees/${id}/pay-full`);
            const data = res.data.data;
            const updatedRec: FeeRecord = {
                ...data,
                paidAmount: data.amountPaid || data.paidAmount || 0,
                id: data.id,
                date: new Date(data.paymentDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
                studentName: feeRecords.find(r => r.id === id)?.studentName || 'Student',
                className: feeRecords.find(r => r.id === id)?.className || '',
                sessionName: data.session?.name || null
            };
            setFeeRecords(prev => prev.map(rec => rec.id === id ? updatedRec : rec));
            setSelectedReceipt(updatedRec);
            setShowReceipt(true);
            addNotification('fee', 'Full Amount Collected', 'Rejected draft has been updated to full amount and paid.');
            fetchPendingApprovals();
            fetchAllHistory();
            fetchDueFees();
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

    const renderMonthlyFeeHeads = () => {
        const struct = feeStructure.find(s => s.className === selectedClass);
        const currentStudent = students.find(s => s.admissionNo === admissionNo);
        
        const headsToRender = feeHeads.filter(h => {
            const amount = struct?.fees?.[h.name] || 0;
            return h.type === 'Monthly' && amount > 0;
        }).map(h => {
            const isExempt = currentStudent ? isFeeExempt(currentStudent, h) : false;
            const perMonthAmount = isExempt ? 0 : (struct?.fees?.[h.name] || 0);
            const unpaidMonths = selectedMonths.filter(m => !isHeadPaidForMonth(h.name, m));
            const amount = perMonthAmount * unpaidMonths.length;
            const isSelected = selectedFees.includes(h.name);
            const paid = isExempt ? true : (unpaidMonths.length === 0);
            const partiallyPaid = !paid && unpaidMonths.length < selectedMonths.length;

            return {
                id: h.id,
                name: h.name,
                amount,
                isSelected,
                paid,
                partiallyPaid,
                isRTE: isExempt,
                unpaidCount: unpaidMonths.length
            };
        });

        const activeTransportFare = isTransportEnabled ? (Number(transportRows[0]?.price) || 0) : 0;
        const activeTransportRoute = isTransportEnabled ? (transportRows[0]?.name || '') : '';
        const showTransportFeeHead = isTransportEnabled && activeTransportFare > 0;

        if (showTransportFeeHead) {
            const unpaidTransportMonths = selectedMonths.filter(m => !isTransportPaidForMonth(m));
            const amount = activeTransportFare * unpaidTransportMonths.length;
            const isSelected = selectedFees.includes('Transport Fee');
            const paid = unpaidTransportMonths.length === 0;
            const partiallyPaid = !paid && unpaidTransportMonths.length < selectedMonths.length;

            headsToRender.push({
                id: 'transport-fee-item',
                name: `Transport Fee (${activeTransportRoute || 'Bus'})`,
                amount,
                isSelected,
                paid,
                partiallyPaid,
                isRTE: false,
                unpaidCount: unpaidTransportMonths.length
            });
        }

        return headsToRender.map(item => {
            const isTransportItem = item.id === 'transport-fee-item';
            const isPurpleTheme = isTransportItem && !item.paid;

            return (
                <div 
                    key={item.id}
                    onClick={item.paid ? undefined : () => {
                        const key = item.id === 'transport-fee-item' ? 'Transport Fee' : item.name;
                        if (selectedFees.includes(key)) {
                            setSelectedFees(selectedFees.filter(x => x !== key));
                        } else {
                            setSelectedFees([...selectedFees, key]);
                        }
                    }}
                    style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        padding: '0.85rem 1rem', 
                        borderRadius: '12px', 
                        background: item.paid ? '#f0fdf4' : isPurpleTheme ? (item.isSelected ? '#f3e8ff' : '#faf5ff') : (item.isSelected ? '#eff6ff' : 'white'),
                        border: `1.5px solid ${item.paid ? '#bbf7d0' : isPurpleTheme ? (item.isSelected ? '#9333ea' : '#c084fc') : (item.isSelected ? '#bfdbfe' : '#e2e8f0')}`,
                        cursor: item.paid ? 'default' : 'pointer',
                        transition: '0.2s',
                        boxShadow: isPurpleTheme && item.isSelected ? '0 4px 6px -1px rgba(147, 51, 234, 0.15)' : 'none'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {item.paid ? (
                            <Check size={18} color="#166534" strokeWidth={3} />
                        ) : (
                            <input 
                                type="checkbox" 
                                checked={item.isSelected} 
                                readOnly 
                                style={{ 
                                    width: '18px', 
                                    height: '18px', 
                                    accentColor: isPurpleTheme ? '#9333ea' : undefined 
                                }} 
                            />
                        )}
                        <span style={{ fontWeight: '600', color: item.paid ? '#166534' : isPurpleTheme ? '#6b21a8' : '#1e293b' }}>
                            {item.name} {item.isRTE && <span style={{ marginLeft: '0.5rem', fontSize: '0.65rem', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>{currentStudent?.isThirdChild ? 'Third Child Exempt' : 'RTE Exempt'}</span>}
                        </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                         <div style={{ fontWeight: '800', color: item.paid ? '#166534' : isPurpleTheme ? '#7c3aed' : '#1e293b' }}>₹{item.amount.toLocaleString()}</div>
                         {item.isRTE ? (
                             <span style={{ fontSize: '0.65rem', fontWeight: '800', color: '#166534', textTransform: 'uppercase' }}>{currentStudent?.isThirdChild ? 'Third Child Exempt' : 'RTE Exempt'}</span>
                         ) : item.paid ? (
                             <span style={{ fontSize: '0.65rem', fontWeight: '800', color: '#166534', textTransform: 'uppercase' }}>Already Paid</span>
                         ) : item.partiallyPaid ? (
                             <span style={{ fontSize: '0.65rem', fontWeight: '800', color: isPurpleTheme ? '#9333ea' : '#f59e0b', textTransform: 'uppercase' }}>{item.unpaidCount} Month(s) Remaining</span>
                         ) : isPurpleTheme ? (
                             <span style={{ fontSize: '0.65rem', fontWeight: '800', color: '#7c3aed', textTransform: 'uppercase' }}>Transport Due</span>
                         ) : null}
                     </div>
                </div>
            );
        });
    };

    return (
        <>
            <div style={{ padding: '1rem' }} className="no-print-area">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: '#111827', margin: 0 }}>Accounts & Fee Management</h1>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', background: '#f1f5f9', padding: '0.4rem', borderRadius: '12px', flexWrap: 'wrap', overflowX: 'auto' }}>
                    {[
                        { id: 'collection', label: 'Fee Collection' },
                        { id: 'other_fees', label: 'Other Fees (Registration/Late/Event)' },
                        { id: 'drafts', label: 'My Drafts' },
                        { id: 'approvals', label: 'Approvals' },
                        { id: 'heads', label: 'Fee Heads' },
                        { id: 'due', label: 'Due Fees' },
                        { id: 'previous_due', label: 'Previous Year Dues' },
                        { id: 'structure', label: 'Fee Structure' },
                        { id: 'reports', label: 'Fee Reports' }
                    ].filter(tab => {
                        if (user?.role === 'ACCOUNTS2') {
                            return tab.id === 'collection' || tab.id === 'other_fees';
                        }
                        return true;
                    }).map(tab => {

                        // Principal, Admin, and Superadmin for Approvals
                        const isAuthorized = isApproverRole(user?.role);
                        if (tab.id === 'approvals' && !isAuthorized) return null;
                             // Accountant only for Drafts
                        if (tab.id === 'drafts' && user?.role !== 'ACCOUNTS' && user?.role !== 'ACCOUNTS2') return null;

                        const isDisabled = tab.id === 'heads';

                        return (
                            <button 
                                key={tab.id} 
                                onClick={() => !isDisabled && setActiveTab(tab.id as any)} 
                                disabled={isDisabled}
                                style={{ 
                                    padding: '0.5rem 1rem', 
                                    borderRadius: '8px', 
                                    border: 'none', 
                                    cursor: isDisabled ? 'not-allowed' : 'pointer', 
                                    fontWeight: '700', 
                                    fontSize: '0.85rem', 
                                    backgroundColor: activeTab === tab.id ? 'white' : 'transparent', 
                                    color: isDisabled ? '#cbd5e1' : (activeTab === tab.id ? '#2563eb' : '#64748b'), 
                                    boxShadow: activeTab === tab.id ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', 
                                    opacity: isDisabled ? 0.6 : 1,
                                    transition: '0.2s' 
                                }}
                                title={isDisabled ? "Fee Heads tab is disabled" : ""}
                            >
                                {tab.id === 'approvals' && pendingApprovalsCount > 0 ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        {tab.label} <span style={{ backgroundColor: '#ef4444', color: 'white', fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '10px' }}>{pendingApprovalsCount}</span>
                                    </div>
                                ) : tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {activeTab === 'collection' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
                    {/* 1. Student Search */}
                    <div className="stat-card" style={{ display: 'block', padding: '1rem 1.25rem', margin: 0 }}>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                             <div className="form-group student-search-group" style={{ flex: 2, minWidth: '260px', position: 'relative', margin: 0 }}>
                                 <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem', display: 'block' }}>Search Student (Name or Admission No)</label>
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
                                         } else {
                                             const exactMatch = students.find(s => 
                                                 s.admissionNo?.toLowerCase() === val.toLowerCase().trim()
                                             );
                                             if (exactMatch) {
                                                 setStudentName(exactMatch.name);
                                                 setAdmissionNo(exactMatch.admissionNo);
                                                 setFatherName(exactMatch.fatherName || 'N/A');
                                                 setIsOldStudent(Boolean(exactMatch.isOldStudent));
                                                 setSelectedClass(exactMatch.className);
                                                 fetchStudentHistory(exactMatch.id, exactMatch.name);
                                                 setShowSearchDropdown(false);
                                             }
                                         }
                                     }} 
                                     onKeyDown={e => {
                                          if (e.key === 'Enter') {
                                              e.preventDefault();
                                              const filtered = students.filter(s => 
                                                  (s.name || '').toLowerCase().includes(studentName.toLowerCase()) || 
                                                  (s.admissionNo || '').toLowerCase().includes(studentName.toLowerCase())
                                              );
                                              if (filtered.length > 0) {
                                                  const s = filtered[0];
                                                  setStudentName(s.name);
                                                  setAdmissionNo(s.admissionNo);
                                                  setFatherName(s.fatherName || 'N/A');
                                                  setIsOldStudent(Boolean(s.isOldStudent));
                                                  setSelectedClass(s.className);
                                                  fetchStudentHistory(s.id, s.name);
                                                  setShowSearchDropdown(false);
                                              }
                                          }
                                      }}
                                     style={{ height: '38px', padding: '0.4rem 0.75rem', fontSize: '0.9rem' }}
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
                                         maxHeight: '260px', 
                                         overflowY: 'auto' 
                                     }}>
                                         {(() => {
                                             const filtered = students.filter(s => 
                                                 s.name.toLowerCase().includes(studentName.toLowerCase()) || 
                                                 s.admissionNo.toLowerCase().includes(studentName.toLowerCase()) ||
                                                 s.className.toLowerCase().includes(studentName.toLowerCase())
                                             ).slice(0, 10);

                                             if (filtered.length === 0) return <div style={{ padding: '1rem', textAlign: 'center', color: '#64748b' }}>No students found</div>;

                                             return filtered.map(s => (
                                                 <div 
                                                     key={s.id} 
                                                     onClick={() => {
                                                         setStudentName(s.name);
                                                         setAdmissionNo(s.admissionNo);
                                                         setFatherName(s.fatherName || 'N/A');
                                                         setIsOldStudent(Boolean(s.isOldStudent));
                                                         setSelectedClass(s.className);
                                                         fetchStudentHistory(s.id, s.name);
                                                         setShowSearchDropdown(false);
                                                     }}
                                                     style={{ 
                                                         padding: '0.6rem 1rem', 
                                                         cursor: 'pointer', 
                                                         borderBottom: '1px solid #f1f5f9',
                                                         transition: 'background 0.2s'
                                                     }}
                                                     onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                                     onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
                                                 >
                                                     <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '0.85rem' }}>{s.name}</div>
                                                     <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                         {s.admissionNo} • {s.className}
                                                     </div>
                                                 </div>
                                             ));
                                         })()}
                                     </div>
                                 )}
                             </div>
                            <div className="form-group" style={{ flex: 1, minWidth: '140px', margin: 0 }}>
                                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem', display: 'block' }}>Installment / Month</label>
                                 <select 
                                    className="form-control" 
                                    value={selectedMonth} 
                                    disabled={pendingDues > 0}
                                    title={pendingDues > 0 ? "Please clear previous dues first" : ""}
                                    style={{ 
                                        height: '38px',
                                        backgroundColor: pendingDues > 0 ? '#f1f5f9' : 'white', 
                                        cursor: pendingDues > 0 ? 'not-allowed' : 'pointer',
                                        opacity: pendingDues > 0 ? 0.6 : 1,
                                        fontSize: '0.85rem',
                                        fontWeight: 600
                                    }}
                                    onChange={e => {
                                        const months = ['April','May','June','July','August','September','October','November','December','January','February','March'];
                                        const newM = e.target.value;
                                        const mIdx = months.indexOf(newM);
                                        
                                        const unpaidEarlierDetails: { month: string; amount: number; heads: string[] }[] = [];
                                        let totalUnpaidEarlier = 0;
                                        const struct = feeStructure.find(s => s.className === selectedClass);
                                        const currentStudent = students.find(s => s.admissionNo === admissionNo);

                                        for (let i = 0; i < mIdx; i++) {
                                            const prevM = months[i];
                                            if (!isMonthPaid(prevM)) {
                                                let monthExpected = 0;
                                                const dueHeadNames: string[] = [];
                                                feeHeads.filter(h => h.type === 'Monthly').forEach(h => {
                                                    const isExempt = currentStudent ? isFeeExempt(currentStudent, h) : false;
                                                    const perMonth = isExempt ? 0 : (struct?.fees?.[h.name] || 0);
                                                    if (perMonth > 0 && !isHeadPaidForMonth(h.name, prevM)) {
                                                        monthExpected += perMonth;
                                                        dueHeadNames.push(`${h.name}: ₹${perMonth.toLocaleString()}`);
                                                    }
                                                });
                                                if (isTransportEnabled && !isTransportPaidForMonth(prevM)) {
                                                    const busFare = Number(transportRows[0]?.price) || 0;
                                                    if (busFare > 0) {
                                                        monthExpected += busFare;
                                                        dueHeadNames.push(`Transport Bus: ₹${busFare.toLocaleString()}`);
                                                    }
                                                }
                                                unpaidEarlierDetails.push({
                                                    month: prevM,
                                                    amount: monthExpected,
                                                    heads: dueHeadNames
                                                });
                                                totalUnpaidEarlier += monthExpected;
                                            }
                                        }

                                        if (unpaidEarlierDetails.length > 0) {
                                            const breakdownText = unpaidEarlierDetails.map(d => 
                                                `• ${d.month}: ₹${d.amount.toLocaleString()} (${d.heads.join(', ')})`
                                            ).join('\n');

                                            showAppAlert(
                                                'Previous Month Dues Alert',
                                                `Cannot jump directly to ${newM} because previous month fee of ₹${totalUnpaidEarlier.toLocaleString()} is still unpaid.\n\nDue Details:\n${breakdownText}\n\nYou must collect previous dues first.`,
                                                'warning',
                                                totalUnpaidEarlier
                                            );
                                            setSelectedMonth(unpaidEarlierDetails[0].month);
                                        } else {
                                            setSelectedMonth(newM);
                                        }
                                    }}
                                >
                                    {['April','May','June','July','August','September','October','November','December','January','February','March'].map((m, idx, arr) => {
                                        const hasPriorUnpaid = pendingDues > 0 || arr.slice(0, idx).some(prevM => !isMonthPaid(prevM));
                                        const isPaid = isMonthPaid(m);
                                        return (
                                            <option key={m} value={m} disabled={hasPriorUnpaid}>
                                                {m} {isPaid ? '✓ (Paid)' : hasPriorUnpaid ? '🔒 (Prior Due Unpaid)' : ''}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                            <div className="form-group" style={{ flex: 1, minWidth: '130px', margin: 0 }}>
                                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem', display: 'block' }}>Receipt No</label>
                                <input type="text" className="form-control" value={receiptNo} readOnly style={{ height: '38px', backgroundColor: '#f1f5f9', fontWeight: 700, color: '#2563eb', fontSize: '0.85rem' }} />
                            </div>
                            <div className="form-group" style={{ flex: 1, minWidth: '130px', margin: 0 }}>
                                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.25rem', display: 'block' }}>Date</label>
                                <input type="date" className="form-control" value={date} onChange={e => setDate(e.target.value)} style={{ height: '38px', fontSize: '0.85rem' }} />
                            </div>
                        </div>
                    </div>

                    {studentName && admissionNo ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1.25rem', alignItems: 'start' }}>
                            {/* LEFT COLUMN: Student details, month tiles, fee checkboxes, transport */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {/* 2. Student Details */}
                                <div className="stat-card" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.85rem 1.25rem', position: 'relative' }}>
                                    <div style={{ gridColumn: 'span 5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                        <h3 style={{ color: '#1e293b', fontSize: '0.95rem', margin: 0, fontWeight: 800 }}>Student Information</h3>
                                        <button 
                                            type="button"
                                            onClick={() => setShowTransactionDetailsModal(true)}
                                            style={{
                                                backgroundColor: '#3b82f6',
                                                color: '#ffffff',
                                                border: 'none',
                                                padding: '0.3rem 0.75rem',
                                                borderRadius: '6px',
                                                fontSize: '0.75rem',
                                                fontWeight: '700',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.35rem',
                                                boxShadow: '0 2px 4px rgba(59, 130, 246, 0.25)'
                                            }}
                                        >
                                            <FileText size={14} /> Transaction Details ({studentHistory.length})
                                        </button>
                                    </div>
                                    <div>
                                        <label style={{ color: '#64748b', fontSize: '0.75rem' }}>Full Name</label>
                                        <div style={{ fontWeight: '700', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                            {studentName}
                                            {isOldStudent && (
                                                <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', backgroundColor: '#e0f2fe', color: '#0369a1', borderRadius: '8px', fontWeight: 700, border: '1px solid #bae6fd' }}>
                                                    Old
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div><label style={{ color: '#64748b', fontSize: '0.75rem' }}>Father Name</label><div style={{ fontWeight: '700', fontSize: '0.95rem' }}>{fatherName}</div></div>
                                    <div><label style={{ color: '#64748b', fontSize: '0.75rem' }}>Admission No</label><div style={{ fontWeight: '700', fontSize: '0.95rem', color: '#2563eb' }}>{admissionNo}</div></div>
                                    <div><label style={{ color: '#64748b', fontSize: '0.75rem' }}>Current Class</label><div style={{ fontWeight: '700', fontSize: '0.95rem' }}>{selectedClass}</div></div>
                                    <div>
                                        <label style={{ color: '#64748b', fontSize: '0.75rem' }}>Status & Advance</label>
                                        <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                                            <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '0.15rem 0.5rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 'bold' }}>Active</span>
                                            {(() => {
                                                const dueRec = dueFees.find((f: any) => f.admissionNo === admissionNo);
                                                const advAmt = dueRec?.advancePaid || dueRec?.advanceBalance || 0;
                                                if (advAmt > 0) {
                                                    return (
                                                        <span style={{ backgroundColor: '#dbeafe', color: '#1e40af', padding: '0.15rem 0.5rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: '800' }}>
                                                             Adv: ₹{advAmt.toLocaleString()}
                                                        </span>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </div>
                                    </div>
                                </div>

                                {/* Concession Info Panel (shown for RTE / Third Child) */}
                                {(() => {
                                    const currentStudent = students.find((s: any) => s.admissionNo === admissionNo);
                                    if (!currentStudent) return null;
                                    const isRTE = currentStudent.isRT || false;
                                    const isThirdChild = currentStudent.isThirdChild || false;
                                    if (!isRTE && !isThirdChild) return null;

                                    // Compute discount from fee structure
                                    const struct = feeStructure.find((s: any) => s.className === selectedClass);
                                    let monthlyDiscount = 0;
                                    feeHeads.forEach((h: any) => {
                                        if (h.type === 'Monthly') {
                                            const amt = struct?.fees?.[h.name] || 0;
                                            if (isRTE) {
                                                monthlyDiscount += amt;
                                            } else if (isThirdChild) {
                                                const isComputer = h.name.toLowerCase().includes('computer class fee');
                                                if (!isComputer) monthlyDiscount += amt;
                                            }
                                        }
                                    });

                                    return (
                                        <div style={{
                                            background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
                                            border: '1.5px solid #86efac',
                                            borderRadius: '10px',
                                            padding: '0.65rem 1rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: '1rem',
                                            flexWrap: 'wrap'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                                <span style={{ fontSize: '1.2rem' }}>🎓</span>
                                                <div>
                                                    <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#065f46' }}>
                                                        {isRTE ? 'RTE Student — 100% Monthly Fee Exemption Active' : '3rd Child Concession — Tuition Fee Exemption Active'}
                                                    </div>
                                                    <div style={{ fontSize: '0.72rem', color: '#047857', marginTop: '0.1rem' }}>
                                                        {isRTE ? 'All monthly fee heads are auto-exempt. Only previous dues & one-time fees apply if any.' : 'Only Computer Class Fee & Transport apply. All tuition heads are auto-exempt.'}
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                <div style={{ fontSize: '0.65rem', color: '#059669', fontWeight: 800, textTransform: 'uppercase' }}>Monthly Savings</div>
                                                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#15803d' }}>₹{monthlyDiscount.toLocaleString()}<span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#16a34a' }}>/mo</span></div>
                                                <div style={{ fontSize: '0.65rem', color: '#059669', fontWeight: 700 }}>₹{(monthlyDiscount * 12).toLocaleString()}/yr</div>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* 3. Fee Structure & Month Tracker */}
                                <div className="stat-card" style={{ display: 'block', padding: '1.25rem' }}>
                                    {pendingDues > 0 && (
                                        <div style={{ backgroundColor: '#fef2f2', border: '2px solid #ef4444', borderRadius: '10px', padding: '0.85rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '0.5rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <AlertCircle size={22} />
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: '800', color: '#991b1b', fontSize: '0.95rem' }}>
                                                        Outstanding Dues: ₹{pendingDues.toLocaleString()}
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: '#b91c1c', marginTop: '2px' }}>
                                                        This pending balance must be cleared first before monthly fee heads unlock.
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right', minWidth: '100px' }}>
                                                <div style={{ fontWeight: '900', fontSize: '1.2rem', color: '#991b1b' }}>₹{pendingDues.toLocaleString()}</div>
                                            </div>
                                        </div>
                                    )}

                                    <div style={{ 
                                        opacity: pendingDues > 0 ? 0.35 : 1, 
                                        pointerEvents: pendingDues > 0 ? 'none' : 'auto', 
                                        filter: pendingDues > 0 ? 'grayscale(0.85)' : 'none', 
                                        userSelect: pendingDues > 0 ? 'none' : 'auto', 
                                        transition: 'all 0.3s ease' 
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                            <p style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <Calendar size={13} /> Monthly Payment Status (2024-25)
                                            </p>
                                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                                                <button 
                                                    disabled={pendingDues > 0}
                                                    onClick={() => {
                                                        const struct = feeStructure.find(s => s.className === selectedClass);
                                                        const unpaidHeads = feeHeads.filter(h => (struct?.fees?.[h.name] || 0) > 0 && !isFeePaid(h.name)).map(h => h.name);
                                                        
                                                        const activeTransportFare = isTransportEnabled ? (Number(transportRows[0]?.price) || 0) : 0;
                                                        const showTransportFeeHead = isTransportEnabled && activeTransportFare > 0;
                                                        if (showTransportFeeHead) {
                                                            const unpaidTransportMonths = selectedMonths.filter(m => !isTransportPaidForMonth(m));
                                                            if (unpaidTransportMonths.length > 0) {
                                                                unpaidHeads.push('Transport Fee');
                                                            }
                                                        }

                                                        if (selectedFees.length === unpaidHeads.length) {
                                                            setSelectedFees([]);
                                                        } else {
                                                            setSelectedFees(unpaidHeads);
                                                        }
                                                    }}
                                                    style={{ padding: '0.25rem 0.65rem', fontSize: '0.7rem', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'white', cursor: pendingDues > 0 ? 'not-allowed' : 'pointer', fontWeight: '700' }}
                                                >
                                                    {(() => {
                                                        const struct = feeStructure.find(s => s.className === selectedClass);
                                                        const unpaidHeads = feeHeads.filter(h => (struct?.fees?.[h.name] || 0) > 0 && !isFeePaid(h.name)).map(h => h.name);
                                                        
                                                        const activeTransportFare = isTransportEnabled ? (Number(transportRows[0]?.price) || 0) : 0;
                                                        const showTransportFeeHead = isTransportEnabled && activeTransportFare > 0;
                                                        if (showTransportFeeHead) {
                                                            const unpaidTransportMonths = selectedMonths.filter(m => !isTransportPaidForMonth(m));
                                                            if (unpaidTransportMonths.length > 0) {
                                                                unpaidHeads.push('Transport Fee');
                                                            }
                                                        }
                                                        
                                                        return selectedFees.length === unpaidHeads.length ? 'Deselect All' : 'Select All Unpaid';
                                                    })()}
                                                </button>
                                                <button 
                                                    type="button"
                                                    disabled={pendingDues > 0}
                                                    onClick={() => {
                                                        const months = ['April','May','June','July','August','September','October','November','December','January','February','March'];
                                                        const unpaid = months.filter(m => !isMonthPaid(m));
                                                        setSelectedMonths(unpaid);
                                                    }}
                                                    style={{ padding: '0.25rem 0.65rem', fontSize: '0.7rem', borderRadius: '6px', backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', color: '#475569', fontWeight: '700', cursor: pendingDues > 0 ? 'not-allowed' : 'pointer' }}
                                                >
                                                    All Unpaid Months
                                                </button>
                                            </div>
                                        </div>

                                        {/* Month-wise Status Tracker */}
                                        <div style={{ marginBottom: '1rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '0.35rem' }}>
                                                {['April','May','June','July','August','September','October','November','December','January','February','March'].map((m, thisMonthIdx, months) => {
                                                    const paid = isMonthPaid(m);
                                                    const isSelected = selectedMonths.includes(m);
                                                    const curAcademicMonth = getCurrentAcademicMonth();
                                                    const curMonthIdx = months.indexOf(curAcademicMonth);
                                                    const isDueMonth = !paid && thisMonthIdx <= curMonthIdx;
                                                    const hasPriorUnpaid = months.slice(0, thisMonthIdx).some(prevM => !isMonthPaid(prevM));
                                                    const isLocked = !paid && (hasPriorUnpaid || pendingDues > 0);
                                                    
                                                    return (
                                                        <div 
                                                            key={m} 
                                                            onClick={() => {
                                                                if (paid) return;
                                                                if (pendingDues > 0) {
                                                                    showAppAlert('Previous Dues Pending', `Student has ₹${pendingDues.toLocaleString()} outstanding previous session dues. Please clear previous dues first before selecting monthly fee heads.`, 'warning', pendingDues);
                                                                    return;
                                                                }
                                                                const mIdx = months.indexOf(m);
                                                                
                                                                if (isSelected) {
                                                                    const remaining = selectedMonths.filter(month => months.indexOf(month) < mIdx);
                                                                    setSelectedMonths(remaining);
                                                                } else {
                                                                    const unpaidEarlierDetails: { month: string; amount: number; heads: string[] }[] = [];
                                                                    let totalUnpaidEarlier = 0;
                                                                    const struct = feeStructure.find(s => s.className === selectedClass);
                                                                    const currentStudent = students.find(s => s.admissionNo === admissionNo);

                                                                    for (let i = 0; i < mIdx; i++) {
                                                                        const prevM = months[i];
                                                                        if (!isMonthPaid(prevM)) {
                                                                            let monthExpected = 0;
                                                                            const dueHeadNames: string[] = [];
                                                                            feeHeads.filter(h => h.type === 'Monthly').forEach(h => {
                                                                                const isExempt = currentStudent ? isFeeExempt(currentStudent, h) : false;
                                                                                const perMonth = isExempt ? 0 : (struct?.fees?.[h.name] || 0);
                                                                                if (perMonth > 0 && !isHeadPaidForMonth(h.name, prevM)) {
                                                                                    monthExpected += perMonth;
                                                                                    dueHeadNames.push(`${h.name}: ₹${perMonth.toLocaleString()}`);
                                                                                }
                                                                            });
                                                                            if (isTransportEnabled && !isTransportPaidForMonth(prevM)) {
                                                                                const busFare = Number(transportRows[0]?.price) || 0;
                                                                                if (busFare > 0) {
                                                                                    monthExpected += busFare;
                                                                                    dueHeadNames.push(`Transport Bus: ₹${busFare.toLocaleString()}`);
                                                                                }
                                                                            }
                                                                            unpaidEarlierDetails.push({
                                                                                month: prevM,
                                                                                amount: monthExpected,
                                                                                heads: dueHeadNames
                                                                            });
                                                                            totalUnpaidEarlier += monthExpected;
                                                                        }
                                                                    }

                                                                    if (unpaidEarlierDetails.length > 0) {
                                                                        const breakdownText = unpaidEarlierDetails.map(d => 
                                                                            `• ${d.month}: ₹${d.amount.toLocaleString()} (${d.heads.join(', ')})`
                                                                        ).join('\n');

                                                                        showAppAlert(
                                                                            'Month Locked: Prior Dues Pending',
                                                                            `Cannot select ${m} because previous month fee of ₹${totalUnpaidEarlier.toLocaleString()} is still unpaid.\n\nDue Details:\n${breakdownText}\n\nYou must collect previous dues first in sequential order.`,
                                                                            'warning',
                                                                            totalUnpaidEarlier
                                                                        );
                                                                        return;
                                                                    }

                                                                    setSelectedMonths([...selectedMonths, m]);
                                                                }
                                                            }}
                                                            style={{ 
                                                                textAlign: 'center', 
                                                                padding: '0.45rem 0.15rem', 
                                                                borderRadius: '8px', 
                                                                background: isSelected ? (isDueMonth ? '#dc2626' : '#4f46e5') : paid ? '#dcfce7' : isLocked ? '#f1f5f9' : isDueMonth ? '#fee2e2' : 'white',
                                                                border: `1.5px solid ${isSelected ? (isDueMonth ? '#b91c1c' : '#4f46e5') : paid ? '#86efac' : isLocked ? '#e2e8f0' : isDueMonth ? '#fca5a5' : '#e2e8f0'}`,
                                                                cursor: (paid || isLocked) ? 'not-allowed' : 'pointer',
                                                                opacity: isLocked ? 0.45 : 1,
                                                                transition: '0.2s',
                                                                boxShadow: isSelected ? (isDueMonth ? '0 3px 5px -1px rgba(220, 38, 38, 0.4)' : '0 3px 5px -1px rgba(79, 70, 229, 0.4)') : isDueMonth ? '0 1px 3px rgba(239, 68, 68, 0.1)' : 'none'
                                                            }}
                                                            title={isLocked ? `${m}: 🔒 Locked - Prior month dues pending` : isDueMonth ? `${m}: Due / Unpaid Fee` : paid ? `${m}: Paid ✓` : `${m}: Future Month`}
                                                        >
                                                            <div style={{ fontSize: '0.65rem', fontWeight: '800', color: isSelected ? 'white' : paid ? '#166534' : isLocked ? '#94a3b8' : isDueMonth ? '#991b1b' : '#64748b' }}>
                                                                {m.substring(0, 3)}
                                                            </div>
                                                            <div style={{ marginTop: '0.25rem', display: 'flex', justifyContent: 'center' }}>
                                                                {paid ? (
                                                                    <Check size={12} strokeWidth={3} color={isSelected ? 'white' : '#166534'} />
                                                                ) : isLocked ? (
                                                                    <span style={{ fontSize: '0.6rem' }}>🔒</span>
                                                                ) : isDueMonth ? (
                                                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: isSelected ? 'white' : '#ef4444' }} />
                                                                ) : (
                                                                    <div style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: isSelected ? 'white' : '#cbd5e1' }} />
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            {/* Monthly Fees Section */}
                                            <div>
                                                <p style={{ fontSize: '0.75rem', fontWeight: '800', color: '#4f46e5', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4f46e5' }} /> 
                                                    Monthly Fees ({selectedMonths.length > 1 ? `${selectedMonths[0]} to ${selectedMonths[selectedMonths.length-1]}` : selectedMonths[0]})
                                                </p>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '200px', overflowY: 'auto' }}>
                                                    {renderMonthlyFeeHeads()}
                                                </div>
                                            </div>

                                            {/* Annual / One-time Fees Section */}
                                            <div>
                                                <p style={{ fontSize: '0.75rem', fontWeight: '800', color: '#ea580c', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ea580c' }} /> 
                                                    Annual & One-time Fees
                                                </p>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '200px', overflowY: 'auto' }}>
                                                    {feeHeads.filter(h => {
                                                        const struct = feeStructure.find(s => s.className === selectedClass);
                                                        const amount = struct?.fees?.[h.name] || 0;
                                                        return h.type !== 'Monthly' && amount > 0 && !isFeeExempt(students.find(s => s.admissionNo === admissionNo), h);
                                                    }).map(h => {
                                                        const struct = feeStructure.find(s => s.className === selectedClass);
                                                        const amount = struct?.fees?.[h.name] || 0;
                                                        const isSelected = selectedFees.includes(h.name);
                                                        const paid = isFeePaid(h.name);
                                                        return (
                                                            <div 
                                                                key={h.id}
                                                                onClick={(paid || pendingDues > 0) ? undefined : () => toggleFeeSelection(h.name)}
                                                                style={{ 
                                                                    display: 'flex', 
                                                                    justifyContent: 'space-between', 
                                                                    alignItems: 'center', 
                                                                    padding: '0.5rem 0.75rem', 
                                                                    borderRadius: '8px', 
                                                                    background: paid ? '#f0fdf4' : isSelected ? '#fff7ed' : 'white',
                                                                    border: `1px solid ${paid ? '#bbf7d0' : isSelected ? '#fed7aa' : '#e2e8f0'}`,
                                                                    cursor: (paid || pendingDues > 0) ? 'default' : 'pointer',
                                                                    transition: '0.2s'
                                                                }}
                                                            >
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                    {paid ? <Check size={14} color="#166534" strokeWidth={3} /> : <input type="checkbox" checked={isSelected} readOnly style={{ width: '15px', height: '15px' }} />}
                                                                    <span style={{ fontWeight: '600', fontSize: '0.8rem', color: paid ? '#166534' : '#1e293b' }}>{h.name}</span>
                                                                </div>
                                                                <div style={{ textAlign: 'right' }}>
                                                                    <div style={{ fontWeight: '800', fontSize: '0.85rem', color: paid ? '#166534' : '#1e293b' }}>₹{amount.toLocaleString()}</div>
                                                                    {paid && <span style={{ fontSize: '0.6rem', fontWeight: '800', color: '#166534', textTransform: 'uppercase' }}>Paid</span>}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 3.5 Transport Section */}
                                {isTransportEnabled && (() => {
                                    const months = ['April','May','June','July','August','September','October','November','December','January','February','March'];
                                    const curAcademicMonth = getCurrentAcademicMonth();
                                    const curMonthIdx = months.indexOf(curAcademicMonth);
                                    const unpaidElapsedMonths = months.slice(0, curMonthIdx + 1).filter(m => !isTransportPaidForMonth(m));
                                    const allPaid = months.every(m => isTransportPaidForMonth(m));
                                    const isTransportUnpaidOrPartial = !allPaid || unpaidElapsedMonths.length > 0;

                                    return (
                                        <div className="stat-card" style={{ 
                                            display: 'block', 
                                            backgroundColor: isTransportUnpaidOrPartial ? '#faf5ff' : '#f0fdf4', 
                                            border: `1.5px solid ${isTransportUnpaidOrPartial ? '#c084fc' : '#86efac'}`,
                                            boxShadow: isTransportUnpaidOrPartial ? '0 4px 12px rgba(192, 132, 252, 0.12)' : 'none',
                                            padding: '0.85rem 1rem',
                                            opacity: pendingDues > 0 ? 0.35 : 1,
                                            pointerEvents: pendingDues > 0 ? 'none' : 'auto',
                                            filter: pendingDues > 0 ? 'grayscale(0.85)' : 'none',
                                            transition: 'all 0.3s ease'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <input 
                                                        type="checkbox" 
                                                        id="transport-toggle"
                                                        checked={isTransportEnabled} 
                                                        onChange={e => {
                                                            if (isTransportFixed) return;
                                                            e.preventDefault();
                                                            const confirmRedirect = window.confirm(
                                                                "To enable transport facility for this student, please assign a transport stop by editing the student in the Students tab.\n\nDo you want to go to the Students page now?"
                                                            );
                                                            if (confirmRedirect) {
                                                                navigate('/admin/students', { state: { searchAdmissionNo: admissionNo } });
                                                            }
                                                        }} 
                                                        style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#9333ea' }}
                                                    />
                                                    <label 
                                                        style={{ fontWeight: '700', fontSize: '0.85rem', color: isTransportUnpaidOrPartial ? '#6b21a8' : '#166534', cursor: 'pointer' }}
                                                    >
                                                        Transport Facility {isTransportUnpaidOrPartial && <span style={{ fontSize: '0.7rem', backgroundColor: '#f3e8ff', color: '#7e22ce', padding: '0.1rem 0.4rem', borderRadius: '6px', marginLeft: '0.4rem', border: '1px solid #d8b4fe' }}>Pending / Partial</span>}
                                                    </label>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                                <div style={{ flex: 2, fontSize: '0.8rem', color: '#475569' }}>
                                                    Route: <strong>{transportRows[0]?.name || 'Assigned Stop'}</strong>
                                                </div>
                                                <div style={{ flex: 1, textAlign: 'right', fontSize: '0.85rem', fontWeight: 800, color: '#7c3aed' }}>
                                                    ₹{(Number(transportRows[0]?.price) || 0).toLocaleString()} / Month
                                                </div>
                                            </div>

                                            {/* Transport Month-wise Payment Status Calendar */}
                                            <div style={{ marginTop: '0.65rem', borderTop: '1px dashed #ddd6fe', paddingTop: '0.5rem' }}>
                                                <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#6d28d9', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                    <Calendar size={13} color="#7c3aed" /> Transport Payment Status (Month-wise):
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '0.3rem' }}>
                                                    {months.map(m => {
                                                        const isPaid = isTransportPaidForMonth(m);
                                                        const isSelected = selectedMonths.includes(m);
                                                        const thisMonthIdx = months.indexOf(m);
                                                        const isDueMonth = !isPaid && thisMonthIdx <= curMonthIdx;

                                                        return (
                                                            <div 
                                                                key={m} 
                                                                style={{ 
                                                                    textAlign: 'center', 
                                                                    padding: '0.35rem 0.15rem', 
                                                                    borderRadius: '6px', 
                                                                    fontSize: '0.65rem', 
                                                                    fontWeight: '800', 
                                                                    textTransform: 'uppercase',
                                                                    border: `1.5px solid ${isPaid ? '#86efac' : isDueMonth ? '#c084fc' : isSelected ? '#a855f7' : '#e9d5ff'}`,
                                                                    backgroundColor: isPaid ? '#dcfce7' : isDueMonth ? '#f3e8ff' : isSelected ? '#ede9fe' : '#faf5ff',
                                                                    color: isPaid ? '#15803d' : isDueMonth ? '#6b21a8' : isSelected ? '#581c87' : '#7e22ce',
                                                                    transition: 'all 0.2s ease-in-out'
                                                                }}
                                                                title={isDueMonth ? `${m}: Transport Fee Due / Unpaid` : isPaid ? `${m}: Transport Fee Paid ✓` : `${m}: Future Month`}
                                                            >
                                                                {m.substring(0, 3)}
                                                                <div style={{ marginTop: '0.2rem', display: 'flex', justifyContent: 'center' }}>
                                                                    {isPaid ? (
                                                                        <Check size={11} strokeWidth={3} color="#166534" />
                                                                    ) : isDueMonth ? (
                                                                        <div style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#9333ea' }} />
                                                                    ) : (
                                                                        <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#c084fc' }} />
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* 4. Previous Payment History - COMMENTED OUT AS REQUESTED */}
                                {/* 
                                <div className="stat-card" style={{ display: 'block' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                        <h3 style={{ color: '#1e293b', fontSize: '1.1rem' }}>4. Previous & Recent Collections</h3>
                                    </div>
                                    ...
                                </div>
                                */}
                            </div>

                            {/* RIGHT COLUMN: Fee Summary & Amount To Be Paid & Payment Submission */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'sticky', top: '1rem' }}>
                                {/* Big Amount To Be Paid Header Banner */}
                                <div style={{ 
                                    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', 
                                    padding: '1rem 1.25rem', 
                                    borderRadius: '16px', 
                                    color: '#ffffff', 
                                    boxShadow: '0 10px 20px -5px rgba(5, 150, 105, 0.3)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#a7f3d0' }}>
                                            Amount To Be Paid
                                        </div>
                                        <div style={{ fontSize: '1.75rem', fontWeight: 900, marginTop: '2px' }}>
                                            ₹{Number(finalAmount).toLocaleString()}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.7rem', color: '#d1fae5' }}>Selected Items: {selectedFees.length}</div>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ffffff' }}>{selectedMonths.length} Month(s)</div>
                                    </div>
                                </div>

                                {/* Fee Summary Card */}
                                <div className="stat-card" style={{ display: 'block', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', padding: '1.25rem', borderRadius: '16px' }}>
                                    <h4 style={{ margin: '0 0 0.75rem 0', color: '#1e293b', fontSize: '0.95rem', fontWeight: 800 }}>Fee Breakdown</h4>
                                    
                                    <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0', maxHeight: '140px', overflowY: 'auto' }}>
                                        {pendingDues > 0 ? (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', fontSize: '0.85rem', color: '#dc2626', fontWeight: '800' }}>
                                                <span>⚠️ Outstanding Dues</span>
                                                <span>₹{pendingDues.toLocaleString()}</span>
                                            </div>
                                        ) : (
                                            <>
                                                {selectedFees.length > 0 ? (
                                                    selectedFees
                                                        .filter(feeName => feeName !== 'Transport Fee')
                                                        .map(feeName => {
                                                            const struct = feeStructure.find(s => s.className === selectedClass);
                                                            const currentStudent = students.find(s => s.admissionNo === admissionNo);
                                                            const head = feeHeads.find(h => h.name === feeName);
                                                            const isMonthly = head?.type === 'Monthly';
                                                            const isExempt = currentStudent && head ? isFeeExempt(currentStudent, head) : false;
                                                            const amount = isExempt ? 0 : (struct?.fees?.[feeName] || 0);
                                                            const unpaidCount = isMonthly ? selectedMonths.filter(m => !isHeadPaidForMonth(feeName, m)).length : 1;
                                                            const itemTotal = amount * unpaidCount;
                                                            return (
                                                                <div key={feeName} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', borderBottom: '1px dashed #e2e8f0', fontSize: '0.8rem' }}>
                                                                    <span style={{ color: '#334155' }}>{feeName} {unpaidCount > 1 ? `(${unpaidCount}x)` : ''}</span>
                                                                    <span style={{ fontWeight: '700', color: '#0f172a' }}>₹{itemTotal.toLocaleString()}</span>
                                                                </div>
                                                            );
                                                        })
                                                ) : (
                                                    <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', padding: '0.5rem 0' }}>No fees selected</div>
                                                )}
                                                {isTransportEnabled && selectedFees.includes('Transport Fee') && transportRows.map((row, idx) => {
                                                    const unpaidTransportMonths = selectedMonths.filter(m => !isTransportPaidForMonth(m));
                                                    const count = unpaidTransportMonths.length;
                                                    return row.price && (
                                                        <div key={`trans-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', borderBottom: '1px dashed #e2e8f0', fontSize: '0.8rem', color: '#7c3aed' }}>
                                                            <span>Transport: {row.name || `Route ${idx+1}`} ({count} Mo)</span>
                                                            <span style={{ fontWeight: '700' }}>₹{(Number(row.price) * count).toLocaleString()}</span>
                                                        </div>
                                                    );
                                                })}
                                            </>
                                        )}
                                    </div>

                                    {/* Subtotal, Discount, Net Payable Calculations */}
                                    <div style={{ marginTop: '0.75rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', alignItems: 'center' }}>
                                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Subtotal:</div>
                                            <div style={{ textAlign: 'right', fontWeight: '700', fontSize: '0.85rem' }}>₹{Number(totalFee).toLocaleString()}</div>
                                            
                                            <div style={{ fontSize: '0.8rem', color: '#ea580c' }}>- Discount (₹):</div>
                                            <div>
                                                <input 
                                                    type="number" 
                                                    className="form-control" 
                                                    style={{ height: '28px', textAlign: 'right', fontWeight: '700', fontSize: '0.85rem', padding: '0.2rem 0.5rem' }} 
                                                    value={discount} 
                                                    onChange={e => setDiscount(e.target.value)} 
                                                />
                                            </div>
                                            
                                            <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#047857' }}>Net Payable:</div>
                                            <div style={{ textAlign: 'right', fontSize: '1rem', fontWeight: '900', color: '#047857' }}>₹{Number(finalAmount).toLocaleString()}</div>
                                        </div>

                                        {Number(discount) > 0 && (
                                            <div style={{ 
                                                marginTop: '0.75rem', 
                                                padding: '0.5rem 0.75rem', 
                                                backgroundColor: isApproverRole(user?.role) ? '#fffbeb' : '#eff6ff', 
                                                border: `1px solid ${isApproverRole(user?.role) ? '#fde68a' : '#bfdbfe'}`, 
                                                borderRadius: '8px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem'
                                            }}>
                                                {isApproverRole(user?.role) ? (
                                                    <>
                                                        <input 
                                                            type="checkbox" 
                                                            id="approval-check"
                                                            checked={requiresApproval}
                                                            onChange={e => setRequiresApproval(e.target.checked)}
                                                            style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#d97706' }}
                                                        />
                                                        <label htmlFor="approval-check" style={{ color: '#92400e', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', flex: 1, margin: 0 }}>
                                                            Require Principal Approval?
                                                        </label>
                                                    </>
                                                ) : (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e40af', width: '100%' }}>
                                                        <span style={{ fontSize: '1rem' }}>🔒</span>
                                                        <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#1e3a8a' }}>Requires Principal Approval</div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Payment Submission Form */}
                                    <form onSubmit={handleCollectFee} style={{ marginTop: '0.85rem' }}>
                                        <div className="form-group" style={{ marginBottom: '0.65rem' }}>
                                            <label style={{ fontWeight: '700', fontSize: '0.8rem', color: '#334155', display: 'flex', justifyContent: 'space-between' }}>
                                                <span>Amount Paid (₹)</span>
                                                {pendingDues > 0 && (
                                                    <span style={{ fontSize: '0.7rem', color: '#dc2626', fontWeight: '700' }}>🔒 Previous Due</span>
                                                )}
                                            </label>
                                            <input 
                                                type="number" 
                                                className="form-control" 
                                                value={paidAmount} 
                                                onChange={pendingDues > 0 ? undefined : e => setPaidAmount(e.target.value)} 
                                                readOnly={pendingDues > 0}
                                                required 
                                                style={{ 
                                                    fontSize: '1.1rem', 
                                                    height: '42px', 
                                                    border: `2px solid ${pendingDues > 0 ? '#ef4444' : '#059669'}`,
                                                    backgroundColor: pendingDues > 0 ? '#fef2f2' : '#f0fdf4',
                                                    cursor: pendingDues > 0 ? 'not-allowed' : 'text',
                                                    color: pendingDues > 0 ? '#991b1b' : '#047857',
                                                    fontWeight: '800',
                                                    borderRadius: '8px'
                                                }} 
                                                placeholder="Enter amount" 
                                            />
                                        </div>

                                        <div className="form-group" style={{ marginBottom: '0.65rem' }}>
                                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Payment Mode</label>
                                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                                                {['Cash', 'PayU'].map(mode => (
                                                    <label key={mode} style={{ flex: 1, textAlign: 'center', padding: '0.45rem', background: paymentMode === mode ? (mode === 'PayU' ? '#047857' : '#22c55e') : '#f8fafc', color: paymentMode === mode ? 'white' : (mode === 'PayU' ? '#047857' : '#166534'), borderRadius: '6px', border: `1px solid ${mode === 'PayU' ? '#047857' : '#22c55e'}`, cursor: 'pointer', fontWeight: '700', fontSize: '0.8rem', transition: '0.2s', margin: 0 }}>
                                                        <input type="radio" name="paymentMode" value={mode} checked={paymentMode === mode} onChange={() => setPaymentMode(mode)} style={{ display: 'none' }} /> {mode === 'PayU' ? 'PayU 💳' : '💵 Cash'}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                        
                                        <div className="form-group" style={{ marginBottom: '0.85rem' }}>
                                            <label style={{ fontWeight: '700', fontSize: '0.75rem', color: '#64748b' }}>Remark (Optional)</label>
                                            <input 
                                                type="text"
                                                className="form-control"
                                                value={remark}
                                                onChange={(e) => setRemark(e.target.value)}
                                                placeholder="e.g. Paid in full..."
                                                style={{ height: '32px', fontSize: '0.8rem', padding: '0.25rem 0.5rem', borderRadius: '6px' }}
                                            />
                                        </div>

                                         <button 
                                             type="submit" 
                                             disabled={submitting} 
                                             className="btn-primary" 
                                             style={{ 
                                                 width: '100%', 
                                                 padding: '0.75rem 1rem', 
                                                 backgroundColor: submitting ? '#94a3b8' : paymentMode === 'PayU' ? '#047857' : (Number(discount) > 0 && requiresApproval) ? '#ea580c' : '#059669', 
                                                 fontSize: '0.95rem', 
                                                 fontWeight: 800,
                                                 borderRadius: '10px',
                                                 cursor: submitting ? 'not-allowed' : 'pointer',
                                                 boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)'
                                             }}
                                         >
                                             {submitting ? 'Processing...' : paymentMode === 'PayU' ? 'Proceed to PayU Gateway 💳' : (Number(discount) > 0 && requiresApproval) ? 'Submit for Principal Approval' : 'Confirm & Print Receipt 🧾'}
                                         </button>
                                    </form>
                                </div>
                            </div>
                        </div>
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

            {activeTab === 'other_fees' && (
                <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                    {/* Top Sub-tabs Navigation */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: '#f1f5f9', padding: '0.4rem', borderRadius: '12px', width: 'fit-content' }}>
                        {[
                            { id: 'reg_fee', label: 'Registration Fee' },
                            { id: 'late_fee', label: 'Late Fee' },
                            { id: 'event_fee', label: 'Event Fee' },
                            { id: 'other_misc', label: 'Other Misc Fee' }
                        ].map(subTab => (
                            <button 
                                key={subTab.id}
                                onClick={() => {
                                    setOtherFeeSubTab(subTab.id as any);
                                    if (subTab.id === 'reg_fee') setOtherFeeCategory('Registration Fee');
                                    else if (subTab.id === 'late_fee') setOtherFeeCategory('Late Fee');
                                    else if (subTab.id === 'event_fee') setOtherFeeCategory('Event Fee');
                                    else setOtherFeeCategory('Other Misc Fee');
                                }}
                                style={{ 
                                    padding: '0.6rem 1.4rem', 
                                    border: 'none', 
                                    borderRadius: '10px', 
                                    cursor: 'pointer', 
                                    fontWeight: '700', 
                                    fontSize: '0.85rem',
                                    transition: 'all 0.3s',
                                    backgroundColor: otherFeeSubTab === subTab.id ? '#ffffff' : 'transparent',
                                    color: otherFeeSubTab === subTab.id ? '#1e293b' : '#64748b',
                                    boxShadow: otherFeeSubTab === subTab.id ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none'
                                }}
                            >
                                {subTab.label}
                            </button>
                        ))}
                    </div>

                    {/* Main Grid Layout: Left Collection Form (38%) + Right Record Table (62%) */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.9fr', gap: '1.5rem' }}>
                        {/* Left Side: Compact Fee Collection Form */}
                        <div className="stat-card" style={{ display: 'block', height: 'fit-content', background: '#ffffff', border: '1px solid #e2e8f0', padding: '1.5rem', borderRadius: '14px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e2e8f0' }}>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>
                                    💳 Collect {otherFeeCategory}
                                </h3>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#e0e7ff', color: '#3730a3', padding: '0.2rem 0.6rem', borderRadius: '12px' }}>
                                    Receipt: Auto
                                </span>
                            </div>

                            <form onSubmit={handleCollectOtherFee}>
                                {/* Student Search with Auto-Fill */}
                                <div className="form-group" style={{ position: 'relative', marginBottom: '1rem' }}>
                                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>
                                        Search Student (Auto-Fill)
                                    </label>
                                    <input 
                                        type="text"
                                        className="form-control"
                                        placeholder="Type Student Name or SR No..."
                                        value={otherFeeSearchQuery}
                                        onChange={(e) => {
                                            setOtherFeeSearchQuery(e.target.value);
                                            setOtherFeeShowSearchDropdown(true);
                                        }}
                                        style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.5rem 0.8rem', fontSize: '0.85rem' }}
                                    />

                                    {/* Search Autocomplete Dropdown */}
                                    {otherFeeShowSearchDropdown && otherFeeSearchQuery.trim().length > 0 && (
                                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', maxHeight: '200px', overflowY: 'auto', marginTop: '4px' }}>
                                            {students
                                                .filter(s => 
                                                    (s.name || '').toLowerCase().includes(otherFeeSearchQuery.toLowerCase()) || 
                                                    (s.admissionNo || '').toLowerCase().includes(otherFeeSearchQuery.toLowerCase())
                                                )
                                                .slice(0, 8)
                                                .map(s => (
                                                    <div 
                                                        key={s.id}
                                                        onClick={() => {
                                                            setOtherFeeStudent(s);
                                                            setOtherFeeStudentName(s.name);
                                                            setOtherFeeAdmissionNo(s.admissionNo);
                                                            setOtherFeeFatherName(s.fatherName || '');
                                                            setOtherFeeClass(s.className || s.class?.name || '');
                                                            setOtherFeeAddress(s.address || s.village || s.city || '');
                                                            setOtherFeeSearchQuery(`${s.name} (${s.admissionNo})`);
                                                            setOtherFeeShowSearchDropdown(false);
                                                        }}
                                                        style={{ padding: '0.6rem 0.8rem', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '0.825rem' }}
                                                    >
                                                        <div style={{ fontWeight: 700, color: '#1e293b' }}>{s.name} ({s.admissionNo})</div>
                                                        <div style={{ fontSize: '0.725rem', color: '#64748b' }}>Father: {s.fatherName || 'N/A'} | Class: {s.className || s.class?.name || 'N/A'}</div>
                                                    </div>
                                                ))}
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Date</label>
                                        <input type="date" className="form-control" value={otherFeeDate} onChange={e => setOtherFeeDate(e.target.value)} required style={{ fontSize: '0.825rem' }} />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Student No / SR No *</label>
                                        <input type="text" className="form-control" value={otherFeeAdmissionNo} onChange={e => setOtherFeeAdmissionNo(e.target.value)} required placeholder="e.g. 1447" style={{ fontSize: '0.825rem', fontWeight: 700, color: '#2563eb' }} />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Student Name *</label>
                                        <input type="text" className="form-control" value={otherFeeStudentName} onChange={e => setOtherFeeStudentName(e.target.value)} required placeholder="e.g. Rahul Yadav" style={{ fontSize: '0.825rem', fontWeight: 700 }} />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Father Name</label>
                                        <input type="text" className="form-control" value={otherFeeFatherName} onChange={e => setOtherFeeFatherName(e.target.value)} placeholder="e.g. Mr. Rakesh Yadav" style={{ fontSize: '0.825rem' }} />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Class</label>
                                        <input type="text" className="form-control" value={otherFeeClass} onChange={e => setOtherFeeClass(e.target.value)} placeholder="e.g. Class 2" style={{ fontSize: '0.825rem' }} />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Address</label>
                                        <input type="text" className="form-control" value={otherFeeAddress} onChange={e => setOtherFeeAddress(e.target.value)} placeholder="Village / City" style={{ fontSize: '0.825rem' }} />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Fee Category</label>
                                        <select className="form-control" value={otherFeeCategory} onChange={e => setOtherFeeCategory(e.target.value)} style={{ fontSize: '0.825rem', fontWeight: 700 }}>
                                            <option value="Registration Fee">Registration Fee</option>
                                            <option value="Late Fee">Late Fee</option>
                                            <option value="Event Fee">Event Fee</option>
                                            <option value="Other Misc Fee">Other Misc Fee</option>
                                        </select>
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Amount (₹) *</label>
                                        <input type="number" className="form-control" value={otherFeeAmount} onChange={e => setOtherFeeAmount(e.target.value)} required placeholder="Amount in ₹" style={{ fontSize: '1rem', fontWeight: 800, color: '#166534', border: '1.5px solid #22c55e' }} />
                                    </div>
                                </div>

                                <div className="form-group" style={{ marginBottom: '1rem' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Fee Description / Purpose</label>
                                    <input type="text" className="form-control" value={otherFeeDescription} onChange={e => setOtherFeeDescription(e.target.value)} placeholder="e.g. Prospectus Form / Sports Day / July Fine" style={{ fontSize: '0.825rem' }} />
                                </div>

                                {/* Payment Mode Selection (Default: Cash & PayU) */}
                                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Payment Mode</label>
                                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.35rem' }}>
                                        <label style={{ flex: 1, textAlign: 'center', padding: '0.6rem', background: otherFeePaymentMode === 'Cash' ? '#22c55e' : 'white', color: otherFeePaymentMode === 'Cash' ? 'white' : '#166534', borderRadius: '8px', border: '1px solid #22c55e', cursor: 'pointer', fontWeight: '700', fontSize: '0.825rem', transition: '0.2s' }}>
                                            <input type="radio" name="otherFeePaymentMode" value="Cash" checked={otherFeePaymentMode === 'Cash'} onChange={() => setOtherFeePaymentMode('Cash')} style={{ display: 'none' }} /> 💵 Cash
                                        </label>
                                        <label style={{ flex: 1, textAlign: 'center', padding: '0.6rem', background: otherFeePaymentMode === 'PayU' ? '#047857' : 'white', color: otherFeePaymentMode === 'PayU' ? 'white' : '#047857', borderRadius: '8px', border: '1px solid #047857', cursor: 'pointer', fontWeight: '700', fontSize: '0.825rem', transition: '0.2s' }}>
                                            <input type="radio" name="otherFeePaymentMode" value="PayU" checked={otherFeePaymentMode === 'PayU'} onChange={() => setOtherFeePaymentMode('PayU')} style={{ display: 'none' }} /> 💳 PayU Gateway
                                        </label>
                                    </div>
                                </div>

                                <button 
                                    type="submit" 
                                    disabled={otherFeeSubmitting}
                                    className="btn-primary" 
                                    style={{ width: '100%', padding: '0.85rem', backgroundColor: otherFeeSubmitting ? '#94a3b8' : otherFeePaymentMode === 'PayU' ? '#047857' : '#166534', fontSize: '0.95rem', fontWeight: 800, cursor: otherFeeSubmitting ? 'not-allowed' : 'pointer' }}
                                >
                                    {otherFeeSubmitting ? 'Processing...' : otherFeePaymentMode === 'PayU' ? 'Proceed to PayU Gateway 💳' : 'Confirm & Print Receipt 🖨️'}
                                </button>
                            </form>
                        </div>

                        {/* Right Side: Real-Time Collection Records Table Frame */}
                        <div className="stat-card" style={{ display: 'block', background: '#ffffff', border: '1px solid #e2e8f0', padding: '1.5rem', borderRadius: '14px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e2e8f0' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>
                                        📋 {otherFeeCategory} Collection Records
                                    </h3>
                                    <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                                        Recent receipts collected for {otherFeeCategory}
                                    </p>
                                </div>

                                <input 
                                    type="text"
                                    className="form-control"
                                    placeholder="Search student or receipt..."
                                    value={otherFeeTableSearch}
                                    onChange={e => setOtherFeeTableSearch(e.target.value)}
                                    style={{ width: '200px', fontSize: '0.8rem', padding: '0.4rem 0.7rem' }}
                                />
                            </div>

                            <div style={{ maxHeight: '520px', overflowY: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#f8fafc', textAlign: 'left', position: 'sticky', top: 0, zIndex: 2, borderBottom: '2px solid #e2e8f0' }}>
                                            <th style={{ padding: '0.75rem', color: '#475569', fontSize: '0.75rem', fontWeight: '700' }}>Receipt No</th>
                                            <th style={{ padding: '0.75rem', color: '#475569', fontSize: '0.75rem', fontWeight: '700' }}>Date</th>
                                            <th style={{ padding: '0.75rem', color: '#475569', fontSize: '0.75rem', fontWeight: '700' }}>Student Details</th>
                                            <th style={{ padding: '0.75rem', color: '#475569', fontSize: '0.75rem', fontWeight: '700' }}>Category & Desc</th>
                                            <th style={{ padding: '0.75rem', color: '#475569', fontSize: '0.75rem', fontWeight: '700', textAlign: 'right' }}>Amount</th>
                                            <th style={{ padding: '0.75rem', color: '#475569', fontSize: '0.75rem', fontWeight: '700', textAlign: 'center' }}>Mode</th>
                                            <th style={{ padding: '0.75rem', color: '#475569', fontSize: '0.75rem', fontWeight: '700', textAlign: 'center' }}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(() => {
                                            const categoryFilter = otherFeeCategory.toLowerCase();
                                            const otherRecords = feeRecords.filter(r => {
                                                const headLower = (r.feeHead || '').toLowerCase();
                                                const isMatchCategory = headLower.includes(categoryFilter) || 
                                                                       headLower.includes('registration') || 
                                                                       headLower.includes('late fee') || 
                                                                       headLower.includes('event') ||
                                                                       headLower.includes('misc');
                                                if (!isMatchCategory) return false;

                                                if (otherFeeTableSearch.trim() !== '') {
                                                    const query = otherFeeTableSearch.toLowerCase();
                                                    return (r.studentName || '').toLowerCase().includes(query) ||
                                                           (r.receiptNo || '').toLowerCase().includes(query) ||
                                                           (r.admissionNo || '').toLowerCase().includes(query);
                                                }
                                                return true;
                                            });

                                            if (otherRecords.length === 0) {
                                                return (
                                                    <tr>
                                                        <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                                                            No records found for {otherFeeCategory}.
                                                        </td>
                                                    </tr>
                                                );
                                            }

                                            return otherRecords.map(rec => (
                                                <tr key={rec.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '0.75rem', fontSize: '0.8rem', fontWeight: 800, color: '#2563eb' }}>
                                                        {rec.receiptNo || 'N/A'}
                                                    </td>
                                                    <td style={{ padding: '0.75rem', fontSize: '0.75rem', color: '#64748b' }}>
                                                        {rec.date || ((rec as any).paymentDate ? new Date((rec as any).paymentDate).toLocaleDateString('en-GB') : 'N/A')}
                                                    </td>
                                                    <td style={{ padding: '0.75rem' }}>
                                                        <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#1e293b' }}>{rec.studentName}</div>
                                                        <div style={{ fontSize: '0.725rem', color: '#64748b' }}>{rec.admissionNo} ({rec.className || 'General'})</div>
                                                    </td>
                                                    <td style={{ padding: '0.75rem', fontSize: '0.75rem', color: '#334155' }}>
                                                        <span style={{ backgroundColor: '#f1f5f9', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 700, display: 'inline-block', marginBottom: '2px' }}>
                                                            {rec.feeHead}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.9rem', fontWeight: 800, color: '#166534' }}>
                                                        ₹{(rec.paidAmount || (rec as any).amountPaid || 0).toLocaleString()}
                                                    </td>
                                                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                                        <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem', borderRadius: '12px', fontWeight: 700, backgroundColor: rec.paymentMode === 'PayU' ? '#ecfdf5' : '#f0fdf4', color: rec.paymentMode === 'PayU' ? '#047857' : '#166534', border: `1px solid ${rec.paymentMode === 'PayU' ? '#a7f3d0' : '#bbf7d0'}` }}>
                                                            {rec.paymentMode || 'Cash'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                                        <button 
                                                            onClick={() => {
                                                                setSelectedReceipt(rec);
                                                                setShowReceipt(true);
                                                            }}
                                                            style={{ backgroundColor: '#4f46e5', color: 'white', border: 'none', padding: '0.35rem 0.7rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}
                                                        >
                                                            Print Receipt
                                                        </button>
                                                    </td>
                                                </tr>
                                            ));
                                        })()}
                                    </tbody>
                                </table>
                            </div>
                        </div>
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
                            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                                <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '180px' }}>
                                    <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b' }}>Search Student</label>
                                    <input 
                                        type="text" 
                                        className="form-control" 
                                        placeholder="Search name or adm no..." 
                                        value={dueSearchQuery} 
                                        onChange={(e) => setDueSearchQuery(e.target.value)}
                                        style={{ width: '100%', height: '38px', padding: '0.2rem 0.8rem' }}
                                    />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '180px' }}>
                                    <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b' }}>Select Class</label>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <select 
                                            className="form-control" 
                                            value={dueClassFilter}
                                            onChange={(e) => setDueClassFilter(e.target.value)}
                                            style={{ flex: 1 }}
                                        >
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
                                <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '180px' }}>
                                    <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#4f46e5' }}>
                                        Dues View Mode
                                    </label>
                                    <select 
                                        className="form-control" 
                                        value={dueCalculationMode}
                                        onChange={(e) => {
                                            const mode = e.target.value as 'cumulative' | 'single';
                                            setDueCalculationMode(mode);
                                            if (mode === 'cumulative') {
                                                setDueMonthFilter(getCurrentAcademicMonth());
                                            }
                                        }}
                                        style={{ backgroundColor: '#eef2ff', color: '#312e81', fontWeight: '700', borderColor: '#818cf8' }}
                                    >
                                        <option value="cumulative">Carry Forward (Till Current Month - {getCurrentAcademicMonth()})</option>
                                        <option value="single">Single Month Only</option>
                                    </select>
                                </div>
                                <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '180px' }}>
                                    <label style={{ fontSize: '0.8rem', fontWeight: '700', color: (dueCalculationMode === 'cumulative' || dueFeeTypeFilter === 'One-time Only') ? '#94a3b8' : '#64748b' }}>
                                        Select Month {dueCalculationMode === 'cumulative' ? <span style={{ fontWeight: '600', fontSize: '0.7rem', color: '#4f46e5' }}>(Auto: {getCurrentAcademicMonth()})</span> : dueFeeTypeFilter === 'One-time Only' ? <span style={{ fontWeight: '400', fontSize: '0.7rem', color: '#f59e0b' }}>⚠ N/A for One-time</span> : null}
                                    </label>
                                    <select 
                                        className="form-control" 
                                        value={dueCalculationMode === 'cumulative' ? getCurrentAcademicMonth() : (dueFeeTypeFilter === 'One-time Only' ? 'All' : dueMonthFilter)}
                                        onChange={(e) => setDueMonthFilter(e.target.value)}
                                        disabled={dueCalculationMode === 'cumulative' || dueFeeTypeFilter === 'One-time Only'}
                                        style={{ 
                                            opacity: (dueCalculationMode === 'cumulative' || dueFeeTypeFilter === 'One-time Only') ? 0.5 : 1, 
                                            cursor: (dueCalculationMode === 'cumulative' || dueFeeTypeFilter === 'One-time Only') ? 'not-allowed' : 'pointer', 
                                            backgroundColor: (dueCalculationMode === 'cumulative' || dueFeeTypeFilter === 'One-time Only') ? '#f1f5f9' : 'white' 
                                        }}
                                    >
                                        <option value="All">All Months (Whole Session)</option>
                                        {['April','May','June','July','August','September','October','November','December','January','February','March'].map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>
                                <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '130px' }}>
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
                                <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '130px' }}>
                                    <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b' }}>Payment Status</label>
                                    <select 
                                        className="form-control" 
                                        value={dueStatusFilter}
                                        onChange={(e) => setDueStatusFilter(e.target.value)}
                                    >
                                        <option value="All">All Statuses</option>
                                        <option value="Unpaid">Unpaid (Zero Paid)</option>
                                        <option value="Partially Paid">Partially Paid</option>
                                        <option value="Paid">Fully Paid (0 Due)</option>
                                    </select>
                                </div>
                                <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '150px' }}>
                                    <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b' }}>Fee Component</label>
                                    <select 
                                        className="form-control" 
                                        value={dueFeeTypeFilter}
                                        onChange={(e) => setDueFeeTypeFilter(e.target.value)}
                                    >
                                        <option value="Monthly Only">Monthly Fees Only</option>
                                        {dueView === 'general' && (
                                            <option value="One-time Only">One-Time / Annual Fees Only</option>
                                        )}
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
                                    {dueView === 'general' && (
                                        <button 
                                            onClick={downloadFullDetailsExcel}
                                            className="btn-primary" 
                                            style={{ padding: '0.6rem 1.2rem', width: 'auto', backgroundColor: '#2563eb', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                                        >
                                            <Download size={16} /> Full Details
                                        </button>
                                    )}
                                    <button 
                                        onClick={printDuesReport}
                                        className="btn-primary" 
                                        style={{ padding: '0.6rem 1.2rem', width: 'auto', backgroundColor: '#1e293b', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                                    >
                                        🖨️ Print Report (PDF)
                                    </button>
                                    {dueView === 'transport' && (
                                        <button 
                                            onClick={downloadClassWiseTransportSummary}
                                            className="btn-primary" 
                                            style={{ padding: '0.6rem 1.2rem', width: 'auto', backgroundColor: '#7c3aed', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                                        >
                                            <Download size={16} /> Class Summary
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div style={{ maxHeight: '520px', overflowY: 'auto', borderTop: '1px solid #e2e8f0' }}>
                        {dueView === 'general' ? (
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left', position: 'sticky', top: 0, zIndex: 2 }}>
                                    <th style={{ padding: '1rem', color: '#475569', fontSize: '0.8rem', fontWeight: '700' }}>Student ({getFilteredDues(dueFees).length})</th>
                                    {(() => {
                                        const effectiveMonth = dueCalculationMode === 'cumulative' ? getCurrentAcademicMonth() : dueMonthFilter;
                                        const allAcademicMonths = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];
                                        const targetIdx = allAcademicMonths.indexOf(effectiveMonth);
                                        const monthsList = targetIdx !== -1 ? allAcademicMonths.slice(0, targetIdx + 1) : allAcademicMonths.slice(0, 5);

                                        if (dueFeeTypeFilter === 'One-time Only') {
                                            return (
                                                <>
                                                    <th style={{ padding: '1rem', color: '#475569', fontSize: '0.8rem', fontWeight: '700' }}>Student ({getFilteredDues(dueFees).length})</th>
                                                    <th style={{ padding: '1rem', color: '#475569', fontSize: '0.8rem', fontWeight: '700', textAlign: 'right' }}>One-time expected</th>
                                                    <th style={{ padding: '1rem', color: '#475569', fontSize: '0.8rem', fontWeight: '700', textAlign: 'right' }}>One-time paid</th>
                                                    <th style={{ padding: '1rem', color: '#475569', fontSize: '0.8rem', fontWeight: '700', textAlign: 'right' }}>One-time balance</th>
                                                    <th style={{ padding: '1rem', color: '#475569', fontSize: '0.8rem', fontWeight: '700', textAlign: 'center' }}>Status</th>
                                                    <th style={{ padding: '1rem', color: '#475569', fontSize: '0.8rem', fontWeight: '700', textAlign: 'center' }}>Action</th>
                                                </>
                                            );
                                        }

                                        if (dueCalculationMode === 'cumulative') {
                                            return (
                                                <>
                                                    <th style={{ padding: '0.85rem 0.5rem', color: '#1e293b', fontSize: '0.8rem', fontWeight: '800', textAlign: 'center', width: '50px', backgroundColor: '#fef08a' }}>S.No</th>
                                                    <th style={{ padding: '0.85rem 1rem', color: '#1e293b', fontSize: '0.8rem', fontWeight: '800', backgroundColor: '#fef08a' }}>Student Name</th>
                                                    <th style={{ padding: '0.85rem 0.5rem', color: '#1e293b', fontSize: '0.8rem', fontWeight: '800', backgroundColor: '#fef08a' }}>Admission No</th>
                                                    <th style={{ padding: '0.85rem 0.5rem', color: '#1e293b', fontSize: '0.8rem', fontWeight: '800', backgroundColor: '#fef08a' }}>Father Name</th>
                                                    <th style={{ padding: '0.85rem 0.5rem', color: '#1e293b', fontSize: '0.8rem', fontWeight: '800', textAlign: 'center', backgroundColor: '#fef08a' }}>Class</th>
                                                    <th style={{ padding: '0.85rem 0.75rem', color: '#854d0e', fontSize: '0.8rem', fontWeight: '800', textAlign: 'right', backgroundColor: '#fef08a' }} title="Previous Session Dues Pending">Previous Session Dues</th>
                                                    {monthsList.map(m => (
                                                        <th key={m} style={{ padding: '0.85rem 0.6rem', color: '#1e293b', fontSize: '0.8rem', fontWeight: '800', textAlign: 'right', backgroundColor: '#fef08a' }} title={`${m} Due (Fee - Paid)`}>
                                                            {m.slice(0, 3)}
                                                        </th>
                                                    ))}
                                                    <th style={{ padding: '0.85rem 0.75rem', color: '#991b1b', fontSize: '0.85rem', fontWeight: '900', textAlign: 'right', backgroundColor: '#fef08a' }}>
                                                        Total Due Till {effectiveMonth.slice(0, 3)}
                                                    </th>
                                                    <th style={{ padding: '0.85rem 0.5rem', color: '#1e293b', fontSize: '0.8rem', fontWeight: '800', textAlign: 'center', backgroundColor: '#fef08a' }}>Status</th>
                                                    <th style={{ padding: '0.85rem 0.5rem', color: '#1e293b', fontSize: '0.8rem', fontWeight: '800', textAlign: 'center', backgroundColor: '#fef08a' }}>Action</th>
                                                </>
                                            );
                                        }

                                        if (effectiveMonth !== 'All') {
                                            return (
                                                <>
                                                    <th style={{ padding: '1rem', color: '#475569', fontSize: '0.8rem', fontWeight: '700' }}>Student ({getFilteredDues(dueFees).length})</th>
                                                    <th style={{ padding: '1rem', color: '#475569', fontSize: '0.8rem', fontWeight: '700', textAlign: 'right' }}>{effectiveMonth.slice(0, 3)} expected</th>
                                                    <th style={{ padding: '1rem', color: '#475569', fontSize: '0.8rem', fontWeight: '700', textAlign: 'right' }}>{effectiveMonth.slice(0, 3)} paid</th>
                                                    <th style={{ padding: '1rem', color: '#475569', fontSize: '0.8rem', fontWeight: '700', textAlign: 'right' }}>{effectiveMonth.slice(0, 3)} balance</th>
                                                    <th style={{ padding: '1rem', color: '#475569', fontSize: '0.8rem', fontWeight: '700', textAlign: 'center' }}>Status</th>
                                                    <th style={{ padding: '1rem', color: '#475569', fontSize: '0.8rem', fontWeight: '700', textAlign: 'center' }}>Action</th>
                                                </>
                                            );
                                        }

                                        return (
                                            <>
                                                <th style={{ padding: '1rem', color: '#475569', fontSize: '0.8rem', fontWeight: '700' }}>Student ({getFilteredDues(dueFees).length})</th>
                                                <th style={{ padding: '1rem', color: '#475569', fontSize: '0.8rem', fontWeight: '700', textAlign: 'right' }} title="Full Academic Session Expected (12 Months + Annual Fees)">Session expected (12 mos)</th>
                                                <th style={{ padding: '1rem', color: '#475569', fontSize: '0.8rem', fontWeight: '700', textAlign: 'right' }} title="Expected from April up to current month">Expected (Till Date)</th>
                                                <th style={{ padding: '1rem', color: '#475569', fontSize: '0.8rem', fontWeight: '700', textAlign: 'right' }}>Total paid</th>
                                                <th style={{ padding: '1rem', color: '#475569', fontSize: '0.8rem', fontWeight: '700', textAlign: 'right' }} title="Outstanding dues pending up to current month">Dues (Till Date)</th>
                                                <th style={{ padding: '1rem', color: '#475569', fontSize: '0.8rem', fontWeight: '700', textAlign: 'center' }}>Status</th>
                                                <th style={{ padding: '1rem', color: '#475569', fontSize: '0.8rem', fontWeight: '700', textAlign: 'center' }}>Action</th>
                                            </>
                                        );
                                    })()}
                                </tr>
                            </thead>
                            <tbody>
                                {(() => {
                                    const effectiveMonth = dueCalculationMode === 'cumulative' ? getCurrentAcademicMonth() : dueMonthFilter;
                                    const allAcademicMonths = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];
                                    const targetIdx = allAcademicMonths.indexOf(effectiveMonth);
                                    const monthsList = targetIdx !== -1 ? allAcademicMonths.slice(0, targetIdx + 1) : allAcademicMonths.slice(0, 5);
                                    const filtered = getFilteredDues(dueFees);
                                    
                                    const totalCols = dueCalculationMode === 'cumulative' ? (8 + monthsList.length) : (effectiveMonth !== 'All' ? 6 : 7);

                                    if (filtered.length === 0) {
                                        let emptyMsg = `All students have paid for ${effectiveMonth}. ✓`;
                                        if (dueStatusFilter === 'Paid') {
                                            emptyMsg = `No fully paid students found for ${effectiveMonth}.`;
                                        } else if (dueStatusFilter === 'Unpaid') {
                                            emptyMsg = `No unpaid students found for ${effectiveMonth}.`;
                                        } else if (dueStatusFilter === 'Partially Paid') {
                                            emptyMsg = `No partially paid students found for ${effectiveMonth}.`;
                                        }

                                        return (
                                            <tr>
                                                <td colSpan={totalCols} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                                                    {dueFeeTypeFilter === 'One-time Only' ? 'No One-Time / Annual dues found.' : effectiveMonth === 'All' ? 'No pending dues found.' : emptyMsg}
                                                </td>
                                            </tr>
                                        );
                                    }

                                    return (
                                        <>
                                            {/* Summary banner */}
                                            {dueFeeTypeFilter === 'One-time Only' ? (
                                                <tr style={{ backgroundColor: '#f0f9ff' }}>
                                                    <td colSpan={totalCols} style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#0369a1', fontWeight: '700', borderBottom: '2px solid #bae6fd' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <span>📋 Showing {filtered.length} student(s) for <strong>One-Time / Annual Fees</strong></span>
                                                            <div style={{ display: 'flex', gap: '1.5rem' }}>
                                                                <span>Expected: <strong>₹{filtered.reduce((s: number, f: any) => s + (f.isRT ? 0 : (f.expectedOneTime || 0)), 0).toLocaleString()}</strong></span>
                                                                <span style={{ color: '#059669' }}>Paid: <strong>₹{filtered.reduce((s: number, f: any) => s + (f.actualOneTimePaid || 0), 0).toLocaleString()}</strong></span>
                                                                <span style={{ color: '#ef4444' }}>Pending: <strong>₹{filtered.reduce((s: number, f: any) => s + Math.max(0, (f.isRT ? 0 : (f.expectedOneTime || 0)) - (f.actualOneTimePaid || 0)), 0).toLocaleString()}</strong></span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : effectiveMonth !== 'All' ? (
                                                <tr style={{ backgroundColor: '#f0f9ff' }}>
                                                    <td colSpan={totalCols} style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#0369a1', fontWeight: '700', borderBottom: '2px solid #bae6fd' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                                                            <span>📅 Showing {filtered.length} student(s) for <strong>{effectiveMonth}</strong> {dueCalculationMode === 'cumulative' && <span style={{ backgroundColor: '#dbeafe', color: '#1e40af', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', marginLeft: '0.5rem' }}>🔄 Carry Forward Mode (April to {effectiveMonth})</span>}</span>
                                                            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                                                                {dueCalculationMode === 'cumulative' ? (
                                                                    <>
                                                                        <span>Total Prev Dues: <strong>₹{filtered.reduce((s: number, f: any) => s + Math.max(0, (f.previousSessionDue || 0) - (f.actualPrevDuesPaid || 0)), 0).toLocaleString()}</strong></span>
                                                                        <span>Total Monthly Due (Apr-{effectiveMonth.slice(0, 3)}): <strong>₹{filtered.reduce((s: number, f: any) => s + calculateDynamicDues(f, effectiveMonth).totalCumulativeDueTillMonth, 0).toLocaleString()}</strong></span>
                                                                        <span style={{ color: '#dc2626' }}>Total Net Due Till {effectiveMonth.slice(0, 3)}: <strong>₹{filtered.reduce((s: number, f: any) => s + Math.max(0, (f.previousSessionDue || 0) - (f.actualPrevDuesPaid || 0)) + calculateDynamicDues(f, effectiveMonth).totalCumulativeDueTillMonth, 0).toLocaleString()}</strong></span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <span>Month Bill: <strong>₹{filtered.reduce((s: number, f: any) => s + (f.isRT ? 0 : (f.monthlyFeeAmount || 0)), 0).toLocaleString()}</strong></span>
                                                                        <span style={{ color: '#059669' }}>Month Paid: <strong>₹{filtered.reduce((s: number, f: any) => s + calculateDynamicDues(f, effectiveMonth).selectedMonthPaid, 0).toLocaleString()}</strong></span>
                                                                        <span style={{ color: '#ef4444' }}>Month Pending: <strong>₹{filtered.reduce((s: number, f: any) => s + calculateDynamicDues(f, effectiveMonth).selectedMonthDue, 0).toLocaleString()}</strong></span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : null}
                                            {filtered.map((fee: any, index: number) => {
                                                const dyn = calculateDynamicDues(fee, effectiveMonth);
                                                
                                                if (dueFeeTypeFilter === 'One-time Only') {
                                                    const expectedAmt = fee.isRT ? 0 : (fee.expectedOneTime || 0);
                                                    const paidAmt = fee.actualOneTimePaid || 0;
                                                    const balanceAmt = Math.max(0, expectedAmt - paidAmt);
                                                    
                                                    let statusText = "Pending";
                                                    let statusColor = "#ef4444";
                                                    let statusBg = "#fef2f2";

                                                    if (expectedAmt === 0) {
                                                        statusText = fee.isRT ? "RT Student" : "No Fee Assigned";
                                                        statusColor = "#059669";
                                                        statusBg = "#ecfdf5";
                                                    } else if (paidAmt >= expectedAmt) {
                                                        statusText = "Paid";
                                                        statusColor = "#059669";
                                                        statusBg = "#ecfdf5";
                                                    } else if (paidAmt > 0) {
                                                        statusText = "Partially Paid";
                                                        statusColor = "#d97706";
                                                        statusBg = "#fffbeb";
                                                    }

                                                    return (
                                                        <tr key={fee.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                            <td style={{ padding: '1rem' }}>
                                                                <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.9rem' }}>{fee.studentName}</div>
                                                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                                                    <span style={{ background: '#e0e7ff', color: '#4338ca', padding: '0.1rem 0.35rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '600' }}>
                                                                        {fee.className}
                                                                    </span>
                                                                    <span>Adm: <strong>{fee.admissionNo}</strong></span>
                                                                </div>
                                                            </td>
                                                            <td style={{ padding: '1rem', textAlign: 'right' }}><div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#1e293b' }}>₹{expectedAmt.toLocaleString('en-IN')}</div></td>
                                                            <td style={{ padding: '1rem', textAlign: 'right' }}><div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#059669' }}>₹{paidAmt.toLocaleString('en-IN')}</div></td>
                                                            <td style={{ padding: '1rem', textAlign: 'right' }}><div style={{ fontSize: '0.95rem', fontWeight: '800', color: balanceAmt === 0 ? '#16a34a' : '#dc2626' }}>₹{balanceAmt.toLocaleString('en-IN')}</div></td>
                                                            <td style={{ padding: '1rem', textAlign: 'center' }}><span style={{ background: statusBg, color: statusColor, padding: '0.3rem 0.65rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700', display: 'inline-block' }}>{statusText}</span></td>
                                                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                                {balanceAmt > 0 && (
                                                                    <button onClick={() => handlePayDuesRedirect(fee, 'All')} style={{ background: '#10b981', color: 'white', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', marginRight: '0.5rem', fontWeight: '700' }}>Pay Now</button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                } else if (dueCalculationMode === 'cumulative') {
                                                    const monthlyRate = fee.isRT ? 0 : (fee.monthlyFeeAmount || 0);
                                                    const prevDue = Math.max(0, (fee.previousSessionDue || 0) - (fee.actualPrevDuesPaid || 0));
                                                    const totalDue = prevDue + dyn.totalCumulativeDueTillMonth;

                                                    let statusText = "Unpaid";
                                                    let statusColor = "#ef4444";
                                                    let statusBg = "#fef2f2";

                                                    if (monthlyRate === 0 && prevDue === 0) {
                                                        statusText = fee.isRT ? "RT Student" : "No Fee Assigned";
                                                        statusColor = "#059669";
                                                        statusBg = "#ecfdf5";
                                                    } else if (totalDue === 0) {
                                                        statusText = "Paid Till Date";
                                                        statusColor = "#059669";
                                                        statusBg = "#ecfdf5";
                                                    } else if ((fee.actualMonthlyPaid || 0) > 0 || (fee.actualPrevDuesPaid || 0) > 0) {
                                                        statusText = "Partially Paid";
                                                        statusColor = "#d97706";
                                                        statusBg = "#fffbeb";
                                                    }

                                                    return (
                                                        <tr key={fee.id} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                                                            <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: '600', color: '#64748b', fontSize: '0.85rem' }}>{index + 1}</td>
                                                            <td style={{ padding: '0.75rem 1rem' }}>
                                                                <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.9rem' }}>{fee.studentName}</div>
                                                            </td>
                                                            <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.85rem', fontWeight: '600', color: '#334155' }}>{fee.admissionNo}</td>
                                                            <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.85rem', color: '#475569' }}>{fee.fatherName || '-'}</td>
                                                            <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                                                                <span style={{ background: '#e0e7ff', color: '#4338ca', padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600' }}>
                                                                    {fee.className}
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: '0.75rem 0.75rem', textAlign: 'right', backgroundColor: '#fffdf5' }}>
                                                                <span style={{ fontSize: '0.9rem', fontWeight: prevDue > 0 ? '700' : '600', color: prevDue > 0 ? '#b45309' : '#16a34a' }}>
                                                                    ₹{prevDue.toLocaleString('en-IN')}
                                                                </span>
                                                            </td>
                                                            {monthsList.map(m => {
                                                                const rawPaid = fee.monthWisePaid?.[m] || 0;
                                                                const paid = Math.min(monthlyRate, rawPaid);
                                                                const due = Math.max(0, monthlyRate - paid);
                                                                return (
                                                                    <td key={m} style={{ padding: '0.75rem 0.6rem', textAlign: 'right' }}>
                                                                        <span style={{ fontSize: '0.9rem', fontWeight: due > 0 ? '700' : '600', color: due > 0 ? '#dc2626' : '#16a34a' }}>
                                                                            ₹{due.toLocaleString('en-IN')}
                                                                        </span>
                                                                    </td>
                                                                );
                                                            })}
                                                            <td style={{ padding: '0.75rem 0.75rem', textAlign: 'right', backgroundColor: '#fef2f2' }}>
                                                                <span style={{ fontSize: '0.95rem', fontWeight: '800', color: totalDue === 0 ? '#16a34a' : '#b91c1c' }}>
                                                                    ₹{totalDue.toLocaleString('en-IN')}
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                                                                <span style={{ background: statusBg, color: statusColor, padding: '0.25rem 0.55rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700', display: 'inline-block', whiteSpace: 'nowrap' }}>
                                                                    {statusText}
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                                                                {totalDue > 0 && (
                                                                    <button 
                                                                        onClick={() => handlePayDuesRedirect(fee, effectiveMonth)} 
                                                                        style={{ background: '#10b981', color: 'white', border: 'none', padding: '0.35rem 0.7rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '700', whiteSpace: 'nowrap' }}
                                                                    >
                                                                        Pay Now
                                                                    </button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                } else if (dueMonthFilter !== 'All') {
                                                    const expectedAmt = fee.isRT ? 0 : (fee.monthlyFeeAmount || 0);
                                                    const rawPaidAmt = fee.monthWisePaid?.[dueMonthFilter] || 0;
                                                        const paidAmt = Math.min(expectedAmt, rawPaidAmt);
                                                        const balanceAmt = Math.max(0, expectedAmt - paidAmt);
                                                        
                                                        let statusText = "Pending";
                                                        let statusColor = "#ef4444";
                                                        let statusBg = "#fef2f2";

                                                        if (expectedAmt === 0) {
                                                            statusText = fee.isRT ? "RT Student" : "No Fee Assigned";
                                                            statusColor = "#059669";
                                                            statusBg = "#ecfdf5";
                                                        } else if (paidAmt >= expectedAmt) {
                                                            statusText = "Paid";
                                                            statusColor = "#059669";
                                                            statusBg = "#ecfdf5";
                                                        } else if (paidAmt > 0) {
                                                            statusText = "Partially Paid";
                                                            statusColor = "#d97706";
                                                            statusBg = "#fffbeb";
                                                        }

                                                        return (
                                                            <tr key={fee.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                                <td style={{ padding: '1rem' }}>
                                                                    <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.9rem' }}>{fee.studentName}</div>
                                                                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                                                        <span style={{ background: '#e0e7ff', color: '#4338ca', padding: '0.1rem 0.35rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '600' }}>
                                                                            {fee.className}
                                                                        </span>
                                                                        <span>Adm: <strong>{fee.admissionNo}</strong></span>
                                                                    </div>
                                                                </td>
                                                                <td style={{ padding: '1rem', textAlign: 'right' }}><div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#1e293b' }}>₹{expectedAmt.toLocaleString('en-IN')}</div></td>
                                                                <td style={{ padding: '1rem', textAlign: 'right' }}><div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#0f172a' }}>₹{paidAmt.toLocaleString('en-IN')}</div></td>
                                                                <td style={{ padding: '1rem', textAlign: 'right' }}><div style={{ fontSize: '0.95rem', fontWeight: '800', color: balanceAmt === 0 ? '#16a34a' : '#dc2626' }}>₹{balanceAmt.toLocaleString('en-IN')}</div></td>
                                                                <td style={{ padding: '1rem', textAlign: 'center' }}><span style={{ background: statusBg, color: statusColor, padding: '0.3rem 0.65rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700', display: 'inline-block' }}>{statusText}</span></td>
                                                                <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                                    {balanceAmt > 0 && (
                                                                        <button onClick={() => handlePayDuesRedirect(fee, dueMonthFilter)} style={{ background: '#10b981', color: 'white', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', marginRight: '0.5rem', fontWeight: '700' }}>Pay Now</button>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                } else {
                                                    // All Months logic
                                                    let sessionExpected = 0;
                                                    let expectedTillNow = 0;
                                                    let paidAmt = 0;
                                                    let duesTillNow = 0;

                                                    if (dueFeeTypeFilter === 'Monthly Only') {
                                                        sessionExpected = dyn.fullSessionMonthlyExpected;
                                                        expectedTillNow = dyn.cumulativeMonthlyExpected;
                                                        paidAmt = fee.actualMonthlyPaid || 0;
                                                        duesTillNow = dyn.pendingMonthly;
                                                    } else if (dueFeeTypeFilter === 'One-time Only') {
                                                        sessionExpected = dyn.expectedOneTime;
                                                        expectedTillNow = dyn.expectedOneTime;
                                                        paidAmt = fee.actualOneTimePaid || 0;
                                                        duesTillNow = dyn.pendingOneTime;
                                                    } else {
                                                        sessionExpected = (fee.previousSessionDue || 0) + dyn.expectedOneTime + dyn.fullSessionMonthlyExpected;
                                                        expectedTillNow = (fee.previousSessionDue || 0) + dyn.expectedOneTime + dyn.cumulativeMonthlyExpected;
                                                        paidAmt = (fee.actualPrevDuesPaid || 0) + (fee.actualOneTimePaid || 0) + (fee.actualMonthlyPaid || 0);
                                                        duesTillNow = dyn.totalPayableNow;
                                                    }

                                                    let statusText = "Pending";
                                                    let statusColor = "#ef4444";
                                                    let statusBg = "#fef2f2";

                                                    if (sessionExpected === 0) {
                                                        statusText = fee.isRT ? "RT Student" : "No Fee Assigned";
                                                        statusColor = "#059669";
                                                        statusBg = "#ecfdf5";
                                                    } else if (duesTillNow === 0) {
                                                        statusText = "Paid Till Date";
                                                        statusColor = "#059669";
                                                        statusBg = "#ecfdf5";
                                                    } else if (paidAmt > 0) {
                                                        statusText = "Partially Paid";
                                                        statusColor = "#d97706";
                                                        statusBg = "#fffbeb";
                                                    }

                                                    return (
                                                        <tr key={fee.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                            <td style={{ padding: '1rem' }}>
                                                                <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.9rem' }}>{fee.studentName}</div>
                                                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                                                    <span style={{ background: '#e0e7ff', color: '#4338ca', padding: '0.1rem 0.35rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '600' }}>{fee.className}</span>
                                                                    <span>Adm: <strong>{fee.admissionNo}</strong></span>
                                                                </div>
                                                            </td>
                                                            <td style={{ padding: '1rem', textAlign: 'right' }}><div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#1e293b' }}>₹{sessionExpected.toLocaleString('en-IN')}</div></td>
                                                            <td style={{ padding: '1rem', textAlign: 'right' }}><div style={{ fontSize: '0.95rem', fontWeight: '600', color: '#475569' }}>₹{expectedTillNow.toLocaleString('en-IN')}</div></td>
                                                            <td style={{ padding: '1rem', textAlign: 'right' }}><div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#0f172a' }}>₹{paidAmt.toLocaleString('en-IN')}</div></td>
                                                            <td style={{ padding: '1rem', textAlign: 'right' }}><div style={{ fontSize: '0.95rem', fontWeight: '800', color: duesTillNow === 0 ? '#16a34a' : '#dc2626' }}>₹{duesTillNow.toLocaleString('en-IN')}</div></td>
                                                            <td style={{ padding: '1rem', textAlign: 'center' }}><span style={{ background: statusBg, color: statusColor, padding: '0.3rem 0.65rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700', display: 'inline-block' }}>{statusText}</span></td>
                                                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                                {/* <button onClick={() => { setSelectedStudentForHistory(fee); fetchStudentHistory(fee.id, fee.studentName); setShowHistoryModal(true); }} style={{ background: '#4f46e5', color: 'white', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', marginRight: '0.5rem', fontWeight: '600' }}>View Details</button> */}
                                                                {duesTillNow > 0 && (
                                                                    <button onClick={() => handlePayDuesRedirect(fee, dueMonthFilter)} style={{ background: '#10b981', color: 'white', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', marginRight: '0.5rem', fontWeight: '700' }}>Pay Now</button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                }
                                            })}
                                        </>
                                    );
                                })()}
                            </tbody>
                        </table>
                        ) : (
                            /* Transport Dues Table - Full Calendar View Matching General Fees Dues */
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left', position: 'sticky', top: 0, zIndex: 2 }}>
                                        {(() => {
                                            const effectiveMonth = dueCalculationMode === 'cumulative' ? getCurrentAcademicMonth() : dueMonthFilter;
                                            const allAcademicMonths = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];
                                            const targetIdx = allAcademicMonths.indexOf(effectiveMonth);
                                            const monthsList = targetIdx !== -1 ? allAcademicMonths.slice(0, targetIdx + 1) : allAcademicMonths.slice(0, 5);

                                            if (dueCalculationMode === 'cumulative') {
                                                return (
                                                    <>
                                                        <th style={{ padding: '0.85rem 0.5rem', color: '#1e293b', fontSize: '0.8rem', fontWeight: '800', textAlign: 'center', width: '50px', backgroundColor: '#fef08a' }}>S.No</th>
                                                        <th style={{ padding: '0.85rem 1rem', color: '#1e293b', fontSize: '0.8rem', fontWeight: '800', backgroundColor: '#fef08a' }}>Student Name</th>
                                                        <th style={{ padding: '0.85rem 0.5rem', color: '#1e293b', fontSize: '0.8rem', fontWeight: '800', backgroundColor: '#fef08a' }}>Admission No</th>
                                                        <th style={{ padding: '0.85rem 0.5rem', color: '#1e293b', fontSize: '0.8rem', fontWeight: '800', backgroundColor: '#fef08a' }}>Father Name</th>
                                                        <th style={{ padding: '0.85rem 0.5rem', color: '#1e293b', fontSize: '0.8rem', fontWeight: '800', textAlign: 'center', backgroundColor: '#fef08a' }}>Class</th>
                                                        <th style={{ padding: '0.85rem 0.75rem', color: '#1e293b', fontSize: '0.8rem', fontWeight: '800', backgroundColor: '#fef08a' }}>Stop</th>
                                                        <th style={{ padding: '0.85rem 0.75rem', color: '#1e293b', fontSize: '0.8rem', fontWeight: '800', textAlign: 'right', backgroundColor: '#fef08a' }}>Monthly Fare</th>
                                                        {monthsList.map(m => (
                                                            <th key={m} style={{ padding: '0.85rem 0.6rem', color: '#1e293b', fontSize: '0.8rem', fontWeight: '800', textAlign: 'right', backgroundColor: '#fef08a' }} title={`${m} Transport Due`}>
                                                                {m.slice(0, 3)}
                                                            </th>
                                                        ))}
                                                        <th style={{ padding: '0.85rem 0.75rem', color: '#991b1b', fontSize: '0.85rem', fontWeight: '900', textAlign: 'right', backgroundColor: '#fef08a' }}>
                                                            Total Due Till {effectiveMonth.slice(0, 3)}
                                                        </th>
                                                        <th style={{ padding: '0.85rem 0.5rem', color: '#1e293b', fontSize: '0.8rem', fontWeight: '800', textAlign: 'center', backgroundColor: '#fef08a' }}>Status</th>
                                                        <th style={{ padding: '0.85rem 0.5rem', color: '#1e293b', fontSize: '0.8rem', fontWeight: '800', textAlign: 'center', backgroundColor: '#fef08a' }}>Action</th>
                                                    </>
                                                );
                                            }

                                            if (effectiveMonth !== 'All') {
                                                return (
                                                    <>
                                                        <th style={{ padding: '1rem', color: '#475569', fontSize: '0.8rem', fontWeight: '700', width: '50px', textAlign: 'center' }}>S.No</th>
                                                        <th style={{ padding: '1rem', color: '#475569', fontSize: '0.8rem', fontWeight: '700' }}>Student Name</th>
                                                        <th style={{ padding: '1rem', color: '#475569', fontSize: '0.8rem', fontWeight: '700' }}>Admission No</th>
                                                        <th style={{ padding: '1rem', color: '#475569', fontSize: '0.8rem', fontWeight: '700' }}>Father Name</th>
                                                        <th style={{ padding: '1rem', color: '#475569', fontSize: '0.8rem', fontWeight: '700', textAlign: 'center' }}>Class</th>
                                                        <th style={{ padding: '1rem', color: '#475569', fontSize: '0.8rem', fontWeight: '700' }}>Stop</th>
                                                        <th style={{ padding: '1rem', color: '#475569', fontSize: '0.8rem', fontWeight: '700', textAlign: 'right' }}>Monthly Fare</th>
                                                        <th style={{ padding: '1rem', color: '#475569', fontSize: '0.8rem', fontWeight: '700', textAlign: 'right' }}>{effectiveMonth.slice(0, 3)} Expected</th>
                                                        <th style={{ padding: '1rem', color: '#475569', fontSize: '0.8rem', fontWeight: '700', textAlign: 'right' }}>{effectiveMonth.slice(0, 3)} Paid</th>
                                                        <th style={{ padding: '1rem', color: '#475569', fontSize: '0.8rem', fontWeight: '700', textAlign: 'right' }}>{effectiveMonth.slice(0, 3)} Balance</th>
                                                        <th style={{ padding: '1rem', color: '#475569', fontSize: '0.8rem', fontWeight: '700', textAlign: 'center' }}>Status</th>
                                                        <th style={{ padding: '1rem', color: '#475569', fontSize: '0.8rem', fontWeight: '700', textAlign: 'center' }}>Action</th>
                                                    </>
                                                );
                                            }

                                            return (
                                                <>
                                                    <th style={{ padding: '1rem', color: '#475569', fontSize: '0.8rem', fontWeight: '700', width: '50px', textAlign: 'center' }}>S.No</th>
                                                    <th style={{ padding: '1rem', color: '#475569', fontSize: '0.8rem', fontWeight: '700' }}>Student Name</th>
                                                    <th style={{ padding: '1rem', color: '#475569', fontSize: '0.8rem', fontWeight: '700' }}>Admission No</th>
                                                    <th style={{ padding: '1rem', color: '#475569', fontSize: '0.8rem', fontWeight: '700' }}>Father Name</th>
                                                    <th style={{ padding: '1rem', color: '#475569', fontSize: '0.8rem', fontWeight: '700', textAlign: 'center' }}>Class</th>
                                                    <th style={{ padding: '1rem', color: '#475569', fontSize: '0.8rem', fontWeight: '700' }}>Stop</th>
                                                    <th style={{ padding: '1rem', color: '#475569', fontSize: '0.8rem', fontWeight: '700', textAlign: 'right' }}>Monthly Fare</th>
                                                    <th style={{ padding: '1rem', color: '#475569', fontSize: '0.8rem', fontWeight: '700', textAlign: 'right' }}>Session Expected (12 Mos)</th>
                                                    <th style={{ padding: '1rem', color: '#475569', fontSize: '0.8rem', fontWeight: '700', textAlign: 'right' }}>Total Paid</th>
                                                    <th style={{ padding: '1rem', color: '#475569', fontSize: '0.8rem', fontWeight: '700', textAlign: 'right' }}>Total Pending</th>
                                                    <th style={{ padding: '1rem', color: '#475569', fontSize: '0.8rem', fontWeight: '700', textAlign: 'center' }}>Status</th>
                                                    <th style={{ padding: '1rem', color: '#475569', fontSize: '0.8rem', fontWeight: '700', textAlign: 'center' }}>Action</th>
                                                </>
                                            );
                                        })()}
                                    </tr>
                                </thead>
                                <tbody>
                                    {(() => {
                                        const effectiveMonth = dueCalculationMode === 'cumulative' ? getCurrentAcademicMonth() : dueMonthFilter;
                                        const allAcademicMonths = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];
                                        const targetIdx = allAcademicMonths.indexOf(effectiveMonth);
                                        const monthsList = targetIdx !== -1 ? allAcademicMonths.slice(0, targetIdx + 1) : allAcademicMonths.slice(0, 5);
                                        const filtered = getFilteredTransportDues();
                                        const totalCols = dueCalculationMode === 'cumulative' ? (9 + monthsList.length) : (effectiveMonth !== 'All' ? 12 : 12);

                                        if (loadingTransportDues) {
                                            return <tr><td colSpan={totalCols} style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>Loading transport dues...</td></tr>;
                                        }

                                        if (filtered.length === 0) {
                                            let emptyMsg = `All transport students have paid for ${effectiveMonth}. ✓`;
                                            if (dueStatusFilter === 'Paid') {
                                                emptyMsg = `No fully paid transport students found for ${effectiveMonth}.`;
                                            } else if (dueStatusFilter === 'Unpaid') {
                                                emptyMsg = `No unpaid transport students found for ${effectiveMonth}.`;
                                            } else if (dueStatusFilter === 'Partially Paid') {
                                                emptyMsg = `No partially paid transport students found for ${effectiveMonth}.`;
                                            }
                                            return (
                                                <tr>
                                                    <td colSpan={totalCols} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                                                        {effectiveMonth === 'All' ? 'No pending transport dues found.' : emptyMsg}
                                                    </td>
                                                </tr>
                                            );
                                        }

                                        // Summary calculations
                                        const totalMonthlyFare = filtered.reduce((s: number, d: any) => s + (d.monthlyFare || 0), 0);
                                        
                                        return (
                                            <>
                                                {/* Summary banner */}
                                                <tr style={{ backgroundColor: '#f0f9ff' }}>
                                                    <td colSpan={totalCols} style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#0369a1', fontWeight: '700', borderBottom: '2px solid #bae6fd' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                                                            <span>🚌 Showing {filtered.length} student(s) for <strong>{effectiveMonth}</strong> {dueCalculationMode === 'cumulative' && <span style={{ backgroundColor: '#dbeafe', color: '#1e40af', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', marginLeft: '0.5rem' }}>🔄 Carry Forward Mode (April to {effectiveMonth})</span>}</span>
                                                            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                                                                {dueCalculationMode === 'cumulative' ? (
                                                                    <>
                                                                        <span>Monthly Transport Rate: <strong>₹{totalMonthlyFare.toLocaleString()}</strong></span>
                                                                        <span>Total Due (Apr-{effectiveMonth.slice(0, 3)}): <strong>₹{filtered.reduce((s: number, d: any) => {
                                                                            let studentDue = 0;
                                                                            const fare = d.monthlyFare || 0;
                                                                            monthsList.forEach(m => {
                                                                                const raw = d.monthWisePaid?.[m] || 0;
                                                                                const isMthPaid = (fare > 0 && raw >= fare) || (fare === 0);
                                                                                const paid = isMthPaid ? fare : Math.min(fare, raw);
                                                                                studentDue += Math.max(0, fare - paid);
                                                                            });
                                                                            return s + studentDue;
                                                                        }, 0).toLocaleString()}</strong></span>
                                                                        <span style={{ color: '#dc2626' }}>Total Net Due Till {effectiveMonth.slice(0, 3)}: <strong>₹{filtered.reduce((s: number, d: any) => {
                                                                            let studentDue = 0;
                                                                            const fare = d.monthlyFare || 0;
                                                                            monthsList.forEach(m => {
                                                                                const raw = d.monthWisePaid?.[m] || 0;
                                                                                const isMthPaid = (fare > 0 && raw >= fare) || (fare === 0);
                                                                                const paid = isMthPaid ? fare : Math.min(fare, raw);
                                                                                studentDue += Math.max(0, fare - paid);
                                                                            });
                                                                            return s + studentDue;
                                                                        }, 0).toLocaleString()}</strong></span>
                                                                    </>
                                                                ) : effectiveMonth !== 'All' ? (
                                                                    <>
                                                                        <span>Monthly Fare: <strong>₹{totalMonthlyFare.toLocaleString()}</strong></span>
                                                                        <span style={{ color: '#059669' }}>Month Paid: <strong>₹{filtered.reduce((s: number, d: any) => {
                                                                            const fare = d.monthlyFare || 0;
                                                                            const raw = d.monthWisePaid?.[effectiveMonth] || 0;
                                                                            const isMthPaid = (fare > 0 && raw >= fare) || (fare === 0);
                                                                            return s + (isMthPaid ? fare : Math.min(fare, raw));
                                                                        }, 0).toLocaleString()}</strong></span>
                                                                        <span style={{ color: '#ef4444' }}>Month Pending: <strong>₹{filtered.reduce((s: number, d: any) => {
                                                                            const fare = d.monthlyFare || 0;
                                                                            const raw = d.monthWisePaid?.[effectiveMonth] || 0;
                                                                            const isMthPaid = (fare > 0 && raw >= fare) || (fare === 0);
                                                                            const paid = isMthPaid ? fare : Math.min(fare, raw);
                                                                            return s + Math.max(0, fare - paid);
                                                                        }, 0).toLocaleString()}</strong></span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <span>Monthly Rate: <strong>₹{totalMonthlyFare.toLocaleString()}</strong></span>
                                                                        <span style={{ color: '#059669' }}>Total Paid: <strong>₹{filtered.reduce((s: number, d: any) => s + (d.totalPaid || 0), 0).toLocaleString()}</strong></span>
                                                                        <span style={{ color: '#ef4444' }}>Total Pending: <strong>₹{filtered.reduce((s: number, d: any) => s + (d.pending || 0), 0).toLocaleString()}</strong></span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>

                                                {filtered.map((due: any, index: number) => {
                                                    const fare = due.monthlyFare || 0;

                                                    if (dueCalculationMode === 'cumulative') {
                                                        const monthDues = monthsList.map(m => {
                                                            const rawPaid = due.monthWisePaid?.[m] || 0;
                                                            const isPaid = (fare > 0 && rawPaid >= fare) || (fare === 0);
                                                            const paid = isPaid ? fare : Math.min(fare, rawPaid);
                                                            const dueAmt = Math.max(0, fare - paid);
                                                            return { month: m, rawPaid, paid, dueAmt };
                                                        });

                                                        const totalDue = monthDues.reduce((sum, item) => sum + item.dueAmt, 0);

                                                        let statusText = "Unpaid";
                                                        let statusColor = "#ef4444";
                                                        let statusBg = "#fef2f2";

                                                        if (fare === 0) {
                                                            statusText = "No Transport Fare";
                                                            statusColor = "#059669";
                                                            statusBg = "#ecfdf5";
                                                        } else if (totalDue === 0) {
                                                            statusText = "Paid Till Date";
                                                            statusColor = "#059669";
                                                            statusBg = "#ecfdf5";
                                                        } else if ((due.totalPaid || 0) > 0 || monthDues.some(item => item.paid > 0)) {
                                                            statusText = "Partially Paid";
                                                            statusColor = "#d97706";
                                                            statusBg = "#fffbeb";
                                                        }

                                                        return (
                                                            <tr key={due.id} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                                                                <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: '600', color: '#64748b', fontSize: '0.85rem' }}>{index + 1}</td>
                                                                <td style={{ padding: '0.75rem 1rem' }}>
                                                                    <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.9rem' }}>{due.studentName}</div>
                                                                </td>
                                                                <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.85rem', fontWeight: '600', color: '#334155' }}>{due.admissionNo || '-'}</td>
                                                                <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.85rem', color: '#475569' }}>{due.fatherName || '-'}</td>
                                                                <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                                                                    <span style={{ background: '#e0e7ff', color: '#4338ca', padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600' }}>
                                                                        {due.className}
                                                                    </span>
                                                                </td>
                                                                <td style={{ padding: '0.75rem 0.75rem' }}>
                                                                    <span style={{ backgroundColor: '#f1f5f9', color: '#334155', padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600', whiteSpace: 'nowrap' }}>
                                                                        {due.stopName || 'N/A'}
                                                                    </span>
                                                                </td>
                                                                <td style={{ padding: '0.75rem 0.75rem', textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>
                                                                    ₹{fare.toLocaleString('en-IN')}
                                                                </td>
                                                                {monthDues.map(md => (
                                                                    <td key={md.month} style={{ padding: '0.75rem 0.6rem', textAlign: 'right' }}>
                                                                        <span style={{ fontSize: '0.9rem', fontWeight: md.dueAmt > 0 ? '700' : '600', color: md.dueAmt > 0 ? '#dc2626' : '#16a34a' }}>
                                                                            ₹{md.dueAmt.toLocaleString('en-IN')}
                                                                        </span>
                                                                    </td>
                                                                ))}
                                                                <td style={{ padding: '0.75rem 0.75rem', textAlign: 'right', backgroundColor: '#fef2f2' }}>
                                                                    <span style={{ fontSize: '0.95rem', fontWeight: '800', color: totalDue === 0 ? '#16a34a' : '#b91c1c' }}>
                                                                        ₹{totalDue.toLocaleString('en-IN')}
                                                                    </span>
                                                                </td>
                                                                <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                                                                    <span style={{ background: statusBg, color: statusColor, padding: '0.25rem 0.55rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700', display: 'inline-block', whiteSpace: 'nowrap' }}>
                                                                        {statusText}
                                                                    </span>
                                                                </td>
                                                                <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                                                                    {totalDue > 0 && (
                                                                        <button 
                                                                            onClick={() => handlePayDuesRedirect(due, effectiveMonth)} 
                                                                            style={{ background: '#10b981', color: 'white', border: 'none', padding: '0.35rem 0.7rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '700', whiteSpace: 'nowrap' }}
                                                                        >
                                                                            Pay Now
                                                                        </button>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    } else if (dueMonthFilter !== 'All') {
                                                        const rawPaid = due.monthWisePaid?.[dueMonthFilter] || 0;
                                                        const isPaid = (fare > 0 && rawPaid >= fare) || (fare === 0);
                                                        const paidAmt = isPaid ? fare : Math.min(fare, rawPaid);
                                                        const balanceAmt = Math.max(0, fare - paidAmt);

                                                        let statusText = "Pending";
                                                        let statusColor = "#ef4444";
                                                        let statusBg = "#fef2f2";

                                                        if (fare === 0) {
                                                            statusText = "No Transport Fare";
                                                            statusColor = "#059669";
                                                            statusBg = "#ecfdf5";
                                                        } else if (paidAmt >= fare) {
                                                            statusText = "Paid";
                                                            statusColor = "#059669";
                                                            statusBg = "#ecfdf5";
                                                        } else if (paidAmt > 0) {
                                                            statusText = "Partially Paid";
                                                            statusColor = "#d97706";
                                                            statusBg = "#fffbeb";
                                                        }

                                                        return (
                                                            <tr key={due.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                                <td style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', color: '#64748b' }}>{index + 1}</td>
                                                                <td style={{ padding: '1rem', fontWeight: '700', color: '#0f172a' }}>{due.studentName}</td>
                                                                <td style={{ padding: '1rem', fontWeight: '600', color: '#334155' }}>{due.admissionNo || '-'}</td>
                                                                <td style={{ padding: '1rem', color: '#475569' }}>{due.fatherName || 'N/A'}</td>
                                                                <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                                    <span style={{ background: '#e0e7ff', color: '#4338ca', padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600' }}>
                                                                        {due.className}
                                                                    </span>
                                                                </td>
                                                                <td style={{ padding: '1rem' }}>
                                                                    <span style={{ backgroundColor: '#f1f5f9', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600' }}>
                                                                        {due.stopName || 'N/A'}
                                                                    </span>
                                                                </td>
                                                                <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '700' }}>₹{fare.toLocaleString('en-IN')}</td>
                                                                <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '600', color: '#475569' }}>₹{fare.toLocaleString('en-IN')}</td>
                                                                <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '700', color: '#059669' }}>₹{paidAmt.toLocaleString('en-IN')}</td>
                                                                <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '800', color: balanceAmt === 0 ? '#16a34a' : '#dc2626' }}>₹{balanceAmt.toLocaleString('en-IN')}</td>
                                                                <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                                    <span style={{ background: statusBg, color: statusColor, padding: '0.3rem 0.65rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700', display: 'inline-block' }}>{statusText}</span>
                                                                </td>
                                                                <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                                    {balanceAmt > 0 && (
                                                                        <button onClick={() => handlePayDuesRedirect(due, dueMonthFilter)} style={{ background: '#10b981', color: 'white', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '700' }}>Pay Now</button>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    } else {
                                                        const sessionExpected = fare * 12;
                                                        const paidAmt = due.totalPaid || 0;
                                                        const pendingAmt = due.pending || Math.max(0, sessionExpected - paidAmt);

                                                        let statusText = "Pending";
                                                        let statusColor = "#ef4444";
                                                        let statusBg = "#fef2f2";

                                                        if (sessionExpected === 0) {
                                                            statusText = "No Transport Fare";
                                                            statusColor = "#059669";
                                                            statusBg = "#ecfdf5";
                                                        } else if (pendingAmt === 0) {
                                                            statusText = "Paid";
                                                            statusColor = "#059669";
                                                            statusBg = "#ecfdf5";
                                                        } else if (paidAmt > 0) {
                                                            statusText = "Partially Paid";
                                                            statusColor = "#d97706";
                                                            statusBg = "#fffbeb";
                                                        }

                                                        return (
                                                            <tr key={due.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                                <td style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', color: '#64748b' }}>{index + 1}</td>
                                                                <td style={{ padding: '1rem', fontWeight: '700', color: '#0f172a' }}>{due.studentName}</td>
                                                                <td style={{ padding: '1rem', fontWeight: '600', color: '#334155' }}>{due.admissionNo || '-'}</td>
                                                                <td style={{ padding: '1rem', color: '#475569' }}>{due.fatherName || 'N/A'}</td>
                                                                <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                                    <span style={{ background: '#e0e7ff', color: '#4338ca', padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600' }}>
                                                                        {due.className}
                                                                    </span>
                                                                </td>
                                                                <td style={{ padding: '1rem' }}>
                                                                    <span style={{ backgroundColor: '#f1f5f9', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600' }}>
                                                                        {due.stopName || 'N/A'}
                                                                    </span>
                                                                </td>
                                                                <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '700' }}>₹{fare.toLocaleString('en-IN')}</td>
                                                                <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '700', color: '#1e293b' }}>₹{sessionExpected.toLocaleString('en-IN')}</td>
                                                                <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '700', color: '#059669' }}>₹{paidAmt.toLocaleString('en-IN')}</td>
                                                                <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '800', color: pendingAmt === 0 ? '#16a34a' : '#dc2626' }}>₹{pendingAmt.toLocaleString('en-IN')}</td>
                                                                <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                                    <span style={{ background: statusBg, color: statusColor, padding: '0.3rem 0.65rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700', display: 'inline-block' }}>{statusText}</span>
                                                                </td>
                                                                <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                                    {pendingAmt > 0 && (
                                                                        <button onClick={() => handlePayDuesRedirect(due, 'All')} style={{ background: '#10b981', color: 'white', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '700' }}>Pay Now</button>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    }
                                                })}
                                            </>
                                        );
                                    })()}
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
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827' }}>Students with Previous Year Dues</h2>
                                <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>List of students carrying dues from previous year</p>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                                    Total Students: {dueFees.filter(f => (f.prevDuePending !== undefined ? f.prevDuePending : f.previousSessionDue || 0) > 0).filter(f => prevDueClassFilter === 'All' || f.className === prevDueClassFilter).length}
                                </span>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', background: '#f1f5f9', padding: '1rem', borderRadius: '12px' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: '700' }}>Search Name</label>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    placeholder="Search by student name..." 
                                    value={prevDueSearchQuery} 
                                    onChange={(e) => setPrevDueSearchQuery(e.target.value)} 
                                    style={{ height: '38px', padding: '0.2rem 0.8rem' }}
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: '700' }}>Filter by Class</label>
                                <select className="form-control" style={{ height: '38px', padding: '0.2rem 0.8rem' }} onChange={(e) => setPrevDueClassFilter(e.target.value)}>
                                    <option value="All">All Classes</option>
                                    {Array.from(new Map(classes.map(c => [c.name, c])).values()).sort((a, b) => sortClassNames(a.name, b.name)).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group" style={{ marginBottom: 0, display: 'flex', alignItems: 'flex-end' }}>
                                <button
                                    onClick={exportPreviousDueExcel}
                                    style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', backgroundColor: '#10b981', color: 'white', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', height: '38px' }}
                                >
                                    <Download size={16} /> Export Excel
                                </button>
                            </div>
                        </div>
                    </div>
                    <div style={{ maxHeight: '520px', overflowY: 'auto', borderTop: '1px solid #e2e8f0' }}>
                    <table style={{ width: '100%' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f8fafc' }}>
                                <th style={{ padding: '1rem 1.5rem' }}>S.No.</th>
                                <th style={{ padding: '1rem 1.5rem' }}>Student Name</th>
                                <th style={{ padding: '1rem 1.5rem' }}>Class</th>
                                <th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>Original Due (₹)</th>
                                <th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>Remaining Due (₹)</th>
                                <th style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dueFees
                                .filter(f => (f.prevDuePending !== undefined ? f.prevDuePending : f.previousSessionDue || 0) > 0)
                                .filter(f => prevDueClassFilter === 'All' || f.className === prevDueClassFilter)
                                .filter(f => prevDueSearchQuery === '' || (f.studentName || '').toLowerCase().includes(prevDueSearchQuery.toLowerCase()))
                                .map((fee, index) => {
                                    const remainingDue = (fee.prevDuePending !== undefined ? fee.prevDuePending : fee.previousSessionDue) || 0;
                                    return (
                                        <tr key={fee.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#64748b' }}>{index + 1}</td>
                                            <td style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#1e293b' }}>{fee.studentName}</td>
                                            <td style={{ padding: '1rem 1.5rem' }}>
                                                <span style={{ background: '#e0e7ff', color: '#4338ca', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700' }}>
                                                    {fee.className}
                                                </span>
                                            </td>
                                            <td style={{ padding: '1rem 1.5rem', textAlign: 'right', color: '#64748b', fontWeight: '600' }}>₹{(fee.previousSessionDue || 0).toLocaleString()}</td>
                                            <td style={{ padding: '1rem 1.5rem', textAlign: 'right', color: '#ef4444', fontWeight: '800' }}>₹{remainingDue.toLocaleString()}</td>
                                            <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                                                <button
                                                    className="btn-primary"
                                                    style={{ width: 'auto', padding: '0.4rem 1.2rem', fontSize: '0.75rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer' }}
                                                    onClick={() => handlePayPreviousYearDuesRedirect(fee)}
                                                >
                                                    Pay Dues
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
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



            {activeTab === 'approvals' && isApproverRole(user?.role) && (
                <div className="data-table-container shadow-lg">
                    <div className="table-header">
                        <div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Fee Approval & Verification Requests</h2>
                            <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>Principal & Admin review of online PayU payments, fee discounts, and unverified drafts</p>
                        </div>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                                <th style={{ padding: '0.8rem' }}>Student & SR No</th>
                                <th style={{ padding: '0.8rem' }}>Class</th>
                                <th style={{ padding: '0.8rem' }}>Mode / Txn ID</th>
                                <th style={{ padding: '0.8rem' }}>Fee Heads & Month</th>
                                <th style={{ padding: '0.8rem', textAlign: 'right' }}>Discount</th>
                                <th style={{ padding: '0.8rem', textAlign: 'right' }}>Amount (₹)</th>
                                <th style={{ padding: '0.8rem' }}>Date</th>
                                <th style={{ padding: '0.8rem', textAlign: 'center' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {feeRecords.filter(r => r.status === 'PENDING').length > 0 ? (
                                feeRecords.filter(r => r.status === 'PENDING').map(r => {
                                    const isPayU = (r.paymentMode || '').toLowerCase().includes('payu') || (r.paymentMode || '').toLowerCase().includes('online') || Boolean(r.txnid && r.txnid.includes('PAYU'));
                                    return (
                                        <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '0.8rem' }}>
                                                <div style={{ fontWeight: '800', color: '#0f172a' }}>{r.studentName}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>SR No: <strong>{r.admissionNo || 'N/A'}</strong></div>
                                            </td>
                                            <td style={{ padding: '0.8rem' }}>
                                                <span style={{ backgroundColor: '#e0e7ff', color: '#4338ca', padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700' }}>
                                                    {r.className}
                                                </span>
                                            </td>
                                            <td style={{ padding: '0.8rem' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                                    <span style={{ 
                                                        fontSize: '0.7rem', 
                                                        fontWeight: '800', 
                                                        padding: '0.12rem 0.4rem', 
                                                        borderRadius: '6px', 
                                                        backgroundColor: isPayU ? '#eff6ff' : '#f0fdf4', 
                                                        color: isPayU ? '#1d4ed8' : '#166534', 
                                                        border: `1px solid ${isPayU ? '#bfdbfe' : '#bbf7d0'}`,
                                                        display: 'inline-block',
                                                        width: 'fit-content'
                                                    }}>
                                                        {isPayU ? '💳 Online (PayU)' : '💵 Cash'}
                                                    </span>
                                                    {r.txnid && r.txnid !== '-' && (
                                                        <span style={{ fontSize: '0.68rem', color: '#64748b', fontFamily: 'monospace' }}>
                                                            {r.txnid}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{ padding: '0.8rem', fontSize: '0.82rem', color: '#334155' }}>
                                                <div><strong>{r.month || 'Session'}</strong></div>
                                                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{r.feeHead || 'Fee Payment'}</div>
                                            </td>
                                            <td style={{ padding: '0.8rem', textAlign: 'right', color: (r.discount || 0) > 0 ? '#ef4444' : '#94a3b8', fontWeight: '800' }}>
                                                ₹{(r.discount || 0).toLocaleString()}
                                            </td>
                                            <td style={{ padding: '0.8rem', textAlign: 'right', fontWeight: '900', color: '#047857', fontSize: '0.92rem' }}>
                                                ₹{(r.paidAmount || (r as any).amountPaid || 0).toLocaleString()}
                                            </td>
                                            <td style={{ padding: '0.8rem', fontSize: '0.75rem', color: '#64748b' }}>
                                                {r.date || ((r as any).paymentDate ? new Date((r as any).paymentDate).toLocaleDateString('en-GB') : '-')}
                                            </td>
                                            <td style={{ padding: '0.8rem', textAlign: 'center' }}>
                                                <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                                                    {isPayU && r.txnid && r.txnid !== '-' && (
                                                        <button 
                                                            onClick={() => checkPayUTransactionStatus(r.txnid || '')}
                                                            style={{ backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '0.35rem 0.65rem', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '0.72rem' }}
                                                            title="Verify status with PayU API"
                                                        >
                                                            🔍 Verify PayU
                                                        </button>
                                                    )}
                                                    <button 
                                                        onClick={() => approveFee(r.id)}
                                                        style={{ backgroundColor: '#22c55e', color: 'white', border: 'none', padding: '0.35rem 0.75rem', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '0.72rem', boxShadow: '0 2px 4px rgba(34, 197, 94, 0.2)' }}
                                                    >
                                                        ✓ Approve & Issue Receipt
                                                    </button>
                                                    <button 
                                                        onClick={() => rejectFee(r.id)}
                                                        style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '0.35rem 0.65rem', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '0.72rem' }}
                                                    >
                                                        ✕ Reject
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={8} style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>
                                        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🎉</div>
                                        <p style={{ fontWeight: '600' }}>No pending fee approval or verification requests.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'drafts' && (user?.role === 'ACCOUNTS' || user?.role === 'ACCOUNTS2') && (
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
                    {/* Dynamic Top Summary Cards */}
                    {(() => {
                        const filteredDailyData = getFilteredDailyReports();
                        const cashRecs = filteredDailyData.filter((d: any) => !(d.paymentMode || '').toLowerCase().includes('payu') && !(d.paymentMode || '').toLowerCase().includes('online'));
                        const onlineRecs = filteredDailyData.filter((d: any) => (d.paymentMode || '').toLowerCase().includes('payu') || (d.paymentMode || '').toLowerCase().includes('online'));
                        const cashTotal = cashRecs.reduce((s: number, d: any) => s + (d.paidAmount || 0), 0);
                        const onlineTotal = onlineRecs.reduce((s: number, d: any) => s + (d.paidAmount || 0), 0);
                        const dailyTotal = filteredDailyData.reduce((s: number, d: any) => s + (d.paidAmount || 0), 0);

                        return (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                                {/* Selected Date / Today's Total Card */}
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-5 hover:shadow-md transition-all">
                                    <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center text-2xl">
                                        <TrendingUp size={28} />
                                    </div>
                                    <div>
                                        <p className="text-slate-500 text-sm font-medium">
                                            {reportDateMode === 'all' 
                                                ? "All Dates Collection" 
                                                : reportDateMode === 'range' 
                                                    ? `Collection (${formatDisplayDate(reportStartDate).slice(0, 6)} - ${formatDisplayDate(reportEndDate).slice(0, 6)})`
                                                    : reportStartDate === getTodayISO()
                                                        ? "Today's Collection"
                                                        : reportStartDate === getYesterdayISO()
                                                            ? "Yesterday's Collection"
                                                            : `Collection (${formatDisplayDate(reportStartDate)})`
                                            }
                                        </p>
                                        <h3 className="text-2xl font-bold text-slate-900 mt-1">
                                            ₹ {dailyTotal.toLocaleString('en-IN')}
                                        </h3>
                                        <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '3px', fontWeight: '600' }}>
                                            {filteredDailyData.length} Receipt(s) Collected
                                        </div>
                                    </div>
                                </div>

                                {/* Selected Date Cash vs Online Breakdown Card */}
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-5 hover:shadow-md transition-all">
                                    <div className="w-14 h-14 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center text-2xl">
                                        <CreditCard size={28} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <p className="text-slate-500 text-sm font-medium">
                                            {reportDateMode === 'all' ? "Mode Breakdown (All Dates)" : `Mode Breakdown (${formatDisplayDate(reportStartDate)})`}
                                        </p>
                                        <div style={{ display: 'flex', gap: '0.85rem', marginTop: '0.35rem' }}>
                                            <div>
                                                <span style={{ fontSize: '0.65rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>💵 Cash ({cashRecs.length})</span>
                                                <div style={{ fontSize: '1.05rem', fontWeight: '800', color: '#1e293b' }}>₹ {cashTotal.toLocaleString('en-IN')}</div>
                                            </div>
                                            <div style={{ borderLeft: '1px solid #cbd5e1', paddingLeft: '0.75rem' }}>
                                                <span style={{ fontSize: '0.65rem', fontWeight: '800', color: '#047857', textTransform: 'uppercase' }}>💳 Online ({onlineRecs.length})</span>
                                                <div style={{ fontSize: '1.05rem', fontWeight: '800', color: '#047857' }}>₹ {onlineTotal.toLocaleString('en-IN')}</div>
                                            </div>
                                        </div>
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
                                            ₹ {(reportData.monthly.find(m => m.month === reportFilterMonth)?.total || 0).toLocaleString('en-IN')}
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
                                            ₹ {reportData.monthly.reduce((s, m) => s + m.total, 0).toLocaleString('en-IN')}
                                        </h3>
                                        <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '4px', fontWeight: '500', lineHeight: '1.2' }}>
                                            * Cumulative collection from session start
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        {[
                            { id: 'daily', label: 'Daily Collection', disabled: false },
                            { id: 'monthly', label: 'Monthly Collection Fee Report', disabled: false }
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
                        <div className="table-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                                {activeReport === 'daily' && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Daily Collection Report</h2>
                                            <span style={{ fontSize: '0.75rem', color: '#4f46e5', fontWeight: '700', backgroundColor: '#eef2ff', padding: '0.25rem 0.65rem', borderRadius: '6px', border: '1px solid #c7d2fe' }}>
                                                Session: {localStorage.getItem('activeSession') || '2026-2027'}
                                            </span>
                                        </div>

                                        {/* Calendar Date Picker & Controls */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#ffffff', padding: '0.3rem 0.6rem', borderRadius: '10px', border: '1.5px solid #cbd5e1', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                                <Calendar size={16} color="#4f46e5" strokeWidth={2.5} />
                                                <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#334155' }}>
                                                    {reportDateMode === 'range' ? 'From:' : 'Date:'}
                                                </span>
                                                <input 
                                                    type="date"
                                                    value={reportStartDate}
                                                    onChange={(e) => {
                                                        setReportStartDate(e.target.value);
                                                        if (reportDateMode === 'all') setReportDateMode('single');
                                                    }}
                                                    style={{
                                                        padding: '0.3rem 0.5rem',
                                                        borderRadius: '6px',
                                                        border: '1px solid #cbd5e1',
                                                        fontSize: '0.825rem',
                                                        fontWeight: '700',
                                                        color: '#1e293b',
                                                        backgroundColor: '#f8fafc',
                                                        cursor: 'pointer',
                                                        outline: 'none'
                                                    }}
                                                />
                                            </div>

                                            {reportDateMode === 'range' && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', borderLeft: '1px solid #cbd5e1', paddingLeft: '0.4rem' }}>
                                                    <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#334155' }}>To:</span>
                                                    <input 
                                                        type="date"
                                                        value={reportEndDate}
                                                        onChange={(e) => setReportEndDate(e.target.value)}
                                                        style={{
                                                            padding: '0.3rem 0.5rem',
                                                            borderRadius: '6px',
                                                            border: '1px solid #cbd5e1',
                                                            fontSize: '0.825rem',
                                                            fontWeight: '700',
                                                            color: '#1e293b',
                                                            backgroundColor: '#f8fafc',
                                                            cursor: 'pointer',
                                                            outline: 'none'
                                                        }}
                                                    />
                                                </div>
                                            )}

                                            {/* Quick Date Filter Buttons */}
                                            <div style={{ display: 'flex', gap: '0.25rem', marginLeft: '0.35rem' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const today = getTodayISO();
                                                        setReportStartDate(today);
                                                        setReportEndDate(today);
                                                        setReportDateMode('single');
                                                    }}
                                                    style={{
                                                        padding: '0.25rem 0.55rem',
                                                        borderRadius: '6px',
                                                        border: 'none',
                                                        fontSize: '0.75rem',
                                                        fontWeight: '700',
                                                        cursor: 'pointer',
                                                        backgroundColor: (reportDateMode === 'single' && reportStartDate === getTodayISO()) ? '#4f46e5' : '#f1f5f9',
                                                        color: (reportDateMode === 'single' && reportStartDate === getTodayISO()) ? '#ffffff' : '#475569',
                                                        transition: '0.2s'
                                                    }}
                                                >
                                                    Today
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const yest = getYesterdayISO();
                                                        setReportStartDate(yest);
                                                        setReportEndDate(yest);
                                                        setReportDateMode('single');
                                                    }}
                                                    style={{
                                                        padding: '0.25rem 0.55rem',
                                                        borderRadius: '6px',
                                                        border: 'none',
                                                        fontSize: '0.75rem',
                                                        fontWeight: '700',
                                                        cursor: 'pointer',
                                                        backgroundColor: (reportDateMode === 'single' && reportStartDate === getYesterdayISO()) ? '#4f46e5' : '#f1f5f9',
                                                        color: (reportDateMode === 'single' && reportStartDate === getYesterdayISO()) ? '#ffffff' : '#475569',
                                                        transition: '0.2s'
                                                    }}
                                                >
                                                    Yesterday
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (reportDateMode === 'range') {
                                                            setReportDateMode('single');
                                                        } else {
                                                            setReportDateMode('range');
                                                        }
                                                    }}
                                                    style={{
                                                        padding: '0.25rem 0.55rem',
                                                        borderRadius: '6px',
                                                        border: 'none',
                                                        fontSize: '0.75rem',
                                                        fontWeight: '700',
                                                        cursor: 'pointer',
                                                        backgroundColor: reportDateMode === 'range' ? '#4f46e5' : '#f1f5f9',
                                                        color: reportDateMode === 'range' ? '#ffffff' : '#475569',
                                                        transition: '0.2s'
                                                    }}
                                                >
                                                    {reportDateMode === 'range' ? 'Range ✓' : 'Date Range'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setReportDateMode('all');
                                                    }}
                                                    style={{
                                                        padding: '0.25rem 0.55rem',
                                                        borderRadius: '6px',
                                                        border: 'none',
                                                        fontSize: '0.75rem',
                                                        fontWeight: '700',
                                                        cursor: 'pointer',
                                                        backgroundColor: reportDateMode === 'all' ? '#4f46e5' : '#f1f5f9',
                                                        color: reportDateMode === 'all' ? '#ffffff' : '#475569',
                                                        transition: '0.2s'
                                                    }}
                                                >
                                                    All Dates
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {activeReport === 'monthly' && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Monthly Collection Fee Report</h2>
                                        <span style={{ fontSize: '0.75rem', color: '#4f46e5', fontWeight: '700', backgroundColor: '#eef2ff', padding: '0.25rem 0.65rem', borderRadius: '6px', border: '1px solid #c7d2fe' }}>
                                            Session: {localStorage.getItem('activeSession') || '2026-2027'}
                                        </span>
                                        <select 
                                            value={reportFilterMonth} 
                                            onChange={(e) => setReportFilterMonth(e.target.value)}
                                            style={{ 
                                                marginLeft: '0.5rem', 
                                                padding: '0.4rem 0.8rem', 
                                                borderRadius: '8px', 
                                                border: '1px solid #cbd5e1', 
                                                fontSize: '0.85rem', 
                                                fontWeight: '600', 
                                                color: '#475569',
                                                backgroundColor: '#ffffff',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <option value="All">All Months (April to March)</option>
                                            {['April','May','June','July','August','September','October','November','December','January','February','March'].map(m => (
                                                <option key={m} value={m}>{m}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                {activeReport === 'class' && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Class-wise Fee Collection</h2>
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
                                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Outstanding Dues Report</h2>
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
                            </div>

                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#ffffff', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                    <span style={{ padding: '0.4rem 0.65rem', fontWeight: '800', color: '#4f46e5', backgroundColor: '#eef2ff', fontSize: '0.85rem', borderRight: '1px solid #cbd5e1' }}>🔍 ID/Name</span>
                                    <input 
                                        type="text" 
                                        placeholder="Search Admission No / Student..." 
                                        value={reportAdmissionSearch}
                                        onChange={(e) => setReportAdmissionSearch(e.target.value)}
                                        style={{ 
                                            padding: '0.4rem 0.75rem', 
                                            border: 'none', 
                                            fontSize: '0.85rem', 
                                            width: '200px',
                                            outline: 'none',
                                            fontWeight: '600'
                                        }}
                                    />
                                    {reportAdmissionSearch && (
                                        <button onClick={() => setReportAdmissionSearch('')} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '0 0.5rem', color: '#94a3b8', fontWeight: 800 }}>✕</button>
                                    )}
                                </div>

                                {activeReport === 'daily' && (
                                    <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#ffffff', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                        <span style={{ padding: '0.4rem 0.65rem', fontWeight: '800', color: '#2563eb', backgroundColor: '#eff6ff', fontSize: '0.85rem', borderRight: '1px solid #cbd5e1' }}>RCP</span>
                                        <input 
                                            type="text" 
                                            placeholder="Receipt No..." 
                                            value={receiptSearchQuery.replace(/^rcp/i, '')}
                                            onChange={(e) => {
                                                const raw = e.target.value.trim();
                                                if (!raw) {
                                                    setReceiptSearchQuery('');
                                                } else if (raw.toLowerCase().startsWith('rcp')) {
                                                    setReceiptSearchQuery(raw.toUpperCase());
                                                } else {
                                                    setReceiptSearchQuery('RCP' + raw);
                                                }
                                            }}
                                            style={{ 
                                                padding: '0.4rem 0.75rem', 
                                                border: 'none', 
                                                fontSize: '0.85rem', 
                                                width: '120px',
                                                outline: 'none',
                                                fontWeight: '600'
                                            }}
                                        />
                                    </div>
                                )}
                                <button onClick={exportToPDF} className="btn-primary" style={{ width: 'auto', padding: '0.45rem 1rem', backgroundColor: '#ec4899', fontSize: '0.85rem' }}>
                                    Export PDF
                                </button>
                                {activeReport === 'daily' && (
                                    <button 
                                        onClick={exportDailyToExcel} 
                                        className="btn-primary" 
                                        style={{ width: 'auto', padding: '0.45rem 1rem', backgroundColor: '#10b981', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                                    >
                                        <Download size={15} /> Export Excel
                                    </button>
                                )}
                            </div>
                        </div>
 
                         <div style={{ maxHeight: '500px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)', position: 'relative' }} className="custom-scrollbar">
                          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                              <thead style={{ position: 'sticky', top: 0, zIndex: 20 }}>
                                  <tr style={{ backgroundColor: '#f1f5f9' }}>
                                     {activeReport === 'daily' && (<><th style={{ padding: '1rem 1.5rem' }}>Date</th><th style={{ padding: '1rem 1.5rem' }}>Student Name</th><th style={{ padding: '1rem 1.5rem' }}>Adm No</th><th style={{ padding: '1rem 1.5rem' }}>Father Name</th><th style={{ padding: '1rem 1.5rem' }}>Class</th><th style={{ padding: '1rem 1.5rem' }}>Receipt No</th><th style={{ padding: '1rem 1.5rem' }}>Payment Mode</th><th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>Amount (₹)</th><th style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>Actions</th></>)}
                                     {activeReport === 'monthly' && (<><th style={{ padding: '1rem 1.5rem' }}>Month</th><th style={{ padding: '1rem 1.5rem' }}>Year</th><th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>Total Collection (₹)</th></>)}
                                     {activeReport === 'class' && (<><th style={{ padding: '1rem 1.5rem' }}>Class</th><th style={{ padding: '1rem 1.5rem' }}>Students</th><th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>Collected Amount (₹)</th></>)}
                                     {activeReport === 'pending' && (<><th style={{ padding: '1rem 1.5rem' }}>Student Name</th><th style={{ padding: '1rem 1.5rem' }}>Adm No</th><th style={{ padding: '1rem 1.5rem' }}>Class</th><th style={{ padding: '1rem 1.5rem' }}>This Month (₹)</th><th style={{ padding: '1rem 1.5rem' }}>Month Paid (₹)</th><th style={{ padding: '1rem 1.5rem' }}>Month Due (₹)</th><th style={{ padding: '1rem 1.5rem' }}>Pending Months</th><th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>Total Due (₹)</th></>)}
                                  </tr>
                              </thead>
                              <tbody>
                                  {activeReport === 'daily' && (() => {
                                      const filteredData = getFilteredDailyReports();
                                      const rawQuery = receiptSearchQuery.trim().toLowerCase();
                                      const admSearch = reportAdmissionSearch.trim().toLowerCase();
                                      
                                      if (filteredData.length === 0) {
                                          return (
                                              <tr>
                                                  <td colSpan={9} style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#94a3b8' }}>
                                                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                                          <Calendar size={36} color="#cbd5e1" />
                                                          <div style={{ fontWeight: '600', fontSize: '1rem', color: '#64748b' }}>
                                                              {rawQuery !== '' || admSearch !== '' 
                                                                  ? 'No transactions found matching your search query.' 
                                                                  : reportDateMode === 'single'
                                                                      ? `No fee collections found on ${formatDisplayDate(reportStartDate)}.`
                                                                      : reportDateMode === 'range'
                                                                          ? `No fee collections found between ${formatDisplayDate(reportStartDate)} and ${formatDisplayDate(reportEndDate)}.`
                                                                          : 'No fee collections recorded in this session.'
                                                              }
                                                          </div>
                                                          {(reportDateMode !== 'all' || rawQuery !== '' || admSearch !== '') && (
                                                              <button 
                                                                  onClick={() => {
                                                                      setReceiptSearchQuery('');
                                                                      setReportAdmissionSearch('');
                                                                      setReportDateMode('all');
                                                                  }}
                                                                  style={{ 
                                                                      marginTop: '0.5rem', 
                                                                      padding: '0.35rem 0.85rem', 
                                                                      backgroundColor: '#eef2ff', 
                                                                      color: '#4f46e5', 
                                                                      border: '1px solid #c7d2fe', 
                                                                      borderRadius: '6px', 
                                                                      fontSize: '0.8rem', 
                                                                      fontWeight: '700', 
                                                                      cursor: 'pointer' 
                                                                  }}
                                                              >
                                                                  View All Dates / Clear Filters
                                                              </button>
                                                          )}
                                                      </div>
                                                  </td>
                                              </tr>
                                          );
                                      }

                                      return filteredData.map((d, i) => {
                                           const isOnlineRow = (d.paymentMode || '').toLowerCase().includes('payu') || (d.paymentMode || '').toLowerCase().includes('online');
                                           const isAdvancePayment = (d.feeHead || '').toLowerCase().includes('(advance)') || (d.feeHead || '').toLowerCase().includes('advance');
                                           const hasDiscount = (d.discount || 0) > 0;
                                           return (
                                               <tr key={d.id || i} style={{ backgroundColor: isAdvancePayment ? '#f5f3ff' : isOnlineRow ? '#ecfdf5' : 'transparent' }}>
                                                   <td style={{ padding: '1rem 1.5rem', color: isOnlineRow ? '#047857' : 'inherit' }}>{d.date}</td>
                                                   <td style={{ padding: '1rem 1.5rem', fontWeight: '600', color: isOnlineRow ? '#047857' : 'inherit' }}>{d.studentName}</td>
                                                   <td style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#334155' }}>{d.admissionNo || 'N/A'}</td>
                                                   <td style={{ padding: '1rem 1.5rem', color: isOnlineRow ? '#047857' : 'inherit' }}>{d.fatherName || 'N/A'}</td>
                                                   <td style={{ padding: '1rem 1.5rem', color: isOnlineRow ? '#047857' : 'inherit' }}>{d.className}</td>
                                                   <td style={{ padding: '1rem 1.5rem', fontWeight: '900', color: isOnlineRow ? '#047857' : '#2563eb' }}>
                                                       <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', alignItems: 'flex-start' }}>
                                                           {d.receiptNo}
                                                           {isAdvancePayment && (
                                                               <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '0.1rem 0.4rem', borderRadius: '5px', backgroundColor: '#ede9fe', color: '#6d28d9', border: '1px solid #c4b5fd', whiteSpace: 'nowrap' }}>⚡ Advance</span>
                                                           )}
                                                       </div>
                                                   </td>
                                                   <td style={{ padding: '1rem 1.5rem' }}>
                                                       <span style={{ 
                                                           fontSize: '0.75rem', 
                                                           fontWeight: '700', 
                                                           padding: '0.25rem 0.6rem', 
                                                           borderRadius: '6px',
                                                           backgroundColor: isAdvancePayment ? '#ede9fe' : isOnlineRow ? '#d1fae5' : '#f1f5f9',
                                                           color: isAdvancePayment ? '#6d28d9' : isOnlineRow ? '#047857' : '#334155',
                                                           border: `1px solid ${isAdvancePayment ? '#c4b5fd' : isOnlineRow ? '#a7f3d0' : '#cbd5e1'}`,
                                                           whiteSpace: 'nowrap'
                                                       }}>
                                                           {isAdvancePayment ? '⚡ Advance Pay' : isOnlineRow ? '💳 Online (PayU)' : '💵 Cash'}
                                                       </span>
                                                   </td>
                                                   <td style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: '800', color: isAdvancePayment ? '#6d28d9' : isOnlineRow ? '#047857' : '#059669' }}>
                                                       ₹{(d.paidAmount || 0).toLocaleString()}
                                                       {hasDiscount && (
                                                          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#92400e', marginTop: '0.2rem' }}>Disc: ₹{(d.discount || 0).toLocaleString()}</div>
                                                       )}
                                                   </td>
                                                   <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                                                       <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                           <button 
                                                               onClick={() => { setSelectedReceipt(d); setShowReceipt(true); }}
                                                               style={{ 
                                                                   padding: '0.4rem 0.8rem', 
                                                                   backgroundColor: isOnlineRow ? '#ffffff' : '#eff6ff', 
                                                                   border: `1px solid ${isOnlineRow ? '#a7f3d0' : '#bfdbfe'}`, 
                                                                   color: isOnlineRow ? '#047857' : '#2563eb', 
                                                                   borderRadius: '6px', 
                                                                   cursor: 'pointer', 
                                                                   fontSize: '0.75rem', 
                                                                   fontWeight: '800' 
                                                               }}
                                                           >
                                                               View Receipt
                                                           </button>
                                                           {isSuperAdminRole(user?.role) && (
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
                                                                     justifyContent: 'center',
                                                                     transition: 'background-color 0.2s'
                                                                 }}
                                                                 title="Delete Receipt (Superadmin Only)"
                                                             >
                                                                 <Trash2 size={16} />
                                                             </button>
                                                           )}
                                                       </div>
                                                   </td>
                                               </tr>
                                           );
                                       });
                                  })()}
                                 {activeReport === 'monthly' && (() => {
                                     const activeSessionStr = localStorage.getItem('activeSession') || '2026-2027';
                                     const academicMonths = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];
                                     
                                     const monthlyList = academicMonths.map(m => {
                                         const found = (reportData.monthly || []).find((rec: any) => rec.month?.trim().toLowerCase() === m.toLowerCase());
                                         return {
                                             month: m,
                                             year: found ? found.year : activeSessionStr,
                                             total: found ? found.total : 0
                                         };
                                     }).filter(m => reportFilterMonth === 'All' || m.month.toLowerCase() === reportFilterMonth.toLowerCase());

                                     const totalSum = monthlyList.reduce((acc, curr) => acc + curr.total, 0);

                                     return (
                                         <>
                                             {monthlyList.map((m, i) => (
                                                 <tr key={i} style={{ backgroundColor: reportFilterMonth !== 'All' && m.month === reportFilterMonth ? '#eef2ff' : 'transparent' }}>
                                                     <td style={{ padding: '1rem 1.5rem', fontWeight: '700', color: '#1e293b' }}>{m.month}</td>
                                                     <td style={{ padding: '1rem 1.5rem', color: '#64748b' }}>{m.year}</td>
                                                     <td style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: '800', color: m.total > 0 ? '#4f46e5' : '#94a3b8' }}>
                                                         ₹{m.total.toLocaleString('en-IN')}
                                                     </td>
                                                 </tr>
                                             ))}
                                             {/* GRAND TOTAL Footer Row */}
                                             <tr style={{ backgroundColor: '#f8fafc', borderTop: '2px solid #cbd5e1' }}>
                                                 <td colSpan={2} style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: '800', color: '#0f172a', fontSize: '0.95rem' }}>
                                                     GRAND TOTAL:
                                                 </td>
                                                 <td style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: '900', color: '#047857', fontSize: '1.1rem' }}>
                                                     ₹{totalSum.toLocaleString('en-IN')}
                                                 </td>
                                             </tr>
                                         </>
                                     );
                                 })()}
                                 {activeReport === 'class' && reportData.classWise
                                     .filter(c => classReportFilter === 'All' || c.className === classReportFilter)
                                     .map((c, idx) => (
                                         <tr key={idx}>
                                             <td style={{ padding: '1rem 1.5rem' }}>{c.className}</td>
                                             <td style={{ padding: '1rem 1.5rem' }}>{c.students}</td>
                                             <td style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: '700' }}>₹{c.total.toLocaleString('en-IN')}</td>
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
                                                  ₹{dueMonthFilter === 'All' ? (fee.currentMonthExpected || 0).toLocaleString('en-IN') : (fee.monthlyFeeAmount || 0).toLocaleString('en-IN')}
                                              </td>
                                                                                           <td style={{ padding: '1rem 1.5rem', color: '#059669', fontWeight: '600' }}>
                                                  ₹{dueMonthFilter === 'All' ? (fee.currentMonthPaid || 0).toLocaleString('en-IN') : (fee.monthWisePaid?.[dueMonthFilter] || 0).toLocaleString('en-IN')}
                                              </td>
                                                                                           <td style={{ padding: '1rem 1.5rem', color: '#ef4444', fontWeight: '600' }}>
                                                  ₹{dueMonthFilter === 'All' ? (fee.currentMonthPending || 0).toLocaleString('en-IN') : Math.max(0, (fee.monthlyFeeAmount || 0) - (fee.monthWisePaid?.[dueMonthFilter] || 0)).toLocaleString('en-IN')}
                                              </td>
                                             <td style={{ padding: '1rem 1.5rem', fontSize: '0.8rem', color: '#64748b' }}>{fee.pendingMonths?.join(', ') || 'None'}</td>
                                             <td style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: '800', color: '#dc2626' }}>₹{fee.pending.toLocaleString('en-IN')}</td>
                                         </tr>
                                     ));
                                 })()}
                             </tbody>
                             <tfoot>
                                 <tr style={{ backgroundColor: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                                     <td colSpan={activeReport === 'pending' ? 7 : 2} style={{ padding: '1rem 1.5rem', fontWeight: '800', textAlign: 'right' }}>Grand Total:</td>
                                     <td style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: '900', color: '#111827', fontSize: '1.1rem' }}>
                                         ₹{(() => {
                                             if (activeReport === 'daily') return reportData.daily.filter(d => d.date === new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })).reduce((s, d) => s + d.paidAmount, 0).toLocaleString('en-IN');
                                             if (activeReport === 'monthly') return reportData.monthly.filter(m => m.month === reportFilterMonth).reduce((s, m) => s + m.total, 0).toLocaleString('en-IN');
                                             if (activeReport === 'class') return reportData.classWise
                                                 .filter(c => classReportFilter === 'All' || c.className === classReportFilter)
                                                 .reduce((s, c) => s + c.total, 0).toLocaleString('en-IN');
                                             if (activeReport === 'pending') return dueFees
                                                 .filter(f => {
                                                     const classMatch = pendingClassFilter === 'All' || f.className === pendingClassFilter;
                                                     const rtMatch = dueRtFilter === 'All' || 
                                                                   (dueRtFilter === 'RT' && f.isRT) || 
                                                                   (dueRtFilter === 'Non-RT' && !f.isRT);
                                                     const monthMatch = dueMonthFilter === 'All' || (f.pendingMonths || []).includes(dueMonthFilter);
                                                     return classMatch && rtMatch && monthMatch;
                                                 })
                                                 .reduce((s: any, d: any) => s + d.pending, 0).toLocaleString('en-IN');
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
                                Session: {selectedReceipt?.session?.name || selectedReceipt?.sessionName || localStorage.getItem('activeSession') || '2026-2027'}<br/>
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
                                    onClick={() => { document.body.classList.add('printing-receipt'); window.print(); }} 
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
                    </div>
                );
            })()}

            {/* History & Due Breakdown Modal */}
            {showHistoryModal && selectedStudentForHistory && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100, padding: '1.5rem', backdropFilter: 'blur(10px)' }}>
                    <div style={{ backgroundColor: 'white', borderRadius: '24px', width: '100%', maxWidth: '1100px', maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', border: '1px solid #e2e8f0' }}>
                        
                        {/* Modal Header */}
                        <div style={{ padding: '1.5rem 2rem', background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: '800', letterSpacing: '-0.025em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <TrendingUp size={24} color="#38bdf8" /> Student Financial Ledger
                                </h2>
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '0.95rem', color: '#f8fafc', fontWeight: '700' }}>{selectedStudentForHistory.studentName}</span>
                                    <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#94a3b8' }} />
                                    <span style={{ fontSize: '0.9rem', color: '#cbd5e1', fontWeight: '500' }}>Class: {selectedStudentForHistory.className}</span>
                                    <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#94a3b8' }} />
                                    <span style={{ fontSize: '0.9rem', color: '#cbd5e1', fontWeight: '500' }}>Adm No: {selectedStudentForHistory.admissionNo}</span>
                                    {selectedStudentForHistory.isRT && (
                                        <>
                                            <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#94a3b8' }} />
                                            <span style={{ fontSize: '0.75rem', backgroundColor: '#ecfdf5', color: '#059669', padding: '0.2rem 0.6rem', borderRadius: '20px', fontWeight: 'bold' }}>RTE Student</span>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                {studentLedger && (
                                    <>
                                        <button 
                                            onClick={() => downloadStudentStatementExcel(studentLedger)}
                                            className="btn-primary" 
                                            style={{ 
                                                padding: '0.6rem 1.2rem', 
                                                width: 'auto', 
                                                backgroundColor: '#059669', 
                                                fontSize: '0.85rem', 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                gap: '0.4rem',
                                                borderRadius: '10px',
                                                border: 'none',
                                                color: 'white',
                                                fontWeight: '700',
                                                cursor: 'pointer',
                                                boxShadow: '0 4px 6px -1px rgba(5,150,105,0.3)'
                                            }}
                                        >
                                            <Download size={16} /> Download Statement (Excel)
                                        </button>
                                        <button 
                                            onClick={printStudentStatement}
                                            className="btn-primary" 
                                            style={{ 
                                                padding: '0.6rem 1.2rem', 
                                                width: 'auto', 
                                                backgroundColor: '#1e293b', 
                                                fontSize: '0.85rem', 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                gap: '0.4rem',
                                                borderRadius: '10px',
                                                border: 'none',
                                                color: 'white',
                                                fontWeight: '700',
                                                cursor: 'pointer',
                                                boxShadow: '0 4px 6px -1px rgba(30,41,59,0.3)'
                                            }}
                                        >
                                            🖨️ Print Statement (PDF)
                                        </button>
                                    </>
                                )}
                                <button onClick={() => setShowHistoryModal(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: '40px', height: '40px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', transition: '0.2s', fontWeight: 'bold' }}>×</button>
                            </div>
                        </div>

                        {loadingLedger || !studentLedger ? (
                            <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b', fontSize: '1.1rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ border: '4px solid #f3f3f3', borderTop: '4px solid #4f46e5', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' }} />
                                <span>Loading ledger data...</span>
                                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                            </div>
                        ) : (
                            <div style={{ padding: '2rem', overflowY: 'auto', flex: 1, backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '2rem' }} className="custom-scrollbar">
                                
                                {/* 1. Zoho Statement of Accounts Cards */}
                                <div>
                                    <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#1e293b', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Account Summary</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                                        
                                        <div style={{ background: 'linear-gradient(to bottom right, #ffffff, #f1f5f9)', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                                            <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Previous Dues</p>
                                            <p style={{ fontSize: '1.5rem', fontWeight: '900', color: '#ef4444' }}>₹{formatAmount(studentLedger.summary.previousDuesPending)}</p>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.4rem', display: 'flex', justifyContent: 'space-between' }}>
                                                <span>Billed: ₹{formatAmount(studentLedger.summary.previousSessionDue)}</span>
                                                <span style={{ color: '#059669' }}>Paid: ₹{formatAmount(studentLedger.summary.previousDuesPaid)}</span>
                                            </div>
                                        </div>

                                        <div style={{ background: 'linear-gradient(to bottom right, #ffffff, #f1f5f9)', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                                            <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', marginBottom: '0.4rem' }}>One-Time / Annual</p>
                                            <p style={{ fontSize: '1.5rem', fontWeight: '900', color: studentLedger.summary.oneTimePending > 0 ? '#f59e0b' : '#059669' }}>₹{formatAmount(studentLedger.summary.oneTimePending)}</p>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.4rem', display: 'flex', justifyContent: 'space-between' }}>
                                                <span>Billed: ₹{formatAmount(studentLedger.summary.expectedOneTime)}</span>
                                                <span style={{ color: '#059669' }}>Paid: ₹{formatAmount(studentLedger.summary.oneTimePaid)}</span>
                                            </div>
                                        </div>

                                        <div style={{ background: 'linear-gradient(to bottom right, #ffffff, #f1f5f9)', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                                            <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Monthly Fees (To Date)</p>
                                            <p style={{ fontSize: '1.5rem', fontWeight: '900', color: studentLedger.summary.monthlyPending > 0 ? '#ef4444' : '#059669' }}>₹{formatAmount(studentLedger.summary.monthlyPending)}</p>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.4rem', display: 'flex', justifyContent: 'space-between' }}>
                                                <span>Billed: ₹{formatAmount(studentLedger.summary.expectedMonthlyUpToNow)}</span>
                                                <span style={{ color: '#059669' }}>Paid: ₹{formatAmount(studentLedger.summary.monthlyPaid)}</span>
                                            </div>
                                        </div>

                                        <div style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', padding: '1.25rem', borderRadius: '16px', border: '1px solid #bfdbfe', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                                            <p style={{ fontSize: '0.75rem', color: '#1e40af', fontWeight: '800', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Total Outstanding</p>
                                            <p style={{ fontSize: '1.75rem', fontWeight: '950', color: studentLedger.summary.netOutstanding > 0 ? '#ef4444' : '#059669' }}>₹{formatAmount(studentLedger.summary.netOutstanding)}</p>
                                            <div style={{ fontSize: '0.75rem', color: '#1e40af', marginTop: '0.4rem', display: 'flex', justifyContent: 'space-between' }}>
                                                <span>Expected Yr: ₹{formatAmount(studentLedger.summary.totalExpectedWholeYear)}</span>
                                                <span>Paid All: ₹{formatAmount(studentLedger.summary.totalPaidAllTime)}</span>
                                            </div>
                                        </div>

                                    </div>
                                </div>

                                {/* 2. Monthly Fee Grid Matrix */}
                                <div>
                                    <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#1e293b', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <CalendarDays size={18} color="#4f46e5" /> Monthly Dues Status Grid
                                    </h3>
                                    <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflowX: 'auto', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                            <thead>
                                                <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0', color: '#475569', textAlign: 'center', fontWeight: 'bold' }}>
                                                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Fee Head</th>
                                                    {['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'].map(m => (
                                                        <th key={m} style={{ padding: '0.75rem 0.5rem' }}>{m}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {/* Tuition / other Monthly Heads */}
                                                {(() => {
                                                    const classStruct = feeStructure.find(s => s.className === selectedStudentForHistory.className);
                                                    const activeMonthlyHeads = feeHeads.filter(h => h.type === 'Monthly' && (classStruct?.fees?.[h.name] || 0) > 0);
                                                    
                                                    const rows = activeMonthlyHeads.map(h => ({ name: h.name, isTransport: false }));
                                                    if (selectedStudentForHistory.monthlyFare > 0 || (studentLedger.student?.transportFare || 0) > 0) {
                                                        rows.push({ name: `Transport (${studentLedger.student?.transportStop || 'Bus'})`, isTransport: true });
                                                    }

                                                    if (rows.length === 0) {
                                                        return <tr><td colSpan={13} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No monthly heads defined.</td></tr>;
                                                    }

                                                    return rows.map((row, rIdx) => (
                                                        <tr key={rIdx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                            <td style={{ padding: '0.75rem 1rem', fontWeight: '700', color: '#334155' }}>{row.name}</td>
                                                            {studentLedger.monthlyStatus.map((ms: any, mIdx: number) => {
                                                                const matchingHead = ms.heads.find((h: any) => 
                                                                    row.isTransport ? h.name === 'Transport Fee' : h.name === row.name
                                                                );
                                                                
                                                                const expected = matchingHead?.expected || 0;
                                                                const paid = matchingHead?.paid || 0;
                                                                const pending = matchingHead?.pending || 0;
                                                                
                                                                let bg = 'transparent';
                                                                let content = <span style={{ color: '#94a3b8' }}>-</span>;

                                                                if (expected > 0) {
                                                                    if (paid >= expected) {
                                                                        bg = '#f0fdf4';
                                                                        content = <span style={{ color: '#166534', fontWeight: 'bold' }}>₹{formatAmount(paid)}</span>;
                                                                    } else if (paid > 0) {
                                                                        bg = '#fffbeb';
                                                                        content = (
                                                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                                                <span style={{ color: '#b45309', fontWeight: 'bold' }}>₹{formatAmount(paid)}</span>
                                                                                <span style={{ fontSize: '0.65rem', color: '#ef4444' }}>Due ₹{formatAmount(pending)}</span>
                                                                            </div>
                                                                        );
                                                                    } else if (ms.isElapsed) {
                                                                        bg = '#fef2f2';
                                                                        content = <span style={{ color: '#ef4444', fontWeight: 'bold' }}>₹{formatAmount(expected)}</span>;
                                                                    } else {
                                                                        content = <span style={{ color: '#64748b' }}>₹{formatAmount(expected)}</span>;
                                                                    }
                                                                } else if (selectedStudentForHistory.isRT && !row.isTransport) {
                                                                    content = <span style={{ color: '#64748b', fontSize: '0.75rem', fontStyle: 'italic' }}>RTE</span>;
                                                                }

                                                                return (
                                                                    <td key={mIdx} style={{ padding: '0.5rem', textAlign: 'center', backgroundColor: bg }}>
                                                                        {content}
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    ));
                                                })()}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* 3. One-Time / Annual Table */}
                                {studentLedger.oneTimeStatus.length > 0 && (
                                    <div>
                                        <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#1e293b', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>One-Time & Annual Fees Ledger</h3>
                                        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflowX: 'auto', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                                <thead>
                                                    <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                                                        <th style={{ padding: '0.75rem 1rem' }}>Fee Head</th>
                                                        <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Expected</th>
                                                        <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Paid</th>
                                                        <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Balance Due</th>
                                                        <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {studentLedger.oneTimeStatus.map((ot: any, idx: number) => (
                                                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                            <td style={{ padding: '0.75rem 1rem', fontWeight: '700', color: '#334155' }}>{ot.name}</td>
                                                            <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>₹{formatAmount(ot.expected)}</td>
                                                            <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#059669', fontWeight: '700' }}>₹{formatAmount(ot.paid)}</td>
                                                            <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: ot.pending > 0 ? '#ef4444' : '#059669', fontWeight: '700' }}>₹{formatAmount(ot.pending)}</td>
                                                            <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                                                                <span style={{ 
                                                                    fontSize: '0.7rem', 
                                                                    padding: '0.2rem 0.5rem', 
                                                                    borderRadius: '20px', 
                                                                    fontWeight: 'bold',
                                                                    backgroundColor: ot.pending === 0 ? '#dcfce7' : '#fee2e2',
                                                                    color: ot.pending === 0 ? '#15803d' : '#b91c1c'
                                                                }}>
                                                                    {ot.pending === 0 ? 'Paid' : 'Pending'}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* 4. Detailed Transaction Receipts History */}
                                <div>
                                    <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#1e293b', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Chronological Statement of Transactions</h3>
                                    <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflowY: 'auto', maxHeight: '350px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                            <thead>
                                                <tr style={{ textAlign: 'left', background: '#f1f5f9', color: '#475569', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 1, borderBottom: '2px solid #e2e8f0' }}>
                                                    <th style={{ padding: '0.75rem 1rem' }}>Receipt No</th>
                                                    <th style={{ padding: '0.75rem 1rem' }}>Date</th>
                                                    <th style={{ padding: '0.75rem 1rem' }}>Description / Items</th>
                                                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Paid (₹)</th>
                                                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Status</th>
                                                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {studentLedger.payments.length > 0 ? (
                                                    studentLedger.payments.map((r: any) => (
                                                        <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                            <td style={{ padding: '0.75rem 1rem', fontWeight: '800', color: '#2563eb' }}>{r.receiptNo}</td>
                                                            <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>
                                                                {new Date(r.paymentDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                            </td>
                                                            <td style={{ padding: '0.75rem 1rem', color: '#475569', maxWidth: '300px', whiteSpace: 'normal', wordBreak: 'break-all' }}>
                                                                {r.feeHead.includes('==>') ? r.feeHead.split('==>')[1].trim() : r.feeHead}
                                                            </td>
                                                            <td style={{ padding: '0.75rem 1rem', fontWeight: '800', textAlign: 'right', color: '#059669' }}>
                                                                ₹{r.amountPaid.toLocaleString()}
                                                            </td>
                                                            <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                                                                <span style={{ 
                                                                    fontSize: '0.65rem', 
                                                                    fontWeight: '800', 
                                                                    padding: '0.2rem 0.5rem', 
                                                                    borderRadius: '20px',
                                                                    backgroundColor: r.status === 'APPROVED' ? '#dcfce7' : r.status === 'PENDING' ? '#fef9c3' : '#fee2e2',
                                                                    color: r.status === 'APPROVED' ? '#166534' : r.status === 'PENDING' ? '#854d0e' : '#991b1b'
                                                                }}>{r.status}</span>
                                                            </td>
                                                            <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                                                                <button 
                                                                    onClick={() => { 
                                                                        setSelectedReceipt({
                                                                            ...r,
                                                                            paidAmount: r.amountPaid,
                                                                            studentName: selectedStudentForHistory.studentName,
                                                                            admissionNo: selectedStudentForHistory.admissionNo,
                                                                            className: selectedStudentForHistory.className,
                                                                            date: new Date(r.paymentDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
                                                                            sessionName: r.session?.name || null
                                                                        }); 
                                                                        setShowReceipt(true); 
                                                                    }}
                                                                    style={{ padding: '0.3rem 0.7rem', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}
                                                                >
                                                                    Receipt
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>No approved transaction statement found.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                            </div>
                        )}

                        {/* Modal Footer */}
                        <div style={{ padding: '1.25rem 2rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', background: '#f8fafc' }}>
                            <button onClick={() => setShowHistoryModal(false)} style={{ padding: '0.65rem 2rem', background: '#1e293b', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', transition: '0.2s' }}>Close Statement</button>
                        </div>
                    </div>
                </div>
            )}
            </div>

            {studentLedger && (
                <div id="statement-print-overlay" style={{ display: 'none', backgroundColor: '#fff', padding: '2rem', width: '210mm', minHeight: '297mm', color: '#1e293b', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #1e293b', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
                        <div>
                            <h1 style={{ fontSize: '2rem', fontWeight: '800', color: '#1e293b', margin: 0, textTransform: 'uppercase' }}>BIPS SENIOR SECONDARY SCHOOL</h1>
                            <p style={{ fontSize: '0.9rem', color: '#64748b', margin: '4px 0 0 0', fontWeight: '500' }}>Affiliated to CBSE, New Delhi | School Code: 2024-25</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', letterSpacing: '0.05em' }}>STATEMENT OF ACCOUNT</div>
                            <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>Date: {new Date().toLocaleDateString('en-GB')}</div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#4a90e2', marginTop: '4px' }}>Session: {localStorage.getItem('activeSession') || '2024-2025'}</div>
                        </div>
                    </div>

                    {/* Profiles */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2.5rem', backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <div>
                            <h3 style={{ fontSize: '0.9rem', color: '#475569', textTransform: 'uppercase', margin: '0 0 0.75rem 0', letterSpacing: '0.05em', borderBottom: '1px solid #cbd5e1', paddingBottom: '4px' }}>Student Profile</h3>
                            <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                                <tbody>
                                    <tr>
                                        <td style={{ padding: '4px 0', color: '#64748b', fontWeight: '500', width: '110px' }}>Student Name</td>
                                        <td style={{ padding: '4px 0', fontWeight: '700', color: '#1e293b' }}>{studentLedger.student?.name}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ padding: '4px 0', color: '#64748b', fontWeight: '500' }}>Admission No</td>
                                        <td style={{ padding: '4px 0', fontWeight: '700', color: '#1e293b' }}>{studentLedger.student?.admissionNo}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ padding: '4px 0', color: '#64748b', fontWeight: '500' }}>Class / Section</td>
                                        <td style={{ padding: '4px 0', fontWeight: '700', color: '#1e293b' }}>{studentLedger.student?.className}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ padding: '4px 0', color: '#64748b', fontWeight: '500' }}>Father's Name</td>
                                        <td style={{ padding: '4px 0', fontWeight: '700', color: '#1e293b' }}>{studentLedger.student?.fatherName || 'N/A'}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div>
                            <h3 style={{ fontSize: '0.9rem', color: '#475569', textTransform: 'uppercase', margin: '0 0 0.75rem 0', letterSpacing: '0.05em', borderBottom: '1px solid #cbd5e1', paddingBottom: '4px' }}>Statement Details</h3>
                            <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                                <tbody>
                                    <tr>
                                        <td style={{ padding: '4px 0', color: '#64748b', fontWeight: '500', width: '110px' }}>Statement Period</td>
                                        <td style={{ padding: '4px 0', fontWeight: '700', color: '#1e293b' }}>April 2024 - March 2025</td>
                                    </tr>
                                    <tr>
                                        <td style={{ padding: '4px 0', color: '#64748b', fontWeight: '500' }}>Transport Route</td>
                                        <td style={{ padding: '4px 0', fontWeight: '700', color: '#1e293b' }}>{studentLedger.student?.transportStop !== 'N/A' ? studentLedger.student?.transportStop : 'None (Self)'}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ padding: '4px 0', color: '#64748b', fontWeight: '500' }}>Transport Fare</td>
                                        <td style={{ padding: '4px 0', fontWeight: '700', color: '#1e293b' }}>{studentLedger.student?.transportFare > 0 ? `₹${studentLedger.student?.transportFare}/month` : '₹0'}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ padding: '4px 0', color: '#64748b', fontWeight: '500' }}>RTE Status</td>
                                        <td style={{ padding: '4px 0', fontWeight: '700', color: '#1e293b' }}>{studentLedger.student?.isRT ? 'Yes (Exempt)' : 'No (Regular)'}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Summary Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2.5rem' }}>
                        <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '1rem', textAlign: 'center', backgroundColor: '#f1f5f9' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', marginBottom: '4px' }}>Yearly Expected</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#1e293b' }}>₹{studentLedger.summary?.totalExpectedWholeYear?.toLocaleString()}</div>
                        </div>
                        <div style={{ border: '1px solid #bbf7d0', borderRadius: '8px', padding: '1rem', textAlign: 'center', backgroundColor: '#f0fdf4' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#166534', textTransform: 'uppercase', marginBottom: '4px' }}>Total Paid</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#166534' }}>₹{studentLedger.summary?.totalPaidAllTime?.toLocaleString()}</div>
                        </div>
                        <div style={{ border: '1px solid #fed7aa', borderRadius: '8px', padding: '1rem', textAlign: 'center', backgroundColor: '#fff7ed' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#c2410c', textTransform: 'uppercase', marginBottom: '4px' }}>Concessions</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#c2410c' }}>
                                ₹{(() => {
                                    const totalConcessions = studentLedger.payments?.reduce((sum: number, p: any) => sum + (p.discount || 0), 0) || 0;
                                    return totalConcessions.toLocaleString();
                                })()}
                            </div>
                        </div>
                        <div style={{ border: '1px solid #fecaca', borderRadius: '8px', padding: '1rem', textAlign: 'center', backgroundColor: '#fef2f2' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#991b1b', textTransform: 'uppercase', marginBottom: '4px' }}>Net Outstanding</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#991b1b' }}>₹{studentLedger.summary?.netOutstanding?.toLocaleString()}</div>
                        </div>
                    </div>

                    {/* Table */}
                    <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#1e293b', margin: '0 0 1rem 0' }}>Transaction Ledger Details</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#1e293b', color: 'white', textAlign: 'left' }}>
                                <th style={{ padding: '8px 12px', border: '1px solid #1e293b' }}>Date</th>
                                <th style={{ padding: '8px 12px', border: '1px solid #1e293b' }}>Particulars / Description</th>
                                <th style={{ padding: '8px 12px', border: '1px solid #1e293b', textAlign: 'center' }}>Receipt No</th>
                                <th style={{ padding: '8px 12px', border: '1px solid #1e293b' }}>Type</th>
                                <th style={{ padding: '8px 12px', border: '1px solid #1e293b', textAlign: 'right' }}>Debit (Dr.)</th>
                                <th style={{ padding: '8px 12px', border: '1px solid #1e293b', textAlign: 'right' }}>Credit (Cr.)</th>
                                <th style={{ padding: '8px 12px', border: '1px solid #1e293b', textAlign: 'right' }}>Running Bal</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(() => {
                                interface PrintLedgerEvent {
                                    date: Date;
                                    dateStr: string;
                                    description: string;
                                    receiptNo: string;
                                    type: string;
                                    debit: number;
                                    credit: number;
                                    discount: number;
                                }
                                
                                const events: PrintLedgerEvent[] = [];

                                if (studentLedger.summary?.previousSessionDue > 0) {
                                    events.push({
                                        date: new Date('2024-04-01T00:00:00.000Z'),
                                        dateStr: '01/04/2024',
                                        description: 'Previous Academic Session Pending Dues (Opening Balance)',
                                        receiptNo: '-',
                                        type: 'Opening Dues',
                                        debit: studentLedger.summary?.previousSessionDue,
                                        credit: 0,
                                        discount: 0
                                    });
                                }

                                studentLedger.oneTimeStatus?.forEach((ot: any) => {
                                    events.push({
                                        date: new Date('2024-04-01T00:01:00.000Z'),
                                        dateStr: '01/04/2024',
                                        description: `Billed: ${ot.name}`,
                                        receiptNo: '-',
                                        type: 'One-Time Fee',
                                        debit: ot.amount,
                                        credit: 0,
                                        discount: 0
                                    });
                                });

                                const months = ['April','May','June','July','August','September','October','November','December','January','February','March'];
                                const struct = feeStructure.find((s: any) => s.className === studentLedger.student?.className);
                                const regularMonthlyFee = feeHeads.filter((h: any) => h.type === 'Monthly' && (struct?.fees?.[h.name] || 0) > 0);
                                
                                months.forEach((m, mIndex) => {
                                    const year = mIndex < 9 ? 2024 : 2025;
                                    const monthNumber = mIndex < 9 ? mIndex + 3 : mIndex - 9;
                                    const billingDate = new Date(year, monthNumber, 1);
                                    
                                    regularMonthlyFee.forEach((f: any) => {
                                        const amount = studentLedger.student?.isRT ? 0 : (struct?.fees?.[f.name] || 0);
                                        if (amount > 0) {
                                            events.push({
                                                date: billingDate,
                                                dateStr: `01/${(monthNumber + 1).toString().padStart(2, '0')}/${year}`,
                                                description: `Billed: Monthly ${f.name} (${m})`,
                                                receiptNo: '-',
                                                type: 'Monthly Fee',
                                                debit: amount,
                                                credit: 0,
                                                discount: 0
                                            });
                                        }
                                    });

                                    if (studentLedger.student?.transportFare > 0) {
                                        events.push({
                                            date: new Date(year, monthNumber, 1, 0, 1),
                                            dateStr: `01/${(monthNumber + 1).toString().padStart(2, '0')}/${year}`,
                                            description: `Billed: Monthly Transport Fare (${m})`,
                                            receiptNo: '-',
                                            type: 'Transport Fee',
                                            debit: studentLedger.student?.transportFare,
                                            credit: 0,
                                            discount: 0
                                        });
                                    }
                                });

                                studentLedger.payments?.forEach((p: any) => {
                                    const payDate = new Date(p.paymentDate);
                                    const day = payDate.getDate().toString().padStart(2, '0');
                                    const month = (payDate.getMonth() + 1).toString().padStart(2, '0');
                                    const yr = payDate.getFullYear();
                                    
                                    events.push({
                                        date: payDate,
                                        dateStr: `${day}/${month}/${yr}`,
                                        description: `Payment Received | Mode: ${p.paymentMode || 'Cash'} ${p.remark ? `(${p.remark})` : ''}`,
                                        receiptNo: p.receiptNo || 'N/A',
                                        type: 'Receipt Credit',
                                        debit: 0,
                                        credit: p.amountPaid || 0,
                                        discount: p.discount || 0
                                    });
                                });

                                events.sort((a, b) => a.date.getTime() - b.date.getTime());

                                let runningBal = 0;
                                return events.map((evt, idx) => {
                                    runningBal += evt.debit - evt.credit - evt.discount;
                                    const isPaidRow = evt.credit > 0;
                                    
                                    return (
                                        <tr key={idx} style={{ backgroundColor: isPaidRow ? '#f0fdf4' : idx % 2 === 0 ? '#f8fafc' : 'white', borderBottom: '1px solid #e2e8f0' }}>
                                            <td style={{ padding: '8px 12px', border: '1px solid #e2e8f0' }}>{evt.dateStr}</td>
                                            <td style={{ padding: '8px 12px', border: '1px solid #e2e8f0', fontWeight: isPaidRow ? '600' : 'normal' }}>{evt.description}</td>
                                            <td style={{ padding: '8px 12px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: '500' }}>{evt.receiptNo}</td>
                                            <td style={{ padding: '8px 12px', border: '1px solid #e2e8f0', color: '#64748b' }}>{evt.type}</td>
                                            <td style={{ padding: '8px 12px', border: '1px solid #e2e8f0', textAlign: 'right', fontWeight: '500' }}>{evt.debit > 0 ? `₹${evt.debit.toLocaleString()}` : '-'}</td>
                                            <td style={{ padding: '8px 12px', border: '1px solid #e2e8f0', textAlign: 'right', fontWeight: '600', color: '#15803d' }}>{evt.credit > 0 ? `₹${evt.credit.toLocaleString()}` : evt.discount > 0 ? `₹${evt.discount.toLocaleString()} (Disc)` : '-'}</td>
                                            <td style={{ padding: '8px 12px', border: '1px solid #e2e8f0', textAlign: 'right', fontWeight: '700', color: runningBal > 0 ? '#b91c1c' : '#15803d' }}>₹{runningBal.toLocaleString()}</td>
                                        </tr>
                                    );
                                });
                            })()}
                        </tbody>
                    </table>

                    {/* Footer Disclaimer & Signatures */}
                    <div style={{ marginTop: '3.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '0.8rem' }}>
                        <div>
                            <p style={{ color: '#64748b', fontStyle: 'italic', margin: 0 }}>* This is a system-generated official account ledger statement and does not require a physical signature.</p>
                        </div>
                        <div style={{ textAlign: 'center', borderTop: '1px solid #94a3b8', width: '220px', paddingTop: '8px' }}>
                            <strong style={{ color: '#1e293b' }}>Authorized Signatory</strong>
                        </div>
                    </div>
                </div>
            )}

            {dueView === 'general' ? (
                <div id="dues-report-print-overlay" style={{ display: 'none', backgroundColor: '#fff', padding: '2rem', width: '297mm', minHeight: '210mm', color: '#1e293b', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #1e293b', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                        <div>
                            <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#1e293b', margin: 0, textTransform: 'uppercase' }}>BIPS SENIOR SECONDARY SCHOOL</h1>
                            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '2px 0 0 0', fontWeight: '500' }}>OFFICIAL FEES OUTSTANDING REPORT</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Generated on: {new Date().toLocaleString('en-GB')}</div>
                            <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>Academic Session: {localStorage.getItem('activeSession') || '2024-2025'}</div>
                        </div>
                    </div>

                    {/* Applied Filters Info & Summary Metrics */}
                    {(() => {
                        const effectiveMonth = dueCalculationMode === 'cumulative' ? getCurrentAcademicMonth() : dueMonthFilter;
                        const allAcademicMonths = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];
                        const targetIdx = allAcademicMonths.indexOf(effectiveMonth);
                        const monthsList = targetIdx !== -1 ? allAcademicMonths.slice(0, targetIdx + 1) : allAcademicMonths.slice(0, 5);
                        const filtered = getFilteredDues(dueFees);

                        let totalExpected = 0;
                        let totalPaid = 0;
                        let totalPending = 0;

                        if (dueFeeTypeFilter === 'One-time Only') {
                            totalExpected = filtered.reduce((s: number, f: any) => s + (f.isRT ? 0 : (f.expectedOneTime || 0)), 0);
                            totalPaid = filtered.reduce((s: number, f: any) => s + (f.actualOneTimePaid || 0), 0);
                            totalPending = filtered.reduce((s: number, f: any) => s + Math.max(0, (f.isRT ? 0 : (f.expectedOneTime || 0)) - (f.actualOneTimePaid || 0)), 0);
                        } else if (dueCalculationMode === 'cumulative') {
                            const totalPrev = filtered.reduce((s: number, f: any) => s + Math.max(0, (f.previousSessionDue || 0) - (f.actualPrevDuesPaid || 0)), 0);
                            const totalMonthlyCumulative = filtered.reduce((s: number, f: any) => s + calculateDynamicDues(f, effectiveMonth).totalCumulativeDueTillMonth, 0);
                            totalExpected = filtered.reduce((s: number, f: any) => s + (f.isRT ? 0 : (f.monthlyFeeAmount || 0)) * monthsList.length + (f.previousSessionDue || 0), 0);
                            totalPaid = filtered.reduce((s: number, f: any) => s + (f.actualMonthlyPaid || 0) + (f.actualPrevDuesPaid || 0), 0);
                            totalPending = totalPrev + totalMonthlyCumulative;
                        } else if (effectiveMonth !== 'All') {
                            totalExpected = filtered.reduce((s: number, f: any) => s + (f.isRT ? 0 : (f.monthlyFeeAmount || 0)), 0);
                            totalPaid = filtered.reduce((s: number, f: any) => s + calculateDynamicDues(f, effectiveMonth).selectedMonthPaid, 0);
                            totalPending = filtered.reduce((s: number, f: any) => s + calculateDynamicDues(f, effectiveMonth).selectedMonthDue, 0);
                        } else {
                            filtered.forEach(f => {
                                const dyn = calculateDynamicDues(f, 'All');
                                if (dueFeeTypeFilter === 'Monthly Only') {
                                    totalExpected += dyn.fullSessionMonthlyExpected;
                                    totalPaid += f.actualMonthlyPaid || 0;
                                    totalPending += dyn.pendingMonthly;
                                } else {
                                    totalExpected += (f.previousSessionDue || 0) + dyn.expectedOneTime + dyn.fullSessionMonthlyExpected;
                                    totalPaid += (f.actualPrevDuesPaid || 0) + (f.actualOneTimePaid || 0) + (f.actualMonthlyPaid || 0);
                                    totalPending += dyn.totalPayableNow;
                                }
                            });
                        }

                        return (
                            <>
                                <div style={{ backgroundColor: '#f8fafc', padding: '1rem 1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', gap: '2rem', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                                    <div><span style={{ color: '#64748b', fontWeight: '500' }}>Class:</span> <strong style={{ color: '#1e293b' }}>{dueClassFilter}</strong></div>
                                    <div><span style={{ color: '#64748b', fontWeight: '500' }}>Month Filter:</span> <strong style={{ color: '#1e293b' }}>{dueCalculationMode === 'cumulative' ? `Carry Forward (Till ${effectiveMonth})` : dueMonthFilter === 'All' ? 'All Months (Full Session)' : dueMonthFilter}</strong></div>
                                    <div><span style={{ color: '#64748b', fontWeight: '500' }}>Student Type:</span> <strong style={{ color: '#1e293b' }}>{dueRtFilter === 'All' ? 'All Students' : dueRtFilter}</strong></div>
                                    <div><span style={{ color: '#64748b', fontWeight: '500' }}>Payment Status:</span> <strong style={{ color: '#1e293b' }}>{dueStatusFilter === 'All' ? 'All Statuses' : dueStatusFilter}</strong></div>
                                    <div><span style={{ color: '#64748b', fontWeight: '500' }}>Component:</span> <strong style={{ color: '#1e293b' }}>{dueFeeTypeFilter}</strong></div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                                    <div style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.75rem', textAlign: 'center', backgroundColor: '#f1f5f9' }}>
                                        <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', marginBottom: '2px' }}>Filtered Students</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#1e293b' }}>{filtered.length} Students</div>
                                    </div>
                                    <div style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.75rem', textAlign: 'center', backgroundColor: '#f8fafc' }}>
                                        <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', marginBottom: '2px' }}>{dueCalculationMode === 'cumulative' ? `Expected (Till ${effectiveMonth.slice(0, 3)})` : dueMonthFilter !== 'All' ? 'Month Expected' : 'Session Expected'}</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#1e293b' }}>₹{totalExpected.toLocaleString()}</div>
                                    </div>
                                    <div style={{ border: '1px solid #bbf7d0', borderRadius: '6px', padding: '0.75rem', textAlign: 'center', backgroundColor: '#f0fdf4' }}>
                                        <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#166534', textTransform: 'uppercase', marginBottom: '2px' }}>Total Collected</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#166534' }}>₹{totalPaid.toLocaleString()}</div>
                                    </div>
                                    <div style={{ border: '1px solid #fecaca', borderRadius: '6px', padding: '0.75rem', textAlign: 'center', backgroundColor: '#fef2f2' }}>
                                        <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#991b1b', textTransform: 'uppercase', marginBottom: '2px' }}>Dues (Till Date)</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#991b1b' }}>₹{totalPending.toLocaleString()}</div>
                                    </div>
                                </div>

                                {/* Table */}
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.7rem' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#1e293b', color: 'white', textAlign: 'left' }}>
                                            <th style={{ padding: '6px 6px', border: '1px solid #cbd5e1', width: '30px', textAlign: 'center' }}>S.No.</th>
                                            <th style={{ padding: '6px 6px', border: '1px solid #cbd5e1' }}>Student Name</th>
                                            <th style={{ padding: '6px 6px', border: '1px solid #cbd5e1', width: '85px', textAlign: 'center' }}>Adm No</th>
                                            <th style={{ padding: '6px 6px', border: '1px solid #cbd5e1' }}>Father's Name</th>
                                            <th style={{ padding: '6px 6px', border: '1px solid #cbd5e1', width: '70px', textAlign: 'center' }}>Class</th>
                                            {dueFeeTypeFilter === 'One-time Only' ? (
                                                <>
                                                    <th style={{ padding: '6px 6px', border: '1px solid #cbd5e1', width: '95px', textAlign: 'right' }}>One-Time Expected (₹)</th>
                                                    <th style={{ padding: '6px 6px', border: '1px solid #cbd5e1', width: '95px', textAlign: 'right' }}>One-Time Paid (₹)</th>
                                                    <th style={{ padding: '6px 6px', border: '1px solid #cbd5e1', width: '95px', textAlign: 'right' }}>One-Time Balance (₹)</th>
                                                </>
                                            ) : dueCalculationMode === 'cumulative' ? (
                                                <>
                                                    <th style={{ padding: '6px 6px', border: '1px solid #cbd5e1', textAlign: 'right' }}>Previous Session Dues (₹)</th>
                                                    {monthsList.map(m => (
                                                        <th key={m} style={{ padding: '6px 6px', border: '1px solid #cbd5e1', textAlign: 'right' }}>{m.slice(0, 3)} (₹)</th>
                                                    ))}
                                                    <th style={{ padding: '6px 6px', border: '1px solid #cbd5e1', textAlign: 'right', fontWeight: '800' }}>Total Due Till {effectiveMonth.slice(0, 3)} (₹)</th>
                                                </>
                                            ) : dueMonthFilter !== 'All' ? (
                                                <>
                                                    <th style={{ padding: '6px 6px', border: '1px solid #cbd5e1', width: '90px', textAlign: 'right' }}>{dueMonthFilter.slice(0, 3)} Expected (₹)</th>
                                                    <th style={{ padding: '6px 6px', border: '1px solid #cbd5e1', width: '90px', textAlign: 'right' }}>{dueMonthFilter.slice(0, 3)} Paid (₹)</th>
                                                    <th style={{ padding: '6px 6px', border: '1px solid #cbd5e1', width: '90px', textAlign: 'right' }}>{dueMonthFilter.slice(0, 3)} Balance (₹)</th>
                                                </>
                                            ) : (
                                                <>
                                                    <th style={{ padding: '6px 6px', border: '1px solid #cbd5e1', width: '95px', textAlign: 'right' }}>Session Exp (12m) (₹)</th>
                                                    <th style={{ padding: '6px 6px', border: '1px solid #cbd5e1', width: '95px', textAlign: 'right' }}>Expected (Till Date) (₹)</th>
                                                    <th style={{ padding: '6px 6px', border: '1px solid #cbd5e1', width: '85px', textAlign: 'right' }}>Total Paid (₹)</th>
                                                    <th style={{ padding: '6px 6px', border: '1px solid #cbd5e1', width: '95px', textAlign: 'right' }}>Dues (Till Date) (₹)</th>
                                                </>
                                            )}
                                            <th style={{ padding: '6px 6px', border: '1px solid #cbd5e1', textAlign: 'center' }}>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.map((fee, idx) => {
                                            const dyn = calculateDynamicDues(fee, effectiveMonth);

                                            if (dueFeeTypeFilter === 'One-time Only') {
                                                const expectedVal = fee.isRT ? 0 : (fee.expectedOneTime || 0);
                                                const paidVal = fee.actualOneTimePaid || 0;
                                                const pendingVal = Math.max(0, expectedVal - paidVal);

                                                let statusText = "Pending";
                                                let statusColor = "#b91c1c";

                                                if (expectedVal === 0) {
                                                    statusText = fee.isRT ? "RT Student" : "No Fee Assigned";
                                                    statusColor = "#15803d";
                                                } else if (paidVal >= expectedVal) {
                                                    statusText = "Paid";
                                                    statusColor = "#15803d";
                                                } else if (paidVal > 0) {
                                                    statusText = "Partially Paid";
                                                    statusColor = "#b45309";
                                                }

                                                return (
                                                    <tr key={fee.id} style={{ backgroundColor: idx % 2 === 0 ? '#f8fafc' : 'white', borderBottom: '1px solid #cbd5e1' }}>
                                                        <td style={{ padding: '6px 6px', border: '1px solid #cbd5e1', textAlign: 'center' }}>{idx + 1}</td>
                                                        <td style={{ padding: '6px 6px', border: '1px solid #cbd5e1', fontWeight: '600' }}>{fee.studentName}</td>
                                                        <td style={{ padding: '6px 6px', border: '1px solid #cbd5e1', textAlign: 'center' }}>{fee.admissionNo}</td>
                                                        <td style={{ padding: '6px 6px', border: '1px solid #cbd5e1' }}>{fee.fatherName || 'N/A'}</td>
                                                        <td style={{ padding: '6px 6px', border: '1px solid #cbd5e1', textAlign: 'center' }}>{fee.className}</td>
                                                        <td style={{ padding: '6px 6px', border: '1px solid #cbd5e1', textAlign: 'right' }}>{expectedVal.toLocaleString()}</td>
                                                        <td style={{ padding: '6px 6px', border: '1px solid #cbd5e1', textAlign: 'right', color: '#15803d', fontWeight: '500' }}>{paidVal.toLocaleString()}</td>
                                                        <td style={{ padding: '6px 6px', border: '1px solid #cbd5e1', textAlign: 'right', color: pendingVal > 0 ? '#b91c1c' : '#15803d', fontWeight: '700' }}>{pendingVal.toLocaleString()}</td>
                                                        <td style={{ padding: '6px 6px', border: '1px solid #cbd5e1', textAlign: 'center', color: statusColor, fontWeight: '700' }}>{statusText}</td>
                                                    </tr>
                                                );
                                            } else if (dueCalculationMode === 'cumulative') {
                                                const monthlyRate = fee.isRT ? 0 : (fee.monthlyFeeAmount || 0);
                                                const prevDue = Math.max(0, (fee.previousSessionDue || 0) - (fee.actualPrevDuesPaid || 0));
                                                const totalDue = prevDue + dyn.totalCumulativeDueTillMonth;

                                                let statusText = "Unpaid";
                                                let statusColor = "#b91c1c";

                                                if (monthlyRate === 0 && prevDue === 0) {
                                                    statusText = fee.isRT ? "RT Student" : "No Fee Assigned";
                                                    statusColor = "#15803d";
                                                } else if (totalDue === 0) {
                                                    statusText = "Paid Till Date";
                                                    statusColor = "#15803d";
                                                } else if ((fee.actualMonthlyPaid || 0) > 0 || (fee.actualPrevDuesPaid || 0) > 0) {
                                                    statusText = "Partially Paid";
                                                    statusColor = "#b45309";
                                                }

                                                return (
                                                    <tr key={fee.id} style={{ backgroundColor: idx % 2 === 0 ? '#f8fafc' : 'white', borderBottom: '1px solid #cbd5e1' }}>
                                                        <td style={{ padding: '6px 6px', border: '1px solid #cbd5e1', textAlign: 'center' }}>{idx + 1}</td>
                                                        <td style={{ padding: '6px 6px', border: '1px solid #cbd5e1', fontWeight: '600' }}>{fee.studentName}</td>
                                                        <td style={{ padding: '6px 6px', border: '1px solid #cbd5e1', textAlign: 'center' }}>{fee.admissionNo}</td>
                                                        <td style={{ padding: '6px 6px', border: '1px solid #cbd5e1' }}>{fee.fatherName || 'N/A'}</td>
                                                        <td style={{ padding: '6px 6px', border: '1px solid #cbd5e1', textAlign: 'center' }}>{fee.className}</td>
                                                        <td style={{ padding: '6px 6px', border: '1px solid #cbd5e1', textAlign: 'right', color: prevDue > 0 ? '#b91c1c' : '#15803d', fontWeight: prevDue > 0 ? '700' : 'normal' }}>₹{prevDue.toLocaleString('en-IN')}</td>
                                                        {monthsList.map(m => {
                                                            const rawPaid = fee.monthWisePaid?.[m] || 0;
                                                            const paid = Math.min(monthlyRate, rawPaid);
                                                            const due = Math.max(0, monthlyRate - paid);
                                                            return (
                                                                <td key={m} style={{ padding: '6px 6px', border: '1px solid #cbd5e1', textAlign: 'right', color: due > 0 ? '#b91c1c' : '#15803d', fontWeight: due > 0 ? '700' : 'normal' }}>
                                                                    ₹{due.toLocaleString('en-IN')}
                                                                </td>
                                                            );
                                                        })}
                                                        <td style={{ padding: '6px 6px', border: '1px solid #cbd5e1', textAlign: 'right', color: totalDue > 0 ? '#b91c1c' : '#15803d', fontWeight: '700' }}>₹{totalDue.toLocaleString('en-IN')}</td>
                                                        <td style={{ padding: '6px 6px', border: '1px solid #cbd5e1', textAlign: 'center', color: statusColor, fontWeight: '700' }}>{statusText}</td>
                                                    </tr>
                                                );
                                            } else if (dueMonthFilter !== 'All') {
                                                const expectedVal = fee.isRT ? 0 : (fee.monthlyFeeAmount || 0);
                                                const rawPaidVal = fee.monthWisePaid?.[dueMonthFilter] || 0;
                                                const paidVal = Math.min(expectedVal, rawPaidVal);
                                                const pendingVal = Math.max(0, expectedVal - paidVal);

                                                let statusText = "Pending";
                                                let statusColor = "#b91c1c";

                                                if (expectedVal === 0) {
                                                    statusText = fee.isRT ? "RT Student" : "No Fee Assigned";
                                                    statusColor = "#15803d";
                                                } else if (paidVal >= expectedVal) {
                                                    statusText = "Paid";
                                                    statusColor = "#15803d";
                                                } else if (paidVal > 0) {
                                                    statusText = "Partially Paid";
                                                    statusColor = "#b45309";
                                                }

                                                return (
                                                    <tr key={fee.id} style={{ backgroundColor: idx % 2 === 0 ? '#f8fafc' : 'white', borderBottom: '1px solid #cbd5e1' }}>
                                                        <td style={{ padding: '6px 6px', border: '1px solid #cbd5e1', textAlign: 'center' }}>{idx + 1}</td>
                                                        <td style={{ padding: '6px 6px', border: '1px solid #cbd5e1', fontWeight: '600' }}>{fee.studentName}</td>
                                                        <td style={{ padding: '6px 6px', border: '1px solid #cbd5e1', textAlign: 'center' }}>{fee.admissionNo}</td>
                                                        <td style={{ padding: '6px 6px', border: '1px solid #cbd5e1' }}>{fee.fatherName || 'N/A'}</td>
                                                        <td style={{ padding: '6px 6px', border: '1px solid #cbd5e1', textAlign: 'center' }}>{fee.className}</td>
                                                        <td style={{ padding: '6px 6px', border: '1px solid #cbd5e1', textAlign: 'right' }}>{expectedVal.toLocaleString()}</td>
                                                        <td style={{ padding: '6px 6px', border: '1px solid #cbd5e1', textAlign: 'right', color: '#15803d', fontWeight: '500' }}>{paidVal.toLocaleString()}</td>
                                                        <td style={{ padding: '6px 6px', border: '1px solid #cbd5e1', textAlign: 'right', color: pendingVal > 0 ? '#b91c1c' : '#15803d', fontWeight: '700' }}>{pendingVal.toLocaleString()}</td>
                                                        <td style={{ padding: '6px 6px', border: '1px solid #cbd5e1', textAlign: 'center', color: statusColor, fontWeight: '700' }}>{statusText}</td>
                                                    </tr>
                                                );
                                            } else {
                                                let sessionExpected = 0;
                                                let expectedTillNow = 0;
                                                let paidAmt = 0;
                                                let duesTillNow = 0;

                                                if (dueFeeTypeFilter === 'Monthly Only') {
                                                    sessionExpected = dyn.fullSessionMonthlyExpected;
                                                    expectedTillNow = dyn.cumulativeMonthlyExpected;
                                                    paidAmt = fee.actualMonthlyPaid || 0;
                                                    duesTillNow = dyn.pendingMonthly;
                                                } else {
                                                    sessionExpected = (fee.previousSessionDue || 0) + dyn.expectedOneTime + dyn.fullSessionMonthlyExpected;
                                                    expectedTillNow = (fee.previousSessionDue || 0) + dyn.expectedOneTime + dyn.cumulativeMonthlyExpected;
                                                    paidAmt = (fee.actualPrevDuesPaid || 0) + (fee.actualOneTimePaid || 0) + (fee.actualMonthlyPaid || 0);
                                                    duesTillNow = dyn.totalPayableNow;
                                                }

                                                let statusText = "Pending";
                                                let statusColor = "#b91c1c";

                                                if (sessionExpected === 0) {
                                                    statusText = fee.isRT ? "RT Student" : "No Fee Assigned";
                                                    statusColor = "#15803d";
                                                } else if (duesTillNow === 0) {
                                                    statusText = "Paid Till Date";
                                                    statusColor = "#15803d";
                                                } else if (paidAmt > 0) {
                                                    statusText = "Partially Paid";
                                                    statusColor = "#b45309";
                                                }

                                                return (
                                                    <tr key={fee.id} style={{ backgroundColor: idx % 2 === 0 ? '#f8fafc' : 'white', borderBottom: '1px solid #cbd5e1' }}>
                                                        <td style={{ padding: '6px 6px', border: '1px solid #cbd5e1', textAlign: 'center' }}>{idx + 1}</td>
                                                        <td style={{ padding: '6px 6px', border: '1px solid #cbd5e1', fontWeight: '600' }}>{fee.studentName}</td>
                                                        <td style={{ padding: '6px 6px', border: '1px solid #cbd5e1', textAlign: 'center' }}>{fee.admissionNo}</td>
                                                        <td style={{ padding: '6px 6px', border: '1px solid #cbd5e1' }}>{fee.fatherName || 'N/A'}</td>
                                                        <td style={{ padding: '6px 6px', border: '1px solid #cbd5e1', textAlign: 'center' }}>{fee.className}</td>
                                                        <td style={{ padding: '6px 6px', border: '1px solid #cbd5e1', textAlign: 'right' }}>{sessionExpected.toLocaleString()}</td>
                                                        <td style={{ padding: '6px 6px', border: '1px solid #cbd5e1', textAlign: 'right' }}>{expectedTillNow.toLocaleString()}</td>
                                                        <td style={{ padding: '6px 6px', border: '1px solid #cbd5e1', textAlign: 'right', color: '#15803d', fontWeight: '500' }}>{paidAmt.toLocaleString()}</td>
                                                        <td style={{ padding: '6px 6px', border: '1px solid #cbd5e1', textAlign: 'right', color: duesTillNow > 0 ? '#b91c1c' : '#15803d', fontWeight: '700' }}>{duesTillNow.toLocaleString()}</td>
                                                        <td style={{ padding: '6px 6px', border: '1px solid #cbd5e1', textAlign: 'center', color: statusColor, fontWeight: '700' }}>{statusText}</td>
                                                    </tr>
                                                );
                                            }
                                        })}
                                    </tbody>
                                </table>
                            </>
                        );
                    })()}

                    {/* Footer */}
                    <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#64748b' }}>
                        <div>* This is a system-generated official dues report.</div>
                        <div>Page 1 of 1</div>
                    </div>
                </div>
            ) : (
                <div id="transport-report-print-overlay" style={{ display: 'none', backgroundColor: '#fff', padding: '2rem', width: '297mm', minHeight: '210mm', color: '#1e293b', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #1e293b', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                        <div>
                            <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#1e293b', margin: 0, textTransform: 'uppercase' }}>BIPS SENIOR SECONDARY SCHOOL</h1>
                            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '2px 0 0 0', fontWeight: '500' }}>OFFICIAL TRANSPORT OUTSTANDING REPORT</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Generated on: {new Date().toLocaleString('en-GB')}</div>
                            <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>Academic Session: {localStorage.getItem('activeSession') || '2024-2025'}</div>
                        </div>
                    </div>

                    {/* Applied Filters Info */}
                    <div style={{ backgroundColor: '#f8fafc', padding: '1rem 1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', gap: '2rem', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                        <div><span style={{ color: '#64748b', fontWeight: '500' }}>Class:</span> <strong style={{ color: '#1e293b' }}>{dueClassFilter}</strong></div>
                        <div><span style={{ color: '#64748b', fontWeight: '500' }}>Student Type:</span> <strong style={{ color: '#1e293b' }}>{dueRtFilter === 'All' ? 'All Students' : dueRtFilter}</strong></div>
                        <div><span style={{ color: '#64748b', fontWeight: '500' }}>Payment Status:</span> <strong style={{ color: '#1e293b' }}>{dueStatusFilter === 'All' ? 'All Statuses' : dueStatusFilter}</strong></div>
                    </div>

                    {(() => {
                        const filtered = getFilteredTransportDues();
                        
                        const totalFare = filtered.reduce((s, d) => s + (d.monthlyFare || 0) * 12, 0);
                        const totalPaid = filtered.reduce((s, d) => s + (d.totalPaid || 0), 0);
                        const totalPending = filtered.reduce((s, d) => s + (d.pending || 0), 0);

                        return (
                            <>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                                    <div style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.75rem', textAlign: 'center', backgroundColor: '#f1f5f9' }}>
                                        <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', marginBottom: '2px' }}>Filtered Transport Users</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#1e293b' }}>{filtered.length} Students</div>
                                    </div>
                                    <div style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.75rem', textAlign: 'center', backgroundColor: '#f8fafc' }}>
                                        <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', marginBottom: '2px' }}>Expected (Year)</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#1e293b' }}>₹{totalFare.toLocaleString()}</div>
                                    </div>
                                    <div style={{ border: '1px solid #bbf7d0', borderRadius: '6px', padding: '0.75rem', textAlign: 'center', backgroundColor: '#f0fdf4' }}>
                                        <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#166534', textTransform: 'uppercase', marginBottom: '2px' }}>Collected (Net)</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#166534' }}>₹{totalPaid.toLocaleString()}</div>
                                    </div>
                                    <div style={{ border: '1px solid #fecaca', borderRadius: '6px', padding: '0.75rem', textAlign: 'center', backgroundColor: '#fef2f2' }}>
                                        <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#991b1b', textTransform: 'uppercase', marginBottom: '2px' }}>Outstanding</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#991b1b' }}>₹{totalPending.toLocaleString()}</div>
                                    </div>
                                </div>

                                {/* Table */}
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#1e293b', color: 'white', textAlign: 'left' }}>
                                            <th style={{ padding: '6px 8px', border: '1px solid #cbd5e1', width: '40px', textAlign: 'center' }}>S.No.</th>
                                            <th style={{ padding: '6px 8px', border: '1px solid #cbd5e1', width: '200px' }}>Student Name</th>
                                            <th style={{ padding: '6px 8px', border: '1px solid #cbd5e1', width: '130px' }}>Father's Name</th>
                                            <th style={{ padding: '6px 8px', border: '1px solid #cbd5e1', width: '100px' }}>Class</th>
                                            <th style={{ padding: '6px 8px', border: '1px solid #cbd5e1', width: '150px' }}>Stop Name</th>
                                            <th style={{ padding: '6px 8px', border: '1px solid #cbd5e1', width: '90px', textAlign: 'right' }}>Monthly Fare (₹)</th>
                                            <th style={{ padding: '6px 8px', border: '1px solid #cbd5e1', width: '95px', textAlign: 'right' }}>Collected (₹)</th>
                                            <th style={{ padding: '6px 8px', border: '1px solid #cbd5e1', width: '95px', textAlign: 'right' }}>Outstanding (₹)</th>
                                            <th style={{ padding: '6px 8px', border: '1px solid #cbd5e1' }}>Paid Months</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.map((d, idx) => (
                                            <tr key={d.id} style={{ backgroundColor: idx % 2 === 0 ? '#f8fafc' : 'white', borderBottom: '1px solid #cbd5e1' }}>
                                                <td style={{ padding: '6px 8px', border: '1px solid #cbd5e1', textAlign: 'center' }}>{idx + 1}</td>
                                                <td style={{ padding: '6px 8px', border: '1px solid #cbd5e1', fontWeight: '600' }}>{d.studentName}</td>
                                                <td style={{ padding: '6px 8px', border: '1px solid #cbd5e1' }}>{d.fatherName || 'N/A'}</td>
                                                <td style={{ padding: '6px 8px', border: '1px solid #cbd5e1' }}>{d.className}</td>
                                                <td style={{ padding: '6px 8px', border: '1px solid #cbd5e1' }}>{d.stopName}</td>
                                                <td style={{ padding: '6px 8px', border: '1px solid #cbd5e1', textAlign: 'right' }}>{d.monthlyFare.toLocaleString()}</td>
                                                <td style={{ padding: '6px 8px', border: '1px solid #cbd5e1', textAlign: 'right', color: '#15803d', fontWeight: '500' }}>{d.totalPaid.toLocaleString()}</td>
                                                <td style={{ padding: '6px 8px', border: '1px solid #cbd5e1', textAlign: 'right', color: d.pending > 0 ? '#b91c1c' : '#15803d', fontWeight: '700' }}>{d.pending.toLocaleString()}</td>
                                                <td style={{ padding: '6px 8px', border: '1px solid #cbd5e1', color: '#475569', fontSize: '0.7rem' }}>{(d.paidMonths || []).join(', ') || 'None'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </>
                        );
                    })()}

                    {/* Footer */}
                    <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#64748b' }}>
                        <div>* This is a system-generated official transport dues report.</div>
                        <div>Page 1 of 1</div>
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    .no-print { display: none !important; }
                    body, html { 
                        background: white !important; 
                        margin: 0 !important; 
                        padding: 0 !important; 
                        height: auto !important;
                        overflow: visible !important;
                    }
                    body * { visibility: hidden; }
                    
                    /* Hide main screen area when printing statement or dues report */
                    body.printing-statement .no-print-area,
                    body.printing-dues-report .no-print-area {
                        display: none !important;
                    }

                    /* Page Settings based on active print layout */
                    body.printing-receipt {
                        @page { size: A4 landscape !important; margin: 0 !important; }
                    }
                    body.printing-statement {
                        @page { size: A4 portrait !important; margin: 10mm !important; }
                    }
                    body.printing-dues-report {
                        @page { size: A4 landscape !important; margin: 10mm !important; }
                    }
                    
                    /* Receipt Print Layout */
                    body.printing-receipt #receipt-modal-overlay,
                    body.printing-receipt #receipt-modal-overlay * {
                        visibility: visible !important;
                    }
                    body.printing-receipt #receipt-modal-overlay {
                        position: absolute !important;
                        top: 0 !important; left: 0 !important;
                        margin: 0 !important; padding: 0 !important;
                        display: flex !important;
                        background: transparent !important;
                        overflow: visible !important;
                        visibility: visible !important;
                    }
                    body.printing-receipt #printable-receipt-wrapper,
                    body.printing-receipt #printable-receipt-wrapper * {
                        visibility: visible !important;
                    }
                    body.printing-receipt #printable-receipt { 
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

                    /* Statement Print Layout */
                    body.printing-statement #statement-print-overlay,
                    body.printing-statement #statement-print-overlay * {
                        visibility: visible !important;
                    }
                    body.printing-statement #statement-print-overlay {
                        position: absolute !important;
                        top: 0 !important; left: 0 !important;
                        margin: 0 !important; padding: 0 !important;
                        display: block !important;
                        background: white !important;
                        overflow: visible !important;
                        visibility: visible !important;
                    }

                    /* Dues Report Print Layout */
                    body.printing-dues-report #dues-report-print-overlay,
                    body.printing-dues-report #dues-report-print-overlay * {
                        visibility: visible !important;
                    }
                    body.printing-dues-report #dues-report-print-overlay {
                        position: absolute !important;
                        top: 0 !important; left: 0 !important;
                        margin: 0 !important; padding: 0 !important;
                        display: block !important;
                        background: white !important;
                        overflow: visible !important;
                        visibility: visible !important;
                    }

                    /* Transport Report Print Layout */
                    body.printing-dues-report #transport-report-print-overlay,
                    body.printing-dues-report #transport-report-print-overlay * {
                        visibility: visible !important;
                    }
                    body.printing-dues-report #transport-report-print-overlay {
                        position: absolute !important;
                        top: 0 !important; left: 0 !important;
                        margin: 0 !important; padding: 0 !important;
                        display: block !important;
                        background: white !important;
                        overflow: visible !important;
                        visibility: visible !important;
                    }
                }
            ` }} />

            {/* Custom Modern In-App Alert Dialog */}
            {customAlert && customAlert.show && (
                <div 
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(15, 23, 42, 0.65)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 999999,
                        padding: '1.5rem',
                        animation: 'fadeIn 0.2s ease-out'
                    }}
                    onClick={() => setCustomAlert(null)}
                >
                    <div 
                        style={{
                            backgroundColor: '#ffffff',
                            borderRadius: '20px',
                            maxWidth: '480px',
                            width: '100%',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
                            overflow: 'hidden',
                            transform: 'translateY(0)',
                            animation: 'modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header with Type Accent */}
                        <div style={{
                            padding: '1.75rem 1.75rem 1rem 1.75rem',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '1rem'
                        }}>
                            <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '14px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                fontSize: '1.5rem',
                                backgroundColor: customAlert.type === 'warning' ? '#fef3c7' : customAlert.type === 'error' ? '#fee2e2' : customAlert.type === 'success' ? '#dcfce7' : '#e0e7ff',
                                color: customAlert.type === 'warning' ? '#d97706' : customAlert.type === 'error' ? '#dc2626' : customAlert.type === 'success' ? '#16a34a' : '#4338ca'
                            }}>
                                {customAlert.type === 'warning' ? '⚠️' : customAlert.type === 'error' ? '❌' : customAlert.type === 'success' ? '✅' : 'ℹ️'}
                            </div>
                            <div style={{ flex: 1 }}>
                                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                                    {customAlert.title}
                                </h3>
                                {customAlert.amount !== undefined && customAlert.amount > 0 && (
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#fef2f2', color: '#dc2626', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 800, marginTop: '0.4rem' }}>
                                        Outstanding Due: ₹{customAlert.amount.toLocaleString('en-IN')}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Body Message */}
                        <div style={{ padding: '0.5rem 1.75rem 1.5rem 1.75rem', color: '#475569', fontSize: '0.95rem', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
                            {customAlert.message}
                        </div>

                        {/* Footer Action Button */}
                        <div style={{
                            padding: '1rem 1.75rem 1.5rem 1.75rem',
                            backgroundColor: '#f8fafc',
                            borderTop: '1px solid #f1f5f9',
                            display: 'flex',
                            justifyContent: 'flex-end'
                        }}>
                            <button
                                onClick={() => setCustomAlert(null)}
                                autoFocus
                                style={{
                                    backgroundColor: customAlert.type === 'warning' ? '#d97706' : customAlert.type === 'error' ? '#dc2626' : customAlert.type === 'success' ? '#16a34a' : '#2563eb',
                                    color: '#ffffff',
                                    border: 'none',
                                    padding: '0.75rem 1.75rem',
                                    borderRadius: '10px',
                                    fontSize: '0.95rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                Understood, Proceed
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Transaction Details Modal */}
            {showTransactionDetailsModal && (
                <div 
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(15, 23, 42, 0.65)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 99999,
                        padding: '0.75rem',
                        animation: 'fadeIn 0.2s ease-out'
                    }}
                    onClick={() => setShowTransactionDetailsModal(false)}
                >
                    <div 
                        style={{
                            backgroundColor: '#ffffff',
                            borderRadius: '16px',
                            maxWidth: '98vw',
                            width: '98vw',
                            maxHeight: '96vh',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
                            overflow: 'hidden',
                            animation: 'modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div style={{ padding: '1rem 1.75rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                    <FileText size={24} color="#3b82f6" /> Student Transaction Details: <span style={{ color: '#2563eb' }}>{studentName}</span>
                                </h3>
                                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.35rem', fontSize: '0.85rem', color: '#64748b' }}>
                                    <span>Admission No: <strong style={{ color: '#1e293b' }}>{admissionNo}</strong></span>
                                    <span>Current Class: <strong style={{ color: '#1e293b' }}>{selectedClass}</strong></span>
                                    <span>Father's Name: <strong style={{ color: '#1e293b' }}>{fatherName}</strong></span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                {/* Summary KPIs */}
                                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                    <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', padding: '0.35rem 0.85rem', borderRadius: '8px', textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase' }}>Total Receipts</div>
                                        <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1e40af' }}>{studentHistory.length}</div>
                                    </div>
                                    <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '0.35rem 0.85rem', borderRadius: '8px', textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#15803d', textTransform: 'uppercase' }}>Total Paid</div>
                                        <div style={{ fontSize: '1rem', fontWeight: 800, color: '#166534' }}>
                                            ₹{studentHistory.reduce((s, r) => s + (r.paidAmount || 0), 0).toLocaleString()}
                                        </div>
                                    </div>
                                    {studentHistory.reduce((s, r) => s + (r.discount || 0), 0) > 0 && (
                                        <div style={{ backgroundColor: '#fff7ed', border: '1px solid #fed7aa', padding: '0.35rem 0.85rem', borderRadius: '8px', textAlign: 'center' }}>
                                            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#c2410c', textTransform: 'uppercase' }}>Total Discount</div>
                                            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#ea580c' }}>
                                                ₹{studentHistory.reduce((s, r) => s + (r.discount || 0), 0).toLocaleString()}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <button 
                                    onClick={() => setShowTransactionDetailsModal(false)}
                                    style={{ 
                                        border: 'none', 
                                        background: '#e2e8f0', 
                                        borderRadius: '50%', 
                                        width: '38px', 
                                        height: '38px', 
                                        cursor: 'pointer', 
                                        fontWeight: 800, 
                                        fontSize: '1.1rem', 
                                        color: '#475569',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: '0.2s'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#cbd5e1'}
                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                        
                        {/* Table Content */}
                        <div style={{ padding: '1rem 1.5rem', overflowY: 'auto', flex: 1 }}>
                            {studentHistory.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
                                    <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🧾</div>
                                    <h4 style={{ margin: 0, fontSize: '1.2rem', color: '#64748b' }}>No Transactions Found</h4>
                                    <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>No fee payment receipts have been recorded for this student in the current session.</p>
                                </div>
                            ) : (
                                <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left', borderBottom: '2px solid #cbd5e1' }}>
                                                <th style={{ padding: '0.65rem 0.85rem', fontSize: '0.75rem', color: '#334155', fontWeight: 800, whiteSpace: 'nowrap' }}>Receipt No</th>
                                                <th style={{ padding: '0.65rem 0.85rem', fontSize: '0.75rem', color: '#334155', fontWeight: 800, whiteSpace: 'nowrap' }}>Date</th>
                                                <th style={{ padding: '0.65rem 0.85rem', fontSize: '0.75rem', color: '#334155', fontWeight: 800 }}>Fee Heads / Months Covered</th>
                                                <th style={{ padding: '0.65rem 0.85rem', fontSize: '0.75rem', color: '#334155', fontWeight: 800, textAlign: 'right', whiteSpace: 'nowrap' }}>Total Fee</th>
                                                <th style={{ padding: '0.65rem 0.85rem', fontSize: '0.75rem', color: '#334155', fontWeight: 800, textAlign: 'right', whiteSpace: 'nowrap' }}>Discount</th>
                                                <th style={{ padding: '0.65rem 0.85rem', fontSize: '0.75rem', color: '#334155', fontWeight: 800, textAlign: 'right', whiteSpace: 'nowrap' }}>Amount Paid</th>
                                                <th style={{ padding: '0.65rem 0.85rem', fontSize: '0.75rem', color: '#334155', fontWeight: 800, textAlign: 'center', whiteSpace: 'nowrap' }}>Mode</th>
                                                <th style={{ padding: '0.65rem 0.85rem', fontSize: '0.75rem', color: '#334155', fontWeight: 800, textAlign: 'center', whiteSpace: 'nowrap' }}>Status</th>
                                                <th style={{ padding: '0.65rem 0.85rem', fontSize: '0.75rem', color: '#334155', fontWeight: 800, textAlign: 'center', whiteSpace: 'nowrap' }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {studentHistory.map((rec, index) => {
                                                const isOnlinePay = (rec.paymentMode || '').toLowerCase().includes('payu') || (rec.paymentMode || '').toLowerCase().includes('online');
                                                
                                                return (
                                                    <tr 
                                                        key={rec.id} 
                                                        style={{ 
                                                            borderBottom: '1px solid #f1f5f9',
                                                            backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc',
                                                            transition: 'background 0.15s'
                                                        }}
                                                    >
                                                        <td style={{ padding: '0.65rem 0.85rem', fontWeight: 800, color: '#2563eb', whiteSpace: 'nowrap', fontSize: '0.82rem' }}>
                                                            {rec.receiptNo || 'N/A'}
                                                        </td>
                                                        <td style={{ padding: '0.65rem 0.85rem', fontSize: '0.8rem', color: '#475569', whiteSpace: 'nowrap' }}>
                                                            {rec.date}
                                                        </td>
                                                        <td style={{ padding: '0.65rem 0.85rem', fontSize: '0.82rem', color: '#1e293b' }}>
                                                            {rec.feeHead && rec.feeHead.includes('==>') ? (
                                                                <div>
                                                                    <div style={{ fontWeight: 700, color: '#4f46e5', fontSize: '0.78rem' }}>
                                                                        📅 {rec.feeHead.split('==>')[0].trim() || rec.month || 'Selected Months'}
                                                                    </div>
                                                                    <div style={{ color: '#475569', fontSize: '0.78rem', marginTop: '1px' }}>
                                                                        {rec.feeHead.split('==>')[1].trim()}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <span style={{ fontWeight: 600 }}>{rec.feeHead || rec.month || 'Monthly Fee'}</span>
                                                            )}
                                                        </td>
                                                        <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                                                            ₹{(rec.totalFee || rec.paidAmount || 0).toLocaleString()}
                                                        </td>
                                                        <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', color: (rec.discount || 0) > 0 ? '#ea580c' : '#94a3b8', fontWeight: 700, whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                                                            {(rec.discount || 0) > 0 ? `-₹${(rec.discount || 0).toLocaleString()}` : '-'}
                                                        </td>
                                                        <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', fontWeight: 900, color: '#16a34a', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                                                            ₹{(rec.paidAmount || 0).toLocaleString()}
                                                        </td>
                                                        <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                            <span style={{ 
                                                                fontSize: '0.72rem', 
                                                                fontWeight: 700, 
                                                                padding: '0.2rem 0.55rem', 
                                                                borderRadius: '6px',
                                                                backgroundColor: isOnlinePay ? '#ecfdf5' : '#f1f5f9',
                                                                color: isOnlinePay ? '#047857' : '#334155',
                                                                border: `1px solid ${isOnlinePay ? '#a7f3d0' : '#cbd5e1'}`
                                                            }}>
                                                                {isOnlinePay ? '💳 PayU' : '💵 Cash'}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                            <span style={{
                                                                fontSize: '0.68rem',
                                                                fontWeight: 800,
                                                                padding: '0.2rem 0.55rem',
                                                                borderRadius: '10px',
                                                                backgroundColor: rec.status === 'APPROVED' ? '#dcfce7' : rec.status === 'PENDING' ? '#fef9c3' : '#fee2e2',
                                                                color: rec.status === 'APPROVED' ? '#166534' : rec.status === 'PENDING' ? '#854d0e' : '#991b1b',
                                                                border: `1px solid ${rec.status === 'APPROVED' ? '#86efac' : rec.status === 'PENDING' ? '#fde047' : '#fca5a5'}`,
                                                                textTransform: 'uppercase'
                                                            }}>
                                                                {rec.status === 'APPROVED' ? '✓ Approved' : rec.status === 'PENDING' ? '⏳ Pending' : '✕ Rejected'}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                            <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => { setSelectedReceipt(rec); setShowReceipt(true); }}
                                                                    style={{ 
                                                                        backgroundColor: '#2563eb', 
                                                                        color: 'white', 
                                                                        border: 'none', 
                                                                        padding: '0.3rem 0.75rem', 
                                                                        borderRadius: '6px', 
                                                                        fontSize: '0.72rem', 
                                                                        fontWeight: 700, 
                                                                        cursor: 'pointer',
                                                                        boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
                                                                    }}
                                                                >
                                                                    👁️ View Receipt
                                                                </button>
                                                                {rec.status === 'REJECTED' && (
                                                                    <button 
                                                                        type="button"
                                                                        onClick={() => handleRetryPayment(rec)}
                                                                        style={{ 
                                                                            backgroundColor: '#047857', 
                                                                            color: 'white', 
                                                                            border: 'none', 
                                                                            padding: '0.3rem 0.65rem', 
                                                                            borderRadius: '6px', 
                                                                            fontSize: '0.72rem', 
                                                                            fontWeight: 700, 
                                                                            cursor: 'pointer',
                                                                            boxShadow: '0 2px 4px rgba(4, 120, 87, 0.2)'
                                                                        }}
                                                                    >
                                                                        💳 Retry
                                                                    </button>
                                                                )}
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
                    </div>
                </div>
            )}

            {/* Modern In-App Alert Modal */}
            {customAlert && customAlert.show && (
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
                    onClick={() => setCustomAlert(null)}
                >
                    <div 
                        style={{
                            backgroundColor: '#ffffff',
                            borderRadius: '16px',
                            maxWidth: '540px',
                            width: '100%',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
                            overflow: 'hidden',
                            animation: 'modalSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{
                            padding: '1.25rem 1.5rem',
                            backgroundColor: customAlert.type === 'error' ? '#fef2f2' : customAlert.type === 'warning' ? '#fffbeb' : '#eff6ff',
                            borderBottom: `1px solid ${customAlert.type === 'error' ? '#fecaca' : customAlert.type === 'warning' ? '#fde68a' : '#bfdbfe'}`,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem'
                        }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '10px',
                                backgroundColor: customAlert.type === 'error' ? '#fee2e2' : customAlert.type === 'warning' ? '#fef3c7' : '#dbeafe',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: customAlert.type === 'error' ? '#dc2626' : customAlert.type === 'warning' ? '#d97706' : '#2563eb',
                                fontSize: '1.4rem'
                            }}>
                                ⚠️
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>
                                    {customAlert.title}
                                </h3>
                                {customAlert.amount !== undefined && customAlert.amount > 0 && (
                                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#dc2626', backgroundColor: '#fee2e2', padding: '0.15rem 0.5rem', borderRadius: '6px', marginTop: '0.25rem', display: 'inline-block' }}>
                                        Due Amount: ₹{customAlert.amount.toLocaleString()}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div style={{ padding: '1.5rem', maxHeight: '60vh', overflowY: 'auto' }}>
                            <div style={{ 
                                whiteSpace: 'pre-line', 
                                color: '#334155', 
                                fontSize: '0.92rem', 
                                lineHeight: '1.6',
                                fontWeight: 500
                            }}>
                                {customAlert.message}
                            </div>
                        </div>

                        <div style={{ padding: '1rem 1.5rem', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                type="button"
                                onClick={() => setCustomAlert(null)}
                                style={{
                                    backgroundColor: customAlert.type === 'error' ? '#dc2626' : '#2563eb',
                                    color: 'white',
                                    border: 'none',
                                    padding: '0.6rem 1.5rem',
                                    borderRadius: '8px',
                                    fontWeight: 700,
                                    fontSize: '0.9rem',
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                }}
                            >
                                Understood / OK
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Fees;
