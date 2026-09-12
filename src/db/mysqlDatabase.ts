import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { 
  Employee, 
  PayrollPeriod, 
  LeaveRecord, 
  UserAccount, 
  AuditLogItem, 
  EmployeeSchedule,
  Customer,
  Invoice,
  Payment,
  GeneralLedgerEntry,
  TimeRecord
} from '../types';

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

      // 8. Create Customers Table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS customers (
          id VARCHAR(100) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          customerName VARCHAR(255),
          phone VARCHAR(50),
          email VARCHAR(150),
          billingAddress TEXT,
          shippingAddress TEXT,
          status ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
          notes TEXT,
          aliasesJson JSON,
          balance DECIMAL(12,2) DEFAULT 0.00,
          createdAt VARCHAR(50)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 9. Create Invoices Table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS invoices (
          id VARCHAR(100) PRIMARY KEY,
          customerId VARCHAR(100) NOT NULL,
          customerName VARCHAR(255),
          customerEmail VARCHAR(150),
          number VARCHAR(100) NOT NULL,
          terms VARCHAR(50) DEFAULT 'Due on receipt',
          date DATE NOT NULL,
          dueDate DATE NOT NULL,
          itemsJson JSON,
          memo TEXT,
          amount DECIMAL(12,2) DEFAULT 0.00,
          paidAmount DECIMAL(12,2) DEFAULT 0.00,
          balance DECIMAL(12,2) DEFAULT 0.00,
          status ENUM('Paid', 'Owing') DEFAULT 'Owing',
          createdAt VARCHAR(50),
          INDEX idx_customer (customerId)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 10. Create Payments Table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS payments (
          id VARCHAR(100) PRIMARY KEY,
          customerId VARCHAR(100) NOT NULL,
          customerName VARCHAR(255),
          invoiceId VARCHAR(100),
          amount DECIMAL(12,2) DEFAULT 0.00,
          date DATE NOT NULL,
          method VARCHAR(100) DEFAULT 'Bank Transfer',
          reference VARCHAR(100),
          note TEXT,
          createdAt VARCHAR(50),
          INDEX idx_pay_customer (customerId)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 11. Create General Ledger Table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS general_ledger (
          id VARCHAR(100) PRIMARY KEY,
          date DATE NOT NULL,
          type VARCHAR(100) NOT NULL,
          number VARCHAR(100),
          name VARCHAR(255),
          memo TEXT,
          account VARCHAR(200),
          debit DECIMAL(12,2) DEFAULT 0.00,
          credit DECIMAL(12,2) DEFAULT 0.00,
          source VARCHAR(100),
          balance DECIMAL(12,2),
          INDEX idx_gl_date (date),
          INDEX idx_gl_name (name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 12. Create Time Records Table (For Staff Clock In / Clock Out & Hours Export)
      await connection.query(`
        CREATE TABLE IF NOT EXISTS time_records (
          id VARCHAR(50) PRIMARY KEY,
          userId VARCHAR(50) NOT NULL,
          employeeId VARCHAR(50),
          employeeName VARCHAR(200) NOT NULL,
          clockIn VARCHAR(100) NOT NULL,
          clockOut VARCHAR(100),
          totalHours DECIMAL(6,2) DEFAULT 0.00,
          status ENUM('ClockedIn', 'ClockedOut') NOT NULL DEFAULT 'ClockedIn',
          notes TEXT,
          createdAt VARCHAR(100),
          INDEX idx_user_time (userId),
          INDEX idx_emp_time (employeeId)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 13. Create App Settings & Workspace Notes Table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS app_settings (
          settingKey VARCHAR(100) PRIMARY KEY,
          settingValue LONGTEXT,
          updatedAt VARCHAR(100)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 14. Create Staff Records Table (For Sick, Vacation & Notes History)
      await connection.query(`
        CREATE TABLE IF NOT EXISTS staff_records (
          id VARCHAR(100) PRIMARY KEY,
          staffId VARCHAR(50) NOT NULL,
          type VARCHAR(50) NOT NULL,
          date DATE NOT NULL,
          note TEXT,
          createdAt VARCHAR(100) NOT NULL,
          INDEX idx_staff_id (staffId)
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
      // Check & Seed Super Admin, Admin, and Staff Users
      const defaultUsers = [
        {
          id: 'usr-1',
          username: 'admin',
          displayName: 'Administrator',
          email: 'operations@centraldispatch.bm',
          role: 'admin',
          status: 'Active',
          lastLogin: '2026-09-10 10:30 AM',
          createdAt: '2026-01-01'
        },
        {
          id: 'usr-2',
          username: 'superadmin',
          displayName: 'Super Admin',
          email: 'admin@centraldispatch.bm',
          role: 'superadmin',
          status: 'Active',
          lastLogin: '2026-09-10 12:00 PM',
          createdAt: '2026-01-01'
        },
        {
          id: 'usr-3',
          username: 'staff',
          displayName: 'John Doe (Staff)',
          email: 'johndoe@centraldispatch.bm',
          role: 'staff',
          status: 'Active',
          lastLogin: '2026-09-10 08:45 AM',
          createdAt: '2026-01-01'
        }
      ];

      for (const u of defaultUsers) {
        await pool.query(
          `INSERT INTO users (id, username, displayName, email, password, role, status, lastLogin, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE role = VALUES(role), status = VALUES(status)`,
          [u.id, u.username, u.displayName, u.email, 'ChangeMe123!', u.role, u.status, u.lastLogin, u.createdAt]
        );
      }
      // Check & Seed Initial Master Staff Members (at least 8 loaded with full details)
      const initialStaffList = [
        {
          id: 'ali',
          employeeId: 'CDL-001',
          firstName: 'Hamza',
          middleInitial: '',
          lastName: 'Ali',
          displayName: 'Ali Hamza',
          position: 'Global Dispatch / Call Center',
          department: 'Operations',
          status: 'Active',
          employmentType: 'Full-Time',
          payType: 'Hourly',
          payRate: 18.00,
          holidayRate: 27.00,
          startDate: '2024-01-15',
          dateOfBirth: '1992-04-12',
          personalPhone: '(441) 505-1234',
          workPhone: '(441) 295-4141',
          email: 'hamza@gdmbpo.com',
          address: '3 Laffan Street, Pembroke HM09, Bermuda',
          emergencyContactName: 'Sarah Hamza',
          emergencyContactPhone: '(441) 518-9901',
          emergencyContactRelation: 'Spouse',
          paymentMethod: 'Direct Deposit',
          bankName: 'Bank of N.T. Butterfield & Son',
          bankAccountMasked: '••••••••4821'
        },
        {
          id: 'alesia',
          employeeId: 'CDL-002',
          firstName: 'Alesia',
          middleInitial: '',
          lastName: 'Brangman',
          displayName: 'Alesia Brangman',
          position: 'Dispatch Supervisor',
          department: 'Operations',
          status: 'Active',
          employmentType: 'Full-Time',
          payType: 'Hourly',
          payRate: 20.00,
          holidayRate: 30.00,
          startDate: '2023-05-10',
          dateOfBirth: '1989-11-23',
          personalPhone: '(441) 534-8822',
          workPhone: '(441) 295-4141',
          email: 'alesia.brangman@centraldispatch.bm',
          address: '14 Cedar Avenue, Hamilton HM11, Bermuda',
          emergencyContactName: 'David Brangman',
          emergencyContactPhone: '(441) 504-3321',
          emergencyContactRelation: 'Brother',
          paymentMethod: 'Direct Deposit',
          bankName: 'HSBC Bank Bermuda',
          bankAccountMasked: '••••••••6632'
        },
        {
          id: 'ty',
          employeeId: 'CDL-003',
          firstName: 'Tyonika',
          middleInitial: '',
          lastName: 'McGowan',
          displayName: 'Tyonika McGowan (Ty)',
          position: 'Dispatcher',
          department: 'Operations',
          status: 'Active',
          employmentType: 'Full-Time',
          payType: 'Hourly',
          payRate: 16.50,
          holidayRate: 24.75,
          startDate: '2024-03-01',
          dateOfBirth: '1996-08-19',
          personalPhone: '(441) 516-7733',
          workPhone: '(441) 295-4141',
          email: 'tyonika.mcgowan@centraldispatch.bm',
          address: '22 Middle Road, Devonshire DV06, Bermuda',
          emergencyContactName: 'Patricia McGowan',
          emergencyContactPhone: '(441) 522-8811',
          emergencyContactRelation: 'Mother',
          paymentMethod: 'Direct Deposit',
          bankName: 'Clarien Bank',
          bankAccountMasked: '••••••••9012'
        },
        {
          id: 'neli',
          employeeId: 'CDL-004',
          firstName: 'Neli',
          middleInitial: '',
          lastName: 'Outerbridge',
          displayName: 'Neli Outerbridge',
          position: 'Owner / Manager / Director',
          department: 'Management',
          status: 'Active',
          employmentType: 'Full-Time',
          payType: 'Salaried',
          payRate: 35.00,
          holidayRate: 52.50,
          startDate: '2020-01-01',
          dateOfBirth: '1978-02-14',
          personalPhone: '(441) 599-4455',
          workPhone: '(441) 295-4141',
          email: 'neli@bermudaislandtaxi.com',
          address: '8 Harbour Road, Paget PG02, Bermuda',
          emergencyContactName: 'Robert Outerbridge',
          emergencyContactPhone: '(441) 501-6677',
          emergencyContactRelation: 'Spouse',
          paymentMethod: 'Direct Deposit',
          bankName: 'Bank of N.T. Butterfield & Son',
          bankAccountMasked: '••••••••1109'
        },
        {
          id: 'ssh',
          employeeId: 'CDL-005',
          firstName: 'SSH',
          middleInitial: '',
          lastName: 'SSH',
          displayName: 'SSH, SSH',
          position: 'SSH Dispatch / Call Center',
          department: 'Operations',
          status: 'Active',
          employmentType: 'Full-Time',
          payType: 'Hourly',
          payRate: 16.00,
          holidayRate: 24.00,
          startDate: '2024-02-15',
          dateOfBirth: '1994-09-30',
          personalPhone: '(441) 527-9944',
          workPhone: '(441) 295-4141',
          email: 'ssh.dispatch@centraldispatch.bm',
          address: '5 North Shore Road, Pembroke HM14, Bermuda',
          emergencyContactName: 'Michael Smith',
          emergencyContactPhone: '(441) 512-3344',
          emergencyContactRelation: 'Guardian',
          paymentMethod: 'Direct Deposit',
          bankName: 'Butterfield Bank Bermuda',
          bankAccountMasked: '••••••••7741'
        },
        {
          id: 'staff6',
          employeeId: 'CDL-006',
          firstName: 'Shonee',
          middleInitial: '',
          lastName: 'Simons',
          displayName: 'Miss Shonee Simons',
          position: 'Dispatcher',
          department: 'Operations',
          status: 'Active',
          employmentType: 'Full-Time',
          payType: 'Hourly',
          payRate: 16.00,
          holidayRate: 24.00,
          startDate: '2024-06-01',
          dateOfBirth: '1997-07-22',
          personalPhone: '(441) 532-6611',
          workPhone: '(441) 295-4141',
          email: 'shonee.simons@centraldispatch.bm',
          address: '19 South Road, Warwick WK08, Bermuda',
          emergencyContactName: 'Cheryl Simons',
          emergencyContactPhone: '(441) 508-4422',
          emergencyContactRelation: 'Mother',
          paymentMethod: 'Direct Deposit',
          bankName: 'HSBC Bank Bermuda',
          bankAccountMasked: '••••••••3320'
        },
        {
          id: 'staff7',
          employeeId: 'CDL-007',
          firstName: 'Tiffany',
          middleInitial: '',
          lastName: 'Robinson',
          displayName: 'Miss Tiffany Robinson',
          position: 'Dispatcher / Customer Service',
          department: 'Operations',
          status: 'Active',
          employmentType: 'Full-Time',
          payType: 'Hourly',
          payRate: 16.00,
          holidayRate: 24.00,
          startDate: '2024-04-10',
          dateOfBirth: '1995-12-05',
          personalPhone: '(441) 519-2288',
          workPhone: '(441) 295-4141',
          email: 'tiffany.robinson@centraldispatch.bm',
          address: '7 Palmetto Road, Devonshire DV05, Bermuda',
          emergencyContactName: 'James Robinson',
          emergencyContactPhone: '(441) 529-1100',
          emergencyContactRelation: 'Father',
          paymentMethod: 'Direct Deposit',
          bankName: 'Butterfield Bank Bermuda',
          bankAccountMasked: '••••••••8819'
        },
        {
          id: 'staff8',
          employeeId: 'CDL-008',
          firstName: 'Tanuvi',
          middleInitial: '',
          lastName: 'Patel',
          displayName: 'Tanuvi Patel',
          position: 'Dispatcher / Operations',
          department: 'Operations',
          status: 'Active',
          employmentType: 'Full-Time',
          payType: 'Hourly',
          payRate: 16.50,
          holidayRate: 24.75,
          startDate: '2024-05-15',
          dateOfBirth: '1998-03-17',
          personalPhone: '(441) 538-4499',
          workPhone: '(441) 295-4141',
          email: 'tanuvi.patel@centraldispatch.bm',
          address: '11 Point Finger Road, Paget DV04, Bermuda',
          emergencyContactName: 'Ramesh Patel',
          emergencyContactPhone: '(441) 507-8899',
          emergencyContactRelation: 'Father',
          paymentMethod: 'Direct Deposit',
          bankName: 'HSBC Bank Bermuda',
          bankAccountMasked: '••••••••5512'
        }
      ];

      for (const emp of initialStaffList) {
        await pool.query(
          `INSERT INTO employees (
            id, employeeId, firstName, middleInitial, lastName, displayName, position, department,
            status, employmentType, payType, payRate, holidayRate, startDate, dateOfBirth,
            personalPhone, workPhone, email, address, emergencyContactName, emergencyContactPhone,
            emergencyContactRelation, paymentMethod, bankName, bankAccountMasked
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            displayName = IF(displayName = '' OR displayName IS NULL, VALUES(displayName), displayName),
            email = IF(email LIKE '%t@gmail.com%' OR email = '' OR email IS NULL, VALUES(email), email),
            personalPhone = IF(personalPhone = '' OR personalPhone IS NULL, VALUES(personalPhone), personalPhone),
            address = IF(address = '' OR address IS NULL, VALUES(address), address),
            emergencyContactName = IF(emergencyContactName = '' OR emergencyContactName IS NULL, VALUES(emergencyContactName), emergencyContactName),
            emergencyContactPhone = IF(emergencyContactPhone = '' OR emergencyContactPhone IS NULL, VALUES(emergencyContactPhone), emergencyContactPhone)`,
          [
            emp.id, emp.employeeId, emp.firstName, emp.middleInitial, emp.lastName, emp.displayName,
            emp.position, emp.department, emp.status, emp.employmentType, emp.payType,
            emp.payRate, emp.holidayRate, emp.startDate, emp.dateOfBirth, emp.personalPhone,
            emp.workPhone, emp.email, emp.address, emp.emergencyContactName, emp.emergencyContactPhone,
            emp.emergencyContactRelation, emp.paymentMethod, emp.bankName, emp.bankAccountMasked
          ]
        );
      }
      console.log('✅ Initial 8 full staff records verified in MySQL employees table!');

      // Check & Seed Imported Accounting Customers & General Ledger if empty
      const [custRows]: any = await pool.query('SELECT COUNT(*) as count FROM customers');
      const [invRows]: any = await pool.query('SELECT COUNT(*) as count FROM invoices');
      const [pmtRows]: any = await pool.query('SELECT COUNT(*) as count FROM payments');

      const dataPath = path.resolve(__dirname, 'importedAccountingData.json');
      if (fs.existsSync(dataPath) && (custRows[0].count === 0 || invRows[0].count === 0 || pmtRows[0].count === 0)) {
        console.log('🌱 Seeding 782 Customers, 1,927 GL Transactions, 59 Invoices & 58 Payments into MySQL (2024-2026 Data)...');
        const raw = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        
        // 1. Seed Customers
        if (raw.customers && Array.isArray(raw.customers)) {
          for (const c of raw.customers) {
            await pool.query(
              `INSERT INTO customers (id, name, customerName, phone, email, billingAddress, shippingAddress, status, notes, aliasesJson, balance, createdAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE name=VALUES(name)`,
              [
                c.id,
                c.name,
                c.customerName || c.name,
                c.phone || '',
                c.email || '',
                c.billingAddress || '',
                c.shippingAddress || '',
                c.status || 'Active',
                c.notes || '',
                JSON.stringify(c.aliases || []),
                c.balance || 0,
                c.createdAt || new Date().toISOString()
              ]
            );
          }
          console.log(`✅ Seeded ${raw.customers.length} Customers!`);
        }

        // 2. Seed General Ledger
        if (raw.generalLedger && Array.isArray(raw.generalLedger)) {
          let glCount = 0;
          for (const gl of raw.generalLedger) {
            const glId = gl.id || ('gl-' + (++glCount));
            await pool.query(
              `INSERT INTO general_ledger (id, date, type, number, name, memo, account, debit, credit, source, balance)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE name=VALUES(name)`,
              [
                glId,
                gl.date || '2026-01-01',
                gl.type || 'General',
                gl.number || '',
                gl.name || '',
                gl.memo || '',
                gl.account || 'Accounts Receivable',
                gl.debit || 0,
                gl.credit || 0,
                gl.source || 'General Ledger Import',
                gl.balance || null
              ]
            );
          }
          console.log(`✅ Seeded ${raw.generalLedger.length} General Ledger entries!`);
        }

        // 3. Extract & Seed 2024-2026 Invoices & Payments
        const custLookup = new Map<string, any>();
        if (raw.customers && Array.isArray(raw.customers)) {
          raw.customers.forEach((c: any) => {
            const names = [c.name, c.customerName, ...(c.aliases || [])].filter(Boolean).map(n => n.toLowerCase().trim());
            names.forEach(n => custLookup.set(n, c));
          });
        }

        const findCust = (name: string) => {
          if (!name) return null;
          const clean = name.toLowerCase().trim();
          let f = custLookup.get(clean);
          if (f) return f;
          for (const [k, v] of custLookup.entries()) {
            if (clean.includes(k) || (k.length > 5 && k.includes(clean))) return v;
          }
          return null;
        };

        const invoiceGroups = new Map<string, any>();
        const extractedInvoices: any[] = [];
        const extractedPayments: any[] = [];

        if (raw.generalLedger && Array.isArray(raw.generalLedger)) {
          // Group pledges into Invoices
          raw.generalLedger.forEach((g: any) => {
            if (g.type === 'Pledge') {
              const invNum = g.number ? `INV-${g.number}` : `INV-PLEDGE-${g.id}`;
              const cust = findCust(g.name);
              const custId = cust ? cust.id : `cust_anon_${g.id}`;
              const custName = cust ? cust.name : (g.name || 'Account Customer');
              const custEmail = cust ? cust.email : '';
              const key = `${invNum}_${custId}`;
              const amt = Number(g.debit || g.credit || 0);

              if (!invoiceGroups.has(key)) {
                invoiceGroups.set(key, {
                  id: `inv-${g.id}`,
                  customerId: custId,
                  customerName: custName,
                  customerEmail: custEmail,
                  number: invNum,
                  terms: 'Net 30',
                  date: g.date,
                  dueDate: g.date,
                  items: [],
                  memo: g.memo || 'Dispatch & Transportation Services',
                  amount: 0,
                  paidAmount: 0,
                  balance: 0,
                  status: 'Owing',
                  createdAt: g.date
                });
              }

              const grp = invoiceGroups.get(key);
              grp.items.push({
                description: g.memo || g.account || 'Dispatch Transportation Voucher',
                quantity: 1,
                rate: amt,
                amount: amt
              });
              grp.amount += amt;
            }

            // Extract Payments
            if (g.type === 'Payment') {
              const cust = findCust(g.name);
              const custId = cust ? cust.id : `cust_anon_${g.id}`;
              const custName = cust ? cust.name : (g.name || 'Account Customer');
              const amt = Number(g.debit || g.credit || 0);

              extractedPayments.push({
                id: `pmt-${g.id}`,
                customerId: custId,
                customerName: custName,
                invoiceId: '',
                amount: amt,
                date: g.date,
                method: g.number && g.number.includes('AX') ? 'Credit Card' : 'Bank Transfer',
                reference: g.number || 'PAYMENT-REF',
                note: g.memo || g.account || 'Account Payment',
                createdAt: g.date
              });
            }
          });

          invoiceGroups.forEach(inv => {
            const d = new Date(inv.date);
            d.setDate(d.getDate() + 30);
            inv.dueDate = d.toISOString().slice(0, 10);
            inv.balance = inv.amount;
            inv.paidAmount = 0;
            inv.status = 'Owing';
            extractedInvoices.push(inv);
          });

          // Match payments to invoices
          extractedPayments.forEach(pmt => {
            const matchInv = extractedInvoices.find(inv => inv.customerId === pmt.customerId && inv.balance > 0);
            if (matchInv) {
              const applyAmt = Math.min(matchInv.balance, pmt.amount);
              pmt.invoiceId = matchInv.id;
              matchInv.paidAmount += applyAmt;
              matchInv.balance -= applyAmt;
              if (matchInv.balance <= 0.004) {
                matchInv.status = 'Paid';
              }
            }
          });

          // Insert invoices into MySQL
          for (const inv of extractedInvoices) {
            await pool.query(
              `INSERT INTO invoices (id, customerId, customerName, customerEmail, number, terms, date, dueDate, itemsJson, memo, amount, paidAmount, balance, status, createdAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE amount=VALUES(amount), paidAmount=VALUES(paidAmount), balance=VALUES(balance), status=VALUES(status)`,
              [
                inv.id, inv.customerId, inv.customerName, inv.customerEmail || '', inv.number,
                inv.terms, inv.date, inv.dueDate, JSON.stringify(inv.items), inv.memo,
                inv.amount, inv.paidAmount, inv.balance, inv.status, inv.createdAt
              ]
            );
          }
          console.log(`✅ Seeded ${extractedInvoices.length} Invoices into MySQL!`);

          // Insert payments into MySQL
          for (const pmt of extractedPayments) {
            await pool.query(
              `INSERT INTO payments (id, customerId, customerName, invoiceId, amount, date, method, reference, note, createdAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE amount=VALUES(amount)`,
              [
                pmt.id, pmt.customerId, pmt.customerName, pmt.invoiceId || null,
                pmt.amount, pmt.date, pmt.method, pmt.reference, pmt.note, pmt.createdAt
              ]
            );
          }
          console.log(`✅ Seeded ${extractedPayments.length} Payments into MySQL!`);

          // Update customer balances in MySQL
          const custBalanceMap = new Map<string, number>();
          extractedInvoices.forEach(i => {
            const b = custBalanceMap.get(i.customerId) || 0;
            custBalanceMap.set(i.customerId, b + Number(i.balance || 0));
          });

          for (const [custId, bal] of custBalanceMap.entries()) {
            await pool.query('UPDATE customers SET balance = ? WHERE id = ?', [bal, custId]);
          }
          console.log('✅ Customer balances updated in MySQL!');
        }
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

  public async deleteEmployee(id: string) {
    await pool.query('DELETE FROM employees WHERE id = ? OR employeeId = ?', [id, id]);
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

  // ==========================================================
  // CUSTOMER ACCOUNTING, INVOICES, PAYMENTS & GL
  // ==========================================================
  
  public async getCustomers(): Promise<Customer[]> {
    const [rows]: any = await pool.query('SELECT * FROM customers ORDER BY name ASC');
    return rows.map((r: any) => ({
      ...r,
      balance: Number(r.balance || 0),
      aliases: typeof r.aliasesJson === 'string' ? JSON.parse(r.aliasesJson) : (r.aliasesJson || [])
    }));
  }

  public async getCustomerById(id: string): Promise<Customer | null> {
    const [rows]: any = await pool.query('SELECT * FROM customers WHERE id = ? OR name = ?', [id, id]);
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      ...r,
      balance: Number(r.balance || 0),
      aliases: typeof r.aliasesJson === 'string' ? JSON.parse(r.aliasesJson) : (r.aliasesJson || [])
    };
  }

  public async saveCustomer(c: Customer): Promise<Customer> {
    const aliasesStr = JSON.stringify(c.aliases || []);
    await pool.query(
      `INSERT INTO customers (id, name, customerName, phone, email, billingAddress, shippingAddress, status, notes, aliasesJson, balance, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name=VALUES(name), customerName=VALUES(customerName), phone=VALUES(phone), email=VALUES(email),
       billingAddress=VALUES(billingAddress), shippingAddress=VALUES(shippingAddress), status=VALUES(status),
       notes=VALUES(notes), aliasesJson=VALUES(aliasesJson), balance=VALUES(balance)`,
      [
        c.id, c.name, c.customerName || c.name, c.phone || '', c.email || '',
        c.billingAddress || '', c.shippingAddress || '', c.status || 'Active',
        c.notes || '', aliasesStr, c.balance || 0, c.createdAt || new Date().toISOString()
      ]
    );
    return c;
  }

  public async deleteCustomer(id: string): Promise<boolean> {
    await pool.query('DELETE FROM customers WHERE id = ?', [id]);
    return true;
  }

  public async getInvoices(customerId?: string): Promise<Invoice[]> {
    let sql = 'SELECT * FROM invoices';
    const params: any[] = [];
    if (customerId) {
      sql += ' WHERE customerId = ?';
      params.push(customerId);
    }
    sql += ' ORDER BY date DESC, number DESC';
    const [rows]: any = await pool.query(sql, params);
    return rows.map((r: any) => ({
      ...r,
      date: this.formatDateStr(r.date),
      dueDate: this.formatDateStr(r.dueDate),
      amount: Number(r.amount || 0),
      paidAmount: Number(r.paidAmount || 0),
      balance: Number(r.balance || 0),
      items: typeof r.itemsJson === 'string' ? JSON.parse(r.itemsJson) : (r.itemsJson || [])
    }));
  }

  public async getInvoiceById(id: string): Promise<Invoice | null> {
    const [rows]: any = await pool.query('SELECT * FROM invoices WHERE id = ? OR number = ?', [id, id]);
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      ...r,
      date: this.formatDateStr(r.date),
      dueDate: this.formatDateStr(r.dueDate),
      amount: Number(r.amount || 0),
      paidAmount: Number(r.paidAmount || 0),
      balance: Number(r.balance || 0),
      items: typeof r.itemsJson === 'string' ? JSON.parse(r.itemsJson) : (r.itemsJson || [])
    };
  }

  public async saveInvoice(inv: Invoice): Promise<Invoice> {
    const itemsStr = JSON.stringify(inv.items || []);
    await pool.query(
      `INSERT INTO invoices (id, customerId, customerName, customerEmail, number, terms, date, dueDate, itemsJson, memo, amount, paidAmount, balance, status, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE customerName=VALUES(customerName), customerEmail=VALUES(customerEmail),
       terms=VALUES(terms), date=VALUES(date), dueDate=VALUES(dueDate), itemsJson=VALUES(itemsJson),
       memo=VALUES(memo), amount=VALUES(amount), paidAmount=VALUES(paidAmount), balance=VALUES(balance), status=VALUES(status)`,
      [
        inv.id, inv.customerId, inv.customerName || '', inv.customerEmail || '', inv.number,
        inv.terms || 'Due on receipt', inv.date, inv.dueDate, itemsStr, inv.memo || '',
        inv.amount || 0, inv.paidAmount || 0, inv.balance || 0, inv.status || 'Owing',
        inv.createdAt || new Date().toISOString()
      ]
    );
    return inv;
  }

  public async deleteInvoice(id: string): Promise<boolean> {
    await pool.query('DELETE FROM invoices WHERE id = ?', [id]);
    return true;
  }

  public async getPayments(customerId?: string): Promise<Payment[]> {
    let sql = 'SELECT * FROM payments';
    const params: any[] = [];
    if (customerId) {
      sql += ' WHERE customerId = ?';
      params.push(customerId);
    }
    sql += ' ORDER BY date DESC';
    const [rows]: any = await pool.query(sql, params);
    return rows.map((r: any) => ({
      ...r,
      date: this.formatDateStr(r.date),
      amount: Number(r.amount || 0)
    }));
  }

  public async savePayment(p: Payment): Promise<Payment> {
    const cleanDate = p.date ? String(p.date).slice(0, 10) : new Date().toISOString().slice(0, 10);
    const cleanInvoiceId = p.invoiceId && String(p.invoiceId).trim() ? String(p.invoiceId).trim() : null;
    const cleanAmount = Number(p.amount) || 0;
    const cleanCreatedAt = p.createdAt ? String(p.createdAt).slice(0, 50) : new Date().toISOString();

    await pool.query(
      `INSERT INTO payments (id, customerId, customerName, invoiceId, amount, date, method, reference, note, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE customerName=VALUES(customerName), invoiceId=VALUES(invoiceId), amount=VALUES(amount),
       date=VALUES(date), method=VALUES(method), reference=VALUES(reference), note=VALUES(note)`,
      [
        p.id, p.customerId, p.customerName || '', cleanInvoiceId, cleanAmount,
        cleanDate, p.method || 'Bank Transfer', p.reference || '', p.note || '',
        cleanCreatedAt
      ]
    );
    return p;
  }

  public async deletePayment(id: string): Promise<boolean> {
    await pool.query('DELETE FROM payments WHERE id = ?', [id]);
    return true;
  }

  public async getGeneralLedger(filter?: { startDate?: string; endDate?: string; customerName?: string; account?: string; type?: string }): Promise<GeneralLedgerEntry[]> {
    let sql = 'SELECT * FROM general_ledger WHERE 1=1';
    const params: any[] = [];

    if (filter?.startDate) {
      sql += ' AND date >= ?';
      params.push(filter.startDate);
    }
    if (filter?.endDate) {
      sql += ' AND date <= ?';
      params.push(filter.endDate);
    }
    if (filter?.customerName) {
      sql += ' AND name LIKE ?';
      params.push(`%${filter.customerName}%`);
    }
    if (filter?.account) {
      sql += ' AND account = ?';
      params.push(filter.account);
    }
    if (filter?.type) {
      sql += ' AND type = ?';
      params.push(filter.type);
    }

    sql += ' ORDER BY date DESC, id DESC';
    const [rows]: any = await pool.query(sql, params);
    return rows.map((r: any) => ({
      ...r,
      date: this.formatDateStr(r.date),
      debit: Number(r.debit || 0),
      credit: Number(r.credit || 0),
      balance: r.balance != null ? Number(r.balance) : null
    }));
  }

  public async saveGeneralLedgerEntry(entry: GeneralLedgerEntry): Promise<GeneralLedgerEntry> {
    const id = entry.id || ('gl-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6));
    await pool.query(
      `INSERT INTO general_ledger (id, date, type, number, name, memo, account, debit, credit, source, balance)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE date=VALUES(date), type=VALUES(type), number=VALUES(number), name=VALUES(name),
       memo=VALUES(memo), account=VALUES(account), debit=VALUES(debit), credit=VALUES(credit), balance=VALUES(balance)`,
      [
        id, entry.date, entry.type, entry.number || '', entry.name || '',
        entry.memo || '', entry.account || 'Accounts Receivable', entry.debit || 0,
        entry.credit || 0, entry.source || 'Manual Entry', entry.balance || null
      ]
    );
    return { ...entry, id };
  }

  // ==========================================================
  // TIME RECORDS / MY TIME (For Staff Clock In/Out & Export)
  // ==========================================================

  public async getTimeRecords(userId?: string): Promise<TimeRecord[]> {
    let sql = 'SELECT * FROM time_records';
    const params: any[] = [];
    if (userId) {
      sql += ' WHERE userId = ? OR employeeId = ?';
      params.push(userId, userId);
    }
    sql += ' ORDER BY createdAt DESC, clockIn DESC';
    const [rows]: any = await pool.query(sql, params);
    return rows.map((r: any) => ({
      ...r,
      totalHours: Number(r.totalHours || 0)
    }));
  }

  public async getLatestTimeRecord(userId: string): Promise<TimeRecord | null> {
    // 1. Check for active ClockedIn session first
    const [activeRows]: any = await pool.query(
      "SELECT * FROM time_records WHERE (userId = ? OR employeeId = ?) AND status = 'ClockedIn' ORDER BY createdAt DESC, id DESC LIMIT 1",
      [userId, userId]
    );
    if (activeRows.length > 0) {
      const r = activeRows[0];
      return {
        ...r,
        totalHours: Number(r.totalHours || 0)
      };
    }

    // 2. Otherwise return the latest completed record
    const [rows]: any = await pool.query(
      'SELECT * FROM time_records WHERE userId = ? OR employeeId = ? ORDER BY createdAt DESC, id DESC LIMIT 1',
      [userId, userId]
    );
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      ...r,
      totalHours: Number(r.totalHours || 0)
    };
  }

  public async clockIn(userId: string, employeeName: string, employeeId?: string, notes?: string): Promise<TimeRecord> {
    const now = new Date().toISOString();

    // Close any previous open session for this user
    await pool.query(
      "UPDATE time_records SET status = 'ClockedOut', clockOut = ?, totalHours = 0.01 WHERE (userId = ? OR employeeId = ?) AND status = 'ClockedIn'",
      [now, userId, userId]
    ).catch(() => {});

    const id = `time-${Date.now()}`;
    const newRecord: TimeRecord = {
      id,
      userId,
      employeeId: employeeId || userId,
      employeeName,
      clockIn: now,
      totalHours: 0,
      status: 'ClockedIn',
      notes: notes || '',
      createdAt: now
    };

    await pool.query(
      `INSERT INTO time_records (id, userId, employeeId, employeeName, clockIn, totalHours, status, notes, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [newRecord.id, newRecord.userId, newRecord.employeeId, newRecord.employeeName, newRecord.clockIn, 0, 'ClockedIn', newRecord.notes, newRecord.createdAt]
    );

    return newRecord;
  }

  public async clockOut(userId: string, notes?: string): Promise<TimeRecord | null> {
    const [activeRows]: any = await pool.query(
      "SELECT * FROM time_records WHERE (userId = ? OR employeeId = ?) AND status = 'ClockedIn' ORDER BY createdAt DESC, id DESC LIMIT 1",
      [userId, userId]
    );

    const now = new Date().toISOString();
    if (activeRows.length === 0) {
      return this.getLatestTimeRecord(userId);
    }

    const latest = activeRows[0];
    let clockInTime = new Date(latest.clockIn).getTime();
    if (isNaN(clockInTime)) {
      clockInTime = new Date(latest.createdAt).getTime();
    }
    const clockOutTime = new Date(now).getTime();
    const diffMs = !isNaN(clockInTime) ? Math.max(0, clockOutTime - clockInTime) : 0;
    const hours = Math.max(0.01, Number((diffMs / (1000 * 60 * 60)).toFixed(2)));

    const updatedNotes = notes ? (latest.notes ? `${latest.notes} | ${notes}` : notes) : latest.notes;

    await pool.query(
      "UPDATE time_records SET clockOut = ?, totalHours = ?, status = 'ClockedOut', notes = ? WHERE (userId = ? OR employeeId = ?) AND status = 'ClockedIn'",
      [now, hours, updatedNotes || '', userId, userId]
    );

    return {
      ...latest,
      clockOut: now,
      totalHours: hours,
      status: 'ClockedOut',
      notes: updatedNotes
    };
  }

  // ==========================================================
  // USERS & PASSWORD MANAGEMENT
  // ==========================================================
  public async getUsers(): Promise<UserAccount[]> {
    const [rows]: any = await pool.query('SELECT * FROM users ORDER BY role ASC, displayName ASC');
    return rows.map((r: any) => ({
      id: r.id,
      username: r.username,
      displayName: r.displayName,
      email: r.email,
      role: r.role,
      status: r.status,
      password: r.password,
      lastLogin: r.lastLogin,
      createdAt: this.formatDateStr(r.createdAt)
    }));
  }

  public async getUserById(idOrUsername: string): Promise<UserAccount | null> {
    const [rows]: any = await pool.query(
      'SELECT * FROM users WHERE id = ? OR LOWER(username) = LOWER(?) LIMIT 1',
      [idOrUsername, idOrUsername]
    );
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      username: r.username,
      displayName: r.displayName,
      email: r.email,
      role: r.role,
      status: r.status,
      password: r.password,
      lastLogin: r.lastLogin,
      createdAt: this.formatDateStr(r.createdAt)
    };
  }

  public async saveUser(user: UserAccount): Promise<UserAccount> {
    await pool.query(
      `INSERT INTO users (id, username, displayName, email, password, role, status, lastLogin, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE displayName=VALUES(displayName), email=VALUES(email), role=VALUES(role),
       status=VALUES(status), password=VALUES(password), lastLogin=VALUES(lastLogin)`,
      [
        user.id,
        user.username,
        user.displayName,
        user.email,
        user.password || 'ChangeMe123!',
        user.role,
        user.status || 'Active',
        user.lastLogin || null,
        user.createdAt || new Date().toISOString().split('T')[0]
      ]
    );
    return user;
  }

  public async toggleUserStatus(id: string, newStatus?: string): Promise<void> {
    if (newStatus) {
      await pool.query('UPDATE users SET status = ? WHERE id = ? OR username = ?', [newStatus, id, id]);
    } else {
      await pool.query(
        "UPDATE users SET status = CASE WHEN status = 'Active' THEN 'Inactive' ELSE 'Active' END WHERE id = ? OR username = ?",
        [id, id]
      );
    }
  }

  public async updateUserPassword(userIdOrUsername: string, newPassword: string): Promise<boolean> {
    const [result]: any = await pool.query(
      'UPDATE users SET password = ? WHERE id = ? OR LOWER(username) = LOWER(?)',
      [newPassword, userIdOrUsername, userIdOrUsername]
    );
    return result.affectedRows > 0;
  }

  // ==========================================================
  // APP SETTINGS, SCHEDULE NOTES & BACKUP/RESTORE
  // ==========================================================

  public async getSetting(key: string): Promise<string | null> {
    const [rows]: any = await pool.query('SELECT settingValue FROM app_settings WHERE settingKey = ?', [key]);
    if (rows.length === 0) return null;
    return rows[0].settingValue;
  }

  public async saveSetting(key: string, value: string): Promise<void> {
    const now = new Date().toISOString();
    await pool.query(
      `INSERT INTO app_settings (settingKey, settingValue, updatedAt)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE settingValue = VALUES(settingValue), updatedAt = VALUES(updatedAt)`,
      [key, value, now]
    );
  }

  public async getCompanySettings(): Promise<any> {
    const defaultSettings = {
      organizationName: 'Central Dispatch Limited',
      country: 'Bermuda',
      currency: 'BMD',
      payFrequency: 'Weekly',
      weekStartsOn: 'Thursday',
      weekEndsOn: 'Wednesday',
      address: '3 Laffan Street, Pembroke HM09',
      phone: '(441) 295-4141',
      email: 'info@bermudaislandtaxi.com',
      overtimeThreshold: '40',
      paymentLink: 'https://ridebermuda-prod.web.app/paylink',
      taxSystem: 'Bermuda Statutory Deduction Matrix Active'
    };

    const savedJson = await this.getSetting('company_profile_settings');
    if (savedJson) {
      try {
        const parsed = JSON.parse(savedJson);
        return { ...defaultSettings, ...parsed };
      } catch (e) {
        console.error('Failed to parse saved company settings, returning defaults');
      }
    }
    return defaultSettings;
  }

  public async saveCompanySettings(settings: any): Promise<any> {
    const current = await this.getCompanySettings();
    const updated = {
      ...current,
      ...settings,
      updatedAt: new Date().toISOString()
    };
    await this.saveSetting('company_profile_settings', JSON.stringify(updated));
    return updated;
  }

  public async getScheduleNote(): Promise<string> {
    const note = await this.getSetting('workspace_schedule_note');
    return note || '';
  }

  public async saveScheduleNote(note: string): Promise<void> {
    await this.saveSetting('workspace_schedule_note', note);
  }

  public async backupAllData(): Promise<any> {
    const [users]: any = await pool.query('SELECT * FROM users');
    const [employees]: any = await pool.query('SELECT * FROM employees');
    const [payroll_periods]: any = await pool.query('SELECT * FROM payroll_periods');
    const [employee_payroll_items]: any = await pool.query('SELECT * FROM employee_payroll_items');
    const [leave_records]: any = await pool.query('SELECT * FROM leave_records');
    const [schedules]: any = await pool.query('SELECT * FROM schedules');
    const [customers]: any = await pool.query('SELECT * FROM customers');
    const [invoices]: any = await pool.query('SELECT * FROM invoices');
    const [payments]: any = await pool.query('SELECT * FROM payments');
    const [general_ledger]: any = await pool.query('SELECT * FROM general_ledger');
    const [time_records]: any = await pool.query('SELECT * FROM time_records');
    const [app_settings]: any = await pool.query('SELECT * FROM app_settings');

    return {
      format: 'Central Dispatch Complete App Backup',
      version: 1,
      createdAt: new Date().toISOString(),
      database: {
        users,
        employees,
        payroll_periods,
        employee_payroll_items,
        leave_records,
        schedules,
        customers,
        invoices,
        payments,
        general_ledger,
        time_records,
        app_settings
      }
    };
  }

  public async restoreAllData(backupData: any): Promise<void> {
    if (!backupData || !backupData.database) {
      throw new Error('Invalid backup file format');
    }
    const db = backupData.database;

    // Restore customers if present
    if (Array.isArray(db.customers)) {
      for (const c of db.customers) {
        await this.saveCustomer(c);
      }
    }

    // Restore employees if present
    if (Array.isArray(db.employees)) {
      for (const e of db.employees) {
        await this.saveEmployee(e);
      }
    }

    // Restore invoices if present
    if (Array.isArray(db.invoices)) {
      for (const inv of db.invoices) {
        await this.saveInvoice(inv);
      }
    }

    // Restore payments if present
    if (Array.isArray(db.payments)) {
      for (const p of db.payments) {
        await this.savePayment(p);
      }
    }

    // Restore schedules if present
    if (Array.isArray(db.schedules)) {
      for (const s of db.schedules) {
        await this.saveSchedule(s);
      }
    }

    // Restore leaves if present
    if (Array.isArray(db.leave_records)) {
      for (const l of db.leave_records) {
        await this.saveLeave(l);
      }
    }

    // Restore app_settings if present
    if (Array.isArray(db.app_settings)) {
      for (const st of db.app_settings) {
        await this.saveSetting(st.settingKey, st.settingValue);
      }
    }
  }

  public async getStaffRecords(staffId: string): Promise<any[]> {
    const [rows] = await pool.query(
      'SELECT * FROM staff_records WHERE staffId = ? ORDER BY date DESC, createdAt DESC',
      [staffId]
    );
    return rows as any[];
  }

  public async saveStaffRecord(record: { id: string; staffId: string; type: string; date: string; note: string; createdAt: string }) {
    await pool.query(
      `INSERT INTO staff_records (id, staffId, type, date, note, createdAt)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE type = VALUES(type), date = VALUES(date), note = VALUES(note)`,
      [record.id, record.staffId, record.type, record.date, record.note, record.createdAt]
    );
  }

  public async deleteStaffRecord(recordId: string) {
    await pool.query('DELETE FROM staff_records WHERE id = ?', [recordId]);
  }
}

export const mySQLDb = new MySQLDatabase();

