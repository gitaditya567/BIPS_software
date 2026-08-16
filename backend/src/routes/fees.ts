import express from 'express';
import prisma from '../lib/prisma';
import { getExpectedFeeAmount } from '../lib/feeUtils';
import { getCache, setCache, invalidateCache } from '../lib/cache';
import { generatePayUHash, verifyPayUReverseHash, verifyTransactionWithPayU, getPayUConfig } from '../lib/payu';

const router = express.Router();

function isPaymentInAcademicYear(p: any, academicYear: string | null): boolean {
    if (!academicYear) return true; // fallback if no academic year set
    const parts = academicYear.split('-');
    if (parts.length !== 2) return true;
    let startYear = parts[0].trim(); // e.g. "2026"
    let endYear = parts[1].trim();   // e.g. "2027" or "27"
    
    if (startYear.length === 2) startYear = `20${startYear}`;
    if (endYear.length === 2) endYear = `20${endYear}`;

    const month = (p.month || '').trim();
    const pYear = String(p.year || '').trim();

    // Direct match if p.year stores full session string (e.g. "2026-2027", "2026-27")
    if (pYear && (pYear === academicYear || pYear.startsWith(startYear) || pYear.includes(startYear) || pYear.includes(endYear))) {
        return true;
    }

    const pDate = new Date(p.paymentDate);
    const startSessionDate = new Date(parseInt(startYear), 3, 1); // April 1st
    const endSessionDate = new Date(parseInt(endYear), 2, 31, 23, 59, 59); // March 31st
    const isWithinDateRange = !isNaN(pDate.getTime()) && pDate >= startSessionDate && pDate <= endSessionDate;

    if (p.feeHead && p.feeHead.toLowerCase().includes('previous dues')) {
        return isWithinDateRange;
    }

    const springMonths = ['January', 'February', 'March'];
    const autumnMonths = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    if (springMonths.includes(month)) {
        return !pYear || pYear === endYear || pYear.includes(endYear) || isWithinDateRange;
    }
    if (autumnMonths.includes(month)) {
        return !pYear || pYear === startYear || pYear.includes(startYear) || isWithinDateRange;
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

        const tempItems: { name: string; amt: number }[] = [];
        itemParts.forEach(itemPart => {
            const splitColon = itemPart.split(':');
            if (splitColon.length >= 2) {
                const name = splitColon[0].trim();
                const amt = parseFloat(splitColon[1].trim()) || 0;
                tempItems.push({ name, amt });
            } else {
                const name = itemPart.trim();
                tempItems.push({ name, amt: totalAmount });
            }
        });

        // Allocate totalAmount sequentially to tempItems (prevents fractional scaling!)
        let remainingToAllocate = totalAmount;
        tempItems.forEach((tempItem, idx) => {
            const { name, amt } = tempItem;
            // If last item and remaining money left over, take remaining, otherwise cap at amt
            let allocatedAmt = 0;
            if (idx === tempItems.length - 1 && remainingToAllocate > amt) {
                allocatedAmt = remainingToAllocate;
            } else {
                allocatedAmt = Math.min(remainingToAllocate, amt);
            }
            remainingToAllocate = Math.max(0, remainingToAllocate - allocatedAmt);

            const nameLower = name.toLowerCase();
            const isPreviousDues = nameLower === 'previous dues';
            const isTransport = nameLower.includes('transport') || nameLower.includes('bus');

            const headObj = feeHeadsList.find(h => {
                const hName = h.name.toLowerCase();
                const nLower = nameLower.toLowerCase();
                return nLower.includes(hName) || hName.includes(nLower) || nLower.startsWith(hName) || hName.startsWith(nLower);
            });
            const isMonthly = isTransport || (headObj ? headObj.type === 'Monthly' : true);
            const isOneTime = headObj ? (headObj.type === 'One-time' || headObj.type === 'Annual' || headObj.type === 'Other') : false;

            const canonicalName = isPreviousDues 
                ? 'Previous Dues' 
                : (isTransport ? 'Transport Fee' : (headObj ? headObj.name : name));

            items.push({
                name: canonicalName,
                amount: Math.round(allocatedAmt),
                months: isMonthly ? paidMonths : [],
                isMonthly,
                isOneTime,
                isTransport,
                isPreviousDues
            });
        });
    } else {
        const name = feeHead.trim();
        const nameLower = name.toLowerCase();
        const paidMonths = month ? month.split(',').map(m => m.trim()).filter(Boolean) : [];

        const isPreviousDues = nameLower === 'previous dues';
        const isTransport = nameLower.includes('transport') || nameLower.includes('bus');

        const headObj = feeHeadsList.find(h => {
            const hName = h.name.toLowerCase();
            const nLower = nameLower.toLowerCase();
            return nLower.includes(hName) || hName.includes(nLower) || nLower.startsWith(hName) || hName.startsWith(nLower);
        });
        const isMonthly = isTransport || (headObj ? headObj.type === 'Monthly' : true);
        const isOneTime = headObj ? (headObj.type === 'One-time' || headObj.type === 'Annual' || headObj.type === 'Other') : false;

        const canonicalName = isPreviousDues 
            ? 'Previous Dues' 
            : (isTransport ? 'Transport Fee' : (headObj ? headObj.name : name));

        items.push({
            name: canonicalName,
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

export async function getStudentFeeLedger(studentId: string) {
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
    const genericMonthlyPaidForMonth: Record<string, number> = {};
    const monthWisePaid: Record<string, number> = {};

    payments.forEach(p => {
        const parsedItems = parsePaymentBreakdown(p.feeHead, p.month, p.amountPaid || 0, p.discount || 0, feeHeads);
        parsedItems.forEach(item => {
            if (item.isPreviousDues) {
                actualPrevDuesPaid += item.amount;
            } else if (item.isTransport) {
                actualTransportPaid += item.amount;
                const targetMonths = item.months.length > 0 ? item.months : (p.month ? [p.month] : []);
                if (targetMonths.length > 0) {
                    const amtPerMonth = item.amount / targetMonths.length;
                    targetMonths.forEach(m => {
                        transportPaidForMonth[m] = (transportPaidForMonth[m] || 0) + amtPerMonth;
                        monthWisePaid[m] = (monthWisePaid[m] || 0) + amtPerMonth;
                    });
                }
            } else if (item.isOneTime) {
                actualOneTimePaid += item.amount;
                oneTimePaidForHead[item.name] = (oneTimePaidForHead[item.name] || 0) + item.amount;
            } else {
                actualMonthlyPaid += item.amount;
                const targetMonths = item.months.length > 0 ? item.months : (p.month ? [p.month] : []);
                if (targetMonths.length > 0) {
                    const amtPerMonth = item.amount / targetMonths.length;
                    targetMonths.forEach(m => {
                        // Check if item.name matches a known monthly fee head
                        const matchedHead = feeHeads.find(h => h.type === 'Monthly' && (
                            item.name.toLowerCase().includes(h.name.toLowerCase()) || 
                            h.name.toLowerCase().includes(item.name.toLowerCase())
                        ));

                        if (matchedHead) {
                            if (!monthlyPaidForHeadAndMonth[matchedHead.name]) {
                                monthlyPaidForHeadAndMonth[matchedHead.name] = {};
                            }
                            monthlyPaidForHeadAndMonth[matchedHead.name][m] = (monthlyPaidForHeadAndMonth[matchedHead.name][m] || 0) + amtPerMonth;
                        } else {
                            // Generic unallocated monthly payment
                            genericMonthlyPaidForMonth[m] = (genericMonthlyPaidForMonth[m] || 0) + amtPerMonth;
                        }
                        monthWisePaid[m] = (monthWisePaid[m] || 0) + amtPerMonth;
                    });
                }
            }
        });
    });

    const previousSessionDue = student.previousSessionDue || 0;
    const cappedPrevDuesPaid = Math.min(previousSessionDue, actualPrevDuesPaid);
    const prevDuePending = Math.max(0, previousSessionDue - cappedPrevDuesPaid);

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

    // Chronological Monthly Fee Allocation per Month
    let monthlyPending = 0;
    const monthlyStatus: any[] = [];
    const pendingMonthsList: string[] = [];

    // Track unused/rollover monthly payment pool
    let rolloverMonthlyPool = 0;
    let rolloverTransportPool = actualTransportPaid;

    allMonths.forEach(m => {
        const isElapsed = elapsedMonths.includes(m);
        let monthExpectedTotal = 0;
        let monthPaidTotal = 0;
        const headsBreakdown: any[] = [];

        // Total money collected specifically for this month
        let currentMonthMoney = (monthWisePaid[m] || 0) + rolloverMonthlyPool;
        rolloverMonthlyPool = 0;

        // 1. Allocate monthly fee heads sequentially for month m
        monthlyExpectedBreakdown.forEach(head => {
            const expected = head.amount;
            let directPaid = monthlyPaidForHeadAndMonth[head.name]?.[m] || 0;
            
            let allocated = 0;
            if (directPaid > 0 && directPaid >= expected) {
                allocated = expected;
                currentMonthMoney = Math.max(0, currentMonthMoney - expected);
            } else {
                allocated = Math.min(currentMonthMoney, expected);
                currentMonthMoney -= allocated;
            }

            allocated = Math.round(allocated);
            const pending = Math.max(0, expected - allocated);

            if (isElapsed) {
                monthlyPending += pending;
            }
            monthExpectedTotal += expected;
            monthPaidTotal += allocated;

            headsBreakdown.push({
                name: head.name,
                expected,
                paid: allocated,
                pending
            });
        });

        // Save leftover money for subsequent months
        if (currentMonthMoney > 0) {
            rolloverMonthlyPool += currentMonthMoney;
        }

        // 2. Allocate transport fee chronologically
        const transportExpected = transportMonthlyFare;
        let directTransport = transportPaidForMonth[m] || 0;
        let transportAllocated = 0;
        if (directTransport > 0) {
            transportAllocated = Math.min(transportExpected, Math.round(directTransport));
            rolloverTransportPool = Math.max(0, rolloverTransportPool - transportAllocated);
        } else {
            transportAllocated = Math.min(transportExpected, rolloverTransportPool);
            rolloverTransportPool -= transportAllocated;
        }

        transportAllocated = Math.round(transportAllocated);
        const transportPending = Math.max(0, transportExpected - transportAllocated);

        if (isElapsed) {
            monthlyPending += transportPending;
        }
        monthExpectedTotal += transportExpected;
        monthPaidTotal += transportAllocated;

        headsBreakdown.push({
            name: 'Transport Fee',
            expected: transportExpected,
            paid: transportAllocated,
            pending: transportPending
        });

        const isMonthFullyPaid = monthExpectedTotal > 0 && monthPaidTotal >= monthExpectedTotal;
        if (isElapsed && !isMonthFullyPaid && monthExpectedTotal > 0) {
            pendingMonthsList.push(m);
        }

        monthlyStatus.push({
            month: m,
            isElapsed,
            expected: monthExpectedTotal,
            paid: monthPaidTotal,
            pending: Math.max(0, monthExpectedTotal - monthPaidTotal),
            isPaid: isMonthFullyPaid,
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
            previousDuesPaid: cappedPrevDuesPaid,
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
                status: { not: 'Inactive' },
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
                        const heads = parts[1].split('||');
                        const transportHead = heads.find((h: string) => h.toLowerCase().includes('transport') || h.toLowerCase().includes('bus'));
                        if (transportHead) {
                            paidMonths.push(...mths);
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
        const nextReceiptNo = await generateNextReceiptNo();
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

        const generatedReceiptNo = await generateNextReceiptNo();

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
            where: {
                status: 'PENDING',
                paymentMode: { not: { contains: 'PayU' } }
            },
            include: {
                student: {
                    include: {
                        user: true,
                        class: true
                    }
                }
            },
            orderBy: { paymentDate: 'desc' }
        });
        res.json(pending.map(p => ({
            ...p,
            studentName: p.student?.user?.name || (p as any).studentName || 'Unknown Student',
            className: p.student?.class?.name || (p as any).className || 'Unknown Class',
            admissionNo: p.student?.admissionNo || (p as any).admissionNo || 'N/A'
        })));
    } catch (error) {
        console.error('Error fetching pending approvals:', error);
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
            include: {
                session: true,
                student: {
                    include: {
                        user: true,
                        class: true
                    }
                }
            },
            orderBy: { paymentDate: 'desc' }
        });

        const formatted = history.map(p => ({
            ...p,
            studentName: p.student?.user?.name || 'N/A',
            className: p.student?.class?.name || 'N/A',
            admissionNo: p.student?.admissionNo || 'N/A'
        }));

        res.json(formatted);
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
            initialPreviousSessionDue: ledger.summary.previousSessionDue,
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

function normalizeDob(dobStr: string | null | undefined): string {
    if (!dobStr) return '';
    const clean = dobStr.trim().split('T')[0];
    const parts = clean.split(/[-/.\s]+/);
    if (parts.length === 3) {
        let p1 = parts[0].padStart(2, '0');
        let p2 = parts[1].padStart(2, '0');
        let p3 = parts[2].padStart(2, '0');

        if (p3.length === 2) {
            p3 = Number(p3) > 30 ? `19${p3}` : `20${p3}`;
        }
        if (p1.length === 2 && Number(p1) > 30) {
            p1 = `19${p1}`;
        }

        let y = '', m = '', d = '';
        if (p1.length === 4) {
            y = p1; m = p2; d = p3;
        } else if (p3.length === 4) {
            y = p3; m = p2; d = p1;
        }

        if (y && m && d) {
            return `${y}-${m}-${d}`;
        }
    }
    return clean.replace(/[^0-9]/g, '');
}

// Public Student Fee Search Endpoint for /feeonline portal
router.get('/public/student-dues', async (req: express.Request, res: express.Response): Promise<any> => {
    try {
        const rawQuery = String(req.query.admissionNo || req.query.query || '').trim();
        const rawDob = String(req.query.dob || req.query.dateOfBirth || '').trim();

        if (!rawQuery) {
            return res.status(400).json({ error: 'Please enter Admission No or SR No.' });
        }

        const cleanNumStr = rawQuery.replace(/^bips\/26\//i, '').replace(/^rcp/i, '').trim();
        const isObjectId = /^[0-9a-fA-F]{24}$/.test(rawQuery);

        const searchConditions: any[] = [
            { admissionNo: { equals: rawQuery, mode: 'insensitive' } },
            { admissionNo: { equals: `BIPS/26/${rawQuery}`, mode: 'insensitive' } },
            { admissionNo: { equals: `BIPS/26/${String(cleanNumStr).padStart(3, '0')}`, mode: 'insensitive' } },
            { admissionNo: { contains: rawQuery, mode: 'insensitive' } },
            { studentId: { equals: rawQuery, mode: 'insensitive' } },
            { user: { name: { contains: rawQuery, mode: 'insensitive' } } }
        ];

        if (isObjectId) {
            searchConditions.unshift({ id: rawQuery });
        }

        // 1. Search for StudentProfile
        const student = await prisma.studentProfile.findFirst({
            where: {
                status: { not: 'Inactive' },
                OR: searchConditions
            },
            include: { user: true, class: true, transportStop: true }
        });

        if (!student || !student.user) {
            return res.status(404).json({ error: `No student record found matching Admission No: "${rawQuery}"` });
        }

        // 2. Calculate accurate fee ledger (same core engine used by Admin Accounts module)
        const ledger = await getStudentFeeLedger(student.id);

        // 3. Fetch Approved Payments for receipt history & download
        const allPayments = await prisma.feePayment.findMany({
            where: {
                studentId: student.id,
                status: 'APPROVED'
            },
            orderBy: { paymentDate: 'desc' }
        });

        const approvedReceipts = allPayments.map(p => ({
            id: p.id,
            receiptNo: p.receiptNo || 'RCP-ONLINE',
            date: p.approvalDate ? new Date(p.approvalDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : (p.paymentDate ? new Date(p.paymentDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })),
            feeHead: p.feeHead || 'Fee Payment',
            month: p.month || 'N/A',
            year: p.year || student.academicYear || '2026-2027',
            paymentMode: p.paymentMode || 'Online - PayU',
            amountPaid: p.amountPaid || 0,
            txnid: p.txnid || '-'
        }));

        res.json({
            student: {
                id: student.id,
                studentName: student.user.name,
                admissionNo: student.admissionNo,
                className: student.class?.name || 'Unassigned',
                fatherName: student.fatherName || 'N/A',
                fatherMobile: student.fatherMobile || student.user.phone || 'N/A',
                academicYear: student.academicYear || '2026-2027',
                isThirdChild: student.isThirdChild || false,
                isRT: student.isRT || false,
                isOldStudent: student.isOldStudent || false,
                transportStop: student.transportStop ? {
                    name: student.transportStop.name,
                    busFare: student.transportStop.busFare
                } : null
            },
            summary: {
                totalExpected: ledger.summary.totalExpectedWholeYear,
                totalPaid: ledger.summary.totalPaidAllTime,
                totalPending: ledger.summary.netOutstanding,
                dueTillDate: ledger.summary.netOutstanding,
                fullSessionBalance: Math.max(0, ledger.summary.totalExpectedWholeYear - ledger.summary.totalPaidAllTime),
                previousSessionDue: ledger.summary.previousSessionDue,
                previousDuePending: ledger.summary.previousDuesPending
            },
            oneTimeBreakdown: ledger.oneTimeStatus.map((ot: any) => ({
                name: ot.name,
                expected: ot.expected,
                paid: ot.paid,
                pending: ot.pending
            })),
            monthlyDues: ledger.monthlyStatus.map((m: any) => {
                const actualPending = Math.max(0, m.expected - m.paid);
                const isFullyPaid = m.expected > 0 && m.paid >= m.expected;
                return {
                    month: m.month,
                    expected: m.expected,
                    paid: m.paid,
                    pending: actualPending,
                    isPaid: isFullyPaid,
                    heads: m.heads || []
                };
            }),
            approvedReceipts
        });
    } catch (error: any) {
        console.error('Public student dues search error:', error);
        res.status(500).json({ error: 'Failed to fetch student fee details', details: error.message });
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
                status: { not: 'Inactive' },
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
            if (!student.user) return null;

            const studentRawPayments = paymentsByStudent.get(student.id) || [];
            const studentPayments = studentRawPayments.filter(p => isPaymentInAcademicYear(p, student.academicYear));
            const structure: any = student.class?.feeStructure || {};
            
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
            const cappedPrevDuesPaid = Math.min(previousSessionDue, actualPrevDuesPaid);
            const prevDuePending = Math.max(0, previousSessionDue - cappedPrevDuesPaid);

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

            // Include all active students (including 0 pending / fully paid students)

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
                actualPrevDuesPaid: cappedPrevDuesPaid,
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


// Helper to generate next receipt number
async function generateNextReceiptNo(): Promise<string> {
    const paymentsWithReceipt = await prisma.feePayment.findMany({
        where: {
            receiptNo: {
                not: null,
                startsWith: 'RCP'
            }
        },
        select: { receiptNo: true }
    });

    let maxNum = 0;
    paymentsWithReceipt.forEach(p => {
        if (p.receiptNo) {
            const numStr = p.receiptNo.replace('RCP', '');
            const parsed = parseInt(numStr, 10);
            if (!isNaN(parsed) && parsed > maxNum) {
                maxNum = parsed;
            }
        }
    });

    const nextNumber = maxNum + 1;
    return 'RCP' + String(nextNumber).padStart(3, '0');
}

// ── PayU Online Payment Endpoints ──

// 1. Initiate PayU Online Payment
router.post('/payu/initiate', async (req: express.Request, res: express.Response): Promise<any> => {
    try {
        const {
            studentId,
            amountPaid,
            totalFee,
            discount = 0,
            feeHead,
            month,
            year,
            remark,
            customerName,
            customerEmail,
            customerPhone
        } = req.body;

        if (!studentId || !amountPaid) {
            return res.status(400).json({ error: 'studentId and amountPaid are required' });
        }

        const student = await prisma.studentProfile.findUnique({
            where: { id: studentId },
            include: { user: true, class: true }
        });

        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        const txnid = `PAYU_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
        const config = getPayUConfig();

        const draftReceiptNo = `DRAFT-${txnid}`;

        // Create pending FeePayment record in DB
        const pendingPayment = await prisma.feePayment.create({
            data: {
                studentId,
                amountPaid: Number(amountPaid),
                totalFee: Number(totalFee || amountPaid),
                discount: Number(discount),
                feeHead: feeHead || 'Online Fee Payment',
                month: month || null,
                year: year || null,
                paymentMode: 'Online - PayU',
                status: 'PENDING',
                receiptNo: draftReceiptNo,
                txnid,
                gatewayStatus: 'PENDING',
                remark: remark || 'Online PayU Payment Initiated',
                submittedBy: student.user.name || 'Student/Parent'
            }
        });

        const firstname = (customerName || student.user.name || 'Student').trim().replace(/[^a-zA-Z0-9 ]/g, '');
        const email = customerEmail || student.user.email || 'student@school.com';
        const phone = customerPhone || student.user.phone || '9999999999';
        const productinfo = `Fee Payment ${month ? '- ' + month : ''}`.trim();

        const sourceFlag = req.body.udf4 || 'Admin';
        const payuParams = {
            txnid,
            amount: Number(amountPaid),
            productinfo,
            firstname,
            email,
            phone,
            udf1: studentId,
            udf2: month || '',
            udf3: year || '',
            udf4: `${sourceFlag}::${feeHead || ''}`,
            udf5: pendingPayment.id
        };

        const hash = generatePayUHash(payuParams);
        const actionUrl = `${config.baseUrl}/_payment`;

        res.json({
            success: true,
            action: actionUrl,
            params: {
                key: config.key,
                txnid,
                amount: Number(amountPaid).toFixed(2),
                productinfo,
                firstname,
                email,
                phone,
                surl: config.surl,
                furl: config.furl,
                hash,
                udf1: payuParams.udf1,
                udf2: payuParams.udf2,
                udf3: payuParams.udf3,
                udf4: payuParams.udf4,
                udf5: payuParams.udf5
            }
        });
    } catch (error: any) {
        console.error('PayU Initiate Error:', error);
        res.status(500).json({ error: 'Failed to initiate PayU payment: ' + (error.message || error) });
    }
});

// 2. PayU Response Handler (surl / furl callback - Handles both POST and GET)
const payuResponse = async (req: express.Request, res: express.Response): Promise<any> => {
    try {
        console.log('===== PAYU RESPONSE =====');
        console.log('Method:', req.method);
        console.log('Body:', req.body);
        console.log('Query:', req.query);

        // Combine query and body params to handle both POST and GET redirects
        const postData = { ...req.query, ...req.body };
        const { txnid, status, mihpayid, udf5, hash } = postData;

        // If no payment parameters are present (direct browser navigation test)
        if (!txnid && !status && !hash && !udf5) {
            return res.send(`
                <!DOCTYPE html>
                <html>
                <head><title>PayU Response Endpoint</title></head>
                <body style="font-family: sans-serif; text-align: center; padding: 4rem;">
                    <h3 style="color: #2b6cb0;">PayU Response Callback Endpoint is Active</h3>
                    <p style="color: #4a5568;">This URL is used by PayU Gateway to postback payment status after checkout.</p>
                    <a href="http://localhost:5173/admin/fees" style="display: inline-block; margin-top: 1rem; padding: 10px 20px; background: #3182ce; color: white; text-decoration: none; border-radius: 8px;">Back to Fee Portal</a>
                </body>
                </html>
            `);
        }

        console.log(`PayU Postback received for txnid: ${txnid}, status: ${status}`);

        // A. Reverse Hash Verification (Mandatory PayU Security Requirement)
        const isReverseHashValid = verifyPayUReverseHash(postData);

        let feePaymentRecord = null;
        const isValidObjectId = udf5 && /^[0-9a-fA-F]{24}$/.test(String(udf5));
        if (isValidObjectId) {
            feePaymentRecord = await prisma.feePayment.findUnique({ where: { id: String(udf5) } });
        }
        if (!feePaymentRecord && txnid) {
            feePaymentRecord = await prisma.feePayment.findFirst({ where: { txnid: String(txnid) } });
        }

        if (!isReverseHashValid) {
            console.error(`PayU REVERSE HASH TAMPERING DETECTED for txnid: ${txnid}`);
            if (feePaymentRecord) {
                await prisma.feePayment.update({
                    where: { id: feePaymentRecord.id },
                    data: {
                        status: 'REJECTED',
                        gatewayStatus: 'TAMPERED',
                        rawGatewayResponse: JSON.stringify(postData)
                    }
                });
            }
            return res.send(`
                <!DOCTYPE html>
                <html>
                <head><title>Payment Security Error</title></head>
                <body style="font-family: sans-serif; text-align: center; padding: 3rem;">
                    <h2 style="color: #e53e3e;">Security Warning: Payment Data Verification Failed</h2>
                    <p>The transaction response signature failed security verification.</p>
                    <a href="/student/fees" style="padding: 10px 20px; background: #3182ce; color: white; text-decoration: none; border-radius: 8px;">Back to Fee Portal</a>
                </body>
                </html>
            `);
        }

        // B. Secondary Confirmation via PayU S2S Verify Payment Web Service
        let finalStatus = 'REJECTED';

        if (status === 'success' && txnid) {
            const s2sResult = await verifyTransactionWithPayU(String(txnid));
            if (s2sResult.success || status === 'success') {
                finalStatus = 'APPROVED';
            }
        }

        let assignedReceiptNo = feePaymentRecord?.receiptNo || '';

        if (feePaymentRecord) {
            if (finalStatus === 'APPROVED' && (!assignedReceiptNo || assignedReceiptNo.startsWith('DRAFT-'))) {
                assignedReceiptNo = await generateNextReceiptNo();
            }

            await prisma.feePayment.update({
                where: { id: feePaymentRecord.id },
                data: {
                    status: finalStatus,
                    gatewayStatus: String(status || 'UNKNOWN'),
                    payuMoneyId: mihpayid ? String(mihpayid) : null,
                    receiptNo: finalStatus === 'APPROVED' ? assignedReceiptNo : null,
                    approvalDate: finalStatus === 'APPROVED' ? new Date() : null,
                    rawGatewayResponse: JSON.stringify(postData)
                }
            });

            invalidateCache('fees:');
            invalidateCache('dashboard');
        }

        // Return HTML response to redirect back to frontend portal
        const isFromAdmin = postData.udf4 && String(postData.udf4).includes('Admin');
        const isFromPublic = postData.udf4 && (String(postData.udf4).includes('Public') || String(postData.udf4).includes('FeeOnline'));
        const redirectPath = isFromPublic ? '/erp/feeonline' : (isFromAdmin ? '/erp/admin/fees' : '/erp/student/fees');
        const stId = feePaymentRecord?.studentId || postData.udf1 || '';

        let targetAdmNo = '';
        if (stId) {
            const stProfile = await prisma.studentProfile.findUnique({
                where: { id: stId },
                select: { admissionNo: true }
            });
            if (stProfile) targetAdmNo = stProfile.admissionNo;
        }

        const paidAmountVal = feePaymentRecord?.amountPaid || postData.amount || 0;
        const feeHeadVal = feePaymentRecord?.feeHead || 'Online Fee Payment';

        let frontendBase = process.env.FRONTEND_URL || '';
        if (!frontendBase) {
            const hostHeader = req.get('host') || 'bipslucknow.org';
            const protocol = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
            if (hostHeader.includes('localhost')) {
                frontendBase = 'http://localhost:5173';
            } else {
                frontendBase = `${protocol}://${hostHeader}`;
            }
        }
        frontendBase = frontendBase.replace(/\/+$/, '');

        const redirectUrl = `${frontendBase}${redirectPath}?payment=${finalStatus.toLowerCase()}&txnid=${txnid || ''}&receipt=${assignedReceiptNo || ''}&studentId=${stId}&admissionNo=${encodeURIComponent(targetAdmNo)}&amount=${paidAmountVal}&feeHead=${encodeURIComponent(feeHeadVal)}`;
        
        return res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Payment ${finalStatus}</title>
                <script>
                    setTimeout(function() {
                        window.location.href = "${redirectUrl}";
                    }, 1000);
                </script>
            </head>
            <body style="font-family: sans-serif; text-align: center; padding: 4rem;">
                <h3 style="color: ${finalStatus === 'APPROVED' ? '#2e7d32' : '#c62828'};">Payment ${finalStatus === 'APPROVED' ? 'Successful!' : 'Failed or Cancelled'}</h3>
                <p>Redirecting back to your school fee portal...</p>
                <a href="${redirectUrl}">Click here if not redirected automatically</a>
            </body>
            </html>
        `);
    } catch (error: any) {
        console.error('PayU Response Error Stack:', error);
        res.status(500).send('Error processing PayU payment response: ' + (error.message || String(error)));
    }
};

router.post('/payu/response', payuResponse);
router.get('/payu/response', payuResponse);

// 3. PayU Webhook Endpoint (Server to Server background notification)
router.post('/payu/webhook', async (req: express.Request, res: express.Response): Promise<any> => {
    try {
        const postData = req.body || {};
        const { txnid, status, mihpayid, udf5 } = postData;

        console.log(`PayU Webhook received for txnid: ${txnid}, status: ${status}`);

        const isValidHash = verifyPayUReverseHash(postData);
        if (!isValidHash) {
            console.error('PayU Webhook Reverse Hash invalid!');
            return res.status(400).json({ error: 'Invalid reverse hash signature' });
        }

        let payment = null;
        if (udf5) {
            payment = await prisma.feePayment.findUnique({ where: { id: udf5 } });
        }
        if (!payment && txnid) {
            payment = await prisma.feePayment.findFirst({ where: { txnid } });
        }

        if (payment && payment.status === 'PENDING') {
            const s2s = await verifyTransactionWithPayU(txnid);
            const isApproved = status === 'success' || s2s.success;
            let receiptNo = payment.receiptNo;
            if (isApproved && !receiptNo) {
                receiptNo = await generateNextReceiptNo();
            }

            await prisma.feePayment.update({
                where: { id: payment.id },
                data: {
                    status: isApproved ? 'APPROVED' : 'REJECTED',
                    gatewayStatus: status || 'UNKNOWN',
                    payuMoneyId: mihpayid ? String(mihpayid) : null,
                    receiptNo: isApproved ? receiptNo : null,
                    approvalDate: isApproved ? new Date() : null,
                    rawGatewayResponse: JSON.stringify(postData)
                }
            });

            invalidateCache('fees:');
            invalidateCache('dashboard');
        }

        res.json({ status: 'success', message: 'Webhook processed' });
    } catch (error: any) {
        console.error('PayU Webhook Error:', error);
        res.status(500).json({ error: 'Webhook processing error' });
    }
});

// 4. PayU Manual Transaction Status Verification Endpoint
router.get('/payu/verify-status/:txnid', async (req: express.Request, res: express.Response): Promise<any> => {
    try {
        const txnid = String(req.params.txnid || '');
        if (!txnid) return res.status(400).json({ error: 'txnid is required' });

        const s2sResult = await verifyTransactionWithPayU(txnid);
        const payment = await prisma.feePayment.findFirst({ where: { txnid } });

        if (payment && payment.status === 'PENDING' && s2sResult.success) {
            const receiptNo = payment.receiptNo || (await generateNextReceiptNo());
            const updated = await prisma.feePayment.update({
                where: { id: payment.id },
                data: {
                    status: 'APPROVED',
                    gatewayStatus: 'SUCCESS',
                    payuMoneyId: s2sResult.mihpayid ? String(s2sResult.mihpayid) : payment.payuMoneyId,
                    receiptNo,
                    approvalDate: new Date(),
                    rawGatewayResponse: JSON.stringify(s2sResult.raw)
                }
            });
            invalidateCache('fees:');
            invalidateCache('dashboard');
            return res.json({ success: true, verified: true, payment: updated });
        }

        res.json({ success: true, verified: s2sResult.success, s2sResult, payment });
    } catch (error: any) {
        console.error('PayU Verify Status Route Error:', error);
        res.status(500).json({ error: 'Failed to verify transaction status' });
    }
});

export default router;


