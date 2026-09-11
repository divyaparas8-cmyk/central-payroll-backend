import express from 'express';
import { mySQLDb } from '../db/mysqlDatabase';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const periods = await mySQLDb.getPayrollPeriods();
    const employees = await mySQLDb.getEmployees();
    res.json({ success: true, payslipPeriods: periods, periods, employees });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:periodId', async (req, res) => {
  try {
    const periods = await mySQLDb.getPayrollPeriods();
    const period = periods.find(p => p.id === req.params.periodId);
    if (!period) return res.status(404).json({ success: false, message: 'Payroll period not found' });
    res.json({ success: true, period });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
