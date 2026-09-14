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

// =======================================================
// 1. WORKSPACE MENU REST APIS (Named after each menu)
// =======================================================
// Menu: "Dashboard"
app.use('/api/dashboard', dashboardRoutes);

// Menu: "Employees"
app.use('/api/employees', employeesRoutes);

// Menu: "Payroll"
app.use('/api/payroll', payrollRoutes);

// Menu: "Leave Calendars"
app.use('/api/leave-calendars', leaveCalendarsRoutes);
app.use('/api/leave', leaveCalendarsRoutes);

// Menu: "Staff Contact Details"
app.use('/api/staff-contact-details', staffContactDetailsRoutes);
app.use('/api/contacts', staffContactDetailsRoutes);

// Menu: "Weekly Schedules"
app.use('/api/weekly-schedules', weeklySchedulesRoutes);
app.use('/api/schedules', weeklySchedulesRoutes);

// Menu: "Payroll Reports"
app.use('/api/payroll-reports', payrollReportsRoutes);
app.use('/api/reports', payrollReportsRoutes);

// Menu: "Audit Reports"
app.use('/api/audit-reports', auditReportsRoutes);
app.use('/api/audit', auditReportsRoutes);

// Menu: "Payslips"
app.use('/api/payslips', payslipsRoutes);


// =======================================================
// 2. CUSTOMERS & ACCOUNTS MENU REST APIS (Named after each menu)
// =======================================================
// Menu: "Accounts Overview"
app.use('/api/accounts-overview', accountsOverviewRoutes);
app.use('/api/accounts', accountsOverviewRoutes);

// Menu: "Customers & Ledgers"
app.use('/api/customers-and-ledgers', customersAndLedgersRoutes);
app.use('/api/customers', customersAndLedgersRoutes);

// Menu: "Create Invoice"
app.use('/api/create-invoice', createInvoiceRoutes);
app.use('/api/invoices', createInvoiceRoutes);

// Menu: "Record Payment"
app.use('/api/record-payment', recordPaymentRoutes);
app.use('/api/payments', recordPaymentRoutes);

// Menu: "A/R Aging"
app.use('/api/ar-aging', arAgingRoutes);
app.use('/api/aging', arAgingRoutes);

// Menu: "General Ledger"
app.use('/api/general-ledger', generalLedgerRoutes);
app.use('/api/ledger', generalLedgerRoutes);

// =======================================================
// 3. ADMINISTRATION & SYSTEM REST APIS
// =======================================================
// Menu: "Permissions"
app.use('/api/permissions', permissionsRoutes);

// Menu: "User Accounts"
app.use('/api/user-accounts', userAccountsRoutes);
app.use('/api/users', userAccountsRoutes);

// Menu: "Settings"
app.use('/api/settings', settingsRoutes);

// System: Auth & Email
app.use('/api/auth', authRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/accounting', accountingRoutes);

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
