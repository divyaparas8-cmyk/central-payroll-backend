async function runVerification() {
  console.log('=== STARTING DEEP SYSTEM VERIFICATION ===\n');

  const BASE_URL = 'http://localhost:5000/api';

  // 1. Test Login as superadmin
  console.log('1. Testing SuperAdmin Login...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'superadmin', password: 'ChangeMe123!' })
  });
  const loginData: any = await loginRes.json();
  console.log('   Login Status:', loginRes.status, '| Success:', loginData.success, '| Role:', loginData.user?.role);
  const token = loginData.token;

  // 2. Test Change Password Endpoint
  console.log('\n2. Testing Change Password Endpoint...');
  const changePwRes = await fetch(`${BASE_URL}/user-accounts/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      username: 'superadmin',
      currentPassword: 'ChangeMe123!',
      newPassword: 'ChangeMe123!'
    })
  });
  const changePwData: any = await changePwRes.json();
  console.log('   Change Password Status:', changePwRes.status, '| Success:', changePwData.success, '| Message:', changePwData.message || changePwData.error);

  // 3. Test Schedules Save & Fetch
  console.log('\n3. Testing Weekly Schedules Save & Fetch for 2026-09-17...');
  const saveSchedRes = await fetch(`${BASE_URL}/weekly-schedules`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      weekStartDate: '2026-09-17',
      schedules: [
        {
          employeeId: 'emp-1',
          weekStartDate: '2026-09-17',
          shifts: { '2026-09-17': '8', '2026-09-18': '9', '2026-09-21': '8', '2026-09-22': '8', '2026-09-23': '8' },
          totalHours: 41
        }
      ]
    })
  });
  const saveSchedData: any = await saveSchedRes.json();
  console.log('   Save Schedule Status:', saveSchedRes.status, '| Success:', saveSchedData.success);

  const getSchedRes = await fetch(`${BASE_URL}/weekly-schedules?weekStartDate=2026-09-17`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const getSchedData: any = await getSchedRes.json();
  console.log('   Get Schedule Count:', getSchedData.schedules?.length, '| Shifts for emp-1:', JSON.stringify(getSchedData.schedules?.[0]?.shifts));

  // 4. Test Payslips Endpoint
  console.log('\n4. Testing Payslips Endpoint...');
  const payslipsRes = await fetch(`${BASE_URL}/payslips`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const payslipsData: any = await payslipsRes.json();
  console.log('   Payslips Status:', payslipsRes.status, '| Success:', payslipsData.success, '| Employees Returned:', payslipsData.employees?.length);

  // 5. Test Permissions
  console.log('\n5. Testing Permissions Matrix...');
  const permRes = await fetch(`${BASE_URL}/permissions`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const permData: any = await permRes.json();
  console.log('   Admin dashboard view permission:', permData.data?.rolePermissions?.admin?.dashboard?.view);
  console.log('   Admin employees view permission:', permData.data?.rolePermissions?.admin?.employees?.view);
  console.log('   Superadmin dashboard view permission:', permData.data?.rolePermissions?.superadmin?.dashboard?.view);

  console.log('\n=== VERIFICATION COMPLETE ===');
}

runVerification().catch(console.error);
