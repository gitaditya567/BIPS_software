import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkNursery() {
    try {
        const nurseryClass = await prisma.class.findFirst({
            where: { name: { contains: 'Nursery', mode: 'insensitive' } }
        });

        if (!nurseryClass) {
            console.log('Nursery class not found');
            return;
        }

        console.log('Found Nursery Class:', nurseryClass.id, nurseryClass.name);

        const currentMonth = new Date().getMonth();
        const sessionStartMonth = 3;
        let monthsToCalculate = 1;
        if (currentMonth >= sessionStartMonth) {
            monthsToCalculate = (currentMonth - sessionStartMonth) + 1;
        } else {
            monthsToCalculate = (currentMonth + 12 - sessionStartMonth) + 1;
        }

        console.log(`Current Month Index: ${currentMonth}, Elapsed Months: ${monthsToCalculate}`);

        const students = await prisma.studentProfile.findMany({
            where: { classId: nurseryClass.id, status: { not: 'Inactive' } },
            include: {
                user: true,
                transportStop: true,
                fees: { where: { status: 'APPROVED' } }
            }
        });

        console.log(`Nursery Total Students: ${students.length}`);

        const classFeeStructure: any = nurseryClass.feeStructure || {};

        let totalYearlyProjected = 0;
        let totalCollected = 0;
        let totalDiscount = 0;
        let totalYearlyOutstanding = 0;
        let totalDueTillNow = 0;

        let totalGeneralDueTillNow = 0;
        let totalTransportDueTillNow = 0;

        students.forEach((student: any) => {
            const prevDue = student.previousSessionDue || 0;
            const busFare = student.transportStop?.busFare || 0;
            const monthlyFeeAmount = classFeeStructure.monthlyTuitionFee || classFeeStructure.monthlyFee || 0;

            const transportProjYear = busFare * 12;
            const tuitionProjYear = monthlyFeeAmount * 12;
            const oneTimeProj = (student.admissionFee || classFeeStructure.admissionFee || 0) + 
                                (classFeeStructure.annualFee || 0) + 
                                (classFeeStructure.registrationFee || 0) + 
                                (classFeeStructure.examFee || 0);

            const totalStudentYearProjected = prevDue + transportProjYear + tuitionProjYear + oneTimeProj;

            // Elapsed Months Expected
            const transportTillNow = busFare * monthsToCalculate;
            const monthlyFeeTillNow = monthlyFeeAmount * monthsToCalculate;
            const expectedUpToNow = prevDue + transportTillNow + monthlyFeeTillNow + oneTimeProj;

            let paid = 0;
            let discount = 0;
            let transportPaid = 0;
            let generalPaid = 0;

            student.fees.forEach((f: any) => {
                paid += f.amountPaid || 0;
                discount += f.discount || 0;
                const head = (f.feeHead || '').toLowerCase();
                if (head.includes('transport') || head.includes('bus')) {
                    transportPaid += (f.amountPaid || 0) + (f.discount || 0);
                } else {
                    generalPaid += (f.amountPaid || 0) + (f.discount || 0);
                }
            });

            const totalPaidAndDiscount = paid + discount;
            const studentOutstanding = Math.max(0, totalStudentYearProjected - totalPaidAndDiscount);
            const studentDueTillNow = Math.max(0, expectedUpToNow - totalPaidAndDiscount);

            const studentTransportDueTillNow = Math.max(0, transportTillNow - transportPaid);
            const studentGeneralDueTillNow = Math.max(0, (prevDue + monthlyFeeTillNow + oneTimeProj) - generalPaid);

            totalYearlyProjected += totalStudentYearProjected;
            totalCollected += paid;
            totalDiscount += discount;
            totalYearlyOutstanding += studentOutstanding;
            totalDueTillNow += studentDueTillNow;

            totalTransportDueTillNow += studentTransportDueTillNow;
            totalGeneralDueTillNow += studentGeneralDueTillNow;
        });

        console.log('\n=============================================');
        console.log('📊 NURSERY CLASS VERIFICATION REPORT');
        console.log('=============================================');
        console.log(`1. Snapshot Table Till Month Due:            ₹${totalDueTillNow.toLocaleString('en-IN')}`);
        console.log(`2. General Fee Due (Tuition+OneTime+Prev):   ₹${totalGeneralDueTillNow.toLocaleString('en-IN')}`);
        console.log(`3. Transport Fee Due (Bus Fare):             ₹${totalTransportDueTillNow.toLocaleString('en-IN')}`);
        console.log(`4. Sum of General Due + Transport Due:       ₹${(totalGeneralDueTillNow + totalTransportDueTillNow).toLocaleString('en-IN')}`);
        console.log('=============================================');

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkNursery();
