const { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers } = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const db = require('../config/db');

// In-memory store for active socket instances per clinic_id
const activeSockets = new Map();
const activeQrs = new Map();
const connectionStates = new Map();
const reconnectAttempts = new Map();

// Helper to normalize phone numbers cleanly
function normalizePhoneNumber(phone) {
    if (!phone) return '';
    let cleaned = String(phone).replace(/[^0-9+]/g, '');
    if (!cleaned.startsWith('+')) {
        // Default to India (+91) if 10 digits or no country code specified
        if (cleaned.length === 10) {
            cleaned = '+91' + cleaned;
        } else {
            cleaned = '+' + cleaned;
        }
    }
    return cleaned;
}

// Ensure session storage directory exists
const SESSIONS_DIR = path.join(__dirname, '..', 'whatsapp_sessions');
if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

/**
 * Update connection status in DB for a specific clinic
 */
async function updateDbStatus(clinicId, status, phoneNumber = null, qrCode = null, lastError = null, pairingCode = null) {
    try {
        connectionStates.set(clinicId, status);
        if (qrCode !== null) activeQrs.set(clinicId, qrCode);

        const [existing] = await db.query('SELECT id FROM whatsapp_connections WHERE clinic_id = ?', [clinicId]);
        
        const connectedAt = status === 'CONNECTED' ? new Date() : null;

        if (existing.length > 0) {
            await db.query(
                `UPDATE whatsapp_connections 
                 SET status = ?, 
                     phone_number = COALESCE(?, phone_number), 
                     qr_code = CASE WHEN ? = 'CONNECTED' OR ? = 'DISCONNECTED' THEN NULL WHEN ? IS NOT NULL THEN ? ELSE qr_code END, 
                     last_error = ?, 
                     pairing_code = CASE WHEN ? = 'CONNECTED' OR ? = 'DISCONNECTED' THEN NULL WHEN ? IS NOT NULL THEN ? ELSE pairing_code END,
                     connected_at = COALESCE(?, connected_at),
                     updated_at = NOW()
                 WHERE clinic_id = ?`,
                [status, phoneNumber, status, status, qrCode, qrCode, lastError, status, status, pairingCode, pairingCode, connectedAt, clinicId]
            );
        } else {
            const id = 'waconn-' + crypto.randomUUID().slice(0, 8);
            await db.query(
                `INSERT INTO whatsapp_connections (id, clinic_id, phone_number, status, qr_code, last_error, pairing_code, connected_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [id, clinicId, phoneNumber, status, qrCode, lastError, pairingCode, connectedAt]
            );
        }
    } catch (err) {
        console.error(`[WhatsAppService] Failed to update DB status for clinic ${clinicId}:`, err.message);
    }
}

/**
 * Initialize / Start WhatsApp Socket Connection for a clinic
 */
async function startWhatsAppConnection(clinicId, inputPhone = null, mode = 'qr', isAutoReconnect = false) {
    try {
        const canonicalPhone = inputPhone ? normalizePhoneNumber(inputPhone) : null;
        console.log(`[WhatsAppService] Starting WhatsApp connection for clinic: ${clinicId} (Mode: ${mode}, AutoReconnect: ${isAutoReconnect})`);
        
        if (!isAutoReconnect) {
            reconnectAttempts.set(clinicId, 0);
        }

        // 1. Cleanly disconnect any active socket instance for this clinic first
        if (activeSockets.has(clinicId)) {
            try {
                const oldSock = activeSockets.get(clinicId);
                oldSock.ev.removeAllListeners();
                oldSock.end(undefined);
            } catch (e) {
                // ignore close errors
            }
            activeSockets.delete(clinicId);
        }

        await updateDbStatus(clinicId, 'CONNECTING', canonicalPhone, null, null, null);

        const sessionFolder = path.join(SESSIONS_DIR, `session_${clinicId}`);
        
        // 2. Wipe unauthenticated session files ONLY if NOT auto-reconnecting
        if (!isAutoReconnect && fs.existsSync(sessionFolder)) {
            const credsFile = path.join(sessionFolder, 'creds.json');
            let hasValidMe = false;
            if (fs.existsSync(credsFile)) {
                try {
                    const creds = JSON.parse(fs.readFileSync(credsFile, 'utf-8'));
                    if (creds && creds.me && creds.me.id) {
                        hasValidMe = true;
                    }
                } catch (e) {}
            }
            
            // If no valid me.id, wipe directory to guarantee clean cryptographic pre-keys
            if (!hasValidMe) {
                console.log(`[WhatsAppService] 🧹 Wiping unauthenticated session files at: ${sessionFolder}`);
                try {
                    fs.rmSync(sessionFolder, { recursive: true, force: true });
                } catch (e) {}
            }
        }

        if (!fs.existsSync(sessionFolder)) {
            fs.mkdirSync(sessionFolder, { recursive: true });
        }

        const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);

        // Fetch latest WhatsApp Web version to prevent protocol mismatch
        let waVersion;
        try {
            const fetched = await fetchLatestBaileysVersion();
            waVersion = fetched.version;
            console.log(`[WhatsAppService] WhatsApp Web version: ${waVersion.join('.')}`);
        } catch (vErr) {
            console.warn('[WhatsAppService] WA version fetch fallback:', vErr.message);
        }

        const sock = makeWASocket({
            version: waVersion,
            auth: state,
            printQRInTerminal: false,
            browser: Browsers.ubuntu('Chrome'),
            markOnlineOnConnect: false,
            connectTimeoutMs: 60000,
            keepAliveIntervalMs: 25000,
            emitOwnEvents: false
        });

        activeSockets.set(clinicId, sock);

        sock.ev.on('creds.update', saveCreds);

        let pairingCodeGenerated = false;

        sock.ev.on('connection.update', async (update) => {
            if (activeSockets.get(clinicId) !== sock) {
                // Ignore events from old orphan socket instances
                return;
            }
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                console.log(`[WhatsAppService] New QR code generated for clinic ${clinicId}`);
                try {
                    const qrDataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 6 });
                    
                    let formattedCode = null;

                    // ONLY request 8-Digit Pairing Code if explicitly requested by user (mode === 'pairing')
                    // DO NOT call requestPairingCode during normal QR scan mode, as it invalidates QR scan!
                    if (mode === 'pairing' && canonicalPhone && !sock.authState.creds.registered && !pairingCodeGenerated) {
                        pairingCodeGenerated = true;
                        try {
                            const rawPhone = canonicalPhone.replace(/[^0-9]/g, '');
                            console.log(`[WhatsAppService] Requesting 8-digit pairing code for phone: ${rawPhone}`);
                            const code = await sock.requestPairingCode(rawPhone);
                            formattedCode = code ? (code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code) : null;
                            console.log(`✅ [WhatsAppService] WhatsApp 8-Digit Pairing Code: ${formattedCode}`);
                        } catch (pErr) {
                            console.error('[WhatsAppService] Pairing Code request error:', pErr.message);
                        }
                    }

                    await updateDbStatus(clinicId, 'QR_READY', canonicalPhone, qrDataUrl, null, formattedCode);
                } catch (qrErr) {
                    console.error('[WhatsAppService] Error rendering QR Code:', qrErr);
                }
            }

            if (connection === 'connecting') {
                const current = connectionStates.get(clinicId);
                if (current !== 'QR_READY') {
                    await updateDbStatus(clinicId, 'CONNECTING', canonicalPhone, null, null, null);
                }
            } else if (connection === 'open') {
                reconnectAttempts.delete(clinicId);
                const connectedUser = sock.user ? (sock.user.id.split(':')[0] || sock.user.name) : canonicalPhone;
                const formattedNumber = '+' + String(connectedUser).replace(/[^0-9]/g, '');
                console.log(`✅ [WhatsAppService] 🎉 WhatsApp CONNECTED for clinic ${clinicId} (${formattedNumber})!`);
                await updateDbStatus(clinicId, 'CONNECTED', formattedNumber, null, null, null);
                activeQrs.delete(clinicId);
            } else if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const errorMsg = lastDisconnect?.error?.output?.payload?.message || lastDisconnect?.error?.message || 'Unknown disconnect error';
                const wasConnected = connectionStates.get(clinicId) === 'CONNECTED';
                const isLoggedOut = statusCode === DisconnectReason.loggedOut || statusCode === 401;
                
                console.log(`[WhatsAppService] Connection closed for clinic ${clinicId}. StatusCode: ${statusCode}, ErrorMsg: "${errorMsg}", WasConnected: ${wasConnected}`);

                activeSockets.delete(clinicId);

                if (isLoggedOut) {
                    reconnectAttempts.delete(clinicId);
                    console.log(`[WhatsAppService] Session logged out for clinic ${clinicId}. Wiping session directory.`);
                    activeQrs.delete(clinicId);
                    if (fs.existsSync(sessionFolder)) {
                        try { fs.rmSync(sessionFolder, { recursive: true, force: true }); } catch (e) {}
                    }
                    await updateDbStatus(clinicId, 'DISCONNECTED', null, null, 'Session logged out from phone.', null);
                } else if (wasConnected) {
                    // Auto-reconnect active session if connection temporarily dropped
                    await updateDbStatus(clinicId, 'CONNECTING', null, null, 'Reconnecting active session...', null);
                    setTimeout(() => {
                        startWhatsAppConnection(clinicId, canonicalPhone, mode, true);
                    }, 5000);
                } else if (statusCode === 515 || statusCode === 428 || statusCode === 408) {
                    const currentAttempts = (reconnectAttempts.get(clinicId) || 0) + 1;
                    if (currentAttempts <= 3) {
                        reconnectAttempts.set(clinicId, currentAttempts);
                        console.log(`[WhatsAppService] Handshake disconnect (${statusCode}) for clinic ${clinicId} (Attempt ${currentAttempts}/3). Auto-restarting socket...`);
                        setTimeout(() => {
                            startWhatsAppConnection(clinicId, canonicalPhone, mode, true);
                        }, 2000);
                    } else {
                        reconnectAttempts.delete(clinicId);
                        activeQrs.delete(clinicId);
                        const formattedError = `Closed with code ${statusCode}: ${errorMsg}`;
                        console.log(`[WhatsAppService] Max reconnect attempts (3) reached for clinic ${clinicId}. ${formattedError}`);
                        await updateDbStatus(clinicId, 'ERROR', null, null, formattedError, null);
                    }
                } else {
                    activeQrs.delete(clinicId);
                    reconnectAttempts.delete(clinicId);
                    const formattedError = `Closed with code ${statusCode}: ${errorMsg}`;
                    console.log(`[WhatsAppService] ${formattedError}. Waiting for user action.`);
                    await updateDbStatus(clinicId, 'ERROR', null, null, formattedError, null);
                }
            }
        });

        return { status: 'CONNECTING' };
    } catch (err) {
        console.error(`[WhatsAppService] Error initializing connection for clinic ${clinicId}:`, err);
        await updateDbStatus(clinicId, 'ERROR', null, null, err.message, null);
        return { status: 'ERROR', error: err.message };
    }
}

/**
 * Get active connection status for clinic
 */
async function getStatus(clinicId) {
    try {
        const [rows] = await db.query('SELECT * FROM whatsapp_connections WHERE clinic_id = ?', [clinicId]);
        if (rows.length === 0) {
            return {
                status: 'DISCONNECTED',
                phoneNumber: null,
                qrCode: null,
                pairingCode: null,
                connectedAt: null,
                lastError: null
            };
        }
        const isPending = rows[0].status === 'QR_READY' || rows[0].status === 'CONNECTING' || rows[0].status === 'AUTHENTICATING';
        return {
            status: rows[0].status,
            phoneNumber: rows[0].phone_number,
            qrCode: isPending ? rows[0].qr_code : null,
            pairingCode: isPending ? rows[0].pairing_code : null,
            connectedAt: rows[0].connected_at,
            lastError: rows[0].last_error
        };
    } catch (err) {
        console.error('[WhatsAppService] Error getting status:', err);
        return { status: 'DISCONNECTED', error: err.message };
    }
}

/**
 * Disconnect WhatsApp session cleanly
 */
async function disconnectWhatsApp(clinicId) {
    try {
        console.log(`[WhatsAppService] Disconnecting WhatsApp for clinic ${clinicId}`);
        if (activeSockets.has(clinicId)) {
            const sock = activeSockets.get(clinicId);
            try {
                await sock.logout();
            } catch (e) {}
            try {
                sock.ev.removeAllListeners('connection.update');
                sock.ev.removeAllListeners('creds.update');
                sock.end(undefined);
            } catch (e) {}
            activeSockets.delete(clinicId);
        }
        activeQrs.delete(clinicId);

        const sessionFolder = path.join(SESSIONS_DIR, `session_${clinicId}`);
        if (fs.existsSync(sessionFolder)) {
            fs.rmSync(sessionFolder, { recursive: true, force: true });
        }

        await updateDbStatus(clinicId, 'DISCONNECTED', null, null, null);
        return { status: 'DISCONNECTED' };
    } catch (err) {
        console.error('[WhatsAppService] Error disconnecting:', err);
        await updateDbStatus(clinicId, 'DISCONNECTED', null, null, err.message);
        return { status: 'DISCONNECTED', error: err.message };
    }
}

/**
 * Send WhatsApp text message asynchronously
 */
async function sendMessage(clinicId, recipientPhone, messageContent, recipientName = 'Recipient') {
    const cleanPhone = normalizePhoneNumber(recipientPhone);
    const logId = 'log-' + crypto.randomUUID().slice(0, 8);

    if (!cleanPhone) {
        console.log(`[WhatsAppService] Skipped dispatch: Missing valid recipient phone.`);
        return { status: 'SKIPPED', error: 'Invalid or missing recipient phone number' };
    }

    const jid = cleanPhone.replace('+', '') + '@s.whatsapp.net';
    const sock = activeSockets.get(clinicId);

    if (!sock || connectionStates.get(clinicId) !== 'CONNECTED') {
        console.log(`[WhatsAppService] Connection not active for clinic ${clinicId}. Skipping direct WhatsApp send.`);
        // Record log as FAILED / DISCONNECTED
        try {
            await db.query(
                `INSERT INTO notification_logs (id, clinic_id, channel, recipient_name, recipient_contact, template_type, message_content, status, gateway_response)
                 VALUES (?, ?, 'whatsapp', ?, ?, 'custom', ?, 'Failed', 'WhatsApp Gateway Disconnected')`,
                [logId, clinicId, recipientName, cleanPhone, messageContent]
            );
        } catch (e) {}
        return { status: 'FAILED', error: 'WhatsApp is not connected for this clinic' };
    }

    try {
        const result = await sock.sendMessage(jid, { text: messageContent });
        console.log(`✅ [WhatsAppService] Message sent to ${recipientName} (${cleanPhone})`);

        try {
            await db.query(
                `INSERT INTO notification_logs (id, clinic_id, channel, recipient_name, recipient_contact, template_type, message_content, status, gateway_response)
                 VALUES (?, ?, 'whatsapp', ?, ?, 'custom', ?, 'Delivered', ?)`,
                [logId, clinicId, recipientName, cleanPhone, messageContent, JSON.stringify({ key: result?.key })]
            );
        } catch (e) {}

        return { status: 'SENT', messageId: result?.key?.id };
    } catch (err) {
        console.error(`❌ [WhatsAppService] Failed to send message to ${cleanPhone}:`, err.message);

        try {
            await db.query(
                `INSERT INTO notification_logs (id, clinic_id, channel, recipient_name, recipient_contact, template_type, message_content, status, gateway_response)
                 VALUES (?, ?, 'whatsapp', ?, ?, 'custom', ?, 'Failed', ?)`,
                [logId, clinicId, recipientName, cleanPhone, messageContent, err.message]
            );
        } catch (e) {}

        return { status: 'FAILED', error: err.message };
    }
}

/**
 * Auto-restore active sessions on server startup
 */
async function restoreSessionsOnStartup() {
    try {
        const [rows] = await db.query("SELECT clinic_id, phone_number FROM whatsapp_connections WHERE status = 'CONNECTED'");
        for (const row of rows) {
            const sessionFolder = path.join(SESSIONS_DIR, `session_${row.clinic_id}`);
            if (fs.existsSync(sessionFolder)) {
                console.log(`[WhatsAppService] Restoring WhatsApp session for clinic: ${row.clinic_id}`);
                startWhatsAppConnection(row.clinic_id, row.phone_number, 'qr', true).catch(err => {
                    console.error(`Failed restoring session for clinic ${row.clinic_id}:`, err.message);
                });
            }
        }
    } catch (err) {
        console.error('[WhatsAppService] Startup session restoration error:', err.message);
    }
}

module.exports = {
    normalizePhoneNumber,
    startWhatsAppConnection,
    getStatus,
    disconnectWhatsApp,
    sendMessage,
    restoreSessionsOnStartup
};
