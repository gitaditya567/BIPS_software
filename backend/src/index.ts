import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import prisma from './lib/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey12345';

import adminRoutes from './routes/admin';
import feeRoutes from './routes/fees';
import generalRoutes from './routes/general';
import teacherRoutes from './routes/teacher';

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Remove double slashes from URL (Nginx/aaPanel proxy quirk)
app.use((req, res, next) => {
    req.url = req.url.replace(/\/{2,}/g, '/');
    next();
});

// Health Check (Top Priority)
app.get('/api/health', async (req, res) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Health check from:`, req.ip, 'URL:', req.originalUrl);
    try {
        await prisma.user.findFirst();
        res.json({ 
            status: 'ok', 
            database: 'connected',
            timestamp,
            pid: process.pid,
            message: 'School ERP API is running' 
        });
    } catch (error) {
        res.status(503).json({ 
            status: 'error', 
            database: 'disconnected',
            timestamp,
            pid: process.pid,
            message: 'API is running but database reachable issue' 
        });
    }
});

app.get('/api/debug-routes', (req, res) => {
    const routes: any[] = [];
    app._router.stack.forEach((middleware: any) => {
        if (middleware.route) { // routes registered directly on the app
            routes.push(`${Object.keys(middleware.route.methods).join(',').toUpperCase()} ${middleware.route.path}`);
        } else if (middleware.name === 'router') { // router middleware
            middleware.handle.stack.forEach((handler: any) => {
                const route = handler.route;
                if (route) {
                    routes.push(`${Object.keys(route.methods).join(',').toUpperCase()} ${middleware.regexp.toString().replace('/^\\', '').replace('\\/i', '')}${route.path}`);
                }
            });
        }
    });
    res.json({ pid: process.pid, routes });
});

// Routes
app.use('/api/admin', adminRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/general', generalRoutes);
app.use('/api/teacher', teacherRoutes);

// Fallback Routes for stripped prefixes (aaPanel)
app.use('/admin', adminRoutes);
app.use('/fees', feeRoutes);
app.use('/general', generalRoutes);
app.use('/teacher', teacherRoutes);



// Admin Login
const loginHandler = async (req: express.Request, res: express.Response): Promise<any> => {
    try {
        console.log('Login attempt received:', req.body);
        const { email, password, role } = req.body;
        let user;

        if (role === 'PARENT') {
            // Login using admissionNo (SR No)
            const profile = await prisma.studentProfile.findUnique({
                where: { admissionNo: email }, // In parent mode, 'email' field actually contains SR No
                include: { user: true }
            });

            if (!profile) {
                return res.status(401).json({ error: 'Invalid SR No' });
            }
            user = profile.user;
        } else {
            // Check if user exists by email
            user = await prisma.user.findUnique({
                where: { email }
            });

            if (!user) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            if (user.role !== role) {
                return res.status(401).json({ error: 'Role mismatch' });
            }
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Fetch full profile if it's a student/parent login
        const fullUser = await prisma.user.findUnique({
            where: { id: user.id },
            include: {
                studentProfile: {
                    include: {
                        user: true,
                        class: true,
                        section: true
                    }
                },
                teacherProfile: true
            }
        });

        if (!fullUser) return res.status(401).json({ error: 'User not found' });

        // Generate JWT
        const token = jwt.sign(
            { id: fullUser.id, email: fullUser.email, role: role === 'PARENT' ? 'PARENT' : fullUser.role },
            JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: fullUser.id,
                email: fullUser.email,
                name: fullUser.name,
                role: role === 'PARENT' ? 'PARENT' : fullUser.role,
                studentInfo: fullUser.studentProfile,
                teacherInfo: fullUser.teacherProfile
            }
        });

    } catch (error) {
        console.error('CRITICAL Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

app.post('/api/login', loginHandler);
app.post('/login', loginHandler);
app.post('//login', loginHandler);

// Expenses Routes
app.get('/api/admin/expenses', async (req, res) => {
    try {
        const expenses = await prisma.expense.findMany({
            orderBy: { date: 'desc' }
        });
        res.json(expenses);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch expenses' });
    }
});

app.post('/api/admin/expenses', async (req, res) => {
    try {
        const { title, category, amount, date, payee, paymentMethod, description } = req.body;
        
        // Validation
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount)) {
            return res.status(400).json({ error: 'Invalid amount value' });
        }

        const parsedDate = new Date(date);
        if (isNaN(parsedDate.getTime())) {
            return res.status(400).json({ error: 'Invalid date value' });
        }

        const expense = await prisma.expense.create({
            data: {
                title: title || 'Untitled Expense',
                category: category || 'General',
                amount: parsedAmount,
                date: parsedDate,
                payee,
                paymentMethod,
                description
            }
        });
        res.json(expense);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create expense' });
    }
});

app.delete('/api/admin/expenses/:id', async (req, res) => {
    try {
        await prisma.expense.delete({
            where: { id: req.params.id }
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete expense' });
    }
});

// 404 Catch-all for /api
app.use('/api', (req, res) => {
    console.warn(`404 Not Found in API: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ 
        error: `API route not found: ${req.method} ${req.originalUrl}`,
        availableRoutes: ['/api/admin', '/api/fees', '/api/general', '/api/teacher', '/api/login', '/api/health']
    });
});

app.listen(Number(PORT), '0.0.0.0', async () => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Server running on http://127.0.0.1:${PORT} (PID: ${process.pid})`);
    try {
        await prisma.$connect();
        console.log('✅ Connected to MongoDB Atlas successfully');
        
        // Quick connection test
        await prisma.user.findFirst();
        console.log('✅ Database connection verified');
    } catch (error) {
        console.error('❌ Database connection failed:', error);
    }
});
