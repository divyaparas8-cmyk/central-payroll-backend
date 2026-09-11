import express from 'express';

const router = express.Router();

export const superAdminPermissions = {
  dashboard: { view: true },
  employees: { view: true, create: true, edit: true, delete: true },
  payroll: { view: true, edit: true, approve: true, export: true },
  schedules: { view: true, edit: true, print: true },
  leave: { view: true, manage: true },
  contacts: { view: true, edit: true },
  reports: { view: true, export: true },
  payslips: { view: true, print: true, email: true },
  audit: { view: true, export: true },
  permissions: { view: true, edit: true },
  userAccounts: { view: true, manage: true },
  settings: { view: true, edit: true },
  accounts: { view: true },
  myTime: { view: true, clock: true, export: true }
};

export const adminPermissions = {
  dashboard: { view: true },
  employees: { view: true, create: true, edit: true, delete: true },
  payroll: { view: true, edit: true, approve: true, export: true },
  schedules: { view: true, edit: true, print: true },
  leave: { view: true, manage: true },
  contacts: { view: true, edit: true },
  reports: { view: true, export: true },
  payslips: { view: true, print: true, email: true },
  audit: { view: true, export: true },
  permissions: { view: false, edit: false }, // Strictly NO permissions administration
  userAccounts: { view: false, manage: false }, // Strictly NO user-account administration
  settings: { view: true, edit: true },
  accounts: { view: true },
  myTime: { view: true, clock: true, export: true }
};

export const staffPermissions = {
  dashboard: { view: false },
  employees: { view: false, create: false, edit: false, delete: false },
  payroll: { view: false, edit: false, approve: false, export: false },
  schedules: { view: false, edit: false, print: false },
  leave: { view: false, manage: false },
  contacts: { view: false, edit: false },
  reports: { view: false, export: false },
  payslips: { view: false, print: false, email: false },
  audit: { view: false, export: false },
  permissions: { view: false, edit: false },
  userAccounts: { view: false, manage: false },
  settings: { view: false, edit: false },
  accounts: { view: false },
  myTime: { view: true, clock: true, export: true } // Staff only access to My Time
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
