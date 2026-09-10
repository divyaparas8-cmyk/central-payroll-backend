import { Router, Request, Response } from 'express';
import { mySQLDb } from '../db/mysqlDatabase';
import { db } from '../db/database';
import { EmployeeSchedule } from '../types';

const router = Router();

// GET schedules
router.get('/', async (req: Request, res: Response) => {
  const { weekStartDate } = req.query;
  try {
    const schedules = await mySQLDb.getSchedules(weekStartDate ? String(weekStartDate) : undefined);
    res.json({ success: true, schedules });
  } catch (err) {
    const schedules = db.getSchedules();
    res.json({ success: true, schedules });
  }
});

// POST save schedule
router.post('/', async (req: Request, res: Response) => {
  const { employeeId, weekStartDate, shifts, totalHours } = req.body;

  if (!employeeId || !weekStartDate) {
    return res.status(400).json({ success: false, error: 'Employee ID and weekStartDate are required' });
  }

  const schedule: EmployeeSchedule = {
    employeeId,
    weekStartDate,
    shifts: shifts || {},
    totalHours: Number(totalHours) || 0
  };

  try {
    await mySQLDb.saveSchedule(schedule);
    res.json({ success: true, schedule });
  } catch (err) {
    const schedules = db.getSchedules();
    schedules.push(schedule);
    db.setSchedules(schedules);
    res.json({ success: true, schedule });
  }
});

export default router;
