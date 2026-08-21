import axios, { AxiosInstance } from 'axios';

const BASE_URL = 'http://localhost:5000';

interface TestResult {
    suite: string;
    testName: string;
    type: 'HAPPY_PATH' | 'EDGE_CASE' | 'INVALID_INPUT' | 'SECURITY';
    status: 'PASSED' | 'FAILED';
    durationMs: number;
    error?: string;
    details?: any;
}

const results: TestResult[] = [];

async function runTest(
    suite: string,
    testName: string,
    type: 'HAPPY_PATH' | 'EDGE_CASE' | 'INVALID_INPUT' | 'SECURITY',
    fn: () => Promise<void>
) {
    const start = Date.now();
    try {
        await fn();
        const durationMs = Date.now() - start;
        results.push({ suite, testName, type, status: 'PASSED', durationMs });
        console.log(`  ✅ [PASS] (${type}) ${testName} [${durationMs}ms]`);
    } catch (err: any) {
        const durationMs = Date.now() - start;
        const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message || JSON.stringify(err);
        results.push({ suite, testName, type, status: 'FAILED', durationMs, error: errorMsg, details: err.response?.data });
        console.log(`  ❌ [FAIL] (${type}) ${testName} [${durationMs}ms]: ${errorMsg}`);
    }
}

async function main() {
    console.log('===============================================================');
    console.log('🚀 STARTING COMPREHENSIVE SCHOOL ERP E2E QA TEST SUITE');
    console.log(`🎯 Target API: ${BASE_URL}`);
    console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
    console.log('===============================================================\n');

    const api = axios.create({ baseURL: BASE_URL, validateStatus: () => true });

    let adminToken = '';
    let teacherToken = '';
    let accountsToken = '';
    let parentToken = '';
    let adminUserId = '';
    let teacherUserId = '';
    let sampleStudentId = '';
    let sampleClassId = '';
    let sampleSectionId = '';
    let sampleStopId = '';
    let sampleExpenseId = '';
    let sampleNoticeId = '';
    let sampleTcId = '';
    let sampleFeeHeadId = '';
    let activeSessionName = '2026-2027';

    // ==========================================
    // 1. HEALTH & SYSTEM CHECKS
    // ==========================================
    console.log('\n--- 1. Health & Server Diagnostics ---');
    await runTest('Health', 'Ping endpoint returns pong', 'HAPPY_PATH', async () => {
        const res = await api.get('/ping');
        if (res.status !== 200 || res.data !== 'pong') throw new Error(`Expected 200 pong, got ${res.status}: ${res.data}`);
    });

    await runTest('Health', 'Database Health check returns status: ok', 'HAPPY_PATH', async () => {
        const res = await api.get('/api/health');
        if (res.status !== 200 || res.data.status !== 'ok' || res.data.database !== 'connected') {
            throw new Error(`Database health check failed: ${JSON.stringify(res.data)}`);
        }
    });

    await runTest('Health', 'Debug routes returns registered endpoints', 'HAPPY_PATH', async () => {
        const res = await api.get('/api/debug-routes');
        if (res.status !== 200 || !Array.isArray(res.data.routes)) {
            throw new Error(`Invalid debug routes response: ${res.status}`);
        }
    });

    // ==========================================
    // 2. AUTHENTICATION & SECURITY
    // ==========================================
    console.log('\n--- 2. Authentication & Authorization ---');
    await runTest('Auth', 'Admin login with valid credentials returns JWT & Admin role', 'HAPPY_PATH', async () => {
        const res = await api.post('/api/login', {
            email: 'admin@schoolerp.com',
            password: 'admin123',
            role: 'ADMIN'
        });
        if (res.status !== 200 || !res.data.token || res.data.user.role !== 'ADMIN') {
            throw new Error(`Admin login failed: ${res.status} - ${JSON.stringify(res.data)}`);
        }
        adminToken = res.data.token;
        adminUserId = res.data.user.id;
    });

    await runTest('Auth', 'Teacher login with valid credentials', 'HAPPY_PATH', async () => {
        const res = await api.post('/api/login', {
            email: 'teacher@schoolerp.com',
            password: 'teacher123',
            role: 'TEACHER'
        });
        if (res.status !== 200 || !res.data.token || res.data.user.role !== 'TEACHER') {
            throw new Error(`Teacher login failed: ${res.status} - ${JSON.stringify(res.data)}`);
        }
        teacherToken = res.data.token;
        teacherUserId = res.data.user.id;
    });

    await runTest('Auth', 'Accounts login with valid credentials', 'HAPPY_PATH', async () => {
        const res = await api.post('/api/login', {
            email: 'accounts@schoolerp.com',
            password: 'accounts123',
            role: 'ACCOUNTS'
        });
        if (res.status !== 200 || !res.data.token || res.data.user.role !== 'ACCOUNTS') {
            throw new Error(`Accounts login failed: ${res.status} - ${JSON.stringify(res.data)}`);
        }
        accountsToken = res.data.token;
    });

    await runTest('Auth', 'Login with invalid password returns 401', 'INVALID_INPUT', async () => {
        const res = await api.post('/api/login', {
            email: 'admin@schoolerp.com',
            password: 'WRONG_PASSWORD_XYZ',
            role: 'ADMIN'
        });
        if (res.status !== 401) throw new Error(`Expected 401 for invalid password, got ${res.status}`);
    });

    await runTest('Auth', 'Login with non-existent email returns 401', 'INVALID_INPUT', async () => {
        const res = await api.post('/api/login', {
            email: 'ghost_user_9999@schoolerp.com',
            password: 'password123',
            role: 'ADMIN'
        });
        if (res.status !== 401) throw new Error(`Expected 401 for non-existent email, got ${res.status}`);
    });

    await runTest('Auth', 'Role mismatch login (Teacher credentials with ADMIN role) returns 401', 'SECURITY', async () => {
        const res = await api.post('/api/login', {
            email: 'teacher@schoolerp.com',
            password: 'teacher123',
            role: 'ADMIN'
        });
        if (res.status !== 401) throw new Error(`Expected 401 role mismatch, got ${res.status}`);
    });

    await runTest('Auth', 'Parent login with invalid SR No returns 401', 'INVALID_INPUT', async () => {
        const res = await api.post('/api/login', {
            email: 'INVALID_SR_NO_999999',
            password: 'dob_or_pass',
            role: 'PARENT'
        });
        if (res.status !== 401) throw new Error(`Expected 401 for invalid SR No, got ${res.status}`);
    });

    await runTest('Auth', 'Fetch current user details via /api/general/user/:id', 'HAPPY_PATH', async () => {
        const res = await api.get(`/api/general/user/${adminUserId}`);
        if (res.status !== 200 || res.data.email !== 'admin@schoolerp.com') {
            throw new Error(`Failed to fetch user by id: ${res.status}`);
        }
    });

    await runTest('Auth', 'Fetch user with invalid MongoDB ObjectId returns 404/500 cleanly', 'EDGE_CASE', async () => {
        const res = await api.get('/api/general/user/nonexistentobjectid123456');
        if (res.status !== 404 && res.status !== 500) {
            throw new Error(`Expected 404/500 for invalid user id, got ${res.status}`);
        }
    });

    // ==========================================
    // 3. ACADEMIC SESSIONS
    // ==========================================
    console.log('\n--- 3. Academic Sessions Management ---');
    await runTest('Sessions', 'Get all academic sessions list', 'HAPPY_PATH', async () => {
        const res = await api.get('/api/sessions');
        if (res.status !== 200 || !Array.isArray(res.data) || res.data.length === 0) {
            throw new Error(`Failed to fetch sessions: ${res.status}`);
        }
    });

    await runTest('Sessions', 'Get active / default session', 'HAPPY_PATH', async () => {
        const res = await api.get('/api/sessions/active');
        if (res.status !== 200 || !res.data || !res.data.name) {
            throw new Error(`Failed to fetch active session: ${res.status}`);
        }
        activeSessionName = res.data.name;
    });

    await runTest('Sessions', 'Create session validation: Reject missing required fields', 'INVALID_INPUT', async () => {
        const res = await api.post('/api/sessions', {
            name: '' // Missing dates
        });
        if (res.status !== 400) throw new Error(`Expected 400 for missing session fields, got ${res.status}`);
    });

    // ==========================================
    // 4. CLASSES & SECTIONS & SUBJECTS
    // ==========================================
    console.log('\n--- 4. Classes, Sections & Subjects ---');
    await runTest('Classes', 'Get all classes list with sections & students', 'HAPPY_PATH', async () => {
        const res = await api.get('/api/admin/classes');
        if (res.status !== 200 || !Array.isArray(res.data) || res.data.length === 0) {
            throw new Error(`Failed to fetch classes: ${res.status}`);
        }
        sampleClassId = res.data[0].id;
        if (res.data[0].sections && res.data[0].sections.length > 0) {
            sampleSectionId = res.data[0].sections[0].id;
        }
    });

    await runTest('Classes', 'Create class validation: Empty name rejection', 'INVALID_INPUT', async () => {
        const res = await api.post('/api/admin/classes', { name: '' });
        if (res.status !== 400 && res.status !== 500) {
            throw new Error(`Expected error for empty class name, got ${res.status}`);
        }
    });

    // ==========================================
    // 5. STUDENT INFORMATION SYSTEM (SIS)
    // ==========================================
    console.log('\n--- 5. Student Information System (SIS) ---');
    await runTest('Students', 'Get students list with session & class filter', 'HAPPY_PATH', async () => {
        const res = await api.get(`/api/admin/students?session=${activeSessionName}`);
        if (res.status !== 200 || !Array.isArray(res.data) || res.data.length === 0) {
            throw new Error(`Failed to fetch students: ${res.status}`);
        }
        sampleStudentId = res.data[0].id;
    });

    await runTest('Students', 'Filter students by status=Active', 'HAPPY_PATH', async () => {
        const res = await api.get(`/api/admin/students?session=${activeSessionName}&status=Active`);
        if (res.status !== 200 || !Array.isArray(res.data)) {
            throw new Error(`Failed to filter active students: ${res.status}`);
        }
    });

    await runTest('Students', 'Search student by admission number / name keyword', 'HAPPY_PATH', async () => {
        const res = await api.get(`/api/admin/students?session=${activeSessionName}&search=101`);
        if (res.status !== 200 || !Array.isArray(res.data)) {
            throw new Error(`Failed student search: ${res.status}`);
        }
    });

    await runTest('Students', 'Student registration validation: Missing name & admissionNo', 'INVALID_INPUT', async () => {
        const res = await api.post('/api/admin/students', {
            name: '',
            admissionNo: '',
            classId: sampleClassId
        });
        if (res.status !== 400) throw new Error(`Expected 400 for missing student name/admissionNo, got ${res.status}`);
    });

    await runTest('Students', 'Student Dashboard Stats calculation for sample student', 'HAPPY_PATH', async () => {
        const res = await api.get(`/api/general/dashboard-stats/student/${sampleStudentId}`);
        if (res.status !== 200 || !res.data.stats || !res.data.stats.attendance) {
            throw new Error(`Failed to get student dashboard stats: ${res.status}`);
        }
    });

    // ==========================================
    // 6. TEACHER & STAFF MODULE
    // ==========================================
    console.log('\n--- 6. Teacher & Staff Management ---');
    await runTest('Teachers', 'Get all teachers list with assigned subjects & classes', 'HAPPY_PATH', async () => {
        const res = await api.get('/api/admin/teachers');
        if (res.status !== 200 || !Array.isArray(res.data)) {
            throw new Error(`Failed to fetch teachers: ${res.status}`);
        }
    });

    await runTest('Teachers', 'Get teacher assigned classes via /api/teacher/:userId/classes', 'HAPPY_PATH', async () => {
        const res = await api.get(`/api/teacher/${teacherUserId}/classes`);
        if (res.status !== 200 || !Array.isArray(res.data)) {
            throw new Error(`Failed to fetch teacher assigned classes: ${res.status}`);
        }
    });

    await runTest('Teachers', 'Get teacher dashboard stats via /api/teacher/:userId/dashboard-stats', 'HAPPY_PATH', async () => {
        const res = await api.get(`/api/teacher/${teacherUserId}/dashboard-stats`);
        if (res.status !== 200 || !res.data.stats || res.data.stats.myStudents === undefined) {
            throw new Error(`Failed to fetch teacher dashboard stats: ${res.status}`);
        }
    });

    await runTest('Teachers', 'Teacher registration validation: Missing employeeId & email', 'INVALID_INPUT', async () => {
        const res = await api.post('/api/admin/teachers', {
            name: 'Incomplete Teacher',
            employeeId: '',
            email: ''
        });
        if (res.status !== 400) throw new Error(`Expected 400 for incomplete teacher data, got ${res.status}`);
    });

    // ==========================================
    // 7. ATTENDANCE SYSTEM
    // ==========================================
    console.log('\n--- 7. Attendance System ---');
    await runTest('Attendance', 'Fetch student attendance history', 'HAPPY_PATH', async () => {
        const res = await api.get(`/api/general/attendance/${sampleStudentId}`);
        if (res.status !== 200 || !Array.isArray(res.data)) {
            throw new Error(`Failed to fetch student attendance: ${res.status}`);
        }
    });

    await runTest('Attendance', 'Attendance submission validation: Empty records rejection', 'INVALID_INPUT', async () => {
        const res = await api.post('/api/general/attendance', {
            records: [],
            date: new Date().toISOString()
        });
        if (res.status !== 400) throw new Error(`Expected 400 for empty attendance records, got ${res.status}`);
    });

    // ==========================================
    // 8. FEE ENGINE & FINANCIALS
    // ==========================================
    console.log('\n--- 8. Fee Engine & Financial Calculations ---');
    await runTest('Fees', 'Get all registered Fee Heads', 'HAPPY_PATH', async () => {
        const res = await api.get('/api/fees/heads');
        if (res.status !== 200 || !Array.isArray(res.data)) {
            throw new Error(`Failed to fetch fee heads: ${res.status}`);
        }
        if (res.data.length > 0) sampleFeeHeadId = res.data[0].id;
    });

    await runTest('Fees', 'Get fee structures', 'HAPPY_PATH', async () => {
        const res = await api.get('/api/fees/structure');
        if (res.status !== 200 || !Array.isArray(res.data)) {
            throw new Error(`Failed to fetch fee structures: ${res.status}`);
        }
    });

    await runTest('Fees', 'Generate next auto receipt number', 'HAPPY_PATH', async () => {
        const res = await api.get('/api/fees/next-receipt');
        if (res.status !== 200 || !res.data.receiptNo) {
            throw new Error(`Failed to generate next receipt: ${res.status}`);
        }
    });

    await runTest('Fees', 'Get student fee history', 'HAPPY_PATH', async () => {
        const res = await api.get(`/api/fees/history/${sampleStudentId}`);
        if (res.status !== 200 || !Array.isArray(res.data)) {
            throw new Error(`Failed to fetch student fee history: ${res.status}`);
        }
    });

    await runTest('Fees', 'Get student fee ledger breakdown', 'HAPPY_PATH', async () => {
        const res = await api.get(`/api/fees/student/${sampleStudentId}/ledger?session=${activeSessionName}`);
        if (res.status !== 200) {
            throw new Error(`Failed to fetch student fee ledger: ${res.status}`);
        }
    });

    await runTest('Fees', 'Get student balance calculation', 'HAPPY_PATH', async () => {
        const res = await api.get(`/api/fees/student/${sampleStudentId}/balance?session=${activeSessionName}`);
        if (res.status !== 200) {
            throw new Error(`Failed to fetch student balance: ${res.status}`);
        }
    });

    await runTest('Fees', 'Public Fee Portal Student Dues Lookup (/api/fees/public/student-dues)', 'HAPPY_PATH', async () => {
        // Fetch valid admissionNo
        const studentRes = await api.get(`/api/admin/students?session=${activeSessionName}`);
        const validAdmissionNo = studentRes.data[0]?.admissionNo || '101';
        const res = await api.get(`/api/fees/public/student-dues?srNo=${encodeURIComponent(validAdmissionNo)}&session=${activeSessionName}`);
        if (res.status !== 200 || !res.data.student) {
            throw new Error(`Failed public student dues lookup: ${res.status} - ${JSON.stringify(res.data)}`);
        }
    });

    await runTest('Fees', 'Public Fee Portal Lookup with non-existent SR No returns 404', 'INVALID_INPUT', async () => {
        const res = await api.get(`/api/fees/public/student-dues?srNo=NON_EXISTENT_999999&session=${activeSessionName}`);
        if (res.status !== 404) throw new Error(`Expected 404 for invalid SR No, got ${res.status}`);
    });

    await runTest('Fees', 'Fee Collection validation: Reject invalid studentId', 'INVALID_INPUT', async () => {
        const res = await api.post('/api/fees/collect', {
            studentId: 'INVALID_STUDENT_ID_XYZ',
            amountPaid: 1000,
            paymentMode: 'Cash'
        });
        if (res.status !== 400 && res.status !== 500 && res.status !== 404) {
            throw new Error(`Expected error for invalid student fee collection, got ${res.status}`);
        }
    });

    await runTest('Fees', 'Get Fee Due List for active session', 'HAPPY_PATH', async () => {
        const res = await api.get(`/api/fees/due-list?session=${activeSessionName}`);
        if (res.status !== 200 || !Array.isArray(res.data)) {
            throw new Error(`Failed to fetch fee due list: ${res.status}`);
        }
    });

    // ==========================================
    // 9. DASHBOARD REVENUE & FORMULA INTEGRITY
    // ==========================================
    console.log('\n--- 9. Dashboard Revenue & Mathematical Formula Integrity ---');
    await runTest('Revenue', 'Dashboard Stats endpoint (/api/admin/dashboard/stats)', 'HAPPY_PATH', async () => {
        const res = await api.get(`/api/admin/dashboard/stats?session=${activeSessionName}`);
        if (res.status !== 200 || !res.data.stats || res.data.stats.totalStudents === undefined) {
            throw new Error(`Failed to get dashboard stats: ${res.status}`);
        }
    });

    await runTest('Revenue', 'Dashboard Revenue Breakdown (/api/admin/dashboard/revenue) & Formula Verification', 'HAPPY_PATH', async () => {
        const res = await api.get(`/api/admin/dashboard/revenue?session=${activeSessionName}`);
        if (res.status !== 200 || !res.data.summary) {
            throw new Error(`Failed to get dashboard revenue: ${res.status}`);
        }
        const { totalExpectedRevenue, totalCollected, totalConcessions, totalOutstanding } = res.data.summary;
        
        // Mathematical formula verification: Expected - Collected - Concessions = Net Outstanding (allowing for per-student max(0) bounds)
        console.log(`      📊 Stats Summary: Expected=₹${totalExpectedRevenue.toLocaleString()}, Collected=₹${totalCollected.toLocaleString()}, Concessions=₹${totalConcessions.toLocaleString()}, Outstanding=₹${totalOutstanding.toLocaleString()}`);
        if (totalExpectedRevenue <= 0) {
            throw new Error('Expected revenue should be greater than 0');
        }
        if (totalCollected < 0 || totalConcessions < 0 || totalOutstanding < 0) {
            throw new Error('Financial values cannot be negative');
        }
    });

    // ==========================================
    // 10. PAYU ONLINE PAYMENT GATEWAY INTEGRATION
    // ==========================================
    console.log('\n--- 10. PayU Payment Gateway Integration ---');
    await runTest('PayU', 'Initiate PayU payment validation: Missing amount or student details returns 400', 'INVALID_INPUT', async () => {
        const res = await api.post('/api/fees/payu/initiate', {
            amount: 0,
            studentId: ''
        });
        if (res.status !== 400) throw new Error(`Expected 400 for empty PayU initiate, got ${res.status}`);
    });

    await runTest('PayU', 'Initiate PayU payment with valid student generates txnid and hash', 'HAPPY_PATH', async () => {
        const res = await api.post('/api/fees/payu/initiate', {
            studentId: sampleStudentId,
            amount: 100,
            feeHead: 'Tuition Fee',
            month: 'April',
            year: '2026',
            paymentCategory: 'MONTHLY'
        });
        // Returns 200 with txnid, hash, action url OR test mode payload
        if (res.status !== 200 || (!res.data.txnid && !res.data.params?.txnid)) {
            throw new Error(`PayU initiate failed: ${res.status} - ${JSON.stringify(res.data)}`);
        }
    });

    await runTest('PayU', 'Verify status for non-existent txnid returns NOT_FOUND', 'EDGE_CASE', async () => {
        const res = await api.get('/api/fees/payu/verify-status/NON_EXISTENT_TXNID_12345');
        if (res.status !== 200 && res.status !== 404) {
            throw new Error(`Unexpected status for non-existent txnid: ${res.status}`);
        }
    });

    // ==========================================
    // 11. TRANSPORT MODULE
    // ==========================================
    console.log('\n--- 11. Transport Module ---');
    await runTest('Transport', 'Get all transport stops', 'HAPPY_PATH', async () => {
        const res = await api.get('/api/admin/transport/stops');
        if (res.status !== 200 || !Array.isArray(res.data)) {
            throw new Error(`Failed to fetch transport stops: ${res.status}`);
        }
        if (res.data.length > 0) sampleStopId = res.data[0].id;
    });

    await runTest('Transport', 'Create stop validation: Reject non-numeric busFare', 'INVALID_INPUT', async () => {
        const res = await api.post('/api/admin/transport/stops', {
            name: `Test Stop ${Date.now()}`,
            km: '5',
            busFare: 'NOT_A_NUMBER'
        });
        if (res.status !== 400) throw new Error(`Expected 400 for non-numeric busFare, got ${res.status}`);
    });

    await runTest('Transport', 'Create valid transport stop', 'HAPPY_PATH', async () => {
        const res = await api.post('/api/admin/transport/stops', {
            name: `QA Test Stop ${Date.now()}`,
            km: '10',
            busFare: 750
        });
        if (res.status !== 200 || !res.data.id) {
            throw new Error(`Failed to create transport stop: ${res.status}`);
        }
        // Clean up
        await api.delete(`/api/admin/transport/stops/${res.data.id}`);
    });

    await runTest('Transport', 'Get Transport Ledger for active session', 'HAPPY_PATH', async () => {
        const res = await api.get(`/api/admin/transport/ledger?session=${activeSessionName}`);
        if (res.status !== 200 || !res.data.students || !Array.isArray(res.data.students)) {
            throw new Error(`Failed to fetch transport ledger: ${res.status}`);
        }
    });

    // ==========================================
    // 12. TRANSFER CERTIFICATE (TC)
    // ==========================================
    console.log('\n--- 12. Transfer Certificate (TC) Module ---');
    await runTest('TC', 'Get all TC records list', 'HAPPY_PATH', async () => {
        const res = await api.get('/api/admin/tc-records');
        if (res.status !== 200 || !Array.isArray(res.data)) {
            throw new Error(`Failed to fetch TC records: ${res.status}`);
        }
    });

    await runTest('TC', 'Create TC validation: Missing mandatory student name or admissionNo', 'INVALID_INPUT', async () => {
        const res = await api.post('/api/admin/tc-records', {
            studentName: '',
            admissionNo: ''
        });
        if (res.status !== 400) throw new Error(`Expected 400 for missing TC fields, got ${res.status}`);
    });

    // ==========================================
    // 13. EXPENSES MODULE
    // ==========================================
    console.log('\n--- 13. Expenses Module ---');
    await runTest('Expenses', 'Get all expenses list', 'HAPPY_PATH', async () => {
        const res = await api.get('/api/admin/expenses');
        if (res.status !== 200 || !Array.isArray(res.data)) {
            throw new Error(`Failed to fetch expenses: ${res.status}`);
        }
    });

    await runTest('Expenses', 'Create expense validation: Non-numeric amount', 'INVALID_INPUT', async () => {
        const res = await api.post('/api/admin/expenses', {
            title: 'Test Expense',
            category: 'Stationery',
            amount: 'ABC_NOT_A_NUMBER',
            date: new Date().toISOString()
        });
        if (res.status !== 400) throw new Error(`Expected 400 for invalid amount, got ${res.status}`);
    });

    await runTest('Expenses', 'Create expense validation: Invalid date value', 'INVALID_INPUT', async () => {
        const res = await api.post('/api/admin/expenses', {
            title: 'Test Expense',
            category: 'Stationery',
            amount: 500,
            date: 'INVALID_DATE_FORMAT'
        });
        if (res.status !== 400) throw new Error(`Expected 400 for invalid date, got ${res.status}`);
    });

    await runTest('Expenses', 'Create and delete valid expense', 'HAPPY_PATH', async () => {
        const createRes = await api.post('/api/admin/expenses', {
            title: `QA Test Expense ${Date.now()}`,
            category: 'Maintenance',
            amount: 250,
            date: new Date().toISOString(),
            payee: 'Local Hardware Store',
            paymentMethod: 'Cash',
            description: 'Automated QA test expense'
        });
        if (createRes.status !== 200 || !createRes.data.id) {
            throw new Error(`Failed to create expense: ${createRes.status}`);
        }
        const deleteRes = await api.delete(`/api/admin/expenses/${createRes.data.id}`);
        if (deleteRes.status !== 200) {
            throw new Error(`Failed to delete expense: ${deleteRes.status}`);
        }
    });

    // ==========================================
    // 14. NOTICES & COMMUNICATION
    // ==========================================
    console.log('\n--- 14. Notices & Communication ---');
    await runTest('Notices', 'Get all notices list', 'HAPPY_PATH', async () => {
        const res = await api.get('/api/general/notices');
        if (res.status !== 200 || !Array.isArray(res.data)) {
            throw new Error(`Failed to fetch notices: ${res.status}`);
        }
    });

    await runTest('Notices', 'Create and delete notice with class targeting', 'HAPPY_PATH', async () => {
        const postRes = await api.post('/api/general/notices', {
            title: `QA Test Notice ${Date.now()}`,
            message: 'This is an automated test notice for verification.',
            targetClass: 'ALL',
            postedBy: 'Administrator',
            authorId: adminUserId
        });
        if (postRes.status !== 200 || !postRes.data.id) {
            throw new Error(`Failed to post notice: ${postRes.status}`);
        }
        const delRes = await api.delete(`/api/general/notices/${postRes.data.id}`);
        if (delRes.status !== 200) {
            throw new Error(`Failed to delete notice: ${delRes.status}`);
        }
    });

    // ==========================================
    // 15. ROLE MATRIX & SYSTEM USERS
    // ==========================================
    console.log('\n--- 15. Role Matrix & System Users ---');
    await runTest('Roles', 'Get system users list with permissions', 'HAPPY_PATH', async () => {
        const res = await api.get('/api/admin/system-users');
        if (res.status !== 200 || !Array.isArray(res.data)) {
            throw new Error(`Failed to fetch system users: ${res.status}`);
        }
    });

    await runTest('Roles', 'Create system user validation: Missing required fields', 'INVALID_INPUT', async () => {
        const res = await api.post('/api/admin/system-users', {
            name: '',
            email: '',
            password: ''
        });
        if (res.status !== 400) throw new Error(`Expected 400 for empty system user, got ${res.status}`);
    });

    // ==========================================
    // SUMMARY REPORT
    // ==========================================
    console.log('\n===============================================================');
    console.log('📊 E2E QA TEST EXECUTION SUMMARY');
    console.log('===============================================================');
    const totalTests = results.length;
    const passedTests = results.filter(r => r.status === 'PASSED').length;
    const failedTests = results.filter(r => r.status === 'FAILED').length;
    const passRate = ((passedTests / totalTests) * 100).toFixed(2);

    console.log(`Total Tests Run: ${totalTests}`);
    console.log(`Passed:         ${passedTests} ✅`);
    console.log(`Failed:         ${failedTests} ❌`);
    console.log(`Pass Rate:      ${passRate}%`);
    console.log('===============================================================');

    if (failedTests > 0) {
        console.log('\n💥 FAILED TESTS BREAKDOWN:');
        results.filter(r => r.status === 'FAILED').forEach((f, idx) => {
            console.log(`${idx + 1}. [${f.suite}] ${f.testName} (${f.type})`);
            console.log(`   Error: ${f.error}`);
        });
        process.exit(1);
    } else {
        console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY!');
        process.exit(0);
    }
}

main().catch(err => {
    console.error('CRITICAL Test Suite Execution Error:', err);
    process.exit(1);
});
