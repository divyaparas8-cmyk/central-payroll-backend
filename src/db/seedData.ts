import { Employee, PayrollPeriod, LeaveRecord, UserAccount, AuditLogItem, EmployeeSchedule } from '../types';

export const initialEmployees: Employee[] = [];

export const initialPayrollPeriods: PayrollPeriod[] = [];

export const initialLeaves: LeaveRecord[] = [];

export const initialUsers: UserAccount[] = [
  {
    id: 'usr-1',
    username: 'superadmin',
    displayName: 'Super Admin',
    email: 'admin@centraldispatch.bm',
    role: 'superadmin',
    status: 'Active',
    lastLogin: '2026-09-10 12:00 PM',
    createdAt: '2026-01-01'
  }
];

export const initialAuditLogs: AuditLogItem[] = [];

export const initialSchedules: EmployeeSchedule[] = [];
