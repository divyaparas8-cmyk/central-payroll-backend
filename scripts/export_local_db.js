const fs = require('fs');
const path = require('path');
const db = require('../config/db');

async function exportFullLocalDatabase() {
  try {
    console.log('🚀 Exporting complete local MySQL database schema & data...');

    const [tables] = await db.query('SHOW TABLES');
    const dbName = process.env.DB_NAME || process.env.MYSQLDATABASE || 'veterinary_db';
    const keyName = `Tables_in_${dbName}`;

    let sqlDump = `-- PetCare Pro Full Database Dump\n-- Exported on ${new Date().toISOString()}\n\nSET FOREIGN_KEY_CHECKS=0;\n\n`;

    for (const row of tables) {
      const tableName = row[keyName] || Object.values(row)[0];
      if (!tableName) continue;

      // Table Create Statement
      const [createRes] = await db.query(`SHOW CREATE TABLE \`${tableName}\``);
      const createSql = createRes[0]['Create Table'];
      sqlDump += `DROP TABLE IF EXISTS \`${tableName}\`;\n${createSql};\n\n`;

      // Table Data Inserts
      const [rows] = await db.query(`SELECT * FROM \`${tableName}\``);
      if (rows.length > 0) {
        for (const dataRow of rows) {
          const keys = Object.keys(dataRow).map((k) => `\`${k}\``).join(', ');
          const values = Object.values(dataRow).map((val) => {
            if (val === null || val === undefined) return 'NULL';
            if (typeof val === 'number' || typeof val === 'boolean') return val;
            if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
            return `'${String(val).replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
          }).join(', ');

          sqlDump += `INSERT INTO \`${tableName}\` (${keys}) VALUES (${values});\n`;
        }
        sqlDump += '\n';
      }
    }

    sqlDump += `SET FOREIGN_KEY_CHECKS=1;\n`;

    const outputPath = path.join(__dirname, '../database/full_live_db_dump.sql');
    fs.writeFileSync(outputPath, sqlDump, 'utf8');
    console.log(`✅ Full Local Database exported successfully to: ${outputPath}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error exporting local database:', err);
    process.exit(1);
  }
}

exportFullLocalDatabase();
