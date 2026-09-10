import { Router, Request, Response } from 'express';
import { mySQLDb } from '../db/mysqlDatabase';
import { db } from '../db/database';
import { AuditLogItem } from '../types';

const router = Router();

// GET audit logs
router.get('/audit', async (req: Request, res: Response) => {
  try {
    const auditLogs = await mySQLDb.getAuditLogs();
    res.json({ success: true, auditLogs });
  } catch (err) {
    const auditLogs = db.getAuditLogs();
    res.json({ success: true, auditLogs });
  }
});

// POST save new audit log
router.post('/audit', async (req: Request, res: Response) => {
  const { action, module, user, role, details } = req.body;
  if (!action || !module || !user) {
    return res.status(400).json({ success: false, error: 'Action, module and user are required' });
  }

  const log: AuditLogItem = {
    id: req.body.id || `aud-${Date.now()}`,
    action,
    module,
    user,
    role: role || 'Admin',
    timestamp: new Date().toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' }),
    details: details || ''
  };

  try {
    await mySQLDb.saveAuditLog(log);
    res.status(201).json({ success: true, log });
  } catch (err) {
    const logs = db.getAuditLogs();
    logs.unshift(log);
    db.setAuditLogs(logs);
    res.status(201).json({ success: true, log });
  }
});

// GET overall system stats for dashboard / reports
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const employees = await mySQLDb.getEmployees();
    const periods = await mySQLDb.getPayrollPeriods();
    const leaves = await mySQLDb.getLeaves();

    const activeEmployees = employees.filter(e => e.status === 'Active').length;
    const currentPeriod = periods[0] || null;
    const employeesOnLeave = leaves.filter(l => l.status === 'Approved').length;

    res.json({
      success: true,
      summary: {
        totalEmployees: employees.length,
        activeEmployees,
        employeesOnLeave,
        currentPeriodStatus: currentPeriod ? currentPeriod.status : 'Draft',
        totalHours: currentPeriod ? currentPeriod.totalHours : 0,
        totalGrossPayroll: currentPeriod ? currentPeriod.totalGrossPayroll : 0,
        totalNetPayroll: currentPeriod ? currentPeriod.totalNetPayroll : 0
      }
    });
  } catch (err) {
    const employees = db.getEmployees();
    const periods = db.getPayrollPeriods();
    const leaves = db.getLeaves();

    const activeEmployees = employees.filter(e => e.status === 'Active').length;
    const currentPeriod = periods[0] || null;
    const employeesOnLeave = leaves.filter(l => l.status === 'Approved').length;

    res.json({
      success: true,
      summary: {
        totalEmployees: employees.length,
        activeEmployees,
        employeesOnLeave,
        currentPeriodStatus: currentPeriod ? currentPeriod.status : 'Draft',
        totalHours: currentPeriod ? currentPeriod.totalHours : 0,
        totalGrossPayroll: currentPeriod ? currentPeriod.totalGrossPayroll : 0,
        totalNetPayroll: currentPeriod ? currentPeriod.totalNetPayroll : 0
      }
    });
  }
});

export default router;
