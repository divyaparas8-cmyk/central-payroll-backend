import { mySQLDb } from '../db/mysqlDatabase';
import { hashPassword, isBcryptHash } from '../utils/authUtils';

async function migratePasswords() {
  console.log('=== Starting Password Migration to Bcrypt ===');
  try {
    const users = await mySQLDb.getUsers();
    console.log(`Found ${users.length} total user accounts in database.`);

    let migratedCount = 0;
    let alreadyHashedCount = 0;

    for (const user of users) {
      const rawPassword = user.password || 'ChangeMe123!';
      if (isBcryptHash(rawPassword)) {
        console.log(`✓ User '${user.username}' (${user.displayName}) is already hashed with bcrypt.`);
        alreadyHashedCount++;
      } else {
        console.log(`⚡ Migrating plain text password for user '${user.username}' (${user.displayName})...`);
        const hashed = await hashPassword(rawPassword);
        await mySQLDb.updateUserPassword(user.id, hashed);
        migratedCount++;
        console.log(`✓ User '${user.username}' successfully migrated to bcrypt hash: ${hashed.substring(0, 15)}...`);
      }
    }

    console.log('=============================================');
    console.log(`Migration Complete:`);
    console.log(`  - Newly Migrated: ${migratedCount}`);
    console.log(`  - Already Bcrypt: ${alreadyHashedCount}`);
    console.log(`  - Total Accounts: ${users.length}`);
    console.log('=============================================');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed with error:', err);
    process.exit(1);
  }
}

migratePasswords();
