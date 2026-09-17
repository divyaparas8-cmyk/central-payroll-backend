import mysql from 'mysql2/promise';

async function run() {
  const pool = mysql.createPool({
    host: 'localhost',
    port: 3307,
    user: 'root',
    password: '',
    database: 'payroll_db'
  });

  console.log('Connected to MySQL payroll_db.');

  // 1. Check current employees in DB
  const [initialRows]: any = await pool.query('SELECT id, employeeId, displayName, payRate, holidayRate, status FROM employees');
  console.log('\n--- 1. INITIAL EMPLOYEES IN DB ---');
  console.table(initialRows);

  // 2. Add a test employee via direct DB / API representation
  const testId = 'test-del-' + Date.now();
  const testCode = 'CDL-TEST';
  const testName = 'Test AutoDelete';
  
  await pool.query(
    `INSERT INTO employees (id, employeeId, firstName, lastName, displayName, position, department, status, employmentType, payType, payRate, holidayRate, startDate, personalPhone, email, address)
     VALUES (?, ?, 'Test', 'AutoDelete', ?, 'Tester', 'QA', 'Active', 'Full-Time', 'Hourly', 22.00, 33.00, '2026-09-16', '441-555-9999', 'testautodelete@gdmbpo.com', 'Test Address')`,
    [testId, testCode, testName]
  );
  console.log(`\n--- 2. ADDED TEST EMPLOYEE (${testId}) ---`);

  // 3. Verify API endpoints see the employee
  const endpoints = [
    'http://localhost:5000/api/employees',
    'http://localhost:5000/api/staff-contact-details',
    'http://localhost:5000/api/weekly-schedules?weekStartDate=2026-09-14',
    'http://localhost:5000/api/leave-calendars',
    'http://localhost:5000/api/payslips',
    'http://localhost:5000/api/payroll'
  ];

  console.log('\n--- 3. TESTING API ENDPOINTS BEFORE DELETE ---');
  for (const url of endpoints) {
    const res = await fetch(url);
    const data = await res.json();
    const str = JSON.stringify(data);
    const found = str.includes(testId) || str.includes(testName);
    console.log(`${url} -> Found test employee? ${found ? 'YES (Visible)' : 'NO'}`);
  }

  // 4. Perform DELETE operation
  console.log(`\n--- 4. PERFORMING DELETE OPERATION on ${testId} ---`);
  const delRes = await fetch(`http://localhost:5000/api/employees/${testId}`, { method: 'DELETE' });
  const delData = await delRes.json();
  console.log('Delete response:', delData);

  // 5. Verify API endpoints NO LONGER have the deleted employee (No ghost rows)
  console.log('\n--- 5. TESTING API ENDPOINTS AFTER DELETE (GHOST ROW CHECK) ---');
  let allClean = true;
  for (const url of endpoints) {
    const res = await fetch(url);
    const data = await res.json();
    const str = JSON.stringify(data);
    const found = str.includes(testId) || str.includes(testName);
    if (found) {
      console.error(`FAIL: ${url} STILL CONTAINS DELETED EMPLOYEE (GHOST ROW)!`);
      allClean = false;
    } else {
      console.log(`PASS: ${url} -> Deleted employee cleanly removed. No ghost row.`);
    }
  }

  // 6. Verify in MySQL database
  const [afterRows]: any = await pool.query('SELECT id, employeeId, displayName FROM employees WHERE id = ? OR employeeId = ?', [testId, testCode]);
  if (afterRows.length === 0) {
    console.log('PASS: MySQL employees table has 0 rows for deleted employee.');
  } else {
    console.error('FAIL: MySQL employees table still contains deleted employee:', afterRows);
    allClean = false;
  }

  // 7. Verify all 7 official staff members are present and untouched
  const [officialRows]: any = await pool.query('SELECT id, employeeId, displayName, payRate, holidayRate FROM employees');
  console.log('\n--- 7. FINAL ACTIVE EMPLOYEES IN DB ---');
  console.table(officialRows);

  if (allClean && officialRows.length === 7) {
    console.log('\n>>> ALL END-TO-END DELETE SYNCHRONIZATION TESTS PASSED! <<<');
  } else {
    console.log('\n>>> TESTS FINISHED WITH WARNINGS OR FAILURES <<<');
  }

  await pool.end();
}

run().catch(console.error);
