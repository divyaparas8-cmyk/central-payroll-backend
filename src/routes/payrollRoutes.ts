import { Router, Request, Response } from 'express';
import { mySQLDb } from '../db/mysqlDatabase';
import { db } from '../db/database';
import { PayrollPeriod } from '../types';

const router = Router();

// GET all payroll periods
router.get('/', async (req: Request, res: Response) => {
  try {
    let periods = await mySQLDb.getPayrollPeriods();
    if (periods.length === 0) {
      const employees = await mySQLDb.getEmployees();
      const today = new Date();
      const periodStart = today.toISOString().split('T')[0];
      const nextWeek = new Date(today.getTime() + 6 * 24 * 60 * 60 * 1000);
      const periodEnd = nextWeek.toISOString().split('T')[0];
      const payDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const initialDraft: PayrollPeriod = {
        id: `pay-${Date.now()}`,
        periodStart,
        periodEnd,
        payDate,
        status: 'Draft',
        totalHours: 0,
        totalGrossPayroll: 0,
        totalDeductions: 0,
        totalNetPayroll: 0,
        createdBy: 'Super Admin',
        createdAt: today.toISOString().split('T')[0],
        items: employees.map(emp => ({
          employeeId: emp.id || emp.employeeId,
          employeeName: emp.displayName,
          position: emp.position,
          department: emp.department,
          regularRate: emp.payRate || 0,
          regularHours: 40,
          regularPay: (emp.payRate || 0) * 40,
          holidayRate: emp.holidayRate || (emp.payRate || 0) * 1.5,
          holidayHours: 0,
          holidayPay: 0,
          otherPay: 0,
          deductions: 0,
          totalHours: 40,
          grossPay: (emp.payRate || 0) * 40,
          netPay: (emp.payRate || 0) * 40,
          status: 'Incomplete'
        }))
      };

      const totals = initialDraft.items.reduce((acc, i) => ({
        hours: acc.hours + i.totalHours,
        gross: acc.gross + i.grossPay,
        net: acc.net + i.netPay
      }), { hours: 0, gross: 0, net: 0 });

      initialDraft.totalHours = totals.hours;
      initialDraft.totalGrossPayroll = totals.gross;
      initialDraft.totalNetPayroll = totals.net;

      await mySQLDb.savePayrollPeriod(initialDraft);
      periods = [initialDraft];
    }
    res.json({ success: true, periods });
  } catch (err) {
    const periods = db.getPayrollPeriods();
    res.json({ success: true, periods });
  }
});

// GET single payroll period
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const periods = await mySQLDb.getPayrollPeriods();
    const period = periods.find(p => p.id === id);
    if (!period) {
      return res.status(404).json({ success: false, error: 'Payroll period not found' });
    }
    res.json({ success: true, period });
  } catch (err) {
    const periods = db.getPayrollPeriods();
    const period = periods.find(p => p.id === id);
    if (!period) {
      return res.status(404).json({ success: false, error: 'Payroll period not found' });
    }
    res.json({ success: true, period });
  }
});

// POST create or initialize new payroll period
router.post('/', async (req: Request, res: Response) => {
  const { periodStart, periodEnd, payDate, createdBy } = req.body;

  if (!periodStart || !periodEnd || !payDate) {
    return res.status(400).json({ success: false, error: 'periodStart, periodEnd, and payDate are required' });
  }

  try {
    const employees = await mySQLDb.getEmployees();
    const newPeriod: PayrollPeriod = {
      id: `pay-${Date.now()}`,
      periodStart,
      periodEnd,
      payDate,
      status: 'Draft',
      totalHours: 0,
      totalGrossPayroll: 0,
      totalDeductions: 0,
      totalNetPayroll: 0,
      createdBy: createdBy || 'System User',
      createdAt: new Date().toISOString(),
      items: employees.map(emp => ({
        employeeId: emp.id || emp.employeeId,
        employeeName: emp.displayName,
        position: emp.position,
        department: emp.department,
        regularRate: emp.payRate,
        regularHours: 0,
        regularPay: 0,
        holidayRate: emp.holidayRate,
        holidayHours: 0,
        holidayPay: 0,
        otherPay: 0,
        deductions: 0,
        totalHours: 0,
        grossPay: 0,
        netPay: 0,
        status: 'Ready'
      }))
    };
    await mySQLDb.savePayrollPeriod(newPeriod);
    res.status(201).json({ success: true, period: newPeriod });
  } catch (err) {
    const employees = db.getEmployees();
    const periods = db.getPayrollPeriods();
    const newPeriod: PayrollPeriod = {
      id: `pay-${Date.now()}`,
      periodStart,
      periodEnd,
      payDate,
      status: 'Draft',
      totalHours: 0,
      totalGrossPayroll: 0,
      totalDeductions: 0,
      totalNetPayroll: 0,
      createdBy: createdBy || 'System User',
      createdAt: new Date().toISOString(),
      items: employees.map(emp => ({
        employeeId: emp.id || emp.employeeId,
        employeeName: emp.displayName,
        position: emp.position,
        department: emp.department,
        regularRate: emp.payRate,
        regularHours: 0,
        regularPay: 0,
        holidayRate: emp.holidayRate,
        holidayHours: 0,
        holidayPay: 0,
        otherPay: 0,
        deductions: 0,
        totalHours: 0,
        grossPay: 0,
        netPay: 0,
        status: 'Ready'
      }))
    };
    periods.push(newPeriod);
    db.setPayrollPeriods(periods);
    res.status(201).json({ success: true, period: newPeriod });
  }
});

// PATCH update payroll period status
router.patch('/:id/status', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, approvedBy, period: fallbackPeriod } = req.body;

  try {
    const periods = await mySQLDb.getPayrollPeriods();
    let period = periods.find(p => p.id === id);

    if (!period) {
      period = fallbackPeriod || {
        id,
        periodStart: new Date().toISOString().split('T')[0],
        periodEnd: new Date(Date.now() + 6 * 86400000).toISOString().split('T')[0],
        payDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        status: status || 'Draft',
        totalHours: 0,
        totalGrossPayroll: 0,
        totalDeductions: 0,
        totalNetPayroll: 0,
        createdBy: approvedBy || 'Admin',
        createdAt: new Date().toISOString(),
        items: []
      };
    }

    if (period) {
      period.status = status;
      const now = new Date().toISOString();

      if (status === 'Approved') {
        period.approvedBy = approvedBy || 'Admin';
        period.approvedAt = now;
      } else if (status === 'Paid') {
        period.paidAt = now;
        if (period.items) {
          period.items.forEach(item => { item.status = 'Paid'; });
        }
      }
      await mySQLDb.savePayrollPeriod(period);
      res.json({ success: true, period });
    } else {
      res.status(404).json({ success: false, error: 'Period not found' });
    }
  } catch (err) {
    const periods = db.getPayrollPeriods();
    let period = periods.find(p => p.id === id);
    if (period) {
      period.status = status;
      db.setPayrollPeriods(periods);
    }
    res.json({ success: true, period });
  }
});

// PUT update items in a payroll period
router.put('/:id/items', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { items, periodStart, periodEnd, payDate, status } = req.body;

  try {
    const periods = await mySQLDb.getPayrollPeriods();
    let period = periods.find(p => p.id === id);

    if (!period) {
      period = {
        id: String(id),
        periodStart: periodStart || new Date().toISOString().split('T')[0],
        periodEnd: periodEnd || new Date(Date.now() + 6 * 86400000).toISOString().split('T')[0],
        payDate: payDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        status: status || 'Draft',
        totalHours: 0,
        totalGrossPayroll: 0,
        totalDeductions: 0,
        totalNetPayroll: 0,
        createdBy: 'System User',
        createdAt: new Date().toISOString(),
        items: Array.isArray(items) ? items : []
      };
    }

    if (period && Array.isArray(items)) {
      period.items = items;
      period.totalHours = items.reduce((acc, item) => acc + (item.totalHours || 0), 0);
      period.totalGrossPayroll = items.reduce((acc, item) => acc + (item.grossPay || 0), 0);
      period.totalDeductions = items.reduce((acc, item) => acc + (item.deductions || 0), 0);
      period.totalNetPayroll = items.reduce((acc, item) => acc + (item.netPay || 0), 0);
    }
    if (period) {
      await mySQLDb.savePayrollPeriod(period);
    }
    res.json({ success: true, period });
  } catch (err) {
    const periods = db.getPayrollPeriods();
    let period = periods.find(p => p.id === id);
    if (period && Array.isArray(items)) {
      period.items = items;
      db.setPayrollPeriods(periods);
    }
    res.json({ success: true, period });
  }
});

export default router;
