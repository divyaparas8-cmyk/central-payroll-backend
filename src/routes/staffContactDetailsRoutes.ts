import express from 'express';
import { mySQLDb } from '../db/mysqlDatabase';

const router = express.Router();

// Default 8 staff members matching prototype with full details
export const DEFAULT_STAFF_MEMBERS = [
  { id: 'ali', employeeId: 'CDL-001', displayName: 'Ali Hamza', firstName: 'Hamza', lastName: 'Ali', middleInitial: '', position: 'Global Dispatch / Call Center', department: 'Operations', status: 'Active', email: 'hamza@gdmbpo.com', personalPhone: '(441) 505-1234', workPhone: '(441) 295-4141', address: '3 Laffan Street, Pembroke HM09, Bermuda', emergencyContactName: 'Sarah Hamza', emergencyContactPhone: '(441) 518-9901', emergencyContactRelation: 'Spouse' },
  { id: 'alesia', employeeId: 'CDL-002', displayName: 'Alesia Brangman', firstName: 'Alesia', lastName: 'Brangman', middleInitial: '', position: 'Dispatch Supervisor', department: 'Operations', status: 'Active', email: 'alesia.brangman@centraldispatch.bm', personalPhone: '(441) 534-8822', workPhone: '(441) 295-4141', address: '14 Cedar Avenue, Hamilton HM11, Bermuda', emergencyContactName: 'David Brangman', emergencyContactPhone: '(441) 504-3321', emergencyContactRelation: 'Brother' },
  { id: 'ty', employeeId: 'CDL-003', displayName: 'Tyonika McGowan (Ty)', firstName: 'Tyonika', lastName: 'McGowan', middleInitial: '', position: 'Dispatcher', department: 'Operations', status: 'Active', email: 'tyonika.mcgowan@centraldispatch.bm', personalPhone: '(441) 516-7733', workPhone: '(441) 295-4141', address: '22 Middle Road, Devonshire DV06, Bermuda', emergencyContactName: 'Patricia McGowan', emergencyContactPhone: '(441) 522-8811', emergencyContactRelation: 'Mother' },
  { id: 'neli', employeeId: 'CDL-004', displayName: 'Neli Outerbridge', firstName: 'Neli', lastName: 'Outerbridge', middleInitial: '', position: 'Owner / Manager / Director', department: 'Management', status: 'Active', email: 'neli@bermudaislandtaxi.com', personalPhone: '(441) 599-4455', workPhone: '(441) 295-4141', address: '8 Harbour Road, Paget PG02, Bermuda', emergencyContactName: 'Robert Outerbridge', emergencyContactPhone: '(441) 501-6677', emergencyContactRelation: 'Spouse' },
  { id: 'ssh', employeeId: 'CDL-005', displayName: 'SSH, SSH', firstName: 'SSH', lastName: 'SSH', middleInitial: '', position: 'SSH Dispatch / Call Center', department: 'Operations', status: 'Active', email: 'ssh.dispatch@centraldispatch.bm', personalPhone: '(441) 527-9944', workPhone: '(441) 295-4141', address: '5 North Shore Road, Pembroke HM14, Bermuda', emergencyContactName: 'Michael Smith', emergencyContactPhone: '(441) 512-3344', emergencyContactRelation: 'Guardian' },
  { id: 'staff6', employeeId: 'CDL-006', displayName: 'Miss Shonee Simons', firstName: 'Shonee', lastName: 'Simons', middleInitial: '', position: 'Dispatcher', department: 'Operations', status: 'Active', email: 'shonee.simons@centraldispatch.bm', personalPhone: '(441) 532-6611', workPhone: '(441) 295-4141', address: '19 South Road, Warwick WK08, Bermuda', emergencyContactName: 'Cheryl Simons', emergencyContactPhone: '(441) 508-4422', emergencyContactRelation: 'Mother' },
  { id: 'staff7', employeeId: 'CDL-007', displayName: 'Miss Tiffany Robinson', firstName: 'Tiffany', lastName: 'Robinson', middleInitial: '', position: 'Dispatcher / Customer Service', department: 'Operations', status: 'Active', email: 'tiffany.robinson@centraldispatch.bm', personalPhone: '(441) 519-2288', workPhone: '(441) 295-4141', address: '7 Palmetto Road, Devonshire DV05, Bermuda', emergencyContactName: 'James Robinson', emergencyContactPhone: '(441) 529-1100', emergencyContactRelation: 'Father' },
  { id: 'staff8', employeeId: 'CDL-008', displayName: 'Tanuvi Patel', firstName: 'Tanuvi', lastName: 'Patel', middleInitial: '', position: 'Dispatcher / Operations', department: 'Operations', status: 'Active', email: 'tanuvi.patel@centraldispatch.bm', personalPhone: '(441) 538-4499', workPhone: '(441) 295-4141', address: '11 Point Finger Road, Paget DV04, Bermuda', emergencyContactName: 'Ramesh Patel', emergencyContactPhone: '(441) 507-8899', emergencyContactRelation: 'Father' },
];

router.get('/', async (req, res) => {
  try {
    const dbEmployees = await mySQLDb.getEmployees();
    const existingIds = new Set(dbEmployees.map(e => (e.id || '').toLowerCase()));
    const missingDefaults = DEFAULT_STAFF_MEMBERS.filter(d => !existingIds.has(d.id.toLowerCase()) && !existingIds.has(d.employeeId.toLowerCase()));
    
    // Combine db employees and defaults
    const combined = [...dbEmployees, ...missingDefaults];
    res.json({ success: true, count: combined.length, contacts: combined });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/staff-contact-details - Add new staff member
router.post('/', async (req, res) => {
  try {
    const body = req.body;
    let firstName = body.firstName || '';
    let lastName = body.lastName || '';
    if (!firstName && body.name) {
      const parts = String(body.name).trim().split(' ');
      firstName = parts[0] || 'Staff';
      lastName = parts.slice(1).join(' ') || '';
    }
    const displayName = body.displayName || `${firstName} ${lastName}`.trim() || body.name || 'New Staff';
    const dbEmployees = await mySQLDb.getEmployees();
    const nextNum = dbEmployees.length + 1;
    const employeeId = body.employeeId || `CDL-${String(nextNum).padStart(3, '0')}`;
    const newId = body.id || `staff-${Date.now()}`;

    const newStaff: any = {
      id: newId,
      employeeId,
      firstName: firstName || 'Staff',
      middleInitial: body.middleInitial || '',
      lastName: lastName || 'Member',
      displayName,
      position: body.position || body.role || 'Staff Member',
      department: body.department || 'Operations',
      status: body.status || 'Active',
      employmentType: body.employmentType || 'Full-Time',
      payType: body.payType || 'Hourly',
      payRate: Number(body.payRate) || 16.00,
      holidayRate: Number(body.holidayRate) || (Number(body.payRate) || 16.00) * 1.5,
      startDate: body.startDate || body.hireDate || new Date().toISOString().split('T')[0],
      dateOfBirth: body.dateOfBirth || '1995-01-01',
      personalPhone: body.personalPhone || body.phone || '(441) 555-0000',
      workPhone: body.workPhone || '(441) 295-4141',
      email: body.email || `${firstName.toLowerCase()}.${lastName.toLowerCase()}@centraldispatch.bm`,
      address: body.address || '3 Laffan Street, Pembroke HM09, Bermuda',
      emergencyContactName: body.emergencyContactName || body.emergencyName || '',
      emergencyContactPhone: body.emergencyContactPhone || body.emergencyPhone || '',
      emergencyContactRelation: body.emergencyContactRelation || body.emergencyRelation || '',
      paymentMethod: body.paymentMethod || 'Direct Deposit',
      bankName: body.bankName || 'Butterfield Bank Bermuda',
      bankAccountMasked: body.bankAccountMasked || '••••••••1234'
    };

    await mySQLDb.saveEmployee(newStaff);
    res.status(201).json({ success: true, contact: newStaff });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    let existing = await mySQLDb.getEmployeeById(id);
    if (!existing) {
      const defaultMatch = DEFAULT_STAFF_MEMBERS.find(d => d.id === id);
      if (defaultMatch) {
        existing = {
          ...defaultMatch,
          employmentType: 'Full-Time',
          payType: 'Hourly',
          payRate: 16.00,
          holidayRate: 24.00,
          startDate: new Date().toISOString().split('T')[0],
          dateOfBirth: '1995-01-01',
          workPhone: '(441) 295-4141',
          paymentMethod: 'Direct Deposit',
          bankName: '',
          bankAccountMasked: ''
        } as any;
      }
    }

    const updated: any = {
      ...(existing || {}),
      ...req.body,
      id: id,
      employeeId: (existing && existing.employeeId) || req.body.employeeId || id,
      displayName: req.body.displayName || `${req.body.firstName || ''} ${req.body.lastName || ''}`.trim() || id,
      position: req.body.position || req.body.role || (existing && existing.position) || 'Staff',
      department: (existing && existing.department) || 'Operations',
      status: req.body.status || (existing && existing.status) || 'Active',
      employmentType: (existing && existing.employmentType) || 'Full-Time',
      payType: (existing && existing.payType) || 'Hourly',
      payRate: (existing && existing.payRate) || 16.00,
      holidayRate: (existing && existing.holidayRate) || 24.00,
      startDate: req.body.startDate || req.body.hireDate || (existing && existing.startDate) || null,
      dateOfBirth: (existing && existing.dateOfBirth) || null,
      personalPhone: req.body.personalPhone || req.body.phone || (existing && existing.personalPhone) || '',
      workPhone: req.body.workPhone || (existing && existing.workPhone) || '(441) 295-4141',
      email: req.body.email || (existing && existing.email) || '',
      address: req.body.address || (existing && existing.address) || '',
      emergencyContactName: req.body.emergencyContactName || req.body.emergencyName || (existing && existing.emergencyContactName) || '',
      emergencyContactPhone: req.body.emergencyContactPhone || req.body.emergencyPhone || (existing && existing.emergencyContactPhone) || '',
      emergencyContactRelation: req.body.emergencyContactRelation || req.body.emergencyRelation || (existing && existing.emergencyContactRelation) || '',
      paymentMethod: (existing && existing.paymentMethod) || 'Direct Deposit',
      bankName: (existing && existing.bankName) || '',
      bankAccountMasked: (existing && existing.bankAccountMasked) || ''
    };

    await mySQLDb.saveEmployee(updated);
    res.json({ success: true, contact: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await mySQLDb.deleteEmployee(id);
    res.json({ success: true, message: 'Staff member deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Staff Records (Sick, Vacation & Notes)
router.get('/:id/records', async (req, res) => {
  try {
    const records = await mySQLDb.getStaffRecords(req.params.id);
    res.json({ success: true, count: records.length, records });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/:id/records', async (req, res) => {
  try {
    const { type, date, note } = req.body;
    const staffId = req.params.id;
    if (!date) {
      return res.status(400).json({ success: false, message: 'Date is required.' });
    }
    const record = {
      id: req.body.id || `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      staffId,
      type: type || 'sick',
      date,
      note: note || '',
      createdAt: new Date().toISOString()
    };
    await mySQLDb.saveStaffRecord(record);
    res.json({ success: true, record });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/:id/records/:recordId', async (req, res) => {
  try {
    await mySQLDb.deleteStaffRecord(req.params.recordId);
    res.json({ success: true, message: 'Staff record deleted.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
