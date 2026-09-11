import express from 'express';
import { mySQLDb } from '../db/mysqlDatabase';
import { EmployeeSchedule } from '../types';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const weekStartDate = req.query.weekStartDate as string;
    const schedules = await mySQLDb.getSchedules(weekStartDate);
    const employees = await mySQLDb.getEmployees();
    const note = await mySQLDb.getScheduleNote();
    res.json({ success: true, count: schedules.length, schedules, employees, note });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const schedule: EmployeeSchedule = req.body;
    await mySQLDb.saveSchedule(schedule);
    res.status(201).json({ success: true, schedule });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/weekly-schedules/notes
router.get('/notes', async (req, res) => {
  try {
    const note = await mySQLDb.getScheduleNote();
    res.json({ success: true, note });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/weekly-schedules/notes
router.post('/notes', async (req, res) => {
  try {
    const { note } = req.body;
    await mySQLDb.saveScheduleNote(note || '');
    res.json({ success: true, message: 'Weekly schedule notes saved successfully', note });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
