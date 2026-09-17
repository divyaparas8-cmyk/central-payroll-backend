import express from 'express';
import { mySQLDb } from '../db/mysqlDatabase';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const employees = await mySQLDb.getEmployees();
    const contacts = employees.map(e => ({
      id: e.id,
      employeeId: e.employeeId,
      displayName: e.displayName,
      position: e.position,
      department: e.department,
      status: e.status,
      personalPhone: e.personalPhone,
      workPhone: e.workPhone,
      email: e.email,
      address: e.address,
      emergencyContactName: e.emergencyContactName,
      emergencyContactPhone: e.emergencyContactPhone,
      emergencyContactRelation: e.emergencyContactRelation
    }));
    res.json({ success: true, count: contacts.length, data: contacts });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
