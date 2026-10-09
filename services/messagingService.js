const pool = require('../config/db');
const crypto = require('crypto');
const emailService = require('./emailService');

// Helper to replace {{placeholder}} tags
function parseTemplate(templateText, vars = {}) {
    if (!templateText) return '';
    return templateText.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
        return vars[key] !== undefined && vars[key] !== null ? vars[key] : match;
    });
}

// Fetch active gateway configuration from system_settings
async function getMessagingConfig() {
    try {
        const [rows] = await pool.query(
            "SELECT setting_key, setting_value FROM system_settings WHERE setting_key LIKE '%whatsapp%' OR setting_key LIKE '%sms%' OR setting_key LIKE '%twilio%' OR setting_key LIKE '%fast2sms%'"
        );
        const config = {};
        rows.forEach(r => {
            config[r.setting_key] = r.setting_value;
        });
        return {
            whatsappProvider: config.whatsapp_gateway_provider || process.env.WHATSAPP_PROVIDER || 'simulator',
            whatsappToken: config.whatsapp_api_token || process.env.WHATSAPP_API_TOKEN || '',
            whatsappPhoneId: config.whatsapp_phone_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID || '',
            smsProvider: config.sms_gateway_provider || process.env.SMS_PROVIDER || 'simulator',
            twilioSid: config.twilio_account_sid || process.env.TWILIO_ACCOUNT_SID || '',
            twilioAuthToken: config.twilio_auth_token || process.env.TWILIO_AUTH_TOKEN || '',
            twilioPhone: config.twilio_phone_number || process.env.TWILIO_PHONE_NUMBER || '',
            fast2smsApiKey: config.fast2sms_api_key || process.env.FAST2SMS_API_KEY || ''
        };
    } catch (err) {
        console.error('[MessagingService] Error loading config:', err.message);
        return {
            whatsappProvider: 'simulator',
            smsProvider: 'simulator'
        };
    }
}

// Core WhatsApp Dispatcher
async function sendWhatsApp({ to, message, templateType = 'custom', clinicId = null, recipientName = 'Valued Pet Parent' }) {
    const whatsappService = require('./whatsappService');
    
    // First attempt sending via live connected WhatsApp Web QR session if active for clinic
    if (clinicId) {
        const waStatus = await whatsappService.getStatus(clinicId);
        if (waStatus && waStatus.status === 'CONNECTED') {
            return await whatsappService.sendMessage(clinicId, to, message, recipientName);
        }
    }

    const config = await getMessagingConfig();
    const logId = crypto.randomUUID();
    let status = 'Sent';
    let gatewayResponse = 'Simulated Delivery: WhatsApp message queued successfully';

    const cleanPhone = String(to).replace(/[^0-9+]/g, '');

    try {
        if (config.whatsappProvider === 'meta_cloud' && config.whatsappToken && config.whatsappPhoneId) {
            // Meta WhatsApp Cloud API
            const response = await fetch(`https://graph.facebook.com/v19.0/${config.whatsappPhoneId}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.whatsappToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    recipient_type: 'individual',
                    to: cleanPhone.replace('+', ''),
                    type: 'text',
                    text: { body: message }
                })
            });
            const data = await response.json();
            gatewayResponse = JSON.stringify(data);
            if (!response.ok) {
                status = 'Failed';
            } else {
                status = 'Delivered';
            }
        } else if (config.whatsappProvider === 'twilio' && config.twilioSid && config.twilioAuthToken) {
            // Twilio WhatsApp API
            const auth = Buffer.from(`${config.twilioSid}:${config.twilioAuthToken}`).toString('base64');
            const params = new URLSearchParams();
            params.append('From', `whatsapp:${config.twilioPhone}`);
            params.append('To', `whatsapp:${cleanPhone.startsWith('+') ? cleanPhone : `+91${cleanPhone}`}`);
            params.append('Body', message);

            const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${config.twilioSid}/Messages.json`, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: params.toString()
            });
            const data = await response.json();
            gatewayResponse = JSON.stringify(data);
            status = response.ok ? 'Delivered' : 'Failed';
        } else {
            // Simulator Mode
            console.log(`\n💬 [WHATSAPP SIMULATOR] To: ${recipientName} (${cleanPhone})\n${message}\n`);
            status = 'Simulated';
            gatewayResponse = 'Simulated WhatsApp dispatch (Sandbox Mode Active)';
        }
    } catch (err) {
        console.error('[MessagingService] WhatsApp Dispatch Error:', err.message);
        status = 'Failed';
        gatewayResponse = err.message;
    }

    // Record in notification_logs
    try {
        await pool.query(
            `INSERT INTO notification_logs (id, clinic_id, channel, recipient_name, recipient_contact, template_type, message_content, status, gateway_response)
             VALUES (?, ?, 'whatsapp', ?, ?, ?, ?, ?, ?)`,
            [logId, clinicId, recipientName, cleanPhone, templateType, message, status, gatewayResponse]
        );
    } catch (dbErr) {
        console.error('[MessagingService] Failed to record log:', dbErr.message);
    }

    return { id: logId, status, gatewayResponse };
}

// Core SMS Dispatcher
async function sendSMS({ to, message, templateType = 'custom', clinicId = null, recipientName = 'Valued Pet Parent' }) {
    const config = await getMessagingConfig();
    const logId = crypto.randomUUID();
    let status = 'Sent';
    let gatewayResponse = 'Simulated Delivery: SMS message queued successfully';

    const cleanPhone = String(to).replace(/[^0-9+]/g, '');

    try {
        if (config.smsProvider === 'fast2sms' && config.fast2smsApiKey) {
            // Fast2SMS Gateway (India DLT / Quick SMS)
            const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
                method: 'POST',
                headers: {
                    'authorization': config.fast2smsApiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    route: 'q',
                    message: message,
                    numbers: cleanPhone.replace('+91', '').slice(-10)
                })
            });
            const data = await response.json();
            gatewayResponse = JSON.stringify(data);
            status = data.return ? 'Delivered' : 'Failed';
        } else if (config.smsProvider === 'twilio' && config.twilioSid && config.twilioAuthToken) {
            // Twilio SMS
            const auth = Buffer.from(`${config.twilioSid}:${config.twilioAuthToken}`).toString('base64');
            const params = new URLSearchParams();
            params.append('From', config.twilioPhone);
            params.append('To', cleanPhone.startsWith('+') ? cleanPhone : `+91${cleanPhone}`);
            params.append('Body', message);

            const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${config.twilioSid}/Messages.json`, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: params.toString()
            });
            const data = await response.json();
            gatewayResponse = JSON.stringify(data);
            status = response.ok ? 'Delivered' : 'Failed';
        } else {
            // Simulator Mode
            console.log(`\n📱 [SMS SIMULATOR] To: ${recipientName} (${cleanPhone})\n${message}\n`);
            status = 'Simulated';
            gatewayResponse = 'Simulated SMS dispatch (Sandbox Mode Active)';
        }
    } catch (err) {
        console.error('[MessagingService] SMS Dispatch Error:', err.message);
        status = 'Failed';
        gatewayResponse = err.message;
    }

    // Record in notification_logs
    try {
        await pool.query(
            `INSERT INTO notification_logs (id, clinic_id, channel, recipient_name, recipient_contact, template_type, message_content, status, gateway_response)
             VALUES (?, ?, 'sms', ?, ?, ?, ?, ?, ?)`,
            [logId, clinicId, recipientName, cleanPhone, templateType, message, status, gatewayResponse]
        );
    } catch (dbErr) {
        console.error('[MessagingService] Failed to record log:', dbErr.message);
    }

    return { id: logId, status, gatewayResponse };
}

// Fetch template by type and channel
async function getTemplate(templateType, channel, clinicId = null) {
    try {
        const [rows] = await pool.query(
            `SELECT * FROM notification_templates 
             WHERE template_type = ? AND channel = ? AND (clinic_id = ? OR clinic_id IS NULL)
             ORDER BY clinic_id DESC LIMIT 1`,
            [templateType, channel, clinicId]
        );
        return rows.length > 0 ? rows[0] : null;
    } catch (err) {
        console.error('[MessagingService] Error fetching template:', err.message);
        return null;
    }
}

// Trigger Appointment Confirmation (WhatsApp + SMS)
async function sendAppointmentConfirmation({ appointmentId, clinicId }) {
    try {
        const [rows] = await pool.query(`
            SELECT 
                a.id, a.appointment_date, a.appointment_time,
                p.name as pet_name,
                po.name as owner_name, po.phone as owner_phone, po.email as owner_email,
                u.name as doctor_name,
                c.clinic_name, c.phone as clinic_phone, c.address as clinic_address
            FROM appointments a
            LEFT JOIN pets p ON a.pet_id = p.id
            LEFT JOIN pet_owners po ON p.owner_id = po.id
            LEFT JOIN users u ON a.doctor_id = u.id
            LEFT JOIN clinics c ON a.clinic_id = c.id
            WHERE a.id = ?
            LIMIT 1
        `, [appointmentId]);

        if (rows.length === 0) return { error: 'Appointment not found' };
        const apt = rows[0];

        const vars = {
            pet_name: apt.pet_name || 'Pet',
            owner_name: apt.owner_name || 'Pet Parent',
            clinic_name: apt.clinic_name || 'Kiaan Veterinary Clinic',
            clinic_phone: apt.clinic_phone || '+91 99999 99999',
            clinic_address: apt.clinic_address || 'Clinic Registered Address',
            doctor_name: apt.doctor_name || 'Veterinarian',
            appointment_date: new Date(apt.appointment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
            appointment_time: apt.appointment_time || '10:00 AM'
        };

        if (apt.owner_phone) {
            // WhatsApp
            const waTmpl = await getTemplate('appointment_confirmation', 'whatsapp', clinicId);
            if (waTmpl && waTmpl.body_template) {
                const waMsg = parseTemplate(waTmpl.body_template, vars);
                await sendWhatsApp({
                    to: apt.owner_phone,
                    message: waMsg,
                    templateType: 'appointment_confirmation',
                    clinicId: apt.clinic_id || clinicId,
                    recipientName: apt.owner_name
                });
            }

            // SMS
            const smsTmpl = await getTemplate('appointment_confirmation', 'sms', clinicId);
            if (smsTmpl && smsTmpl.body_template) {
                const smsMsg = parseTemplate(smsTmpl.body_template, vars);
                await sendSMS({
                    to: apt.owner_phone,
                    message: smsMsg,
                    templateType: 'appointment_confirmation',
                    clinicId: apt.clinic_id || clinicId,
                    recipientName: apt.owner_name
                });
            }
        }

        return { success: true };
    } catch (err) {
        console.error('[MessagingService] Appointment Confirmation Error:', err);
        return { error: err.message };
    }
}

// Trigger Vaccination Alert
async function sendVaccinationAlert({ petName, ownerName, ownerPhone, vaccineName, dueDate, clinicId }) {
    const vars = {
        pet_name: petName || 'Pet',
        owner_name: ownerName || 'Pet Parent',
        vaccine_name: vaccineName || 'Rabies / DHPP',
        due_date: dueDate || 'Next Week',
        clinic_name: 'Kiaan Veterinary Care',
        clinic_phone: '+91 99999 99999'
    };

    if (!ownerPhone) return { error: 'Owner phone missing' };

    const waTmpl = await getTemplate('vaccination_due', 'whatsapp', clinicId);
    if (waTmpl && waTmpl.body_template) {
        const waMsg = parseTemplate(waTmpl.body_template, vars);
        await sendWhatsApp({
            to: ownerPhone,
            message: waMsg,
            templateType: 'vaccination_due',
            clinicId,
            recipientName: ownerName
        });
    }

    const smsTmpl = await getTemplate('vaccination_due', 'sms', clinicId);
    if (smsTmpl && smsTmpl.body_template) {
        const smsMsg = parseTemplate(smsTmpl.body_template, vars);
        await sendSMS({
            to: ownerPhone,
            message: smsMsg,
            templateType: 'vaccination_due',
            clinicId,
            recipientName: ownerName
        });
    }

    return { success: true };
}

module.exports = {
    parseTemplate,
    getMessagingConfig,
    sendWhatsApp,
    sendSMS,
    getTemplate,
    sendAppointmentConfirmation,
    sendVaccinationAlert
};
