const express = require('express');
const router = express.Router();
const messagingController = require('../controllers/messagingController');
const whatsappController = require('../controllers/whatsappController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

// Template Routes
router.get('/templates', messagingController.getTemplates);
router.put('/templates/:id', messagingController.updateTemplate);

// Log & Direct Send Routes
router.get('/logs', messagingController.getLogs);
router.post('/send-direct', messagingController.sendDirect);

// Gateway Settings Routes
router.get('/settings', messagingController.getSettings);
router.put('/settings', messagingController.updateSettings);

// WhatsApp Connectivity & QR Scan Session Routes
router.get('/whatsapp/status', whatsappController.getWhatsAppStatus);
router.post('/whatsapp/connect', whatsappController.connectWhatsApp);
router.post('/whatsapp/disconnect', whatsappController.disconnectWhatsApp);
router.post('/whatsapp/send-test', whatsappController.sendTestMessage);

module.exports = router;
