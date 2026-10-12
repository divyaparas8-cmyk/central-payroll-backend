const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
app.set('trust proxy', 1);
const port = process.env.PORT || 5002;

// Security Headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "checkout.razorpay.com", "cdn.jsdelivr.net"],
            frameSrc: ["'self'", "checkout.razorpay.com"],
            imgSrc: ["'self'", "data:", "https:", "http:"],
            connectSrc: ["'self'", "http://localhost:*"],
            styleSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net"],
            fontSrc: ["'self'", "data:"],
        },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
}));

// Rate limiting for auth routes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { status: 'error', message: 'Too many requests from this IP, please try again after 15 minutes' }
});

// Rate limiting for payment verification routes
const paymentLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 20,
    message: { status: 'error', message: 'Too many payment attempts, please try again after 5 minutes' }
});

// CORS Configuration
const allowedOrigins = [process.env.FRONTEND_URL, 'http://localhost:5174', 'http://localhost:5173', 'http://localhost:3000'].filter(Boolean);
app.use(cors({
    origin: function (origin, callback) {
        // Allow mobile app requests (no origin or exp:// or any local IP)
        callback(null, true);
    },
    credentials: true
}));

// Body Parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const path = require('path');
const { protect } = require('./middlewares/authMiddleware');
const { errorHandler } = require('./middlewares/errorHandler');
const { subscriptionMiddleware } = require('./middlewares/subscriptionMiddleware');

const { auditPerformanceMiddleware } = require('./middlewares/auditMiddleware');
app.use(auditPerformanceMiddleware);

const fs = require('fs');

// Serve static files from uploads and public directories
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// Direct APK Download Endpoint
app.get('/api/v1/system/download-apk', (req, res) => {
    const apkPath = path.join(__dirname, 'public', 'PetCare_Veterinary.apk');
    if (fs.existsSync(apkPath)) {
        res.download(apkPath, 'PetCare_Veterinary.apk');
    } else {
        res.status(404).json({ status: 'error', message: 'APK file not found on server' });
    }
});

// Routes
const authRoutes = require('./routes/authRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const petOwnerRoutes = require('./routes/petOwnerRoutes');
const petRoutes = require('./routes/petRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const userRoutes = require('./routes/userRoutes');
const homeVisitRoutes = require('./routes/homeVisitRoutes');
const encounterRoutes = require('./routes/encounterRoutes');
const treatmentNoteRoutes = require('./routes/treatmentNoteRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const reportRoutes = require('./routes/reportRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const assistanceTaskRoutes = require('./routes/assistanceTaskRoutes');
const superAdminRoutes = require('./routes/superAdminRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const supportTicketRoutes = require('./routes/supportTicketRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const hospitalizationRoutes = require('./routes/hospitalizationRoutes');
const auditRoutes = require('./routes/auditRoutes');
const systemRoutes = require('./routes/systemRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const messagingRoutes = require('./routes/messagingRoutes');
const permissionRoutes = require('./routes/permissionRoutes');

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/v1/subscriptions', subscriptionRoutes);
// Apply subscription middleware to all protected API routes
app.use('/api/v1/permissions', protect, subscriptionMiddleware, permissionRoutes);
app.use('/api/v1/inventory', protect, subscriptionMiddleware, inventoryRoutes);
app.use('/api/v1/owners', protect, subscriptionMiddleware, petOwnerRoutes);
app.use('/api/v1/pets', protect, subscriptionMiddleware, petRoutes);
app.use('/api/v1/appointments', protect, subscriptionMiddleware, appointmentRoutes);
app.use('/api/v1/users', protect, subscriptionMiddleware, userRoutes);
app.use('/api/v1/home-visits', protect, subscriptionMiddleware, homeVisitRoutes);
app.use('/api/v1/encounters', protect, subscriptionMiddleware, encounterRoutes);
app.use('/api/v1/treatment-notes', protect, subscriptionMiddleware, treatmentNoteRoutes);
app.use('/api/v1/invoices', protect, subscriptionMiddleware, invoiceRoutes);
app.use('/api/v1/attendance', protect, subscriptionMiddleware, attendanceRoutes);
app.use('/api/v1/reports', protect, subscriptionMiddleware, reportRoutes);
app.use('/api/v1/notifications', protect, subscriptionMiddleware, notificationRoutes);
app.use('/api/v1/messaging', protect, subscriptionMiddleware, messagingRoutes);
app.use('/api/v1/settings', protect, subscriptionMiddleware, settingsRoutes);
app.use('/api/v1/assistance-tasks', protect, subscriptionMiddleware, assistanceTaskRoutes);
app.use('/api/v1/support-tickets', protect, supportTicketRoutes);
app.use('/api/v1/dashboard', protect, subscriptionMiddleware, dashboardRoutes);
app.use('/api/v1/hospitalization', protect, subscriptionMiddleware, hospitalizationRoutes);
app.use('/api/v1/audit-logs', auditRoutes);
app.use('/api/v1/system', systemRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/payment', paymentLimiter, paymentRoutes);
app.use('/api/v1/payment', paymentLimiter, paymentRoutes);

// Root Health Check
app.get('/', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Veterinary SaaS Backend is live' });
});

// Health check
app.get('/api/health', async (req, res) => {
    try {
        const db = require('./config/db');
        const [rows] = await db.query('SELECT 1 + 1 AS solution');
        res.json({ status: 'Database connected successfully!', data: rows[0] });
    } catch (error) {
        console.error('Database connection failed:', error);
        res.status(500).json({ status: 'Database connection failed', error: error.message });
    }
});

// Global Error Handler
app.use(errorHandler);

// Start Server
app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);

    // Auto-seed Demo Clinic & Users on startup
    try {
        const { seedDemoClinicAndStaff } = require('./seed_demo_users');
        seedDemoClinicAndStaff().catch(e => console.error('Seed demo users failed:', e.message));
    } catch (err) {
        console.error('Failed to trigger demo user seeding:', err.message);
    }

    // Start Cron Jobs
    try {
        const { startCron } = require('./cron/subscriptionCron');
        startCron();
        console.log('✅ Subscription expiry cron started (24h interval)');
    } catch (err) {
        console.error('Failed to start subscription cron:', err.message);
    }

    try {
        const { startWeeklyReportCron } = require('./cron/weeklyReportCron');
        startWeeklyReportCron();
        console.log('✅ Weekly 7-day report cron started (7-day interval)');
    } catch (err) {
        console.error('Failed to start weekly report cron:', err.message);
    }

    // Restore active WhatsApp Web Sessions
    try {
        const { restoreSessionsOnStartup } = require('./services/whatsappService');
        restoreSessionsOnStartup();
        console.log('✅ WhatsApp session restorer initialized');
    } catch (err) {
        console.error('Failed to restore WhatsApp sessions:', err.message);
    }
});
