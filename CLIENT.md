# Central Dispatch Payroll System — Client Documentation

## 📌 Executive Summary
**Central Dispatch Payroll** is an enterprise-grade weekly payroll and workforce management system custom-built for Central Dispatch operations in Bermuda. The platform seamlessly manages employee master records, shift schedules, leave calendars, customer accounting, statutory tax deductions, and automated payroll calculations.

---

## 🎯 Primary Purpose & Business Value
1. **Weekly Payroll Processing**: Streamlines weekly payroll cycles (Thursday through Wednesday) with instant calculations of Regular Pay, Holiday Pay, Other Allowances, Deductions, and Net Payroll.
2. **Staff Rota & Shift Management**: Maintains employee duty schedules independently from payroll, tracking weekly shift hours.
3. **Leave Tracking**: Records Sick Time and Holiday/Vacation days on interactive dual-calendar displays.
4. **Bermuda Tax Flexibility**: Provides an editable Statutory Tax / Deduction input column to accommodate individual employee tax brackets under Bermuda labor laws.
5. **Customer Accounts & Accounting Integration**: Live management of 784 customers, accounts receivable, general ledger history, customer invoicing, and payment receipts.
6. **Audit Logging & Access Control**: Tracks all administrative actions with audit logs and fine-grained role-based permissions (Super Admin, Admin, Staff).

---

## 🛠️ Main Feature Modules

### 1. Dashboard (`/dashboard`) — Super Admin Exclusive
- Executive overview displaying **Total Active Staff**, **Total Hours**, **Gross Payroll ($)**, and **Net Payroll To Pay ($)**.
- Visual charts: Employee Payroll Bar Chart & Staff Leave Donut Chart.
- Quick preview of current weekly staff shifts and active workspace status.
- **Strict Role Protection**: Accessible strictly by **Super Admin** (`Neli`). General `Admin` and `Staff` are routed directly to `/schedules`.

### 2. Employee Directory & Staff Management (`/employees` & `/contacts`)
- **Employee Records (`/employees`) — Super Admin Exclusive**:
  - Full employee records including confidential hourly pay rates (`$20.00/hr`, `$35.00/hr`, etc.), holiday rates, addresses, and emergency contacts.
  - Restricted strictly to Super Admin to protect confidential compensation data from general admins.
- **Staff Contacts (`/contacts`) — Operational Admin & Management**:
  - Master operational contact directory with names, phone numbers, email addresses, and physical locations.
  - Does **NOT** expose hourly pay rates, making it safe for daily operations and shift dispatchers.

### 3. Payroll Console (`/payroll`) — Super Admin Exclusive
- Central workspace for computing weekly salaries (Thursday through Wednesday).
- Auto-syncs all active employees from the Employee Directory into the active draft.
- **Complete 11-Column Layout**:
  1. **EMPLOYEE**: Staff member name, title, and role badge.
  2. **REGULAR RATE ($)**: Hourly base pay pulled from staff record.
  3. **REGULAR HOURS**: Editable input for hours worked.
  4. **REGULAR PAY ($)**: Calculated: $\text{Regular Rate} \times \text{Regular Hours}$.
  5. **HOLIDAY RATE ($)**: Base rate $\times 1.5$ (or stored holiday rate).
  6. **HOLIDAY HOURS**: Editable input for holiday shift hours.
  7. **HOLIDAY PAY ($)**: Calculated: $\text{Holiday Rate} \times \text{Holiday Hours}$.
  8. **OTHER PAY ($)**: Editable bonus, overtime, or extra pay allowance.
  9. **DEDUCTIONS ($)**: Editable deductions (Bermuda Payroll Tax, Social Insurance, Pensions).
  10. **TOTAL HOURS**: Calculated: $\text{Regular Hours} + \text{Holiday Hours}$.
  11. **GROSS PAY ($)**: Calculated: $\text{Regular Pay} + \text{Holiday Pay} + \text{Other Pay}$.
  12. **NET PAY ($)**: Calculated: $\text{Gross Pay} - \text{Deductions}$.
- **Top Summary Cards**: Total Hours, Gross Payroll ($), Total Payroll To Pay ($).
- **Actions**: Save Draft, Backup Payroll Data (JSON), Restore Backup, Export to Excel, Print Report, View Payslips, Process Pay.

### 4. Weekly Schedules & Shift Rota (`/schedules`)
- Independent staff shift roster tracking Monday through Sunday duty hours.
- **Direct Hours & Shift Entry**:
  - Accept plain numbers (e.g. `8`, `6.5`, `10`, `3.75`).
  - Accept shift ranges (e.g. `8am-4pm`, `8-4`, `9-5`, `7-3`) with auto-calculated duration.
  - Accept non-working markers (`OFF`, `Sick`, `Vacation`).
- **Live Auto-Calculations**: Computes individual `Weekly Hours` per employee and `TOTAL SCHEDULED HOURS` across the entire team in real time.
- **Actions**: Save Schedule, Clear Week, Print Weekly Schedule, Export Schedule to Excel.
- **Dual Persistence**: Persists directly to MySQL `schedules` table with LocalStorage backup.

### 5. Customer Accounts, Invoicing & Payments
- **Customers & Ledgers (`/customers`)**: Complete database with **782 Total Verified Records**, A-to-Z alphabetical sorting, search, pagination controls (25, 50, 100, 250, All), and customer statements.
- **Create Invoice (`/invoices`)**: Multi-line invoicing with line items, tax, memo, and online pay link sharing.
- **Record Payment (`/payments`)**: Record money received, apply to open invoices, and view the **Default Customer Payment Link Integration** (`https://ridebermuda-prod.web.app/paylink`) with quick "Copy Link" and "Test Link" buttons.
- **General Ledger (`/general-ledger`)**: 1,927+ historical and live transactions with search, date filters, and Excel export.

### 6. Leave Calendars (`/leave`)
- Dual-calendar interactive view: **Sick Time Calendar (Red)** & **Holiday Calendar (Green)**.
- Select Employee and Month to view or edit recorded leave days.
- Persists records directly to database table `leave_records`.

### 7. Payslips Generator (`/payslips`) — Super Admin Exclusive
- Official printable salary slips (pay stubs) for individual staff members.
- Multi-tier resilient data loader ensures employee payslips render immediately without empty states.
- One-click **Print Payslip** and **Email Payslip** features.

### 8. User Security & Password Management
- **Change Password**: Self-service and administrative password update modal with Show/Hide visibility toggles on both password fields, real-time match indicator badges, and auto-trimmed inputs.
- **Permissions (`/permissions`)**: Granular 3-card role management:
  - **Super Admin**: Executive full authority, locked & permanent.
  - **Admin**: Operations, Schedules, Customer Ledgers, Invoices, Payments, and Staff Contacts (No pay rates or payroll access).
  - **Staff**: Weekly Schedules & Shift Notes only.

---

## 📅 Work Log & Progress (Date-Wise)

### 🗓️ Latest Update (16 September 2026) — Access Control Hardening & Client Enhancements
* **🔐 Enhanced Change Password Flow**:
  - Added Show/Hide Eye toggle to the **Confirm New Password** input.
  - Added real-time visual indicator badges (`Passwords match` in green ✅ / `Passwords do not match` in red ⚠️).
  - Auto-trims inputs to avoid whitespace mismatches.
  - Updated backend routes to support both bcrypt hashes and legacy plaintext verification safely.
* **🛡️ Hardened Super Admin Dashboard Restriction**:
  - Locked `/dashboard` strictly to `superadmin` role using `<SuperAdminRoute>`.
  - Configured `admin` and `staff` default login landing to `/schedules`.
  - Hidden Dashboard menu item from Sidebar for non-superadmin users.
* **📅 Weekly Schedules Persistence**:
  - Enhanced `handleSave` in `WeeklySchedules.tsx` to properly map `employeeId` / `id` across grid rows and MySQL bulk upsert.
  - Added local cache merge fallback to prevent schedule wiping upon rapid navigation.
* **🚫 Confidential Employee Records Block for Admin**:
  - Restricted `/employees` and `/employees/:id` to `superadmin` to safeguard confidential employee hourly pay rates (`$20/hr`, `$35/hr`).
  - Normal `admin` uses **Staff Contacts** (`/contacts`) for operational communication (phone, email) without exposure to financial rates.
* **💳 Customer Payment Link on Record Payment Page**:
  - Integrated the RideBermuda Customer Payment Link (`https://ridebermuda-prod.web.app/paylink`) into `PaymentsView`.
  - Provided quick **"Copy Link"** and **"Test Link"** action buttons.
* **📄 Payslips Generator Resilient Loader**:
  - Initialized `employees` with cached directory data to prevent the false "No Employee Records Available" blank state.
  - Added multi-tier fetching from both `employeeService.fetchEmployees()` and `/api/payslips`.

---

## 🧪 Client Testing Guide (Step-by-Step)

### 1. Test Super Admin Login & Dashboard (`/dashboard`)
1. Log in as `superadmin`.
2. Confirm access to the executive Dashboard overview, financial summary cards, and charts.
3. Open the top-right profile or sidebar menu and click **Change Password**:
   - Verify both password inputs have eye show/hide toggle buttons.
   - Verify the green `Passwords match` / red `Passwords do not match` badge updates as you type.

### 2. Test Admin Role Isolation (`/login`)
1. Log in as `admin`.
2. Verify you are redirected directly to **Weekly Schedules** (`/schedules`).
3. Confirm that **Dashboard**, **Employee Records** (pay rates), **Payroll**, **Payroll Reports**, **Payslips**, **Permissions**, and **User Accounts** are **NOT** visible in the sidebar and are inaccessible.
4. Verify you can access **Staff Contacts** (`/contacts`), **Weekly Schedules** (`/schedules`), and **Customers & Ledgers** (`/customers`).

### 3. Test Weekly Schedules Rota (`/schedules`)
1. Select Week Start date (e.g. `09/17/2026`).
2. Type shift hours for staff (e.g., `8`, `9`, `8-4`, `OFF`, `Sick`).
3. Click **Save Schedule** — verify the success toast notification appears and the shifts remain saved upon refreshing the page.

### 4. Test Customer Payment Link on Record Payment (`/payments`)
1. Navigate to **Record Payment** from the sidebar.
2. Confirm the **Default Customer Payment Link** card is displayed at the top with `https://ridebermuda-prod.web.app/paylink`.
3. Click **Copy Link** — verify the toast notification "Payment link copied to clipboard!".
4. Click **Test Link** — verify it opens the payment portal in a new tab.

### 5. Test Payslips Generator (`/payslips`)
1. Log in as `superadmin` and navigate to **Payslips**.
2. Confirm that active employees load immediately in the dropdown without displaying "No Employee Records Available".
3. Select an employee to view their statement of earnings and click **Print Payslip** or **Email Employee**.
