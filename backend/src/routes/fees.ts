import express from 'express';
import prisma from '../lib/prisma';
import { getExpectedFeeAmount } from '../lib/feeUtils';
import { getCache, setCache, invalidateCache } from '../lib/cache';

const router = express.Router();

function isPaymentInAcademicYear(p: any, academicYear: string | null): boolean {
    if (!academicYear) return true; // fallback if no academic year set
    const parts = academicYear.split('-');
    if (parts.length !== 2) return true;
    let startYear = parts[0]; // e.g. "2024"
    let endYear = parts[1];   // e.g. "2025" or "25"
    
    if (startYear.length === 2) startYear = `20${startYear}`;
    if (endYear.length === 2) endYear = `20${endYear}`;

    const month = p.month || '';
    const year = p.year || '';

    // Previous dues payments are made during the current session to clear previous session dues.
    // So the paymentDate falls within the current session date range: [April 1st startYear, March 31st endYear].
    const pDate = new Date(p.paymentDate);
    const startSessionDate = new Date(parseInt(startYear), 3, 1); // April 1st
    const endSessionDate = new Date(parseInt(endYear), 2, 31, 23, 59, 59); // March 31st
    const isWithinDateRange = pDate >= startSessionDate && pDate <= endSessionDate;

    if (p.feeHead && p.feeHead.toLowerCase().includes('previous dues')) {
        return isWithinDateRange;
    }

    // For standard monthly / transport / one-time fees, we match by month & year.
    const springMonths = ['January', 'February', 'March'];
    const autumnMonths = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    if (springMonths.includes(month)) {
        return year === endYear;
    }
    if (autumnMonths.includes(month)) {
        return year === startYear;
    }

    return isWithinDateRange;
}


interface ParsedItem {
    name: string;
    amount: number;
    months: string[];
    isMonthly: boolean;
    isOneTime: boolean;
    isTransport: boolean;
    isPreviousDues: boolean;
}

function parsePaymentBreakdown(feeHead: string | null, month: string | null, amountPaid: number, discount: number, feeHeadsList: any[]): ParsedItem[] {
    const totalAmount = Math.round(amountPaid + discount);
    if (!feeHead) {
        return [];
    }

    const items: ParsedItem[] = [];

    if (feeHead.includes('==>') || feeHead.includes('||') || feeHead.includes(':')) {
        let monthsStr = "";
        let breakdownStr = feeHead;

        if (feeHead.includes('==>')) {
            const parts = feeHead.split('==>');
            monthsStr = parts[0].trim();
            breakdownStr = parts[1].trim();
        }

        const paidMonths = monthsStr ? monthsStr.split(',').map(m => m.trim()).filter(Boolean) : [];
        const itemParts = breakdownStr.split('||').map(item => item.trim()).filter(Boolean);

        // First pass: parse items and compute sum of breakdown amounts
        let sumOfBreakdown = 0;
        const tempItems: { name: string; amt: number }[] = [];
        itemParts.forEach(itemPart => {
            const splitColon = itemPart.split(':');
            if (splitColon.length >= 2) {
                const name = splitColon[0].trim();
                const amt = parseFloat(splitColon[1].trim()) || 0;
                tempItems.push({ name, amt });
                sumOfBreakdown += amt;
            } else {
                const name = itemPart.trim();
                tempItems.push({ name, amt: totalAmount });
                sumOfBreakdown += totalAmount;
            }
        });

        // Calculate scaling factor if there's a mismatch
        const factor = sumOfBreakdown > 0 ? (totalAmount / sumOfBreakdown) : 1;

        let currentSum = 0;
        tempItems.forEach(tempItem => {
            const { name, amt } = tempItem;
            const scaledAmt = Math.round(amt * factor);
            currentSum += scaledAmt;
            const nameLower = name.toLowerCase();

            const isPreviousDues = nameLower === 'previous dues';
            const isTransport = nameLower.includes('transport') || nameLower.includes('bus');
            
            // Find matching head object
            const headObj = feeHeadsList.find(h => {
                const hName = h.name.toLowerCase();
                return nameLower.startsWith(hName) || hName.startsWith(nameLower);
            });
            const isMonthly = isTransport || (headObj ? headObj.type === 'Monthly' : true);
            const isOneTime = headObj ? (headObj.type === 'One-time' || headObj.type === 'Annual' || headObj.type === 'Other') : false;

            items.push({
                name,
                amount: scaledAmt,
                months: isMonthly ? paidMonths : [],
                isMonthly,
                isOneTime,
                isTransport,
                isPreviousDues
            });
        });

        // Adjust for any rounding difference
        const diff = totalAmount - currentSum;
        if (diff !== 0 && items.length > 0) {
            let maxItemIdx = 0;
            let maxAmt = -1;
            items.forEach((item, idx) => {
                if (item.amount > maxAmt) {
                    maxAmt = item.amount;
                    maxItemIdx = idx;
                }
            });
            items[maxItemIdx].amount += diff;
        }
    } else {
        const name = feeHead.trim();
        const nameLower = name.toLowerCase();
        const paidMonths = month ? month.split(',').map(m => m.trim()).filter(Boolean) : [];

        const isPreviousDues = nameLower === 'previous dues';
        const isTransport = nameLower.includes('transport') || nameLower.includes('bus');

        const headObj = feeHeadsList.find(h => {
            const hName = h.name.toLowerCase();
            return nameLower.startsWith(hName) || hName.startsWith(nameLower);
        });
        const isMonthly = isTransport || (headObj ? headObj.type === 'Monthly' : true);
        const isOneTime = headObj ? (headObj.type === 'One-time' || headObj.type === 'Annual' || headObj.type === 'Other') : false;

        items.push({
            name,
            amount: totalAmount,
            months: isMonthly ? paidMonths : [],
            isMonthly,
            isOneTime,
            isTransport,
            isPreviousDues
        });
    }

    return items;
}

async function getStudentFeeLedger(studentId: string) {
    const student = await prisma.studentProfile.findUnique({
        where: { id: studentId },
        include: { class: true, transportStop: true, user: true }
    });
    if (!student) {
        throw new Error('Student not found');
    }

    const feeHeads = await prisma.feeHead.findMany();
    const allPayments = await prisma.feePayment.findMany({
        where: { studentId, status: 'APPROVED' }
    });
    const payments = allPayments.filter(p => isPaymentInAcademicYear(p, student.academicYear));

    const structure: any = student.class?.feeStructure || {};

    const allMonths = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];
    
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const sessionStartMonth = 3; // April
    let monthsToCalculate = 0;
    if (currentMonth >= sessionStartMonth) {
        monthsToCalculate = (currentMonth - sessionStartMonth) + 1;
    } else {
        monthsToCalculate = (currentMonth + 12 - sessionStartMonth) + 1;
    }
    monthsToCalculate = Math.min(12, Math.max(1, monthsToCalculate));
    const elapsedMonths = allMonths.slice(0, monthsToCalculate);

    // Billed One-Time Heads
    const oneTimeExpectedBreakdown: { name: string; amount: number }[] = [];
    let expectedOneTimeTotal = 0;
    feeHeads.forEach(head => {
        if (head.type !== 'Monthly') {
            const amount = getExpectedFeeAmount(student, head, structure, student.class?.name);
            if (amount > 0) {
                expectedOneTimeTotal += amount;
                oneTimeExpectedBreakdown.push({ name: head.name, amount });
            }
        }
    });

    // Billed Monthly Heads per month
    const monthlyExpectedBreakdown: { name: string; amount: number }[] = [];
    let monthlyFeeAmountValue = 0;
    feeHeads.forEach(head => {
        if (head.type === 'Monthly') {
            const amount = getExpectedFeeAmount(student, head, structure, student.class?.name);
            if (amount > 0) {
                monthlyFeeAmountValue += amount;
                monthlyExpectedBreakdown.push({ name: head.name, amount });
            }
        }
    });

    const transportMonthlyFare = student.transportStop?.busFare || 0;

    let actualPrevDuesPaid = 0;
    let actualOneTimePaid = 0;
    let actualMonthlyPaid = 0;
    let actualTransportPaid = 0;

    const oneTimePaidForHead: Record<string, number> = {};
    const monthlyPaidForHeadAndMonth: Record<string, Record<string, number>> = {};
    const transportPaidForMonth: Record<string, number> = {};
    const monthWisePaid: Record<string, number> = {};

    payments.forEach(p => {
        const parsedItems = parsePaymentBreakdown(p.feeHead, p.month, p.amountPaid || 0, p.discount || 0, feeHeads);
        parsedItems.forEach(item => {
            if (item.isPreviousDues) {
                actualPrevDuesPaid += item.amount;
            } else if (item.isTransport) {
                actualTransportPaid += item.amount;
                if (item.months.length > 0) {
                    const amtPerMonth = item.amount / item.months.length;
                    item.months.forEach(m => {
                        transportPaidForMonth[m] = (transportPaidForMonth[m] || 0) + amtPerMonth;
                        monthWisePaid[m] = (monthWisePaid[m] || 0) + amtPerMonth;
                    });
                } else if (p.month) {
                    transportPaidForMonth[p.month] = (transportPaidForMonth[p.month] || 0) + item.amount;
                    monthWisePaid[p.month] = (monthWisePaid[p.month] || 0) + item.amount;
                }
            } else if (item.isOneTime) {
                actualOneTimePaid += item.amount;
                oneTimePaidForHead[item.name] = (oneTimePaidForHead[item.name] || 0) + item.amount;
            } else {
                actualMonthlyPaid += item.amount;
                if (item.months.length > 0) {
                    const amtPerMonth = item.amount / item.months.length;
                    item.months.forEach(m => {
                        if (!monthlyPaidForHeadAndMonth[item.name]) {
                            monthlyPaidForHeadAndMonth[item.name] = {};
                        }
                        monthlyPaidForHeadAndMonth[item.name][m] = (monthlyPaidForHeadAndMonth[item.name][m] || 0) + amtPerMonth;
                        monthWisePaid[m] = (monthWisePaid[m] || 0) + amtPerMonth;
                    });
                } else if (p.month) {
                    if (!monthlyPaidForHeadAndMonth[item.name]) {
                        monthlyPaidForHeadAndMonth[item.name] = {};
                    }
                    monthlyPaidForHeadAndMonth[item.name][p.month] = (monthlyPaidForHeadAndMonth[item.name][p.month] || 0) + item.amount;
                    monthWisePaid[p.month] = (monthWisePaid[p.month] || 0) + item.amount;
                }
            }
        });
    });

    const previousSessionDue = student.previousSessionDue || 0;
    const prevDuePending = Math.max(0, previousSessionDue - actualPrevDuesPaid);

    let oneTimePending = 0;
    const oneTimeStatus = oneTimeExpectedBreakdown.map(ot => {
        const paid = oneTimePaidForHead[ot.name] || 0;
        const pending = Math.max(0, ot.amount - paid);
        oneTimePending += pending;
        return {
            name: ot.name,
            expected: ot.amount,
            paid,
            pending
        };
    });

    let monthlyPending = 0;
    const monthlyStatus: any[] = [];
    const pendingMonthsList: string[] = [];

    allMonths.forEach(m => {
        const isElapsed = elapsedMonths.includes(m);
        let monthExpectedTotal = 0;
        let monthPaidTotal = 0;
        const headsBreakdown: any[] = [];

        monthlyExpectedBreakdown.forEach(head => {
            const expected = head.amount;
            const paid = (monthlyPaidForHeadAndMonth[head.name] && monthlyPaidForHeadAndMonth[head.name][m]) || 0;
            const pending = isElapsed ? Math.max(0, expected - paid) : 0;
            
            if (isElapsed) {
                monthlyPending += pending;
            }
            monthExpectedTotal += expected;
            monthPaidTotal += paid;

            headsBreakdown.push({
                name: head.name,
                expected,
                paid,
                pending
            });
        });

        const transportExpected = transportMonthlyFare;
        const transportPaid = transportPaidForMonth[m] || 0;
        const transportPending = isElapsed ? Math.max(0, transportExpected - transportPaid) : 0;

        if (isElapsed) {
            monthlyPending += transportPending;
        }
        monthExpectedTotal += transportExpected;
        monthPaidTotal += transportPaid;

        headsBreakdown.push({
            name: 'Transport Fee',
            expected: transportExpected,
            paid: transportPaid,
            pending: transportPending
        });

        const isMonthFullyPaid = monthPaidTotal >= monthExpectedTotal;
        if (isElapsed && !isMonthFullyPaid && monthExpectedTotal > 0) {
            pendingMonthsList.push(m);
        }

        monthlyStatus.push({
            month: m,
            isElapsed,
            expected: monthExpectedTotal,
            paid: monthPaidTotal,
            pending: isElapsed ? Math.max(0, monthExpectedTotal - monthPaidTotal) : 0,
            heads: headsBreakdown
        });
    });

    const netOutstanding = prevDuePending + oneTimePending + monthlyPending;

    const totalExpectedWholeYear = expectedOneTimeTotal + (monthlyFeeAmountValue * 12) + (transportMonthlyFare * 12) + previousSessionDue;
    const totalExpectedUpToNow = expectedOneTimeTotal + (monthlyFeeAmountValue * elapsedMonths.length) + (transportMonthlyFare * elapsedMonths.length) + previousSessionDue;
    const totalPaidAllTime = payments.reduce((sum, p) => sum + (p.amountPaid || 0) + (p.discount || 0), 0);

    return {
        student: {
            id: student.id,
            name: student.user?.name || 'Unknown',
            admissionNo: student.admissionNo,
            rollNumber: student.rollNumber,
            className: student.class?.name || 'Unassigned',
            fatherName: student.fatherName || 'N/A',
            isRT: student.isRT || false,
            transportStop: student.transportStop?.name || 'N/A',
            transportFare: transportMonthlyFare
        },
        summary: {
            previousSessionDue,
            previousDuesPaid: actualPrevDuesPaid,
            previousDuesPending: prevDuePending,
            
            expectedOneTime: expectedOneTimeTotal,
            oneTimePaid: actualOneTimePaid,
            oneTimePending,

            monthlyFeeAmount: monthlyFeeAmountValue,
            expectedMonthlyUpToNow: (monthlyFeeAmountValue + transportMonthlyFare) * elapsedMonths.length,
            monthlyPaid: actualMonthlyPaid + actualTransportPaid,
            monthlyPending,

            totalExpectedWholeYear,
            totalExpectedUpToNow,
            totalPaidAllTime,
            netOutstanding
        },
        oneTimeStatus,
        monthlyStatus,
        pendingMonthsList,
        monthWisePaid,
        payments: payments.map(p => ({
            id: p.id,
            receiptNo: p.receiptNo,
            amountPaid: p.amountPaid,
            totalFee: p.totalFee,
            discount: p.discount,
            discountReason: p.discountReason,
            feeHead: p.feeHead,
            paymentMode: p.paymentMode,
            paymentDate: p.paymentDate,
            status: p.status,
            remark: p.remark,
            submittedBy: p.submittedBy,
            approvedBy: p.approvedBy,
            approvalDate: p.approvalDate
        }))
    };
}

// Get Transport Due List - Top Priority
router.get('/transport-due-list', async (req, res) => {
    try {
        const cacheKey = `fees:transport-due-list:${req.query.session as string || 'all'}`;
        const cached = getCache(cacheKey);
        if (cached) return res.json(cached);

        const allPayments = await prisma.feePayment.findMany({
            where: { 
                status: 'APPROVED', 
                OR: [
                    { feeHead: { contains: 'Transport', mode: 'insensitive' } },
                    { feeHead: { contains: 'Bus', mode: 'insensitive' } }
                ]
            }
        });

        const transportStudentIdsFromPayments = [...new Set(allPayments.map(p => p.studentId))];

        let sessionQuery = req.query.session as string;
        if (!sessionQuery) {
            const defSession = await prisma.session.findFirst({ where: { isDefault: true } });
            sessionQuery = defSession?.name || '2024-2025';
        }
        const getAlternativeSessionName = (session: string): string => {
            const parts = session.split('-');
            if (parts.length === 2) {
                const start = parts[0];
                const end = parts[1];
                if (end.length === 4) {
                    return `${start}-${end.slice(2)}`;
                } else if (end.length === 2) {
                    return `${start}-20${end}`;
                }
            }
            return session;
        };

        const altSession = getAlternativeSessionName(sessionQuery);

        const students = await prisma.studentProfile.findMany({
            where: { 
                status: 'Active',
                ...(sessionQuery && sessionQuery !== 'All' ? {
                    OR: [
                        { academicYear: sessionQuery },
                        { academicYear: altSession }
                    ]
                } : {}),
                OR: [
                    { transportStopId: { not: null } },
                    { id: { in: transportStudentIdsFromPayments } }
                ]
            },
            include: { user: true, class: true, transportStop: true }
        });

        const elapsedMonths = 12;

        // Group payments by studentId to optimize nested filter operations from O(S * P) to O(S + P)
        const paymentsByStudent = new Map<string, typeof allPayments>();
        allPayments.forEach(p => {
            const list = paymentsByStudent.get(p.studentId) || [];
            list.push(p);
            paymentsByStudent.set(p.studentId, list);
        });

        const dueList = students.map(student => {
            const studentRawPayments = paymentsByStudent.get(student.id) || [];
            const studentPayments = studentRawPayments.filter(p => isPaymentInAcademicYear(p, student.academicYear));
            
            let monthlyFare = student.transportStop?.busFare || 0;
            let stopName = student.transportStop?.name || 'N/A';
            let totalPaid = 0;

            const paidMonths: string[] = [];

            studentPayments.forEach(p => {
                let paymentTransportAmount = 0;
                let isYearly = false;
                
                if (p.feeHead) {
                    const parts = p.feeHead.split('==>');
                    if (parts.length > 1) {
                        const mths = parts[0].split(',').map((m: string) => m.trim());
                        paidMonths.push(...mths);
                        const heads = parts[1].split('||');
                        const transportHead = heads.find((h: string) => h.toLowerCase().includes('transport') || h.toLowerCase().includes('bus'));
                        if (transportHead) {
                            if (transportHead.toLowerCase().includes('yearly')) isYearly = true;
                            const match = transportHead.match(/(?:Transport|Bus)\s*(?:\((.*?)\))?(?:\s*\(Yearly\))?:\s*(\d+)/i);
                            if (match) {
                                paymentTransportAmount = Number(match[2]);
                                if (!student.transportStopId) {
                                    stopName = match[1] ? match[1].trim() : 'Custom Transport';
                                    monthlyFare = isYearly ? paymentTransportAmount / 12 : (paymentTransportAmount / mths.length);
                                }
                            }
                        }
                    } else if (p.feeHead.toLowerCase().includes('transport') || p.feeHead.toLowerCase().includes('bus')) {
                         paymentTransportAmount = p.amountPaid || 0;
                         if (p.month) paidMonths.push(...p.month.split(',').map((m: string) => m.trim()));
                    }
                }
                totalPaid += paymentTransportAmount;
            });

            const uniquePaidMonths = [...new Set(paidMonths)];
            const expectedTotal = monthlyFare * elapsedMonths;
            const pending = expectedTotal - totalPaid;

            if (monthlyFare === 0 && totalPaid === 0) return null;

            return {
                id: student.id,
                studentName: student.user?.name || 'Unknown',
                fatherName: student.fatherName || 'N/A',
                className: student.class?.name || 'N/A',
                stopName,
                monthlyFare: Math.round(monthlyFare),
                isRT: student.isRT || false,
                expectedTotal: Math.round(expectedTotal),
                totalPaid: Math.round(totalPaid),
                pending: Math.max(0, Math.round(pending)),
                paidMonths: uniquePaidMonths
            };
        }).filter(Boolean);

        setCache(cacheKey, dueList, 20_000); // cache for 20 seconds
        res.json(dueList);
    } catch (error) {
        console.error('Transport Due List Error:', error);
        res.status(500).json({ error: 'Failed to fetch transport dues' });
    }
});

// Get Next Receipt Number
router.get('/next-receipt', async (req, res) => {
    try {
        const lastPayment = await prisma.feePayment.findFirst({
            orderBy: { paymentDate: 'desc' }
        });
        
        let nextNumber = 1;
        if (lastPayment && lastPayment.receiptNo) {
            const lastNoStr = lastPayment.receiptNo.replace('RCP', '');
            nextNumber = parseInt(lastNoStr) + 1;
        }

        const nextReceiptNo = 'RCP' + String(nextNumber).padStart(3, '0');
        res.json({ receiptNo: nextReceiptNo });
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate receipt number' });
    }
});

// Collect Fee (Submission)
router.post('/collect', async (req, res) => {
    try {
        const {
            studentId, admissionNo, amountPaid, totalFee, discount, discountReason,
            feeHead, paymentMode, month, year, submittedBy, remark
        } = req.body;

        const isPending = Number(discount) > 0;

        const lastPayment = await prisma.feePayment.findFirst({
            orderBy: { paymentDate: 'desc' }
        });
        
        let nextNumber = 1;
        if (lastPayment && lastPayment.receiptNo) {
            const lastNoStr = lastPayment.receiptNo.replace('RCP', '');
            nextNumber = parseInt(lastNoStr) + 1;
        }
        // Prevent duplicate submissions (same student, month, year, amount, and feeHead within 30 seconds)
        const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
        const existingRecentPayment = await prisma.feePayment.findFirst({
            where: {
                studentId,
                amountPaid: Number(amountPaid),
                month,
                year,
                feeHead,
                paymentDate: { gte: thirtySecondsAgo }
            }
        });

        if (existingRecentPayment) {
            return res.status(400).json({ error: 'A duplicate payment was recently processed. Please wait a moment.' });
        }

        const generatedReceiptNo = 'RCP' + String(nextNumber).padStart(3, '0');

        const feePayment = await prisma.feePayment.create({
            data: {
                studentId,
                amountPaid: Number(amountPaid),
                totalFee: Number(totalFee),
                discount: Number(discount),
                discountReason,
                feeHead,
                paymentMode,
                month,
                year,
                submittedBy,
                remark,
                status: isPending ? 'PENDING' : 'APPROVED',
                receiptNo: generatedReceiptNo,
                paymentDate: new Date()
            }
        });

        invalidateCache('fees:');
        invalidateCache('dashboard');
        res.json({
            success: true,
            data: feePayment,
            message: isPending ? 'Sent for approval' : 'Fee collected'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to collect fee' });
    }
});

// Get Pending Approvals (for Principal)
router.get('/pending', async (req, res) => {
    try {
        const pending = await prisma.feePayment.findMany({
            where: { status: 'PENDING' },
            include: {
                student: {
                    include: {
                        user: true,
                        class: true
                    }
                }
            }
        });
        res.json(pending.map(p => ({
            ...p,
            studentName: p.student?.user?.name || 'Unknown',
            className: p.student?.class?.name || 'Unknown',
            admissionNo: p.student?.admissionNo || 'N/A'
        })));
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch pending approvals' });
    }
});

// Approve Fee
router.post('/:id/approve', async (req, res) => {
    try {
        const { id } = req.params;
        const { approvedBy } = req.body;

        const updated = await prisma.feePayment.update({
            where: { id },
            data: {
                status: 'APPROVED',
                approvedBy,
                approvalDate: new Date()
            }
        });

        invalidateCache('fees:');
        invalidateCache('dashboard');
        res.json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ error: 'Failed to approve fee' });
    }
});

// Reject Fee
router.post('/:id/reject', async (req, res) => {
    try {
        const { id } = req.params;
        const { approvedBy } = req.body; 

        const updated = await prisma.feePayment.update({
            where: { id },
            data: {
                status: 'REJECTED',
                approvedBy,
                approvalDate: new Date()
            }
        });

        invalidateCache('fees:');
        invalidateCache('dashboard');
        res.json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ error: 'Failed to reject fee' });
    }
});

// Pay Full (Finalize rejected draft by removing discount)
router.post('/:id/pay-full', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Find existing record to set amountPaid back to totalFee
        const existing = await prisma.feePayment.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ error: 'Record not found' });

        const updated = await prisma.feePayment.update({
            where: { id },
            data: {
                status: 'APPROVED',
                discount: 0,
                amountPaid: existing.totalFee || 0, // Reset to full amount
                discountReason: 'Discount Rejected - Full Paid'
            }
        });

        invalidateCache('fees:');
        invalidateCache('dashboard');
        res.json({ success: true, data: updated });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to finalize full payment' });
    }
});

// Get Fee History for Student
router.get('/history/:studentId', async (req, res) => {
    try {
        const { studentId } = req.params;
        const history = await prisma.feePayment.findMany({
            where: { studentId },
            include: { session: true },
            orderBy: { paymentDate: 'desc' }
        });
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

// Get all fee history (Optional: Filter by student or role)
router.get('/', async (req, res) => {
    try {
        const history = await prisma.feePayment.findMany({
            orderBy: { paymentDate: 'desc' },
            include: {
                student: {
                    include: {
                        user: true,
                        class: true
                    }
                }
            },
            take: 100 // Limit for performance
        });

        // Explicitly map student name at the top level
        const formatted = history.map(p => ({
            ...p,
            studentName: p.student?.user?.name || 'N/A',
            className: p.student?.class?.name || 'N/A',
            admissionNo: p.student?.admissionNo || 'N/A'
        }));

        res.json(formatted);
    } catch (error) {
        console.error('Error fetching fee history:', error);
        res.status(500).json({ error: 'Failed' });
    }
});

// Fee Heads

router.get('/heads', async (req, res) => {
    try {
        const heads = await prisma.feeHead.findMany();
        res.json(heads);
    } catch (error) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/heads', async (req, res) => {
    try {
        const { name, type } = req.body;
        const head = await prisma.feeHead.create({ data: { name, type } });
        invalidateCache('fees:');
        res.json(head);
    } catch (error: any) { 
        // Handle unique constraint error
        if (error.code === 'P2002') return res.status(400).json({ error: 'Fee Head name already exists' });
        res.status(500).json({ error: 'Failed to create fee head' }); 
    }
});

router.delete('/heads/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.feeHead.delete({ where: { id } });
        invalidateCache('fees:');
        res.json({ success: true, message: 'Fee Head deleted permanently' });
    } catch (error) { 
        res.status(500).json({ error: 'Failed to delete Fee Head. It might be tied to existing payments.' }); 
    }
});

// Fee Structure
router.get('/structure', async (req, res) => {
    try {
        const structures = await prisma.class.findMany({
            select: {
                id: true,
                name: true,
                feeStructure: true,
            }
        });
        // Map to format UI expects: { className, fees: {...} }
        // Only return classes that have a defined fee structure
        res.json(structures
            .filter(s => s.feeStructure && typeof s.feeStructure === 'object' && Object.keys(s.feeStructure).length > 0)
            .map(s => ({
                id: s.id,
                className: s.name,
                fees: s.feeStructure
            })));
    } catch (error) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/structure', async (req, res) => {
    try {
        const { classId, fees } = req.body;
        const updated = await prisma.class.update({
            where: { id: classId },
            data: { feeStructure: fees }
        });
        invalidateCache('fees:');
        res.json(updated);
    } catch (error) { res.status(500).json({ error: 'Failed' }); }
});

router.delete('/structure/:classId', async (req, res) => {
    try {
        const { classId } = req.params;
        await prisma.class.update({
            where: { id: classId },
            data: { feeStructure: {} }
        });
        invalidateCache('fees:');
        res.json({ success: true, message: 'Fee structure deleted permanently' });
    } catch (error) { res.status(500).json({ error: 'Failed to delete fee structure' }); }
});

// Concessions
router.get('/concessions', async (req, res) => {
    try {
        const concessions = await prisma.concession.findMany({
            include: { student: { include: { user: true } } }
        });
        res.json(concessions.map(c => ({
            ...c,
            studentName: c.student?.user?.name || 'Unknown'
        })));
    } catch (error) { res.status(500).json({ error: 'Failed' }); }
});


// Real-time Reports
router.get('/reports', async (req, res) => {
    try {
        const sessionQuery = req.query.session as string || 'all';
        const cacheKey = `fees:reports:${sessionQuery}`;
        const cached = getCache(cacheKey);
        if (cached) return res.json(cached);
        let dateFilter = {};
        if (sessionQuery && sessionQuery !== 'All') {
            const parts = sessionQuery.split('-');
            if (parts.length === 2) {
                let startYear = parts[0];
                let endYear = parts[1];
                if (startYear.length === 2) startYear = `20${startYear}`;
                if (endYear.length === 2) endYear = `20${endYear}`;
                const startDate = new Date(`${startYear}-04-01T00:00:00.000Z`);
                const endDate = new Date(`${endYear}-03-31T23:59:59.999Z`);
                dateFilter = {
                    paymentDate: {
                        gte: startDate,
                        lte: endDate
                    }
                };
            }
        }

        const allPayments = await prisma.feePayment.findMany({
            where: { 
                status: 'APPROVED',
                ...dateFilter
            },
            include: { 
                student: { 
                    include: { 
                        class: true, 
                        user: true 
                    } 
                } 
            },
            orderBy: { paymentDate: 'desc' }
        });

        let paymentsFiltered = allPayments;
        if (sessionQuery && sessionQuery !== 'All') {
            paymentsFiltered = allPayments.filter(p => isPaymentInAcademicYear(p, sessionQuery));
        }

        // 1. Detailed Daily Report (Individual transactions)
        const daily = paymentsFiltered.map(p => ({
            ...p,
            date: new Date(p.paymentDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
            paidAmount: p.amountPaid, 
            studentName: p.student?.user?.name || 'Unknown',
            fatherName: p.student?.fatherName || 'N/A',
            className: p.student?.class?.name || 'Unknown',
            admissionNo: p.student?.admissionNo || 'N/A'
        }));

        // 2. Monthly Report (Based on actual payment date)
        const monthlyMap: any = {};
        paymentsFiltered.forEach(p => {
            const pDate = new Date(p.paymentDate);
            const m = pDate.toLocaleString('en-GB', { month: 'long' });
            const y = pDate.getFullYear().toString();
            const key = `${m} ${y}`;
            if(!monthlyMap[key]) monthlyMap[key] = { month: m, year: y, total: 0 };
            monthlyMap[key].total += p.amountPaid || 0;
        });
        const monthly = Object.values(monthlyMap);

        // 3. Class-wise Report
        const classMap: any = {};
        paymentsFiltered.forEach(p => {
            const className = p.student?.class?.name || 'Unknown';
            if(!classMap[className]) classMap[className] = { className: className, students: new Set(), total: 0 };
            classMap[className].students.add(p.studentId);
            classMap[className].total += p.amountPaid || 0;
        });
        const classWise = Object.values(classMap).map((c: any) => ({
            className: c.className,
            students: c.students.size,
            total: c.total
        }));

        const reportResult = { daily, monthly, classWise };
        setCache(cacheKey, reportResult, 20_000); // cache for 20 seconds
        res.json(reportResult);
    } catch (error: any) {
        console.error('Report Generation Error:', error.message);
        res.status(500).json({ error: 'Failed to fetch reports', details: error.message });
    }
});

// Get student detailed ledger
router.get('/student/:id/ledger', async (req, res) => {
    try {
        const { id } = req.params;
        const ledger = await getStudentFeeLedger(id);
        res.json(ledger);
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch student ledger', details: error.message });
    }
});

// Get single student outstanding balance
router.get('/student/:id/balance', async (req, res) => {
    try {
        const { id } = req.params;
        const ledger = await getStudentFeeLedger(id);
        res.json({ 
            outstandingBalance: ledger.summary.netOutstanding,
            previousSessionDue: ledger.summary.previousDuesPending,
            currentSessionBalance: ledger.summary.netOutstanding - ledger.summary.previousDuesPending,
            hasTransport: ledger.student.transportStop !== 'N/A',
            transportStopName: ledger.student.transportStop !== 'N/A' ? ledger.student.transportStop : null,
            transportBusFare: ledger.student.transportFare
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to calculate balance' });
    }
});

// Get global list of pending fees
router.get('/due-list', async (req, res) => {
    try {
        // 1. Get all base data
        let sessionQuery = req.query.session as string;
        if (!sessionQuery) {
            const defSession = await prisma.session.findFirst({ where: { isDefault: true } });
            sessionQuery = defSession?.name || '2024-2025';
        }
        const cacheKey = `fees:due-list:${sessionQuery}:${req.query.month as string || 'all'}`;
        const cached = getCache(cacheKey);
        if (cached) return res.json(cached);
        const getAlternativeSessionName = (session: string): string => {
            const parts = session.split('-');
            if (parts.length === 2) {
                const start = parts[0];
                const end = parts[1];
                if (end.length === 4) {
                    return `${start}-${end.slice(2)}`;
                } else if (end.length === 2) {
                    return `${start}-20${end}`;
                }
            }
            return session;
        };

        const altSession = getAlternativeSessionName(sessionQuery);

        const students = await prisma.studentProfile.findMany({
            where: {
                status: 'Active',
                ...(sessionQuery && sessionQuery !== 'All' ? {
                    OR: [
                        { academicYear: sessionQuery },
                        { academicYear: altSession }
                    ]
                } : {})
            },
            include: { user: true, class: true, transportStop: true }
        });
        const classes = await prisma.class.findMany();
        const feeHeads = await prisma.feeHead.findMany();
        const studentIds = students.map(s => s.id);
        const allPayments = await prisma.feePayment.findMany({
            where: { 
                status: 'APPROVED',
                studentId: { in: studentIds }
            }
        });

        // 2. Determine expected months (Session starts in April)
        const allMonths = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];
        let monthsToCalculate = 0;
        const monthQuery = req.query.month as string;
        if (monthQuery && allMonths.includes(monthQuery)) {
            monthsToCalculate = allMonths.indexOf(monthQuery) + 1;
        } else {
            const currentDate = new Date();
            const currentMonth = currentDate.getMonth();
            const sessionStartMonth = 3; // April
            if (currentMonth >= sessionStartMonth) {
                monthsToCalculate = (currentMonth - sessionStartMonth) + 1;
            } else {
                monthsToCalculate = (currentMonth + 12 - sessionStartMonth) + 1;
            }
            monthsToCalculate = Math.min(12, Math.max(1, monthsToCalculate));
        }
        const elapsedMonths = allMonths.slice(0, monthsToCalculate);

        // 3. Group payments by studentId to optimize nested filter operations from O(S * P) to O(S + P)
        const paymentsByStudent = new Map<string, typeof allPayments>();
        allPayments.forEach(p => {
            const list = paymentsByStudent.get(p.studentId) || [];
            list.push(p);
            paymentsByStudent.set(p.studentId, list);
        });

        // Process each student
        const dueList = students.map(student => {
            if (!student.user || !student.class) return null;

            const studentRawPayments = paymentsByStudent.get(student.id) || [];
            const studentPayments = studentRawPayments.filter(p => isPaymentInAcademicYear(p, student.academicYear));
            const structure: any = student.class.feeStructure || {};
            
            // Calculate Expected Fees for this student
            let expectedOneTimeTotal = 0;
            const oneTimeBreakdown: { name: string, amount: number }[] = [];

            feeHeads.forEach(head => {
                if (head.type !== 'Monthly') {
                    const amount = getExpectedFeeAmount(student, head, structure, student.class?.name);
                    if (amount > 0) {
                        expectedOneTimeTotal += amount;
                        oneTimeBreakdown.push({ name: head.name, amount });
                    }
                }
            });

            let monthlyFeeAmountValue = 0;
            feeHeads.forEach(head => {
                if (head.type === 'Monthly') {
                    const amount = getExpectedFeeAmount(student, head, structure, student.class?.name);
                    if (amount > 0) {
                        monthlyFeeAmountValue += amount;
                    }
                }
            });

            const transportMonthlyFare = student.transportStop?.busFare || 0;

            // Track actual paid amounts
            let actualPrevDuesPaid = 0;
            let actualOneTimePaid = 0;
            let actualMonthlyPaid = 0;
            let actualTransportPaid = 0;

            const oneTimePaidForHead: Record<string, number> = {};
            const monthlyPaidForHeadAndMonth: Record<string, Record<string, number>> = {};
            const transportPaidForMonth: Record<string, number> = {};
            const monthWisePaid: Record<string, number> = {};

            studentPayments.forEach(p => {
                const parsedItems = parsePaymentBreakdown(p.feeHead, p.month, p.amountPaid || 0, p.discount || 0, feeHeads);
                parsedItems.forEach(item => {
                    if (item.isPreviousDues) {
                        actualPrevDuesPaid += item.amount;
                    } else if (item.isTransport) {
                        actualTransportPaid += item.amount;
                        if (item.months.length > 0) {
                            const amtPerMonth = item.amount / item.months.length;
                            item.months.forEach(m => {
                                transportPaidForMonth[m] = (transportPaidForMonth[m] || 0) + amtPerMonth;
                                monthWisePaid[m] = (monthWisePaid[m] || 0) + amtPerMonth;
                            });
                        } else if (p.month) {
                            transportPaidForMonth[p.month] = (transportPaidForMonth[p.month] || 0) + item.amount;
                            monthWisePaid[p.month] = (monthWisePaid[p.month] || 0) + item.amount;
                        }
                    } else if (item.isOneTime) {
                        actualOneTimePaid += item.amount;
                        oneTimePaidForHead[item.name] = (oneTimePaidForHead[item.name] || 0) + item.amount;
                    } else {
                        actualMonthlyPaid += item.amount;
                        if (item.months.length > 0) {
                            const amtPerMonth = item.amount / item.months.length;
                            item.months.forEach(m => {
                                if (!monthlyPaidForHeadAndMonth[item.name]) {
                                    monthlyPaidForHeadAndMonth[item.name] = {};
                                }
                                monthlyPaidForHeadAndMonth[item.name][m] = (monthlyPaidForHeadAndMonth[item.name][m] || 0) + amtPerMonth;
                                monthWisePaid[m] = (monthWisePaid[m] || 0) + amtPerMonth;
                            });
                        } else if (p.month) {
                            if (!monthlyPaidForHeadAndMonth[item.name]) {
                                monthlyPaidForHeadAndMonth[item.name] = {};
                            }
                            monthlyPaidForHeadAndMonth[item.name][p.month] = (monthlyPaidForHeadAndMonth[item.name][p.month] || 0) + item.amount;
                            monthWisePaid[p.month] = (monthWisePaid[p.month] || 0) + item.amount;
                        }
                    }
                });
            });

            // Calculate dues
            const previousSessionDue = student.previousSessionDue || 0;
            const prevDuePending = Math.max(0, previousSessionDue - actualPrevDuesPaid);

            let oneTimePending = 0;
            oneTimeBreakdown.forEach(ot => {
                const paid = oneTimePaidForHead[ot.name] || 0;
                oneTimePending += Math.max(0, ot.amount - paid);
            });

            let monthlyPending = 0;
            const pendingMonthsList: string[] = [];

            allMonths.forEach(m => {
                if (elapsedMonths.includes(m)) {
                    let expectedThisMonth = monthlyFeeAmountValue + transportMonthlyFare;
                    let paidThisMonth = 0;

                    feeHeads.forEach(head => {
                        if (head.type === 'Monthly') {
                            paidThisMonth += (monthlyPaidForHeadAndMonth[head.name] && monthlyPaidForHeadAndMonth[head.name][m]) || 0;
                        }
                    });
                    paidThisMonth += transportPaidForMonth[m] || 0;

                    const pendingThisMonth = Math.max(0, expectedThisMonth - paidThisMonth);
                    monthlyPending += pendingThisMonth;

                    if (pendingThisMonth > 0 && expectedThisMonth > 0) {
                        pendingMonthsList.push(m);
                    }
                }
            });

            const netPending = prevDuePending + oneTimePending + monthlyPending;
            const totalExpected = expectedOneTimeTotal + (monthlyFeeAmountValue * elapsedMonths.length) + (transportMonthlyFare * elapsedMonths.length);
            const totalPaid = actualOneTimePaid + actualMonthlyPaid + actualTransportPaid + actualPrevDuesPaid;

            // Determine target month breakdown for currentMonth fields
            const targetMonth = elapsedMonths[elapsedMonths.length - 1];
            const currentMonthExpected = monthlyFeeAmountValue + transportMonthlyFare;
            let currentMonthPaid = 0;
            feeHeads.forEach(head => {
                if (head.type === 'Monthly') {
                    currentMonthPaid += (monthlyPaidForHeadAndMonth[head.name] && monthlyPaidForHeadAndMonth[head.name][targetMonth]) || 0;
                }
            });
            currentMonthPaid += transportPaidForMonth[targetMonth] || 0;
            const currentMonthPending = Math.max(0, currentMonthExpected - currentMonthPaid);

            if (netPending <= 0) return null;

            return {
                id: student.id,
                studentName: student.user.name,
                fatherName: student.fatherName || 'N/A',
                className: student.class?.name || 'Unassigned',
                admissionNo: student.admissionNo,
                isRT: student.isRT || false,
                totalExpected,
                totalPaid,
                pending: netPending,
                currentMonthExpected,
                currentMonthPaid,
                currentMonthPending,
                pendingMonths: pendingMonthsList,
                monthlyPending,
                oneTimePending,
                expectedOneTime: expectedOneTimeTotal,
                oneTimeBreakdown,
                monthWisePaid,
                previousSessionDue,
                prevDuePending,
                monthlyFeeAmount: monthlyFeeAmountValue,
                paidMonths: studentPayments.map(p => p.month).filter(Boolean) as string[],
                actualOneTimePaid,
                actualMonthlyPaid,
                actualPrevDuesPaid,
            };
        }).filter(Boolean);

        setCache(cacheKey, dueList, 20_000); // cache for 20 seconds
        res.json(dueList);
    } catch (error) {
        console.error('Due List Error:', error);
        res.status(500).json({ error: 'Failed to fetch generative due list' });
    }
});

// Update Fee Head
router.put('/heads/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, type } = req.body;
        const updated = await prisma.feeHead.update({
            where: { id },
            data: { name, type }
        });
        res.json(updated);
    } catch (error: any) {
        if (error.code === 'P2002') return res.status(400).json({ error: 'Fee Head name already exists' });
        res.status(500).json({ error: 'Failed to update fee head' });
    }
});

// Import Previous Session Dues (Temporary Tool)
router.post('/import-previous-due', async (req, res) => {
    try {
        const { data } = req.body; // Array of { studentName, fatherName, amount }
        
        if (!Array.isArray(data)) {
            return res.status(400).json({ error: 'Invalid data format. Expected an array.' });
        }

        const report = {
            total: data.length,
            matched: 0,
            unmatched: 0,
            details: [] as any[]
        };

        for (const item of data) {
            const { studentName, fatherName, amount } = item;
            
            if (!studentName || !fatherName) {
                report.unmatched++;
                report.details.push({ studentName, fatherName, status: 'Invalid Data', amount });
                continue;
            }

            // Search for student
            const students = await prisma.studentProfile.findMany({
                where: {
                    fatherName: { equals: fatherName.trim(), mode: 'insensitive' },
                    user: {
                        name: { equals: studentName.trim(), mode: 'insensitive' }
                    }
                }
            });

            if (students.length === 1) {
                // Exact match
                await prisma.studentProfile.update({
                    where: { id: students[0].id },
                    data: { previousSessionDue: parseFloat(amount) }
                });
                report.matched++;
                report.details.push({ studentName, fatherName, status: 'Matched', amount });
            } else if (students.length > 1) {
                // Multiple matches (ambiguous)
                report.unmatched++;
                report.details.push({ studentName, fatherName, status: 'Ambiguous', amount });
            } else {
                // No match
                report.unmatched++;
                report.details.push({ studentName, fatherName, status: 'Not Found', amount });
            }
        }

        invalidateCache('fees:');
        invalidateCache('dashboard');
        res.json({ success: true, report });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to import data' });
    }
});

// Delete All Fee Payments (Reset History)
router.delete('/all', async (req, res) => {
    try {
        await prisma.feePayment.deleteMany();
        invalidateCache('fees:');
        invalidateCache('dashboard');
        res.json({ success: true, message: 'All fee records deleted. System reset to RCP001.' });
    } catch (error) {
        console.error('Reset Error:', error);
        res.status(500).json({ error: 'Failed to reset fee records' });
    }
});

// Delete Fee Payment
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.feePayment.delete({ where: { id } });
        invalidateCache('fees:');
        invalidateCache('dashboard');
        res.json({ success: true, message: 'Fee record deleted successfully' });
    } catch (error) {
        console.error('Delete Error:', error);
        res.status(500).json({ error: 'Failed to delete fee record. It might not exist.' });
    }
});

// Class Detailed Revenue Stats for Excel Export
router.get('/dashboard/revenue/class/:classId', async (req, res) => {
    try {
        const { classId } = req.params;
        const cacheKey = `fees:revenue:class:${classId}`;
        const cached = getCache(cacheKey);
        if (cached) return res.json(cached);
        
        const classObj = await prisma.class.findUnique({
            where: { id: classId }
        });
        if (!classObj) {
            return res.status(404).json({ error: 'Class not found' });
        }

        const students = await prisma.studentProfile.findMany({
            where: { classId, status: 'Active' },
            include: { user: true }
        });

        const feeHeads = await prisma.feeHead.findMany();
        const monthlyFeeHeads = feeHeads.filter(h => h.type === 'Monthly');

        const studentLedgers = await Promise.all(students.map(async (student) => {
            try {
                const ledger = await getStudentFeeLedger(student.id);
                
                const oneTimeDetails = ledger.oneTimeStatus.map((item: any) => ({
                    name: item.name,
                    expected: item.expected,
                    paid: item.paid,
                    discount: 0, // Ledger parsing maps discount directly
                    balance: item.pending
                }));

                let totalMonthlyPaid = 0;
                let totalMonthlyExpected = 0;
                let monthlyBalance = 0;
                
                const monthlyDetails = monthlyFeeHeads.map(head => {
                    let expected = 0;
                    let paid = 0;
                    let pending = 0;
                    ledger.monthlyStatus.forEach((mStatus: any) => {
                        const match = mStatus.heads.find((h: any) => h.name.toLowerCase() === head.name.toLowerCase());
                        if (match) {
                            expected += match.expected;
                            paid += match.paid;
                            pending += match.pending;
                        }
                    });
                    totalMonthlyExpected += expected;
                    totalMonthlyPaid += paid;
                    monthlyBalance += pending;
                    return {
                        name: head.name,
                        expected,
                        paid,
                        balance: pending
                    };
                });

                let transportYearExpected = 0;
                let transportYearPaid = 0;
                let transportBalance = 0;
                ledger.monthlyStatus.forEach((mStatus: any) => {
                    const match = mStatus.heads.find((h: any) => h.name.toLowerCase() === 'transport fee');
                    if (match) {
                        transportYearExpected += match.expected;
                        transportYearPaid += match.paid;
                        transportBalance += match.pending;
                    }
                });

                const totalOneTimeExpected = ledger.summary.expectedOneTime;
                const totalOneTimePaid = ledger.summary.oneTimePaid;
                const oneTimeBalance = ledger.summary.oneTimePending;

                const prevDuesExpected = ledger.summary.previousSessionDue;
                const prevDuesPaid = ledger.summary.previousDuesPaid;
                const prevDuesBalance = ledger.summary.previousDuesPending;

                const totalYearExpected = prevDuesExpected + transportYearExpected + totalOneTimeExpected + totalMonthlyExpected;
                const totalYearPaid = prevDuesPaid + transportYearPaid + totalOneTimePaid + totalMonthlyPaid;
                
                const totalDiscount = ledger.payments.reduce((sum: number, p: any) => sum + (p.discount || 0), 0);
                const totalOutstanding = prevDuesBalance + transportBalance + oneTimeBalance + monthlyBalance;

                return {
                    studentId: student.id,
                    studentName: student.user?.name || 'Unknown',
                    admissionNo: student.admissionNo,
                    rollNumber: student.rollNumber || '-',
                    isRT: student.isRT,
                    prevDues: {
                        expected: prevDuesExpected,
                        paid: prevDuesPaid,
                        balance: prevDuesBalance
                    },
                    transport: {
                        expected: transportYearExpected,
                        paid: transportYearPaid,
                        balance: transportBalance
                    },
                    monthly: {
                        expected: totalMonthlyExpected,
                        paid: totalMonthlyPaid,
                        balance: monthlyBalance,
                        details: monthlyDetails
                    },
                    oneTime: {
                        expected: totalOneTimeExpected,
                        paid: totalOneTimePaid,
                        balance: oneTimeBalance,
                        details: oneTimeDetails
                    },
                    grossSummary: {
                        expected: totalYearExpected,
                        paid: totalYearPaid,
                        discount: totalDiscount,
                        outstanding: totalOutstanding
                    }
                };
            } catch (err) {
                console.error(`Error calculating ledger for student ${student.id}:`, err);
                return null;
            }
        }));

        const result = {
            classId,
            className: classObj.name,
            students: studentLedgers.filter(s => s !== null)
        };
        setCache(cacheKey, result, 20_000); // cache for 20 seconds
        res.json(result);
    } catch (error: any) {
        console.error('Class detailed revenue fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch class detailed revenue statistics' });
    }
});


export default router;


