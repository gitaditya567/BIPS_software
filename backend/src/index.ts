import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
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


app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'School ERP API is running' });
});

// Admin Login
const loginHandler = async (req: express.Request, res: express.Response): Promise<any> => {
    try {
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
                }
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
                studentInfo: fullUser.studentProfile
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

app.post('/api/login', loginHandler);
app.post('/login', loginHandler);
app.post('//login', loginHandler);

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
