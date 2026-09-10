export type UserRole = 'superadmin' | 'admin' | 'staff';

export interface UserAccount {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: UserRole;
  status: 'Active' | 'Inactive';
  password?: string;
  lastLogin?: string;
  createdAt: string;
}

export type ShiftType = 'WORK' | 'OFF' | 'VACATION' | 'SICK' | 'HOLIDAY';

export interface DailyShift {
  date: string; // YYYY-MM-DD
  dayOfWeek: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
  type: ShiftType;
  hours: number;
  startTime?: string;
  endTime?: string;
  notes?: string;
}

export interface EmployeeSchedule {
  employeeId: string;
  weekStartDate: string; // YYYY-MM-DD
  shifts: Record<string, any>;
  totalHours: number;
}

export type LeaveType = 'Vacation' | 'Sick' | 'Personal' | 'Holiday' | 'Other';
export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected';

export interface LeaveRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveType: LeaveType;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  daysCount: number;
  status: LeaveStatus;
  notes?: string;
}

export interface Employee {
  id: string;
  employeeId: string;
  firstName: string;
  middleInitial?: string;
  lastName: string;
  displayName: string;
  position: string;
  department: string;
  status: 'Active' | 'Inactive';
  employmentType: 'Full-Time' | 'Part-Time' | 'Contract';
  payType: 'Hourly' | 'Salaried';
  payRate: number;
  holidayRate: number;
  startDate: string;
  dateOfBirth: string;
  
  // Contact Info
  personalPhone: string;
  workPhone: string;
  email: string;
  address: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;

  // Payroll Defaults
  paymentMethod: 'Direct Deposit' | 'Check' | 'Cash';
  bankName?: string;
  bankAccountMasked?: string;
}

export type PayrollStatus = 'Draft' | 'Calculated' | 'Approved' | 'Paid' | 'Archived';

export interface EmployeePayrollItem {
  employeeId: string;
  employeeName: string;
  position: string;
  department: string;
  regularRate: number;
  regularHours: number;
  regularPay: number;
  holidayRate: number;
  holidayHours: number;
  holidayPay: number;
  otherPay: number;
  otherPayNotes?: string;
  deductions: number;
  deductionNotes?: string;
  totalHours: number;
  grossPay: number;
  netPay: number;
  status: 'Ready' | 'Incomplete' | 'Paid';
}

export interface PayrollPeriod {
  id: string;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string; // YYYY-MM-DD
  payDate: string; // YYYY-MM-DD
  status: PayrollStatus;
  items: EmployeePayrollItem[];
  totalHours: number;
  totalGrossPayroll: number;
  totalDeductions: number;
  totalNetPayroll: number;
  createdBy: string;
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
  paidAt?: string;
}

export interface AuditLogItem {
  id: string;
  action: string;
  module: string;
  user: string;
  role: string;
  timestamp: string;
  details: string;
  ipAddress?: string;
}

export interface PermissionMatrix {
  dashboard: { view: boolean };
  employees: { view: boolean; create: boolean; edit: boolean; delete: boolean };
  payroll: { view: boolean; edit: boolean; approve: boolean; export: boolean };
  schedules: { view: boolean; edit: boolean; print: boolean };
  leave: { view: boolean; manage: boolean };
  contacts: { view: boolean; edit: boolean };
  reports: { view: boolean; export: boolean };
  payslips: { view: boolean; print: boolean; email: boolean };
  audit: { view: boolean; export: boolean };
  permissions: { view: boolean; edit: boolean };
  userAccounts: { view: boolean; manage: boolean };
  settings: { view: boolean; edit: boolean };
}
