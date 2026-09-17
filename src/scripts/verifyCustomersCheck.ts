import mysql from 'mysql2/promise';

async function verifyCustomers() {
  const pool = mysql.createPool({
    host: '127.0.0.1',
    port: 3307,
    user: 'root',
    password: '',
    database: 'payroll_db'
  });

  try {
    const [cnt]: any = await pool.query('SELECT COUNT(*) as count FROM customers');
    console.log('1. Database Total Customer Count:', cnt[0].count);

    const [zCusts]: any = await pool.query("SELECT id, name FROM customers WHERE name LIKE 'Z%' OR name LIKE 'X%' OR name LIKE 'W%' ORDER BY name ASC LIMIT 10");
    console.log('\n2. Sample Customers starting with W, X, Z:', zCusts);

    const [all]: any = await pool.query('SELECT id, name FROM customers ORDER BY name ASC');
    console.log('\n3. First Customer:', all[0]);
    console.log('4. Last Customer:', all[all.length - 1]);

  } catch (err) {
    console.error('Error checking customers:', err);
  } finally {
    await pool.end();
  }
}

verifyCustomers();
