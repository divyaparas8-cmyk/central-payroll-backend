import express from 'express';
import { mySQLDb } from '../db/mysqlDatabase';
import { requireAuth, requireRole } from '../middleware/authMiddleware';

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
  accounts: { view: true, edit: true } // Customer Invoices & General Ledger
};

export const defaultAdminPermissions = {
  dashboard: { view: false }, // Strictly Super Admin Only
  employees: { view: false, create: false, edit: false, delete: false }, // Controlled dynamically by superadmin
  contacts: { view: true, edit: true }, // Staff Contact Directory
  schedules: { view: true, edit: true, print: true, addNotes: true }, // Weekly Schedules & Staff Shift Matrix
  leave: { view: true, manage: true }, // Leave Calendars (Sick & Holiday)
  accounts: { view: true, edit: true }, // Customer Accounts, Invoices & Payments
  settings: { view: true, edit: true }, // Company Settings
  audit: { view: true, export: true }, // General Ledger & A/R Aging Reports
  payroll: { view: false, edit: false, approve: false, export: false }, // Strictly Super Admin by default
  reports: { view: false, export: false },
  payslips: { view: false, print: false, email: false },
  permissions: { view: false, edit: false }, // Strictly NO permissions administration
  userAccounts: { view: false, manage: false }
};

export const defaultStaffPermissions = {
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
  accounts: { view: false }
};

// GET /api/permissions (Accessible to authenticated users so all roles can fetch their active permissions)
router.get('/', async (req, res) => {
  let currentRolePermissions = {
    superadmin: superAdminPermissions,
    admin: { ...defaultAdminPermissions },
    staff: { ...defaultStaffPermissions }
  };

  try {
    const rawSaved = await mySQLDb.getSetting('role_permissions');
    if (rawSaved) {
      try {
        const parsed = JSON.parse(rawSaved);
        if (parsed && typeof parsed === 'object') {
          currentRolePermissions = {
            superadmin: superAdminPermissions, // Super admin always keeps full authority
            admin: { ...defaultAdminPermissions, ...(parsed.admin || {}) },
            staff: { ...defaultStaffPermissions, ...(parsed.staff || {}) }
          };
        }
      } catch (parseErr) {
        console.warn('Could not parse stored role_permissions:', parseErr);
      }
    }
  } catch (error: any) {
    console.warn('Could not load stored permissions from DB, using default matrix:', error.message);
  }

  res.json({
    success: true,
    data: {
      roles: ['superadmin', 'admin', 'staff'],
      rolePermissions: currentRolePermissions,
      matrix: currentRolePermissions.superadmin
    }
  });
});

// POST /api/permissions (Super Admin only)
router.post('/', requireAuth, requireRole(['superadmin']), async (req, res) => {
  try {
    const { rolePermissions } = req.body;
    if (!rolePermissions || typeof rolePermissions !== 'object') {
      return res.status(400).json({ success: false, message: 'Invalid rolePermissions payload' });
    }

    const sanitizedPermissions = {
      superadmin: superAdminPermissions, // Super Admin authority is locked & permanent
      admin: { ...defaultAdminPermissions, ...(rolePermissions.admin || {}) },
      staff: { ...defaultStaffPermissions, ...(rolePermissions.staff || {}) }
    };

    await mySQLDb.saveSetting('role_permissions', JSON.stringify(sanitizedPermissions));

    res.json({
      success: true,
      message: 'Role permissions saved successfully',
      data: {
        roles: ['superadmin', 'admin', 'staff'],
        rolePermissions: sanitizedPermissions,
        matrix: superAdminPermissions
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/permissions (Super Admin only)
router.put('/', requireAuth, requireRole(['superadmin']), async (req, res) => {
  try {
    const { rolePermissions } = req.body;
    const sanitizedPermissions = {
      superadmin: superAdminPermissions,
      admin: { ...defaultAdminPermissions, ...(rolePermissions?.admin || {}) },
      staff: { ...defaultStaffPermissions, ...(rolePermissions?.staff || {}) }
    };
    await mySQLDb.saveSetting('role_permissions', JSON.stringify(sanitizedPermissions));
    res.json({
      success: true,
      message: 'Role permissions updated successfully',
      data: { rolePermissions: sanitizedPermissions }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/permissions/reset (Super Admin only)
router.post('/reset', requireAuth, requireRole(['superadmin']), async (req, res) => {
  try {
    const defaultPermissions = {
      superadmin: superAdminPermissions,
      admin: defaultAdminPermissions,
      staff: defaultStaffPermissions
    };
    await mySQLDb.saveSetting('role_permissions', JSON.stringify(defaultPermissions));
    res.json({
      success: true,
      message: 'Role permissions reset to default successfully',
      data: { rolePermissions: defaultPermissions }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

