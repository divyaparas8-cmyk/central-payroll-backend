import express from 'express';
import { mySQLDb } from '../db/mysqlDatabase';
import { EmployeeSchedule } from '../types';
import { requireAuth, requireRole } from '../middleware/authMiddleware';

const router = express.Router();

// GET /api/weekly-schedules (Accessible to Super Admin, Admin, and Staff)
router.get('/', requireAuth, requireRole(['superadmin', 'admin', 'staff']), async (req, res) => {
  try {
    const weekStartDate = req.query.weekStartDate as string;
    const schedules = await mySQLDb.getSchedules(weekStartDate);
    const employees = await mySQLDb.getEmployees();
    const note = await mySQLDb.getScheduleNote(weekStartDate);
    res.json({ success: true, count: schedules.length, schedules, employees, note });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/weekly-schedules (Schedule Grid Edit: Super Admin & Admin only)
router.post('/', requireAuth, requireRole(['superadmin', 'admin']), async (req, res) => {
  try {
    const body = req.body;
    if (body.schedules && Array.isArray(body.schedules) && body.weekStartDate) {
      await mySQLDb.saveWeeklySchedulesBulk(body.weekStartDate, body.schedules);
      res.status(201).json({ success: true, count: body.schedules.length });
    } else if (Array.isArray(body)) {
      for (const s of body) {
        await mySQLDb.saveSchedule(s);
      }
      res.status(201).json({ success: true, count: body.length });
    } else {
      const schedule: EmployeeSchedule = body;
      await mySQLDb.saveSchedule(schedule);
      res.status(201).json({ success: true, schedule });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/weekly-schedules/notes (Accessible to Super Admin, Admin, and Staff)
router.get('/notes', requireAuth, requireRole(['superadmin', 'admin', 'staff']), async (req, res) => {
  try {
    const weekStartDate = req.query.weekStartDate as string;
    const note = await mySQLDb.getScheduleNote(weekStartDate);
    res.json({ success: true, note });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/weekly-schedules/notes (Add Notes: Super Admin, Admin, and Staff)
router.post('/notes', requireAuth, requireRole(['superadmin', 'admin', 'staff']), async (req, res) => {
  try {
    const { note, weekStartDate } = req.body;
    await mySQLDb.saveScheduleNote(note !== undefined ? note : '', weekStartDate);
    res.json({ success: true, message: 'Weekly schedule notes saved successfully', note });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/weekly-schedules/history (Accessible to Super Admin, Admin, and Staff)
router.get('/history', requireAuth, requireRole(['superadmin', 'admin', 'staff']), async (req, res) => {
  try {
    const history = await mySQLDb.getScheduleWeeksSummary();
    res.json({ success: true, history });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/weekly-schedules/:weekStartDate (Super Admin & Admin only)
router.delete('/:weekStartDate', requireAuth, requireRole(['superadmin', 'admin']), async (req, res) => {
  try {
    const weekStartDate = String(req.params.weekStartDate);
    await mySQLDb.deleteWeeklySchedule(weekStartDate);
    res.json({ success: true, message: 'Schedule week deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
