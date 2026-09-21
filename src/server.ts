import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import dashboardRoutes from './routes/dashboardRoutes';
import employeesRoutes from './routes/employeesRoutes';
import payrollRoutes from './routes/payrollRoutes';
import leaveCalendarsRoutes from './routes/leaveCalendarsRoutes';
import staffContactDetailsRoutes from './routes/staffContactDetailsRoutes';
import weeklySchedulesRoutes from './routes/weeklySchedulesRoutes';
import payrollReportsRoutes from './routes/payrollReportsRoutes';
import auditReportsRoutes from './routes/auditReportsRoutes';
import payslipsRoutes from './routes/payslipsRoutes';
import accountsOverviewRoutes from './routes/accountsOverviewRoutes';
import customersAndLedgersRoutes from './routes/customersAndLedgersRoutes';
import createInvoiceRoutes from './routes/createInvoiceRoutes';
import recordPaymentRoutes from './routes/recordPaymentRoutes';
import arAgingRoutes from './routes/arAgingRoutes';
import generalLedgerRoutes from './routes/generalLedgerRoutes';
import permissionsRoutes from './routes/permissionsRoutes';
import userAccountsRoutes from './routes/userAccountsRoutes';
import settingsRoutes from './routes/settingsRoutes';
import authRoutes from './routes/authRoutes';
import emailRoutes from './routes/emailRoutes';
import accountingRoutes from './routes/accountingRoutes';
import { errorHandler } from './middleware/errorHandler';
import { requireAuth, requireRole, requirePermission } from './middleware/authMiddleware';
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

// Health Check Route (Public)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Central Dispatch Payroll API Server is connected to MySQL (payroll_db @ 127.0.0.1:3307)',
    timestamp: new Date().toISOString()
  });
});

// Authentication Routes (Public login)
app.use('/api/auth', authRoutes);

// =======================================================
// 1. WORKSPACE MENU REST APIS (Role Protected)
// =======================================================
// Menu: "Dashboard"
app.use('/api/dashboard', requireAuth, requirePermission('dashboard'), dashboardRoutes);

// Menu: "Employees" & "Staff Contact Details"
app.use('/api/employees', requireAuth, employeesRoutes);
app.use('/api/staff-contact-details', requireAuth, requirePermission('contacts'), staffContactDetailsRoutes);
app.use('/api/contacts', requireAuth, requirePermission('contacts'), staffContactDetailsRoutes);

// Menu: "Payroll" (Superadmin authority)
app.use('/api/payroll', requireAuth, requirePermission('payroll'), payrollRoutes);

// Menu: "Leave Calendars"
app.use('/api/leave-calendars', requireAuth, requirePermission('leave'), leaveCalendarsRoutes);
app.use('/api/leave', requireAuth, requirePermission('leave'), leaveCalendarsRoutes);

// Menu: "Weekly Schedules" (Superadmin, Admin, and Staff Roster)
app.use('/api/weekly-schedules', weeklySchedulesRoutes);
app.use('/api/schedules', weeklySchedulesRoutes);

// Menu: "Payroll Reports" & "Payslips"
app.use('/api/payroll-reports', requireAuth, requirePermission('reports'), payrollReportsRoutes);
app.use('/api/reports', requireAuth, requirePermission('reports'), payrollReportsRoutes);
app.use('/api/payslips', requireAuth, requirePermission('payslips'), payslipsRoutes);

// Menu: "Audit Reports"
app.use('/api/audit-reports', requireAuth, requirePermission('audit'), auditReportsRoutes);
app.use('/api/audit', requireAuth, requirePermission('audit'), auditReportsRoutes);

// =======================================================
// 2. CUSTOMERS & ACCOUNTS MENU REST APIS (Role Protected)
// =======================================================
// Menu: "Accounts Overview"
app.use('/api/accounts-overview', requireAuth, requirePermission('accounts'), accountsOverviewRoutes);
app.use('/api/accounts', requireAuth, requirePermission('accounts'), accountsOverviewRoutes);

// Menu: "Customers & Ledgers"
app.use('/api/customers-and-ledgers', requireAuth, requirePermission('accounts'), customersAndLedgersRoutes);
app.use('/api/customers', requireAuth, requirePermission('accounts'), customersAndLedgersRoutes);

// Menu: "Create Invoice"
app.use('/api/create-invoice', requireAuth, requirePermission('accounts'), createInvoiceRoutes);
app.use('/api/invoices', requireAuth, requirePermission('accounts'), createInvoiceRoutes);

// Menu: "Record Payment"
app.use('/api/record-payment', requireAuth, requirePermission('accounts'), recordPaymentRoutes);
app.use('/api/payments', requireAuth, requirePermission('accounts'), recordPaymentRoutes);

// Menu: "A/R Aging"
app.use('/api/ar-aging', requireAuth, requirePermission('audit'), arAgingRoutes);
app.use('/api/aging', requireAuth, requirePermission('audit'), arAgingRoutes);

// Menu: "General Ledger"
app.use('/api/general-ledger', requireAuth, requirePermission('audit'), generalLedgerRoutes);
app.use('/api/ledger', requireAuth, requirePermission('audit'), generalLedgerRoutes);

// System Accounting & Email
app.use('/api/email', requireAuth, emailRoutes);
app.use('/api/accounting', requireAuth, requirePermission('accounts'), accountingRoutes);

// =======================================================
// 3. ADMINISTRATION & SYSTEM REST APIS
// =======================================================
// Menu: "Permissions" (GET for authenticated users, POST/PUT/Reset for Super Admin)
app.use('/api/permissions', permissionsRoutes);

// Menu: "User Accounts"
app.use('/api/user-accounts', userAccountsRoutes);
app.use('/api/users', userAccountsRoutes);

// Menu: "Settings"
app.use('/api/settings', requireAuth, requirePermission('settings'), settingsRoutes);

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
