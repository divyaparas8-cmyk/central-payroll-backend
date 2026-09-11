import express from 'express';
import { mySQLDb } from '../db/mysqlDatabase';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const periods = await mySQLDb.getPayrollPeriods();
    res.json({ success: true, data: periods });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:periodId', async (req, res) => {
  try {
    const periods = await mySQLDb.getPayrollPeriods();
    const period = periods.find(p => p.id === req.params.periodId);
    if (!period) return res.status(404).json({ success: false, message: 'Payroll period not found' });
    res.json({ success: true, data: period });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
