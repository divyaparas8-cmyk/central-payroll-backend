import { Router, Request, Response } from 'express';
import { mySQLDb } from '../db/mysqlDatabase';
import { db } from '../db/database';
import { Employee } from '../types';

const router = Router();

// GET all employees
router.get('/', async (req: Request, res: Response) => {
  try {
    const employees = await mySQLDb.getEmployees();
    res.json({ success: true, employees });
  } catch (err) {
    const employees = db.getEmployees();
    res.json({ success: true, employees });
  }
});

// GET single employee by ID or employeeId
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const employee = await mySQLDb.getEmployeeById(String(id));
    if (!employee) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }
    res.json({ success: true, employee });
  } catch (err) {
    const employees = db.getEmployees();
    const employee = employees.find(e => e.id === id || e.employeeId === id);
    if (!employee) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }
    res.json({ success: true, employee });
  }
});

// POST create employee
router.post('/', async (req: Request, res: Response) => {
  const body = req.body;

  if (!body.firstName || !body.lastName || !body.position || !body.department) {
    return res.status(400).json({ success: false, error: 'First name, last name, position, and department are required' });
  }

  try {
    const employees = await mySQLDb.getEmployees();
    const nextNum = employees.length + 1;
    const empCode = `CDL-${String(nextNum).padStart(3, '0')}`;

    const newEmp: Employee = {
      ...body,
      id: `emp-${Date.now()}`,
      employeeId: body.employeeId || empCode,
      displayName: `${body.firstName} ${body.lastName}`,
      status: body.status || 'Active',
      payRate: Number(body.payRate) || 15.00,
      holidayRate: Number(body.holidayRate) || Number(body.payRate || 15.00) * 1.5,
      paymentMethod: body.paymentMethod || 'Direct Deposit'
    };

    await mySQLDb.saveEmployee(newEmp);
    res.status(201).json({ success: true, employee: newEmp });
  } catch (err) {
    const employees = db.getEmployees();
    const nextNum = employees.length + 1;
    const empCode = `CDL-${String(nextNum).padStart(3, '0')}`;

    const newEmp: Employee = {
      ...body,
      id: `emp-${Date.now()}`,
      employeeId: body.employeeId || empCode,
      displayName: `${body.firstName} ${body.lastName}`,
      status: body.status || 'Active',
      payRate: Number(body.payRate) || 15.00,
      holidayRate: Number(body.holidayRate) || Number(body.payRate || 15.00) * 1.5,
      paymentMethod: body.paymentMethod || 'Direct Deposit'
    };
    employees.push(newEmp);
    db.setEmployees(employees);
    res.status(201).json({ success: true, employee: newEmp });
  }
});

// PUT update employee
router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const existing = await mySQLDb.getEmployeeById(String(id));
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }
    const updated: Employee = {
      ...existing,
      ...req.body,
      displayName: req.body.firstName && req.body.lastName 
        ? `${req.body.firstName} ${req.body.lastName}`
        : existing.displayName
    };
    await mySQLDb.saveEmployee(updated);
    res.json({ success: true, employee: updated });
  } catch (err) {
    const employees = db.getEmployees();
    const index = employees.findIndex(e => e.id === id || e.employeeId === id);
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }
    const updated: Employee = {
      ...employees[index],
      ...req.body,
      displayName: req.body.firstName && req.body.lastName 
        ? `${req.body.firstName} ${req.body.lastName}`
        : employees[index].displayName
    };
    employees[index] = updated;
    db.setEmployees(employees);
    res.json({ success: true, employee: updated });
  }
});

// DELETE toggle employee status or remove
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await mySQLDb.toggleEmployeeStatus(String(id));
    res.json({ success: true, message: 'Employee status toggled' });
  } catch (err) {
    const employees = db.getEmployees();
    const employee = employees.find(e => e.id === id || e.employeeId === id);
    if (employee) {
      employee.status = employee.status === 'Active' ? 'Inactive' : 'Active';
      db.setEmployees(employees);
    }
    res.json({ success: true, message: 'Employee status toggled' });
  }
});

export default router;
