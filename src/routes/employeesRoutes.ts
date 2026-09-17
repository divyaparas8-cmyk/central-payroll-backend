import express from 'express';
import { mySQLDb } from '../db/mysqlDatabase';
import { Employee } from '../types';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const employees = await mySQLDb.getEmployees();
    res.json({ success: true, count: employees.length, employees });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const employee = await mySQLDb.getEmployeeById(req.params.id);
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
    res.json({ success: true, employee });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const employee: Employee = req.body;
    if (!employee.id) employee.id = 'emp-' + Date.now();
    await mySQLDb.saveEmployee(employee);
    res.status(201).json({ success: true, employee });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const employee: Employee = { ...req.body, id: req.params.id };
    await mySQLDb.saveEmployee(employee);
    res.json({ success: true, employee });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await mySQLDb.deleteEmployee(req.params.id);
    res.json({ success: true, message: 'Employee deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
