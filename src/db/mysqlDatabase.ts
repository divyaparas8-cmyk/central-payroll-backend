import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { Employee, PayrollPeriod, LeaveRecord, UserAccount, AuditLogItem, EmployeeSchedule } from '../types';
import { initialEmployees, initialPayrollPeriods, initialLeaves, initialUsers, initialAuditLogs } from './seedData';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3307,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'payroll_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export class MySQLDatabase {
  public async initDatabase() {
    try {
      console.log('🔄 Connecting to MySQL database at 127.0.0.1:3307 (payroll_db)...');
      const connection = await pool.getConnection();
      console.log('✅ Connected to MySQL Server!');

      // 1. Create Users Table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(50) PRIMARY KEY,
          username VARCHAR(100) NOT NULL UNIQUE,
          displayName VARCHAR(150) NOT NULL,
          email VARCHAR(150) NOT NULL,
          password VARCHAR(255),
          role ENUM('superadmin', 'admin', 'staff') NOT NULL DEFAULT 'staff',
          status ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
          lastLogin VARCHAR(100),
          createdAt DATE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      try {
        await connection.query(`ALTER TABLE users ADD COLUMN password VARCHAR(255);`);
      } catch (e) {
        // Column may already exist
      }

      // 2. Create Employees Table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS employees (
          id VARCHAR(50) PRIMARY KEY,
          employeeId VARCHAR(50) NOT NULL UNIQUE,
          firstName VARCHAR(100) NOT NULL,
          middleInitial VARCHAR(10),
          lastName VARCHAR(100) NOT NULL,
          displayName VARCHAR(200) NOT NULL,
          position VARCHAR(150) NOT NULL,
          department VARCHAR(150) NOT NULL,
          status ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
          employmentType ENUM('Full-Time', 'Part-Time', 'Contract') NOT NULL DEFAULT 'Full-Time',
          payType ENUM('Hourly', 'Salaried') NOT NULL DEFAULT 'Hourly',
          payRate DECIMAL(10,2) NOT NULL DEFAULT 0.00,
          holidayRate DECIMAL(10,2) NOT NULL DEFAULT 0.00,
          startDate DATE,
          dateOfBirth DATE,
          personalPhone VARCHAR(50),
          workPhone VARCHAR(50),
          email VARCHAR(150),
          address TEXT,
          emergencyContactName VARCHAR(150),
          emergencyContactPhone VARCHAR(50),
          emergencyContactRelation VARCHAR(50),
          paymentMethod ENUM('Direct Deposit', 'Check', 'Cash') DEFAULT 'Direct Deposit',
          bankName VARCHAR(150),
          bankAccountMasked VARCHAR(50)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 3. Create Payroll Periods Table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS payroll_periods (
          id VARCHAR(50) PRIMARY KEY,
          periodStart DATE NOT NULL,
          periodEnd DATE NOT NULL,
          payDate DATE NOT NULL,
          status ENUM('Draft', 'Calculated', 'Approved', 'Paid', 'Archived') NOT NULL DEFAULT 'Draft',
          totalHours DECIMAL(10,2) DEFAULT 0.00,
          totalGrossPayroll DECIMAL(12,2) DEFAULT 0.00,
          totalDeductions DECIMAL(12,2) DEFAULT 0.00,
          totalNetPayroll DECIMAL(12,2) DEFAULT 0.00,
          createdBy VARCHAR(100),
          createdAt VARCHAR(100),
          approvedBy VARCHAR(100),
          approvedAt VARCHAR(100),
          paidAt VARCHAR(100)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 4. Create Employee Payroll Items Table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS employee_payroll_items (
          id INT AUTO_INCREMENT PRIMARY KEY,
          periodId VARCHAR(50) NOT NULL,
          employeeId VARCHAR(50) NOT NULL,
          employeeName VARCHAR(200) NOT NULL,
          position VARCHAR(150),
          department VARCHAR(150),
          regularRate DECIMAL(10,2) DEFAULT 0.00,
          regularHours DECIMAL(10,2) DEFAULT 0.00,
          regularPay DECIMAL(10,2) DEFAULT 0.00,
          holidayRate DECIMAL(10,2) DEFAULT 0.00,
          holidayHours DECIMAL(10,2) DEFAULT 0.00,
          holidayPay DECIMAL(10,2) DEFAULT 0.00,
          otherPay DECIMAL(10,2) DEFAULT 0.00,
          otherPayNotes TEXT,
          deductions DECIMAL(10,2) DEFAULT 0.00,
          deductionNotes TEXT,
          totalHours DECIMAL(10,2) DEFAULT 0.00,
          grossPay DECIMAL(10,2) DEFAULT 0.00,
          netPay DECIMAL(10,2) DEFAULT 0.00,
          status ENUM('Ready', 'Incomplete', 'Paid') DEFAULT 'Ready',
          FOREIGN KEY (periodId) REFERENCES payroll_periods(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 5. Create Leave Records Table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS leave_records (
          id VARCHAR(50) PRIMARY KEY,
          employeeId VARCHAR(50) NOT NULL,
          employeeName VARCHAR(200) NOT NULL,
          leaveType ENUM('Vacation', 'Sick', 'Personal', 'Holiday', 'Other') NOT NULL DEFAULT 'Vacation',
          startDate DATE NOT NULL,
          endDate DATE NOT NULL,
          daysCount INT DEFAULT 1,
          status ENUM('Pending', 'Approved', 'Rejected') NOT NULL DEFAULT 'Pending',
          notes TEXT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 6. Create Schedules Table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS schedules (
          id INT AUTO_INCREMENT PRIMARY KEY,
          employeeId VARCHAR(50) NOT NULL,
          weekStartDate DATE NOT NULL,
          shiftsJson JSON,
          totalHours DECIMAL(10,2) DEFAULT 0.00,
          UNIQUE KEY unique_emp_week (employeeId, weekStartDate)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 7. Create Audit Logs Table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id VARCHAR(50) PRIMARY KEY,
          action VARCHAR(100) NOT NULL,
          module VARCHAR(100) NOT NULL,
          user VARCHAR(100) NOT NULL,
          role VARCHAR(100) NOT NULL,
          timestamp VARCHAR(100) NOT NULL,
          details TEXT,
          ipAddress VARCHAR(50)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      console.log('✅ All MySQL tables created/verified successfully!');
      connection.release();

      // Seed initial data if empty
      await this.seedInitialData();

    } catch (error) {
      console.error('❌ Error initializing MySQL database:', error);
    }
  }

  private async seedInitialData() {
    try {
      // Check & Seed Super Admin User if table is completely empty
      const [usersRows]: any = await pool.query('SELECT COUNT(*) as count FROM users');
      if (usersRows[0].count === 0) {
        console.log('🌱 Seeding Super Admin user into MySQL...');
        await pool.query(
          'INSERT INTO users (id, username, displayName, email, role, status, lastLogin, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          ['usr-2', 'superadmin', 'Super Admin', 'admin@centraldispatch.bm', 'superadmin', 'Active', '2026-09-10 12:00 PM', '2026-01-01']
        );
      }
      console.log('✅ MySQL initial verification complete!');
    } catch (err) {
      console.error('❌ Error seeding MySQL data:', err);
    }
  }

  private formatDateStr(val: any): string {
    if (!val) return '';
    if (val instanceof Date) {
      const year = val.getFullYear();
      const month = String(val.getMonth() + 1).padStart(2, '0');
      const day = String(val.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    const s = String(val);
    return s.includes('T') ? s.split('T')[0] : s;
  }

  // --- GETTERS & WRITERS FOR MYSQL ---
  public async getEmployees(): Promise<Employee[]> {
    const [rows]: any = await pool.query('SELECT * FROM employees ORDER BY employeeId ASC');
    return rows.map((r: any) => ({
      ...r,
      startDate: this.formatDateStr(r.startDate),
      dateOfBirth: this.formatDateStr(r.dateOfBirth),
      payRate: Number(r.payRate),
      holidayRate: Number(r.holidayRate)
    }));
  }

  public async getEmployeeById(id: string): Promise<Employee | null> {
    const [rows]: any = await pool.query('SELECT * FROM employees WHERE id = ? OR employeeId = ?', [id, id]);
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      ...r,
      startDate: this.formatDateStr(r.startDate),
      dateOfBirth: this.formatDateStr(r.dateOfBirth),
      payRate: Number(r.payRate),
      holidayRate: Number(r.holidayRate)
    };
  }

  public async saveEmployee(employee: Employee) {
    const existing = await this.getEmployeeById(employee.id);
    if (existing) {
      await pool.query(
        `UPDATE employees SET
          employeeId = ?, firstName = ?, middleInitial = ?, lastName = ?, displayName = ?,
          position = ?, department = ?, status = ?, employmentType = ?, payType = ?,
          payRate = ?, holidayRate = ?, startDate = ?, dateOfBirth = ?, personalPhone = ?,
          workPhone = ?, email = ?, address = ?, emergencyContactName = ?, emergencyContactPhone = ?,
          emergencyContactRelation = ?, paymentMethod = ?, bankName = ?, bankAccountMasked = ?
        WHERE id = ?`,
        [
          employee.employeeId, employee.firstName, employee.middleInitial || null, employee.lastName, employee.displayName,
          employee.position, employee.department, employee.status, employee.employmentType, employee.payType,
          employee.payRate, employee.holidayRate, employee.startDate, employee.dateOfBirth, employee.personalPhone,
          employee.workPhone, employee.email, employee.address, employee.emergencyContactName, employee.emergencyContactPhone,
          employee.emergencyContactRelation, employee.paymentMethod, employee.bankName || null, employee.bankAccountMasked || null,
          employee.id
        ]
      );
    } else {
      await pool.query(
        `INSERT INTO employees (
          id, employeeId, firstName, middleInitial, lastName, displayName, position, department,
          status, employmentType, payType, payRate, holidayRate, startDate, dateOfBirth,
          personalPhone, workPhone, email, address, emergencyContactName, emergencyContactPhone,
          emergencyContactRelation, paymentMethod, bankName, bankAccountMasked
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          employee.id, employee.employeeId, employee.firstName, employee.middleInitial || null, employee.lastName, employee.displayName,
          employee.position, employee.department, employee.status, employee.employmentType, employee.payType,
          employee.payRate, employee.holidayRate, employee.startDate, employee.dateOfBirth, employee.personalPhone,
          employee.workPhone, employee.email, employee.address, employee.emergencyContactName, employee.emergencyContactPhone,
          employee.emergencyContactRelation, employee.paymentMethod, employee.bankName || null, employee.bankAccountMasked || null
        ]
      );
    }
  }

  public async toggleEmployeeStatus(id: string) {
    const emp = await this.getEmployeeById(id);
    if (emp) {
      const newStatus = emp.status === 'Active' ? 'Inactive' : 'Active';
      await pool.query('UPDATE employees SET status = ? WHERE id = ? OR employeeId = ?', [newStatus, id, id]);
    }
  }

  public async getUsers(): Promise<UserAccount[]> {
    const [rows]: any = await pool.query('SELECT * FROM users ORDER BY createdAt ASC');
    return rows;
  }

  public async saveUser(user: UserAccount) {
    await pool.query(
      'INSERT INTO users (id, username, displayName, email, password, role, status, lastLogin, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE displayName = VALUES(displayName), password = VALUES(password), role = VALUES(role), status = VALUES(status), lastLogin = VALUES(lastLogin)',
      [user.id, user.username, user.displayName, user.email, user.password || 'ChangeMe123!', user.role, user.status, user.lastLogin || null, user.createdAt]
    );
  }

  public async toggleUserStatus(id: string, targetStatus?: string) {
    const [rows]: any = await pool.query('SELECT status FROM users WHERE id = ? OR username = ?', [id, id]);
    if (rows.length > 0) {
      const newStatus = targetStatus || (rows[0].status === 'Active' ? 'Inactive' : 'Active');
      await pool.query('UPDATE users SET status = ? WHERE id = ? OR username = ?', [newStatus, id, id]);
    }
  }

  public async getPayrollPeriods(): Promise<PayrollPeriod[]> {
    const [periods]: any = await pool.query('SELECT * FROM payroll_periods ORDER BY periodEnd DESC');
    for (const p of periods) {
      const [items]: any = await pool.query('SELECT * FROM employee_payroll_items WHERE periodId = ?', [p.id]);
      p.items = items.map((i: any) => ({
        ...i,
        regularRate: Number(i.regularRate),
        regularHours: Number(i.regularHours),
        regularPay: Number(i.regularPay),
        holidayRate: Number(i.holidayRate),
        holidayHours: Number(i.holidayHours),
        holidayPay: Number(i.holidayPay),
        otherPay: Number(i.otherPay),
        deductions: Number(i.deductions),
        totalHours: Number(i.totalHours),
        grossPay: Number(i.grossPay),
        netPay: Number(i.netPay)
      }));
      p.totalHours = Number(p.totalHours);
      p.totalGrossPayroll = Number(p.totalGrossPayroll);
      p.totalDeductions = Number(p.totalDeductions);
      p.totalNetPayroll = Number(p.totalNetPayroll);
    }
    return periods;
  }

  public async savePayrollPeriod(p: PayrollPeriod) {
    await pool.query(
      `INSERT INTO payroll_periods (id, periodStart, periodEnd, payDate, status, totalHours, totalGrossPayroll, totalDeductions, totalNetPayroll, createdBy, createdAt, approvedBy, approvedAt, paidAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE status = VALUES(status), totalHours = VALUES(totalHours), totalGrossPayroll = VALUES(totalGrossPayroll), totalDeductions = VALUES(totalDeductions), totalNetPayroll = VALUES(totalNetPayroll), approvedBy = VALUES(approvedBy), approvedAt = VALUES(approvedAt), paidAt = VALUES(paidAt)`,
      [p.id, p.periodStart, p.periodEnd, p.payDate, p.status, p.totalHours, p.totalGrossPayroll, p.totalDeductions, p.totalNetPayroll, p.createdBy, p.createdAt, p.approvedBy || null, p.approvedAt || null, p.paidAt || null]
    );

    if (p.items && p.items.length > 0) {
      await pool.query('DELETE FROM employee_payroll_items WHERE periodId = ?', [p.id]);
      for (const item of p.items) {
        await pool.query(
          `INSERT INTO employee_payroll_items (periodId, employeeId, employeeName, position, department, regularRate, regularHours, regularPay, holidayRate, holidayHours, holidayPay, otherPay, deductions, totalHours, grossPay, netPay, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [p.id, item.employeeId, item.employeeName, item.position, item.department, item.regularRate, item.regularHours, item.regularPay, item.holidayRate, item.holidayHours, item.holidayPay, item.otherPay, item.deductions, item.totalHours, item.grossPay, item.netPay, item.status]
        );
      }
    }
  }

  public async getLeaves(): Promise<LeaveRecord[]> {
    const [rows]: any = await pool.query('SELECT * FROM leave_records ORDER BY startDate DESC');
    return rows;
  }

  public async saveLeave(leave: LeaveRecord) {
    await pool.query(
      'INSERT INTO leave_records (id, employeeId, employeeName, leaveType, startDate, endDate, daysCount, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE status = VALUES(status), leaveType = VALUES(leaveType), startDate = VALUES(startDate), endDate = VALUES(endDate)',
      [leave.id, leave.employeeId, leave.employeeName, leave.leaveType, leave.startDate, leave.endDate, leave.daysCount, leave.status || 'Approved', leave.notes || '']
    );
  }

  public async syncEmployeeLeaves(employeeId: string, leaves: LeaveRecord[]) {
    await pool.query('DELETE FROM leave_records WHERE employeeId = ?', [employeeId]);
    for (const leave of leaves) {
      await pool.query(
        'INSERT INTO leave_records (id, employeeId, employeeName, leaveType, startDate, endDate, daysCount, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [leave.id, leave.employeeId, leave.employeeName, leave.leaveType, leave.startDate, leave.endDate, leave.daysCount, leave.status || 'Approved', leave.notes || '']
      );
    }
  }

  public async getSchedules(weekStartDate?: string): Promise<EmployeeSchedule[]> {
    let sql = 'SELECT * FROM schedules';
    let params: any[] = [];
    if (weekStartDate) {
      sql += ' WHERE weekStartDate = ?';
      params.push(weekStartDate);
    }
    const [rows]: any = await pool.query(sql, params);
    return rows.map((r: any) => ({
      employeeId: r.employeeId,
      weekStartDate: r.weekStartDate,
      shifts: typeof r.shiftsJson === 'string' ? JSON.parse(r.shiftsJson) : r.shiftsJson || {},
      totalHours: Number(r.totalHours)
    }));
  }

  public async saveSchedule(s: EmployeeSchedule) {
    await pool.query(
      `INSERT INTO schedules (employeeId, weekStartDate, shiftsJson, totalHours)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE shiftsJson = VALUES(shiftsJson), totalHours = VALUES(totalHours)`,
      [s.employeeId, s.weekStartDate, JSON.stringify(s.shifts || {}), s.totalHours]
    );
  }

  public async getAuditLogs(): Promise<AuditLogItem[]> {
    const [rows]: any = await pool.query('SELECT * FROM audit_logs ORDER BY timestamp DESC');
    return rows;
  }

  public async saveAuditLog(log: AuditLogItem) {
    await pool.query(
      `INSERT INTO audit_logs (id, action, module, user, role, timestamp, details)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE action = VALUES(action), details = VALUES(details)`,
      [log.id, log.action, log.module, log.user, log.role, log.timestamp, log.details || '']
    );
  }
}

export const mySQLDb = new MySQLDatabase();
