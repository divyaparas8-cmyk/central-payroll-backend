import express from 'express';

const router = express.Router();

export const superAdminPermissions = {
  dashboard: { view: true },
  employees: { view: true, create: true, edit: true, delete: true }, // Staff Management & Pay Rates
  payroll: { view: true, edit: true, approve: true, export: true }, // Payroll Calculation & Approval
  schedules: { view: true, edit: true, print: true, addNotes: true }, // Weekly Schedules & Notes
  leave: { view: true, manage: true }, // Leave Calendars
  contacts: { view: true, edit: true }, // Staff Contact Details
  reports: { view: true, export: true }, // Payroll Reports
  payslips: { view: true, print: true, email: true }, // Payslips
  audit: { view: true, export: true }, // Audit Reports
  permissions: { view: true, edit: true }, // Permissions Administration
  userAccounts: { view: true, manage: true }, // User Accounts Administration
  settings: { view: true, edit: true }, // Company Profile & Settings
  accounts: { view: true, edit: true }, // Customer Invoices & General Ledger
  myTime: { view: true, clock: true, export: true } // Time Records
};

export const adminPermissions = {
  dashboard: { view: true },
  employees: { view: true, create: true, edit: true, delete: true }, // Staff Management & Pay Rates (Kept for Admin)
  contacts: { view: true, edit: true }, // Staff Contact Details
  schedules: { view: true, edit: true, print: true, addNotes: true }, // Weekly Schedules & Rotas
  leave: { view: true, manage: true }, // Leave Calendars
  accounts: { view: true, edit: true }, // Customer Invoices, Payments & General Ledger
  myTime: { view: true, clock: false, export: true }, // Time Records (View/Export)
  settings: { view: true, edit: true }, // Company Settings
  audit: { view: true, export: true }, // Audit Logging
  payroll: { view: false, edit: false, approve: false, export: false }, // Strictly REMOVED from Admin (Super Admin only)
  reports: { view: false, export: false }, // Strictly REMOVED from Admin (Super Admin only)
  payslips: { view: false, print: false, email: false }, // Strictly REMOVED from Admin (Super Admin only)
  permissions: { view: false, edit: false }, // Strictly NO permissions administration (Super Admin only)
  userAccounts: { view: false, manage: false } // Strictly NO user-account administration (Super Admin only)
};

export const staffPermissions = {
  dashboard: { view: false },
  employees: { view: false, create: false, edit: false, delete: false },
  payroll: { view: false, edit: false, approve: false, export: false },
  schedules: { view: true, edit: false, print: false, addNotes: true }, // Staff can view weekly schedules & write notes
  leave: { view: false, manage: false },
  contacts: { view: false, edit: false },
  reports: { view: false, export: false },
  payslips: { view: false, print: false, email: false },
  audit: { view: false, export: false },
  permissions: { view: false, edit: false },
  userAccounts: { view: false, manage: false },
  settings: { view: false, edit: false },
  accounts: { view: false },
  myTime: { view: false, clock: false, export: false } // Clock-in/clock-out removed per client directive
};

router.get('/', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        roles: ['superadmin', 'admin', 'staff'],
        rolePermissions: {
          superadmin: superAdminPermissions,
          admin: adminPermissions,
          staff: staffPermissions
        },
        matrix: superAdminPermissions
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
