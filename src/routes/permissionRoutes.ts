import express from 'express';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        roles: ['superadmin', 'admin', 'staff'],
        defaultMatrix: {
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
          settings: { view: true, edit: true }
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
