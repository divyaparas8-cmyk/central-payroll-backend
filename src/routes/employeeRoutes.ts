import { Router, Response } from 'express';
import { mySQLDb } from '../db/mysqlDatabase';
import { db } from '../db/database';
import { Employee } from '../types';
import { AuthenticatedRequest, requirePermission } from '../middleware/authMiddleware';

const router = Router();

// Helper to check if caller has permission to view employee pay rates
async function canViewPayRates(userRole: string): Promise<boolean> {
  if (userRole === 'superadmin') return true;
  try {
    const rawSaved = await mySQLDb.getSetting('role_permissions');
    if (rawSaved) {
      const parsed = JSON.parse(rawSaved);
      if (parsed && parsed[userRole]?.employees?.view === true) {
        return true;
      }
    }
  } catch (_) {}
  return false;
}

// Helper to check if caller can view staff roster for schedules/leave/contacts
async function canViewRoster(userRole: string): Promise<boolean> {
  if (userRole === 'superadmin') return true;
  try {
    const rawSaved = await mySQLDb.getSetting('role_permissions');
    if (rawSaved) {
      const parsed = JSON.parse(rawSaved);
      const rolePerms = parsed?.[userRole];
      if (rolePerms?.employees?.view || rolePerms?.schedules?.view !== false || rolePerms?.leave?.view || rolePerms?.contacts?.view) {
        return true;
      }
    }
  } catch (_) {}
  return true; // Default allow roster view for logged in staff/admin so schedules/leave/contacts work
}

function sanitizeEmployee(emp: Employee, includePay: boolean): Employee {
  if (includePay) return emp;
  return {
    ...emp,
    payRate: 0,
    holidayRate: 0
  };
}

// GET all employees (Allows roster view for schedules/leave/contacts; masks pay rates if employees.view is not granted)
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const userRole = (req.user?.role || '').toLowerCase();
  const allowed = await canViewRoster(userRole);
  if (!allowed) {
    return res.status(403).json({ success: false, error: "Access Denied: You do not have permission to view staff roster." });
  }

  const includePay = await canViewPayRates(userRole);

  try {
    const employees = await mySQLDb.getEmployees();
    res.json({ success: true, employees: employees.map(e => sanitizeEmployee(e, includePay)) });
  } catch (err) {
    const employees = db.getEmployees();
    res.json({ success: true, employees: employees.map(e => sanitizeEmployee(e, includePay)) });
  }
});

// GET single employee by ID or employeeId
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const userRole = (req.user?.role || '').toLowerCase();
  const allowed = await canViewRoster(userRole);
  if (!allowed) {
    return res.status(403).json({ success: false, error: "Access Denied: You do not have permission to view staff details." });
  }

  const includePay = await canViewPayRates(userRole);

  try {
    const employee = await mySQLDb.getEmployeeById(String(id));
    if (!employee) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }
    res.json({ success: true, employee: sanitizeEmployee(employee, includePay) });
  } catch (err) {
    const employees = db.getEmployees();
    const employee = employees.find(e => e.id === id || e.employeeId === id);
    if (!employee) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }
    res.json({ success: true, employee: sanitizeEmployee(employee, includePay) });
  }
});

// POST create employee
router.post('/', requirePermission('employees', 'create'), async (req: AuthenticatedRequest, res: Response) => {
  const body = req.body;

  let firstName = body.firstName || '';
  let lastName = body.lastName || '';
  if (!firstName && body.name) {
    const parts = String(body.name).trim().split(' ');
    firstName = parts[0] || 'Staff';
    lastName = parts.slice(1).join(' ') || '';
  }

  if (!firstName) {
    return res.status(400).json({ success: false, error: 'Employee name is required' });
  }

  const displayName = body.displayName || `${firstName} ${lastName}`.trim() || body.name || 'Staff Member';

  try {
    const employees = await mySQLDb.getEmployees();
    const nextNum = employees.length + 1;
    const empCode = body.employeeId || `CDL-${String(nextNum).padStart(3, '0')}`;

    const newEmp: Employee = {
      ...body,
      id: body.id || `emp-${Date.now()}`,
      employeeId: empCode,
      firstName,
      lastName,
      displayName,
      position: body.position || 'Staff Member',
      department: body.department || 'Dispatch Operations',
      status: body.status || 'Active',
      employmentType: body.employmentType || 'Full-Time',
      payType: body.payType || 'Hourly',
      payRate: Number(body.payRate) || 15.00,
      holidayRate: Number(body.holidayRate) || Number(body.payRate || 15.00) * 1.5,
      startDate: body.startDate || new Date().toISOString().split('T')[0],
      dateOfBirth: body.dateOfBirth || '1995-01-01',
      personalPhone: body.personalPhone || body.phone || '',
      workPhone: body.workPhone || body.mobile || '',
      email: body.email || '',
      address: body.address || '',
      paymentMethod: body.paymentMethod || 'Direct Deposit'
    };

    await mySQLDb.saveEmployee(newEmp);
    res.status(201).json({ success: true, employee: newEmp });
  } catch (err) {
    const employees = db.getEmployees();
    const nextNum = employees.length + 1;
    const empCode = body.employeeId || `CDL-${String(nextNum).padStart(3, '0')}`;

    const newEmp: Employee = {
      ...body,
      id: body.id || `emp-${Date.now()}`,
      employeeId: empCode,
      firstName,
      lastName,
      displayName,
      position: body.position || 'Staff Member',
      department: body.department || 'Dispatch Operations',
      status: body.status || 'Active',
      employmentType: body.employmentType || 'Full-Time',
      payType: body.payType || 'Hourly',
      payRate: Number(body.payRate) || 15.00,
      holidayRate: Number(body.holidayRate) || Number(body.payRate || 15.00) * 1.5,
      startDate: body.startDate || new Date().toISOString().split('T')[0],
      dateOfBirth: body.dateOfBirth || '1995-01-01',
      personalPhone: body.personalPhone || body.phone || '',
      workPhone: body.workPhone || body.mobile || '',
      email: body.email || '',
      address: body.address || '',
      paymentMethod: body.paymentMethod || 'Direct Deposit'
    };
    employees.push(newEmp);
    db.setEmployees(employees);
    res.status(201).json({ success: true, employee: newEmp });
  }
});

// PUT update employee
router.put('/:id', requirePermission('employees', 'edit'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const body = req.body;
  let firstName = body.firstName;
  let lastName = body.lastName;
  if (!firstName && body.name) {
    const parts = String(body.name).trim().split(' ');
    firstName = parts[0] || 'Staff';
    lastName = parts.slice(1).join(' ') || '';
  }

  try {
    const existing = await mySQLDb.getEmployeeById(String(id));
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }
    const updated: Employee = {
      ...existing,
      ...body,
      firstName: firstName || existing.firstName,
      lastName: lastName !== undefined ? lastName : existing.lastName,
      displayName: body.displayName || (firstName ? `${firstName} ${lastName || ''}`.trim() : (body.name || existing.displayName)),
      personalPhone: body.personalPhone !== undefined ? body.personalPhone : (body.phone !== undefined ? body.phone : existing.personalPhone),
      workPhone: body.workPhone !== undefined ? body.workPhone : (body.mobile !== undefined ? body.mobile : existing.workPhone),
      email: body.email !== undefined ? body.email : existing.email,
      address: body.address !== undefined ? body.address : existing.address,
      status: body.status || existing.status
    };
    await mySQLDb.saveEmployee(updated);
    res.json({ success: true, employee: updated });
  } catch (err) {
    const employees = db.getEmployees();
    const index = employees.findIndex(e => e.id === id || e.employeeId === id);
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }
    const existing = employees[index];
    const updated: Employee = {
      ...existing,
      ...body,
      firstName: firstName || existing.firstName,
      lastName: lastName !== undefined ? lastName : existing.lastName,
      displayName: body.displayName || (firstName ? `${firstName} ${lastName || ''}`.trim() : (body.name || existing.displayName)),
      personalPhone: body.personalPhone !== undefined ? body.personalPhone : (body.phone !== undefined ? body.phone : existing.personalPhone),
      workPhone: body.workPhone !== undefined ? body.workPhone : (body.mobile !== undefined ? body.mobile : existing.workPhone),
      email: body.email !== undefined ? body.email : existing.email,
      address: body.address !== undefined ? body.address : existing.address,
      status: body.status || existing.status
    };
    employees[index] = updated;
    db.setEmployees(employees);
    res.json({ success: true, employee: updated });
  }
});

// DELETE remove employee
router.delete('/:id', requirePermission('employees', 'delete'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    await mySQLDb.deleteEmployee(String(id));
    res.json({ success: true, message: 'Employee deleted' });
  } catch (err) {
    const employees = db.getEmployees();
    const filtered = employees.filter(e => e.id !== id && e.employeeId !== id);
    db.setEmployees(filtered);
    res.json({ success: true, message: 'Employee deleted' });
  }
});

// PATCH toggle employee status
router.patch('/:id/toggle-status', requirePermission('employees', 'edit'), async (req: AuthenticatedRequest, res: Response) => {
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

