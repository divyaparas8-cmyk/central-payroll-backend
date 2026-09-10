import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import employeeRoutes from './routes/employeeRoutes';
import scheduleRoutes from './routes/scheduleRoutes';
import leaveRoutes from './routes/leaveRoutes';
import payrollRoutes from './routes/payrollRoutes';
import reportRoutes from './routes/reportRoutes';
import emailRoutes from './routes/emailRoutes';
import { errorHandler } from './middleware/errorHandler';
import { mySQLDb } from './db/mysqlDatabase';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Central Dispatch Payroll API Server is connected to MySQL (payroll_db @ 127.0.0.1:3307)',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/email', emailRoutes);

// Error Handling Middleware
app.use(errorHandler);

// Initialize MySQL Tables & Start Server
(async () => {
  await mySQLDb.initDatabase();

  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 Central Dispatch Payroll MySQL Backend Server Running!`);
    console.log(`📡 URL: http://localhost:${PORT}`);
    console.log(`🗄  Database: MySQL (payroll_db @ 127.0.0.1:3307)`);
    console.log(`🔍 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`=======================================================`);
  });
})();
