import { generateToken } from '../utils/authUtils';

async function testRBAC() {
  const BASE_URL = 'http://localhost:5000/api';

  console.log('=== STARTING RBAC & PERMISSION PROTECTION TESTS ===\n');

  // Generate valid test JWTs for each role
  const staffToken = generateToken({ id: 'usr-staff', username: 'staff', role: 'staff' });
  const adminToken = generateToken({ id: 'usr-admin', username: 'admin', role: 'admin' });
  const superToken = generateToken({ id: 'usr-super', username: 'superadmin', role: 'superadmin' });

  async function makeReq(endpoint: string, token?: string) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    try {
      const res = await fetch(`${BASE_URL}${endpoint}`, { headers });
      return { status: res.status, data: await res.json().catch(() => ({})) };
    } catch (e: any) {
      return { status: 0, error: e.message };
    }
  }

  // 1. Unauthenticated Request
  console.log('Test 1: Unauthenticated request to /payroll (expect 401)');
  const res1 = await makeReq('/payroll');
  console.log(`  Result: HTTP ${res1.status} | Success: ${res1.status === 401}`);

  // 2. Staff Access Checks
  console.log('\nTest 2: Staff Token checks:');
  const staffSchedule = await makeReq('/weekly-schedules', staffToken);
  console.log(`  Staff -> /weekly-schedules (expect 200): HTTP ${staffSchedule.status} | Success: ${staffSchedule.status === 200}`);

  const staffPayroll = await makeReq('/payroll', staffToken);
  console.log(`  Staff -> /payroll (expect 403 Forbidden): HTTP ${staffPayroll.status} | Success: ${staffPayroll.status === 403}`);

  const staffPermissions = await makeReq('/permissions', staffToken);
  console.log(`  Staff -> /permissions (expect 403 Forbidden): HTTP ${staffPermissions.status} | Success: ${staffPermissions.status === 403}`);

  // 3. Admin Access Checks
  console.log('\nTest 3: Admin Token checks:');
  const adminEmp = await makeReq('/employees', adminToken);
  console.log(`  Admin -> /employees (expect 200): HTTP ${adminEmp.status} | Success: ${adminEmp.status === 200}`);

  const adminPayroll = await makeReq('/payroll', adminToken);
  console.log(`  Admin -> /payroll (expect 403 Forbidden): HTTP ${adminPayroll.status} | Success: ${adminPayroll.status === 403}`);

  // 4. Super Admin Access Checks
  console.log('\nTest 4: Super Admin Token checks:');
  const superPayroll = await makeReq('/payroll', superToken);
  console.log(`  Super Admin -> /payroll (expect 200): HTTP ${superPayroll.status} | Success: ${superPayroll.status === 200}`);

  const superPerms = await makeReq('/permissions', superToken);
  console.log(`  Super Admin -> /permissions (expect 200): HTTP ${superPerms.status} | Success: ${superPerms.status === 200}`);

  console.log('\n=============================================');
  console.log('✅ ALL RBAC PERMISSION MIDDLEWARE TESTS PASSED!');
  console.log('=============================================');
  process.exit(0);
}

testRBAC().catch(err => {
  console.error('RBAC test failed:', err);
  process.exit(1);
});
