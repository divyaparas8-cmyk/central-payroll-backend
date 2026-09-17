import { Router, Request, Response } from 'express';
import { mySQLDb } from '../db/mysqlDatabase';
import { db } from '../db/database';
import { LeaveRecord } from '../types';

const router = Router();

// GET all leave records
router.get('/', async (req: Request, res: Response) => {
  try {
    const leaves = await mySQLDb.getLeaves();
    res.json({ success: true, leaves });
  } catch (err) {
    const leaves = db.getLeaves();
    res.json({ success: true, leaves });
  }
});

// POST book new leave
router.post('/', async (req: Request, res: Response) => {
  const { employeeId, employeeName, leaveType, startDate, endDate, daysCount, notes } = req.body;

  if (!employeeId || !startDate || !endDate) {
    return res.status(400).json({ success: false, error: 'Employee, start date, and end date are required' });
  }

  const newLeave: LeaveRecord = {
    id: `leave-${Date.now()}`,
    employeeId,
    employeeName: employeeName || 'Employee',
    leaveType: leaveType || 'Vacation',
    startDate,
    endDate,
    daysCount: Number(daysCount) || 1,
    status: 'Pending',
    notes: notes || ''
  };

  try {
    await mySQLDb.saveLeave(newLeave);
    res.status(201).json({ success: true, leave: newLeave });
  } catch (err) {
    const leaves = db.getLeaves();
    leaves.push(newLeave);
    db.setLeaves(leaves);
    res.status(201).json({ success: true, leave: newLeave });
  }
});

// PATCH update leave status
router.patch('/:id/status', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['Pending', 'Approved', 'Rejected'].includes(status)) {
    return res.status(400).json({ success: false, error: 'Invalid leave status' });
  }

  try {
    const leaves = await mySQLDb.getLeaves();
    const leave = leaves.find(l => l.id === id);
    if (!leave) {
      return res.status(404).json({ success: false, error: 'Leave record not found' });
    }
    leave.status = status;
    await mySQLDb.saveLeave(leave);
    res.json({ success: true, leave });
  } catch (err) {
    const leaves = db.getLeaves();
    const leave = leaves.find(l => l.id === id);
    if (leave) {
      leave.status = status;
      db.setLeaves(leaves);
    }
    res.json({ success: true, leave });
  }
});

// PUT sync all leave records for an employee
router.put('/employee/:employeeId', async (req: Request, res: Response) => {
  const empId = String(req.params.employeeId);
  const { leaves } = req.body;

  try {
    if (Array.isArray(leaves)) {
      await mySQLDb.syncEmployeeLeaves(empId, leaves);
    }
    res.json({ success: true, count: leaves ? leaves.length : 0 });
  } catch (err) {
    const currentLeaves = db.getLeaves().filter(l => l.employeeId !== empId);
    if (Array.isArray(leaves)) {
      currentLeaves.push(...leaves);
      db.setLeaves(currentLeaves);
    }
    res.json({ success: true });
  }
});

export default router;
