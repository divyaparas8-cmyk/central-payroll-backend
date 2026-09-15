import mysql from 'mysql2/promise';
import { mySQLDb } from '../db/mysqlDatabase';

async function testConditionalSeeding() {
  const pool = mysql.createPool({
    host: '127.0.0.1',
    port: 3307,
    user: 'root',
    password: '',
    database: 'payroll_db'
  });

  try {
    console.log('🧪 Running Test 1: User custom edit to displayName & position...');
    // Simulate user editing Alesia's displayName and position
    await pool.query("UPDATE employees SET displayName = 'Alesia B. (Operations Manager)', position = 'Operations Manager' WHERE id = 'alesia'");
    
    // Simulate restart
    await mySQLDb.initDatabase();

    const [rows1]: any = await pool.query("SELECT id, displayName, position FROM employees WHERE id = 'alesia'");
    console.log('Post-Restart Alesia Record:', rows1[0]);

    if (rows1[0].displayName === 'Alesia B. (Operations Manager)' && rows1[0].position === 'Operations Manager') {
      console.log('✅ TEST 1 PASSED: User edited displayName and position were preserved!');
    } else {
      console.error('❌ TEST 1 FAILED: User edits were overwritten!');
    }

    // Reset Alesia back to standard
    await pool.query("UPDATE employees SET displayName = 'Alesia Brangman', position = 'Dispatch Supervisor' WHERE id = 'alesia'");

    console.log('\n🧪 Running Test 2: Fallback filling for empty/NULL fields...');
    // Simulate a record with empty position
    await pool.query("UPDATE employees SET position = '' WHERE id = 'alesia'");
    
    // Simulate restart
    await mySQLDb.initDatabase();

    const [rows2]: any = await pool.query("SELECT id, displayName, position FROM employees WHERE id = 'alesia'");
    console.log('Post-Restart Alesia Record with empty position:', rows2[0]);

    if (rows2[0].position === 'Dispatch Supervisor') {
      console.log('✅ TEST 2 PASSED: Empty fields are populated with sensible defaults!');
    } else {
      console.error('❌ TEST 2 FAILED: Empty field was not populated!');
    }

  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    await pool.end();
  }
}

testConditionalSeeding();
