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

export interface TimeRecord {
  id: string;
  userId: string;
  employeeId?: string;
  employeeName: string;
  clockIn: string;
  clockOut?: string;
  totalHours: number;
  status: 'ClockedIn' | 'ClockedOut';
  notes?: string;
  createdAt?: string;
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
  accounts?: { view: boolean };
  myTime?: { view: boolean; clock: boolean; export: boolean };
}

// -------------------------------------------------------------
// Customer Accounting, Invoices, Payments & General Ledger Types
// -------------------------------------------------------------

export interface Customer {
  id: string;
  name: string;
  customerName?: string;
  phone?: string;
  email?: string;
  billingAddress?: string;
  shippingAddress?: string;
  status: 'Active' | 'Inactive';
  notes?: string;
  aliases?: string[];
  balance?: number;
  createdAt?: string;
}

export interface InvoiceItem {
  id?: string;
  service: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface Invoice {
  id: string;
  customerId: string;
  customerName?: string;
  customerEmail?: string;
  number: string;
  terms: 'Due on receipt' | 'Net 7' | 'Net 15' | 'Net 30' | 'Net 60' | string;
  date: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  items: InvoiceItem[];
  memo?: string;
  amount: number;
  paidAmount?: number;
  balance?: number;
  status: 'Paid' | 'Owing';
  createdAt?: string;
}

export interface Payment {
  id: string;
  customerId: string;
  customerName?: string;
  invoiceId?: string;
  amount: number;
  date: string; // YYYY-MM-DD
  method: 'Bank Transfer' | 'Credit Card' | 'Debit Card' | 'Cash' | 'Cheque' | 'Other' | string;
  reference?: string;
  note?: string;
  createdAt?: string;
}

export interface GeneralLedgerEntry {
  id?: string;
  date: string;
  type: string; // 'Payment' | 'Invoice' | 'Payroll Check' | 'Check' | 'Pledge' | 'Tax Payment'
  number?: string;
  name: string;
  memo?: string;
  account: string; // 'Accounts Receivable' | 'Service Income' | 'Cash / Bank' | etc.
  debit: number;
  credit: number;
  source?: string;
  balance?: number | null;
}

export interface AgingSummary {
  customerId: string;
  customerName: string;
  current: number;
  d1_30: number;
  d31_60: number;
  d61_90: number;
  d90_plus: number;
  total: number;
}

export interface AccountingKPIs {
  customerCount: number;
  openInvoices: number;
  accountsReceivable: number;
  overdue: number;
  paymentsReceived: number;
  importSummary: string;
}

