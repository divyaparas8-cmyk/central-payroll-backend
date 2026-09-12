import express from 'express';
import { mySQLDb } from '../db/mysqlDatabase';

const router = express.Router();

// GET /api/my-time or /api/my-time?userId=...
router.get('/', async (req, res) => {
  try {
    const userId = req.query.userId as string | undefined;
    const records = await mySQLDb.getTimeRecords(userId);
    res.json({
      success: true,
      count: records.length,
      records
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/my-time/status?userId=...
router.get('/status', async (req, res) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId is required' });
    }
    const latest = await mySQLDb.getLatestTimeRecord(userId);
    const isClockedIn = latest?.status === 'ClockedIn';
    res.json({
      success: true,
      isClockedIn,
      currentRecord: isClockedIn ? latest : null
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/my-time/clock-in
router.post('/clock-in', async (req, res) => {
  try {
    const { userId, employeeName, employeeId, notes } = req.body;
    if (!userId || !employeeName) {
      return res.status(400).json({ success: false, message: 'userId and employeeName are required' });
    }
    const record = await mySQLDb.clockIn(userId, employeeName, employeeId, notes);
    res.json({
      success: true,
      message: 'Clocked in successfully',
      record
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/my-time/clock-out
router.post('/clock-out', async (req, res) => {
  try {
    const { userId, notes } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId is required' });
    }
    const record = await mySQLDb.clockOut(userId, notes);
    if (!record) {
      return res.status(400).json({ success: false, message: 'No active clock-in session found' });
    }
    res.json({
      success: true,
      message: 'Clocked out successfully',
      record
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
