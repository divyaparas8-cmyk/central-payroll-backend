import express from 'express';
import { mySQLDb } from '../db/mysqlDatabase';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const periods = await mySQLDb.getPayrollPeriods();
    res.json({ success: true, count: periods.length, periods });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
