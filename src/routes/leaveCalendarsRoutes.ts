import express from 'express';
import { mySQLDb } from '../db/mysqlDatabase';
import { LeaveRecord } from '../types';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const employeeId = req.query.employeeId as string;
    let leaves = await mySQLDb.getLeaves();
    const dbEmployees = await mySQLDb.getEmployees();

    if (employeeId) {
      leaves = leaves.filter(l => l.employeeId === employeeId);
    }
    res.json({ success: true, count: leaves.length, leaves, employees: dbEmployees });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const leave: LeaveRecord = req.body;
    if (!leave.id) leave.id = 'leave-' + Date.now();
    await mySQLDb.saveLeave(leave);
    res.status(201).json({ success: true, leave });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/employee/:employeeId', async (req, res) => {
  try {
    const { leaves } = req.body;
    await mySQLDb.syncEmployeeLeaves(req.params.employeeId, leaves || []);
    res.json({ success: true, message: 'Leaves synced for employee' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
