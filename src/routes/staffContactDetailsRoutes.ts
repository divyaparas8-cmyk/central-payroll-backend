import express from 'express';
import { mySQLDb } from '../db/mysqlDatabase';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const employees = await mySQLDb.getEmployees();
    res.json({ success: true, count: employees.length, contacts: employees });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const existing = await mySQLDb.getEmployeeById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }
    const updated = {
      ...existing,
      ...req.body,
      id: req.params.id
    };
    await mySQLDb.saveEmployee(updated);
    res.json({ success: true, contact: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
