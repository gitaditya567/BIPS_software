import express from 'express';
import prisma from '../lib/prisma';
import { getExpectedFeeAmount } from '../lib/feeUtils';

const router = express.Router();

// Get list of all academic sessions
router.get('/', async (req, res) => {
    try {
        const sessions = await prisma.session.findMany({
            orderBy: { startDate: 'asc' }
        });
        res.json(sessions);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch sessions' });
    }
});

// Get the active/default session
router.get('/active', async (req, res) => {
    try {
        let activeSession = await prisma.session.findFirst({
            where: { isDefault: true }
        });

        // Fallback if no session is set as default
        if (!activeSession) {
            activeSession = await prisma.session.findFirst({
                orderBy: { startDate: 'desc' }
            });
        }

        res.json(activeSession);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch active session' });
    }
});

// Create a new session
router.post('/', async (req, res) => {
    try {
        const { name, startDate, endDate, isDefault } = req.body;

        if (!name || !startDate || !endDate) {
            return res.status(400).json({ error: 'Missing required session fields' });
        }

        // If this session is marked as default, turn off isDefault on other sessions
        if (isDefault) {
            await prisma.session.updateMany({
                data: { isDefault: false }
            });
        }

        const newSession = await prisma.session.create({
            data: {
                name,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                isDefault: !!isDefault
            }
        });

        res.json(newSession);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create academic session' });
    }
});

// Set a session as default
router.put('/:id/default', async (req, res) => {
    try {
        const { id } = req.params;

        // Reset all other sessions defaults
        await prisma.session.updateMany({
            data: { isDefault: false }
        });

        // Mark this one as default
        const updatedSession = await prisma.session.update({
            where: { id },
            data: { isDefault: true }
        });

        res.json(updatedSession);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update default session' });
    }
});

// Helper functions for rollover
function getNextClassName(currentName: string) {
    const name = currentName.trim();
    if (name.toLowerCase() === 'nursery') return 'LKG';
    if (name.toLowerCase() === 'lkg') return 'UKG';
    if (name.toLowerCase() === 'ukg') return 'Class 1';
    
    const match = name.match(/\d+/);
    if (match) {
        const currentNum = parseInt(match[0]);
        if (currentNum >= 12) {
            return 'GRADUATED';
        }
        return name.replace(/\d+/, String(currentNum + 1));
    }
    return name;
}

function isPaymentInAcademicYear(p: any, academicYear: string) {
    const parts = academicYear.split('-');
    if (parts.length !== 2) return true;
    let startYear = parts[0];
    let endYear = parts[1];

    if (startYear.length === 2) startYear = `20${startYear}`;
    if (endYear.length === 2) endYear = `20${endYear}`;

    const month = p.month || '';
    const year = p.year || '';

    const pDate = new Date(p.paymentDate);
    const startSessionDate = new Date(parseInt(startYear), 3, 1);
    const endSessionDate = new Date(parseInt(endYear), 2, 31, 23, 59, 59);
    const isWithinDateRange = pDate >= startSessionDate && pDate <= endSessionDate;

    if (p.feeHead && p.feeHead.toLowerCase().includes('previous dues')) {
        return isWithinDateRange;
    }

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

function parsePaymentBreakdown(feeHead: string | null, month: string | null, amountPaid: number, discount: number, feeHeadsList: any[]) {
    const totalAmount = Math.round(amountPaid + discount);
    if (!feeHead) return [];
    const items: any[] = [];

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
            
            const headObj = feeHeadsList.find(h => {
                const hName = h.name.toLowerCase();
                return nameLower.startsWith(hName) || hName.startsWith(nameLower);
            });
            const isMonthly = isTransport || (headObj ? headObj.type === 'Monthly' : true);
            const isOneTime = headObj ? (headObj.type === 'One-time' || headObj.type === 'Annual' || headObj.type === 'Other') : false;

            items.push({ name, amount: scaledAmt, months: isMonthly ? paidMonths : [], isMonthly, isOneTime, isTransport, isPreviousDues });
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

        items.push({ name, amount: totalAmount, months: isMonthly ? paidMonths : [], isMonthly, isOneTime, isTransport, isPreviousDues });
    }
    return items;
}

// POST /rollover - Execute academic year rollover and promotions
router.post('/rollover', async (req, res) => {
    try {
        const { fromSession, toSession, isDryRun } = req.body;

        if (!fromSession || !toSession) {
            return res.status(400).json({ error: 'fromSession and toSession are required' });
        }

        const classes = await prisma.class.findMany();
        const feeHeads = await prisma.feeHead.findMany();
        const targetSessionRecord = await prisma.session.findUnique({
            where: { name: toSession }
        });

        if (!targetSessionRecord) {
            return res.status(400).json({ error: `Destination session "${toSession}" does not exist. Create it first.` });
        }

        const students = await prisma.studentProfile.findMany({
            where: {
                academicYear: fromSession,
                status: 'Active'
            },
            include: {
                class: true,
                transportStop: true,
                user: true,
                fees: {
                    where: { status: 'APPROVED' }
                }
            }
        });

        const log: string[] = [];
        let promoteCount = 0;
        let graduateCount = 0;
        let totalOutstandingCarried = 0;

        for (const student of students) {
            if (!student.class) continue;

            const structure = student.class.feeStructure as any || {};
            const previousSessionDue = student.previousSessionDue || 0;
            const transportMonthlyFare = student.transportStop?.busFare || 0;

            let expectedOneTimeTotal = 0;
            feeHeads.forEach(head => {
                if (head.type !== 'Monthly') {
                    const amount = getExpectedFeeAmount(student, head, structure, student.class?.name);
                    if (amount > 0) expectedOneTimeTotal += amount;
                }
            });

            let monthlyFeeAmountValue = 0;
            feeHeads.forEach(head => {
                if (head.type === 'Monthly') {
                    const amount = getExpectedFeeAmount(student, head, structure, student.class?.name);
                    if (amount > 0) monthlyFeeAmountValue += amount;
                }
            });

            const totalExpected = previousSessionDue + expectedOneTimeTotal + (monthlyFeeAmountValue * 12) + (transportMonthlyFare * 12);
            const sessionPayments = student.fees.filter(p => isPaymentInAcademicYear(p, fromSession));
            let totalPaidAndDiscount = 0;

            sessionPayments.forEach(p => {
                const parsedItems = parsePaymentBreakdown(p.feeHead, p.month, p.amountPaid || 0, p.discount || 0, feeHeads);
                parsedItems.forEach(item => {
                    totalPaidAndDiscount += item.amount;
                });
            });

            const netOutstanding = Math.max(0, totalExpected - totalPaidAndDiscount);
            const nextClassName = getNextClassName(student.class.name);
            const destinationClass = classes.find(c => c.name.trim().toLowerCase() === nextClassName.trim().toLowerCase());

            log.push(`Student: ${student.user?.name} (${student.admissionNo}) -> Outstanding: ₹${netOutstanding.toLocaleString()}`);

            if (!isDryRun) {
                if (nextClassName === 'GRADUATED') {
                    graduateCount++;
                    await prisma.studentProfile.update({
                        where: { id: student.id },
                        data: {
                            status: 'Inactive',
                            previousSessionDue: netOutstanding,
                            academicYear: toSession,
                            sessionId: targetSessionRecord.id
                        }
                    });
                } else if (destinationClass) {
                    promoteCount++;
                    await prisma.studentProfile.update({
                        where: { id: student.id },
                        data: {
                            classId: destinationClass.id,
                            previousSessionDue: netOutstanding,
                            academicYear: toSession,
                            sessionId: targetSessionRecord.id
                        }
                    });
                } else {
                    promoteCount++;
                    await prisma.studentProfile.update({
                        where: { id: student.id },
                        data: {
                            previousSessionDue: netOutstanding,
                            academicYear: toSession,
                            sessionId: targetSessionRecord.id
                        }
                    });
                }
            } else {
                if (nextClassName === 'GRADUATED') graduateCount++;
                else promoteCount++;
            }

            totalOutstandingCarried += netOutstanding;
        }

        res.json({
            success: true,
            isDryRun: !!isDryRun,
            summary: {
                processed: students.length,
                promoted: promoteCount,
                graduated: graduateCount,
                totalOutstandingCarried
            },
            log: log.slice(0, 100) // Return first 100 student logs to save payload space
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Rollover operation failed' });
    }
});

export default router;
