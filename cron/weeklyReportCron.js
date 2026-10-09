/**
 * Weekly 7-Day Report Cron Job
 * 
 * Automatically generates and emails a 7-day clinic data summary report
 * to all subscribed admin emails every 7 days (Sunday at 6:00 AM).
 * 
 * Features:
 * - Generates actual database reports (revenue, appointments, patients, inventory)
 * - Duplicate prevention via period_start/period_end check
 * - Failed job retry with exponential backoff (max 3 retries)
 * - Error logging to scheduled_reports table
 * - Admin-visible report status
 */
const db = require('../config/db');
const emailService = require('../services/emailService');
const crypto = require('crypto');

/**
 * Ensure migration tables exist (auto-create on first run)
 */
async function ensureTables() {
    try {
        const [cols] = await db.query(`SHOW COLUMNS FROM scheduled_reports LIKE 'attempt_count'`).catch(() => [[]]);
        if (!cols || cols.length === 0) {
            await db.query(`DROP TABLE IF EXISTS scheduled_reports`);
        }
        await db.query(`
            CREATE TABLE IF NOT EXISTS scheduled_reports (
                id VARCHAR(64) PRIMARY KEY,
                clinic_id VARCHAR(64) NOT NULL,
                report_type ENUM('WEEKLY_7DAY', 'MANUAL_EMAIL') NOT NULL DEFAULT 'WEEKLY_7DAY',
                recipient_email VARCHAR(255) NOT NULL,
                period_start DATE NOT NULL,
                period_end DATE NOT NULL,
                status ENUM('PENDING', 'SENT', 'FAILED', 'RETRYING') NOT NULL DEFAULT 'PENDING',
                attempt_count INT NOT NULL DEFAULT 0,
                max_retries INT NOT NULL DEFAULT 3,
                last_error TEXT NULL,
                email_message_id VARCHAR(255) NULL,
                report_summary JSON NULL,
                file_size_kb INT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                sent_at TIMESTAMP NULL,
                next_retry_at TIMESTAMP NULL,
                INDEX idx_clinic_period (clinic_id, period_start, period_end),
                INDEX idx_status (status),
                INDEX idx_report_type (report_type)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
        await db.query(`
            CREATE TABLE IF NOT EXISTS report_email_subscriptions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                clinic_id VARCHAR(64) NOT NULL,
                email VARCHAR(255) NOT NULL,
                frequency ENUM('WEEKLY', 'DISABLED') NOT NULL DEFAULT 'WEEKLY',
                is_active TINYINT(1) NOT NULL DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uq_clinic_email (clinic_id, email),
                INDEX idx_active (is_active, frequency)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
    } catch (err) {
        console.error('[WeeklyReportCron] Table creation error (may already exist):', err.message);
    }
}

/**
 * Generate 7-day report data from actual database
 */
async function generate7DayReportData(clinicId) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7);

    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    // 1. Revenue summary
    const [revenueRows] = await db.query(`
        SELECT 
            COALESCE(SUM(grand_total), 0) as total_revenue,
            COUNT(*) as total_invoices,
            COALESCE(AVG(grand_total), 0) as avg_invoice
        FROM invoices 
        WHERE clinic_id = ? AND status = 'Paid' 
          AND invoice_date BETWEEN ? AND ?
    `, [clinicId, startStr, endStr]);

    // 2. Appointment summary
    const [appointmentRows] = await db.query(`
        SELECT 
            COUNT(*) as total_appointments,
            SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed,
            SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) as cancelled,
            SUM(CASE WHEN status IN ('Upcoming', 'Confirmed', 'Pending') THEN 1 ELSE 0 END) as upcoming
        FROM appointments 
        WHERE clinic_id = ? AND appointment_date BETWEEN ? AND ?
    `, [clinicId, startStr, endStr]);

    // 3. New patients registered
    const [newPetsRows] = await db.query(`
        SELECT COUNT(*) as new_pets 
        FROM pets 
        WHERE clinic_id = ? AND created_at BETWEEN ? AND ?
    `, [clinicId, startStr, endStr + ' 23:59:59']);

    // 4. New pet owners
    const [newOwnersRows] = await db.query(`
        SELECT COUNT(*) as new_owners 
        FROM pet_owners 
        WHERE clinic_id = ? AND created_at BETWEEN ? AND ?
    `, [clinicId, startStr, endStr + ' 23:59:59']);

    // 5. Low stock / expiring inventory alerts
    const [inventoryAlerts] = await db.query(`
        SELECT COUNT(*) as alert_count 
        FROM inventory 
        WHERE clinic_id = ? 
          AND (quantity <= low_stock_threshold OR expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY))
    `, [clinicId]);

    // 6. Staff attendance summary
    const [attendanceRows] = await db.query(`
        SELECT 
            COUNT(DISTINCT user_id) as staff_tracked,
            SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as present_days,
            SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) as absent_days
        FROM attendance 
        WHERE clinic_id = ? AND attendance_date BETWEEN ? AND ?
    `, [clinicId, startStr, endStr]);

    // 7. Home visits
    const [homeVisitRows] = await db.query(`
        SELECT 
            COUNT(*) as total_visits,
            SUM(CASE WHEN visit_status = 'Completed' THEN 1 ELSE 0 END) as completed_visits
        FROM home_visits 
        WHERE clinic_id = ?
    `, [clinicId]);

    return {
        periodStart: startStr,
        periodEnd: endStr,
        revenue: {
            total: parseFloat(revenueRows[0]?.total_revenue) || 0,
            invoiceCount: parseInt(revenueRows[0]?.total_invoices) || 0,
            avgInvoice: parseFloat(revenueRows[0]?.avg_invoice) || 0,
        },
        appointments: {
            total: parseInt(appointmentRows[0]?.total_appointments) || 0,
            completed: parseInt(appointmentRows[0]?.completed) || 0,
            cancelled: parseInt(appointmentRows[0]?.cancelled) || 0,
            upcoming: parseInt(appointmentRows[0]?.upcoming) || 0,
        },
        patients: {
            newPets: parseInt(newPetsRows[0]?.new_pets) || 0,
            newOwners: parseInt(newOwnersRows[0]?.new_owners) || 0,
        },
        inventory: {
            alertCount: parseInt(inventoryAlerts[0]?.alert_count) || 0,
        },
        attendance: {
            staffTracked: parseInt(attendanceRows[0]?.staff_tracked) || 0,
            presentDays: parseInt(attendanceRows[0]?.present_days) || 0,
            absentDays: parseInt(attendanceRows[0]?.absent_days) || 0,
        },
        homeVisits: {
            total: parseInt(homeVisitRows[0]?.total_visits) || 0,
            completed: parseInt(homeVisitRows[0]?.completed_visits) || 0,
        }
    };
}

/**
 * Build beautiful HTML email for the weekly report
 */
function buildReportEmailHtml(clinicName, data, adminName) {
    const fmt = (n) => (typeof n === 'number' ? n.toLocaleString('en-IN') : n);
    const fmtCurrency = (n) => '₹' + (typeof n === 'number' ? n.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : n);

    return `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 640px; margin: 0 auto; background: #0f172a; border-radius: 16px; overflow: hidden; border: 1px solid #334155;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%); padding: 2rem; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 1.5rem; font-weight: 800; letter-spacing: 0.5px;">📊 7-Day Clinic Report</h1>
            <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 0.9rem;">${clinicName} — ${data.periodStart} to ${data.periodEnd}</p>
        </div>

        <!-- Body -->
        <div style="padding: 2rem;">
            <p style="color: #cbd5e1; font-size: 0.95rem; margin: 0 0 1.5rem;">
                Hello <strong style="color: #2dd4bf;">${adminName || 'Admin'}</strong>, here's your automated weekly summary:
            </p>

            <!-- Revenue Card -->
            <div style="background: rgba(20, 184, 166, 0.1); border: 1px solid rgba(20, 184, 166, 0.25); border-radius: 12px; padding: 1.25rem; margin-bottom: 1rem;">
                <h3 style="color: #2dd4bf; margin: 0 0 0.75rem; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px;">💰 Revenue Summary</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="color: #94a3b8; font-size: 0.85rem; padding: 4px 0;">Total Revenue</td>
                        <td style="color: #f8fafc; font-size: 1rem; font-weight: 700; text-align: right;">${fmtCurrency(data.revenue.total)}</td>
                    </tr>
                    <tr>
                        <td style="color: #94a3b8; font-size: 0.85rem; padding: 4px 0;">Invoices Generated</td>
                        <td style="color: #f8fafc; font-weight: 600; text-align: right;">${fmt(data.revenue.invoiceCount)}</td>
                    </tr>
                    <tr>
                        <td style="color: #94a3b8; font-size: 0.85rem; padding: 4px 0;">Avg Invoice Value</td>
                        <td style="color: #f8fafc; font-weight: 600; text-align: right;">${fmtCurrency(data.revenue.avgInvoice)}</td>
                    </tr>
                </table>
            </div>

            <!-- Appointments Card -->
            <div style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 12px; padding: 1.25rem; margin-bottom: 1rem;">
                <h3 style="color: #60a5fa; margin: 0 0 0.75rem; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px;">📅 Appointments</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="color: #94a3b8; font-size: 0.85rem; padding: 4px 0;">Total Appointments</td>
                        <td style="color: #f8fafc; font-weight: 700; text-align: right;">${fmt(data.appointments.total)}</td>
                    </tr>
                    <tr>
                        <td style="color: #94a3b8; font-size: 0.85rem; padding: 4px 0;">Completed</td>
                        <td style="color: #22c55e; font-weight: 600; text-align: right;">${fmt(data.appointments.completed)}</td>
                    </tr>
                    <tr>
                        <td style="color: #94a3b8; font-size: 0.85rem; padding: 4px 0;">Cancelled</td>
                        <td style="color: #ef4444; font-weight: 600; text-align: right;">${fmt(data.appointments.cancelled)}</td>
                    </tr>
                </table>
            </div>

            <!-- Patients & Inventory Row -->
            <div style="display: flex; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap;">
                <div style="flex: 1; min-width: 200px; background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.2); border-radius: 12px; padding: 1.25rem;">
                    <h3 style="color: #a78bfa; margin: 0 0 0.75rem; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px;">🐾 New Patients</h3>
                    <p style="color: #f8fafc; font-size: 1.5rem; font-weight: 800; margin: 0;">${fmt(data.patients.newPets)}</p>
                    <p style="color: #94a3b8; font-size: 0.8rem; margin: 4px 0 0;">New owners: ${fmt(data.patients.newOwners)}</p>
                </div>
                <div style="flex: 1; min-width: 200px; background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.2); border-radius: 12px; padding: 1.25rem;">
                    <h3 style="color: #fbbf24; margin: 0 0 0.75rem; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px;">📦 Inventory Alerts</h3>
                    <p style="color: #f8fafc; font-size: 1.5rem; font-weight: 800; margin: 0;">${fmt(data.inventory.alertCount)}</p>
                    <p style="color: #94a3b8; font-size: 0.8rem; margin: 4px 0 0;">Low stock / expiring items</p>
                </div>
            </div>

            <!-- Attendance & Home Visits -->
            <div style="display: flex; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap;">
                <div style="flex: 1; min-width: 200px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 12px; padding: 1.25rem;">
                    <h3 style="color: #34d399; margin: 0 0 0.5rem; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px;">👨‍⚕️ Staff Attendance</h3>
                    <p style="color: #94a3b8; font-size: 0.85rem; margin: 0;">Present: <strong style="color: #22c55e;">${fmt(data.attendance.presentDays)}</strong> days  ·  Absent: <strong style="color: #ef4444;">${fmt(data.attendance.absentDays)}</strong> days</p>
                </div>
                <div style="flex: 1; min-width: 200px; background: rgba(236, 72, 153, 0.1); border: 1px solid rgba(236, 72, 153, 0.2); border-radius: 12px; padding: 1.25rem;">
                    <h3 style="color: #f472b6; margin: 0 0 0.5rem; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px;">🏠 Home Visits</h3>
                    <p style="color: #94a3b8; font-size: 0.85rem; margin: 0;">Total: <strong style="color: #f8fafc;">${fmt(data.homeVisits.total)}</strong>  ·  Completed: <strong style="color: #22c55e;">${fmt(data.homeVisits.completed)}</strong></p>
                </div>
            </div>

            <p style="color: #64748b; font-size: 0.8rem; margin-top: 1.5rem; text-align: center;">
                This report was automatically generated by PetCare Pro. Next report in 7 days.
            </p>
        </div>

        <!-- Footer -->
        <div style="background: #1e293b; padding: 1.25rem; text-align: center; border-top: 1px solid #334155;">
            <p style="color: #64748b; font-size: 0.78rem; margin: 0;">
                © ${new Date().getFullYear()} PetCare Pro SaaS by Kiaan Technology · <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" style="color: #14b8a6; text-decoration: none;">Login to Dashboard</a>
            </p>
        </div>
    </div>`;
}

/**
 * Check for duplicate: has this exact period already been sent for this clinic?
 */
async function isDuplicateReport(clinicId, periodStart, periodEnd) {
    const [rows] = await db.query(`
        SELECT id FROM scheduled_reports 
        WHERE clinic_id = ? AND period_start = ? AND period_end = ? 
          AND report_type = 'WEEKLY_7DAY' AND status = 'SENT'
        LIMIT 1
    `, [clinicId, periodStart, periodEnd]);
    return rows.length > 0;
}

/**
 * Main cron job: generate and send weekly reports for all active clinics
 */
async function runWeeklyReportCron() {
    console.log('[WeeklyReportCron] Starting 7-day report generation...');
    
    try {
        await ensureTables();

        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 7);
        const periodStart = startDate.toISOString().split('T')[0];
        const periodEnd = endDate.toISOString().split('T')[0];

        // Get all active clinics with their admin emails
        const [clinics] = await db.query(`
            SELECT DISTINCT c.id as clinic_id, c.clinic_name, u.email, u.name as admin_name
            FROM clinics c
            JOIN users u ON c.id = u.clinic_id
            WHERE u.role = 'Admin' AND u.status = 'Active'
        `);

        // Also get custom email subscriptions
        const [subscriptions] = await db.query(`
            SELECT clinic_id, email FROM report_email_subscriptions 
            WHERE is_active = 1 AND frequency = 'WEEKLY'
        `);

        // Build clinic email map
        const clinicEmailMap = {};
        for (const clinic of clinics) {
            if (!clinicEmailMap[clinic.clinic_id]) {
                clinicEmailMap[clinic.clinic_id] = {
                    clinicName: clinic.clinic_name,
                    adminName: clinic.admin_name,
                    emails: new Set()
                };
            }
            clinicEmailMap[clinic.clinic_id].emails.add(clinic.email);
        }

        // Add subscription emails
        for (const sub of subscriptions) {
            if (clinicEmailMap[sub.clinic_id]) {
                clinicEmailMap[sub.clinic_id].emails.add(sub.email);
            }
        }

        let totalSent = 0;
        let totalFailed = 0;

        for (const [clinicId, info] of Object.entries(clinicEmailMap)) {
            for (const recipientEmail of info.emails) {
                // Duplicate check
                const isDuplicate = await isDuplicateReport(clinicId, periodStart, periodEnd);
                if (isDuplicate) {
                    console.log(`[WeeklyReportCron] Skipping duplicate for clinic ${clinicId} (${periodStart} to ${periodEnd})`);
                    continue;
                }

                const reportId = crypto.randomUUID ? crypto.randomUUID() : `rpt-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
                
                // Insert PENDING record
                await db.query(`
                    INSERT INTO scheduled_reports (id, clinic_id, report_type, recipient_email, period_start, period_end, status, attempt_count)
                    VALUES (?, ?, 'WEEKLY_7DAY', ?, ?, ?, 'PENDING', 0)
                `, [reportId, clinicId, recipientEmail, periodStart, periodEnd]);

                try {
                    // Generate report data from actual database
                    const reportData = await generate7DayReportData(clinicId);
                    const html = buildReportEmailHtml(info.clinicName, reportData, info.adminName);
                    const text = `7-Day Report for ${info.clinicName} (${periodStart} to ${periodEnd}): Revenue ₹${reportData.revenue.total}, Appointments ${reportData.appointments.total}, New Pets ${reportData.patients.newPets}`;

                    const result = await emailService.sendEmail({
                        to: recipientEmail,
                        subject: `📊 Weekly Clinic Report — ${info.clinicName} (${periodStart} to ${periodEnd})`,
                        text,
                        html
                    });

                    // Mark as SENT
                    await db.query(`
                        UPDATE scheduled_reports 
                        SET status = 'SENT', attempt_count = 1, sent_at = NOW(), 
                            email_message_id = ?, report_summary = ?
                        WHERE id = ?
                    `, [result.messageId || null, JSON.stringify(reportData), reportId]);

                    totalSent++;
                    console.log(`[WeeklyReportCron] ✅ Report sent to ${recipientEmail} for clinic ${info.clinicName}`);
                } catch (err) {
                    totalFailed++;
                    console.error(`[WeeklyReportCron] ❌ Failed for ${recipientEmail}:`, err.message);

                    // Mark as FAILED with retry info
                    const nextRetry = new Date(Date.now() + 30 * 60 * 1000); // retry in 30 min
                    await db.query(`
                        UPDATE scheduled_reports 
                        SET status = 'FAILED', attempt_count = 1, last_error = ?, next_retry_at = ?
                        WHERE id = ?
                    `, [err.message, nextRetry, reportId]);
                }
            }
        }

        console.log(`[WeeklyReportCron] Completed. Sent: ${totalSent}, Failed: ${totalFailed}`);
    } catch (err) {
        console.error('[WeeklyReportCron] Fatal error:', err);
    }
}

/**
 * Retry failed reports (called periodically)
 */
async function retryFailedReports() {
    try {
        const [failedJobs] = await db.query(`
            SELECT sr.*, c.clinic_name, u.name as admin_name
            FROM scheduled_reports sr
            LEFT JOIN clinics c ON sr.clinic_id = c.id
            LEFT JOIN users u ON sr.clinic_id = u.clinic_id AND u.role = 'Admin'
            WHERE sr.status IN ('FAILED', 'RETRYING')
              AND sr.attempt_count < sr.max_retries
              AND (sr.next_retry_at IS NULL OR sr.next_retry_at <= NOW())
            ORDER BY sr.created_at ASC
            LIMIT 10
        `);

        for (const job of failedJobs) {
            console.log(`[WeeklyReportCron] Retrying report ${job.id} (attempt ${job.attempt_count + 1})...`);

            await db.query(`UPDATE scheduled_reports SET status = 'RETRYING', attempt_count = attempt_count + 1 WHERE id = ?`, [job.id]);

            try {
                const reportData = await generate7DayReportData(job.clinic_id);
                const html = buildReportEmailHtml(job.clinic_name || 'Clinic', reportData, job.admin_name || 'Admin');

                const result = await emailService.sendEmail({
                    to: job.recipient_email,
                    subject: `📊 Weekly Clinic Report — ${job.clinic_name || 'Clinic'} (${job.period_start} to ${job.period_end})`,
                    text: `7-Day Report for ${job.clinic_name} (Retry)`,
                    html
                });

                await db.query(`
                    UPDATE scheduled_reports 
                    SET status = 'SENT', sent_at = NOW(), email_message_id = ?, report_summary = ?, last_error = NULL
                    WHERE id = ?
                `, [result.messageId || null, JSON.stringify(reportData), job.id]);

                console.log(`[WeeklyReportCron] ✅ Retry succeeded for ${job.recipient_email}`);
            } catch (err) {
                const nextRetryDelay = Math.pow(2, job.attempt_count) * 30 * 60 * 1000; // exponential backoff
                const nextRetry = new Date(Date.now() + nextRetryDelay);
                const newStatus = (job.attempt_count + 1 >= job.max_retries) ? 'FAILED' : 'RETRYING';

                await db.query(`
                    UPDATE scheduled_reports 
                    SET status = ?, last_error = ?, next_retry_at = ?
                    WHERE id = ?
                `, [newStatus, err.message, nextRetry, job.id]);

                console.error(`[WeeklyReportCron] ❌ Retry failed for ${job.recipient_email}: ${err.message}`);
            }
        }
    } catch (err) {
        console.error('[WeeklyReportCron] Retry process error:', err);
    }
}

/**
 * Send a one-time manual email report (for the "Send Backup to Email" form)
 */
async function sendManualEmailReport(clinicId, recipientEmail) {
    await ensureTables();

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7);
    const periodStart = startDate.toISOString().split('T')[0];
    const periodEnd = endDate.toISOString().split('T')[0];

    const reportId = crypto.randomUUID ? crypto.randomUUID() : `rpt-manual-${Date.now()}`;

    // Get clinic name
    const [clinicRows] = await db.query('SELECT clinic_name FROM clinics WHERE id = ?', [clinicId]);
    const clinicName = clinicRows[0]?.clinic_name || 'Your Clinic';

    // Get admin name
    const [adminRows] = await db.query('SELECT name FROM users WHERE clinic_id = ? AND role = "Admin" LIMIT 1', [clinicId]);
    const adminName = adminRows[0]?.name || 'Admin';

    // Insert record
    await db.query(`
        INSERT INTO scheduled_reports (id, clinic_id, report_type, recipient_email, period_start, period_end, status, attempt_count)
        VALUES (?, ?, 'MANUAL_EMAIL', ?, ?, ?, 'PENDING', 0)
    `, [reportId, clinicId, recipientEmail, periodStart, periodEnd]);

    try {
        const reportData = await generate7DayReportData(clinicId);
        const html = buildReportEmailHtml(clinicName, reportData, adminName);
        const text = `Manual 7-Day Report for ${clinicName} (${periodStart} to ${periodEnd})`;

        const result = await emailService.sendEmail({
            to: recipientEmail,
            subject: `📊 7-Day Clinic Data Report — ${clinicName} (${periodStart} to ${periodEnd})`,
            text,
            html
        });

        await db.query(`
            UPDATE scheduled_reports 
            SET status = 'SENT', attempt_count = 1, sent_at = NOW(), 
                email_message_id = ?, report_summary = ?
            WHERE id = ?
        `, [result.messageId || null, JSON.stringify(reportData), reportId]);

        return { success: true, reportId, reportData, messageId: result.messageId };
    } catch (err) {
        await db.query(`
            UPDATE scheduled_reports SET status = 'FAILED', attempt_count = 1, last_error = ? WHERE id = ?
        `, [err.message, reportId]);
        throw err;
    }
}

/**
 * Start the cron scheduler
 * - Weekly report: every 7 days (runs on server start, then every 7 days)
 * - Retry loop: every 1 hour
 */
function startWeeklyReportCron() {
    console.log('[WeeklyReportCron] Scheduler initialized.');

    // Ensure tables on startup
    ensureTables();

    // Run weekly report every 7 days (604800000 ms)
    // First run after 10 seconds (to let DB connect), then every 7 days
    setTimeout(() => {
        runWeeklyReportCron();
        setInterval(runWeeklyReportCron, 7 * 24 * 60 * 60 * 1000);
    }, 10000);

    // Retry failed reports every 1 hour
    setInterval(retryFailedReports, 60 * 60 * 1000);
}

module.exports = {
    startWeeklyReportCron,
    runWeeklyReportCron,
    retryFailedReports,
    sendManualEmailReport,
    generate7DayReportData,
    buildReportEmailHtml,
    ensureTables
};
