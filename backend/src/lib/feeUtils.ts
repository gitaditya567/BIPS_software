export function isClass1To8OrPrePrimary(className: string | null | undefined): boolean {
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
}

export function getExpectedFeeAmount(
    student: { isRT: boolean; isThirdChild?: boolean; class?: { name: string } | null },
    head: { name: string; type: string },
    structure: any,
    className?: string | null
): number {
    const rawAmount = Number(structure[head.name] || 0);
    if (rawAmount <= 0) return 0;

    const headNameLower = head.name.toLowerCase();
    const isRT = student.isRT || false;
    const isThirdChild = (student as any).isThirdChild || false;
    const isOldStudent = (student as any).isOldStudent || false;

    // Filter "Admission Fee" and "Admission Form Fee" - waived off for Old/Previous students
    if (isOldStudent && (headNameLower === 'admission fee' || headNameLower === 'admission form fee' || headNameLower.includes('admission fee') || headNameLower.includes('admission form fee'))) {
        return 0;
    }

    // Filter "RTE STUDENTS FEES" - only charged to RTE students
    if (headNameLower.includes('rte students fees')) {
        return isRT ? rawAmount : 0;
    }

    // Filter "third child one time fees" - only charged to Third Child students
    if (headNameLower.includes('third child one time fees')) {
        return isThirdChild ? rawAmount : 0;
    }

    if (head.type === 'Monthly') {
        // RTE students never pay monthly fees
        if (isRT) {
            return 0;
        }
        // Third Child students do NOT pay monthly fees, EXCEPT Computer Class Fee in Nursery-Class 8
        if (isThirdChild) {
            const clsName = className || student.class?.name || '';
            if (headNameLower.includes('computer class fee') && isClass1To8OrPrePrimary(clsName)) {
                return rawAmount;
            }
            return 0;
        }
        return rawAmount;
    }

    return rawAmount;
}
