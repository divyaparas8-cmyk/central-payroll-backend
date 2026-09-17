import mysql from 'mysql2/promise';

async function runTest() {
  console.log('=== CHECK 1: WEEKLY SCHEDULE SAVE & NOTES PERSISTENCE TEST ===\n');

  const pool = mysql.createPool({
    host: 'localhost',
    port: 3307,
    user: 'root',
    password: '',
    database: 'payroll_db'
  });

  const weekStart = '2026-09-14';

  // STEP 1: Simulate user typing hours into cells for 3 different employees across different days
  // e.g. Alesia (Mon '2026-09-14'): '8', Hamza (Wed '2026-09-16'): '6.5', Tiffany (Fri '2026-09-18'): 'OFF'
  const schedulePayload = {
    weekStartDate: weekStart,
    schedules: [
      {
        employeeId: 'alesia',
        weekStartDate: weekStart,
        shifts: { '2026-09-14': '8' },
        totalHours: 8
      },
      {
        employeeId: 'global',
        weekStartDate: weekStart,
        shifts: { '2026-09-16': '6.5' },
        totalHours: 6.5
      },
      {
        employeeId: 'tiffany',
        weekStartDate: weekStart,
        shifts: { '2026-09-18': 'OFF' },
        totalHours: 0
      }
    ]
  };

  console.log('Step 1 & 2: Submitting "Save Schedule" with 3 employee cells filled across different days...');
  const saveRes = await fetch('http://localhost:5000/api/weekly-schedules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(schedulePayload)
  });
  const saveJson = await saveRes.json();
  console.log('Save Schedule API Response:', saveJson);

  // STEP 2: Simulate typing a note and clicking "Save Note"
  const noteText = 'Client Verification Note: Monday peak coverage confirmed; Wednesday 6.5h relief shift.';
  console.log('\nStep 6: Submitting "Save Note" with text in Weekly Schedule Notes box...');
  const noteRes = await fetch('http://localhost:5000/api/weekly-schedules/notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ weekStartDate: weekStart, note: noteText })
  });
  const noteJson = await noteRes.json();
  console.log('Save Note API Response:', noteJson);

  // STEP 3: Verify Persistence directly in MySQL Database
  console.log('\n--- VERIFYING MYSQL DATABASE PERSISTENCE ---');
  const [dbSchedules]: any = await pool.query('SELECT * FROM weekly_schedules WHERE weekStartDate = ?', [weekStart]);
  console.log(`Found ${dbSchedules.length} schedule rows in MySQL for week ${weekStart}:`);
  dbSchedules.forEach((row: any) => {
    console.log(` - Employee: ${row.employeeId}, Shifts JSON: ${row.shifts}, Total Hours: ${row.totalHours}`);
  });

  const [dbNotes]: any = await pool.query('SELECT * FROM weekly_schedule_notes WHERE weekStartDate = ?', [weekStart]);
  console.log(`Found ${dbNotes.length} notes rows in MySQL for week ${weekStart}:`);
  dbNotes.forEach((row: any) => {
    console.log(` - Week: ${row.weekStartDate}, Note Text: "${row.note}"`);
  });

  // STEP 4: Simulate Page Refresh (Calling GET /api/weekly-schedules?weekStartDate=2026-09-14)
  console.log('\n--- STEP 4 & 7: SIMULATING FULL PAGE REFRESH (GET /api/weekly-schedules) ---');
  const refreshRes = await fetch(`http://localhost:5000/api/weekly-schedules?weekStartDate=${weekStart}`);
  const refreshData = await refreshRes.json();

  console.log('API GET on page refresh returned:');
  console.log(' - Success:', refreshData.success);
  console.log(' - Schedules count:', refreshData.schedules.length);
  console.log(' - Persisted Note:', refreshData.note);

  // Check specific cells
  const alesiaSchedule = refreshData.schedules.find((s: any) => s.employeeId === 'alesia');
  const hamzaSchedule = refreshData.schedules.find((s: any) => s.employeeId === 'global');
  const tiffanySchedule = refreshData.schedules.find((s: any) => s.employeeId === 'tiffany');

  const alesiaMonVal = alesiaSchedule?.shifts ? JSON.parse(typeof alesiaSchedule.shifts === 'string' ? alesiaSchedule.shifts : JSON.stringify(alesiaSchedule.shifts))['2026-09-14'] : undefined;
  const hamzaWedVal = hamzaSchedule?.shifts ? JSON.parse(typeof hamzaSchedule.shifts === 'string' ? hamzaSchedule.shifts : JSON.stringify(hamzaSchedule.shifts))['2026-09-16'] : undefined;
  const tiffanyFriVal = tiffanySchedule?.shifts ? JSON.parse(typeof tiffanySchedule.shifts === 'string' ? tiffanySchedule.shifts : JSON.stringify(tiffanySchedule.shifts))['2026-09-18'] : undefined;

  console.log('\n--- CELL-BY-CELL REFRESH VERIFICATION ---');
  console.log(`1. Alesia Brangman (Mon): Expected '8' -> Actual: '${alesiaMonVal}' (Match: ${alesiaMonVal === '8' ? 'PASS' : 'FAIL'})`);
  console.log(`2. Hamza Ali (Wed): Expected '6.5' -> Actual: '${hamzaWedVal}' (Match: ${hamzaWedVal === '6.5' ? 'PASS' : 'FAIL'})`);
  console.log(`3. Tiffany Robinson (Fri): Expected 'OFF' -> Actual: '${tiffanyFriVal}' (Match: ${tiffanyFriVal === 'OFF' ? 'PASS' : 'FAIL'})`);
  console.log(`4. Weekly Notes Text: Expected "${noteText}" -> Actual: "${refreshData.note}" (Match: ${refreshData.note === noteText ? 'PASS' : 'FAIL'})`);

  const allPassed = alesiaMonVal === '8' && hamzaWedVal === '6.5' && tiffanyFriVal === 'OFF' && refreshData.note === noteText;

  console.log('\n==================================================');
  if (allPassed) {
    console.log('VERDICT: PASS — Both schedule cell hours and weekly notes persist perfectly across reloads.');
  } else {
    console.log('VERDICT: FAIL — Persistence mismatch detected.');
  }
  console.log('==================================================');

  await pool.end();
}

runTest().catch(console.error);
