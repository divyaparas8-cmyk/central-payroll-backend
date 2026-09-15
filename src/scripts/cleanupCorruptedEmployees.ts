import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const CANONICAL_STAFF = [
  {
    id: 'alesia',
    employeeId: 'CDL-001',
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
    id: 'global',
    employeeId: 'CDL-002',
    firstName: 'Global',
    middleInitial: '',
    lastName: 'Dispatch',
    displayName: 'Global',
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
    displayName: 'SSH',
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
    id: 'tanuvi',
    employeeId: 'CDL-006',
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

async function fixAndVerifyCanonicalEmployees() {
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

  try {
    console.log('🔄 Checking & Seeding missing canonical employees...');
    for (const emp of CANONICAL_STAFF) {
      await pool.query(
        `INSERT INTO employees (
          id, employeeId, firstName, middleInitial, lastName, displayName, position, department,
          status, employmentType, payType, payRate, holidayRate, startDate, dateOfBirth,
          personalPhone, workPhone, email, address, emergencyContactName, emergencyContactPhone,
          emergencyContactRelation, paymentMethod, bankName, bankAccountMasked
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          employeeId = VALUES(employeeId),
          firstName = VALUES(firstName),
          lastName = VALUES(lastName),
          displayName = VALUES(displayName),
          position = VALUES(position),
          department = VALUES(department),
          status = VALUES(status),
          employmentType = VALUES(employmentType),
          payType = VALUES(payType),
          payRate = VALUES(payRate),
          holidayRate = VALUES(holidayRate),
          personalPhone = VALUES(personalPhone),
          workPhone = VALUES(workPhone),
          email = VALUES(email),
          address = VALUES(address)`,
        [
          emp.id, emp.employeeId, emp.firstName, emp.middleInitial, emp.lastName, emp.displayName,
          emp.position, emp.department, emp.status, emp.employmentType, emp.payType,
          emp.payRate, emp.holidayRate, emp.startDate, emp.dateOfBirth, emp.personalPhone,
          emp.workPhone, emp.email, emp.address, emp.emergencyContactName, emp.emergencyContactPhone,
          emp.emergencyContactRelation, emp.paymentMethod, emp.bankName, emp.bankAccountMasked
        ]
      );
    }

    // Fix any orphaned references in payroll items, leave records, or schedules pointing to 'emp-1789035371912'
    await pool.query("UPDATE employee_payroll_items SET employeeId = 'global', employeeName = 'Global' WHERE employeeId = 'emp-1789035371912' OR employeeName LIKE '%Global%'").catch(() => {});
    await pool.query("UPDATE leave_records SET employeeId = 'global', employeeName = 'Global' WHERE employeeId = 'emp-1789035371912'").catch(() => {});
    await pool.query("UPDATE schedules SET employeeId = 'global' WHERE employeeId = 'emp-1789035371912'").catch(() => {});

    // Final list
    const [finalEmployees]: any = await pool.query('SELECT * FROM employees ORDER BY employeeId ASC');
    console.log(`\n================ FINAL CANONICAL EMPLOYEES (${finalEmployees.length} ROWS) ================`);
    for (const emp of finalEmployees) {
      console.log(`- ID: ${emp.id.padEnd(8)} | EmpID: ${(emp.employeeId || '').padEnd(9)} | Name: ${(emp.firstName + ' ' + emp.lastName).padEnd(20)} | Display: ${(emp.displayName || '').padEnd(25)} | Position: ${(emp.position || '').padEnd(30)} | Pay: ${emp.payType} ($${emp.payRate}/hr)`);
    }
    console.log('================================================================================');

  } catch (err) {
    console.error('❌ Error during verification:', err);
  } finally {
    await pool.end();
  }
}

fixAndVerifyCanonicalEmployees();
