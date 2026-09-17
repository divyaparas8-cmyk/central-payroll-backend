import mysql from 'mysql2/promise';
import { mySQLDb } from '../db/mysqlDatabase';

async function testPersistence() {
  const pool = mysql.createPool({
    host: '127.0.0.1',
    port: 3307,
    user: 'root',
    password: '',
    database: 'payroll_db'
  });

  try {
    // 1. Simulate UI updating Ty's position
    await pool.query("UPDATE employees SET position = 'Lead Senior Dispatcher' WHERE id = 'ty'");
    console.log("1. Simulated UI edit: Set Ty's position to 'Lead Senior Dispatcher'");

    // 2. Simulate server restart calling initDatabase()
    console.log("2. Simulating server restart and running initDatabase()...");
    await mySQLDb.initDatabase();

    // 3. Check if Ty's edited position is still intact
    const [rows]: any = await pool.query("SELECT id, displayName, position FROM employees WHERE id = 'ty'");
    console.log("3. Current DB record for Ty:", rows[0]);

    if (rows[0].position === 'Lead Senior Dispatcher') {
      console.log('🎉 SUCCESS: User edits are preserved! No data loss on server restart.');
    } else {
      console.error('❌ FAILURE: Edit was overwritten with default position:', rows[0].position);
    }

    // Reset back to Dispatcher
    await pool.query("UPDATE employees SET position = 'Dispatcher' WHERE id = 'ty'");
    console.log("4. Cleaned test value back to 'Dispatcher'.");
  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    await pool.end();
  }
}

testPersistence();
