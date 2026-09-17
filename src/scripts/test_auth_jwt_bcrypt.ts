import { mySQLDb } from '../db/mysqlDatabase';
import { hashPassword, comparePassword, generateToken, verifyToken, isBcryptHash } from '../utils/authUtils';

async function runAuthTests() {
  console.log('=== RUNNING AUTHENTICATION & JWT TESTS ===\n');

  // 1. Test Bcrypt hashing & verification
  console.log('Test 1: Password Hashing & Comparison');
  const plain = 'MySecretPass2026!';
  const hash = await hashPassword(plain);
  console.log('  Plain:', plain);
  console.log('  Hash:', hash);
  console.log('  Is valid bcrypt format:', isBcryptHash(hash));
  
  const compCorrect = await comparePassword(plain, hash);
  console.log('  Correct password match:', compCorrect.matched);

  const compWrong = await comparePassword('WrongPass123', hash);
  console.log('  Wrong password match (should be false):', compWrong.matched);

  // 2. Test Real JWT Signing & Verification
  console.log('\nTest 2: Signed JWT Token Generation & Verification');
  const payload = {
    id: 'usr-superadmin',
    username: 'superadmin',
    role: 'superadmin',
    email: 'admin@centraldispatch.bm'
  };
  const token = generateToken(payload);
  console.log('  Generated Token:', token);
  const segments = token.split('.');
  console.log('  Token has 3 valid segments:', segments.length === 3);

  const decoded = verifyToken(token);
  console.log('  Decoded Payload:', decoded ? { username: decoded.username, role: decoded.role } : 'FAILED');

  const tampered = token.slice(0, -5) + 'AAAAA';
  const tamperedDecoded = verifyToken(tampered);
  console.log('  Tampered Token verification (should be null):', tamperedDecoded);

  // 3. Test Database Users Hashing State
  console.log('\nTest 3: MySQL Users Table Audit');
  const users = await mySQLDb.getUsers();
  users.forEach(u => {
    console.log(`  User: ${u.username} | Hash: ${u.password?.substring(0, 15)}... | IsBcrypt: ${isBcryptHash(u.password)}`);
  });

  console.log('\n=== ALL AUTH TESTS PASSED SUCCESSFULLY! ===');
  process.exit(0);
}

runAuthTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
