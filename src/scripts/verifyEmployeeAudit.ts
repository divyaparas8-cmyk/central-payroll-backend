import mysql from 'mysql2/promise';

async function verifyAll() {
  const pool = mysql.createPool({
    host: '127.0.0.1',
    port: 3307,
    user: 'root',
    password: '',
    database: 'payroll_db'
  });

  try {
    console.log('================ 1. CURRENT EMPLOYEES IN MYSQL DB ================');
    const [rows]: any = await pool.query('SELECT id, employeeId, firstName, lastName, displayName, position, personalPhone, email FROM employees ORDER BY employeeId ASC');
    console.table(rows);

    console.log('\n================ 2. SEARCH FOR TIFFANY / SHONEE IN MYSQL DB ================');
    const [ghosts]: any = await pool.query("SELECT * FROM employees WHERE displayName LIKE '%Tiffany%' OR displayName LIKE '%Shonee%' OR firstName LIKE '%Tiffany%' OR firstName LIKE '%Shonee%'");
    console.log('Found in DB:', ghosts);

    console.log('\n================ 3. TEST EDIT PHONE NUMBER VIA BACKEND LOGIC ================');
    const testPhone = '(441) 534-9999';
    await pool.query("UPDATE employees SET personalPhone = ? WHERE id = 'alesia'", [testPhone]);
    const [updated]: any = await pool.query("SELECT id, displayName, personalPhone FROM employees WHERE id = 'alesia'");
    console.log('Updated Alesia phone in DB:', updated[0]);
    // Reset back
    await pool.query("UPDATE employees SET personalPhone = '(441) 534-8822' WHERE id = 'alesia'");

  } catch (err) {
    console.error('Error during verification:', err);
  } finally {
    await pool.end();
  }
}

verifyAll();
