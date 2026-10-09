const db = require('./config/db');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const ALL_MENU_IDS = [
  'dashboard', 'appointments', 'home-visits', 'hospitalization', 'owners', 'pets', 
  'medical', 'treatment', 'assistance-tasks', 'prescriptions', 'my-revenue', 
  'billing', 'inventory', 'reminders', 'staff', 'attendance', 'reports', 
  'settings', 'audit-logs', 'support'
];

async function seedDemoClinicAndStaff() {
  try {
    console.log('🚀 Seeding Permanent Demo Clinic, Admin, Staff, Subscriptions & Full Menu Access...');

    const clinicId = 'clinic-demo-permanent';
    const clinicName = 'Kiaan Permanent Demo Animal Hospital';

    // 1. Create or Update Permanent Demo Clinic
    const [existingClinic] = await db.query('SELECT id FROM clinics WHERE id = ?', [clinicId]);
    if (existingClinic.length === 0) {
      await db.query(`
        INSERT INTO clinics (id, clinic_name, email, phone, address, city, state, country, status, created_at, updated_at)
        VALUES (?, ?, 'demo.clinic@petcare.com', '+91 99999 88888', '123 Vet Care Boulevard', 'Colombo', 'Western', 'Sri Lanka', 'ACTIVE', NOW(), NOW())
      `, [clinicId, clinicName]);
      console.log('✅ Permanent Demo Clinic created');
    } else {
      await db.query("UPDATE clinics SET status = 'ACTIVE' WHERE id = ?", [clinicId]);
      console.log('✅ Permanent Demo Clinic status set to ACTIVE');
    }

    // Hash common password: Demo@12345
    const passwordHash = await bcrypt.hash('Demo@12345', 10);

    const demoUsers = [
      { id: 'user-demo-admin', name: 'Demo Clinic Admin', email: 'demo.admin@petcare.com', role: 'Admin', department: 'Management' },
      { id: 'user-demo-doctor', name: 'Dr. Alex Mercer (Doctor)', email: 'demo.doctor@petcare.com', role: 'Doctor', department: 'Surgery & Consultation' },
      { id: 'user-demo-manager', name: 'Sarah Connor (Manager)', email: 'demo.manager@petcare.com', role: 'Manager', department: 'Operations' },
      { id: 'user-demo-receptionist', name: 'Emily Watson (Receptionist)', email: 'demo.receptionist@petcare.com', role: 'Receptionist', department: 'Front Desk' },
      { id: 'user-demo-assistant', name: 'Jack Taylor (Vet Assistant)', email: 'demo.assistant@petcare.com', role: 'Vet Assistant', department: 'Clinical Support' }
    ];

    // 2. Insert/Update Demo Users
    for (const u of demoUsers) {
      const [ex] = await db.query('SELECT id FROM users WHERE email = ?', [u.email]);
      if (ex.length === 0) {
        await db.query(`
          INSERT INTO users (id, clinic_id, name, email, password_hash, role, phone, username, department, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, '+919876543210', ?, ?, 'Active', NOW(), NOW())
        `, [u.id, clinicId, u.name, u.email, passwordHash, u.role, u.email.split('@')[0], u.department]);
        console.log(`✅ Created demo user: ${u.name} (${u.role}) - ${u.email}`);
      } else {
        await db.query(`
          UPDATE users 
          SET clinic_id = ?, name = ?, password_hash = ?, role = ?, department = ?, status = 'Active', updated_at = NOW()
          WHERE email = ?
        `, [clinicId, u.name, passwordHash, u.role, u.department, u.email]);
        console.log(`✅ Updated demo user: ${u.name} (${u.role}) - ${u.email}`);
      }
    }

    // 3. Permanent Subscription (Valid till 2099)
    const subId = 'sub-demo-permanent';
    const adminUser = demoUsers[0];
    const [exSub] = await db.query('SELECT id FROM saas_subscriptions WHERE clinic_id = ?', [clinicId]);
    if (exSub.length === 0) {
      await db.query(`
        INSERT INTO saas_subscriptions (id, clinic_admin_id, clinic_id, plan_id, status, start_date, end_date, created_at, updated_at)
        VALUES (?, ?, ?, 'plan-pro', 'Active', NOW(), '2099-12-31 23:59:59', NOW(), NOW())
      `, [subId, adminUser.id, clinicId]);
      console.log('✅ Permanent SaaS Active Subscription created (expires 2099)');
    } else {
      await db.query(`
        UPDATE saas_subscriptions 
        SET status = 'Active', end_date = '2099-12-31 23:59:59', updated_at = NOW()
        WHERE clinic_id = ?
      `, [clinicId]);
      console.log('✅ Permanent SaaS Subscription extended to 2099');
    }

    // 4. Full Menu Permissions for ALL Demo Roles
    const roles = ['Admin', 'Doctor', 'Manager', 'Receptionist', 'Vet Assistant'];
    
    // Clear old permissions for clinic to apply full access
    await db.query('DELETE FROM role_permissions WHERE clinic_id = ?', [clinicId]);

    for (const role of roles) {
      for (const menuId of ALL_MENU_IDS) {
        await db.query(`
          INSERT INTO role_permissions (clinic_id, role, menu_id, is_allowed, created_at, updated_at)
          VALUES (?, ?, ?, 1, NOW(), NOW())
          ON DUPLICATE KEY UPDATE is_allowed = 1, updated_at = NOW()
        `, [clinicId, role, menuId]);
      }
      console.log(`✅ Applied 100% FULL menu access (20/20 menus) for role: ${role}`);
    }

    console.log('\n🎉 ALL DEMO USERS CREATED SUCCESSFULLY!');
    console.log('--------------------------------------------------');
    console.log('Password for ALL users: Demo@12345');
    console.log('1. Admin:         demo.admin@petcare.com');
    console.log('2. Doctor:        demo.doctor@petcare.com');
    console.log('3. Manager:       demo.manager@petcare.com');
    console.log('4. Receptionist:  demo.receptionist@petcare.com');
    console.log('5. Vet Assistant: demo.assistant@petcare.com');
    console.log('--------------------------------------------------\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding demo users:', err);
    process.exit(1);
  }
}

seedDemoClinicAndStaff();
