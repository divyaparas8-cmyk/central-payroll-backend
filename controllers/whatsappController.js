const whatsappService = require('../services/whatsappService');

// Helper to resolve clinic_id from authenticated user
function getClinicId(req) {
    return req.user?.clinic_id || req.user?.clinicId || req.user?.id || 'default-clinic';
}

// @desc    Get WhatsApp Connection Status & QR Code
// @route   GET /api/v1/messaging/whatsapp/status
// @access  Private (Admin)
exports.getWhatsAppStatus = async (req, res) => {
    try {
        const clinicId = getClinicId(req);
        const statusData = await whatsappService.getStatus(clinicId);
        res.status(200).json({
            status: 'success',
            data: statusData
        });
    } catch (err) {
        console.error('[WhatsAppController] Error getting status:', err);
        res.status(500).json({ status: 'error', message: 'Failed to fetch WhatsApp connection status' });
    }
};

// @desc    Connect / Start WhatsApp Web QR Session
// @route   POST /api/v1/messaging/whatsapp/connect
// @access  Private (Admin)
exports.connectWhatsApp = async (req, res) => {
    try {
        const clinicId = getClinicId(req);
        const { phoneNumber, mode = 'qr' } = req.body;

        const result = await whatsappService.startWhatsAppConnection(clinicId, phoneNumber, mode);
        res.status(200).json({
            status: 'success',
            message: 'WhatsApp session initialization started',
            data: result
        });
    } catch (err) {
        console.error('[WhatsAppController] Error connecting:', err);
        res.status(500).json({ status: 'error', message: err.message || 'Failed to start WhatsApp connection' });
    }
};

// @desc    Disconnect WhatsApp Session
// @route   POST /api/v1/messaging/whatsapp/disconnect
// @access  Private (Admin)
exports.disconnectWhatsApp = async (req, res) => {
    try {
        const clinicId = getClinicId(req);
        const result = await whatsappService.disconnectWhatsApp(clinicId);
        res.status(200).json({
            status: 'success',
            message: 'WhatsApp session disconnected successfully',
            data: result
        });
    } catch (err) {
        console.error('[WhatsAppController] Error disconnecting:', err);
        res.status(500).json({ status: 'error', message: 'Failed to disconnect WhatsApp' });
    }
};

// @desc    Send Test Message
// @route   POST /api/v1/messaging/whatsapp/send-test
// @access  Private (Admin)
exports.sendTestMessage = async (req, res) => {
    try {
        const clinicId = getClinicId(req);
        const { recipientPhone, message } = req.body;

        if (!recipientPhone || !message) {
            return res.status(400).json({ status: 'error', message: 'Recipient phone and message are required' });
        }

        const result = await whatsappService.sendMessage(clinicId, recipientPhone, message, 'Test Recipient');
        res.status(200).json({
            status: 'success',
            data: result
        });
    } catch (err) {
        console.error('[WhatsAppController] Test message failed:', err);
        res.status(500).json({ status: 'error', message: err.message || 'Failed to send test message' });
    }
};
