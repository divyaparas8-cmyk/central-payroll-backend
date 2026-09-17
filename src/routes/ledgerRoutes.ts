import express from 'express';
import { mySQLDb } from '../db/mysqlDatabase';
import { GeneralLedgerEntry } from '../types';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, customerName, account, type } = req.query as Record<string, string>;
    const entries = await mySQLDb.getGeneralLedger({ startDate, endDate, customerName, account, type });
    res.json({ success: true, count: entries.length, data: entries });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const entry: GeneralLedgerEntry = req.body;
    const saved = await mySQLDb.saveGeneralLedgerEntry(entry);
    res.status(201).json({ success: true, data: saved });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
