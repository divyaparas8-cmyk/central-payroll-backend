import fs from 'fs';
import path from 'path';
import { Employee, PayrollPeriod, LeaveRecord, UserAccount, AuditLogItem, EmployeeSchedule } from '../types';
import { initialEmployees, initialPayrollPeriods, initialLeaves, initialUsers, initialAuditLogs, initialSchedules } from './seedData';

interface DatabaseSchema {
  employees: Employee[];
  payrollPeriods: PayrollPeriod[];
  leaves: LeaveRecord[];
  users: UserAccount[];
  auditLogs: AuditLogItem[];
  schedules: EmployeeSchedule[];
}

const DATA_DIR = path.join(__dirname, '../../data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

class JSONDatabase {
  private data: DatabaseSchema;

  constructor() {
    this.ensureDataDirectory();
    this.data = this.loadData();
  }

  private ensureDataDirectory() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private loadData(): DatabaseSchema {
    const cleanSeed: DatabaseSchema = {
      employees: [],
      payrollPeriods: [],
      leaves: [],
      users: [
        {
          id: 'usr-2',
          username: 'superadmin',
          displayName: 'Super Admin',
          email: 'admin@centraldispatch.bm',
          role: 'superadmin',
          status: 'Active',
          lastLogin: '2026-09-10 12:00 PM',
          createdAt: '2026-01-01'
        }
      ],
      auditLogs: [],
      schedules: []
    };

    if (!fs.existsSync(DB_FILE)) {
      this.saveData(cleanSeed);
      return cleanSeed;
    }

    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(content);
    } catch (err) {
      console.error('Error reading db.json, resetting database:', err);
      this.saveData(cleanSeed);
      return cleanSeed;
    }
  }

  public saveData(newData?: DatabaseSchema) {
    if (newData) {
      this.data = newData;
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
  }

  // Getters & Setters
  public getEmployees(): Employee[] {
    return this.data.employees;
  }

  public setEmployees(employees: Employee[]) {
    this.data.employees = employees;
    this.saveData();
  }

  public getPayrollPeriods(): PayrollPeriod[] {
    return this.data.payrollPeriods;
  }

  public setPayrollPeriods(periods: PayrollPeriod[]) {
    this.data.payrollPeriods = periods;
    this.saveData();
  }

  public getLeaves(): LeaveRecord[] {
    return this.data.leaves;
  }

  public setLeaves(leaves: LeaveRecord[]) {
    this.data.leaves = leaves;
    this.saveData();
  }

  public getUsers(): UserAccount[] {
    return this.data.users;
  }

  public setUsers(users: UserAccount[]) {
    this.data.users = users;
    this.saveData();
  }

  public getAuditLogs(): AuditLogItem[] {
    return this.data.auditLogs;
  }

  public setAuditLogs(logs: AuditLogItem[]) {
    this.data.auditLogs = logs;
    this.saveData();
  }

  public getSchedules(): EmployeeSchedule[] {
    return this.data.schedules;
  }

  public setSchedules(schedules: EmployeeSchedule[]) {
    this.data.schedules = schedules;
    this.saveData();
  }
}

export const db = new JSONDatabase();
